import { useEffect, useRef, useState } from 'react';

import { placeholderImage } from '../../utils/format';
import styles from './ProductGallery.module.css';

/**
 * Product image gallery: a large main image with a strip of thumbnails for the
 * other angles, the way a shopper expects on a product page.
 *
 * The images arrive in their stored order and the FIRST one is the product's
 * primary image, so it is what shows first. Clicking (or arrowing onto) a
 * thumbnail swaps the main image.
 *
 * Degrades gracefully at both ends: a product with a single image shows no
 * thumbnail strip, a product with none shows a generated placeholder, and an
 * image URL that fails to load falls back to that placeholder instead of a
 * broken-image icon.
 *
 * @param {object} props
 * @param {Array<{ id?: number, url: string, alt?: string|null }>} [props.images]
 * @param {string} props.productName - used for the alt text and the placeholder
 */
function ProductGallery({ images = [], productName }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedUrls, setFailedUrls] = useState(() => new Set());
  const thumbRefs = useRef([]);

  // A different product (or a reordered gallery) starts from its primary image.
  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  const activeImage = images[activeIndex];
  const isBroken = activeImage ? failedUrls.has(activeImage.url) : true;
  const fallback = placeholderImage(productName);

  const markFailed = (url) =>
    setFailedUrls((current) => {
      const next = new Set(current);
      next.add(url);
      return next;
    });

  // Left/right arrows move between thumbnails, keeping focus on the strip.
  const handleThumbKeyDown = (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    event.preventDefault();
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const next = (activeIndex + delta + images.length) % images.length;

    setActiveIndex(next);
    thumbRefs.current[next]?.focus();
  };

  return (
    <div className={styles.gallery}>
      <img
        className={styles.mainImage}
        src={isBroken ? fallback : activeImage.url}
        alt={activeImage?.alt || productName}
        width="800"
        height="800"
        onError={() => activeImage && markFailed(activeImage.url)}
      />

      {images.length > 1 && (
        <ul className={styles.thumbs} onKeyDown={handleThumbKeyDown}>
          {images.map((image, index) => {
            const isActive = index === activeIndex;
            const thumbSrc = failedUrls.has(image.url) ? fallback : image.url;

            return (
              <li key={image.id ?? image.url}>
                <button
                  type="button"
                  ref={(element) => {
                    thumbRefs.current[index] = element;
                  }}
                  className={isActive ? styles.thumbActive : styles.thumb}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show image ${index + 1} of ${images.length}`}
                  aria-pressed={isActive}
                >
                  <img
                    src={thumbSrc}
                    alt=""
                    onError={() => markFailed(image.url)}
                    width="72"
                    height="72"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default ProductGallery;
