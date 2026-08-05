// Everything about the settings form that is not markup: the empty state, the
// conversions to and from the API payload, and the validation rules. Keeping it
// here means Settings.jsx is only state and layout, and these rules are easy to
// find without scrolling through JSX.

import { normalizeHexColor, parseBranding } from '../../../utils/branding';

// Same limits as settings.validator.js on the backend, so we can catch mistakes
// before sending the request.
export const STORE_NAME_MIN = 2;
export const STORE_NAME_MAX = 80;
export const MAIN_TEXT_MAX = 2000;
export const CONTACT_INFO_MAX = 500;
export const LOGO_URL_MAX = 300;

const URL_PATTERN = /^https?:\/\/\S+$/i;

export const EMPTY_FORM = {
  storeName: '',
  mainText: '',
  contactInfo: '',
  currency: '',
  // Two separate controls for the user, but the API packs them into one JSON
  // column called `branding`.
  logoUrl: '',
  primaryColor: '',
  // The raw column as we loaded it. We send it back untouched so anything it
  // holds that has no control here (a tagline, say) is not wiped on save.
  branding: '',
  emailEnabled: false,
};

// API payload -> what the form edits.
export function toFormState(settings) {
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

// Form state -> the PUT /api/settings body.
export function toPayload(form) {
  // Empty optional fields go as null, not "", so the column is actually cleared.
  // That is what the backend validator expects.
  const optional = (value) => (value.trim() === '' ? null : value.trim());

  return {
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
}

// Returns { field: message }. Empty object means the form is fine.
export function validateForm(form) {
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

  return errors;
}
