import { describe, expect, it } from 'vitest';
import {
  isPolicyCurrent,
  loadPolicy,
  policyFor,
  taxYearKeyFor,
  validatePolicy,
} from '../src/rules/policy';
import type { Policy } from '../src/rules/types';

describe('tax-year boundary (April 5/6)', () => {
  it('5 April 2027 is still tax year 2026-27', () => {
    expect(taxYearKeyFor(new Date(2027, 3, 5))).toBe('2026-27');
  });
  it('6 April 2027 starts tax year 2027-28', () => {
    expect(taxYearKeyFor(new Date(2027, 3, 6))).toBe('2027-28');
  });
  it('1 January 2027 is mid 2026-27', () => {
    expect(taxYearKeyFor(new Date(2027, 0, 1))).toBe('2026-27');
  });
  it('handles the century-style year-end pad (2029-30)', () => {
    expect(taxYearKeyFor(new Date(2029, 5, 1))).toBe('2029-30');
  });
});

describe('THE APRIL DRIFT ALARM — this failing means: update policy.json', () => {
  // This is the alarm from eng review decision 1A. When it fails, add the new
  // tax year's rates to src/data/policy.json with sources, bump verifiedOn,
  // and re-run. It runs in CI on every push AND on a weekly cron.
  it('policy.json covers TODAY\'s tax year', () => {
    expect(isPolicyCurrent(new Date(), loadPolicy())).toBe(true);
  });
});

describe('runtime staleness detection', () => {
  it('returns null for an uncovered tax year (drives the user-facing banner)', () => {
    expect(policyFor(new Date(2031, 6, 1), loadPolicy())).toBeNull();
  });
  it('returns the right entry for a covered date', () => {
    const ty = policyFor(new Date(2026, 11, 25), loadPolicy());
    expect(ty?.class3WeeklyGBP).toBe(18.4);
  });
});

describe('policy schema validation — bad data must never render quietly', () => {
  const good = loadPolicy();

  function clone(): Policy {
    return JSON.parse(JSON.stringify(good)) as Policy;
  }

  it('accepts the shipped file', () => {
    expect(() => validatePolicy(good)).not.toThrow();
  });
  it('rejects a missing verifiedOn', () => {
    const bad = clone();
    bad.verifiedOn = '';
    expect(() => validatePolicy(bad)).toThrow(/verifiedOn/);
  });
  it('rejects empty sources', () => {
    const bad = clone();
    bad.sources = [];
    expect(() => validatePolicy(bad)).toThrow(/sources/);
  });
  it('rejects a non-positive rate', () => {
    const bad = clone();
    bad.taxYears['2026-27']!.class3WeeklyGBP = 0;
    expect(() => validatePolicy(bad)).toThrow(/class3WeeklyGBP/);
  });
  it('rejects a malformed tax-year key', () => {
    const bad = clone();
    bad.taxYears['banana'] = bad.taxYears['2026-27']!;
    expect(() => validatePolicy(bad)).toThrow(/banana/);
  });
  it('rejects an empty taxYears object', () => {
    const bad = clone();
    bad.taxYears = {};
    expect(() => validatePolicy(bad)).toThrow(/no tax years/);
  });
});
