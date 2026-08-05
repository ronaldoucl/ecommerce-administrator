# Product-Focused E-commerce Management System

A reusable, product-focused e-commerce platform built around a **single featured product**:
a public storefront where a customer browses the highlighted product, picks a variant, adds it
to a cart and completes a **simulated checkout**, plus an admin dashboard where the store owner
manages products, variants, inventory, orders, store settings and analytics. It is an
**academic capstone project** — the checkout is deliberately simulated end to end: an order is
created and stock is decremented, but **no real payment is ever taken and no card details are
collected**. The repository is a monorepo holding two independent applications: a React + Vite
frontend and a Node.js + Express backend, backed by PostgreSQL through Prisma with JWT
authentication.

## Live links

> Fill these in after deploying. These two values are all a grader needs.

- **Frontend (Vercel):** `<FRONTEND_URL: ecommerce-administrator.vercel.app>`
- **Backend (Render):** `<BACKEND_URL: https://ecommerce-administrator-backend.onrender.com>`

The backend runs on a free tier and **spins down after ~15 minutes of inactivity**. The first
request after idle can take 30–60 seconds. Open `<BACKEND_URL>/api/health` once and wait for
`{"status":"ok"}` before demoing or grading the frontend.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite 8, React Router 7, Axios, CSS Modules |
| Backend | Node.js 20+ (ESM), Express 5 |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` password hashing |
| Email | Brevo HTTP API via `fetch` (optional — off by default, no npm package) |
| Image hosting | Cloudinary via `cloudinary` + `multer` (optional — pasting URLs always works) |
| Frontend hosting | Vercel |
| Backend hosting | Render (Railway works with the same build/start commands) |

## Features

Mapped to the MVP scope:

| # | Feature | Where |
| --- | --- | --- |
| 1 | **Storefront** — featured product landing page; store name, welcome copy and branding driven by store settings | `/` |
| 2 | **Product detail + variants** — image gallery, description, benefits, variant selector with per-variant price and live stock | `/product/:id` |
| 3 | **Cart** — add/remove lines, quantity control, running subtotal, persisted in `localStorage` across reloads | `/cart` |
| 4 | **Simulated checkout** — customer details form, client + server validation, stock decremented atomically, **no payment step** | `/checkout` |
| 5 | **Order confirmation** — order reference, line items and total, with copy-to-clipboard reference | `/confirmation/:reference` |
| 6 | **Admin authentication** — JWT login, session restored on reload, protected routes | `/admin/login` |
| 7 | **Product management** — create, edit and soft-delete products; exactly one product featured at a time | `/admin/products` |
| 8 | **Variant management** — add, edit and delete variants inline, with price override and stock | `/admin/products/:id/edit` |
| 9 | **Inventory + low stock** — stock lives on variants; variants at or below `LOW_STOCK_THRESHOLD` are surfaced | `GET /api/inventory/low-stock` |
| 10 | **Order management** — paginated list with status filter, plus order detail | `/admin/orders` |
| 11 | **Order status lifecycle** — `pending → confirmed → preparing → delivered`, with `cancelled` reachable from any non-terminal state; cancelling **restocks** the variants | `/admin/orders/:id` |
| 12 | **Store settings** — store name, main text, contact info, currency and branding; changes drive the public storefront | `/admin/settings` |
| 13 | **Analytics** — total orders, simulated revenue, pending orders, best-selling product, low-stock count | `/admin/dashboard` |
| 14 | **Responsive** — every page verified at 375px, 768px and 1280px | all pages |

## Architecture

Three-tier: **browser → REST API → PostgreSQL**.

```text
React + Vite (Vercel)  ──HTTPS/JSON──▶  Express API (Render)  ──Prisma──▶  PostgreSQL
```

**Backend dependency direction is strictly one-way:**

```text
routes → controllers → services → Prisma
```

- `routes/` map URLs to controllers and attach `requireAuth` where the endpoint is protected.
- `controllers/` stay thin: parse the request, call a service, shape the response.
- `services/` hold all business logic and are the **only** place Prisma is touched.
- `validators/` validate and normalize request bodies before a service ever runs.
- Every error response is `{ "message": "..." }` with an appropriate HTTP status code.

**The frontend mirrors that discipline:** no component calls the network directly. All requests
go through `src/services/`, which sit on a single Axios instance (`src/services/api.js`) that
injects the JWT and normalizes every failure into `{ message }`.

### Backend structure

```text
backend/
├── server.js                 # Express app: CORS, JSON, /api router, error handler
├── prisma/
│   ├── schema.prisma         # Data model
│   ├── migrations/           # Versioned SQL migrations
│   └── seed.js               # Idempotent seed: admin user, store settings, sample product
├── src/
│   ├── auth/                 # Password hashing and JWT helpers
│   ├── config/               # env.js (validated config), prisma.js (client singleton)
│   ├── routes/               # One router per feature, aggregated in routes/index.js
│   ├── controllers/          # Thin request/response layer
│   ├── services/             # Business logic — the only Prisma consumers
│   ├── validators/           # Dependency-free request validation
│   ├── middleware/           # requireAuth, notFound, errorHandler
│   └── utils/                # httpError helpers
├── DEPLOY.md                 # Backend deploy guide (Render)
└── .env.example
```

### Frontend structure

```text
frontend/
├── index.html
├── vercel.json               # SPA rewrite so deep links resolve to index.html
├── src/
│   ├── main.jsx              # Providers: Auth → Settings → Cart
│   ├── routes/               # AppRoutes + ProtectedRoute
│   ├── pages/                # Public pages
│   │   └── admin/            # Admin pages
│   ├── components/           # Layout, AdminLayout, Button, Card, StatusBadge, BackendStatus
│   ├── context/              # AuthContext, SettingsContext, CartContext
│   ├── services/             # api.js + one service per API area
│   ├── constants/            # orderStatus.js — status vocabulary and transitions
│   ├── utils/                # format.js (Decimal-safe price/date), branding.js
│   └── styles/               # theme.css (design tokens) + global.css
└── .env.example
```

## Local setup

### Prerequisites

- **Node.js 20+** and npm (verified here on Node v22.20.0 / npm 11.7.0)
- A **PostgreSQL** database — local, or cloud (Render/Supabase/Neon)
- Git

`backend/` and `frontend/` are independent npm projects: install and run each separately.

### 1. Clone

```bash
git clone <REPO_URL>
cd ecommerce-administrator
```

### 2. Backend environment

```bash
cd backend
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | **yes** | PostgreSQL connection string. Cloud providers need SSL — append `?sslmode=require`. |
| `JWT_SECRET` | **yes** | Long random string used to sign JWTs. |
| `ADMIN_EMAIL` | seed only | Email of the admin user created by the seed. |
| `ADMIN_PASSWORD` | seed only | Password for that admin user. |
| `PORT` | no | Defaults to `4000`. Render injects its own — do not set it there. |
| `LOW_STOCK_THRESHOLD` | no | Variants at or below this stock are flagged low. Integer, defaults to `5`. |
| `CLIENT_ORIGIN` | no | Comma-separated allowed CORS origins. Defaults to `http://localhost:5173`. Any `*.vercel.app` origin is always allowed. |
| `BREVO_API_KEY` / `MAIL_FROM_EMAIL` / `MAIL_FROM_NAME` | no | Customer notification emails, sent through Brevo's HTTP API with `fetch` (no npm package). `MAIL_FROM_EMAIL` must be an address **verified as a sender in Brevo**, or the send is refused with an explanation. HTTP rather than SMTP because Render's free plan blocks the outbound SMTP ports. |

Without these, the notification switch in **Dashboard > Settings** stays unavailable: status changes still work and the API reports `"emailSent": false`. The switch itself is store configuration (`StoreSettings.emailEnabled`), not an environment variable.
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | no | Enable uploading product images from the admin panel. Without them the upload button reports that uploads are not configured and image URLs can still be pasted by hand. |
| `CLOUDINARY_FOLDER` | no | Folder uploads land in. Defaults to `ecommerce-administrator/products`. |
| `NODE_ENV` | no | Do not set by hand — hosting platforms set it. When it is anything other than `production`, Prisma logs queries to the console. Leave it unset locally. |

`DATABASE_URL` and `JWT_SECRET` are validated at boot — the server refuses to start without them.

### 3. Backend install, migrate, seed, run

```bash
npm install
npx prisma migrate deploy   # apply migrations to the database
npx prisma generate         # generate the Prisma client
npx prisma db seed          # admin user + store settings + sample product (idempotent)
npm run dev                 # nodemon — http://localhost:4000
```

Use `npm start` for a plain (non-watching) run. Check it is up:
<http://localhost:4000/api/health> → `{"status":"ok"}`.

> **Admin login:** the seed creates exactly one admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
> There is no public sign-up — those env values *are* the dashboard credentials. The seed is
> idempotent, so re-running it will not duplicate the user.

### 4. Frontend environment and run

```bash
cd ../frontend
cp .env.example .env
```

| Variable | Required | Description |
| --- | --- | --- |
| `VITE_API_URL` | **yes** | Backend base URL, **including the `/api` prefix**. Local: `http://localhost:4000/api`. Production: `<BACKEND_URL>/api`. |

```bash
npm install
npm run dev                 # http://localhost:5173
```

> **Port matters.** The backend's default `CLIENT_ORIGIN` allows only `http://localhost:5173`.
> If Vite starts on another port, every API call fails CORS and the app shows "Network Error"
> with the admin area bouncing to the login page. Keep port 5173, or add the new origin to
> `CLIENT_ORIGIN` and restart the backend.

Other frontend scripts: `npm run build` (production build), `npm run preview` (serve the build
on port 4173), `npm run lint` (oxlint).

## API overview

Base URL: `<BACKEND_URL>/api`. Protected endpoints require `Authorization: Bearer <token>`.
Full request/response contracts are in [API_CONTRACT.md](API_CONTRACT.md).

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | Liveness check (use it to warm the free tier). |
| POST | `/api/auth/login` | Public | Exchange admin credentials for a JWT. |
| GET | `/api/auth/me` | Protected | Current admin user; used to restore a session. |
| GET | `/api/products/featured` | Public | The featured product for the storefront. |
| GET | `/api/products/:id` | Public | Product detail with images and variants. |
| GET | `/api/products` | Protected | Full admin listing (active and inactive). |
| POST | `/api/products` | Protected | Create a product. |
| PUT | `/api/products/:id` | Protected | Update a product. |
| DELETE | `/api/products/:id` | Protected | Soft-delete a product. |
| POST | `/api/products/:id/variants` | Protected | Add a variant to a product. |
| PUT | `/api/variants/:id` | Protected | Update a variant (label, price override, stock). |
| DELETE | `/api/variants/:id` | Protected | Delete a variant. |
| GET | `/api/inventory/low-stock` | Protected | Variants at or below `LOW_STOCK_THRESHOLD`. |
| POST | `/api/checkout` | Public | Create an order and decrement stock (simulated). |
| GET | `/api/orders` | Protected | Paginated orders, filterable by status. |
| GET | `/api/orders/:id` | Protected | Order detail with line items. |
| PATCH | `/api/orders/:id/status` | Protected | Advance or cancel an order; cancelling restocks. |
| GET | `/api/settings` | Public | Store configuration consumed by the storefront. |
| PUT | `/api/settings` | Protected | Update store configuration. |
| POST | `/api/uploads/image` | Protected | Host an uploaded image and return its URL. |
| GET | `/api/analytics/summary` | Protected | The five dashboard metrics. |

## Known limitations / academic scope

- **Simulated checkout.** No payment gateway, no card collection. `POST /api/checkout` creates an
  order and decrements stock; nothing is charged. Totals are labelled "simulated revenue".
- **Single admin user.** Created by the seed from env values. No public registration, no password
  reset, no roles or permission levels.
- **Images are stored as URLs.** The database keeps a URL per image, never a file. Uploading from
  the admin panel is supported when Cloudinary credentials are configured — the file is hosted
  there and only the returned URL is stored. Without those credentials images can still be added
  by pasting a URL. Either way, if the host of an image goes away, that image breaks.
- **Free-tier cold starts.** The Render backend sleeps after ~15 minutes idle; the first request
  can take 30–60 seconds. Warm `/api/health` before any demo.
- **Single featured product by design.** The storefront highlights one product at a time; there is
  no public catalogue browsing or search endpoint.
- **No automated test suite.** Verification was done manually and with throwaway scripts.
- **Money is Decimal-safe on the wire.** Prices are serialized as strings to preserve precision;
  the frontend parses them through a shared helper before display.

## Screenshots

Screenshots are **not committed yet**. Capture them manually and save them into
[`docs/screenshots/`](docs/screenshots/) using the exact filenames below — the embeds further
down will then render with no further edits.

Capture at a **desktop width (~1280px)** unless the row says otherwise, and warm the backend
first so no panel shows an error state.

| # | Save as | What to capture |
| --- | --- | --- |
| 1 | `docs/screenshots/storefront.png` | `/` — store name, welcome text, featured product card with price. |
| 2 | `docs/screenshots/product-detail.png` | `/product/:id` — image gallery, variant selector with one variant selected, price and stock. |
| 3 | `docs/screenshots/cart.png` | `/cart` — at least two lines with different quantities, and the subtotal. |
| 4 | `docs/screenshots/checkout.png` | `/checkout` — order summary beside the filled customer form. |
| 5 | `docs/screenshots/confirmation.png` | `/confirmation/:reference` — order reference, line items and total. |
| 6 | `docs/screenshots/admin-dashboard.png` | `/admin/dashboard` — all five analytics tiles with real numbers. |
| 7 | `docs/screenshots/admin-products.png` | `/admin/products` — product list showing the featured badge. |
| 8 | `docs/screenshots/admin-orders.png` | `/admin/orders` — order list with the status filter visible. |
| 9 | `docs/screenshots/admin-settings.png` | `/admin/settings` — settings form pre-filled with current values. |
| 10 | `docs/screenshots/mobile-storefront.png` | *(optional, 375px)* `/` on mobile, evidencing the responsive work. |

<!-- The embeds below render automatically once the files above exist. -->

### Storefront

![Storefront](docs/screenshots/storefront.png)

### Product detail

![Product detail](docs/screenshots/product-detail.png)

### Cart

![Cart](docs/screenshots/cart.png)

### Checkout

![Checkout](docs/screenshots/checkout.png)

### Order confirmation

![Order confirmation](docs/screenshots/confirmation.png)

### Admin dashboard

![Admin dashboard](docs/screenshots/admin-dashboard.png)

### Admin products

![Admin products](docs/screenshots/admin-products.png)

### Admin orders

![Admin orders](docs/screenshots/admin-orders.png)

### Admin settings

![Admin settings](docs/screenshots/admin-settings.png)

## Deployment

- **Backend (Render):** [backend/DEPLOY.md](backend/DEPLOY.md)
- **Frontend (Vercel):** [DEPLOY.md](DEPLOY.md) — includes the final deploy checklist.

## Demo

A timed walkthrough of the full core loop is in [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

## Further documentation

- [API_CONTRACT.md](API_CONTRACT.md) — every endpoint with request/response examples and error shapes.
- [DB_MODEL.md](DB_MODEL.md) — data model and the reasoning behind each modeling decision.
- [CLAUDE.md](CLAUDE.md) — project conventions.

## Repository structure

```text
.
├── backend/            # Node.js + Express API (independent npm project)
├── frontend/           # React + Vite app (independent npm project)
├── docs/screenshots/   # Screenshots embedded in this README
├── API_CONTRACT.md
├── DB_MODEL.md
├── DEMO_SCRIPT.md
├── DEPLOY.md
└── README.md
```

`backend/` and `frontend/` are two independent npm projects. Each has its own `package.json`
and dependencies and can be installed and run independently.

## Branching strategy

```text
main   (always deployable)
  ↑
dev    (integration)
  ↑
feature/*   (one branch per ticket)
```

- **`main`** — Always deployable. Only updated through reviewed pull requests from `dev`. Direct
  pushes are blocked.
- **`dev`** — Integration branch. Feature branches are merged here first for integration testing
  before being promoted to `main`.
- **`feature/*`** — One branch per ticket, created from `dev` and named
  `feature/<ticket-id>-<short-desc>` (or `fix/<ticket-id>-<short-desc>` for bug fixes). Merged
  back into `dev` via pull request.

Pull requests always target `dev`. Commits follow the Conventional Commits standard in English
(`feat`, `fix`, `chore`, `docs`, `refactor`).

## Team

- **Ronaldo**
  > "Each day is a day of decision, and our decisions determine our destiny" — Russell M. Nelson
- **Lucas**
  > "Time doesn't heal anything, it just teaches us how to live with pain" — Itachi Uchiha
