/* Reading feed: explicit loading, empty, error and success states. */
(function () {
  'use strict';

  var loading = document.querySelector('[data-testid="loading"]');
  var errorBox = document.querySelector('[data-testid="error"]');
  var errorMessage = document.querySelector('[data-testid="error-message"]');
  var list = document.querySelector('[data-testid="articles"]');
  var empty = document.querySelector('[data-testid="empty"]');
  var reload = document.querySelector('[data-testid="reload"]');

  function show(element, visible) {
    element.hidden = !visible;
  }

  function render(articles) {
    list.replaceChildren();
    articles.forEach(function (article) {
      var row = document.createElement('article');
      row.className = 'article';
      row.setAttribute('data-testid', 'article');

      var body = document.createElement('div');
      var title = document.createElement('p');
      title.className = 'article-title';
      title.textContent = article.title;
      var meta = document.createElement('p');
      meta.className = 'article-meta';
      meta.textContent = article.author + ' · ' + article.minutes + ' min read';
      body.append(title, meta);

      var tag = document.createElement('span');
      tag.className = 'pill pill--neutral';
      tag.textContent = article.tag;

      row.append(body, tag);
      list.append(row);
    });

    show(empty, articles.length === 0);
  }

  async function load() {
    show(loading, true);
    show(errorBox, false);
    show(empty, false);
    list.replaceChildren();

    try {
      var response = await fetch('/api/feed', { headers: { Accept: 'application/json' } });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      var payload = await response.json();
      render(Array.isArray(payload.articles) ? payload.articles : []);
    } catch (cause) {
      errorMessage.textContent = 'Could not load the feed (' + cause.message + ').';
      show(errorBox, true);
    } finally {
      show(loading, false);
    }
  }

  reload.addEventListener('click', load);
  // Exposed for tests that drive the state machine directly.
  window.labFeed = { load: load };
  load();
})();
