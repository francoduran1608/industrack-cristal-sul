import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent accidental horizontal swipe-to-navigate browser/iframe gestures
// when scrolling horizontal containers (tables, lists, divs) to their left or right limits on mobile/touch screens.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  let touchStartX = 0;
  let touchStartY = 0;
  let scrollParent: HTMLElement | null = null;
  let shouldPreventGesture: boolean | null = null; // null = undecided, true = prevent, false = allow

  const getHorizontalScrollParent = (el: HTMLElement | null): HTMLElement | null => {
    let current: HTMLElement | null = el;
    while (current && current !== document.body && current !== document.documentElement) {
      const style = window.getComputedStyle(current);
      const overflowX = style.overflowX;
      const overflow = style.overflow;
      if (
        (overflowX === 'auto' || overflowX === 'scroll' || overflow === 'auto' || overflow === 'scroll') &&
        current.scrollWidth > current.clientWidth
      ) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  };

  document.addEventListener('touchstart', (e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      scrollParent = getHorizontalScrollParent(e.target as HTMLElement);
      shouldPreventGesture = null; // reset decision
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e: TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    // Determine the gesture type and direction once a threshold is met
    if (shouldPreventGesture === null) {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      if (absX > 6 || absY > 6) {
        if (absX > absY) {
          // Primarily horizontal gesture
          if (scrollParent) {
            const scrollLeft = scrollParent.scrollLeft;
            const maxScroll = scrollParent.scrollWidth - scrollParent.clientWidth;

            // Swiping right: finger moves right -> scrolls content back to the left (towards scrollLeft = 0)
            if (deltaX > 0 && scrollLeft <= 2) {
              shouldPreventGesture = true; // At left boundary, block history back
            }
            // Swiping left: finger moves left -> scrolls content forward to the right (towards scrollLeft = maxScroll)
            else if (deltaX < 0 && scrollLeft >= maxScroll - 2) {
              shouldPreventGesture = true; // At right boundary, block history forward
            }
            else {
              shouldPreventGesture = false; // Within boundaries, allow normal scroll
            }
          } else {
            // No horizontal scrollable parent exists, prevent default to block history swipe navigation
            shouldPreventGesture = true;
          }
        } else {
          // Primarily vertical gesture, allow browser defaults
          shouldPreventGesture = false;
        }
      }
    }

    // Apply the locked decision for the duration of this touch gesture
    if (shouldPreventGesture === true) {
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  }, { passive: false });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
