import type { Browser, BrowserContext, Page } from '@playwright/test';

export interface TwoPages {
  alice: Page;
  bob: Page;
  cleanup: () => Promise<void>;
}

export async function openTwoPages(browser: Browser, roomId: string): Promise<TwoPages> {
  const ctx1: BrowserContext = await browser.newContext();
  const ctx2: BrowserContext = await browser.newContext();
  const alice = await ctx1.newPage();
  const bob = await ctx2.newPage();
  await alice.goto(`/?room=${roomId}`);
  await bob.goto(`/?room=${roomId}`);
  await alice.waitForSelector('[data-testid="whiteboard-canvas"]');
  await bob.waitForSelector('[data-testid="whiteboard-canvas"]');
  await waitForConnected(alice);
  await waitForConnected(bob);
  return {
    alice,
    bob,
    cleanup: async () => {
      await Promise.all([ctx1.close(), ctx2.close()]);
    },
  };
}

async function waitForConnected(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as { __WS_CONNECTED__?: boolean }).__WS_CONNECTED__ === true,
    undefined,
    { timeout: 10_000 },
  );
}
