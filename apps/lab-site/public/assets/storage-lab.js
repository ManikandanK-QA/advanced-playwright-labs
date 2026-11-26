/* Storage lab: writes only harmless preferences, then dumps both storages. */
(function () {
  'use strict';

  window.localStorage.setItem('labs.theme', 'light');
  window.localStorage.setItem('labs.visual.baseline', 'linux');
  window.sessionStorage.setItem('labs.visit', '1');

  var dump = {
    local: Object.assign({}, window.localStorage),
    session: Object.assign({}, window.sessionStorage),
  };

  document.querySelector('[data-testid="storage-dump"]').textContent = JSON.stringify(
    dump,
    null,
    2,
  );
  window.__storageReady = true;
})();
