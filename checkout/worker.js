/* mat4s checkout — a tiny Cloudflare Worker that turns a cart into a Stripe
   Checkout Session. GitHub Pages can't hold a Stripe secret key, so this is
   the only server-side piece of the site.

   POST /checkout  { items: [{ id, qty }], region: "uk" | "intl" }  →  { url }

   Prices are NEVER taken from the request: every id is looked up in the live
   shop.json that build.js publishes, so the browser can't change what's charged.

   Environment (wrangler.toml [vars] + one secret):
     STRIPE_SECRET_KEY  secret — `npx wrangler secret put STRIPE_SECRET_KEY`
     SITE               https://mat4s.com
     ALLOWED_ORIGINS    comma list of sites allowed to call this
     UK_COUNTRIES          addresses accepted for (free) UK delivery, e.g. "GB"
     UK_SHIPPING_PENCE     UK delivery charge per order in pence ("0" = free)
     INTL_COUNTRIES        addresses accepted for international delivery
     INTL_SHIPPING_PENCE   international delivery charge per order in pence

   The buyer picks UK or international in the cart, and Stripe only accepts an
   address in that region's list, so nobody can pay UK delivery to ship abroad.
*/

const json = (body, status, cors) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...cors } });

export function corsFor(origin, allowed) {
  const ok = allowed.split(",").map((s) => s.trim()).filter(Boolean);
  return ok.includes(origin)
    ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" }
    : null;
}

/** Validate a cart against the shop. Returns { lines } or { error }. */
export function priceCart(items, shop) {
  if (!Array.isArray(items) || !items.length || items.length > 50) return { error: "Your cart is empty." };
  const byId = new Map(shop.items.map((it) => [it.id, it]));
  const seen = new Set();
  const lines = [];
  for (const raw of items) {
    const it = byId.get(raw && raw.id);
    if (!it) return { error: "Something in your cart is no longer available. Please refresh the page." };
    if (seen.has(it.id)) return { error: "Your cart has a duplicate item. Please refresh the page." };
    seen.add(it.id);
    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > (it.max || 1)) return { error: "That quantity isn't available." };
    if (!Number.isInteger(it.amount) || it.amount < 50) return { error: "That item can't be bought online yet." };
    lines.push({ item: it, qty });
  }
  return { lines };
}

/** Delivery for a region: which countries Stripe accepts, and what it costs. */
export function delivery(region, env) {
  const intl = region === "intl";
  const list = (intl ? env.INTL_COUNTRIES : env.UK_COUNTRIES) || (intl ? "" : "GB");
  const countries = list.split(",").map((s) => s.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c));
  const pence = parseInt((intl ? env.INTL_SHIPPING_PENCE : env.UK_SHIPPING_PENCE) || "0", 10) || 0;
  return { countries, pence, label: intl ? "International delivery" : (pence ? "UK delivery" : "Free UK delivery") };
}

/** Stripe's API takes form encoding with bracketed keys. */
export function sessionForm(lines, env, region = "uk") {
  const site = (env.SITE || "https://mat4s.com").replace(/\/$/, "");
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("success_url", `${site}/art.html?order=success`);
  f.set("cancel_url", `${site}/art.html?order=cancelled`);
  f.set("billing_address_collection", "auto");
  f.set("phone_number_collection[enabled]", "true");
  const d = delivery(region, env);
  d.countries.forEach((c, i) => f.set(`shipping_address_collection[allowed_countries][${i}]`, c));
  f.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
  f.set("shipping_options[0][shipping_rate_data][display_name]", d.label);
  f.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(d.pence));
  f.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "gbp");
  f.set("metadata[delivery]", region === "intl" ? "international" : "uk");
  lines.forEach(({ item, qty }, i) => {
    const p = `line_items[${i}]`;
    f.set(`${p}[quantity]`, String(qty));
    f.set(`${p}[price_data][currency]`, "gbp");
    f.set(`${p}[price_data][unit_amount]`, String(item.amount));
    f.set(`${p}[price_data][product_data][name]`, item.name);
    if (item.detail) f.set(`${p}[price_data][product_data][description]`, item.detail);
    if (item.image) f.set(`${p}[price_data][product_data][images][0]`, `${site}/${item.image}`);
    f.set(`${p}[price_data][product_data][metadata][shop_id]`, item.id);
  });
  // what to fulfil, visible on the payment in the Stripe dashboard
  f.set("metadata[order]", lines.map(({ item, qty }) => `${qty}× ${item.id}`).join(", ").slice(0, 500));
  return f;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsFor(request.headers.get("Origin") || "", env.ALLOWED_ORIGINS || "https://mat4s.com");
    if (request.method === "OPTIONS") return new Response(null, { status: cors ? 204 : 403, headers: cors || {} });
    if (url.pathname !== "/checkout" || request.method !== "POST") return json({ error: "Not found" }, 404, cors || {});
    if (!cors) return json({ error: "Origin not allowed" }, 403, {});
    if (!env.STRIPE_SECRET_KEY) return json({ error: "Checkout isn't set up yet." }, 503, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400, cors); }

    const site = (env.SITE || "https://mat4s.com").replace(/\/$/, "");
    const shopRes = await fetch(`${site}/shop.json`, { cf: { cacheTtl: 60 } });
    if (!shopRes.ok) return json({ error: "Checkout is unavailable right now." }, 502, cors);
    const priced = priceCart(body.items, await shopRes.json());
    if (priced.error) return json({ error: priced.error }, 400, cors);
    const region = body.region === "intl" ? "intl" : "uk";
    if (!delivery(region, env).countries.length) return json({ error: "We can't deliver there yet." }, 400, cors);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: sessionForm(priced.lines, env, region),
    });
    const session = await res.json();
    if (!res.ok || !session.url) {
      console.log("stripe error", res.status, session && session.error && session.error.message);
      return json({ error: "Checkout is unavailable right now." }, 502, cors);
    }
    return json({ url: session.url }, 200, cors);
  },
};
