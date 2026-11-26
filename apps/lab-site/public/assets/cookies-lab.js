/* Cookies lab: shows exactly what page JavaScript can read. */
(function () {
  'use strict';

  var sink = document.querySelector('[data-testid="document-cookie"]');
  sink.textContent = document.cookie || '(empty)';
  window.__cookiesReady = true;
})();
