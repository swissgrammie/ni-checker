/*
 * Cookieless analytics (eng review 9A). Privacy contract, enforced by test:
 *  - no cookies, no localStorage, no fingerprinting
 *  - ONLY two events ever leave the device: a page view (handled by the
 *    GoatCounter script tag when configured) and a single "completed" ping
 *  - user INPUTS never appear in any request — the ping carries no payload
 *
 * ANALYTICS_ENDPOINT is empty until a GoatCounter (or compatible) account
 * is configured; everything is a no-op until then.
 */
export const ANALYTICS_ENDPOINT = ''; // e.g. 'https://forgottensavers.goatcounter.com/count'

export function trackCompletion(): void {
  if (!ANALYTICS_ENDPOINT) return;
  try {
    const img = new Image();
    img.src = `${ANALYTICS_ENDPOINT}?p=/triage-completed`;
  } catch {
    // Analytics must never break the product.
  }
}
