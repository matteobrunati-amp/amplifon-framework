import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const outDir = path.join(root, 'dist', version);
const checkOnly = process.argv.includes('--check');

const orderedModules = [
  '01_UTILS.js',
  '02_TRACKING.js',
  '03_ATTRIBUTION.js',
  '04_RENDERER.js',
  '05_MULTISTEP_ENGINE.js',
  '06_UNBOUNCE_BRIDGE.js',
  '07_LEAD_BOOTSTRAP.js'
];

const banner = `/* Amplifon Framework - multistep v${version} | generated; edit src/, not dist/ */\n`;
const js = banner + orderedModules.map((file) => {
  const p = path.join(root, 'src', 'multistep', file);
  if (!fs.existsSync(p)) throw new Error(`Missing source: ${p}`);
  return `\n/* ===== ${file} ===== */\n${fs.readFileSync(p, 'utf8').trim()}\n`;
}).join('');

const css = fs.readFileSync(path.join(root, 'src', 'styles', 'amplifon-multistep.css'), 'utf8');
const confirmation = fs.readFileSync(path.join(root, 'src', 'confirmation', 'amplifon-confirmation.js'), 'utf8');
const manifest = JSON.stringify({
  framework: 'amplifon-framework',
  family: 'multistep',
  version,
  files: [
    'amplifon-multistep.js',
    'amplifon-multistep.css',
    'amplifon-confirmation.js'
  ]
}, null, 2) + '\n';

const outputs = new Map([
  ['amplifon-multistep.js', js],
  ['amplifon-multistep.css', css],
  ['amplifon-confirmation.js', confirmation],
  ['manifest.json', manifest]
]);

if (checkOnly) {
  let ok = true;
  for (const [file, expected] of outputs) {
    const p = path.join(outDir, file);
    if (!fs.existsSync(p) || fs.readFileSync(p, 'utf8') !== expected) {
      console.error(`OUTDATED: dist/${version}/${file}`);
      ok = false;
    }
  }
  process.exit(ok ? 0 : 1);
}

fs.mkdirSync(outDir, { recursive: true });
for (const [file, content] of outputs) {
  fs.writeFileSync(path.join(outDir, file), content);
}
console.log(`Built dist/${version}`);
