import fs from 'node:fs';
import assert from 'node:assert/strict';

const renderer = fs.readFileSync('src/multistep/04_RENDERER.js', 'utf8');
const lead = fs.readFileSync('src/multistep/07_LEAD_BOOTSTRAP.js', 'utf8');
const css = fs.readFileSync('src/styles/amplifon-multistep.css', 'utf8');
const theme = fs.readFileSync('src/styles/themes/amplifon-multistep.css', 'utf8');
const build = fs.readFileSync('scripts/build.mjs', 'utf8');

assert.equal(fs.existsSync('configs/de365.kostenloser-test.page-config.js'), false);
assert.equal(fs.existsSync('configs/examples/de365.page-config.example.js'), false);

assert.match(renderer, /backEnabled === true/);
assert.match(renderer, /'data-amp-action': 'back'/);
assert.match(renderer, /action === 'back'/);
assert.equal(/\.amp-app\s+\.amp-back\s*\{\s*display:\s*none\s*!important/.test(css), false);
assert.equal(/\.amp-step-top\s*\{\s*display:\s*none\s*!important/.test(theme), false);

assert.equal(lead.includes('Die Seite konnte nicht geladen werden.'), false);
assert.equal(lead.includes('JETZT STARTEN'), false);
assert.match(build, /amplifon-multistep-amplifon\.css/);
assert.equal(build.includes('amplifon-de365.css'), false);

console.log('framework content boundary, Amplifon theme and back navigation checks: OK');
