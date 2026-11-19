# Bug reports

Defects found while testing BookFlow on 2026-11-19 (`main` @ `5433f11`, live demo). Each one was reproduced
before it was reported. Each is filed as an issue in the BookFlow repository, using the
[bug report template](../.github/ISSUE_TEMPLATE/bug_report.md): summary, environment, steps, expected and
actual result, severity, priority, evidence and a suggested fix.

## Defects

| ID                                                                 | Title                                                                                              | Severity | Priority | Found by                               | Regression test                   | Status |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | -------- | -------- | -------------------------------------- | --------------------------------- | ------ |
| [bookflow#57](https://github.com/lucaswsanchez/bookflow/issues/57) | API returns 500 for impossible calendar dates in `GET /appointments` (also `/appointments/export`) | Minor    | P3       | Exploratory API testing (BVA on dates) | TC-API-10 (`test.fail`)           | Open   |
| [bookflow#58](https://github.com/lucaswsanchez/bookflow/issues/58) | API returns 500 when a service price exceeds the 32-bit integer limit                              | Minor    | P3       | Boundary value analysis                | TC-API-11 (`test.fail`)           | Open   |
| [bookflow#59](https://github.com/lucaswsanchez/bookflow/issues/59) | Client phone and name validation accept values without real content (`------`, `"   "`)            | Minor    | P3       | Equivalence partitioning               | TC-BK-07 (manual)                 | Open   |
| [bookflow#60](https://github.com/lucaswsanchez/bookflow/issues/60) | Color contrast below WCAG AA on the booking and landing pages                                      | Minor    | P2       | axe-core scan                          | TC-A11Y-01, TC-A11Y-02 (baseline) | Open   |

**By severity:** Critical 0 · Major 0 · Minor 4 · Trivial 0.

None of them blocks the main journeys: booking, login, roles, status changes and services CRUD all work.
The two 500 errors matter because a 5xx is counted as a server failure in logs and monitoring, and it hides the
real cause from API clients.

### How the known defects are handled in the automated suites

- **API defects** (#57, #58) have regression tests marked with `test.fail()` and an `issue` annotation that links
  to the issue. They pass while the bug exists. Once the bug is fixed they turn red, as a reminder to remove the
  annotation, so the fix is verified automatically.
- **Accessibility** (#60) is a baseline in `tests/a11y/accessibility.spec.ts`. A new critical or serious violation
  fails the test. So does a known one that disappears, so that the baseline is tightened when the issue is closed.

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
