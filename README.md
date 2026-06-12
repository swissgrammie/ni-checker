# Should you top up your State Pension?

A free, honest triage tool for UK voluntary National Insurance contributions, built by
[Forgotten Savers](./methodology.html). Answers one question in two minutes:
**could paying voluntary NI increase your State Pension — or would it be money down the drain?**

What makes it different: it tells low earners when paying **won't** help them
(the Pension Credit offset, the 10-year cliff, the 35-year cap, free credits first) —
the answers most calculators skip. It never recommends paying; it routes every decision
through the free official checks (GOV.UK forecast, Future Pension Centre).

## Privacy
Everything runs on your device. No login, no cookies, no data stored, no user input ever
transmitted. Optional visitor counting (when enabled) is cookieless and counts only
page views and an anonymous "completed" ping.

## Architecture

```
src/data/policy.json    tax-year-keyed rates AND policy rules, with sources + verifiedOn
        │
src/rules/policy.ts     tax-year selection (April 5/6 boundary), schema validation,
        │               runtime staleness check
src/rules/engine.ts     pure triage function: (inputs, policy) → verdict category
        │               + machine-readable reason codes + hard facts (never projections)
src/ui/copy.ts          THE copy map: every reason code → plain-English explanation
        │               (exhaustive by type + by test; UI cannot say what rules didn't emit)
src/ui/form.ts          validation: bounds + cross-field consistency + guided recovery
src/ui/results.ts       renders verdict from the copy map only
src/ui/banner.ts        runtime staleness banner — stale rates are never silent
```

## The April ritual
Every April the rates change. The weekly CI cron and the `policy covers TODAY` test go
red until someone adds the new tax year to `src/data/policy.json` (10 minutes: rates from
GOV.UK, bump `verifiedOn`, commit). The deployed site independently shows a staleness
banner to users if its bundled data doesn't cover the current tax year.

## Develop

```bash
npm install
npm test          # unit: rules, policy schema, copy exhaustiveness, golden vectors
npm run dev       # local dev server
npm run build     # type-check + production build
npm run budget    # enforce ≤50KB gzipped JS
npx playwright test  # E2E: main journey + Pension Credit honest warning (mobile viewport)
```

## Corrections
If any figure or rule is wrong or stale, open an issue. The footer shows when rates were
last verified. Methodology and sources: [methodology.html](./methodology.html).

## Partner co-branding
The footer `partner-slot` is dormant by design. It activates only under a signed
licensing agreement (see the Forgotten Savers design doc).
