# Card checkout — setup

The paintings page has a cart for **prints only**. Originals always show
**Contact me** and are sold by conversation. A print with a `price` gets an
**Add to cart** button. **Checkout** sends the cart (ids and
quantities only) to a small Cloudflare Worker in `checkout/`. The worker looks
every price up in the published `shop.json`, creates a Stripe Checkout
Session, and sends the buyer to Stripe's own secure payment page. Card details
never touch this site.

The cart only appears once at least one print has a price. Until the worker is
deployed and `CHECKOUT_URL` is set in `build.js`, its button reads **Card
checkout coming soon** and can't be pressed.

---

## One-time setup (about 20 minutes)

1. **Stripe account.** If you haven't already, sign up at stripe.com as a UK
   sole trader and add your bank account. Turn on **Settings → Emails → Successful
   payments** so buyers get a receipt.
2. **Get your secret key.** Stripe dashboard → Developers → API keys. Start with
   the **test** key (`sk_test_…`) and switch to the live key (`sk_live_…`) once a
   test purchase works. Never paste it into a file or a chat.
3. **Cloudflare account.** Free at dash.cloudflare.com. Workers' free plan covers
   100,000 requests a day.
4. **Deploy the worker** (from this folder):
   ```bash
   cd ~/Claude/matas-portfolio/checkout
   npx wrangler login
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler deploy
   ```
   `secret put` asks you to paste the key; it's stored encrypted in Cloudflare.
   `deploy` prints the worker's address, e.g.
   `https://mat4s-checkout.<your-name>.workers.dev`.
5. **Connect the site.** In `build.js`, set
   `const CHECKOUT_URL = "https://mat4s-checkout.<your-name>.workers.dev";`
   then run `node build.js` and push.
6. **Test it.** With the test key, buy something using Stripe's test card
   `4242 4242 4242 4242`, any future date and any CVC. Check the payment shows in
   the Stripe dashboard (Test mode). Then repeat step 4's `secret put` with the
   live key.

## Settings in `checkout/wrangler.toml`

| Setting | What it does |
| --- | --- |
| `SHIP_COUNTRIES` | Countries a buyer can enter a delivery address in. Default `GB`. Add e.g. `GB,IE,FR,US`. |
| `SHIPPING_PENCE` | A flat delivery charge per order in pence, e.g. `"1500"` for £15. Empty = no delivery charge. |
| `ALLOWED_ORIGINS` | Sites allowed to use the worker. |

Run `npx wrangler deploy` again after changing any of these.

## After a sale

- **Prints:** order from creativehub by hand, as in `PRINTS.md`. The Stripe
  payment shows what was bought under **Metadata → order**.

## Adding prices

- **A print:** add an entry to `prints` in `build.js`, e.g.
  `{ num: "011", size: "40 × 40 cm", price: 95 }`. A print with a price gets an
  Add to cart button; one without stays "Coming soon".

Then `node build.js` and push. `shop.json` updates automatically.
