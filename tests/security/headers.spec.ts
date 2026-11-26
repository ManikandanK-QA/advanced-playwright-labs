import { expect, test } from '../../src/fixtures';

/**
 * Asserts the server's hardening contract as the browser receives it.
 *
 * This is deliberately split from the CSP/cookie specs: those prove the browser
 * *enforces* the policy, this proves the policy is actually being sent.
 */

function parseCsp(header: string | undefined): Record<string, string> {
  const directives: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const tokens = part.trim().split(/\s+/);
    const name = tokens.shift();
    if (name) directives[name] = tokens.join(' ');
  }
  return directives;
}

test('serves the full hardening header contract on document responses', async ({ request }) => {
  const response = await request.get('/');
  expect(response.status()).toBe(200);

  const headers = response.headers();
  const csp = parseCsp(headers['content-security-policy']);

  expect(csp['default-src']).toBe("'self'");
  expect(csp['script-src']).toBe("'self'");
  expect(csp['connect-src']).toBe("'self'");
  expect(csp['frame-ancestors']).toBe("'none'");
  expect(csp['base-uri']).toBe("'none'");

  // A policy containing these is decorative rather than protective.
  expect(headers['content-security-policy']).not.toContain('unsafe-inline');
  expect(headers['content-security-policy']).not.toContain('unsafe-eval');

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toContain('camera=()');
  expect(headers['cross-origin-opener-policy']).toBe('same-origin');
  expect(headers['content-type']).toContain('text/html');
});

test('applies the same hardening to JSON API responses', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);

  const headers = response.headers();
  expect(headers['content-type']).toContain('application/json');
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['content-security-policy']).toContain("default-src 'self'");
  expect(headers['cache-control']).toBe('no-store');
});

test('hardens error responses too, not only successful ones', async ({ request }) => {
  const response = await request.get('/this-page-does-not-exist');
  expect(response.status()).toBe(404);

  const headers = response.headers();
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
});
