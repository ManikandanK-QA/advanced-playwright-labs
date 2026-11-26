import type { Page, Route } from '@playwright/test';

/** One row of `/api/feed`, as the page renders it. */
export interface Article {
  id: string;
  title: string;
  author: string;
  tag: string;
  minutes: number;
}

/** Body of `POST /api/order`. */
export interface OrderRequest {
  name: string;
  email: string;
  quantity: number;
}

/** Body returned by `POST /api/order` on success. */
export interface OrderResponse {
  orderId: string;
  status: 'confirmed';
  quantity: number;
  total: number;
}

/**
 * Mock data with deliberately distinct values, so an assertion that accidentally
 * reads the wrong row fails loudly instead of passing on a duplicated string.
 */
export const sampleArticles: readonly Article[] = [
  {
    id: 'a-201',
    title: 'Mocked: retry hides a real defect',
    author: 'Ada L.',
    tag: 'reliability',
    minutes: 5,
  },
  {
    id: 'a-202',
    title: 'Mocked: budgets beat anecdotes',
    author: 'Grace H.',
    tag: 'performance',
    minutes: 8,
  },
];

export function feedBody(articles: readonly Article[] = sampleArticles): {
  articles: readonly Article[];
  generatedAt: string;
} {
  return { articles, generatedAt: '2026-01-01T00:00:00.000Z' };
}

export function orderBody(overrides: Partial<OrderResponse> = {}): OrderResponse {
  return {
    orderId: 'ord-mocked-1',
    status: 'confirmed',
    quantity: 2,
    total: 48,
    ...overrides,
  };
}

/** A route handler that answers with JSON. */
export function jsonHandler(status: number, body: unknown) {
  return async (route: Route): Promise<void> => {
    await route.fulfill({
      status,
      contentType: 'application/json; charset=utf-8',
      body: JSON.stringify(body),
    });
  };
}

/** Parses the JSON body a page posted, without trusting its shape. */
export function readJsonBody<T>(body: string | null): T {
  if (!body) throw new Error('Expected a request body, but none was sent');
  return JSON.parse(body) as T;
}

/** Convenience for tests that need the page's own fetch helper. */
export async function reloadFeed(page: Page): Promise<void> {
  await page.getByTestId('reload').click();
}
