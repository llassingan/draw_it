import { expect, test } from '@playwright/test';

test.describe('tools (single user)', () => {
  test('pen, rect, triangle, circle, eraser all work in sequence', async ({ page }) => {
    await page.goto('/?room=solo-tools-1');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const canvas = page.locator('[data-testid="whiteboard-canvas"]');
    await canvas.waitFor();
    const box = await canvas.boundingBox();
    if (box === null) throw new Error('canvas not found');

    await page.locator('[data-testid="tool-pen"]').click();
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    for (let i = 0; i < 20; i += 1) {
      await page.mouse.move(box.x + 100 + i * 10, box.y + 100);
    }
    await page.mouse.up();
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
            return arr.length;
          }),
        { timeout: 3_000 },
      )
      .toBeGreaterThan(0);

    await page.locator('[data-testid="tool-rect"]').click();
    await page.mouse.move(box.x + 300, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 500, box.y + 400);
    await page.mouse.up();
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
            return arr.length;
          }),
        { timeout: 3_000 },
      )
      .toBeGreaterThan(1);

    await page.locator('[data-testid="tool-triangle"]').click();
    await page.mouse.move(box.x + 200, box.y + 300);
    await page.mouse.down();
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.up();
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
            return arr.length;
          }),
        { timeout: 3_000 },
      )
      .toBeGreaterThan(2);
    const shapesAfterTriangle = await page.evaluate(() => {
      const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
      return arr.toArray();
    });
    const last = shapesAfterTriangle[shapesAfterTriangle.length - 1] as { type?: string };
    expect(last?.type).toBe('triangle');

    await page.locator('[data-testid="tool-circle"]').click();
    await page.mouse.move(box.x + 600, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 700, box.y + 250);
    await page.mouse.up();
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
            return arr.length;
          }),
        { timeout: 3_000 },
      )
      .toBeGreaterThan(3);
    const shapesAfterCircle = await page.evaluate(() => {
      const arr = window.__WS_PROVIDER__.doc.getArray('shapes');
      return arr.toArray();
    });
    const lastCircle = shapesAfterCircle[shapesAfterCircle.length - 1] as { type?: string };
    expect(lastCircle?.type).toBe('circle');

    await page.locator('[data-testid="tool-eraser"]').click();
    await page.mouse.move(box.x + 200, box.y + 100);
    await page.mouse.down();
    await page.mouse.up();

    await cleanupAllShapes(page);
  });

  test('color picker changes active color', async ({ page }) => {
    await page.goto('/?room=solo-color-1');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const redSwatch = page.locator('[data-testid="color-#e03131"]');
    await redSwatch.waitFor();
    await redSwatch.click();
    await expect(redSwatch).toHaveAttribute('aria-pressed', 'true');
  });

  test('zoom buttons update the canvas-stack transform', async ({ page }) => {
    await page.goto('/?room=solo-zoom-1');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const stack = page.locator('[data-testid="canvas-stack"]');
    const initialZoom = await stack.getAttribute('data-zoom');
    expect(initialZoom).toBe('1');

    await page.locator('[data-testid="zoom-in"]').click();
    await page.locator('[data-testid="zoom-in"]').click();
    const zoomedIn = Number(await stack.getAttribute('data-zoom'));
    expect(zoomedIn).toBeGreaterThan(1);

    await page.locator('[data-testid="zoom-reset"]').click();
    const zoomedReset = Number(await stack.getAttribute('data-zoom'));
    expect(zoomedReset).toBe(1);

    await page.locator('[data-testid="zoom-out"]').click();
    await page.locator('[data-testid="zoom-out"]').click();
    const zoomedOut = Number(await stack.getAttribute('data-zoom'));
    expect(zoomedOut).toBeLessThan(1);
  });
});

async function cleanupAllShapes(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const doc = window.__WS_PROVIDER__.doc;
    const arr = doc.getArray('shapes');
    doc.transact(() => arr.delete(0, arr.length));
  });
}
