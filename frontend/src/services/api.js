import axios from 'axios';

// The one axios instance every service is built on. Components never call the
// network directly — they go through src/services.
//
// VITE_API_URL must already include /api (e.g. http://localhost:4000/api) so the
// services can use short paths like api.get('/products/featured').

export const AUTH_TOKEN_KEY = 'auth_token';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the token, if we have one.
api.interceptors.request.use((config) => {
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Make every failure look the same: a real Error whose message is the backend's
// { message } when there is one, plus `status` and `data` for anyone who needs
// the details.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401 means the session is dead: forget the token and, if we are inside the
    // admin area, go back to login. Doing it here means no page has to repeat it.
    if (error.response?.status === 401) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
      if (typeof window !== 'undefined') {
        const { pathname } = window.location;
        if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
          window.location.assign('/admin/login');
        }
      }
    }

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
