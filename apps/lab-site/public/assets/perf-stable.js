/* Stable page: nothing moves after load. Used as the performance baseline. */
(function () {
  'use strict';

  function settle() {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.__labSettled = true;
      });
    });
  }

  if (document.readyState === 'complete') {
    settle();
  } else {
    window.addEventListener('load', settle);
  }
})();
