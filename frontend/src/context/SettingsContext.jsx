import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { settingsService } from '../services';
import { DEFAULT_CURRENCY } from '../utils/format';
import { parseBranding } from '../utils/branding';

// The store configuration (name, welcome text, contact, branding, currency),
// read from the public GET /api/settings.
//
// We deliberately do NOT cache these anywhere on the client: every page load
// fetches them again, so an admin change shows up immediately with no stale copy
// to clear. During a single session applySettings lets the admin form push what
// it just saved into the context without a second request.
const SettingsContext = createContext(null);

// Used while the real settings load, and if they never arrive.
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
      // The shop still has to be usable without settings, so we fall back and
      // just record the error for whoever wants to show it.
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

function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
}

export { SettingsContext, SettingsProvider, useSettings };
