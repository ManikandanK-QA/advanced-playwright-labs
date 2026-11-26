import { feedBody, jsonHandler, sampleArticles } from '../../src/api/lab-api';
import { expect, test } from '../../src/fixtures';
import { FeedPage } from '../../src/pages';

// Every /api/ call in this file must be answered by a mock, or teardown fails.
test.use({ requireApiMocks: true });

test('renders the mocked feed in the order the API returned it', async ({ page, ledger }) => {
  await ledger.route('**/api/feed', jsonHandler(200, feedBody()));

  const feed = new FeedPage(page);
  await feed.open();
  await feed.waitForArticles(sampleArticles.length);

  await expect(feed.articles).toHaveCount(sampleArticles.length);
  await expect(feed.loading).toBeHidden();
  await expect(feed.error).toBeHidden();
  await expect(feed.empty).toBeHidden();
  expect(await feed.titles()).toEqual(sampleArticles.map((article) => article.title));
});

test('shows the empty state for a feed with no articles', async ({ page, ledger }) => {
  await ledger.route('**/api/feed', jsonHandler(200, feedBody([])));

  const feed = new FeedPage(page);
  await feed.open();

  await expect(feed.empty).toBeVisible();
  await expect(feed.articles).toHaveCount(0);
  await expect(feed.loading).toBeHidden();
  await expect(feed.error).toBeHidden();
});

test('recovers from a server error when the user retries', async ({ page, ledger }) => {
  let attempts = 0;
  await ledger.route('**/api/feed', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await jsonHandler(503, { error: 'feed_unavailable' })(route);
      return;
    }
    await jsonHandler(200, feedBody())(route);
  });

  const feed = new FeedPage(page);
  await feed.open();

  await expect(feed.error).toBeVisible();
  await expect(feed.errorMessage).toContainText('HTTP 503');
  await expect(feed.articles).toHaveCount(0);

  await feed.reload();

  await feed.waitForArticles(sampleArticles.length);
  await expect(feed.error).toBeHidden();
  expect(attempts).toBe(2);
});

test('reports a network failure instead of hanging', async ({ page, ledger }) => {
  await ledger.route('**/api/feed', (route) => route.abort('failed'));

  const feed = new FeedPage(page);
  await feed.open();

  await expect(feed.error).toBeVisible();
  await expect(feed.errorMessage).toContainText('Could not load the feed');
  await expect(feed.loading).toBeHidden();
  await expect(feed.reloadButton).toBeEnabled();
});

/**
 * The request is held open until the test releases it, so the loading state is
 * observed deterministically. Waiting for a timer here would make the test pass
 * on a slow machine for the wrong reason.
 */
test('keeps the loading state visible while the request is in flight', async ({ page, ledger }) => {
  let release = (): void => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  await ledger.route('**/api/feed', async (route) => {
    await gate;
    await jsonHandler(200, feedBody())(route);
  });

  const feed = new FeedPage(page);
  await feed.open();

  await expect(feed.loading).toBeVisible();
  await expect(feed.loading).toContainText('Loading articles');
  await expect(feed.articles).toHaveCount(0);

  release();

  await feed.waitForArticles(sampleArticles.length);
  await expect(feed.loading).toBeHidden();
});
