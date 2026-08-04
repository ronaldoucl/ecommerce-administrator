# Live Demo Script

A timed walkthrough of the full core loop for the **Product-Focused E-commerce Management
System**. Total budget: **~12 minutes**, leaving room for questions.

Everything below is a real action against the live deployment — nothing is mocked. The checkout
is simulated by design (an order is created and stock is decremented, but no payment is taken).

## Before you start

| # | Preparation | Why |
| --- | --- | --- |
| 1 | Open `<BACKEND_URL>/api/health` and wait for `{"status":"ok"}` | Wakes the free-tier backend. Do this **5 minutes before** you present. |
| 2 | Open the storefront `<FRONTEND_URL>` once and let it fully load | Warms the CDN and confirms the API link works. |
| 3 | Have the admin credentials ready (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) | You will log in live. |
| 4 | Two browser tabs: **Tab A** storefront, **Tab B** admin | Lets you show a settings change reflected on the storefront without re-navigating. |
| 5 | Empty the cart (or clear `localStorage`) | So the cart starts clean on camera. |
| 6 | Confirm there is at least one product with several variants, one of them low stock | Makes the variant and low-stock parts land. |

> **If the backend cold-starts mid-demo, say this:**
> *"The backend is on a free hosting tier that sleeps after about fifteen minutes of inactivity,
> so this first request is waking it up — it takes about thirty seconds. That's a hosting-plan
> characteristic, not an application one; on a paid tier the service stays warm. While it wakes,
> let me walk you through the architecture."*
> Then fill the gap with the three-tier diagram and the `routes → controllers → services →
> Prisma` rule from the README. Do **not** refresh repeatedly — that restarts the wait.

---

## Part 1 — Customer journey (~5 min)

### Step 1 · Storefront — 45 s

**Do:** Open `<FRONTEND_URL>` (Tab A).

**Say:** "This is the public storefront. The store name, the welcome text, the contact details
and the branding colour are **not hardcoded** — they come from the store settings record via a
public API call. I'll change one of them live later and you'll see it here."

**Point out:** the featured product card and its price. "The platform is designed around one
featured product at a time — that's the product-focused model."

---

### Step 2 · Product detail and variants — 60 s

**Do:** Click **View product**. Cycle through two gallery images. Select a different variant.

**Say:** "Each product has images, a description, benefits, and variants. Watch the price when I
switch variants — a variant can either **inherit** the product's base price or **override** it,
and stock is tracked per variant, not per product."

**Point out:** the stock line updating, and an out-of-stock variant if one exists — "the Add to
cart button disables itself; you can't sell what isn't there."

---

### Step 3 · Cart — 45 s

**Do:** Add the selected variant to the cart. Go to the cart. Increase quantity to 2. Add a
second variant so there are two lines.

**Say:** "The cart lives on the client and is persisted, so a refresh doesn't lose it." *(Refresh
the page to prove it.)* "The subtotal recalculates from the line prices."

**Point out:** prices carry the **currency from store settings**, not a hardcoded dollar sign.

---

### Step 4 · Simulated checkout — 75 s

**Do:** Go to **Checkout**. Type an invalid email first and submit — show the inline error. Fix
it, fill name and shipping address, submit.

**Say:** "Validation runs on the client *and* is re-run on the server — the client rules mirror
the backend so nothing invalid ever reaches the database. And note the banner: this is a
**simulated checkout**. No payment gateway, no card details, nothing is charged. The order is
created and stock is decremented atomically in a transaction — if any line is short on stock,
the whole order is rejected rather than half-applied."

**Point out:** the "simulated checkout" note on the form — say it out loud, graders look for it.

---

### Step 5 · Order confirmation — 45 s

**Do:** Land on the confirmation page. Copy the order reference.

**Say:** "The customer gets an order reference, the line items and the total. The unit prices
here are a **snapshot** taken at purchase time — if the admin changes the product price
tomorrow, this order still shows what the customer actually paid."

**Keep the reference visible** — you will find this exact order in the admin next.

---

## Part 2 — Admin journey (~6 min)

### Step 6 · Admin login — 30 s

**Do:** Switch to Tab B, open `<FRONTEND_URL>/admin/dashboard` directly.

**Say:** "I asked for the dashboard, but I'm not authenticated, so the protected route bounced me
to the login page." Log in.

**Point out:** "The JWT is stored and re-validated on every load, so a refresh keeps the session —
but an expired or tampered token drops you straight back here."

---

### Step 7 · Analytics tiles — 60 s

**Do:** Land on the dashboard. Point at each of the five tiles. Click **Refresh**.

**Say:** "Five metrics, all computed by the database rather than in application code: total
orders, simulated revenue, pending orders, best-selling product, and low-stock count. Revenue is
summed as a **decimal** end to end and sent as a string, so no floating-point rounding error
creeps into money."

**Point out:** the order you just placed is already counted — "note pending orders went up by
one." Expand the low-stock tile to show the individual variants.

---

### Step 8 · Order status lifecycle — 90 s

**Do:** Go to **Orders**. Filter by **Pending**. Open your order by its reference. Advance it:
**Confirm → Preparing → Delivered**.

**Say:** "The status lifecycle is enforced server-side: pending, confirmed, preparing, delivered,
with cancelled reachable from any non-terminal state. The UI only offers the legal transitions,
and the backend re-checks them — you can't skip a step by crafting a request."

**Point out:** once delivered, the transition buttons disappear — "delivered and cancelled are
terminal."

---

### Step 9 · Cancel and restock — 60 s

**Do:** Go back to Orders, open a **different** pending order. Note a variant's stock first
(Products → the product → its variants). Cancel the order, then re-check that stock.

**Say:** "Cancelling isn't just a label change — it **returns the stock**. The cancel and the
restock happen in one transaction, so inventory can never drift from order history."

**Point out:** the stock number going back up, and that cancelled orders are excluded from revenue
and the best-seller calculation but still counted in total orders.

---

### Step 10 · Settings change reflected on the storefront — 75 s

**Do:** Go to **Settings**. Show the form pre-filled. Change the **store name** and the
**currency** (e.g. `USD` → `EUR`). Save. Switch to **Tab A** and reload the storefront.

**Say:** "The settings form validates the same rules the backend enforces — currency has to be
exactly three uppercase letters." *(Type `USDD` first and show the inline error, then fix it.)*
"Now watch the storefront."

**Point out:** the new store name in the header **and** the prices now rendering in the new
currency. "That's the store settings driving the public site — same data, one source of truth."

> Change the currency **back to `USD`** before you finish, so the demo state is clean for the
> next run.

---

### Step 11 · Product and variant management — 60 s *(optional, cut if short on time)*

**Do:** Products → edit a product → change the description → save. Add a variant with a stock of
2, then delete it.

**Say:** "Full CRUD on products and variants. Deleting a product is a **soft delete** — it
disappears from the storefront but historical orders that reference it stay intact."

---

### Step 12 · Responsive close — 30 s

**Do:** Open devtools, switch to a 375px mobile viewport on the storefront, then on the admin
dashboard.

**Say:** "Every page was verified at 375, 768 and 1280 pixels. On mobile the admin sidebar
collapses into a menu, and the data tables scroll inside their own container rather than
stretching the page."

---

## Timing summary

| Part | Steps | Budget |
| --- | --- | --- |
| Customer journey | 1–5 | 5:00 |
| Admin journey | 6–10 | 5:00 |
| Optional CRUD + responsive | 11–12 | 1:30 |
| Buffer / questions | — | 1:00 |
| **Total** | | **~12:30** |

**If you have only 5 minutes:** run steps 1 → 3 → 4 → 5 → 6 → 7 → 10. That still shows the full
loop (browse, buy, administer) plus the settings-to-storefront link, which is the most persuasive
moment in the demo.

## Recovery notes

| If this happens | Do this |
| --- | --- |
| Backend cold start | Use the script at the top. Do not spam refresh. |
| "Network Error" on every page | The backend is asleep or `CLIENT_ORIGIN` doesn't include the frontend origin. Open `/api/health` first. |
| Admin area bounces to login repeatedly | The token expired (1 day lifetime). Log in again. |
| Storefront shows "No featured product" | No product has `isFeatured` set. Fix it in Admin → Products before demoing. |
| Checkout rejects the order | A variant went out of stock. Pick another variant or top up stock in Admin → Products. |
| Dashboard shows an error card | Backend went back to sleep mid-demo. Click **Retry** on the tile — that re-pulls without a page reload. |
