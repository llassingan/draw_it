import { expect, test } from '@playwright/test';

import { openTwoPages } from './fixtures/multiTab';

test.describe('collaboration', () => {
  test('two users see each other join (user list has 2 pills)', async ({ browser }) => {
    const ctx1 = await browser.newContext();
    const ctx2 = await browser.newContext();
    const alice = await ctx1.newPage();
    const bob = await ctx2.newPage();

    await alice.goto('/?room=collab-join');
    await alice.waitForFunction(() => window.__WS_CONNECTED__ === true);
    await alice.waitForSelector('[data-testid="user-pill"]');

    await bob.goto('/?room=collab-join');
    await bob.waitForFunction(() => window.__WS_CONNECTED__ === true);

    await expect(alice.locator('[data-testid="user-pill"]')).toHaveCount(2, { timeout: 5_000 });
    await expect(bob.locator('[data-testid="user-pill"]')).toHaveCount(2, { timeout: 5_000 });

    await ctx1.close();
    await ctx2.close();
  });

  test('alice draws a pen stroke and bob sees it', async ({ browser }) => {
    const { alice, bob, cleanup } = await openTwoPages(browser, 'collab-pen-1');

    const box = await alice.locator('[data-testid="whiteboard-canvas"]').boundingBox();
    if (box === null) throw new Error('canvas not found');
    await alice.mouse.move(box.x + 200, box.y + 200);
    await alice.mouse.down();
    for (let i = 0; i < 20; i += 1) {
      await alice.mouse.move(box.x + 200 + i * 10, box.y + 200 + i * 5);
    }
    await alice.mouse.up();

    await expect(bob.locator('[data-testid="user-pill"]')).toHaveCount(2);

    await expect
      .poll(
        async () => {
          const has = await bob.evaluate(() => {
            const provider = window.__WS_PROVIDER__;
            if (provider === undefined) return 0;
            const doc = provider.doc;
            const arr = doc.getArray('shapes');
            return arr.length;
          });
          return has;
        },
        { timeout: 3_000 },
      )
      .toBeGreaterThan(0);

    await cleanup();
  });

  test('alice draws, bob erases, both see shape gone', async ({ browser }) => {
    const { alice, bob, cleanup } = await openTwoPages(browser, 'collab-erase-1');

    const aBox = await alice.locator('[data-testid="whiteboard-canvas"]').boundingBox();
    if (aBox === null) throw new Error('canvas not found');
    const cx = aBox.x + aBox.width / 2;
    const cy = aBox.y + aBox.height / 2;

    await alice.mouse.move(cx - 50, cy - 50);
    await alice.mouse.down();
    await alice.mouse.move(cx + 50, cy + 50);
    await alice.mouse.up();

    await expect
      .poll(
        async () =>
          alice.evaluate(() => {
            const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
            return arr.length;
          }),
        { timeout: 3_000 },
      )
      .toBeGreaterThan(0);

    await bob.locator('[data-testid="tool-eraser"]').click();
    const bBox = await bob.locator('[data-testid="whiteboard-canvas"]').boundingBox();
    if (bBox === null) throw new Error('canvas not found');
    await bob.mouse.move(bBox.x + bBox.width / 2, bBox.y + bBox.height / 2);
    await bob.mouse.down();
    await bob.mouse.up();

    await expect
      .poll(
        async () =>
          bob.evaluate(() => {
            const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
            return arr.length;
          }),
        { timeout: 3_000 },
      )
      .toBe(0);

    await cleanup();
  });
});
