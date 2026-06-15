import { expect, test } from '@playwright/test';

test.describe('reconnect', () => {
  test('disconnect/reconnect preserves Y.Doc state', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const alice = await ctx1.newPage();
    await alice.goto('/?room=reconnect-1');
    await alice.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const canvas = alice.locator('[data-testid="whiteboard-canvas"]');
    const box = await canvas.boundingBox();
    if (box === null) throw new Error('canvas not found');

    await alice.mouse.move(box.x + 200, box.y + 200);
    await alice.mouse.down();
    await alice.mouse.move(box.x + 400, box.y + 400);
    await alice.mouse.up();

    await expect
      .poll(
        () =>
          alice.evaluate(() => {
            const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
            return arr.length;
          }),
        { timeout: 3_000 },
      )
      .toBeGreaterThan(0);

    await alice.evaluate(() => {
      const provider = window.__WS_PROVIDER__;
      provider.disconnect();
    });
    await expect
      .poll(
        () => alice.evaluate(() => window.__WS_PROVIDER__.wsconnected === false),
        { timeout: 3_000 },
      )
      .toBe(true);

    await alice.evaluate(() => {
      const provider = window.__WS_PROVIDER__;
      provider.connect();
    });
    await expect
      .poll(
        () => alice.evaluate(() => window.__WS_PROVIDER__.wsconnected === true),
        { timeout: 5_000 },
      )
      .toBe(true);

    await expect
      .poll(
        () =>
          alice.evaluate(() => {
            const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
            return arr.length;
          }),
        { timeout: 3_000 },
      )
      .toBeGreaterThan(0);

    await ctx1.close();
  });
});
