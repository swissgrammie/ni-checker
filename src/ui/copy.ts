import type { Facts, ReasonCode, VerdictCategory } from '../rules/types';

/*
 * THE copy map. Every reason code and every verdict category MUST have an
 * entry here — the Record types make a missing entry a compile error, and
 * tests/copy.test.ts walks every code at runtime as a second lock.
 * The UI can only render copy that a rules-emitted code points to.
 */

export interface ReasonCopy {
  heading: string;
  body: (f: Facts) => string;
  /** What the user should actually do about it. Empty = explanation only. */
  checklist: (f: Facts) => string[];
}

const gbp = (n: number) =>
  '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const gbp0 = (n: number) => '£' + Math.round(n).toLocaleString('en-GB');

export const VERDICT_COPY: Record<VerdictCategory, { title: string; lead: string }> = {
  WORTH_CHECKING: {
    title: 'Paying could matter for you',
    lead: 'Based on what you told us, topping up your National Insurance record could genuinely increase your State Pension. Check your real record before paying anything — here is exactly how.',
  },
  PROBABLY_NOT: {
    title: 'Paying probably won’t help you',
    lead: 'Based on what you told us, paying voluntary National Insurance is unlikely to make you better off. Most websites won’t tell you this. Here is why, and what to check in case your situation is different.',
  },
  CANT_TELL: {
    title: 'Can’t tell yet — check these first',
    lead: 'Your answers point to questions only your real records can settle. Do these free checks first — they could change the answer completely, and none of them costs a penny.',
  },
  AT_SPA_PATH: {
    title: 'You’re at State Pension age — different rules apply',
    lead: 'Once you’ve reached State Pension age the decision works differently, and this tool isn’t built for it. The right help is free and official.',
  },
};

export const REASON_COPY: Record<ReasonCode, ReasonCopy> = {
  AT_SPA: {
    heading: 'Talk to the Pension Service',
    body: () =>
      'You can still pay voluntary contributions after State Pension age in some cases, and you may be owed Pension Credit. The Pension Service will check both for free.',
    checklist: () => [
      'Call the Pension Service on 0800 731 0469 and ask for a State Pension and Pension Credit check.',
      'If your income is low, check Pension Credit — it unlocks help with heating, NHS dental care and more.',
    ],
  },
  OVER_35_CAP: {
    heading: 'You already have a full record',
    body: (f) =>
      `You told us you have 35 or more qualifying years. Under the new State Pension that is the maximum that counts — paying for more years would cost ${gbp(f.class3CostPerYearGBP)} each and add nothing.`,
    checklist: (f) => [
      `Confirm it on your official forecast — if it shows ${gbp(f.newStatePensionWeeklyGBP)} a week, you are done and should not pay.`,
    ],
  },
  FUTURE_YEARS_SUFFICIENT: {
    heading: 'Your working years will get you there for free',
    body: () =>
      'If you keep working as you expect, you will reach the full State Pension through normal contributions before you retire. Paying now would buy years you were going to earn anyway.',
    checklist: () => [
      'Re-check if your plans change — stopping work early or going abroad changes this answer.',
    ],
  },
  UNDER_10_CLIFF_REACHABLE: {
    heading: 'You’re near the 10-year cliff edge — this could be huge',
    body: (f) =>
      `Below 10 qualifying years you get NO State Pension at all. Your answers suggest paying for missing years could lift you over that line — each year then unlocks about ${gbp0(f.upliftPerYearAnnualGBP)} a year for the rest of your life. Few financial decisions are this important.`,
    checklist: () => [
      'Check your exact qualifying years on your NI record today — this one is too important to estimate.',
      'Call the Future Pension Centre (0800 731 0175) before paying; ask them to confirm which years would count.',
    ],
  },
  UNDER_10_CLIFF_UNREACHABLE: {
    heading: 'The 10-year minimum looks out of reach',
    body: () =>
      'You need at least 10 qualifying years to get any State Pension. From what you told us, even buying every year you can would leave you below 10 — in that case the money buys nothing. Please check your real record though: people often have more years than they think (school-leaver credits, past jobs, time on benefits).',
    checklist: () => [
      'Check your NI record — your real total may be higher than your guess.',
      'If the record confirms it, keep your money. Pension Credit may support you at retirement instead.',
    ],
  },
  CHECK_FREE_CREDITS: {
    heading: 'You may be able to fill gaps for free',
    body: () =>
      'Years with Child Benefit for a child under 12, caring 20+ hours a week, or certain benefits can fill NI gaps at no cost — some can even be claimed years later. Always claim free credits before paying for anything.',
    checklist: () => [
      'Child Benefit years: check you were the named claimant — the credit follows the claim.',
      'Caring for someone 20+ hours a week: look up Carer’s Credit on GOV.UK.',
      'Grandparent looking after grandchildren? Look up Specified Adult Childcare credits.',
    ],
  },
  PC_OFFSET: {
    heading: 'The honest part: Pension Credit may make paying pointless for you',
    body: (f) =>
      `You told us you expect to rely on the State Pension alone. If your retirement income stays low, Pension Credit tops you up to about ${gbp(f.pcGuaranteeSingleWeeklyGBP)} a week anyway — and every pound of extra State Pension you buy is roughly a pound less Pension Credit. You could spend ${gbp(f.class3CostPerYearGBP)} per year filled and end up no better off. Almost no one tells you this.`,
    checklist: (f) => [
      `Compare: full State Pension is ${gbp(f.newStatePensionWeeklyGBP)}/week, Pension Credit guarantee is about ${gbp(f.pcGuaranteeSingleWeeklyGBP)}/week — the gap is small.`,
      'If anything might give you other retirement income later (work pension, inheritance, partner), the answer changes — re-check then.',
      'Remember Pension Credit must be claimed — a third of people entitled to it never do.',
    ],
  },
  PC_UNSURE: {
    heading: 'First find out: will you have income besides the State Pension?',
    body: () =>
      'This single question decides whether paying helps you. With other retirement income, extra State Pension is yours to keep. Without it, Pension Credit may top you up anyway and cancel out what you bought.',
    checklist: () => [
      'Dig out any old workplace pension letters — even small pots count.',
      'Check old pensions for free via the government’s Pension Tracing Service.',
    ],
  },
  NOT_FILLABLE_TOO_OLD: {
    heading: 'Some of your gaps are probably too old to fill',
    body: () =>
      'You can normally only pay for gaps from the last 6 tax years. (You may remember people filling gaps all the way back to 2006 — that special window closed on 5 April 2025.) Older gaps usually cannot be bought back — so decisions about recent gaps matter more.',
    checklist: () => [
      'Your NI record shows exactly which years are still payable and the deadline for each.',
    ],
  },
  CLASS_2_RATE: {
    heading: 'Self-employed with low profits? Your rate is 5× cheaper',
    body: (f) =>
      `Because your profits are under the threshold, you can pay voluntary Class 2 at ${gbp(f.class2CostPerYearGBP)} a year instead of Class 3 at ${gbp(f.class3CostPerYearGBP)}. Same pension benefit, a fraction of the cost — one of the best-kept secrets in the system.`,
    checklist: () => [
      'Pay Class 2 through your Self Assessment — tick the voluntary payment box.',
    ],
  },
  PRE_2016_CAVEAT: {
    heading: 'Your record started before 2016 — the maths gets personal',
    body: () =>
      'Records that began before April 2016 use transitional rules (including “contracting out”), so a bought year sometimes adds less than the headline amount — or nothing. For you, the official forecast is not optional homework, it is the answer.',
    checklist: () => [
      'Your forecast shows exactly what each payable year would add for YOU — trust that number over any calculator, including this one.',
    ],
  },
  ABROAD_RULES_CHANGED: {
    heading: 'Living abroad? The rules just got much tougher',
    body: () =>
      'From 6 April 2026 the rules for paying voluntary NI from abroad changed sharply. The cheap Class 2 route for time abroad was abolished — people who topped up from overseas before then often paid around £180 a year; that option has gone. Paying Class 3 from abroad now normally requires 10 years of past UK residence or 10 years of paid contributions (it used to be 3). If you applied to HMRC before 6 April 2026, transitional protection may let you pay under the old rules until 5 April 2027 — that deadline matters.',
    checklist: () => [
      'Read HMRC leaflet NI38 (Social Security abroad) and apply with form CF83 — search "CF83" on GOV.UK.',
      'If you applied before 6 April 2026, check your transitional protection and pay before 5 April 2027.',
      'For abroad cases, speak to the Future Pension Centre (+44 191 218 3600 from outside the UK) before deciding anything.',
    ],
  },
  FILLING_HELPS: {
    heading: 'Filling recent gaps could increase your pension',
    body: (f) =>
      `You look short of the full State Pension with gaps you can still fill. Each filled year costs ${gbp(f.class3CostPerYearGBP)} (Class 3) and adds about ${gbp0(f.upliftPerYearAnnualGBP)} a year to your pension for life — typically paying for itself within ${f.breakEvenYearsClass3.min}–${f.breakEvenYearsClass3.max} years of retiring.`,
    checklist: () => [],
  },
  CHECK_FORECAST_FIRST: {
    heading: 'Before any money moves: check your real record (free, 10 minutes)',
    body: () =>
      'Everything above is based on your estimates. Your actual NI record and State Pension forecast are free to check and show the true numbers, including exactly which years you can fill and what each would add.',
    checklist: () => [
      'Check your State Pension forecast: gov.uk/check-state-pension',
      'Check your NI record: gov.uk/check-national-insurance-record (the HMRC app works too)',
      'Then, before paying, call the Future Pension Centre on 0800 731 0175 — they confirm whether a specific year will actually increase your pension.',
    ],
  },
};

export const CATEGORY_ORDER: VerdictCategory[] = [
  'WORTH_CHECKING',
  'PROBABLY_NOT',
  'CANT_TELL',
  'AT_SPA_PATH',
];
