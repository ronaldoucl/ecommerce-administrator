# Deployment

Deploy guides for the **Product-Focused E-commerce Management System**. The two halves ship
independently: the backend to [Render](https://render.com) and the frontend to Vercel.

Deploy the **backend first** — the frontend needs the live backend URL at build time.

> The actual deploy is a **manual step**. This document tells you exactly what to click and what
> to verify.

---

## Backend (Render)

### What you need first

1. A **Render account** (free tier is fine for the demo).
2. The repository pushed to **GitHub** (the backend lives in the `backend/` folder).
3. Your existing **cloud PostgreSQL** database and its connection string (already on Render).

### Required environment variables

Set these on the platform (never commit them). `PORT` is **not** in this list — Render
injects it automatically and the app reads it via `process.env.PORT`.

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | Cloud Postgres connection string, with SSL | `postgresql://USER:PASS@HOST/DB?sslmode=require` |
| `JWT_SECRET` | Secret used to sign JWTs | a long random string |
| `ADMIN_EMAIL` | Seed admin email | `admin@store.com` |
| `ADMIN_PASSWORD` | Seed admin password | a strong password |
| `CLIENT_ORIGIN` | Allowed frontend origin for CORS | `http://localhost:5173` (dev) → your Vercel URL (prod) |

Optional variables (image uploads and customer emails) are documented in
[`backend/.env.example`](../backend/.env.example).

### Build & start commands

- **Build:** `npm install && npm run build`
  - `npm run build` runs `prisma migrate deploy && prisma generate`, so **migrations are
    applied automatically on every deploy** and the Prisma client is generated.
- **Start:** `node server.js`

### Option A — Deploy via the Render dashboard (recommended)

1. Push the repo to GitHub if you have not already.
2. In Render: **New → Web Service**.
3. **Connect** your GitHub account and select this repository.
4. Configure the service:
   - **Root Directory:** `backend`  ← important; the app lives in this subfolder.
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node server.js`
   - **Plan:** Free
   - **Region:** the same region as your Postgres instance (e.g. Ohio).
   - **Health Check Path:** `/api/health`
5. Open the **Environment** section and add each variable from the table above
   (**Environment → Add Environment Variable**). Paste the real values here — this is the
   only place secrets live. Do **not** add `PORT`.
6. Click **Create Web Service**. Render installs, runs migrations, generates the client,
   and starts the server.
7. When the deploy finishes, Render shows a public URL like
   `https://ecommerce-administrator-backend.onrender.com`.

### Option B — Deploy via Blueprint (render.yaml)

A `render.yaml` is included in `backend/`. To use it as a Blueprint, **copy it to the
repository root** (Render only auto-detects `render.yaml` at the repo root), commit, then
in Render choose **New → Blueprint** and select the repo. You will still be prompted to
fill in the `sync: false` secret values in the dashboard.

### Verify the deployment

1. Open `https://ecommerce-administrator-backend.onrender.com/api/health` in a browser → expect
   `{ "status": "ok" }` with HTTP 200.
2. Migrations: the build log shows `prisma migrate deploy` applying the `init` migration
   (or "No pending migrations" if the shared DB is already migrated).
3. Admin user: if you are deploying against the **same** database that was already seeded
   locally, the admin already exists. For a **fresh** production DB, run the seed once from
   the Render **Shell** tab: `npm run build` is not enough — run `npx prisma db seed`.

### Update `CLIENT_ORIGIN` after the frontend is deployed

`CLIENT_ORIGIN` defaults to `http://localhost:5173`. The backend already allows any
`*.vercel.app` origin automatically, so the production frontend works without this — set it
only for a custom domain, comma-separated, then redeploy.

### Free-tier cold starts

Render's free web services **spin down after ~15 minutes of inactivity**. The first request
after idling can take **~30–60 seconds** while the service wakes up (a "cold start").
For a live demo, hit `/api/health` a minute beforehand to warm it up, or consider a paid
plan to avoid spin-down.

### Security

- No secrets are hardcoded or committed. Everything sensitive is read from environment
  variables (`src/config/env.js`), and `.env` is gitignored.
- `.env.example` documents every variable with placeholder values only.

---

## Frontend (Vercel)

### Project settings on Vercel

| Setting | Value |
| --- | --- |
| **Root Directory** | `frontend` ← important; the app lives in this subfolder |
| **Framework Preset** | Vite |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm install` |
| **Node.js Version** | 20.x or newer |

`frontend/vercel.json` already contains the SPA rewrite that sends every path to `index.html`.
Without it, deep links such as `/admin/orders` would 404 on refresh — do not remove it.

### Environment variables

Set these under **Project → Settings → Environment Variables** (Production scope at minimum).

| Variable | Value | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `https://ecommerce-administrator-backend.onrender.com/api` | **Must include the `/api` suffix**, and no trailing slash. |

Vite inlines `VITE_*` variables **at build time**, not at runtime. Changing this value in the
dashboard does nothing until you **redeploy**.

### CORS: the backend must allow the frontend origin

The backend allows any `*.vercel.app` origin automatically, so preview deployments work out of
the box. If you attach a **custom domain**, add it to `CLIENT_ORIGIN` on Render (comma-separated)
and redeploy the backend, or every API call will fail CORS.

---

### Final frontend deploy checklist

Work through this in order before calling the release done.

#### 1. Point the frontend at the live backend

- [ ] Backend is deployed and awake: open `https://ecommerce-administrator-backend.onrender.com/api/health` → `{"status":"ok"}`.
- [ ] On Vercel, `VITE_API_URL` is set to `https://ecommerce-administrator-backend.onrender.com/api` — with `/api`, and **no trailing slash**.
- [ ] Local `frontend/.env` is **not** what ships: it is gitignored and never uploaded. The Vercel
      dashboard value is the one that counts.

#### 2. Verify the production build locally

```bash
cd frontend
npm install
npm run lint          # expect only the pre-existing fast-refresh warnings
npm run build         # must complete with no errors
npm run preview       # serves the built app on http://localhost:4173
```

- [ ] `npm run build` completes with no errors.
- [ ] `npm run preview` loads the storefront and the featured product renders.

> To preview against the **live** backend, temporarily set `VITE_API_URL=https://ecommerce-administrator-backend.onrender.com/api` in
> `frontend/.env` and rebuild. The backend's `CLIENT_ORIGIN` must then include
> `http://localhost:4173`, or the preview will fail CORS.

#### 3. Redeploy on Vercel

- [ ] Push to the branch Vercel tracks (usually `main`), **or** trigger
      **Deployments → ⋯ → Redeploy** in the dashboard.
- [ ] If you changed `VITE_API_URL`, redeploy with **"Use existing Build Cache" unchecked** — the
      variable is baked in at build time and a cached build will keep the old value.
- [ ] Wait for the deployment to reach **Ready**.

#### 4. Smoke-check the live URL

Open `https://ecommerce-administrator.vercel.app` and confirm, in order:

- [ ] **Storefront** loads; store name and welcome text come from settings (not placeholder text).
- [ ] **Featured product** renders with an image and a price — no "Network Error", no `NaN`.
- [ ] **Product detail** opens; switching variants updates the price and stock.
- [ ] **Cart** accepts an item and survives a page refresh.
- [ ] **Checkout** submits and produces an **order reference**.
- [ ] **Deep link works:** paste `https://ecommerce-administrator.vercel.app/admin/orders` in a fresh tab — it must reach the
      app (redirecting to login), **not** a 404. This proves the SPA rewrite is live.
- [ ] **Admin login** succeeds with the seeded credentials.
- [ ] **Dashboard** shows all five analytics tiles with real numbers.
- [ ] **Settings** loads current values, and saving one is reflected on the storefront after a reload.
- [ ] **Browser console is clean** — no errors on any of the pages above.
- [ ] **Mobile:** the storefront and admin dashboard are usable at 375px, and the admin sidebar
      collapses into a working menu.

#### 5. Update the docs

- [ ] If either URL changed, update the "Live links" section of [README.md](../README.md) and the
      `VITE_API_URL` values in this guide.
- [ ] Commit and push.

---

### Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Every page shows "Network Error" | `VITE_API_URL` wrong/missing, or backend asleep | Check the value includes `/api`; open `https://ecommerce-administrator-backend.onrender.com/api/health` to wake the service. |
| Works locally, fails on Vercel | `VITE_API_URL` still points at `localhost` | Set the Production variable and redeploy **without** build cache. |
| API calls blocked by CORS | Frontend origin not allowed | `*.vercel.app` is allowed automatically; for a custom domain add it to `CLIENT_ORIGIN` on Render and redeploy the backend. |
| Refreshing `/admin/...` gives a 404 | SPA rewrite missing | Confirm `frontend/vercel.json` is present and Root Directory is `frontend`. |
| Admin area redirects to login immediately | Token expired (1-day lifetime) or 401 from the API | Log in again; if it persists, check `JWT_SECRET` matches the one used to seed. |
| Prices render as `—` | The API returned a non-numeric price | Check the product's `basePrice` / variant price in the admin. |
| First load takes ~30–60 s | Render free-tier cold start | Expected. Warm `/api/health` before demoing. |
