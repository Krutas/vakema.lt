import { test, expect } from '@playwright/test';
import { injectAxe, getViolations } from 'axe-playwright';

test.describe('landing page', () => {
  test('page loads with title containing "Vakema"', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Vakema/);
  });

  test('has exactly one h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('all nav anchors resolve to existing element IDs', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('.desktop-nav a[href^="#"]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('href')!),
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of new Set(hrefs)) {
      await expect(page.locator(href)).toHaveCount(1);
    }
  });

  test('carousel next button changes the count', async ({ page }) => {
    await page.goto('/');
    const count = page.locator('.product-carousel-count');
    const before = await count.textContent();
    await page.locator('[data-carousel-next]').click();
    await expect(count).not.toHaveText(before!);
  });

  test('empty contact form shows a validation error without a network call', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'POST') requests.push(req.url());
    });
    await page.goto('/');
    await page.locator('.contact-form button[type="submit"]').click();
    await expect(page.locator('.form-note')).toHaveText('Patikrinkite formos laukus.');
    expect(requests).toEqual([]);
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('axe accessibility scan is clean', async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    const violations = await getViolations(page);
    expect(violations).toEqual([]);
  });
});
