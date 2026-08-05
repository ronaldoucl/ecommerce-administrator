import { normalizeHexColor } from '../../utils/branding';
import styles from './ColorPicker.module.css';

/**
 * Friendly hex colour control: a swatch preview, the native colour picker and a
 * text field for the exact hex value, all kept in sync.
 *
 * The text field is the source of truth (it holds whatever the admin typed, even
 * mid-edit), while the swatch and the native picker follow the last value that
 * parses as a colour — so dragging the picker fills the text field, and typing a
 * valid hex moves the picker. No colour-picker library is involved.
 *
 * Validation is left to the caller: pass `error` to show it inline. Empty means
 * "no custom colour", which is valid and falls back to the default theme.
 *
 * @param {object} props
 * @param {string} props.id - id of the text input, for the caller's <label>
 * @param {string} props.value - the raw hex value being edited (may be partial)
 * @param {(value: string) => void} props.onChange
 * @param {string} [props.fallback='#4F46E5'] - swatch colour when nothing is set
 * @param {string} [props.error]
 * @param {boolean} [props.disabled]
 */
function ColorPicker({ id, value, onChange, fallback = '#4F46E5', error = '', disabled = false }) {
  // The last usable colour: what the swatch and the native input display.
  const resolved = normalizeHexColor(value) ?? fallback;

  return (
    <div className={styles.picker}>
      <div className={styles.controls}>
        <span
          className={styles.swatch}
          style={{ backgroundColor: resolved }}
          aria-hidden="true"
        />

        <input
          className={styles.nativeInput}
          type="color"
          value={resolved}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          disabled={disabled}
          aria-label="Pick the primary colour"
        />

        <input
          id={id}
          className={styles.hexInput}
          type="text"
          inputMode="text"
          placeholder="#4F46E5"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
      </div>

      {error && (
        <span className={styles.error} id={`${id}-error`}>
          {error}
        </span>
      )}

      {/* Live preview: what the colour will actually look like once saved. */}
      <div className={styles.preview} style={{ '--preview-color': resolved }}>
        <div className={styles.previewHeader}>
          <span className={styles.previewDot} />
          <span>Storefront header</span>
        </div>
        <div className={styles.previewBody}>
          <span className={styles.previewButton}>Add to cart</span>
          <span className={styles.previewLink}>View product</span>
        </div>
      </div>
    </div>
  );
}

export default ColorPicker;
