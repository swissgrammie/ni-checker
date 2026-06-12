import { expect, test } from '@playwright/test';

/*
 * E2E journey 2 (eng review 6A): the Pension Credit honest warning —
 * the product's entire differentiator, proven end-to-end.
 */

test.use({ viewport: { width: 390, height: 844 } });

test('PC-bound user is told paying probably won’t help, before any cost pitch', async ({ page }) => {
  await page.goto('/');

  await page.fill('#field-yearsToSPA', '10');
  await page.fill('#field-qualifyingYears', '20');
  await page.fill('#field-recentGapYears', '4');
  await page.fill('#field-olderGapYears', '2');
  await page.check('#emp-4'); // not working
  await page.check('#work-2'); // won't keep working
  await page.check('#cred-2'); // no free credits
  await page.check('#inc-2'); // NO other retirement income — the PC screen
  await page.check('#pre-1'); // pre-2016 record

  await page.click('#submit-btn');

  const verdict = page.locator('.verdict');
  await expect(verdict).toBeVisible();
  await expect(verdict).toHaveAttribute('data-category', 'PROBABLY_NOT');
  await expect(verdict).toContainText(/probably won’t help/i);

  // The honest explanation renders, with the PC guarantee figure
  const pcReason = page.locator('[data-reason="PC_OFFSET"]');
  await expect(pcReason).toBeVisible();
  await expect(pcReason).toContainText('£238.00');
  await expect(pcReason).toContainText(/pound/i);

  // And the claim-rate nuance is present (a third never claim)
  await expect(pcReason).toContainText(/must be claimed/i);
});
