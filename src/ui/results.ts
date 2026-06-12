import type { Verdict } from '../rules/types';
import { REASON_COPY, VERDICT_COPY } from './copy';

const gbp = (n: number) =>
  '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/** Renders a verdict. Copy comes ONLY from the reason-code map — eng review 4A. */
export function renderVerdict(v: Verdict): string {
  const verdict = VERDICT_COPY[v.category];
  const blocks = v.reasons.map((code) => {
    const c = REASON_COPY[code];
    const checklist = c.checklist(v.facts);
    return `
      <section class="reason" data-reason="${code}">
        <h3>${esc(c.heading)}</h3>
        <p>${esc(c.body(v.facts))}</p>
        ${
          checklist.length
            ? `<ul class="checklist">${checklist.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`
            : ''
        }
      </section>`;
  });

  const facts = v.facts;
  return `
    <div class="verdict verdict--${v.category.toLowerCase()}" data-category="${v.category}">
      <h2>${esc(verdict.title)}</h2>
      <p class="verdict-lead">${esc(verdict.lead)}</p>
    </div>
    ${blocks.join('\n')}
    <section class="facts">
      <h3>The facts behind this (${esc(facts.taxYearLabel)} tax year)</h3>
      <ul>
        <li>A voluntary Class 3 year costs <strong>${gbp(facts.class3CostPerYearGBP)}</strong>; Class 2 (low-profit self-employed) costs <strong>${gbp(facts.class2CostPerYearGBP)}</strong>.</li>
        <li>Each year that counts adds about <strong>£${Math.round(facts.upliftPerYearAnnualGBP)}</strong> a year to your State Pension, for life.</li>
        <li>A Class 3 year typically pays for itself within <strong>${facts.breakEvenYearsClass3.min}–${facts.breakEvenYearsClass3.max} years</strong> of receiving your pension.</li>
        <li>These are facts about the system, not a projection for you — only your official forecast gives personal numbers.</li>
      </ul>
    </section>`;
}
