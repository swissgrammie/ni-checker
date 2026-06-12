import type {
  Facts,
  Inputs,
  ReasonCode,
  TaxYearPolicy,
  Verdict,
  VerdictCategory,
} from './types';

export function computeFacts(taxYearLabel: string, p: TaxYearPolicy): Facts {
  const class3CostPerYearGBP = round2(p.class3WeeklyGBP * 52);
  const class2CostPerYearGBP = round2(p.class2WeeklyGBP * 52);
  const upliftPerYearAnnualGBP = round2(
    (p.newStatePensionWeeklyGBP / p.fullQualifyingYears) * 52,
  );
  // Break-even shown as a range: raw cost/uplift, widened for tax on pension
  // income (basic-rate taxpayers keep ~80% of the uplift). Never a point estimate.
  const raw = class3CostPerYearGBP / upliftPerYearAnnualGBP;
  return {
    taxYearLabel,
    class3CostPerYearGBP,
    class2CostPerYearGBP,
    upliftPerYearAnnualGBP,
    breakEvenYearsClass3: {
      min: Math.ceil(raw),
      max: Math.ceil(raw / 0.8),
    },
    pcGuaranteeSingleWeeklyGBP: p.pensionCreditGuaranteeSingleWeeklyGBP,
    newStatePensionWeeklyGBP: p.newStatePensionWeeklyGBP,
  };
}

/**
 * The triage engine. Pure function: (inputs, policy) → verdict.
 *
 * Outputs a verdict CATEGORY plus machine-readable reason codes. The UI maps
 * codes to copy — it cannot display an explanation the rules did not emit.
 * No personalised projections: the only numbers in the output are hard facts.
 *
 * Category precedence is documented in types.ts and pinned by tests.
 */
export function triage(inputs: Inputs, taxYearLabel: string, p: TaxYearPolicy): Verdict {
  const facts = computeFacts(taxYearLabel, p);
  const reasons: ReasonCode[] = [];

  // ── At or past State Pension age: a different service entirely ──────────
  if (inputs.yearsToSPA <= 0) {
    return {
      category: 'AT_SPA_PATH',
      reasons: ['AT_SPA'],
      facts,
      fillableYearsThatCount: 0,
    };
  }

  const cap = p.fullQualifyingYears;
  const cliff = p.minQualifyingYears;
  const have = inputs.qualifyingYears;
  const futureYears =
    inputs.expectsToKeepWorking === 'yes'
      ? Math.min(inputs.yearsToSPA, Math.max(0, cap - have))
      : 0;
  const projectedWithoutPaying = Math.min(have + futureYears, cap);
  const fillableGaps = inputs.recentGapYears;
  const fillableYearsThatCount = Math.max(
    0,
    Math.min(fillableGaps, cap - projectedWithoutPaying),
  );

  // Informational reasons accumulate regardless of category.
  if (inputs.olderGapYears > 0) reasons.push('NOT_FILLABLE_TOO_OLD');
  if (inputs.employment === 'self-employed-low') reasons.push('CLASS_2_RATE');
  if (inputs.startedNIBefore2016) reasons.push('PRE_2016_CAVEAT');

  // ── Category decision, precedence order (first match wins) ──────────────
  let category: VerdictCategory;

  if (have >= cap) {
    reasons.unshift('OVER_35_CAP');
    category = 'PROBABLY_NOT';
  } else if (have + futureYears + fillableGaps < cliff) {
    // Even buying every fillable gap cannot reach the minimum — paying buys nothing.
    reasons.unshift('UNDER_10_CLIFF_UNREACHABLE');
    category = 'PROBABLY_NOT';
  } else if (projectedWithoutPaying >= cap) {
    reasons.unshift('FUTURE_YEARS_SUFFICIENT');
    category = 'PROBABLY_NOT';
  } else if (inputs.expectsOtherRetirementIncome === 'no') {
    // The honest differentiator: extra State Pension is offset roughly
    // pound-for-pound by Pension Credit for people who would rely on it.
    reasons.unshift('PC_OFFSET');
    category = 'PROBABLY_NOT';
  } else {
    const checkFirst: ReasonCode[] = [];
    if (inputs.mayGetFreeCredits !== 'no') checkFirst.push('CHECK_FREE_CREDITS');
    if (inputs.expectsOtherRetirementIncome === 'unsure') checkFirst.push('PC_UNSURE');

    const reachesCliffByPaying = have + futureYears < cliff; // and we know paying CAN reach it
    if (checkFirst.length > 0) {
      reasons.unshift(...checkFirst);
      reasons.push('CHECK_FORECAST_FIRST');
      category = 'CANT_TELL';
    } else if (reachesCliffByPaying) {
      reasons.unshift('UNDER_10_CLIFF_REACHABLE');
      reasons.push('CHECK_FORECAST_FIRST');
      category = 'WORTH_CHECKING';
    } else if (fillableYearsThatCount > 0) {
      reasons.unshift('FILLING_HELPS');
      reasons.push('CHECK_FORECAST_FIRST');
      category = 'WORTH_CHECKING';
    } else {
      // Short of the full pension but nothing fillable in the window —
      // the record itself is the open question.
      reasons.push('CHECK_FORECAST_FIRST');
      category = 'CANT_TELL';
    }
  }

  // Free-credits must be surfaced before any paid route, whatever the category.
  if (
    inputs.mayGetFreeCredits !== 'no' &&
    !reasons.includes('CHECK_FREE_CREDITS') &&
    category !== 'PROBABLY_NOT'
  ) {
    reasons.unshift('CHECK_FREE_CREDITS');
  }

  return { category, reasons, facts, fillableYearsThatCount };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
