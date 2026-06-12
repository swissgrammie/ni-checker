import type { Policy } from '../rules/types';
import { isPolicyCurrent } from '../rules/policy';

/*
 * Runtime staleness safeguard (eng review 8A): the CI alarm protects the
 * repo, this protects the USER. If the deployed bundle has no rates entry
 * for today's tax year, every visitor sees this banner — stale data is
 * never silent in production.
 */
export function staleBannerHTML(now: Date, policy: Policy): string | null {
  if (isPolicyCurrent(now, policy)) return null;
  return `
    <div class="stale-banner" role="alert">
      <strong>These figures may be out of date.</strong>
      The rates on this page have not yet been updated for the current tax year.
      Check the official numbers at
      <a href="https://www.gov.uk/voluntary-national-insurance-contributions/rates">GOV.UK</a>
      before making any decision.
    </div>`;
}
