// Performance budget (eng review T8): gzipped JS ≤ 50KB.
// The audience is on cheap phones with metered data; the budget is a product
// requirement, not an optimisation nicety.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 50 * 1024;
const assetsDir = join(process.cwd(), 'dist', 'assets');

let total = 0;
for (const file of readdirSync(assetsDir)) {
  if (!file.endsWith('.js')) continue;
  const gz = gzipSync(readFileSync(join(assetsDir, file))).length;
  console.log(`${file}: ${gz} bytes gzipped`);
  total += gz;
}

console.log(`Total gzipped JS: ${total} bytes (budget ${BUDGET_BYTES})`);
if (total > BUDGET_BYTES) {
  console.error(`BUDGET EXCEEDED by ${total - BUDGET_BYTES} bytes`);
  process.exit(1);
}
