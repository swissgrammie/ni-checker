import { describe, expect, it } from 'vitest';
import { computeFacts, triage } from '../src/rules/engine';
import { loadPolicy } from '../src/rules/policy';
import type { Inputs } from '../src/rules/types';

const policy = loadPolicy();
const TY = '2026-27';
const p = policy.taxYears[TY]!;

/** A baseline mid-career worker with fillable gaps and other retirement income. */
function base(overrides: Partial<Inputs> = {}): Inputs {
  return {
    yearsToSPA: 20,
    qualifyingYears: 15,
    recentGapYears: 3,
    olderGapYears: 0,
    employment: 'employed',
    expectsToKeepWorking: 'no',
    mayGetFreeCredits: 'no',
    expectsOtherRetirementIncome: 'yes',
    startedNIBefore2016: false,
    ...overrides,
  };
}

describe('golden vectors — facts match published figures (2026/27)', () => {
  const facts = computeFacts(TY, p);
  it('Class 3 year costs £956.80 (18.40 × 52, GOV.UK)', () => {
    expect(facts.class3CostPerYearGBP).toBe(956.8);
  });
  it('Class 2 year costs £189.80 (3.65 × 52, GOV.UK)', () => {
    expect(facts.class2CostPerYearGBP).toBe(189.8);
  });
  it('uplift per filled year ≈ £358.50/yr (241.30/35 × 52, HMRC press: "up to £358")', () => {
    expect(facts.upliftPerYearAnnualGBP).toBeGreaterThan(358);
    expect(facts.upliftPerYearAnnualGBP).toBeLessThan(359);
  });
  it('break-even is a range starting at 3 years (956.80/358.5 = 2.67 → ceil 3)', () => {
    expect(facts.breakEvenYearsClass3.min).toBe(3);
    expect(facts.breakEvenYearsClass3.max).toBeGreaterThanOrEqual(facts.breakEvenYearsClass3.min);
  });
  it('2025/26 golden vector: Class 3 = £923.00 (17.75 × 52)', () => {
    expect(computeFacts('2025-26', policy.taxYears['2025-26']!).class3CostPerYearGBP).toBe(923);
  });
});

describe('verdict precedence', () => {
  it('at/past SPA → AT_SPA_PATH regardless of everything else', () => {
    const v = triage(base({ yearsToSPA: 0, qualifyingYears: 40 }), TY, p);
    expect(v.category).toBe('AT_SPA_PATH');
    expect(v.reasons).toEqual(['AT_SPA']);
  });

  it('35+ qualifying years → PROBABLY_NOT with OVER_35_CAP first', () => {
    const v = triage(base({ qualifyingYears: 35 }), TY, p);
    expect(v.category).toBe('PROBABLY_NOT');
    expect(v.reasons[0]).toBe('OVER_35_CAP');
    expect(v.fillableYearsThatCount).toBe(0);
  });

  it('cliff unreachable: even buying everything stays under 10 → PROBABLY_NOT', () => {
    const v = triage(
      base({ yearsToSPA: 2, qualifyingYears: 3, recentGapYears: 2, expectsToKeepWorking: 'no' }),
      TY,
      p,
    );
    expect(v.category).toBe('PROBABLY_NOT');
    expect(v.reasons[0]).toBe('UNDER_10_CLIFF_UNREACHABLE');
  });

  it('cliff unreachable beats PC offset in reason order', () => {
    const v = triage(
      base({
        yearsToSPA: 2,
        qualifyingYears: 3,
        recentGapYears: 2,
        expectsToKeepWorking: 'no',
        expectsOtherRetirementIncome: 'no',
      }),
      TY,
      p,
    );
    expect(v.reasons[0]).toBe('UNDER_10_CLIFF_UNREACHABLE');
  });

  it('future working years alone reach 35 → PROBABLY_NOT (FUTURE_YEARS_SUFFICIENT)', () => {
    const v = triage(
      base({ yearsToSPA: 25, qualifyingYears: 15, expectsToKeepWorking: 'yes' }),
      TY,
      p,
    );
    expect(v.category).toBe('PROBABLY_NOT');
    expect(v.reasons[0]).toBe('FUTURE_YEARS_SUFFICIENT');
  });

  it('the honesty rule: no other retirement income → PROBABLY_NOT (PC_OFFSET)', () => {
    const v = triage(base({ expectsOtherRetirementIncome: 'no' }), TY, p);
    expect(v.category).toBe('PROBABLY_NOT');
    expect(v.reasons[0]).toBe('PC_OFFSET');
  });

  it('possible free credits → CANT_TELL, credits surfaced before any paid route', () => {
    const v = triage(base({ mayGetFreeCredits: 'yes' }), TY, p);
    expect(v.category).toBe('CANT_TELL');
    expect(v.reasons[0]).toBe('CHECK_FREE_CREDITS');
    expect(v.reasons).toContain('CHECK_FORECAST_FIRST');
  });

  it('unsure about other income → CANT_TELL with PC_UNSURE', () => {
    const v = triage(base({ expectsOtherRetirementIncome: 'unsure' }), TY, p);
    expect(v.category).toBe('CANT_TELL');
    expect(v.reasons).toContain('PC_UNSURE');
  });

  it('cliff reachable by paying → WORTH_CHECKING (UNDER_10_CLIFF_REACHABLE)', () => {
    const v = triage(
      base({ yearsToSPA: 3, qualifyingYears: 8, recentGapYears: 3, expectsToKeepWorking: 'no' }),
      TY,
      p,
    );
    expect(v.category).toBe('WORTH_CHECKING');
    expect(v.reasons[0]).toBe('UNDER_10_CLIFF_REACHABLE');
  });

  it('plain fillable gaps short of 35 → WORTH_CHECKING (FILLING_HELPS) + forecast step', () => {
    const v = triage(base(), TY, p);
    expect(v.category).toBe('WORTH_CHECKING');
    expect(v.reasons[0]).toBe('FILLING_HELPS');
    expect(v.reasons).toContain('CHECK_FORECAST_FIRST');
    expect(v.fillableYearsThatCount).toBe(3);
  });

  it('short of 35 with nothing fillable → CANT_TELL (record is the open question)', () => {
    const v = triage(base({ recentGapYears: 0 }), TY, p);
    expect(v.category).toBe('CANT_TELL');
    expect(v.reasons).toContain('CHECK_FORECAST_FIRST');
  });
});

describe('informational reasons accumulate', () => {
  it('older gaps add NOT_FILLABLE_TOO_OLD without changing the category', () => {
    const v = triage(base({ olderGapYears: 4 }), TY, p);
    expect(v.category).toBe('WORTH_CHECKING');
    expect(v.reasons).toContain('NOT_FILLABLE_TOO_OLD');
  });
  it('low-profit self-employment adds CLASS_2_RATE', () => {
    const v = triage(base({ employment: 'self-employed-low' }), TY, p);
    expect(v.reasons).toContain('CLASS_2_RATE');
  });
  it('pre-2016 record adds PRE_2016_CAVEAT', () => {
    const v = triage(base({ startedNIBefore2016: true }), TY, p);
    expect(v.reasons).toContain('PRE_2016_CAVEAT');
  });
  it('free-credits hint is NOT added onto a PROBABLY_NOT verdict (no mixed message)', () => {
    const v = triage(
      base({ qualifyingYears: 35, mayGetFreeCredits: 'yes' }),
      TY,
      p,
    );
    expect(v.category).toBe('PROBABLY_NOT');
    expect(v.reasons).not.toContain('CHECK_FREE_CREDITS');
  });
});

describe('fillable years bounded by cap and projection', () => {
  it('caps fillableYearsThatCount at the years actually missing', () => {
    const v = triage(
      base({ yearsToSPA: 10, qualifyingYears: 33, recentGapYears: 6, expectsToKeepWorking: 'no' }),
      TY,
      p,
    );
    expect(v.fillableYearsThatCount).toBe(2);
  });
});

describe('property: more recent gaps never DECREASE potential value', () => {
  it('fillableYearsThatCount is monotonically non-decreasing in recentGapYears, capped', () => {
    let prev = -1;
    for (let gaps = 0; gaps <= 6; gaps++) {
      const v = triage(base({ recentGapYears: gaps }), TY, p);
      expect(v.fillableYearsThatCount).toBeGreaterThanOrEqual(prev);
      expect(v.fillableYearsThatCount).toBeLessThanOrEqual(p.fullQualifyingYears);
      prev = v.fillableYearsThatCount;
    }
  });

  it('verdict is never WORTH_CHECKING when paying cannot add a counting year', () => {
    for (let q = 0; q <= 40; q++) {
      for (const gaps of [0, 3, 6]) {
        const v = triage(
          base({ qualifyingYears: q, recentGapYears: gaps, expectsToKeepWorking: 'no' }),
          TY,
          p,
        );
        if (v.category === 'WORTH_CHECKING') {
          expect(v.fillableYearsThatCount).toBeGreaterThan(0);
        }
      }
    }
  });
});
