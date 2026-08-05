# Product-Focused E-commerce Management System

An e-commerce platform built around a **single featured product**: a public storefront where a
customer browses the product, picks a variant, adds it to a cart and completes checkout, plus an
admin dashboard where the store owner manages products, variants, inventory, orders, store
settings and analytics.

Checkout is **simulated**: an order is created and stock is decremented, but no payment is taken
and no card details are collected.

## Authors

Built by **Ronaldo Campos Lucas** and **Jean Lucas Castillo**, students at BYU–Idaho.

- **Ronaldo**
  > "Each day is a day of decision, and our decisions determine our destiny" — Russell M. Nelson
- **Lucas**
  > "Time doesn't heal anything, it just teaches us how to live with pain" — Itachi Uchiha

## Live demo

- **Storefront:** <https://ecommerce-administrator.vercel.app>
- **API:** <https://ecommerce-administrator-backend.onrender.com/api>

> The backend runs on a free tier and sleeps after ~15 minutes idle. Open
> <https://ecommerce-administrator-backend.onrender.com/api/health> once and wait for
> `{"status":"ok"}` before using the storefront.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Axios (deployed on Vercel) |
| Backend | Node.js 20+ (ESM), Express 5 (deployed on Render) |
| Database | PostgreSQL + Prisma 6 (hosted on Render) |
| Auth | JWT + bcrypt password hashing |
| Optional | Cloudinary (image uploads), Brevo (customer emails) |

## Features

### Storefront

- Featured product landing page, with store name and branding driven by store settings
- Product detail with image gallery, variant selector, per-variant price and live stock
- Cart with quantity control and subtotal, persisted across reloads
- Simulated checkout with client and server validation; stock is decremented atomically
- Order confirmation page with a shareable order reference

### Admin dashboard

- JWT login with protected routes and session restored on reload
- Product management (create, edit, soft-delete) — one product featured at a time
- Variant management with price override and stock per variant
- Low-stock alerts for variants at or below the configured threshold
- Order list with status filter, order detail, and status lifecycle
  `pending → confirmed → preparing → delivered` (`cancelled` restocks the variants)
- Store settings: name, welcome text, contact info, currency and branding
- Analytics: total orders, revenue, pending orders, best seller, low-stock count

Every page is responsive and verified at 375px, 768px and 1280px.

## Architecture

Three tiers: **browser → REST API → PostgreSQL**.

```text
┌─────────────────┐              ┌─────────────────┐              ┌─────────────────┐
│  React + Vite   │  HTTPS/JSON  │   Express API   │    Prisma    │   PostgreSQL    │
│    (Vercel)     │─────────────▶│    (Render)     │─────────────▶│    (Render)     │
└─────────────────┘              └─────────────────┘              └─────────────────┘
```

The backend dependency direction is strictly one-way: `routes → controllers → services → Prisma`.
Controllers stay thin, services hold all business logic and are the only place Prisma is used,
validators normalize request bodies, and every error response is `{ "message": "..." }` with an
appropriate status code.

The frontend mirrors that rule: no component calls the network directly. All requests go through
`src/services/`, which share a single Axios instance that injects the JWT and normalizes errors.

```text
.
├── backend/     # Node.js + Express API (independent npm project)
├── frontend/    # React + Vite app (independent npm project)
└── docs/        # API contract and deploy guides
```

## Data model

Seven models — `User`, `Product`, `ProductImage`, `ProductVariant`, `Order`, `OrderItem`,
`StoreSettings` — defined in [backend/prisma/schema.prisma](backend/prisma/schema.prisma). Key
decisions:

- **Stock lives on `ProductVariant`**, so checkout can decrement it with a conditional atomic
  update inside the same transaction that creates the order — two concurrent checkouts cannot
  oversell.
- **`OrderItem.unitPrice` is a price snapshot**, so order history stays accurate when prices change.
- **`StoreSettings` is a single row** — the store has exactly one configuration record.
- **Deleting a product is a soft delete** (`isActive = false`), so past orders keep their history.

## Local setup

Requires **Node.js 20+**, npm and a **PostgreSQL** database. `backend/` and `frontend/` are
independent npm projects.

### 1. Backend

```bash
cd backend
cp .env.example .env         # set DATABASE_URL and JWT_SECRET
npm install
npx prisma migrate deploy
npx prisma generate
npx prisma db seed           # admin user + store settings + sample product
npm run dev                  # http://localhost:4000
```

Check <http://localhost:4000/api/health> returns `{"status":"ok"}`.

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | PostgreSQL connection string (cloud providers need `?sslmode=require`). |
| `JWT_SECRET` | **yes** | Long random string used to sign JWTs. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | seed only | Credentials of the admin user created by the seed. |
| `PORT` | no | Defaults to `4000`. |
| `LOW_STOCK_THRESHOLD` | no | Variants at or below this stock are flagged low. Defaults to `5`. |
| `CLIENT_ORIGIN` | no | Comma-separated CORS origins. Defaults to `http://localhost:5173`. |
| `CLOUDINARY_*` | no | Enables image uploads from the admin panel; without them, image URLs can be pasted. |
| `BREVO_API_KEY` / `MAIL_FROM_EMAIL` / `MAIL_FROM_NAME` | no | Enables customer notification emails. |

`DATABASE_URL` and `JWT_SECRET` are validated at boot — the server refuses to start without them.

> **Admin login:** the seed creates exactly one admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
> There is no public sign-up — those values *are* the dashboard credentials.

### 2. Frontend

```bash
cd frontend
cp .env.example .env         # VITE_API_URL=http://localhost:4000/api
npm install
npm run dev                  # http://localhost:5173
```

`VITE_API_URL` must include the `/api` prefix. Keep the frontend on port 5173, or add the new
origin to `CLIENT_ORIGIN` and restart the backend — otherwise every request fails CORS.

## API overview

Base URL: `/api`. Protected endpoints require `Authorization: Bearer <token>`. Full request and
response contracts are in [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Liveness check. |
| POST | `/auth/login` | Public | Exchange admin credentials for a JWT. |
| GET | `/auth/me` | Protected | Current admin user; restores a session. |
| GET | `/products/featured` | Public | The featured product. |
| GET | `/products/:id` | Public | Product detail with images and variants. |
| GET/POST | `/products` | Protected | List all products / create one. |
| PUT/DELETE | `/products/:id` | Protected | Update / soft-delete a product. |
| POST | `/products/:id/variants` | Protected | Add a variant. |
| PUT/DELETE | `/variants/:id` | Protected | Update / delete a variant. |
| GET | `/inventory/low-stock` | Protected | Variants at or below the low-stock threshold. |
| POST | `/checkout` | Public | Create an order and decrement stock. |
| GET | `/orders` | Protected | Paginated orders, filterable by status. |
| GET | `/orders/:id` | Protected | Order detail with line items. |
| PATCH | `/orders/:id/status` | Protected | Advance or cancel an order (cancelling restocks). |
| GET/PUT | `/settings` | Public / Protected | Read / update store configuration. |
| POST | `/uploads/image` | Protected | Host an uploaded image and return its URL. |
| GET | `/analytics/summary` | Protected | Dashboard metrics. |

## Scope and limitations

- **Simulated checkout** — no payment gateway and no card data; orders are created and stock is
  decremented, nothing is charged.
- **Single admin user** — created by the seed. No public registration, password reset or roles.
- **Images are stored as URLs**, never as files in the database.
- **One featured product at a time** — there is no public catalogue browsing or search.
- **No automated test suite** — verification was done manually.
- **Prices are serialized as strings** to preserve decimal precision, and parsed by a shared
  frontend helper before display.

## Documentation

- [docs/API_CONTRACT.md](docs/API_CONTRACT.md) — every endpoint with examples and error shapes.
- [docs/DEPLOY.md](docs/DEPLOY.md) — deploying the backend (Render) and frontend (Vercel).

## Contributing

`main` is always deployable and only updated through reviewed pull requests from `dev`. Feature
branches are created from `dev` as `feature/<ticket-id>-<short-desc>` (or `fix/...`) and merged
back into `dev` via pull request. Commits follow Conventional Commits in English.
