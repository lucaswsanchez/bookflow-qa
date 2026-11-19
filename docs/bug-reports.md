# Bug reports

Defects found while testing BookFlow on 2026-11-19 (`main` @ `5433f11`, live demo). Each one was reproduced
before it was reported. Each is filed as an issue in the BookFlow repository, using the
[bug report template](../.github/ISSUE_TEMPLATE/bug_report.md): summary, environment, steps, expected and
actual result, severity, priority, evidence and a suggested fix.

## Defects

| ID                                                                 | Title                                                                                              | Severity | Priority | Found by                               | Regression test        | Status              |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------- | -------- | -------------------------------------- | ---------------------- | ------------------- |
| [bookflow#57](https://github.com/lucaswsanchez/bookflow/issues/57) | API returns 500 for impossible calendar dates in `GET /appointments` (also `/appointments/export`) | Minor    | P3       | Exploratory API testing (BVA on dates) | TC-API-10              | Fixed (bookflow#61) |
| [bookflow#58](https://github.com/lucaswsanchez/bookflow/issues/58) | API returns 500 when a service price exceeds the 32-bit integer limit                              | Minor    | P3       | Boundary value analysis                | TC-API-11              | Fixed (bookflow#62) |
| [bookflow#59](https://github.com/lucaswsanchez/bookflow/issues/59) | Client phone and name validation accept values without real content (`------`, `"   "`)            | Minor    | P3       | Equivalence partitioning               | TC-BK-07, TC-API-12    | Fixed (bookflow#63) |
| [bookflow#60](https://github.com/lucaswsanchez/bookflow/issues/60) | Color contrast below WCAG AA on the booking and landing pages                                      | Minor    | P2       | axe-core scan                          | TC-A11Y-01, TC-A11Y-02 | Fixed (bookflow#64) |

**By severity:** Critical 0 · Major 0 · Minor 4 · Trivial 0.

None of them blocks the main journeys: booking, login, roles, status changes and services CRUD all work.
The two 500 errors matter because a 5xx is counted as a server failure in logs and monitoring, and it hides the
real cause from API clients.

### Retest (2026-11-19, BookFlow `main` @ `e34dce2`)

All 4 defects were fixed in BookFlow and retested against the live demo:

| Defect | Fix                                                       | Retest                                                                            |
| ------ | --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| #57    | Dates are validated as real calendar dates                | `2026-02-30` and `2026-13-45` on `/appointments` and `/appointments/export` → 400 |
| #58    | Price has a maximum of 10,000,000 (a realistic ARS limit) | 10,000,000 → 201; 10,000,001 and 2,147,483,648 → 400                              |
| #59    | Phone needs at least 6 digits; name and phone are trimmed | phone `------` and name `"   "` → 400                                             |
| #60    | Darker secondary text and accent tones                    | axe scans of the landing and booking pages: no critical or serious violations     |

### How the defects were handled in the automated suites

While the bugs were open:

- **API defects** (#57, #58) had regression tests marked with `test.fail()` and an `issue` annotation that links
  to the issue. They passed while the bug existed.
- **Accessibility** (#60) was a baseline in `tests/a11y/accessibility.spec.ts`. A new critical or serious violation
  failed the test, and so did a known one that disappeared.

When BookFlow deployed the fixes, the a11y scans failed with "known violations that are now fixed", as designed. The
`test.fail()` marks and the baseline were then removed, and #59 got an automated test (TC-API-12). All of them are
now plain regression tests.

The 6 suggestions below are open in BookFlow as `enhancement` issues: S-01
[#65](https://github.com/lucaswsanchez/bookflow/issues/65), S-02 [#66](https://github.com/lucaswsanchez/bookflow/issues/66),
S-03 [#67](https://github.com/lucaswsanchez/bookflow/issues/67), S-04 [#68](https://github.com/lucaswsanchez/bookflow/issues/68),
S-05 [#69](https://github.com/lucaswsanchez/bookflow/issues/69), S-06 [#70](https://github.com/lucaswsanchez/bookflow/issues/70).

## Suggested improvements (not defects)

These came up in the same sessions. They are not failures against a stated requirement, so they are listed here as
suggestions rather than filed as bugs.

| ID   | Area                   | Observation                                                                                                                                                                                                              | Suggestion                                                                                                                                        |
| ---- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-01 | Accessibility, booking | After choosing a service, professional or time, the chosen button is removed and keyboard focus falls back to `<body>`. Keyboard users can continue with Tab, but screen readers don't announce the new step. (TC-UX-01) | Move focus to the new step heading (`<h2>` with `tabIndex={-1}`) when the step changes.                                                           |
| S-02 | Accessibility, booking | The day picker has 14 tab stops before the first time slot. (TC-UX-01)                                                                                                                                                   | Use a roving `tabindex` with arrow-key navigation, so the picker is a single tab stop.                                                            |
| S-03 | Accessibility, forms   | Error messages have `role="alert"` and inputs get `aria-invalid`, but inputs are not linked to their message with `aria-describedby`. (TC-UX-01)                                                                         | Add `aria-describedby="<field>-error"` while the error is shown (WCAG 1.3.1 / 3.3.1).                                                             |
| S-04 | Security, auth         | Reusing a rotated refresh token is rejected (401), but the newest token of the same chain stays valid. (TC-AU-06)                                                                                                        | Detect reuse and revoke the whole token family, as recommended for refresh token rotation.                                                        |
| S-05 | API, appointments      | `GET /appointments?from=2026-12-10&to=2026-12-01` (from after to) returns `200 []`.                                                                                                                                      | Return 400 so clients notice the swapped range.                                                                                                   |
| S-06 | Testability            | Seeded IDs change on every reseed, and the login rate limit is shared by all visitors of the demo.                                                                                                                       | A dedicated QA environment (or an env flag to relax the limit there) would allow testing the 429 path (TC-AU-07) without affecting real visitors. |
