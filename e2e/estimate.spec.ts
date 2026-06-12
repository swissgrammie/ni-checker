import { expect, test } from '@playwright/test';

/*
 * E2E journey 1 (eng review 6A): the main estimate, on a mobile viewport.
 * Proves the form is actually wired to the rules — the demo-day failure mode.
 */

test.use({ viewport: { width: 390, height: 844 } }); // iPhone-ish

test('main journey: mid-career worker with gaps gets WORTH_CHECKING with facts', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /top up your State Pension/i })).toBeVisible();

  await page.fill('#field-yearsToSPA', '20');
  await page.fill('#field-qualifyingYears', '15');
  await page.fill('#field-recentGapYears', '3');
  await page.fill('#field-olderGapYears', '0');
  await page.check('#emp-1'); // employed
  await page.check('#work-2'); // not expecting to keep working
  await page.check('#cred-2'); // no free credits
  await page.check('#inc-1'); // has other retirement income
  await page.check('#pre-2'); // started after 2016

  await page.click('#submit-btn');

  const verdict = page.locator('.verdict');
  await expect(verdict).toBeVisible();
  await expect(verdict).toHaveAttribute('data-category', 'WORTH_CHECKING');

  // Facts panel quotes the live 2026/27 rates
  await expect(page.locator('.facts')).toContainText('£956.80');
  // The forecast-first hard step is always present on a paid route
  await expect(page.locator('[data-reason="CHECK_FORECAST_FIRST"]')).toBeVisible();

  // No horizontal scroll on mobile
  const scrollW = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientW = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollW).toBeLessThanOrEqual(clientW + 1);
});

test('validation: impossible totals get a guided recovery with the HMRC link', async ({ page }) => {
  await page.goto('/');
  await page.fill('#field-yearsToSPA', '40');
  await page.fill('#field-qualifyingYears', '40');
  await page.fill('#field-recentGapYears', '3');
  await page.fill('#field-olderGapYears', '40');
  await page.check('#emp-1');
  await page.check('#work-1');
  await page.check('#cred-2');
  await page.check('#inc-1');
  await page.check('#pre-1');
  await page.click('#submit-btn');

  const summary = page.locator('.error-summary');
  await expect(summary).toBeVisible();
  await expect(summary).toContainText('Check your answers');
  await expect(summary.locator('a[href*="check-national-insurance-record"]')).toBeVisible();
});
