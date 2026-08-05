import { useRef, useState } from 'react';

import Button from '../Button/Button';
import { uploadService } from '../../services';
import styles from './ImageManager.module.css';

// The image gallery editor in the product form.
//
// You can upload a file or paste a URL — either way it ends up as a URL in the
// product's `images`, so pasting still works if the server has no Cloudinary.
//
// The ORDER of the rows matters: it is sent to the API exactly as shown and the
// first image is the main one, so moving a row changes what the storefront leads
// with.

// These three all mirror the backend rules — keep them in sync.
const IMAGE_URL_PATTERN = /^https?:\/\/\S+$/i;
const MAX_IMAGES = 10;
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp,image/gif,image/avif';

// A blank row is fine (it gets dropped on save); anything else must be a URL.
export function imageUrlError(url) {
  const value = (url ?? '').trim();
  if (value === '') return '';
  if (!IMAGE_URL_PATTERN.test(value)) return 'Enter a full http(s) image URL.';
  return '';
}

// Drops the blank rows and trims the rest. Exported so the form sends exactly
// what the editor is showing.
export function toImagePayload(images) {
  return images
    .filter((image) => (image.url ?? '').trim() !== '')
    .map((image) => ({
      url: image.url.trim(),
      alt: (image.alt ?? '').trim() === '' ? null : image.alt.trim(),
    }));
}

function ImageManager({ images, onChange, disabled = false }) {
  // URLs that would not load, so we can say so instead of showing a broken
  // image icon while the admin fixes the address.
  const [brokenUrls, setBrokenUrls] = useState(() => new Set());

  // The file input is hidden and clicked by our own button, so it looks like the
  // rest of the form instead of the browser's default control.
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const remainingSlots = MAX_IMAGES - images.length;

  // Uploads one file at a time on purpose: if the fourth one fails, the first
  // three are already added and we only report the one that did not make it.
  const handleFilesChosen = async (event) => {
    const files = Array.from(event.target.files ?? []).slice(0, remainingSlots);
    // Let the same file be picked again later (e.g. after a failed upload).
    event.target.value = '';
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadError('');

    const uploaded = [];
    let failure = '';

    for (const file of files) {
      try {
        const image = await uploadService.uploadImage(file);
        // The file name is a sensible default alt text; it stays editable.
        uploaded.push({ url: image.url, alt: file.name.replace(/\.[^.]+$/, '') });
      } catch (err) {
        failure = err.message || `"${file.name}" could not be uploaded.`;
        break;
      }
    }

    if (uploaded.length > 0) onChange([...images, ...uploaded]);
    setUploadError(failure);
    setIsUploading(false);
  };

  const markBroken = (url) =>
    setBrokenUrls((current) => {
      const next = new Set(current);
      next.add(url);
      return next;
    });

  const updateRow = (index, patch) =>
    onChange(images.map((image, i) => (i === index ? { ...image, ...patch } : image)));

  const addRow = () => onChange([...images, { url: '', alt: '' }]);

  const removeRow = (index) => onChange(images.filter((_, i) => i !== index));

  // Reordering just swaps with the row above or below. Enough to move any image
  // to the front, and no drag-and-drop library needed.
  const moveRow = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className={styles.manager}>
      <p className={styles.hint}>
        Upload images from your computer, or paste an image URL per row. The first image is
        the product&apos;s primary image and leads the storefront gallery — use the arrows to
        reorder.
      </p>

      {images.length === 0 ? (
        <p className={styles.empty}>No images yet. The storefront shows a placeholder.</p>
      ) : (
        <ul className={styles.list}>
          {images.map((image, index) => {
            const url = (image.url ?? '').trim();
            const error = imageUrlError(image.url);
            const isValid = url !== '' && !error && !brokenUrls.has(url);

            return (
              // Using the index as key is fine here: rows have no id of their
              // own and their position IS their identity.
              <li key={index} className={styles.row}>
                <div className={styles.preview}>
                  {isValid ? (
                    <img src={url} alt="" onError={() => markBroken(url)} width="56" height="56" />
                  ) : (
                    <span className={styles.previewEmpty} aria-hidden="true">
                      {brokenUrls.has(url) ? '⚠' : '🖼'}
                    </span>
                  )}
                  {index === 0 && <span className={styles.primaryBadge}>Primary</span>}
                </div>

                <div className={styles.fields}>
                  <label className={styles.label}>
                    <span className={styles.labelText}>Image URL</span>
                    <input
                      className={styles.input}
                      type="url"
                      inputMode="url"
                      placeholder="https://cdn.store.com/product-1.jpg"
                      value={image.url}
                      onChange={(event) => updateRow(index, { url: event.target.value })}
                      disabled={disabled}
                      aria-invalid={Boolean(error)}
                    />
                  </label>

                  <label className={styles.label}>
                    <span className={styles.labelText}>Alt text (optional)</span>
                    <input
                      className={styles.input}
                      type="text"
                      placeholder="Front view"
                      value={image.alt}
                      onChange={(event) => updateRow(index, { alt: event.target.value })}
                      disabled={disabled}
                    />
                  </label>

                  {error && <span className={styles.error}>{error}</span>}
                  {!error && brokenUrls.has(url) && (
                    <span className={styles.error}>
                      This image could not be loaded. Check the URL.
                    </span>
                  )}
                </div>

                <div className={styles.rowActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => moveRow(index, -1)}
                    disabled={disabled || index === 0}
                    aria-label={`Move image ${index + 1} up`}
                  >
                    <span aria-hidden="true">↑</span>
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    onClick={() => moveRow(index, 1)}
                    disabled={disabled || index === images.length - 1}
                    aria-label={`Move image ${index + 1} down`}
                  >
                    <span aria-hidden="true">↓</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.removeButton}`}
                    onClick={() => removeRow(index)}
                    disabled={disabled}
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Hidden native input; the button below is the visible control. */}
      <input
        ref={fileInputRef}
        className={styles.fileInput}
        type="file"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleFilesChosen}
        tabIndex={-1}
        aria-hidden="true"
      />

      <div className={styles.addActions}>
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading || remainingSlots <= 0}
        >
          {isUploading && <span className={styles.spinner} aria-hidden="true" />}
          {isUploading ? 'Uploading…' : 'Upload images'}
        </Button>
        <Button
          variant="secondary"
          onClick={addRow}
          disabled={disabled || isUploading || remainingSlots <= 0}
        >
          Add image URL
        </Button>
      </div>

      {uploadError && (
        <span className={styles.error} role="alert">
          {uploadError}
        </span>
      )}

      <span className={styles.hint}>
        {remainingSlots <= 0
          ? `Up to ${MAX_IMAGES} images per product.`
          : 'JPEG, PNG, WebP, GIF or AVIF, up to 5 MB each.'}
      </span>
    </div>
  );
}

export default ImageManager;
