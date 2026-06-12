import { describe, expect, it } from 'vitest';
import { computeFacts } from '../src/rules/engine';
import { loadPolicy } from '../src/rules/policy';
import { REASON_COPY, VERDICT_COPY } from '../src/ui/copy';
import type { ReasonCode, VerdictCategory } from '../src/rules/types';

/*
 * The exhaustiveness lock (eng review 4A). TypeScript's Record already fails
 * the build on a missing key; this test additionally proves every entry
 * produces real, non-empty copy at runtime — an empty string would satisfy
 * the type checker and still ship a blank explanation.
 */

const ALL_REASONS: ReasonCode[] = [
  'AT_SPA',
  'OVER_35_CAP',
  'FUTURE_YEARS_SUFFICIENT',
  'UNDER_10_CLIFF_REACHABLE',
  'UNDER_10_CLIFF_UNREACHABLE',
  'CHECK_FREE_CREDITS',
  'PC_OFFSET',
  'PC_UNSURE',
  'NOT_FILLABLE_TOO_OLD',
  'CLASS_2_RATE',
  'PRE_2016_CAVEAT',
  'ABROAD_RULES_CHANGED',
  'FILLING_HELPS',
  'CHECK_FORECAST_FIRST',
];

const ALL_CATEGORIES: VerdictCategory[] = [
  'WORTH_CHECKING',
  'PROBABLY_NOT',
  'CANT_TELL',
  'AT_SPA_PATH',
];

const policy = loadPolicy();
const facts = computeFacts('2026-27', policy.taxYears['2026-27']!);

describe('copy exhaustiveness', () => {
  it.each(ALL_REASONS)('reason %s has a heading and body', (code) => {
    const c = REASON_COPY[code];
    expect(c.heading.length).toBeGreaterThan(10);
    expect(c.body(facts).length).toBeGreaterThan(40);
    // checklist may legitimately be empty, but must not throw
    expect(Array.isArray(c.checklist(facts))).toBe(true);
  });

  it.each(ALL_CATEGORIES)('category %s has a title and lead', (cat) => {
    expect(VERDICT_COPY[cat].title.length).toBeGreaterThan(10);
    expect(VERDICT_COPY[cat].lead.length).toBeGreaterThan(40);
  });

  it('copy renders live 2026/27 figures, not stale hardcoded ones', () => {
    expect(REASON_COPY.PC_OFFSET.body(facts)).toContain('£238.00');
    expect(REASON_COPY.CLASS_2_RATE.body(facts)).toContain('£189.80');
    expect(REASON_COPY.OVER_35_CAP.body(facts)).toContain('£956.80');
  });

  it('the guidance boundary holds: no copy ever says "you should pay"', () => {
    for (const code of ALL_REASONS) {
      const text = (REASON_COPY[code].heading + ' ' + REASON_COPY[code].body(facts)).toLowerCase();
      expect(text).not.toMatch(/you should (pay|buy)/);
      expect(text).not.toMatch(/we recommend (paying|buying)/);
    }
  });
});
