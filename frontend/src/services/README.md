# services

All network calls to the backend API live here. Per project conventions,
components never call `fetch`/`axios` directly — they import a service.

- [`api.js`](./api.js) — central axios instance. Base URL comes from
  `import.meta.env.VITE_API_URL` (expected to include the `/api` prefix).
  Request interceptor attaches `Authorization: Bearer <token>` from
  `localStorage["auth_token"]`; response interceptor normalizes every failure
  to a consistent `{ message }` error.
- [`authService.js`](./authService.js) — `login`, `me`.
- [`productService.js`](./productService.js) — `getFeatured`, `getById`.
- [`orderService.js`](./orderService.js) — stubs (checkout, orders).
- [`settingsService.js`](./settingsService.js) — stubs (store settings).
- [`analyticsService.js`](./analyticsService.js) — stubs (dashboard summary).
- [`healthService.js`](./healthService.js) — **temporary** `/health` check
  (S1-RON-02); safe to delete after verifying the backend connection.

See `../../.env.example` for the required environment variables.
