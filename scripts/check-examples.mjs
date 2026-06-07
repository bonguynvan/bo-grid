// Guards the framework starter examples from rotting: extracts each
// <script type="module"> from examples/*.html and syntax-checks it with node.
import { readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = readdirSync('examples').filter((f) => f.endsWith('.html'));
if (files.length === 0) {
  console.error('✗ check-examples: no examples/*.html found');
  process.exit(1);
}

let failed = false;
for (const file of files) {
  const html = readFileSync(`examples/${file}`, 'utf8');
  const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  if (!m) {
    console.error(`✗ ${file}: no <script type="module"> block`);
    failed = true;
    continue;
  }
  const tmp = `examples/.${file}.check.mjs`;
  writeFileSync(tmp, m[1]);
  try {
    execSync(`node --check ${tmp}`);
    console.log(`✓ ${file}`);
  } catch (e) {
    console.error(`✗ ${file}: ${String(e.stderr || e).trim()}`);
    failed = true;
  } finally {
    unlinkSync(tmp);
  }
}

if (failed) process.exit(1);
console.log(`\n✓ check-examples: ${files.length} framework example(s) syntax-valid`);
