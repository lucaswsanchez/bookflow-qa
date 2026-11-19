import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '../fixtures';

/**
 * Automated WCAG 2.1 A/AA scan with axe-core on the three public pages.
 *
 * Gate: no "critical" or "serious" violations, except the ones in KNOWN, which are already
 * reported as bugs. A known violation that disappears makes the test fail too, as a reminder to
 * close the bug and tighten the baseline. Every result is attached to the HTML report.
 *
 * Automated scans catch only part of accessibility problems: the manual keyboard and screen
 * reader checks are in docs/test-cases.md (TC-UX-*).
 */
const CONTRAST_BUG = 'https://github.com/lucaswsanchez/bookflow/issues/60';

const PAGES = [
  {
    id: 'TC-A11Y-01',
    name: 'landing page',
    path: '/',
    ready: 'cta-book-demo',
    known: { 'color-contrast': CONTRAST_BUG },
  },
  {
    id: 'TC-A11Y-02',
    name: 'booking page',
    path: '/book/barberia-costanera',
    ready: 'service-list',
    known: { 'color-contrast': CONTRAST_BUG },
  },
  { id: 'TC-A11Y-03', name: 'login page', path: '/login', ready: 'login-form', known: {} },
];

for (const { id, name, path, ready, known } of PAGES) {
  test(`${id} ${name} has no new critical or serious WCAG A/AA violations`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.getByTestId(ready)).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    await testInfo.attach('axe-violations.json', {
      body: JSON.stringify(results.violations, null, 2),
      contentType: 'application/json',
    });

    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    for (const [rule, issue] of Object.entries(known))
      testInfo.annotations.push({ type: 'known a11y issue', description: `${rule}: ${issue}` });

    const unexpected = blocking
      .filter((v) => !(v.id in known))
      .map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodes) ${v.helpUrl}`);
    expect(unexpected, 'new critical/serious violations').toEqual([]);

    const stillPresent = blocking.map((v) => v.id);
    expect(
      Object.keys(known).filter((rule) => !stillPresent.includes(rule)),
      'known violations that are now fixed: remove them from the baseline and close the bug',
    ).toEqual([]);
  });
}
