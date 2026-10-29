/* Cart for the catalogue page — originals and prints, paid by card via Stripe.

   Plain JS in the style of the 21st.dev "Interactive Checkout" (add buttons,
   a side cart with quantities, an animated total). The browser only ever sends
   item ids and quantities; the checkout worker (checkout/worker.js) prices the
   order from shop.json and returns a Stripe Checkout URL to redirect to. */
(() => {
  const KEY = "mat4s-cart";
  const endpoint = (window.__CHECKOUT__ || "").replace(/\/$/, "");
  const $ = (s, r = document) => r.querySelector(s);
  const fab = $(".cart-fab"), panel = $("#cart"), scrim = $(".cart-scrim");
  if (!fab || !panel) return;
  const list = $(".cart-items", panel), empty = $(".cart-empty", panel);
  const sumEl = $(".cart-sum", panel), checkout = $(".cart-checkout", panel), err = $(".cart-error", panel);
  const shipEl = $(".cart-ship", panel);
  const DELIVERY = window.__DELIVERY__ || { uk: 0, intl: 0 };
  const RKEY = "mat4s-region";
  let region = (() => { try { return localStorage.getItem(RKEY) === "intl" ? "intl" : "uk"; } catch { return "uk"; } })();
  panel.querySelectorAll('input[name="cart-region"]').forEach((r) => {
    r.checked = r.value === region;
    r.addEventListener("change", () => {
      region = r.value === "intl" ? "intl" : "uk";
      try { localStorage.setItem(RKEY, region); } catch {}
      render();
    });
  });

  // what's buyable, read from the page's own buttons (ids, names, prices, limits)
  const catalogue = {};
  document.querySelectorAll(".cart-add").forEach((b) => {
    const d = b.dataset;
    catalogue[d.id] = { id: d.id, name: d.name, detail: d.detail, amount: +d.amount, max: +d.max || 1, image: d.image };
  });

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch {} };
  // drop anything no longer for sale (sold original, removed print), clamp quantities
  let cart = load().filter((l) => catalogue[l.id]).map((l) => ({ id: l.id, qty: Math.min(Math.max(1, l.qty | 0), catalogue[l.id].max) }));

  const gbp = (p) => "£" + (p / 100).toLocaleString("en-GB", { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 });
  const subtotal = () => cart.reduce((s, l) => s + catalogue[l.id].amount * l.qty, 0);
  const shipping = () => (cart.length ? DELIVERY[region] || 0 : 0);
  const total = () => subtotal() + shipping();
  const count = () => cart.reduce((s, l) => s + l.qty, 0);

  // total counts up/down to its new value
  let shown = total(), tween = 0;
  const animateSum = () => {
    const from = shown, to = total(), t0 = performance.now();
    cancelAnimationFrame(tween);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { shown = to; sumEl.textContent = gbp(to); return; }
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 420), e = 1 - Math.pow(1 - k, 3);
      shown = Math.round(from + (to - from) * e);
      sumEl.textContent = gbp(shown);
      if (k < 1) tween = requestAnimationFrame(step);
    };
    tween = requestAnimationFrame(step);
  };

  const render = () => {
    const n = count();
    document.querySelectorAll(".cart-count").forEach((el) => (el.textContent = n));
    fab.hidden = n === 0 && !panel.classList.contains("open");
    empty.hidden = cart.length > 0;
    checkout.disabled = cart.length === 0;
    list.innerHTML = cart.map((l) => {
      const it = catalogue[l.id];
      return `<li class="cart-line" data-id="${it.id}">
        <img src="${it.image}" alt="" loading="lazy">
        <div class="cart-line-text">
          <p class="cart-line-name">${it.name}</p>
          <p class="cart-line-detail">${it.detail}</p>
          <div class="cart-line-row">
            ${it.max > 1 ? `<span class="cart-qty">
              <button type="button" data-act="dec" aria-label="One fewer">&minus;</button>
              <span aria-live="polite">${l.qty}</span>
              <button type="button" data-act="inc" aria-label="One more" ${l.qty >= it.max ? "disabled" : ""}>+</button>
            </span>` : `<span class="cart-one">One of one</span>`}
            <span class="cart-line-price">${gbp(it.amount * l.qty)}</span>
          </div>
        </div>
        <button class="cart-remove" type="button" data-act="remove" aria-label="Remove ${it.name}">&times;</button>
      </li>`;
    }).join("");
    // add buttons reflect what's already in the cart
    document.querySelectorAll(".cart-add").forEach((b) => {
      const l = cart.find((x) => x.id === b.dataset.id);
      const full = l && l.qty >= catalogue[b.dataset.id].max;
      b.textContent = full ? (catalogue[b.dataset.id].max === 1 ? "In cart" : "Max in cart") : l ? "Add another" : "Add to cart";
      b.classList.toggle("is-in", !!l);
      b.disabled = !!full;
    });
    shipEl.textContent = shipping() ? gbp(shipping()) : "Free";
    if (!endpoint) {
      checkout.textContent = "Card checkout coming soon";
      checkout.disabled = true;
    }
    animateSum();
    save();
  };

  const open = () => {
    panel.classList.add("open"); panel.setAttribute("aria-hidden", "false");
    fab.setAttribute("aria-expanded", "true"); scrim.hidden = false; fab.hidden = false;
    requestAnimationFrame(() => scrim.classList.add("on"));
    $(".cart-close", panel).focus();
  };
  const close = () => {
    panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true");
    fab.setAttribute("aria-expanded", "false"); scrim.classList.remove("on");
    setTimeout(() => { scrim.hidden = true; render(); }, 300);
  };

  document.addEventListener("click", (e) => {
    const add = e.target.closest(".cart-add");
    if (add) {
      const id = add.dataset.id, l = cart.find((x) => x.id === id);
      if (l) l.qty = Math.min(catalogue[id].max, l.qty + 1); else cart.push({ id, qty: 1 });
      render();
      fab.classList.remove("bump"); void fab.offsetWidth; fab.classList.add("bump");
      open();
      return;
    }
    const act = e.target.closest("[data-act]");
    if (act && panel.contains(act)) {
      const id = act.closest(".cart-line").dataset.id, l = cart.find((x) => x.id === id);
      if (act.dataset.act === "remove" || (act.dataset.act === "dec" && l.qty <= 1)) cart = cart.filter((x) => x.id !== id);
      else if (act.dataset.act === "dec") l.qty--;
      else if (act.dataset.act === "inc") l.qty = Math.min(catalogue[id].max, l.qty + 1);
      render();
    }
  });
  fab.addEventListener("click", () => (panel.classList.contains("open") ? close() : open()));
  $(".cart-close", panel).addEventListener("click", close);
  scrim.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });

  checkout.addEventListener("click", async () => {
    if (!endpoint || !cart.length) return;
    err.hidden = true;
    checkout.disabled = true;
    checkout.textContent = "Opening secure checkout…";
    try {
      const res = await fetch(endpoint + "/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart.map((l) => ({ id: l.id, qty: l.qty })), region }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout is unavailable right now.");
      location.href = data.url;                             // Stripe-hosted payment page
    } catch (e2) {
      err.textContent = e2.message + " Please try again, or email matas@mail.com.";
      err.hidden = false;
      checkout.disabled = false;
      checkout.textContent = "Checkout";
    }
  });

  // back from Stripe
  const q = new URLSearchParams(location.search);
  if (q.get("order") === "success") {
    cart = [];
    const note = document.createElement("div");
    note.className = "order-toast";
    note.setAttribute("role", "status");
    note.textContent = "Thank you, your order is confirmed. A receipt is on its way to your email.";
    document.body.appendChild(note);
    setTimeout(() => note.classList.add("gone"), 7000);
    history.replaceState(null, "", location.pathname);
  }

  render();
})();
