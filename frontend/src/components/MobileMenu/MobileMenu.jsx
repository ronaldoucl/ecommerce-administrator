import { useCallback, useEffect, useId, useRef, useState } from 'react';

import useFocusTrap from '../../hooks/useFocusTrap';
import styles from './MobileMenu.module.css';

/**
 * Accessible hamburger menu, shared by BOTH navigations: the public storefront
 * header and the admin dashboard shell. Only the links differ, so the toggle,
 * the drawer and every accessibility behaviour live here once.
 *
 *   <MobileMenu label="Main menu">
 *     {(close) => <Link to="/cart" onClick={close}>Cart</Link>}
 *   </MobileMenu>
 *
 * Behaviour: the button carries aria-label and aria-expanded and controls the
 * drawer by id; while open, focus is trapped inside, Escape closes, a click on
 * the backdrop (outside the panel) closes, any click within the panel content
 * closes it too (so following a link dismisses the menu), and focus returns to
 * the hamburger button. Body scrolling is locked so the page behind cannot
 * shift or scroll horizontally.
 *
 * @param {object} props
 * @param {string} [props.label='Menu'] - accessible name of the toggle button
 * @param {string} [props.title] - heading shown at the top of the drawer
 * @param {((close: () => void) => React.ReactNode)|React.ReactNode} props.children
 * @param {string} [props.className] - extra class for the toggle button
 */
function MobileMenu({ label = 'Menu', title, children, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const panelId = useId();

  const close = useCallback(() => setIsOpen(false), []);

  useFocusTrap({ active: isOpen, containerRef: panelRef, onEscape: close });

  // Lock body scroll while the drawer is open so the page underneath cannot
  // scroll (or overflow sideways) behind it.
  useEffect(() => {
    if (!isOpen) return undefined;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        className={`${styles.toggle} ${className}`.trim()}
        aria-label={label}
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.bars} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {isOpen && (
        <div
          className={styles.backdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            ref={panelRef}
            id={panelId}
            className={styles.panel}
            role="dialog"
            aria-modal="true"
            aria-label={title || label}
            tabIndex={-1}
          >
            <div className={styles.panelHeader}>
              {title && <p className={styles.panelTitle}>{title}</p>}
              <button
                type="button"
                className={styles.closeButton}
                onClick={close}
                aria-label="Close menu"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {/*
              Activating any link or button inside the panel closes it, which
              covers every nav item without each nav remembering an onClick.
              Clicks on plain text (e.g. the signed-in email) leave it open.
            */}
            <div
              className={styles.panelBody}
              onClick={(event) => {
                if (event.target.closest('a, button')) close();
              }}
            >
              {typeof children === 'function' ? children(close) : children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MobileMenu;
