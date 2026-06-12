export type EmploymentStatus =
  | 'employed'
  | 'self-employed-low' // self-employed, profits below the Small Profits Threshold
  | 'self-employed'
  | 'not-working';

export type ThreeWay = 'yes' | 'no' | 'unsure';

export interface Inputs {
  /** Whole years until State Pension age. 0 = at or past SPA. */
  yearsToSPA: number;
  /** Qualifying years on the NI record so far (user's estimate). */
  qualifyingYears: number;
  /** Gap years within the backfill window (normally the last 6 tax years). */
  recentGapYears: number;
  /** Gap years older than the backfill window. */
  olderGapYears: number;
  employment: EmploymentStatus;
  /** Will they likely keep earning qualifying years until SPA? */
  expectsToKeepWorking: ThreeWay;
  /** Child Benefit for a child under 12, caring 20+ hrs/week, or certain benefits — free credits may fill gaps. */
  mayGetFreeCredits: ThreeWay;
  /** Do they expect retirement income besides the State Pension? Drives the Pension Credit screen. */
  expectsOtherRetirementIncome: ThreeWay;
  /** Did their working life start before April 2016? Pre-2016 records have transitional rules. */
  startedNIBefore2016: boolean;
  /** Lives abroad now, or some gap years were spent abroad. From April 2026 the
   *  abroad rules tightened sharply (Class 2 abroad abolished; Class 3 abroad
   *  needs 10 years UK residence/contributions). */
  abroadNowOrGaps: boolean;
}

/*
 * Verdict decision tree (precedence order — first match wins for category;
 * reasons accumulate independently):
 *
 *   yearsToSPA == 0 ───────────────────────────► AT_SPA_PATH
 *   qualifyingYears >= 35 ─────────────────────► PROBABLY_NOT  (OVER_35_CAP)
 *   max achievable years < 10 ─────────────────► PROBABLY_NOT  (UNDER_10_CLIFF_UNREACHABLE)
 *   future working years alone reach 35 ───────► PROBABLY_NOT  (FUTURE_YEARS_SUFFICIENT)
 *   PC screen: no other retirement income ─────► PROBABLY_NOT  (PC_OFFSET)
 *   free credits possible / PC unsure /
 *     pre-2016 record ─────────────────────────► CANT_TELL     (check first)
 *   filling reaches 10 from below ─────────────► WORTH_CHECKING (UNDER_10_CLIFF_REACHABLE)
 *   fillable gaps and short of 35 ─────────────► WORTH_CHECKING (FILLING_HELPS)
 *   nothing fillable, short of 35 ─────────────► CANT_TELL     (CHECK_FORECAST_FIRST)
 */
export type VerdictCategory =
  | 'WORTH_CHECKING'
  | 'PROBABLY_NOT'
  | 'CANT_TELL'
  | 'AT_SPA_PATH';

export type ReasonCode =
  | 'AT_SPA'
  | 'OVER_35_CAP'
  | 'FUTURE_YEARS_SUFFICIENT'
  | 'UNDER_10_CLIFF_REACHABLE'
  | 'UNDER_10_CLIFF_UNREACHABLE'
  | 'CHECK_FREE_CREDITS'
  | 'PC_OFFSET'
  | 'PC_UNSURE'
  | 'NOT_FILLABLE_TOO_OLD'
  | 'CLASS_2_RATE'
  | 'PRE_2016_CAVEAT'
  | 'ABROAD_RULES_CHANGED'
  | 'FILLING_HELPS'
  | 'CHECK_FORECAST_FIRST';

export interface TaxYearPolicy {
  startDate: string;
  endDate: string;
  class3WeeklyGBP: number;
  class2WeeklyGBP: number;
  newStatePensionWeeklyGBP: number;
  pensionCreditGuaranteeSingleWeeklyGBP: number;
  smallProfitsThresholdGBP: number;
  minQualifyingYears: number;
  fullQualifyingYears: number;
  backfillWindowYears: number;
}

export interface Policy {
  verifiedOn: string;
  sources: string[];
  taxYears: Record<string, TaxYearPolicy>;
}

/** Hard facts — always true regardless of the user's situation. Never personalised projections. */
export interface Facts {
  taxYearLabel: string;
  class3CostPerYearGBP: number;
  class2CostPerYearGBP: number;
  upliftPerYearAnnualGBP: number; // ~1/35 of full nSP, per filled year
  breakEvenYearsClass3: { min: number; max: number }; // range, not a point
  pcGuaranteeSingleWeeklyGBP: number;
  newStatePensionWeeklyGBP: number;
}

export interface Verdict {
  category: VerdictCategory;
  reasons: ReasonCode[];
  facts: Facts;
  /** Years the user could still gain by paying, bounded by cap and cliff. 0 when paying cannot help. */
  fillableYearsThatCount: number;
}
