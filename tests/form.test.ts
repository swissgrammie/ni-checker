import { describe, expect, it } from 'vitest';
import { parseInputs } from '../src/ui/form';

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

const VALID = {
  yearsToSPA: '20',
  qualifyingYears: '15',
  recentGapYears: '3',
  olderGapYears: '0',
  employment: 'employed',
  expectsToKeepWorking: 'no',
  mayGetFreeCredits: 'no',
  expectsOtherRetirementIncome: 'yes',
  startedNIBefore2016: 'no',
  abroadNowOrGaps: 'no',
};

describe('parseInputs — happy path', () => {
  it('parses a complete valid form', () => {
    const { inputs, errors } = parseInputs(fd(VALID));
    expect(errors).toEqual([]);
    expect(inputs).toMatchObject({ yearsToSPA: 20, qualifyingYears: 15, employment: 'employed' });
  });
  it('accepts 0 years to SPA (routes to the at-SPA path downstream)', () => {
    const { inputs, errors } = parseInputs(fd({ ...VALID, yearsToSPA: '0' }));
    expect(errors).toEqual([]);
    expect(inputs?.yearsToSPA).toBe(0);
  });
});

describe('parseInputs — per-field bounds', () => {
  it.each([
    ['yearsToSPA', '99'],
    ['yearsToSPA', '-1'],
    ['yearsToSPA', '2.5'],
    ['yearsToSPA', ''],
    ['qualifyingYears', '61'],
    ['recentGapYears', '7'],
    ['olderGapYears', '-3'],
  ])('rejects %s = %s', (field, value) => {
    const { inputs, errors } = parseInputs(fd({ ...VALID, [field]: value }));
    expect(inputs).toBeNull();
    expect(errors.some((e) => e.field === field)).toBe(true);
  });

  it('rejects a missing radio answer with a gentle message', () => {
    const f = fd(VALID);
    f.delete('expectsOtherRetirementIncome');
    const { inputs, errors } = parseInputs(f);
    expect(inputs).toBeNull();
    const err = errors.find((e) => e.field === 'expectsOtherRetirementIncome');
    expect(err?.message).toContain('not sure');
  });

  it('rejects an invalid employment value', () => {
    const { inputs, errors } = parseInputs(fd({ ...VALID, employment: 'astronaut' }));
    expect(inputs).toBeNull();
    expect(errors.some((e) => e.field === 'employment')).toBe(true);
  });
});

describe('parseInputs — cross-field consistency (the guided-recovery rule)', () => {
  it('rejects qualifying + gaps exceeding a plausible working life, pointing to the record check', () => {
    const { inputs, errors } = parseInputs(
      fd({ ...VALID, yearsToSPA: '40', qualifyingYears: '40', olderGapYears: '40' }),
    );
    expect(inputs).toBeNull();
    const err = errors.find((e) => e.field === 'qualifyingYears');
    expect(err?.recordCheckHelps).toBe(true);
  });

  it('does not fire the cross-field rule on plausible totals', () => {
    const { errors } = parseInputs(
      fd({ ...VALID, yearsToSPA: '5', qualifyingYears: '35', olderGapYears: '10' }),
    );
    expect(errors).toEqual([]);
  });
});
