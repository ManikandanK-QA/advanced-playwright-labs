/*
 * Loaded as a blocking classic script before the document body is parsed, so the
 * listener exists before any inline script can be blocked.
 */
window.__cspViolations = [];

document.addEventListener('securitypolicyviolation', function (event) {
  window.__cspViolations.push({
    directive: event.violatedDirective,
    blockedURI: event.blockedURI,
    source: event.sourceFile || '',
  });
});
