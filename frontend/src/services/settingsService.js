import api from './api';

// The store settings are a single row, so both calls work on that same row and
// return the same object.
const settingsService = {
  // GET /api/settings — public.
  async getSettings() {
    // The timestamp makes every URL different so the browser cannot hand us a
    // cached copy — an admin change has to show up on the next storefront load.
    // The backend ignores unknown query params here.
    const { data } = await api.get('/settings', { params: { _: Date.now() } });
    return data;
  },

  // PUT /api/settings — admin only. Replaces the whole row, so send every field
  // you want to keep: anything omitted goes back to its default.
  //
  // logoUrl and primaryColor are not real columns. The backend packs them into
  // the `branding` column as JSON, and they win over the raw `branding` string
  // if both are sent.
  async updateSettings(payload) {
    const { data } = await api.put('/settings', payload);
    return data;
  },
};

export default settingsService;
