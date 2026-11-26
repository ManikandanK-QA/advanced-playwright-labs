/* CSP lab: reflects a query parameter into two different sinks. */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var payload = params.get('payload') || '<b>reflected</b>';

  // Unsafe sink: executes markup. CSP is the only thing standing between this
  // and an injected event handler.
  document.querySelector('[data-testid="reflected"]').innerHTML = payload;

  // Safe sink: the same input, rendered as text.
  document.querySelector('[data-testid="safe"]').textContent = payload;

  window.__cspReady = true;
})();
