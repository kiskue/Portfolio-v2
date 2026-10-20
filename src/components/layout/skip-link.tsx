/**
 * The first stop for keyboard users (2.4.1): hidden until focused, then pinned top-left above
 * every layer. A plain anchor, so the browser moves focus to <main id="content" tabindex="-1">.
 */
export function SkipLink() {
  return (
    <a
      href="#content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-control focus:bg-ink focus:px-4 focus:py-2.5 focus:text-button focus:text-raised focus:shadow-lg"
    >
      Skip to content
    </a>
  );
}
