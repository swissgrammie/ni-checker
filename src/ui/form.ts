import type { EmploymentStatus, Inputs, ThreeWay } from '../rules/types';

export interface FieldError {
  field: string;
  message: string;
  /** True when the fix is "check your real record", so we show the HMRC link. */
  recordCheckHelps: boolean;
}

const MAX_WORKING_LIFE = 60; // age ~16 to ~76; nobody has more NI years than this

function num(form: FormData, name: string): number {
  const raw = String(form.get(name) ?? '').trim();
  if (raw === '') return NaN;
  return Number(raw);
}

function threeWay(form: FormData, name: string): ThreeWay | null {
  const v = form.get(name);
  return v === 'yes' || v === 'no' || v === 'unsure' ? v : null;
}

/*
 * Validation philosophy (eng review 5A): catch contradictions, then guide.
 * Every cross-field failure links to the real record check — bad input is
 * the product's best teaching moment, not a dead end.
 */
export function parseInputs(form: FormData): { inputs: Inputs | null; errors: FieldError[] } {
  const errors: FieldError[] = [];

  const yearsToSPA = num(form, 'yearsToSPA');
  const qualifyingYears = num(form, 'qualifyingYears');
  const recentGapYears = num(form, 'recentGapYears');
  const olderGapYears = num(form, 'olderGapYears');

  const bounds: Array<[string, number, number, string]> = [
    ['yearsToSPA', yearsToSPA, 55, 'Years until State Pension age must be a whole number between 0 and 55.'],
    ['qualifyingYears', qualifyingYears, MAX_WORKING_LIFE, 'Qualifying years must be between 0 and 60.'],
    ['recentGapYears', recentGapYears, 6, 'Gap years in the last 6 tax years must be between 0 and 6.'],
    ['olderGapYears', olderGapYears, MAX_WORKING_LIFE, 'Older gap years must be between 0 and 60.'],
  ];
  for (const [field, value, max, message] of bounds) {
    if (!Number.isInteger(value) || value < 0 || value > max) {
      errors.push({ field, message, recordCheckHelps: false });
    }
  }

  const employment = String(form.get('employment') ?? '') as EmploymentStatus;
  if (!['employed', 'self-employed-low', 'self-employed', 'not-working'].includes(employment)) {
    errors.push({ field: 'employment', message: 'Choose the option closest to your work situation.', recordCheckHelps: false });
  }

  const expectsToKeepWorking = threeWay(form, 'expectsToKeepWorking');
  const mayGetFreeCredits = threeWay(form, 'mayGetFreeCredits');
  const expectsOtherRetirementIncome = threeWay(form, 'expectsOtherRetirementIncome');
  if (!expectsToKeepWorking) errors.push({ field: 'expectsToKeepWorking', message: 'Tell us whether you expect to keep working — “not sure” is a fine answer.', recordCheckHelps: false });
  if (!mayGetFreeCredits) errors.push({ field: 'mayGetFreeCredits', message: 'Tell us about Child Benefit or caring — “not sure” is a fine answer.', recordCheckHelps: false });
  if (!expectsOtherRetirementIncome) errors.push({ field: 'expectsOtherRetirementIncome', message: 'Tell us about other retirement income — “not sure” is a fine answer.', recordCheckHelps: false });

  const startedNIBefore2016 = form.get('startedNIBefore2016') === 'yes';
  const abroadNowOrGaps = form.get('abroadNowOrGaps') === 'yes';

  if (errors.length > 0 || !expectsToKeepWorking || !mayGetFreeCredits || !expectsOtherRetirementIncome) {
    return { inputs: null, errors };
  }

  // ── Cross-field consistency: these cannot all be true at once ───────────
  const yearsSince16Possible = MAX_WORKING_LIFE - yearsToSPA + 12; // generous upper bound
  if (qualifyingYears + recentGapYears + olderGapYears > yearsSince16Possible) {
    errors.push({
      field: 'qualifyingYears',
      message:
        'Your qualifying years plus gap years add up to more working years than look possible. One of the numbers is probably a guess too far — your real record settles it in two minutes.',
      recordCheckHelps: true,
    });
  }

  if (errors.length > 0) return { inputs: null, errors };

  return {
    inputs: {
      yearsToSPA,
      qualifyingYears,
      recentGapYears,
      olderGapYears,
      employment,
      expectsToKeepWorking,
      mayGetFreeCredits,
      expectsOtherRetirementIncome,
      startedNIBefore2016,
      abroadNowOrGaps,
    },
    errors: [],
  };
}
