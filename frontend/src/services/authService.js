import api from './api';

const authService = {
  // POST /api/auth/login — returns { token, user }.
  async login(credentials) {
    const { data } = await api.post('/auth/login', credentials);
    return data;
  },

  // GET /api/auth/me — used on page load to check the saved token is still good.
  async me() {
    const { data } = await api.get('/auth/me');
    return data;
  },
};

export default authService;
