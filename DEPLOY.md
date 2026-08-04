# Frontend Deployment (Vercel)

Deploy guide and final-release checklist for the **frontend** of the Product-Focused E-commerce
Management System. The backend has its own guide: [backend/DEPLOY.md](backend/DEPLOY.md).

> The actual deploy is a **manual step**. This document tells you exactly what to click and what
> to verify.

## Project settings on Vercel

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

## Environment variables

Set these under **Project → Settings → Environment Variables** (Production scope at minimum).

| Variable | Value | Notes |
| --- | --- | --- |
| `VITE_API_URL` | `<BACKEND_URL>/api` | **Must include the `/api` suffix.** e.g. `https://ecommerce-administrator-backend.onrender.com/api` |

Vite inlines `VITE_*` variables **at build time**, not at runtime. Changing this value in the
dashboard does nothing until you **redeploy**.

## CORS: the backend must allow the frontend origin

The backend allows any `*.vercel.app` origin automatically, so preview deployments work out of
the box. If you attach a **custom domain**, add it to `CLIENT_ORIGIN` on Render (comma-separated)
and redeploy the backend, or every API call will fail CORS.

---

## Final frontend deploy checklist

Work through this in order before calling the release done.

### 1. Point the frontend at the live backend

- [ ] Backend is deployed and awake: open `<BACKEND_URL>/api/health` → `{"status":"ok"}`.
- [ ] On Vercel, `VITE_API_URL` is set to `<BACKEND_URL>/api` — with `/api`, and **no trailing slash**.
- [ ] Local `frontend/.env` is **not** what ships: it is gitignored and never uploaded. The Vercel
      dashboard value is the one that counts.

### 2. Verify the production build locally

```bash
cd frontend
npm install
npm run lint          # expect only the pre-existing fast-refresh warnings
npm run build         # must complete with no errors
npm run preview       # serves the built app on http://localhost:4173
```

- [ ] `npm run build` completes with no errors.
- [ ] `npm run preview` loads the storefront and the featured product renders.

> To preview against the **live** backend, temporarily set `VITE_API_URL=<BACKEND_URL>/api` in
> `frontend/.env` and rebuild. The backend's `CLIENT_ORIGIN` must then include
> `http://localhost:4173`, or the preview will fail CORS.

### 3. Redeploy on Vercel

- [ ] Push to the branch Vercel tracks (usually `main`), **or** trigger
      **Deployments → ⋯ → Redeploy** in the dashboard.
- [ ] If you changed `VITE_API_URL`, redeploy with **"Use existing Build Cache" unchecked** — the
      variable is baked in at build time and a cached build will keep the old value.
- [ ] Wait for the deployment to reach **Ready**.

### 4. Smoke-check the live URL

Open `<FRONTEND_URL>` and confirm, in order:

- [ ] **Storefront** loads; store name and welcome text come from settings (not placeholder text).
- [ ] **Featured product** renders with an image and a price — no "Network Error", no `NaN`.
- [ ] **Product detail** opens; switching variants updates the price and stock.
- [ ] **Cart** accepts an item and survives a page refresh.
- [ ] **Checkout** submits and produces an **order reference**.
- [ ] **Deep link works:** paste `<FRONTEND_URL>/admin/orders` in a fresh tab — it must reach the
      app (redirecting to login), **not** a 404. This proves the SPA rewrite is live.
- [ ] **Admin login** succeeds with the seeded credentials.
- [ ] **Dashboard** shows all five analytics tiles with real numbers.
- [ ] **Settings** loads current values, and saving one is reflected on the storefront after a reload.
- [ ] **Browser console is clean** — no errors on any of the pages above.
- [ ] **Mobile:** the storefront and admin dashboard are usable at 375px, and the admin sidebar
      collapses into a working menu.

### 5. Update the docs

- [ ] Replace `<FRONTEND_URL: ...>` and `<BACKEND_URL: ...>` in [README.md](README.md) with the
      real URLs.
- [ ] Capture the screenshots listed in [docs/screenshots/README.md](docs/screenshots/README.md)
      and drop them into that folder.
- [ ] Commit and push.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| Every page shows "Network Error" | `VITE_API_URL` wrong/missing, or backend asleep | Check the value includes `/api`; open `<BACKEND_URL>/api/health` to wake the service. |
| Works locally, fails on Vercel | `VITE_API_URL` still points at `localhost` | Set the Production variable and redeploy **without** build cache. |
| API calls blocked by CORS | Frontend origin not allowed | `*.vercel.app` is allowed automatically; for a custom domain add it to `CLIENT_ORIGIN` on Render and redeploy the backend. |
| Refreshing `/admin/...` gives a 404 | SPA rewrite missing | Confirm `frontend/vercel.json` is present and Root Directory is `frontend`. |
| Admin area redirects to login immediately | Token expired (1-day lifetime) or 401 from the API | Log in again; if it persists, check `JWT_SECRET` matches the one used to seed. |
| Prices render as `—` | The API returned a non-numeric price | Check the product's `basePrice` / variant price in the admin. |
| First load takes ~30–60 s | Render free-tier cold start | Expected. Warm `/api/health` before demoing. |
