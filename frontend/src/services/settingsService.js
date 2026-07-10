// Settings service — stubs for a later ticket.
//
// Wraps the `/settings` endpoints from the API contract (store configuration).
//
// import api from './api';

const settingsService = {
  /**
   * Return the store configuration row (used by the storefront).
   * GET /api/settings (public)
   */
  async get() {
    // TODO: return (await api.get('/settings')).data;
    throw new Error('settingsService.get is not implemented yet');
  },

  /**
   * Update the store configuration row.
   * PUT /api/settings (protected)
   * @param {object} _payload - { storeName, mainText, contactInfo, currency, branding }
   */
  async update(_payload) {
    // TODO: return (await api.put('/settings', _payload)).data;
    throw new Error('settingsService.update is not implemented yet');
  },
};

export default settingsService;
