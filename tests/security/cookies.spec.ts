import { expect, test } from '../../src/fixtures';
import { SecurityPage } from '../../src/pages';

function setCookieHeaders(headers: { name: string; value: string }[]): string[] {
  return headers
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value);
}

test('server marks the session cookie HttpOnly and SameSite=Strict', async ({ request }) => {
  const response = await request.get('/api/session');
  expect(response.status()).toBe(200);

  const cookies = setCookieHeaders(response.headersArray());
  expect(cookies, 'expected one session cookie and one preference cookie').toHaveLength(2);

  const session = cookies.find((cookie) => cookie.startsWith('session='));
  expect(session, 'session cookie was not set').toBeDefined();
  expect(session).toContain('HttpOnly');
  expect(session).toContain('SameSite=Strict');
  expect(session).toContain('Path=/');
  expect(session).toContain('Max-Age=3600');

  const theme = cookies.find((cookie) => cookie.startsWith('theme='));
  expect(theme, 'theme cookie was not set').toBeDefined();
  // The positive control: without this, "session is unreadable" could just mean
  // "no cookies work".
  expect(theme).not.toContain('HttpOnly');
  expect(theme).toContain('SameSite=Lax');
});

test('page scripts can read the preference cookie but not the session cookie', async ({
  page,
  context,
}) => {
  const security = new SecurityPage(page);
  await security.establishSession();
  await security.openCookiesLab();

  await expect(security.documentCookie).toContainText('theme=light');
  await expect(security.documentCookie).not.toContainText('session=');

  const cookies = await context.cookies();
  const session = cookies.find((cookie) => cookie.name === 'session');
  const theme = cookies.find((cookie) => cookie.name === 'theme');

  expect(session).toMatchObject({ httpOnly: true, path: '/' });
  expect(theme).toMatchObject({ httpOnly: false });

  // The Set-Cookie header itself is asserted on every engine by headers.spec.ts.
  // WebKit's cookie API reports sameSite as "None" for these plain-HTTP
  // localhost cookies even though the header carries Strict/Lax, so only assert
  // the attribute here when the engine actually surfaces it.
  if (session?.sameSite !== 'None') {
    expect(session?.sameSite).toBe('Strict');
  }
  if (theme?.sameSite !== 'None') {
    expect(theme?.sameSite).toBe('Lax');
  }
});

test('clearing the session removes both cookies from the browser', async ({ page, context }) => {
  const security = new SecurityPage(page);
  await security.establishSession();
  await security.clearSession();

  const remaining = (await context.cookies()).filter((cookie) =>
    ['session', 'theme'].includes(cookie.name),
  );
  expect(remaining).toEqual([]);
});
