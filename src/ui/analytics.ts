/*
 * Cookieless analytics (eng review 9A). Privacy contract:
 *  - no cookies, no localStorage, no fingerprinting, no third-party script
 *    (we use GoatCounter's pixel endpoint, not count.js)
 *  - exactly two events ever leave the device: an anonymous page view and an
 *    anonymous "completed" ping
 *  - user INPUTS never appear in any request — the pings carry a path only,
 *    never a payload
 */
export const ANALYTICS_ENDPOINT = 'https://swissgrammie.goatcounter.com/count';

function ping(path: string): void {
  if (!ANALYTICS_ENDPOINT) return;
  try {
    const img = new Image();
    img.src = `${ANALYTICS_ENDPOINT}?p=${encodeURIComponent(path)}`;
  } catch {
    // Analytics must never break the product.
  }
}

export function trackPageview(): void {
  ping(window.location.pathname);
}

export function trackCompletion(): void {
  ping('/triage-completed');
}
