import { useCallback, useEffect, useState } from 'react';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { settingsService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import styles from './Settings.module.css';

// Mirror the backend rules (settings.validator.js) so invalid input is caught
// client-side before any request is sent.
const STORE_NAME_MIN = 2;
const STORE_NAME_MAX = 80;
const MAIN_TEXT_MAX = 2000;
const CONTACT_INFO_MAX = 500;
const BRANDING_MAX = 500;
const CURRENCY_PATTERN = /^[A-Z]{3}$/;

const EMPTY_FORM = {
  storeName: '',
  mainText: '',
  contactInfo: '',
  currency: '',
  branding: '',
};

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

  const [form, setForm] = useState(EMPTY_FORM);

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
      setForm({
        storeName: settings.storeName ?? '',
        mainText: settings.mainText ?? '',
        contactInfo: settings.contactInfo ?? '',
        currency: settings.currency ?? '',
        branding: settings.branding ?? '',
      });
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
  };

  const validate = () => {
    const errors = {};

    const storeName = form.storeName.trim();
    if (!storeName) {
      errors.storeName = 'Store name is required.';
    } else if (storeName.length < STORE_NAME_MIN || storeName.length > STORE_NAME_MAX) {
      errors.storeName = `Store name must be between ${STORE_NAME_MIN} and ${STORE_NAME_MAX} characters.`;
    }

    const currency = form.currency.trim();
    if (!currency) {
      errors.currency = 'Currency is required.';
    } else if (!CURRENCY_PATTERN.test(currency)) {
      errors.currency = 'Currency must be a 3-letter uppercase code (e.g. USD, EUR, CRC).';
    }

    if (form.mainText.trim().length > MAIN_TEXT_MAX) {
      errors.mainText = `Main text must be at most ${MAIN_TEXT_MAX} characters.`;
    }

    if (form.contactInfo.trim().length > CONTACT_INFO_MAX) {
      errors.contactInfo = `Contact info must be at most ${CONTACT_INFO_MAX} characters.`;
    }

    if (form.branding.trim().length > BRANDING_MAX) {
      errors.branding = `Branding must be at most ${BRANDING_MAX} characters.`;
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
      branding: optional(form.branding),
    };

    setIsSaving(true);

    try {
      const updated = await settingsService.updateSettings(payload);

      // Keep the form and the storefront in sync with what was actually stored.
      setForm({
        storeName: updated.storeName ?? '',
        mainText: updated.mainText ?? '',
        contactInfo: updated.contactInfo ?? '',
        currency: updated.currency ?? '',
        branding: updated.branding ?? '',
      });
      applySettings(updated);
      setSavedMessage('Settings saved. The storefront now shows the new values.');
    } catch (err) {
      // `status === null` means the request never reached the backend (server
      // down, connection lost). Axios only offers a bare "Network Error" there,
      // so say something actionable instead of echoing it.
      setSubmitError(
        err.status
          ? err.message || 'The settings could not be saved.'
          : 'Could not reach the server. Check that the backend is running and try again.',
      );
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
            The currency input is deliberately NOT capped with maxLength: a
            too-long code such as "USDD" must be typeable so it fails validation
            with a visible message instead of being silently truncated to a
            valid one. Input is upper-cased as it is typed, since codes are
            always uppercase and "usd" should not fail on a technicality.
          */}
          <label className={styles.field} htmlFor="currency">
            Currency
            <input
              id="currency"
              className={`${styles.input} ${styles.inputShort}`}
              type="text"
              placeholder="USD"
              autoCapitalize="characters"
              value={form.currency}
              onChange={(event) => setField('currency', event.target.value.toUpperCase())}
              disabled={isSaving}
              aria-invalid={Boolean(fieldErrors.currency)}
              aria-describedby={fieldErrors.currency ? 'currency-error' : undefined}
            />
            <span className={styles.hint}>
              Three-letter code used for every price on the storefront.
            </span>
            {fieldErrors.currency && (
              <span className={styles.fieldError} id="currency-error">
                {fieldErrors.currency}
              </span>
            )}
          </label>

          <label className={styles.field} htmlFor="branding">
            Branding <span className={styles.optional}>(optional)</span>
            <textarea
              id="branding"
              className={styles.textarea}
              rows={3}
              placeholder='{"primaryColor":"#4F46E5","logoUrl":"https://cdn.store.com/logo.png"}'
              value={form.branding}
              onChange={(event) => setField('branding', event.target.value)}
              disabled={isSaving}
              aria-invalid={Boolean(fieldErrors.branding)}
              aria-describedby={fieldErrors.branding ? 'branding-error' : undefined}
            />
            <span className={styles.hint}>
              A logo URL, a hex colour such as #4F46E5, a JSON object with
              <code> logoUrl</code> / <code>primaryColor</code>, or a short tagline.
            </span>
            {fieldErrors.branding && (
              <span className={styles.fieldError} id="branding-error">
                {fieldErrors.branding}
              </span>
            )}
          </label>

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
