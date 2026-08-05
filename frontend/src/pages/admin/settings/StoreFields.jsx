import { SUPPORTED_CURRENCIES } from '../../../utils/format';
import { MAIN_TEXT_MAX } from './form';
import styles from '../Settings.module.css';

// First part of the settings form: name, welcome text, contact info, currency.
// No state of its own — the page owns all of it and passes it down.
function StoreFields({ form, fieldErrors, setField, isSaving }) {
  return (
    <>
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
    </>
  );
}

export default StoreFields;
