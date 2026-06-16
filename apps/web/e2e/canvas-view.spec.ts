import { expect, test } from '@playwright/test';

test.describe('infinite canvas view (single user)', () => {
  test('pan tool button is rendered in the toolbar', async ({ page }) => {
    await page.goto('/?room=view-pan-tool');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const panTool = page.locator('[data-testid="tool-pan"]');
    await panTool.waitFor();
    await expect(panTool).toBeVisible();
  });

  test('selecting the pan tool updates aria-pressed and viewport mode', async ({ page }) => {
    await page.goto('/?room=view-pan-mode');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const penTool = page.locator('[data-testid="tool-pen"]');
    const panTool = page.locator('[data-testid="tool-pan"]');
    const viewport = page.locator('[data-testid="board-viewport"]');
    await panTool.waitFor();
    await expect(penTool).toHaveAttribute('aria-pressed', 'true');
    await expect(panTool).toHaveAttribute('aria-pressed', 'false');
    await expect(viewport).toHaveAttribute('data-pan-mode', 'drawing');
    await panTool.click();
    await expect(panTool).toHaveAttribute('aria-pressed', 'true');
    await expect(penTool).toHaveAttribute('aria-pressed', 'false');
    await expect(viewport).toHaveAttribute('data-pan-mode', 'pan-ready');
  });

  test('dragging with the pan tool changes the canvas-stack translate (data-pan-x/y)', async ({ page }) => {
    await page.goto('/?room=view-pan-drag');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const stack = page.locator('[data-testid="canvas-stack"]');
    const viewport = page.locator('[data-testid="board-viewport"]');
    await stack.waitFor();
    await viewport.waitFor();

    await page.locator('[data-testid="tool-pan"]').click();
    const box = await viewport.boundingBox();
    if (box === null) throw new Error('viewport not found');

    const beforeX = Number(await stack.getAttribute('data-pan-x'));
    const beforeY = Number(await stack.getAttribute('data-pan-y'));

    await page.mouse.move(box.x + 200, box.y + 200);
    await page.mouse.down();
    await page.mouse.move(box.x + 350, box.y + 280, { steps: 10 });
    await page.mouse.up();

    await expect
      .poll(async () => Number(await stack.getAttribute('data-pan-x')), { timeout: 2_000 })
      .toBeCloseTo(beforeX + 150, 0);
    await expect
      .poll(async () => Number(await stack.getAttribute('data-pan-y')), { timeout: 2_000 })
      .toBeCloseTo(beforeY + 80, 0);
  });

  test('drawing with the pen tool does NOT change the pan (the viewport lets events pass to the canvas)', async ({
    page,
  }) => {
    await page.goto('/?room=view-pen-no-pan');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const stack = page.locator('[data-testid="canvas-stack"]');
    const canvas = page.locator('[data-testid="whiteboard-canvas"]');
    await canvas.waitFor();
    await page.locator('[data-testid="tool-pen"]').click();
    const beforeX = Number(await stack.getAttribute('data-pan-x'));
    const beforeY = Number(await stack.getAttribute('data-pan-y'));
    const box = await canvas.boundingBox();
    if (box === null) throw new Error('canvas not found');
    await page.mouse.move(box.x + 100, box.y + 100);
    await page.mouse.down();
    await page.mouse.move(box.x + 200, box.y + 200, { steps: 5 });
    await page.mouse.up();
    const afterX = Number(await stack.getAttribute('data-pan-x'));
    const afterY = Number(await stack.getAttribute('data-pan-y'));
    expect(afterX).toBe(beforeX);
    expect(afterY).toBe(beforeY);
  });

  test('Ctrl+wheel-up zooms in and Ctrl+wheel-down zooms out', async ({ page }) => {
    await page.goto('/?room=view-wheel-zoom');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const stack = page.locator('[data-testid="canvas-stack"]');
    await stack.waitFor();
    const beforeZoom = Number(await stack.getAttribute('data-zoom'));
    expect(beforeZoom).toBe(1);

    const viewport = page.locator('[data-testid="board-viewport"]');
    const vbox = await viewport.boundingBox();
    if (vbox === null) throw new Error('viewport not found');
    const cursorX = vbox.x + vbox.width / 2;
    const cursorY = vbox.y + vbox.height / 2;

    await page.mouse.move(cursorX, cursorY);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -200);
    await page.keyboard.up('Control');

    await expect
      .poll(async () => Number(await stack.getAttribute('data-zoom')), { timeout: 2_000 })
      .toBeGreaterThan(beforeZoom);

    await page.keyboard.down('Control');
    await page.mouse.wheel(0, 200);
    await page.keyboard.up('Control');

    await expect
      .poll(async () => Number(await stack.getAttribute('data-zoom')), { timeout: 2_000 })
      .toBeLessThan(beforeZoom + 0.0001);
  });

  test('zoom badge shows the current percentage and clicking it resets the view', async ({ page }) => {
    await page.goto('/?room=view-zoom-badge');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const stack = page.locator('[data-testid="canvas-stack"]');
    const badge = page.locator('[data-testid="zoom-badge"]');
    await badge.waitFor();
    expect((await badge.textContent())?.trim()).toBe('100%');

    await page.locator('[data-testid="zoom-in"]').click();
    await page.locator('[data-testid="zoom-in"]').click();
    expect((await badge.textContent())?.trim()).toBe('120%');
    expect(Number(await stack.getAttribute('data-zoom'))).toBeCloseTo(1.2, 5);

    await badge.click();
    expect((await badge.textContent())?.trim()).toBe('100%');
    expect(Number(await stack.getAttribute('data-zoom'))).toBe(1);
    expect(Number(await stack.getAttribute('data-pan-x'))).toBe(0);
    expect(Number(await stack.getAttribute('data-pan-y'))).toBe(0);
  });

  test('on initial load, the canvas fills the viewport (no fixed size)', async ({ page }) => {
    await page.goto('/?room=view-initial-fill');
    await page.waitForFunction(() => window.__WS_CONNECTED__ !== undefined);
    const stack = page.locator('[data-testid="canvas-stack"]');
    const canvas = page.locator('[data-testid="whiteboard-canvas"]');
    await stack.waitFor();
    await canvas.waitFor();
    await expect
      .poll(async () => Number(await stack.getAttribute('data-pan-x')), { timeout: 2_000 })
      .toBe(0);
    await expect
      .poll(async () => Number(await stack.getAttribute('data-pan-y')), { timeout: 2_000 })
      .toBe(0);
    const canvasBox = await canvas.boundingBox();
    const stackBox = await stack.boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(stackBox).not.toBeNull();
    if (canvasBox && stackBox) {
      // Sub-pixel rounding from devicePixelRatio can introduce a ~1px difference.
      expect(Math.abs(canvasBox.width - stackBox.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(canvasBox.height - stackBox.height)).toBeLessThanOrEqual(1);
    }
  });

  test('after panning far away, pan values can be any real number (no bounds)', async ({ page }) => {
    await page.goto('/?room=view-unbounded-pan');
    await page.waitForFunction(() => window.__WS_CONNECTED__ === true);
    const stack = page.locator('[data-testid="canvas-stack"]');
    const viewport = page.locator('[data-testid="board-viewport"]');
    await stack.waitFor();
    await page.locator('[data-testid="tool-pan"]').click();
    const vbox = await viewport.boundingBox();
    if (vbox === null) throw new Error('viewport not found');
    await page.mouse.move(vbox.x + 400, vbox.y + 300);
    await page.mouse.down();
    await page.mouse.move(vbox.x + 400 - 5000, vbox.y + 300 - 5000, { steps: 20 });
    await page.mouse.up();
    await expect
      .poll(async () => Number(await stack.getAttribute('data-pan-x')), { timeout: 2_000 })
      .toBeLessThan(-1000);
    await expect
      .poll(async () => Number(await stack.getAttribute('data-pan-y')), { timeout: 2_000 })
      .toBeLessThan(-1000);
  });
});
