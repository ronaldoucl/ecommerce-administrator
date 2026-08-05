# API Contract

API contract for the **Product-Focused E-commerce Management System** (MVP).

Base URL: `/api`. All request/response bodies are JSON (`Content-Type: application/json`).

## Conventions

- **Access**
  - **Public** — no authentication required.
  - **Protected/JWT** — requires header `Authorization: Bearer <token>`. A missing or invalid token returns `401`.
- **Error shape** — every error response uses the exact shape:
  ```json
  { "message": "..." }
  ```
- **Monetary values** are returned as strings to preserve `Decimal` precision (e.g. `"49.90"`).
- **Timestamps** are ISO 8601 strings in UTC (e.g. `"2026-07-06T14:30:00.000Z"`).

Common error responses reused below:

| Status | When | Example body |
| ------ | ---- | ------------ |
| `400 Bad Request` | Validation failed | `{ "message": "Validation failed: name is required" }` |
| `400 Bad Request` | Request body is not parseable JSON | `{ "message": "Malformed JSON body" }` |
| `401 Unauthorized` | Missing/invalid/expired JWT | `{ "message": "Unauthorized" }` |
| `404 Not Found` | Resource does not exist, or the route is unknown | `{ "message": "Resource not found" }` / `{ "message": "Not found" }` |
| `500 Internal Server Error` | Unexpected server failure | `{ "message": "Internal server error" }` |

- **Route params** — any `:id` must be a positive integer within the PostgreSQL `int4`
  range (max `2147483647`). Anything else (`abc`, `0`, `-1`, `2147483648`) returns
  `400 { "message": "Validation failed: id must be a positive integer" }`, never a `500`.
- **Internal errors are never disclosed.** Unexpected failures always return the generic
  `500` body above; the real error (stack trace, Prisma query, driver message) is logged
  server-side only. The one deliberate exception is the checkout reference-collision
  error documented under `POST /api/checkout`, whose message is caller-facing by design.

---

## Health

### GET /api/health
- **Access:** Public
- **Description:** Liveness probe. Used as the hosting platform's health check path
  (see `backend/render.yaml`), so it must stay public and unauthenticated.

**Request body:** none.

**Success — `200 OK`**
```json
{ "status": "ok" }
```

---

## Auth

### POST /api/auth/login
- **Access:** Public
- **Description:** Authenticate an admin user and return a JWT.

**Request body**
```json
{
  "email": "admin@store.com",
  "password": "secret123"
}
```

**Success — `200 OK`**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@store.com",
    "role": "admin"
  }
}
```

**Error — `401 Unauthorized`** (invalid credentials)
```json
{ "message": "Invalid email or password" }
```

---

### GET /api/auth/me
- **Access:** Protected/JWT
- **Description:** Return the currently authenticated user.

**Request body:** none.

**Success — `200 OK`**
```json
{
  "id": 1,
  "email": "admin@store.com",
  "role": "admin",
  "createdAt": "2026-07-06T14:30:00.000Z"
}
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

---

## Products

**Computed stock flags.** Product reads include stock signals derived on the
server from the live `ProductVariant.stock` (never stored, so always current).
The low-stock threshold is configuration (`LOW_STOCK_THRESHOLD`, default `5`),
not a database column.

- Per variant:
  - `isLowStock` — `true` when `stock > 0` **and** `stock <= LOW_STOCK_THRESHOLD`.
  - `isOutOfStock` — `true` when `stock === 0`.
- Per product:
  - `hasLowStock` — `true` when any variant is low stock.
  - `isOutOfStock` — `true` when the product has variants and **all** of them are at `0`.

### GET /api/products/featured
- **Access:** Public
- **Description:** Return products flagged as featured for the storefront.

**Request body:** none.

**Success — `200 OK`**
```json
[
  {
    "id": 10,
    "name": "Aurora Hoodie",
    "description": "Soft fleece hoodie.",
    "benefits": "Warm, breathable, unisex fit.",
    "basePrice": "49.90",
    "isActive": true,
    "isFeatured": true,
    "hasLowStock": false,
    "isOutOfStock": false,
    "images": [
      { "id": 1, "url": "https://cdn.store.com/aurora-1.jpg", "alt": "Front view" }
    ],
    "variants": [
      { "id": 100, "label": "M / Black", "price": null, "stock": 12, "isLowStock": false, "isOutOfStock": false }
    ]
  }
]
```

**Error — `404 Not Found`** (no featured products configured)
```json
{ "message": "No featured products found" }
```

---

### GET /api/products/:id
- **Access:** Public
- **Description:** Return a single product with its images and variants.

**Request body:** none.

**Success — `200 OK`**
```json
{
  "id": 10,
  "name": "Aurora Hoodie",
  "description": "Soft fleece hoodie.",
  "benefits": "Warm, breathable, unisex fit.",
  "basePrice": "49.90",
  "isActive": true,
  "isFeatured": true,
  "hasLowStock": true,
  "isOutOfStock": false,
  "createdAt": "2026-07-06T14:30:00.000Z",
  "images": [
    { "id": 1, "url": "https://cdn.store.com/aurora-1.jpg", "alt": "Front view" }
  ],
  "variants": [
    { "id": 100, "label": "M / Black", "price": null, "stock": 12, "isLowStock": false, "isOutOfStock": false },
    { "id": 101, "label": "L / Black", "price": "54.90", "stock": 0, "isLowStock": false, "isOutOfStock": true }
  ]
}
```

**Error — `404 Not Found`**
```json
{ "message": "Product not found" }
```

---

### GET /api/products
- **Access:** Protected/JWT
- **Description:** Return all products (admin listing, includes inactive).

**Request body:** none.

**Success — `200 OK`** — each product includes its images and variants (with live
`stock`) plus the computed stock flags described above.
```json
[
  {
    "id": 10,
    "name": "Aurora Hoodie",
    "description": "Soft fleece hoodie.",
    "benefits": "Warm, breathable, unisex fit.",
    "basePrice": "49.90",
    "isActive": true,
    "isFeatured": true,
    "hasLowStock": true,
    "isOutOfStock": false,
    "createdAt": "2026-07-06T14:30:00.000Z",
    "images": [
      { "id": 1, "url": "https://cdn.store.com/aurora-1.jpg", "alt": "Front view" }
    ],
    "variants": [
      { "id": 100, "label": "M / Black", "price": null, "stock": 12, "isLowStock": false, "isOutOfStock": false },
      { "id": 101, "label": "L / Black", "price": "54.90", "stock": 3, "isLowStock": true, "isOutOfStock": false }
    ]
  }
]
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

---

### Product images (`images`)

Products carry an **ordered** gallery, sent and returned as `images`:

```json
"images": [
  { "url": "https://cdn.store.com/aurora-1.jpg", "alt": "Front view" },
  { "url": "https://cdn.store.com/aurora-2.jpg", "alt": "Back view" }
]
```

| Rule | Detail |
| --- | --- |
| Order | **Meaningful.** The array order is the gallery order, and the **first entry is the primary image**. `ProductImage` has no position column, so the order is preserved as row creation order and every read returns it sorted by `id`. |
| `url` | Required. Absolute `http`/`https` URL, at most 2048 characters. Either pasted by hand or obtained from [`POST /api/uploads/image`](#post-apiuploadsimage). |
| `alt` | Optional string (max 200 characters) or `null`. |
| Count | At most 10 images per product. |
| Empty | `"images": []` is valid and clears the gallery. A product with no images is fine; the storefront renders a placeholder. |

On **create** the images are attached inline. On **update** the stored gallery is
**synced to match the array exactly**, inside the same transaction as the product
update: entries no longer present are removed, new ones are created, and the
resulting order matches the array. Omitting `images` from an update leaves the
gallery untouched.

---

### POST /api/products
- **Access:** Protected/JWT
- **Description:** Create a new product. Images can be attached inline (see [Product images](#product-images-images)).

**Request body**
```json
{
  "name": "Aurora Hoodie",
  "description": "Soft fleece hoodie.",
  "benefits": "Warm, breathable, unisex fit.",
  "basePrice": "49.90",
  "isActive": true,
  "isFeatured": false,
  "images": [
    { "url": "https://cdn.store.com/aurora-1.jpg", "alt": "Front view" }
  ]
}
```

**Success — `201 Created`**
```json
{
  "id": 10,
  "name": "Aurora Hoodie",
  "description": "Soft fleece hoodie.",
  "benefits": "Warm, breathable, unisex fit.",
  "basePrice": "49.90",
  "isActive": true,
  "isFeatured": false,
  "createdAt": "2026-07-06T14:30:00.000Z",
  "images": [
    { "id": 1, "url": "https://cdn.store.com/aurora-1.jpg", "alt": "Front view" }
  ],
  "variants": []
}
```

**Error — `400 Bad Request`**
```json
{ "message": "Validation failed: basePrice must be a positive number" }
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

---

### PUT /api/products/:id
- **Access:** Protected/JWT
- **Description:** Update an existing product.

**Request body** (all fields optional; only provided fields are updated)
```json
{
  "name": "Aurora Hoodie v2",
  "basePrice": "52.00",
  "isFeatured": true,
  "images": [
    { "url": "https://cdn.store.com/aurora-2.jpg", "alt": "Back view" },
    { "url": "https://cdn.store.com/aurora-1.jpg", "alt": "Front view" }
  ]
}
```

When `images` is present the gallery is synced to match it exactly (see
[Product images](#product-images-images)); when it is omitted the gallery is left
as it is.

**Success — `200 OK`**
```json
{
  "id": 10,
  "name": "Aurora Hoodie v2",
  "description": "Soft fleece hoodie.",
  "benefits": "Warm, breathable, unisex fit.",
  "basePrice": "52.00",
  "isActive": true,
  "isFeatured": true,
  "createdAt": "2026-07-06T14:30:00.000Z"
}
```

**Error — `400 Bad Request`**
```json
{ "message": "Validation failed: basePrice must be a positive number" }
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

**Error — `404 Not Found`**
```json
{ "message": "Product not found" }
```

---

### DELETE /api/products/:id
- **Access:** Protected/JWT
- **Description:** Soft-delete a product. The row is **not** removed: the product is deactivated (`isActive` and `isFeatured` set to `false`) to preserve order history that references it. A deactivated product disappears from the public storefront (`GET /api/products/featured` and `GET /api/products/:id` both stop returning it) but still appears in the admin listing (`GET /api/products`) with `isActive: false`.

**Request body:** none.

**Success — `200 OK`**
```json
{ "message": "Product deactivated" }
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

**Error — `404 Not Found`**
```json
{ "message": "Product not found" }
```

---

## Variants

Inventory lives on the variant (`ProductVariant.stock`).

### POST /api/products/:id/variants
- **Access:** Protected/JWT
- **Description:** Add a variant to a product.

**Request body**
```json
{
  "label": "XL / Black",
  "price": "54.90",
  "stock": 20
}
```

**Success — `201 Created`**
```json
{
  "id": 102,
  "label": "XL / Black",
  "price": "54.90",
  "stock": 20,
  "productId": 10
}
```

**Error — `400 Bad Request`**
```json
{ "message": "Validation failed: label is required" }
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

**Error — `404 Not Found`** (parent product missing)
```json
{ "message": "Product not found" }
```

---

### PUT /api/variants/:id
- **Access:** Protected/JWT
- **Description:** Update a variant (label, price override, or stock).

**Request body**
```json
{
  "label": "XL / Charcoal",
  "price": "56.00",
  "stock": 15
}
```

**Success — `200 OK`**
```json
{
  "id": 102,
  "label": "XL / Charcoal",
  "price": "56.00",
  "stock": 15,
  "productId": 10
}
```

**Error — `400 Bad Request`**
```json
{ "message": "Validation failed: stock must be a non-negative integer" }
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

**Error — `404 Not Found`**
```json
{ "message": "Variant not found" }
```

---

### DELETE /api/variants/:id
- **Access:** Protected/JWT
- **Description:** Hard-delete a variant. Blocked when the variant is already referenced by an order, so deleting it cannot destroy order history.

**Request body:** none.

**Success — `200 OK`**
```json
{ "message": "Variant deleted successfully" }
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

**Error — `404 Not Found`**
```json
{ "message": "Variant not found" }
```

**Error — `409 Conflict`** (variant belongs to an existing order)
```json
{ "message": "Variant cannot be deleted because it belongs to existing orders" }
```

---

## Inventory

### GET /api/inventory/low-stock
- **Access:** Protected/JWT
- **Description:** Return every variant whose stock is at or below the configured
  low-stock threshold (`LOW_STOCK_THRESHOLD`, default `5`), across **active**
  products only, ordered by `stock` ascending (most urgent first). Out-of-stock
  variants (stock `0`) are included and flagged with `isOutOfStock`. The query
  is implemented once in the inventory service so the analytics summary can reuse it.

**Request body:** none.

**Success — `200 OK`**
```json
{
  "threshold": 5,
  "data": [
    {
      "variantId": 101,
      "variantLabel": "L / Black",
      "stock": 0,
      "productId": 10,
      "productName": "Aurora Hoodie",
      "isOutOfStock": true
    },
    {
      "variantId": 102,
      "variantLabel": "XL / Black",
      "stock": 3,
      "productId": 10,
      "productName": "Aurora Hoodie",
      "isOutOfStock": false
    }
  ]
}
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

---

## Checkout

### POST /api/checkout
- **Access:** Public (no token)
- **Description:** Place an order (simulated — there is no payment gateway). Validates the cart, creates one `Order` plus its `OrderItem`s with server-resolved price snapshots, and atomically decrements `ProductVariant.stock`, all inside a single database transaction. Prices are always resolved on the server (`variant.price` when set, otherwise `product.basePrice`) and never taken from the request body. If any step fails, the whole transaction is rolled back: no order, no items, no stock change.

**Request body**
```json
{
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "shippingInfo": "123 Main St, Springfield",
  "items": [
    { "variantId": 100, "quantity": 2 }
  ]
}
```

Field rules:
- `customerName` — required, trimmed, 2–100 characters.
- `customerEmail` — required, valid email format.
- `shippingInfo` — required, trimmed, 5–500 characters.
- `items` — required, non-empty array, at most 50 entries; duplicate `variantId` values are rejected (merge quantities client-side).
- `items[].variantId` — positive integer.
- `items[].quantity` — integer between 1 and 99.

**Success — `201 Created`**
```json
{
  "reference": "ORD-20260723-A7K2Q",
  "status": "pending",
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "totalAmount": "129.98",
  "createdAt": "2026-07-23T14:30:00.000Z",
  "items": [
    {
      "productName": "Aurora Hoodie",
      "variantLabel": "M / Black",
      "quantity": 2,
      "unitPrice": "64.99",
      "lineTotal": "129.98"
    }
  ]
}
```

Monetary values (`totalAmount`, `unitPrice`, `lineTotal`) are strings to preserve `Decimal` precision.

**Error — `400 Bad Request`** (validation — e.g. missing/invalid field or duplicate variant)
```json
{ "message": "Validation failed: items must be a non-empty array" }
```

**Error — `400 Bad Request`** (a purchased product is deactivated)
```json
{ "message": "Product is not available: Aurora Hoodie" }
```

**Error — `404 Not Found`** (a requested variant does not exist)
```json
{ "message": "Variant not found: 100" }
```

**Error — `409 Conflict`** (insufficient stock — no order is created)
```json
{ "message": "Insufficient stock for M / Black. Available: 1" }
```

**Error — `500 Internal Server Error`** (could not generate a unique order reference after retries)
```json
{ "message": "Could not generate a unique order reference. Please try again." }
```

---

## Orders

All order endpoints are **admin-only** and require a valid JWT. A missing or invalid token returns `401`.

### Order status & transitions

Valid statuses: `pending`, `confirmed`, `preparing`, `delivered`, `cancelled`.

Allowed transitions (`delivered` and `cancelled` are terminal):

| From | Allowed target statuses |
| ---- | ----------------------- |
| `pending` | `confirmed`, `cancelled` |
| `confirmed` | `preparing`, `cancelled` |
| `preparing` | `delivered`, `cancelled` |
| `delivered` | _(none — terminal)_ |
| `cancelled` | _(none — terminal)_ |

Setting the same status again is rejected as a no-op. **Cancellation restores stock:** when an order transitions into `cancelled` from any non-cancelled status, each line item's `quantity` is added back to its `ProductVariant.stock`. The status change and the stock restoration happen inside a single database transaction, so they cannot drift. Line items whose `variantId` is `null` are skipped. Because `cancelled` is terminal, stock is never restored twice.

---

### GET /api/orders
- **Access:** Protected/JWT
- **Description:** List orders, newest first, with pagination and optional status filter.

**Query params** (all optional)

| Param | Type | Default | Notes |
| ----- | ---- | ------- | ----- |
| `status` | string | — | Filter by status; must be one of the valid statuses, otherwise `400`. |
| `page` | integer | `1` | 1-based page number; must be a positive integer. |
| `pageSize` | integer | `20` | Items per page; positive integer, capped at `100`. |

**Request body:** none.

**Success — `200 OK`**
```json
{
  "data": [
    {
      "id": 500,
      "reference": "ORD-20260706-0500",
      "customerName": "Jane Doe",
      "customerEmail": "jane@example.com",
      "status": "pending",
      "totalAmount": "119.70",
      "itemCount": 2,
      "createdAt": "2026-07-06T14:30:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 42
}
```

**Error — `400 Bad Request`** (invalid status filter)
```json
{ "message": "Invalid status. Allowed values: pending, confirmed, preparing, delivered, cancelled" }
```

**Error — `401 Unauthorized`**
```json
{ "message": "Missing or malformed Authorization header" }
```

---

### GET /api/orders/:id
- **Access:** Protected/JWT
- **Description:** Return a single order with its line items (price snapshots).

**Request body:** none.

**Success — `200 OK`**
```json
{
  "id": 500,
  "reference": "ORD-20260706-0500",
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "shippingInfo": "123 Main St, Springfield",
  "status": "pending",
  "totalAmount": "119.70",
  "createdAt": "2026-07-06T14:30:00.000Z",
  "items": [
    {
      "quantity": 2,
      "unitPrice": "49.90",
      "lineTotal": "99.80",
      "productId": 10,
      "productName": "Aurora Hoodie",
      "variantId": 100,
      "variantLabel": "M / Black"
    },
    {
      "quantity": 1,
      "unitPrice": "19.90",
      "lineTotal": "19.90",
      "productId": 11,
      "productName": "Nebula Cap",
      "variantId": null,
      "variantLabel": null
    }
  ]
}
```

Monetary values (`totalAmount`, `unitPrice`, `lineTotal`) are strings to preserve `Decimal` precision.

**Error — `404 Not Found`**
```json
{ "message": "Order not found" }
```

---

### PATCH /api/orders/:id/status
- **Access:** Protected/JWT
- **Description:** Update the status of an order following the transition map above. Cancelling restores stock atomically (see [Order status & transitions](#order-status--transitions)). Returns the updated order in the same shape as `GET /api/orders/:id`.

**Request body**
```json
{ "status": "confirmed" }
```

**Success — `200 OK`** — the full order (same shape as `GET /api/orders/:id`) with the new status, plus two fields describing the customer notification email:

| Field | Type | Meaning |
| --- | --- | --- |
| `emailSent` | boolean | `true` when the customer was emailed about the new status. |
| `emailError` | string \| null | Why the email was not sent, or `null`. It is `null` **and** `emailSent` is `false` when email notifications are simply disabled (`emailEnabled: false` in the store settings, the default) — that is not an error. |

```json
{
  "id": 42,
  "reference": "ORD-20260728-0042",
  "status": "cancelled",
  "emailSent": false,
  "emailError": null
}
```

**The status change always commits regardless of the email outcome.** The email is
attempted only after the transaction has been committed and can never roll it
back — these two fields only report what happened. Every pre-existing field of
the order is returned unchanged.

**Error — `400 Bad Request`** (unknown/missing status)
```json
{ "message": "Invalid status. Allowed values: pending, confirmed, preparing, delivered, cancelled" }
```

**Error — `404 Not Found`**
```json
{ "message": "Order not found" }
```

**Error — `409 Conflict`** (illegal transition)
```json
{ "message": "Cannot change status from delivered to confirmed" }
```

**Error — `409 Conflict`** (no-op — same status)
```json
{ "message": "Order is already pending" }
```

---

## Settings

### GET /api/settings
- **Access:** Public
- **Description:** Return the single store configuration row (used by the storefront).

**Request body:** none.

**Success — `200 OK`**
```json
{
  "id": 1,
  "storeName": "Aurora Store",
  "mainText": "Welcome to Aurora — quality apparel.",
  "contactInfo": "support@store.com | +1 555 0100",
  "currency": "USD",
  "branding": "{\"primaryColor\":\"#4F46E5\",\"logoUrl\":\"https://cdn.store.com/logo.png\"}",
  "emailEnabled": false,
  "emailConfigured": true
}
```

| Field | Type | Meaning |
| --- | --- | --- |
| `emailEnabled` | boolean | Whether customers are emailed when their order status changes. Editable from the admin dashboard. |
| `emailConfigured` | boolean | **Read-only, not a column.** Whether the server has the email credentials (`BREVO_API_KEY` / `MAIL_FROM_EMAIL`) the notifications need. When `false`, turning `emailEnabled` on has no effect and `PATCH /api/orders/:id/status` reports the missing credentials in `emailError`. Sending it back on `PUT` is rejected. |

---

### PUT /api/settings
- **Access:** Protected/JWT
- **Description:** Update the store configuration. `StoreSettings` is a single-row table: this endpoint always updates that one row (and creates it if the database has never been seeded), so a second row is never produced. Returns the updated settings in the same shape as `GET /api/settings`.

**Request body**
```json
{
  "storeName": "Aurora Store",
  "mainText": "Winter collection is here.",
  "contactInfo": "support@store.com | +1 555 0100",
  "currency": "USD",
  "branding": "{\"primaryColor\":\"#4F46E5\",\"logoUrl\":\"https://cdn.store.com/logo.png\"}",
  "emailEnabled": true
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `storeName` | yes | trimmed string, 2–80 characters |
| `currency` | yes | exactly 3 uppercase letters (`USD`, `EUR`, `CRC`) |
| `mainText` | no | string up to 2000 characters, or `null` to clear |
| `contactInfo` | no | string up to 500 characters, or `null` to clear |
| `branding` | no | string up to 500 characters holding the branding JSON (see below), or `null` to clear |
| `logoUrl` | no | absolute `http`/`https` URL up to 300 characters, or `""`/`null` to remove the logo. **Not a column** — stored inside `branding` |
| `primaryColor` | no | hex colour `#RGB` or `#RRGGBB` (normalized to uppercase `#RRGGBB`), or `""`/`null` to fall back to the default theme colour. **Not a column** — stored inside `branding` |
| `emailEnabled` | no | strict boolean (`true` / `false` — a string such as `"true"` is rejected). Omitted means `false` |

Optional fields that are omitted are stored as `null` (`emailEnabled`, being a boolean column, becomes `false`). Any property outside the table above is rejected instead of being ignored — including the read-only `emailConfigured` returned by `GET`.

Because this endpoint replaces the whole row, a client that edits one field must send the others too, `emailEnabled` included, or they are cleared.

#### The `branding` contract

The schema keeps a single `StoreSettings.branding` text column, so the logo and
the brand colour are both serialized into it as a small JSON object:

```json
"branding": "{\"logoUrl\":\"https://cdn.store.com/logo.png\",\"primaryColor\":\"#4F46E5\"}"
```

| Key | Meaning |
| --- | --- |
| `logoUrl` | Logo shown in the storefront (and admin) header. Absent when no logo is set. |
| `primaryColor` | Accent colour applied to the storefront, as uppercase `#RRGGBB`. Absent when unset. |
| `text` | Optional short tagline shown in the storefront footer. Absent when unset. |

Keys with no value are omitted entirely, and a branding object with nothing in it
is stored as `null` rather than `"{}"`.

**Writing.** Send `logoUrl` / `primaryColor` — they are validated individually and
serialized into `branding` for you. If a raw `branding` string is sent in the same
request, `logoUrl` / `primaryColor` win and the rest of the raw value (a `text`
tagline) is preserved.

**Backward compatibility.** A legacy `branding` value is never rejected and never
crashes a read. Sent on its own, it is parsed heuristically and normalized into
the JSON shape above on that save:

| Legacy value | Interpreted as |
| --- | --- |
| `"https://cdn.store.com/logo.png"` | `{"logoUrl":"https://cdn.store.com/logo.png"}` |
| `"#4F46E5"` | `{"primaryColor":"#4F46E5"}` |
| `"Quality apparel since 2019"` | `{"text":"Quality apparel since 2019"}` |

**Reading.** `GET /api/settings` returns `branding` as the raw stored string; the
client parses it (the same heuristics apply, so a not-yet-normalized legacy row
still renders correctly).

**Success — `200 OK`**
```json
{
  "id": 1,
  "storeName": "Aurora Store",
  "mainText": "Winter collection is here.",
  "contactInfo": "support@store.com | +1 555 0100",
  "currency": "USD",
  "branding": "{\"primaryColor\":\"#4F46E5\",\"logoUrl\":\"https://cdn.store.com/logo.png\"}",
  "emailEnabled": true,
  "emailConfigured": true
}
```

**Error — `400 Bad Request`** (empty body)
```json
{ "message": "Validation failed: request body must not be empty" }
```

**Error — `400 Bad Request`** (unknown field)
```json
{ "message": "Validation failed: unknown field(s): storename. Allowed fields: storeName, mainText, contactInfo, currency, branding" }
```

**Error — `400 Bad Request`** (missing `storeName`)
```json
{ "message": "Validation failed: storeName is required" }
```

**Error — `400 Bad Request`** (`storeName` out of range)
```json
{ "message": "Validation failed: storeName must be between 2 and 80 characters" }
```

**Error — `400 Bad Request`** (invalid currency)
```json
{ "message": "Validation failed: currency must be a 3-letter uppercase code (e.g. USD, EUR, CRC)" }
```

**Error — `400 Bad Request`** (optional field too long — `mainText`, `contactInfo`, `branding`)
```json
{ "message": "Validation failed: mainText must be at most 2000 characters" }
```

**Error — `401 Unauthorized`**
```json
{ "message": "Missing or malformed Authorization header" }
```

---

## Uploads

### POST /api/uploads/image
- **Access:** Protected/JWT
- **Description:** Host an image file and return its URL, ready to be placed in a product's [`images`](#product-images-images) array.

This endpoint **does not touch the database**. Uploading and saving a product are
two separate steps: upload first, then send the returned `url` in the product's
`images` array like any hand-pasted URL. Pasting a URL directly remains fully
supported, so a store with no image host configured still works.

**Request:** `multipart/form-data` with a single `file` field.

| Rule | Detail |
| --- | --- |
| Field name | `file` — exactly one per request. |
| Content type | `image/jpeg`, `image/png`, `image/webp`, `image/gif` or `image/avif`. Anything else is rejected. |
| Size | At most 5 MB. |

**Success — `201 Created`**
```json
{
  "url": "https://res.cloudinary.com/demo/image/upload/v1/ecommerce-administrator/products/abc123.jpg",
  "publicId": "ecommerce-administrator/products/abc123",
  "width": 1200,
  "height": 1200,
  "format": "jpg",
  "bytes": 184320
}
```

**Error — `400 Bad Request`** (no file sent)
```json
{ "message": "Validation failed: an image file is required in the \"file\" field" }
```

**Error — `400 Bad Request`** (unsupported type)
```json
{ "message": "Validation failed: file type must be one of: image/jpeg, image/png, image/webp, image/gif, image/avif" }
```

**Error — `400 Bad Request`** (too large)
```json
{ "message": "Validation failed: file must be at most 5 MB" }
```

**Error — `401 Unauthorized`**
```json
{ "message": "Missing or malformed Authorization header" }
```

**Error — `503 Service Unavailable`** (no image host configured on the server)
```json
{ "message": "Image uploads are not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or paste an image URL instead." }
```

---

## Analytics

### GET /api/analytics/summary
- **Access:** Protected/JWT
- **Description:** Return the five MVP metrics for the admin dashboard in a single payload.

**Request body:** none.

#### Cancelled orders are excluded from revenue and best-seller

A cancelled order restored its stock and represents **no sale**, so it is excluded from both `simulatedRevenue` and `bestSellingProduct`. The rule is defined once in `src/services/analyticsService.js` so the two metrics can never drift apart.

`totalOrders` is the deliberate exception: it counts **every** order regardless of status, cancelled ones included.

| Metric | Definition |
| --- | --- |
| `totalOrders` | Count of all orders, any status. |
| `simulatedRevenue` | Sum of `Order.totalAmount` over non-cancelled orders. Decimal-safe **string**, always 2 decimals; `"0.00"` when there are no sales. |
| `pendingOrders` | Count of orders with status `pending`. |
| `bestSellingProduct` | Product with the highest total `OrderItem.quantity` across non-cancelled orders. Ties break on the lowest `productId`. `null` when there are no non-cancelled sales. |
| `lowStock` | Variants at or below the configured threshold, across active products only. Reuses the same query as `GET /api/inventory/low-stock`. |

`simulatedRevenue` is a string, never a JSON number, so `Decimal` precision survives the round trip. `lowStock.threshold` comes from `LOW_STOCK_THRESHOLD` (default `5`). `lowStock.items` carries the same objects as `GET /api/inventory/low-stock`, including the `isOutOfStock` flag, so one frontend renderer serves both endpoints.

**Success — `200 OK`**
```json
{
  "totalOrders": 12,
  "simulatedRevenue": "1499.88",
  "pendingOrders": 3,
  "bestSellingProduct": {
    "productId": 1,
    "productName": "Aurora Hoodie",
    "unitsSold": 24
  },
  "lowStock": {
    "threshold": 5,
    "count": 2,
    "items": [
      {
        "variantId": 103,
        "variantLabel": "XL / Charcoal",
        "stock": 0,
        "productId": 1,
        "productName": "Aurora Hoodie",
        "isOutOfStock": true
      },
      {
        "variantId": 102,
        "variantLabel": "L / Black",
        "stock": 5,
        "productId": 1,
        "productName": "Aurora Hoodie",
        "isOutOfStock": false
      }
    ]
  }
}
```

**Empty store** — no orders yet:
```json
{
  "totalOrders": 0,
  "simulatedRevenue": "0.00",
  "pendingOrders": 0,
  "bestSellingProduct": null,
  "lowStock": { "threshold": 5, "count": 0, "items": [] }
}
```

**Error — `401 Unauthorized`**
```json
{ "message": "Missing or malformed Authorization header" }
```
