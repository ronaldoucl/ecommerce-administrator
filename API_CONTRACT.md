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
| `401 Unauthorized` | Missing/invalid/expired JWT | `{ "message": "Unauthorized" }` |
| `404 Not Found` | Resource does not exist | `{ "message": "Resource not found" }` |

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
    "images": [
      { "id": 1, "url": "https://cdn.store.com/aurora-1.jpg", "alt": "Front view" }
    ],
    "variants": [
      { "id": 100, "label": "M / Black", "price": null, "stock": 12 }
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
  "createdAt": "2026-07-06T14:30:00.000Z",
  "images": [
    { "id": 1, "url": "https://cdn.store.com/aurora-1.jpg", "alt": "Front view" }
  ],
  "variants": [
    { "id": 100, "label": "M / Black", "price": null, "stock": 12 },
    { "id": 101, "label": "L / Black", "price": "54.90", "stock": 0 }
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

**Success — `200 OK`**
```json
[
  {
    "id": 10,
    "name": "Aurora Hoodie",
    "basePrice": "49.90",
    "isActive": true,
    "isFeatured": true,
    "createdAt": "2026-07-06T14:30:00.000Z"
  },
  {
    "id": 11,
    "name": "Nebula Cap",
    "basePrice": "19.90",
    "isActive": false,
    "isFeatured": false,
    "createdAt": "2026-07-05T10:00:00.000Z"
  }
]
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

---

### POST /api/products
- **Access:** Protected/JWT
- **Description:** Create a new product. Images can be attached inline.

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
  "isFeatured": true
}
```

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
- **Description:** Delete a product.

**Request body:** none.

**Success — `200 OK`**
```json
{ "message": "Product deleted successfully" }
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
- **Description:** Delete a variant.

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

---

## Checkout

### POST /api/checkout
- **Access:** Public
- **Description:** Place an order. Stock is atomically decremented on the purchased variants within a single database transaction. If any line item exceeds available stock, the whole transaction is rolled back and no order is created.

**Request body**
```json
{
  "customerName": "Jane Doe",
  "customerEmail": "jane@example.com",
  "shippingInfo": "123 Main St, Springfield",
  "items": [
    { "productId": 10, "variantId": 100, "quantity": 2 },
    { "productId": 11, "variantId": null, "quantity": 1 }
  ]
}
```

**Success — `201 Created`**
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
    { "id": 1, "productId": 10, "variantId": 100, "quantity": 2, "unitPrice": "49.90" },
    { "id": 2, "productId": 11, "variantId": null, "quantity": 1, "unitPrice": "19.90" }
  ]
}
```

**Error — `400 Bad Request`** (out of stock)
```json
{ "message": "Insufficient stock for variant 100 (requested 2, available 1)" }
```

**Error — `400 Bad Request`** (validation)
```json
{ "message": "Validation failed: items must contain at least one entry" }
```

---

## Orders

### GET /api/orders
- **Access:** Protected/JWT
- **Description:** List all orders (admin).

**Request body:** none.

**Success — `200 OK`**
```json
[
  {
    "id": 500,
    "reference": "ORD-20260706-0500",
    "customerName": "Jane Doe",
    "customerEmail": "jane@example.com",
    "status": "pending",
    "totalAmount": "119.70",
    "createdAt": "2026-07-06T14:30:00.000Z"
  }
]
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

---

### GET /api/orders/:id
- **Access:** Protected/JWT
- **Description:** Return a single order with its line items.

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
    { "id": 1, "productId": 10, "variantId": 100, "quantity": 2, "unitPrice": "49.90" },
    { "id": 2, "productId": 11, "variantId": null, "quantity": 1, "unitPrice": "19.90" }
  ]
}
```

**Error — `404 Not Found`**
```json
{ "message": "Order not found" }
```

---

### PATCH /api/orders/:id/status
- **Access:** Protected/JWT
- **Description:** Update the status of an order. Allowed values: `pending`, `confirmed`, `preparing`, `delivered`, `cancelled`.

**Request body**
```json
{ "status": "confirmed" }
```

**Success — `200 OK`**
```json
{
  "id": 500,
  "reference": "ORD-20260706-0500",
  "status": "confirmed",
  "totalAmount": "119.70",
  "createdAt": "2026-07-06T14:30:00.000Z"
}
```

**Error — `400 Bad Request`** (invalid status value)
```json
{ "message": "Invalid status. Allowed values: pending, confirmed, preparing, delivered, cancelled" }
```

**Error — `404 Not Found`**
```json
{ "message": "Order not found" }
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
  "branding": "{\"primaryColor\":\"#4F46E5\",\"logoUrl\":\"https://cdn.store.com/logo.png\"}"
}
```

---

### PUT /api/settings
- **Access:** Protected/JWT
- **Description:** Update the store configuration row.

**Request body**
```json
{
  "storeName": "Aurora Store",
  "mainText": "Winter collection is here.",
  "contactInfo": "support@store.com | +1 555 0100",
  "currency": "USD",
  "branding": "{\"primaryColor\":\"#4F46E5\",\"logoUrl\":\"https://cdn.store.com/logo.png\"}"
}
```

**Success — `200 OK`**
```json
{
  "id": 1,
  "storeName": "Aurora Store",
  "mainText": "Winter collection is here.",
  "contactInfo": "support@store.com | +1 555 0100",
  "currency": "USD",
  "branding": "{\"primaryColor\":\"#4F46E5\",\"logoUrl\":\"https://cdn.store.com/logo.png\"}"
}
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```

---

## Analytics

### GET /api/analytics/summary
- **Access:** Protected/JWT
- **Description:** Return aggregated metrics for the admin dashboard.

**Request body:** none.

**Success — `200 OK`**
```json
{
  "totalRevenue": "12450.00",
  "totalOrders": 84,
  "ordersByStatus": {
    "pending": 5,
    "confirmed": 10,
    "preparing": 3,
    "delivered": 64,
    "cancelled": 2
  },
  "topProducts": [
    { "productId": 10, "name": "Aurora Hoodie", "unitsSold": 120 },
    { "productId": 11, "name": "Nebula Cap", "unitsSold": 75 }
  ],
  "lowStockVariants": [
    { "variantId": 101, "label": "L / Black", "stock": 0 }
  ]
}
```

**Error — `401 Unauthorized`**
```json
{ "message": "Unauthorized" }
```
