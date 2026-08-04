import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { settingsService } from '../services';
import { DEFAULT_CURRENCY } from '../utils/format';
import { parseBranding } from '../utils/branding';

/**
 * SettingsContext — the store configuration shared across the storefront.
 *
 * The settings come from the public GET /api/settings endpoint and drive the
 * store name, the landing copy, the contact block, the branding (logo/colour)
 * and the currency prices are displayed in.
 *
 * They are deliberately NOT persisted anywhere on the client: every page load
 * fetches them again, so a change saved in the admin panel is visible on the
 * next storefront load with no stale copy to clear. Within a single-page
 * session, `applySettings` lets the admin form push the values it just saved
 * into the context without a second request.
 */
const SettingsContext = createContext(null);

/** Shown while the real settings load, and if they cannot be loaded at all. */
const FALLBACK_SETTINGS = {
  storeName: 'Store',
  mainText: null,
  contactInfo: null,
  currency: DEFAULT_CURRENCY,
  branding: null,
};

function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await settingsService.getSettings();
      setSettings(data);
      return data;
    } catch (err) {
      // A store without settings must still be browsable, so the fallback keeps
      // the shell rendering while the failure is exposed for callers that care.
      setError(err.message || 'Unable to load the store settings.');
      setSettings(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /** Replace the cached settings with a freshly saved payload (admin form). */
  const applySettings = useCallback((updated) => {
    if (updated) {
      setSettings(updated);
      setError('');
    }
  }, []);

  const value = useMemo(() => {
    const effective = settings ?? FALLBACK_SETTINGS;

    return {
      settings: effective,
      storeName: effective.storeName || FALLBACK_SETTINGS.storeName,
      mainText: effective.mainText || null,
      contactInfo: effective.contactInfo || null,
      currency: effective.currency || DEFAULT_CURRENCY,
      branding: parseBranding(effective.branding),
      isLoading,
      error,
      reload: load,
      applySettings,
    };
  }, [settings, isLoading, error, load, applySettings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/** Access the store settings. Must be used inside <SettingsProvider>. */
function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
}

export { SettingsContext, SettingsProvider, useSettings };
