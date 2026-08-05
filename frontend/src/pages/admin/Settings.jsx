import { useCallback, useEffect, useState } from 'react';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import ColorPicker from '../../components/ColorPicker/ColorPicker';
import { useToast } from '../../components/Toast/ToastProvider';
import { settingsService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import { SUPPORTED_CURRENCIES } from '../../utils/format';
import { normalizeHexColor, parseBranding } from '../../utils/branding';
import styles from './Settings.module.css';

// Mirror the backend rules (settings.validator.js) so invalid input is caught
// client-side before any request is sent.
const STORE_NAME_MIN = 2;
const STORE_NAME_MAX = 80;
const MAIN_TEXT_MAX = 2000;
const CONTACT_INFO_MAX = 500;
const LOGO_URL_MAX = 300;
const URL_PATTERN = /^https?:\/\/\S+$/i;

const EMPTY_FORM = {
  storeName: '',
  mainText: '',
  contactInfo: '',
  currency: '',
  // Branding is split into friendly controls; the API stores both inside the
  // single `branding` column as JSON (see backend/src/utils/branding.js).
  logoUrl: '',
  primaryColor: '',
  // The raw column value as loaded, sent back untouched so anything it carries
  // that has no control here (e.g. a tagline) survives the save.
  branding: '',
  // Customer notification emails on an order status change.
  emailEnabled: false,
};

/** Split a settings payload into the shape this form edits. */
function toFormState(settings) {
  const branding = parseBranding(settings.branding);

  return {
    storeName: settings.storeName ?? '',
    mainText: settings.mainText ?? '',
    contactInfo: settings.contactInfo ?? '',
    currency: settings.currency ?? '',
    logoUrl: branding.logoUrl ?? '',
    primaryColor: branding.primaryColor ?? '',
    branding: settings.branding ?? '',
    emailEnabled: Boolean(settings.emailEnabled),
  };
}

/**
 * Admin settings page: edit the single store configuration row that drives the
 * public storefront (name, landing copy, contact block, currency and branding).
 *
 * Current values are loaded from GET /api/settings on mount and saved through
 * PUT /api/settings. A successful save also refreshes the shared settings
 * context, so the storefront reflects the change without a stale copy lingering.
 */
function Settings() {
  const { applySettings } = useSettings();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  // Set when the logo preview fails to load, so the fallback is shown instead of
  // a broken image. Reset on every edit of the URL.
  const [logoFailed, setLogoFailed] = useState(false);
  // Read-only flag from the API: whether the server has the mailbox credentials
  // that the notification switch needs. Not part of the form — never sent back.
  const [emailConfigured, setEmailConfigured] = useState(false);

  // Initial load.
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Submit lifecycle.
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const settings = await settingsService.getSettings();
      setForm(toFormState(settings));
      setEmailConfigured(Boolean(settings.emailConfigured));
    } catch (err) {
      setLoadError(
        err.status
          ? err.message || 'Unable to load the store settings.'
          : 'Could not reach the server. Check that the backend is running and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setSavedMessage('');
    // A new URL deserves a fresh attempt at loading the preview.
    if (name === 'logoUrl') setLogoFailed(false);
  };

  const validate = () => {
    const errors = {};

    const storeName = form.storeName.trim();
    if (!storeName) {
      errors.storeName = 'Store name is required.';
    } else if (storeName.length < STORE_NAME_MIN || storeName.length > STORE_NAME_MAX) {
      errors.storeName = `Store name must be between ${STORE_NAME_MIN} and ${STORE_NAME_MAX} characters.`;
    }

    // The currency is chosen from a dropdown, so it can only be missing.
    if (!form.currency.trim()) {
      errors.currency = 'Currency is required.';
    }

    if (form.mainText.trim().length > MAIN_TEXT_MAX) {
      errors.mainText = `Main text must be at most ${MAIN_TEXT_MAX} characters.`;
    }

    if (form.contactInfo.trim().length > CONTACT_INFO_MAX) {
      errors.contactInfo = `Contact info must be at most ${CONTACT_INFO_MAX} characters.`;
    }

    // Branding: both parts are optional, but anything typed must be valid — an
    // invalid colour or logo URL blocks the save instead of being dropped.
    const logoUrl = form.logoUrl.trim();
    if (logoUrl !== '') {
      if (!URL_PATTERN.test(logoUrl)) {
        errors.logoUrl = 'Enter a full http(s) URL, or leave it empty.';
      } else if (logoUrl.length > LOGO_URL_MAX) {
        errors.logoUrl = `The logo URL must be at most ${LOGO_URL_MAX} characters.`;
      }
    }

    const primaryColor = form.primaryColor.trim();
    if (primaryColor !== '' && !normalizeHexColor(primaryColor)) {
      errors.primaryColor = 'Enter a hex colour such as #4F46E5, or leave it empty.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSavedMessage('');

    if (!validate()) return;

    // Optional fields are sent as null to clear the column rather than storing
    // an empty string, matching what the backend validator expects.
    const optional = (value) => (value.trim() === '' ? null : value.trim());

    const payload = {
      storeName: form.storeName.trim(),
      currency: form.currency.trim(),
      mainText: optional(form.mainText),
      contactInfo: optional(form.contactInfo),
      // `logoUrl` and `primaryColor` win; the raw `branding` value rides along
      // so anything else it holds (a tagline) is carried over by the backend.
      branding: optional(form.branding),
      logoUrl: form.logoUrl.trim(),
      primaryColor: form.primaryColor.trim(),
      // PUT replaces the whole row, so this must ride along on every save or
      // notifications would be switched off by editing any other field.
      emailEnabled: form.emailEnabled,
    };

    setIsSaving(true);

    try {
      const updated = await settingsService.updateSettings(payload);

      // Keep the form and the storefront in sync with what was actually stored.
      setForm(toFormState(updated));
      setEmailConfigured(Boolean(updated.emailConfigured));
      applySettings(updated);
      setSavedMessage('Settings saved. The storefront now shows the new values.');
      toast.success('Settings saved. The storefront now shows the new values.');
    } catch (err) {
      // `status === null` means the request never reached the backend (server
      // down, connection lost). Axios only offers a bare "Network Error" there,
      // so say something actionable instead of echoing it.
      const message = err.status
        ? err.message || 'The settings could not be saved.'
        : 'Could not reach the server. Check that the backend is running and try again.';
      setSubmitError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <section>
        <h1>Settings</h1>
        <p role="status">Loading settings…</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section>
        <h1>Settings</h1>
        <p className={styles.error} role="alert">
          {loadError}
        </p>
        <Button variant="secondary" onClick={loadSettings}>
          Retry
        </Button>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <h1>Settings</h1>
        <p className={styles.subtitle}>
          Manage the store configuration shown on the public storefront.
        </p>
      </header>

      <Card>
        <form onSubmit={handleSubmit} noValidate>
          <label className={styles.field} htmlFor="storeName">
            Store name
            <input
              id="storeName"
              className={styles.input}
              type="text"
              value={form.storeName}
              onChange={(event) => setField('storeName', event.target.value)}
              disabled={isSaving}
              aria-invalid={Boolean(fieldErrors.storeName)}
              aria-describedby={fieldErrors.storeName ? 'storeName-error' : undefined}
            />
            {fieldErrors.storeName && (
              <span className={styles.fieldError} id="storeName-error">
                {fieldErrors.storeName}
              </span>
            )}
          </label>

          <label className={styles.field} htmlFor="mainText">
            Main text <span className={styles.optional}>(optional)</span>
            <textarea
              id="mainText"
              className={styles.textarea}
              rows={5}
              value={form.mainText}
              onChange={(event) => setField('mainText', event.target.value)}
              disabled={isSaving}
              aria-invalid={Boolean(fieldErrors.mainText)}
              aria-describedby={fieldErrors.mainText ? 'mainText-error' : undefined}
            />
            <span className={styles.hint}>
              Welcome copy shown on the storefront landing page. {form.mainText.trim().length}/
              {MAIN_TEXT_MAX} characters.
            </span>
            {fieldErrors.mainText && (
              <span className={styles.fieldError} id="mainText-error">
                {fieldErrors.mainText}
              </span>
            )}
          </label>

          <label className={styles.field} htmlFor="contactInfo">
            Contact info <span className={styles.optional}>(optional)</span>
            <input
              id="contactInfo"
              className={styles.input}
              type="text"
              placeholder="support@store.com | +1 555 0100"
              value={form.contactInfo}
              onChange={(event) => setField('contactInfo', event.target.value)}
              disabled={isSaving}
              aria-invalid={Boolean(fieldErrors.contactInfo)}
              aria-describedby={fieldErrors.contactInfo ? 'contactInfo-error' : undefined}
            />
            <span className={styles.hint}>Shown in the storefront footer.</span>
            {fieldErrors.contactInfo && (
              <span className={styles.fieldError} id="contactInfo-error">
                {fieldErrors.contactInfo}
              </span>
            )}
          </label>

          {/*
            The currency drives only the SYMBOL prices are displayed with — the
            amounts themselves never change. The backend still accepts any
            3-letter code, so a store already configured with something outside
            this list keeps working: that code is offered as an extra option.
          */}
          <label className={styles.field} htmlFor="currency">
            Currency
            <select
              id="currency"
              className={`${styles.input} ${styles.select}`}
              value={form.currency}
              onChange={(event) => setField('currency', event.target.value)}
              disabled={isSaving}
              aria-invalid={Boolean(fieldErrors.currency)}
              aria-describedby={fieldErrors.currency ? 'currency-error' : undefined}
            >
              {!SUPPORTED_CURRENCIES.some(({ code }) => code === form.currency) && (
                <option value={form.currency}>{form.currency || 'Select a currency'}</option>
              )}
              {SUPPORTED_CURRENCIES.map(({ code, symbol, name }) => (
                <option key={code} value={code}>
                  {code} {symbol} — {name}
                </option>
              ))}
            </select>
            <span className={styles.hint}>
              Sets the symbol shown with every price across the storefront, the cart and the
              admin. Amounts are not converted.
            </span>
            {fieldErrors.currency && (
              <span className={styles.fieldError} id="currency-error">
                {fieldErrors.currency}
              </span>
            )}
          </label>

          {/* ── Branding: logo + primary colour ─────────────────────────── */}
          <fieldset className={styles.fieldset} disabled={isSaving}>
            <legend className={styles.legend}>Branding</legend>

            <label className={styles.field} htmlFor="logoUrl">
              Logo URL <span className={styles.optional}>(optional)</span>
              <input
                id="logoUrl"
                className={styles.input}
                type="url"
                inputMode="url"
                placeholder="https://cdn.store.com/logo.png"
                value={form.logoUrl}
                onChange={(event) => setField('logoUrl', event.target.value)}
                aria-invalid={Boolean(fieldErrors.logoUrl)}
                aria-describedby={fieldErrors.logoUrl ? 'logoUrl-error' : undefined}
              />
              <span className={styles.hint}>
                Shown in the storefront header. Without one, the store name is used instead.
              </span>
              {fieldErrors.logoUrl && (
                <span className={styles.fieldError} id="logoUrl-error">
                  {fieldErrors.logoUrl}
                </span>
              )}
            </label>

            {/* Live preview at the size the header actually renders it. */}
            <div className={styles.logoPreview}>
              <span className={styles.logoPreviewLabel}>Header preview</span>
              <div className={styles.logoPreviewBar}>
                {form.logoUrl.trim() && !fieldErrors.logoUrl && !logoFailed ? (
                  <img
                    className={styles.logoPreviewImage}
                    src={form.logoUrl.trim()}
                    alt=""
                    width="36"
                    height="36"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <span className={styles.logoPreviewFallback} aria-hidden="true">
                    {(form.storeName.trim() || 'S').charAt(0)}
                  </span>
                )}
                <span className={styles.logoPreviewName}>{form.storeName || 'Store'}</span>
              </div>
              {logoFailed && (
                <span className={styles.fieldError}>
                  That logo could not be loaded — the store name will be shown instead.
                </span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="primaryColor">
                Primary colour <span className={styles.optional}>(optional)</span>
              </label>
              <ColorPicker
                id="primaryColor"
                value={form.primaryColor}
                onChange={(value) => setField('primaryColor', value)}
                error={fieldErrors.primaryColor}
                disabled={isSaving}
              />
              <span className={styles.hint}>
                Accent colour used for buttons, links and highlights on the storefront.
                Leave it empty to keep the default theme colour.
              </span>
            </div>
          </fieldset>

          {/* ── Customer notifications ──────────────────────────────────── */}
          <fieldset className={styles.fieldset} disabled={isSaving}>
            <legend className={styles.legend}>Notifications</legend>

            <label className={styles.checkboxField} htmlFor="emailEnabled">
              <input
                id="emailEnabled"
                className={styles.checkbox}
                type="checkbox"
                checked={form.emailEnabled}
                onChange={(event) => setField('emailEnabled', event.target.checked)}
                disabled={!emailConfigured}
                aria-describedby="emailEnabled-hint"
              />
              Email customers when their order status changes
            </label>

            <span className={styles.hint} id="emailEnabled-hint">
              {emailConfigured
                ? 'The customer is notified on every status change. With this off the status change still happens — the customer is simply not emailed.'
                : 'Unavailable: the server has no email sender configured. Set BREVO_API_KEY and MAIL_FROM_EMAIL in the backend environment, then restart the backend.'}
            </span>
          </fieldset>

          {submitError && (
            <p className={styles.error} role="alert">
              {submitError}
            </p>
          )}
          {savedMessage && (
            <p className={styles.success} role="status">
              {savedMessage}
            </p>
          )}

          <div className={styles.formActions}>
            <Button type="submit" disabled={isSaving}>
              {isSaving && <span className={styles.spinner} aria-hidden="true" />}
              {isSaving ? 'Saving…' : 'Save settings'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={loadSettings}
              disabled={isSaving}
            >
              Reset
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}

export default Settings;
