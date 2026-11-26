import type { Page, Request, Route } from '@playwright/test';

/**
 * Turns a Playwright glob into a RegExp so the ledger can decide, after the
 * test, whether a given request was answered by a mock.
 */
function patternToRegExp(pattern: string | RegExp): RegExp {
  if (pattern instanceof RegExp) return pattern;

  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '<<DOUBLE_STAR>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<DOUBLE_STAR>>/g, '.*');

  return new RegExp(`^${escaped}$`);
}

/**
 * Records every request a test makes and proves two properties afterwards:
 *
 *  1. nothing left the lab origin (tests are hermetic and offline-safe);
 *  2. when enforced, every `/api/` call was served by a registered mock.
 *
 * Point 2 is what stops a "network mocking" suite from quietly hitting the real
 * server and still passing.
 */
export class NetworkLedger {
  readonly #page: Page;
  readonly #origin: string;
  readonly #requireApiMocks: boolean;
  readonly #patterns: RegExp[] = [];
  readonly #apiRequests: string[] = [];
  readonly #foreignRequests: string[] = [];

  constructor(page: Page, origin: string, requireApiMocks: boolean) {
    this.#page = page;
    this.#origin = origin;
    this.#requireApiMocks = requireApiMocks;
    this.#page.on('request', (request) => this.#record(request));
  }

  /** `page.route`, plus bookkeeping for the teardown check. */
  async route(
    pattern: string | RegExp,
    handler: (route: Route, request: Request) => Promise<void> | void,
  ): Promise<void> {
    this.#patterns.push(patternToRegExp(pattern));
    await this.#page.route(pattern, handler);
  }

  get apiRequests(): readonly string[] {
    return this.#apiRequests;
  }

  assertClean(): void {
    const problems: string[] = [];

    if (this.#foreignRequests.length > 0) {
      problems.push(
        `Requests left the lab origin (${this.#origin}):\n  ${unique(this.#foreignRequests).join('\n  ')}`,
      );
    }

    if (this.#requireApiMocks) {
      const unmocked = this.#apiRequests.filter(
        (url) => !this.#patterns.some((pattern) => pattern.test(url)),
      );
      if (unmocked.length > 0) {
        problems.push(`API calls were not mocked:\n  ${unique(unmocked).join('\n  ')}`);
      }
    }

    if (problems.length > 0) {
      throw new Error(`Hermetic network check failed:\n${problems.join('\n')}`);
    }
  }

  #record(request: Request): void {
    const url = request.url();
    if (!/^https?:/.test(url)) return;

    const parsed = new URL(url);
    if (parsed.origin !== this.#origin) {
      this.#foreignRequests.push(url);
      return;
    }
    if (parsed.pathname.startsWith('/api/')) {
      this.#apiRequests.push(url);
    }
  }
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
