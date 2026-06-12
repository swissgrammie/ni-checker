import rawPolicy from '../data/policy.json';
import type { Policy, TaxYearPolicy } from './types';

/*
 * Tax-year selection at the April boundary:
 *
 *   2026-04-05  ──►  key "2025-26"   (last day of the old year)
 *   2026-04-06  ──►  key "2026-27"   (first day of the new year)
 *
 * UK tax years run 6 April to 5 April. Getting this boundary wrong quotes
 * a whole year of wrong rates for two days every April — hence the
 * dedicated boundary tests.
 */
export function taxYearKeyFor(date: Date): string {
  const y = date.getFullYear();
  const beforeApril6 =
    date.getMonth() < 3 || (date.getMonth() === 3 && date.getDate() < 6);
  const startYear = beforeApril6 ? y - 1 : y;
  const endYY = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYY}`;
}

const NUMERIC_FIELDS: (keyof TaxYearPolicy)[] = [
  'class3WeeklyGBP',
  'class2WeeklyGBP',
  'newStatePensionWeeklyGBP',
  'pensionCreditGuaranteeSingleWeeklyGBP',
  'smallProfitsThresholdGBP',
  'minQualifyingYears',
  'fullQualifyingYears',
  'backfillWindowYears',
];

/** Throws on malformed policy data — a bad data file must never render quietly. */
export function validatePolicy(policy: Policy): void {
  if (!policy.verifiedOn || !/^\d{4}-\d{2}-\d{2}$/.test(policy.verifiedOn)) {
    throw new Error('policy.json: verifiedOn missing or not YYYY-MM-DD');
  }
  if (!Array.isArray(policy.sources) || policy.sources.length === 0) {
    throw new Error('policy.json: sources must be a non-empty array');
  }
  const entries = Object.entries(policy.taxYears ?? {});
  if (entries.length === 0) {
    throw new Error('policy.json: no tax years defined');
  }
  for (const [key, ty] of entries) {
    for (const field of NUMERIC_FIELDS) {
      const v = ty[field];
      if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) {
        throw new Error(`policy.json: ${key}.${String(field)} must be a positive number`);
      }
    }
    if (!/^\d{4}-\d{2}$/.test(key)) {
      throw new Error(`policy.json: tax year key "${key}" must look like "2026-27"`);
    }
  }
}

export function loadPolicy(): Policy {
  const policy = rawPolicy as Policy;
  validatePolicy(policy);
  return policy;
}

/** The runtime staleness check: is today's tax year covered by the data file? */
export function policyFor(date: Date, policy: Policy): TaxYearPolicy | null {
  return policy.taxYears[taxYearKeyFor(date)] ?? null;
}

export function isPolicyCurrent(date: Date, policy: Policy): boolean {
  return policyFor(date, policy) !== null;
}
