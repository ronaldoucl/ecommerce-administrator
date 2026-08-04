# Screenshots

Images embedded in the root [README.md](../../README.md). Drop the captured PNGs straight
into this folder — the embeds are already written and will render as soon as the files exist.

## Naming convention

`<area>-<screen>.png`, lowercase, words separated by hyphens. **The root README references these
exact names**, so a typo means a broken image.

| Filename | Screen to capture | Route |
| --- | --- | --- |
| `storefront.png` | Store name, welcome text, featured product card with price | `/` |
| `product-detail.png` | Image gallery, variant selector with one variant selected, price and stock | `/product/:id` |
| `cart.png` | At least two lines with different quantities, and the subtotal | `/cart` |
| `checkout.png` | Order summary beside the filled customer form | `/checkout` |
| `confirmation.png` | Order reference, line items and total | `/confirmation/:reference` |
| `admin-dashboard.png` | All five analytics tiles showing real numbers | `/admin/dashboard` |
| `admin-products.png` | Product list with the featured badge visible | `/admin/products` |
| `admin-orders.png` | Order list with the status filter visible | `/admin/orders` |
| `admin-settings.png` | Settings form pre-filled with current values | `/admin/settings` |
| `mobile-storefront.png` | *(optional)* Storefront at 375px, evidencing the responsive work | `/` |

## Capture guidelines

- **Format:** PNG. **Width:** ~1280px for desktop shots, 375px for the optional mobile one.
- **Warm the backend first** (open `<BACKEND_URL>/api/health` and wait for `{"status":"ok"}`),
  otherwise panels capture in their loading or error state.
- **Use real seeded data** — no empty states, no "No sales yet" on the dashboard unless that is
  deliberately the point.
- **Crop to the browser viewport.** No desktop background, no bookmarks bar, no visible personal
  information in the window chrome.
- **Do not capture secrets:** no `.env` contents, no JWT in a visible devtools panel, no real
  customer data. The admin email is fine; the password is not.

## Adding a screenshot that is not in the table

1. Save it here following the same naming convention.
2. Add a row to the table above.
3. Add the embed to the root README's **Screenshots** section:

```markdown
### My new screen

![My new screen](docs/screenshots/my-new-screen.png)
```
