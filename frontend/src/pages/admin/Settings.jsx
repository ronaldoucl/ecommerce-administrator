import { useCallback, useEffect, useState } from 'react';

import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import { useToast } from '../../components/Toast/ToastProvider';
import { settingsService } from '../../services';
import { useSettings } from '../../context/SettingsContext';
import StoreFields from './settings/StoreFields';
import BrandingFields from './settings/BrandingFields';
import NotificationFields from './settings/NotificationFields';
import { EMPTY_FORM, toFormState, toPayload, validateForm } from './settings/form';
import styles from './Settings.module.css';

// Settings page — edits the one row that drives the whole storefront.
//
// After a successful save we also update the settings context, so the shop shows
// the new values straight away instead of keeping an old copy around.
//
// This file owns the state and the requests. The fields themselves are in
// ./settings (one component per group) and the rules are in ./settings/form.
function Settings() {
  const { applySettings } = useSettings();
  const toast = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  // True once the logo preview fails, so we show the fallback instead of a
  // broken image. Reset whenever the URL is edited.
  const [logoFailed, setLogoFailed] = useState(false);
  // Read-only, from the API: can the server send email at all? Not part of the
  // form, so it never gets sent back.
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
    // New URL, so give the preview another go.
    if (name === 'logoUrl') setLogoFailed(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSavedMessage('');

    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSaving(true);

    try {
      const updated = await settingsService.updateSettings(toPayload(form));

      // Refill the form from the response, not from what we sent, so we show
      // what was actually stored.
      setForm(toFormState(updated));
      setEmailConfigured(Boolean(updated.emailConfigured));
      applySettings(updated);
      setSavedMessage('Settings saved. The storefront now shows the new values.');
      toast.success('Settings saved. The storefront now shows the new values.');
    } catch (err) {
      // status === null means the request never got there. Axios just says
      // "Network Error", so we say something more useful instead.
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

  const fieldProps = { form, fieldErrors, setField, isSaving };

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
          <StoreFields {...fieldProps} />

          <BrandingFields
            {...fieldProps}
            logoFailed={logoFailed}
            onLogoError={() => setLogoFailed(true)}
          />

          <NotificationFields {...fieldProps} emailConfigured={emailConfigured} />

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
