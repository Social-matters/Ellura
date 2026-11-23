const PAGE_WRAPPER_SELECTOR = '.page-wrapper';
const SQUEEZE_QUERY = window.matchMedia('(min-width: 990px)');

/**
 * Whether `.page-wrapper` is the page's scroll container.
 * Horizon's squeeze layout (desktop ≥990px) scrolled `.page-wrapper`; this theme's base.css lets
 * the document scroll at every width so window-based smooth scroll and ScrollTrigger work.
 * Checking the computed overflow keeps this module correct for either layout.
 *
 * @returns {Element | null} The page wrapper when it scrolls, otherwise null
 */
function getScrollingPageWrapper() {
  if (!SQUEEZE_QUERY.matches) return null;
  const wrapper = document.querySelector(PAGE_WRAPPER_SELECTOR);
  if (!wrapper) return null;
  const { overflowY } = getComputedStyle(wrapper);
  return overflowY === 'auto' || overflowY === 'scroll' ? wrapper : null;
}

/**
 * Returns the current page scroll container: `.page-wrapper` when it scrolls (squeeze layout),
 * otherwise the document root.
 *
 * @returns {Element} The scroll container element
 */
function getScrollContainer() {
  return getScrollingPageWrapper() ?? document.scrollingElement ?? document.documentElement;
}

/**
 * Returns the current scroll position of the page scroll container.
 *
 * @returns {number} The scrollTop value
 */
function getScrollTop() {
  return getScrollContainer().scrollTop;
}

/**
 * Scrolls the page scroll container to the specified position.
 *
 * @param {ScrollToOptions} options - The scroll options (top, left, behavior)
 */
function scrollTo(options) {
  getScrollContainer().scrollTo(options);
}

/**
 * Manual scroll restoration for `.page-wrapper` as scroll container.
 *
 * On desktop (≥990px), the browser restores scroll on `document.scrollingElement`, which
 * has `overflow: hidden` in the squeeze layout and can never scroll. We disable native
 * restoration and handle it via `history.state` instead.
 *
 * On mobile (<990px), `document.scrollingElement` IS the scroll container, so native
 * restoration works perfectly — leave it enabled to avoid a one-frame flash from rAF.
 *
 * Save: `pagehide` — fires exactly once per navigation, captures the exact scroll position
 * at the moment the user leaves. More accurate than debounced scroll (which can be stale
 * if the user scrolls and immediately clicks a link).
 *
 * Restore: unconditional `pageshow` — Horizon uses cross-document view transitions, so
 * `pageshow` fires on every navigation (both bfcache and fresh loads). `popstate` is not
 * used because it doesn't fire for cross-document back navigation.
 */
function updateScrollRestoration() {
  history.scrollRestoration = getScrollingPageWrapper() ? 'manual' : 'auto';
}

updateScrollRestoration();
SQUEEZE_QUERY.addEventListener('change', updateScrollRestoration);

/**
 * Saves the current scroll position into the current history entry.
 */
function saveScrollPosition() {
  try {
    const currentState = typeof history.state === 'object' && history.state !== null ? history.state : {};
    history.replaceState({ ...currentState, scrollTop: getScrollContainer().scrollTop }, '');
  } catch (_) {
    // replaceState can throw if the state object exceeds the browser's size limit
  }
}

window.addEventListener('pagehide', saveScrollPosition);

/**
 * Restores a saved scroll position onto the current scroll container.
 *
 * @param {number} savedScrollTop
 */
function restoreSavedScrollTop(savedScrollTop) {
  if (!Number.isFinite(savedScrollTop) || savedScrollTop < 0) return;

  const container = getScrollContainer();
  const maxScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
  const targetScrollTop = Math.min(savedScrollTop, maxScrollTop);

  // Use scrollTo with 'instant' to override CSS scroll-behavior: smooth on .page-wrapper
  container.scrollTo({ top: targetScrollTop, behavior: 'instant' });
}

window.addEventListener('pageshow', () => {
  const scrollTop = history.state?.scrollTop;
  if (scrollTop == null) return;

  requestAnimationFrame(() => {
    restoreSavedScrollTop(scrollTop);
  });
});

/**
 * Same-document scroll restoration for pushState navigation.
 *
 * `pagehide`/`pageshow` only fire for cross-document navigations. For same-document
 * pushState navigation (filters, pagination), we patch pushState to auto-save scroll
 * position before each new entry, and restore on popstate (back/forward).
 */
const originalPushState = history.pushState.bind(history);
history.pushState = function (state, title, url) {
  saveScrollPosition();
  originalPushState(state, title, url);
};

window.addEventListener('popstate', () => {
  const scrollTop = history.state?.scrollTop;
  if (scrollTop == null) return;

  requestAnimationFrame(() => {
    restoreSavedScrollTop(scrollTop);
  });
});

/**
 * Returns the appropriate target for listening to scroll events.
 * On desktop (≥990px), `.page-wrapper` emits scroll events directly.
 * On mobile, the document root scrolls natively and scroll events bubble to `document`.
 *
 * @returns {EventTarget} The target to call addEventListener('scroll', ...) on
 */
function getScrollEventTarget() {
  return getScrollingPageWrapper() ?? document;
}

/**
 * Returns the appropriate root for an IntersectionObserver monitoring the scroll container.
 * On desktop (≥990px), `.page-wrapper` must be set as the explicit root.
 * On mobile, `null` uses the viewport root (the IntersectionObserver default).
 *
 * @returns {Element | null} The root option for IntersectionObserver
 */
function getIntersectionRoot() {
  return getScrollingPageWrapper();
}

export {
  getScrollContainer,
  getScrollTop,
  scrollTo,
  getScrollEventTarget,
  getIntersectionRoot,
  SQUEEZE_QUERY as scrollContainerMediaQuery,
};
