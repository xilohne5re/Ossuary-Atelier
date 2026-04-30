/* OSSUARY ATELIER — Main JS Entry Point
 * Concatenates and manages core site functionality.
 * This file replaces individual initializations in page-specific files.
 */

(function() {
  // Wait for dependencies
  function init() {
    // 1. Background Animation (if present on page)
    if (typeof window.bgAnimation === 'undefined' && document.getElementById('background-canvas')) {
      // Background is initialized by its own file if loaded
      console.log('[Main] Background ready');
    }

    // 2. Cursor effects are initialized by their own files
  }

  // Run initialization
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();