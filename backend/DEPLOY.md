# Backend Deployment (Render)

Deploy guide for the **Product-Focused E-commerce Management System** backend to
[Render](https://render.com), connected to the existing cloud PostgreSQL database.

## What you need first

1. A **Render account** (free tier is fine for the demo).
2. The repository pushed to **GitHub** (the backend lives in the `backend/` folder).
3. Your existing **cloud PostgreSQL** database and its connection string (already on Render).

## Required environment variables

Set these on the platform (never commit them). `PORT` is **not** in this list — Render
injects it automatically and the app reads it via `process.env.PORT`.

| Variable | Description | Example |
| --- | --- | --- |
| `DATABASE_URL` | Cloud Postgres connection string, with SSL | `postgresql://USER:PASS@HOST/DB?sslmode=require` |
| `JWT_SECRET` | Secret used to sign JWTs | a long random string |
| `ADMIN_EMAIL` | Seed admin email | `admin@store.com` |
| `ADMIN_PASSWORD` | Seed admin password | a strong password |
| `CLIENT_ORIGIN` | Allowed frontend origin for CORS | `http://localhost:5173` (dev) → your Vercel URL (prod) |

## Build & start commands

- **Build:** `npm install && npm run build`
  - `npm run build` runs `prisma migrate deploy && prisma generate`, so **migrations are
    applied automatically on every deploy** and the Prisma client is generated.
- **Start:** `node server.js`

## Option A — Deploy via the Render dashboard (recommended)

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

## Option B — Deploy via Blueprint (render.yaml)

A `render.yaml` is included in `backend/`. To use it as a Blueprint, **copy it to the
repository root** (Render only auto-detects `render.yaml` at the repo root), commit, then
in Render choose **New → Blueprint** and select the repo. You will still be prompted to
fill in the `sync: false` secret values in the dashboard.

## Verify the deployment

1. Open `https://<your-service>.onrender.com/api/health` in a browser → expect
   `{ "status": "ok" }` with HTTP 200.
2. Migrations: the build log shows `prisma migrate deploy` applying the `init` migration
   (or "No pending migrations" if the shared DB is already migrated).
3. Admin user: if you are deploying against the **same** database that was already seeded
   locally, the admin already exists. For a **fresh** production DB, run the seed once from
   the Render **Shell** tab: `npm run build` is not enough — run `npx prisma db seed`.

## Update `CLIENT_ORIGIN` after the frontend is deployed

`CLIENT_ORIGIN` currently defaults to `http://localhost:5173`. Once the frontend is live on
Vercel, update `CLIENT_ORIGIN` on Render to the Vercel URL (e.g. `https://your-app.vercel.app`)
and redeploy so CORS allows the production frontend.

## Free-tier cold starts

Render's free web services **spin down after ~15 minutes of inactivity**. The first request
after idling can take **~30–60 seconds** while the service wakes up (a "cold start").
For a live demo, hit `/api/health` a minute beforehand to warm it up, or consider a paid
plan to avoid spin-down.

## Security

- No secrets are hardcoded or committed. Everything sensitive is read from environment
  variables (`src/config/env.js`), and `.env` is gitignored.
- `.env.example` documents every variable with placeholder values only.
