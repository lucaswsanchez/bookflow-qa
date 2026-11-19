// Builds the GitHub Pages site in _site/: the landing page with the latest totals,
// plus the Playwright HTML report and the Newman htmlextra report.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, '_site');
const readJson = (p) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
  } catch {
    return null;
  }
};

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const [from, to] of [
  ['reports/playwright', 'playwright'],
  ['reports/newman', 'newman'],
]) {
  const src = path.join(root, from);
  if (fs.existsSync(src)) fs.cpSync(src, path.join(out, to), { recursive: true });
}
fs.copyFileSync(path.join(root, 'site', 'favicon.svg'), path.join(out, 'favicon.svg'));

const pw = readJson('reports/playwright-results.json')?.stats;
const nm = readJson('reports/newman/results.json')?.run?.stats;

const pwPassed = pw ? pw.expected + pw.flaky : 0;
const pwTotal = pw ? pw.expected + pw.unexpected + pw.flaky + pw.skipped : 0;
const nmTotal = nm?.assertions.total ?? 0;
const nmPassed = nm ? nm.assertions.total - nm.assertions.failed : 0;

const badge = (ok, warn) =>
  ok === null
    ? ['warn', 'No data']
    : ok
      ? warn
        ? ['warn', 'Passed with flaky tests']
        : ['pass', 'All passing']
      : ['fail', 'Failures'];
const [pwClass, pwLabel] = badge(pw ? pw.unexpected === 0 : null, pw?.flaky > 0);
const [nmClass, nmLabel] = badge(nm ? nm.assertions.failed === 0 : null, false);

const runDate = pw?.startTime ? new Date(pw.startTime) : new Date();
const repo = `https://github.com/${process.env.GITHUB_REPOSITORY ?? 'lucaswsanchez/bookflow-qa'}`;
const runUrl = process.env.GITHUB_RUN_ID
  ? `${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`
  : `${repo}/actions`;

const values = {
  RUN_ISO: runDate.toISOString(),
  RUN_DATE: runDate.toUTCString().replace(' GMT', ' UTC'),
  RUN_URL: runUrl,
  COMMIT: (process.env.GITHUB_SHA ?? 'local').slice(0, 7),
  REPO: repo,
  PW_PASSED: pwPassed,
  PW_TOTAL: pwTotal,
  PW_CLASS: pwClass,
  PW_LABEL: pwLabel,
  PW_DETAIL: pw
    ? `${pw.unexpected} failed · ${pw.flaky} flaky · ${pw.skipped} skipped · ${Math.round(pw.duration / 1000)} s`
    : 'No results in this run',
  NM_REQUESTS: nm?.requests.total ?? 0,
  NM_PASSED: nmPassed,
  NM_TOTAL: nmTotal,
  NM_CLASS: nmClass,
  NM_LABEL: nmLabel,
};

let html = fs.readFileSync(path.join(root, 'site', 'index.html'), 'utf8');
html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k] ?? ''));
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, '.nojekyll'), '');

const summary = `### BookFlow QA results
| Suite | Passed | Total | Status |
|---|---|---|---|
| Playwright (E2E, a11y, API) | ${pwPassed} | ${pwTotal} | ${pwLabel} |
| Newman assertions (${values.NM_REQUESTS} requests) | ${nmPassed} | ${nmTotal} | ${nmLabel} |
`;
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
console.log(summary);
