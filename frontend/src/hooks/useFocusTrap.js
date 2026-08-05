import { useEffect } from 'react';

/**
 * Selector for the elements that can receive focus inside an overlay. Kept in
 * one place so the modal and the mobile menu trap focus identically.
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Every focusable element currently inside `container`, in DOM order. */
function focusableElements(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (element) => element.offsetParent !== null || element === document.activeElement,
  );
}

/**
 * Trap keyboard focus inside an overlay while it is open.
 *
 * While `active` is true this hook:
 *   - moves focus into the overlay (onto `initialFocusRef` when given, otherwise
 *     the first focusable element);
 *   - keeps Tab / Shift+Tab cycling inside it;
 *   - calls `onEscape` when Escape is pressed;
 *   - restores focus to whatever was focused before it opened (the trigger).
 *
 * Shared by <ConfirmModal> and <MobileMenu> so both behave the same way.
 *
 * @param {object} params
 * @param {boolean} params.active - whether the overlay is currently open
 * @param {React.RefObject<HTMLElement>} params.containerRef - the overlay element
 * @param {React.RefObject<HTMLElement>} [params.initialFocusRef] - element to focus first
 * @param {() => void} [params.onEscape] - called when Escape is pressed
 */
export function useFocusTrap({ active, containerRef, initialFocusRef, onEscape }) {
  useEffect(() => {
    if (!active) return undefined;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement;

    // Focus the safest control first (e.g. Cancel), falling back to the first
    // focusable element, then the overlay itself.
    const target = initialFocusRef?.current ?? focusableElements(container)[0] ?? container;
    target?.focus?.();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape?.();
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = focusableElements(containerRef.current);
      if (elements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && (current === first || !containerRef.current?.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // Only restore focus if it is still inside (or has left) the overlay, so a
      // deliberate focus move made while closing is not overridden.
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef, initialFocusRef, onEscape]);
}

export default useFocusTrap;
