import { expect, test } from '../../src/fixtures';
import { SecurityPage } from '../../src/pages';

const CREDENTIAL_SHAPE = /token|secret|password|api[_-]?key|bearer|authorization/i;

interface LabWindow extends Window {
  __serverSecret?: string;
}

test('stores display preferences and no credential-shaped values', async ({ page }) => {
  const security = new SecurityPage(page);
  await security.openStorageLab();

  await expect(security.storageDump).toContainText('labs.theme');
  await expect(security.storageDump).toContainText('light');

  const snapshot = await page.evaluate(() => {
    const entries: string[] = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index) ?? '';
      entries.push(`${key}=${localStorage.getItem(key) ?? ''}`);
    }
    for (let index = 0; index < sessionStorage.length; index += 1) {
      const key = sessionStorage.key(index) ?? '';
      entries.push(`${key}=${sessionStorage.getItem(key) ?? ''}`);
    }

    return { entries, serverSecret: (window as LabWindow).__serverSecret };
  });

  // Storage demonstrably works, so the absence below is meaningful.
  expect(snapshot.entries.length).toBeGreaterThan(0);
  expect(snapshot.entries.join('\n')).not.toMatch(CREDENTIAL_SHAPE);
  expect(snapshot.serverSecret).toBeUndefined();
});

test('does not mirror the HttpOnly session cookie into storage', async ({ page }) => {
  const security = new SecurityPage(page);
  await security.establishSession();
  await security.openStorageLab();

  const storageText = await page.evaluate(() =>
    JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }),
  );

  expect(storageText).not.toContain('lab-session-7f3a9c');
  expect(storageText).not.toMatch(CREDENTIAL_SHAPE);
});
