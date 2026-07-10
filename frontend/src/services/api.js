import axios from 'axios';

/**
 * Central axios instance for all backend communication.
 *
 * Per project conventions, no component talks to the network directly:
 * everything goes through the service modules in `src/services`, which are
 * built on top of this instance.
 *
 * The base URL is read from the `VITE_API_URL` environment variable and is
 * expected to include the `/api` prefix (e.g. `http://localhost:4000/api`),
 * so service paths stay short: `api.get('/products/featured')`.
 */

/** localStorage key under which the JWT is persisted. */
export const AUTH_TOKEN_KEY = 'auth_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor: attach the bearer token when one is stored.
 */
api.interceptors.request.use((config) => {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/**
 * Response interceptor: normalize every failure into a consistent error whose
 * `message` follows the backend contract shape `{ "message": "..." }`, with a
 * sensible fallback when the backend did not provide one (network error,
 * timeout, unexpected status, etc.).
 *
 * The rejected value is a real `Error` (so `err.message` works everywhere) and
 * also carries `status` and `data` for callers that need more detail.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const backendMessage = error.response?.data?.message;
    const message =
      backendMessage || error.message || 'Unexpected error. Please try again.';

    const normalized = new Error(message);
    normalized.status = error.response?.status ?? null;
    normalized.data = error.response?.data ?? null;

    return Promise.reject(normalized);
  },
);

export default api;
