/*
 * Heavy page: injects one layout shift and one long task after load.
 *
 * This is a deliberate regression used to prove the measurement harness reacts.
 * Both effects are bounded and happen exactly once, so the resulting CLS value
 * is stable enough to assert on.
 */
(function () {
  'use strict';

  function settle() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.__labSettled = true;
      });
    });
  }

  window.addEventListener('load', function () {
    setTimeout(function () {
      var banner = document.querySelector('[data-testid="late-banner"]');
      if (banner) {
        banner.hidden = false;
      }

      // Block the main thread for ~80 ms so the longtask observer fires.
      var deadline = performance.now() + 80;
      while (performance.now() < deadline) {
        // Deliberate busy wait.
      }

      settle();
    }, 120);
  });
})();
