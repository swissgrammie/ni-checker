import './styles.css';
import { loadPolicy, policyFor, taxYearKeyFor } from './rules/policy';
import { triage } from './rules/engine';
import { parseInputs, type FieldError } from './ui/form';
import { renderVerdict } from './ui/results';
import { staleBannerHTML } from './ui/banner';
import { trackCompletion, trackPageview } from './ui/analytics';

const policy = loadPolicy();
const now = new Date();

trackPageview();

// Runtime staleness banner (8A) — renders before anything else.
const bannerHost = document.getElementById('banner-host');
const banner = staleBannerHTML(now, policy);
if (bannerHost && banner) bannerHost.innerHTML = banner;

// Verified-on footer line (1A).
const verified = document.getElementById('verified-on');
if (verified) verified.textContent = `Rates last verified ${policy.verifiedOn} (${taxYearKeyFor(now)} tax year).`;

const form = document.getElementById('triage-form') as HTMLFormElement | null;
const errorHost = document.getElementById('error-host');
const resultsHost = document.getElementById('results-host');

function esc(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function renderErrors(errors: FieldError[]): string {
  const anyRecordHelp = errors.some((e) => e.recordCheckHelps);
  return `
    <div class="error-summary" role="alert" tabindex="-1" id="error-summary">
      <h2>Check your answers</h2>
      <ul>
        ${errors.map((e) => `<li><a href="#field-${esc(e.field)}">${esc(e.message)}</a></li>`).join('')}
      </ul>
      ${
        anyRecordHelp
          ? `<p>Not sure of your real numbers? <a href="https://www.gov.uk/check-national-insurance-record">Check your National Insurance record on GOV.UK</a> — it’s free and takes about 10 minutes, and it turns every guess on this page into a fact.</p>`
          : ''
      }
    </div>`;
}

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!errorHost || !resultsHost) return;

  const { inputs, errors } = parseInputs(new FormData(form));
  if (!inputs) {
    resultsHost.innerHTML = '';
    errorHost.innerHTML = renderErrors(errors);
    document.getElementById('error-summary')?.focus();
    return;
  }

  errorHost.innerHTML = '';
  const key = taxYearKeyFor(now);
  const taxYear = policyFor(now, policy) ?? policy.taxYears[latestKey(policy.taxYears)];
  if (!taxYear) return; // unreachable: validatePolicy guarantees ≥1 tax year

  const verdict = triage(inputs, key, taxYear);
  resultsHost.innerHTML = renderVerdict(verdict);
  resultsHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
  trackCompletion();
});

function latestKey(taxYears: Record<string, unknown>): string {
  return Object.keys(taxYears).sort().reverse()[0] ?? '';
}
