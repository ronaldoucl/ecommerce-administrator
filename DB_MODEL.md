# Data Model

Data model for the **Product-Focused E-commerce Management System**.

- **Datasource:** PostgreSQL via `env("DATABASE_URL")`.
- **Client:** `prisma-client-js`.
- **Source of truth:** [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).

This document describes the 7 models and the key modeling decisions. The schema is migrated (see `backend/prisma/migrations/`).

## Models

### User
Admin account used to sign in to the dashboard and manage the store. Passwords are stored **hashed**; `role` defaults to `"admin"` to leave room for future roles.

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | Int | `@id @default(autoincrement())` |
| email | String | `@unique` |
| password | String | hashed |
| role | String | `@default("admin")` |
| createdAt | DateTime | `@default(now())` |

### Product
A sellable product shown in the storefront and managed in the admin. Holds the display info and `basePrice`; the actual purchasable units and inventory live on its variants.

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | Int | `@id @default(autoincrement())` |
| name | String | |
| description | String | |
| benefits | String? | optional |
| basePrice | Decimal | |
| isActive | Boolean | `@default(true)` |
| isFeatured | Boolean | `@default(false)` |
| createdAt | DateTime | `@default(now())` |
| images | ProductImage[] | relation |
| variants | ProductVariant[] | relation |
| orderItems | OrderItem[] | relation |

### ProductImage
An image belonging to a product (gallery). Deleting a product cascades to its images.

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | Int | `@id @default(autoincrement())` |
| url | String | |
| alt | String? | optional |
| productId | Int | FK → Product |
| product | Product | relation, `onDelete: Cascade` |

### ProductVariant — inventory lives here
A concrete purchasable variant of a product (e.g. size/color). **`stock` is the single source of truth for inventory.** `price` is an optional override; when null the variant sells at `Product.basePrice`. Deleting a product cascades to its variants.

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | Int | `@id @default(autoincrement())` |
| label | String | e.g. `"M / Black"` |
| price | Decimal? | optional override |
| stock | Int | `@default(0)` — inventory |
| productId | Int | FK → Product |
| product | Product | relation, `onDelete: Cascade` |
| orderItems | OrderItem[] | relation |

### Order
The header of a customer order: who ordered, where it ships, its lifecycle `status`, and the `totalAmount`. Line items are stored separately in `OrderItem`. `reference` is a human-friendly unique code.

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | Int | `@id @default(autoincrement())` |
| reference | String | `@unique` |
| customerName | String | |
| customerEmail | String | |
| shippingInfo | String | |
| status | String | `@default("pending")` |
| totalAmount | Decimal | |
| createdAt | DateTime | `@default(now())` |
| items | OrderItem[] | relation |

### OrderItem
A single line within an order. Links to the `Product` and (optionally) the `ProductVariant` purchased, and stores `unitPrice` as a **snapshot** of the price at purchase time. Deleting an order cascades to its items.

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | Int | `@id @default(autoincrement())` |
| quantity | Int | |
| unitPrice | Decimal | price snapshot at purchase time |
| orderId | Int | FK → Order, `onDelete: Cascade` |
| order | Order | relation |
| productId | Int | FK → Product |
| product | Product | relation |
| variantId | Int? | optional FK → ProductVariant |
| variant | ProductVariant? | relation |

### StoreSettings
A **single configuration row** for the store: name, storefront text, contact info, currency, branding, and the customer-notification switch. Read publicly by the storefront and edited by the admin.

| Field | Type | Notes |
| ----- | ---- | ----- |
| id | Int | `@id @default(autoincrement())` |
| storeName | String | |
| mainText | String? | optional |
| contactInfo | String? | optional |
| currency | String | `@default("USD")` |
| branding | String? | optional — JSON string holding the logo and brand colour (see below) |
| emailEnabled | Boolean | `@default(false)` — whether customers are emailed on an order status change |

`branding` carries **both** branding values in one column, serialized as JSON:
`{"logoUrl":"…","primaryColor":"#RRGGBB","text":"…"}`. Keys with no value are
omitted, and an empty object is stored as `NULL`. Legacy rows holding a bare URL,
a bare hex colour or free text are still read correctly and are normalized to the
JSON shape on the next save — see `backend/src/utils/branding.js`.

`emailEnabled` is deliberately **store configuration, not an environment
variable**: the admin toggles it from Dashboard > Settings. Only the mailbox
credentials (`BREVO_API_KEY` / `MAIL_FROM_EMAIL`) live in the environment, because they are
secrets. Added by migration `20260804120000_add_email_enabled_to_store_settings`
(additive, defaulted, so existing rows keep notifications off).

## Modeling decisions

### Inventory lives on `ProductVariant.stock` (no separate Inventory model)
Inventory is intentionally modeled as the `stock` column on `ProductVariant` rather than a separate `Inventory` entity. Reasons:

- **Atomic decrement in the checkout transaction.** During `POST /api/checkout` we decrement stock and create the order inside a **single database transaction**. Keeping `stock` on the variant lets us do a conditional, atomic update (decrement only when `stock >= quantity`) on the same row we are already touching, so two concurrent checkouts cannot oversell. A separate table would add another row/relation to lock and coordinate, increasing the risk of race conditions and deadlocks for no benefit.
- **Simplicity.** Stock is a per-variant scalar. A dedicated model would only duplicate the variant's identity and add joins to every read.

If per-warehouse or per-location inventory is ever required, a separate model can be introduced later; it is not needed for the MVP.

### `Order.status` allowed values
`status` is a String with these allowed values (default `"pending"`):

`pending` → `confirmed` → `preparing` → `delivered`, plus `cancelled`.

The API validates any incoming status against this set (see `PATCH /api/orders/:id/status`).

### `OrderItem.unitPrice` is a price snapshot
`unitPrice` records the price actually charged when the order was placed. It is copied from the variant override or the product's base price at checkout time. This keeps **order history accurate** even if the product or variant price changes later — historical totals must never shift retroactively.

### `StoreSettings` is a single row
The store has exactly one configuration record. `GET /api/settings` returns it (public) and `PUT /api/settings` updates it (protected). The application always reads/writes this single row.
