# services

All network calls to the backend API live here (per project conventions,
components never call `fetch`/`axios` directly).

The base API client and the per-resource service modules (products, orders,
auth, ...) are added in the next ticket. The API base URL will be read from
`import.meta.env.VITE_API_URL`.

_Placeholder for S1-RON-01 — no API modules yet._
