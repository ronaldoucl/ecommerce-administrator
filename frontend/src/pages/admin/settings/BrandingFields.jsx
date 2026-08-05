import ColorPicker from '../../../components/ColorPicker/ColorPicker';
import styles from '../Settings.module.css';

// Branding section: logo URL with a live preview of the header, plus the colour.
//
// The <fieldset disabled> is what locks the controls while saving, which is why
// none of the inputs inside have their own `disabled`.
function BrandingFields({ form, fieldErrors, setField, isSaving, logoFailed, onLogoError }) {
  return (
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
              onError={onLogoError}
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
  );
}

export default BrandingFields;
