import api from './api';

/**
 * Settings service — wraps the `/settings` endpoints from the API contract.
 *
 * `StoreSettings` is a single-row configuration table, so both endpoints work on
 * that one row and return the same shape:
 *   { id, storeName, mainText, contactInfo, currency, branding, emailEnabled,
 *     emailConfigured }
 *
 * `emailConfigured` is READ-ONLY: it is derived from the server environment (are
 * the mailbox credentials present?) and is rejected if sent back on a PUT.
 */
const settingsService = {
  /**
   * Return the store configuration row (used by the storefront).
   * GET /api/settings (public — no token required).
   *
   * @returns {Promise<object>} the store settings
   */
  async getSettings() {
    // Settings change from the admin panel and must be visible on the very next
    // storefront load, so the request carries a throwaway timestamp parameter:
    // it makes each URL unique and keeps the browser from serving a heuristically
    // cached copy of a previous response. The backend ignores unknown query
    // parameters on this endpoint.
    const { data } = await api.get('/settings', { params: { _: Date.now() } });
    return data;
  },

  /**
   * Update the store configuration row.
   * PUT /api/settings (protected — the JWT is attached by the api.js request
   * interceptor, so callers never handle the token themselves).
   *
   * `storeName` and `currency` are required; `mainText`, `contactInfo` and
   * `branding` accept a string or `null` to clear the column.
   *
   * `logoUrl` and `primaryColor` are convenience fields rather than columns: the
   * backend serializes both into the single `branding` column as JSON. When they
   * are sent they take precedence over the raw `branding` string in the same
   * request (which is still parsed, so a tagline it carries is preserved).
   *
   * `emailEnabled` switches the customer order-status notifications on or off.
   * Like every optional field here it defaults to `false` when omitted, so the
   * caller must send it on every save.
   *
   * @param {{ storeName: string, currency: string, mainText?: string|null,
   *   contactInfo?: string|null, branding?: string|null, logoUrl?: string|null,
   *   primaryColor?: string|null, emailEnabled?: boolean }} payload
   * @returns {Promise<object>} the updated store settings
   */
  async updateSettings(payload) {
    const { data } = await api.put('/settings', payload);
    return data;
  },
};

export default settingsService;
