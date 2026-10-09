# Selling prints

Payment is taken by **Stripe**. The print itself is ordered from **creativehub**
by hand after each sale. Nothing is automated yet — that is deliberate, so there
is no monthly cost and nothing to maintain until prints actually sell.

Money flow per sale: customer pays you via Stripe → you pay creativehub for
production + delivery → the difference is your margin.

---

## One-time setup

1. **Stripe account** — sign up at stripe.com, UK business/sole trader, add your
   bank account. Fees are 1.5% + 20p per UK card payment, no monthly fee.
2. **Brand the checkout** so the handoff doesn't feel like a different company:
   Stripe dashboard → Settings → Branding. Set the logo and the accent colour to
   `#4300ff` (the site accent). Takes two minutes and matters.
3. **creativehub account** — upload the artwork and note the production cost for
   each size you want to sell (their quote includes delivery and VAT).

## Adding a print — repeat per size

1. **Work out the price.** Get creativehub's cost for that size, then set retail.
   Remember Stripe takes 1.5% + 20p, so:
   `your margin = retail − creativehub cost − (retail × 0.015 + 0.20)`
2. **Create the Payment Link** in Stripe: Products → add product (name it
   `Work 016 — A2 print`) → set the price → Payment Links → create a link.
   - Turn **on** "Collect shipping address" — you need it to place the print order.
   - Turn on quantity adjustment only if you're happy fulfilling multiples.
3. **Copy the link** (`https://buy.stripe.com/…`) into the `prints` array in
   `build.js`:

   ```js
   const prints = [
     { num: "016", size: "A2 · 42 × 59.4 cm", price: 95, url: "https://buy.stripe.com/abc123" },
   ];
   ```

   `num` must match the catalogue number exactly. `price` is only what's
   displayed on the site — Stripe charges whatever the Payment Link says, so
   **keep the two in sync** or a customer sees one price and pays another.

4. `node build.js`, then commit and push.

A work shows a **Prints** row only when it has an entry here with a real `url`.
Entries that are commented out, or still have the `…` placeholder, render
nothing — so a half-finished entry can't produce a dead button.

## When a sale comes in

1. Stripe emails you. Open the payment and copy the **shipping address**.
2. In creativehub, order that artwork at that size to that address.
3. Keep the Stripe receipt and the creativehub invoice together for bookkeeping.

## Things that will bite you

- **Editions.** If a print is a limited edition, you have to track the count
  yourself — Stripe has no stock limit on Payment Links. Either sell open
  editions, or use Stripe's inventory via a proper Product with limited quantity.
- **Price drift.** The price on the site comes from `build.js`; the price charged
  comes from Stripe. They are not linked. Change one, change the other.
- **Delivery.** Decide whether retail includes shipping. Simplest is to bake it
  in and advertise free delivery, so Stripe's total is the total.
- **Refunds/damage.** creativehub reprints damaged orders, but you handle the
  customer side. Refund from the Stripe dashboard.

## Automating later

Once prints sell regularly, the manual step can go: a small serverless function
listens for the Stripe webhook and calls creativehub's `POST /v1/orders`
automatically. That needs the creativehub API token, which must live in the
function's environment — **never** in this repo or in any file the browser
loads, since that token can place orders billed to the card on file.
