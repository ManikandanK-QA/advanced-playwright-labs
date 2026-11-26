/**
 * Zero-dependency lab server.
 *
 * It exists because the labs need real browser-observable behaviour that a
 * static file host cannot provide:
 *
 *  - hardening headers (CSP, frame-ancestors, nosniff) on every response;
 *  - cookies with explicit attributes, so a test can prove HttpOnly works;
 *  - JSON endpoints with optional latency and failure injection, so a browser
 *    test can drive its own network conditions without a proxy;
 *  - a deterministic-HTML target for visual and performance baselines.
 *
 * There is intentionally no framework: the whole contract is visible in one
 * file, and nothing here is imported by the tests.
 */
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC_ROOT = resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const PORT = Number.parseInt(process.env.PORT ?? '4173', 10);
const HOST = process.env.HOST ?? '127.0.0.1';
const MAX_BODY_BYTES = 64 * 1024;

const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

/**
 * The contract the security lab asserts against. Changing a value here without
 * updating `tests/security/headers.spec.ts` is a deliberate failure.
 *
 * `Strict-Transport-Security` and the `Secure` cookie flag are deliberately
 * absent: this lab is served over plain HTTP on localhost, where browsers
 * reject them. The HTTPS half of the contract is covered in
 * `docs/test-strategy.md` rather than pretended here.
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; '),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

const FEED = [
  {
    id: 'a-101',
    title: 'Contract tests caught a breaking change before staging',
    author: 'Maya R.',
    tag: 'api',
    minutes: 6,
  },
  {
    id: 'a-102',
    title: 'A flaky test is a defect, not an inconvenience',
    author: 'Tom S.',
    tag: 'reliability',
    minutes: 9,
  },
  {
    id: 'a-103',
    title: 'Visual baselines belong in the pipeline image',
    author: 'Priya N.',
    tag: 'visual',
    minutes: 4,
  },
  {
    id: 'a-104',
    title: 'Measuring what users feel with Core Web Vitals',
    author: 'Luis A.',
    tag: 'performance',
    minutes: 11,
  },
];

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(request, response, url);
      return;
    }
    await serveStatic(response, url.pathname);
  } catch (error) {
    console.error(`[lab-site] ${request.method} ${url.pathname} failed:`, error);
    if (!response.headersSent) {
      sendText(response, 500, 'Internal lab error');
    } else {
      response.end();
    }
  }
});

async function handleApi(request, response, url) {
  await sleep(readDelay(url));

  switch (`${request.method} ${url.pathname}`) {
    case 'GET /api/health':
      sendJson(response, 200, { ok: true, labs: ['visual', 'network', 'performance', 'security'] });
      return;

    case 'GET /api/feed':
      if (url.searchParams.get('fail') === '1') {
        sendJson(response, 500, { error: 'feed_unavailable' });
        return;
      }
      sendJson(response, 200, { articles: FEED, generatedAt: '2026-01-01T00:00:00.000Z' });
      return;

    case 'POST /api/order': {
      const body = await readJsonBody(request);
      if (!body || typeof body.name !== 'string' || typeof body.email !== 'string') {
        sendJson(response, 422, { error: 'invalid_order', fields: ['name', 'email'] });
        return;
      }
      const quantity = Number.isInteger(body.quantity) ? Math.max(1, body.quantity) : 1;
      sendJson(response, 201, {
        orderId: `ord-${1000 + quantity}`,
        status: 'confirmed',
        quantity,
        total: quantity * 24,
      });
      return;
    }

    case 'GET /api/session': {
      // `session` is HttpOnly so page scripts cannot read it; `theme` is not,
      // which gives the cookie test a positive control.
      response.setHeader('Set-Cookie', [
        'session=lab-session-7f3a9c; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600',
        'theme=light; SameSite=Lax; Path=/; Max-Age=3600',
      ]);
      sendHtml(response, 200, '<!doctype html><title>session</title><p>Session established.</p>');
      return;
    }

    case 'GET /api/session/clear':
      response.setHeader('Set-Cookie', [
        'session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0',
        'theme=; SameSite=Lax; Path=/; Max-Age=0',
      ]);
      sendJson(response, 200, { cleared: ['session', 'theme'] });
      return;

    default:
      sendJson(response, 404, { error: 'unknown_endpoint', path: url.pathname });
  }
}

async function serveStatic(response, pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidate = resolve(
    PUBLIC_ROOT,
    `.${decoded.endsWith('/') ? `${decoded}index.html` : decoded}`,
  );

  if (!isInsidePublicRoot(candidate)) {
    sendText(response, 403, 'Forbidden');
    return;
  }

  const filePath = await resolveExistingFile(candidate);
  if (!filePath) {
    sendText(response, 404, 'Not found');
    return;
  }

  const body = await readFile(filePath);
  const type = CONTENT_TYPES.get(extname(filePath).toLowerCase()) ?? 'application/octet-stream';
  response.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': type,
    'Content-Length': body.byteLength,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

async function resolveExistingFile(candidate) {
  for (const attempt of [candidate, `${candidate}.html`]) {
    try {
      const info = await stat(attempt);
      if (info.isDirectory()) {
        const index = join(attempt, 'index.html');
        const indexInfo = await stat(index);
        return indexInfo.isFile() ? index : null;
      }
      if (info.isFile()) return attempt;
    } catch {
      // Fall through to the next candidate.
    }
  }
  return null;
}

function isInsidePublicRoot(candidate) {
  return candidate === PUBLIC_ROOT || candidate.startsWith(PUBLIC_ROOT + sep);
}

function readDelay(url) {
  const parsed = Number.parseInt(url.searchParams.get('delay') ?? '', 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), 5_000);
}

function sleep(ms) {
  return ms > 0 ? new Promise((resolveSleep) => setTimeout(resolveSleep, ms)) : Promise.resolve();
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('request body too large');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return null;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return null;
  }
}

function sendJson(response, status, payload) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.byteLength,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function sendHtml(response, status, markup) {
  const body = Buffer.from(markup, 'utf8');
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.byteLength,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

function sendText(response, status, text) {
  const body = Buffer.from(text, 'utf8');
  response.writeHead(status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': body.byteLength,
    'Cache-Control': 'no-store',
  });
  response.end(body);
}

server.listen(PORT, HOST, () => {
  console.log(`[lab-site] http://${HOST}:${PORT}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}
