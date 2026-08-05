import { brandStyle, normalizeHexColor } from '../../utils/branding';
import styles from './ColorPicker.module.css';

// Colour picker: a swatch, the browser's native colour input and a text box for
// the exact hex, all kept in sync.
//
// The text box is the source of truth because it holds whatever you typed, even
// half-finished ("#4F4"). The swatch and the native input follow the last value
// that actually parses. So dragging the picker fills the text box, and typing a
// valid hex moves the picker. No colour library involved.
//
// Leaving it empty is valid and means "use the default theme colour".
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

      {/*
        Live preview: what the colour will actually look like once saved. It is
        driven by brandStyle — the same derivation the storefront shell uses — so
        the label colours shown here match the real thing, including on pale
        brand colours where white text would be unreadable.
      */}
      <div className={styles.preview} style={brandStyle(resolved)}>
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
