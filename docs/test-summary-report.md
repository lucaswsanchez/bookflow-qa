# Test summary report: BookFlow

|                        |                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Version under test** | BookFlow `main` @ `5433f11` (live demo: Vercel + Render + Supabase)                                                        |
| **Test period**        | 2026-11-19                                                                                                                 |
| **Reference run**      | GitHub Actions [run 44608303196](https://github.com/lucaswsanchez/bookflow-qa/actions/runs/44608303196) (commit `dcbcf27`) |
| **Latest reports**     | https://lucaswsanchez.github.io/bookflow-qa/ (updated on every push and daily)                                             |
| **Prepared by**        | Lucas Sanchez                                                                                                              |

## 1. Summary

BookFlow's main journeys work as specified on the live demo:

- public booking, including availability rules and double-booking protection;
- login and session handling;
- ADMIN/STAFF permissions;
- appointment status changes;
- services management.

**4 defects** were found and reported, all **Minor**: two API inputs that cause a 500 instead of a 400, weak
validation of client data, and color contrast below WCAG AA on two public pages. None blocks a user journey.

**Recommendation:** the release meets the exit criteria in the [test plan](test-plan.md#6-entry-and-exit-criteria)
(no Critical/Major defects, all High priority cases run). Fix #60 (accessibility, P2) first, then #57–#59.

## 2. Execution results

### Test cases ([test-cases.md](test-cases.md))

| Total | Executed | Pass                 | Fail | Not run |
| ----- | -------- | -------------------- | ---- | ------- |
| 48    | 47 (98%) | 44 (94% of executed) | 3    | 1       |

- **Fail:** TC-AP-06 (#57), TC-SV-04 (#58), TC-BK-07 (#59).
- **Not run:** TC-AU-07 (login rate limit), deliberately. Running it on the shared demo would lock every visitor out
  for a minute. It is covered by BookFlow's own API tests, and a local run is recommended.
- **Pass with known issue:** TC-UX-02 (#60 is in the accessibility baseline). TC-UX-01 passed, with 3
  suggested improvements.

### Automated suites (reference run)

| Suite                                                 | Tests / requests             | Result                                                              | Duration |
| ----------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------- | -------- |
| Playwright: setup (session pool)                      | 1                            | 1 passed                                                            |          |
| Playwright: API (`request` fixture)                   | 11                           | 11 passed (2 of them are `test.fail()` checks tracking #57 and #58) |          |
| Playwright: Chromium (E2E + accessibility)            | 29 (26 E2E + 3 axe scans)    | 29 passed                                                           |          |
| Playwright: Firefox (`@cross-browser`)                | 5                            | 5 passed                                                            |          |
| Playwright: Mobile Chrome, Pixel 7 (`@mobile`)        | 3                            | 3 passed                                                            |          |
| **Playwright total**                                  | **49**                       | **49 passed · 0 failed · 0 flaky**                                  | 94 s     |
| Newman: Postman collection                            | 36 requests · 161 assertions | **161/161 passed**                                                  | 13 s     |
| Full pipeline (warm-up → Playwright → Newman → Pages) |                              | Success                                                             | ~3.5 min |

There are 42 unique automated tests (28 E2E, 3 accessibility, 11 API). Some run in more than one browser project.

### Pipeline history (not hidden)

The **first** run against the live demo ([44605313838](https://github.com/lucaswsanchez/bookflow-qa/actions/runs/44605313838))
failed: 9 tests failed and 3 were flaky, all timing out after 60 s. The cause was in the test framework, not in
BookFlow: a deadlock in the session pool when 3 CI workers ran admin tests at the same time. It was fixed in
[PR #16](https://github.com/lucaswsanchez/bookflow-qa/pull/16), verified locally (44/44 with 3 workers and no
retries) and in CI (reference run above).

## 3. Coverage by feature

| Feature (user story)                 | Cases | Automated                  | Result                       |
| ------------------------------------ | ----- | -------------------------- | ---------------------------- |
| Online booking (US-01)               | 11    | 10                         | ✅ Pass                      |
| Real availability (US-02)            | 6     | 2 + exploratory API checks | ✅ Pass                      |
| Login and session (US-03)            | 6     | 5                          | ✅ Pass (rate limit not run) |
| Roles ADMIN/STAFF (US-04)            | 8     | 8                          | ✅ Pass                      |
| Appointment status (US-05)           | 3     | 3                          | ✅ Pass                      |
| Services (US-06)                     | 3     | 3                          | ✅ Pass                      |
| Filters and CSV export (US-07)       | 2     | 2                          | ✅ Pass                      |
| No double booking (US-08)            | 2     | 2                          | ✅ Pass                      |
| Accessibility and responsive (US-09) | 4     | 3                          | ⚠️ Pass with known issue #60 |
| Validation and errors (US-10)        | 4     | 3                          | ❌ 3 defects (#57, #58, #59) |

The automated suites exercise **23 of the 32 API endpoints (72%)**. `GET /staff` and `POST /auth/logout` are
included; they are called through the UI. Not exercised:

- staff: `GET :id`, `POST`, `PATCH`, `PUT :id/working-hours`, `DELETE` (5);
- clients: `GET :id`, `POST`, `PATCH`, `DELETE` (4). `POST` and `DELETE` were used only during exploration.

UI areas not covered by automation: the agenda views, reports, settings, and the staff and clients screens (see
Roadmap).

## 4. Defects

| Severity | Count | Issues                                                                                                                                                                                                                                                                                                                               |
| -------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Critical | 0     |                                                                                                                                                                                                                                                                                                                                      |
| Major    | 0     |                                                                                                                                                                                                                                                                                                                                      |
| Minor    | 4     | [#57](https://github.com/lucaswsanchez/bookflow/issues/57) 500 on impossible dates · [#58](https://github.com/lucaswsanchez/bookflow/issues/58) 500 on price overflow · [#59](https://github.com/lucaswsanchez/bookflow/issues/59) phone/name validation · [#60](https://github.com/lucaswsanchez/bookflow/issues/60) color contrast |
| Trivial  | 0     |                                                                                                                                                                                                                                                                                                                                      |

By priority: P2 ×1 (#60), P3 ×3. All open at the time of this report. Details and 6 suggested improvements:
[bug-reports.md](bug-reports.md).

## 5. Recommendations

1. **Fix #60** (contrast) and the keyboard/screen reader suggestions S-01 to S-03. These are the most visible
   problems for real users on the public booking page.
2. **Validate real calendar dates and integer limits in the DTOs** (#57, #58). Then add a test that no endpoint
   answers 5xx to malformed input. The Newman collection already checks "never a 5xx" on every request.
3. **Tighten client data validation** in both the API and the web schema (#59), and trim before validating.
4. **Refresh token reuse detection** (S-04): revoke the whole token family when a rotated token is reused.
5. **Next test iteration:** UI tests for the agenda, staff and clients; the rate-limit test against a local or QA
   environment; visual regression for the booking page.

## 6. Environment and data notes

- The API runs on Render's free tier. The pipeline polls `/health` before each suite; the first request after
  idle took up to ~50 s.
- About 8 logins per run (session pool) keep the suite under the 10/min/IP login limit.
- All QA bookings are cancelled after each test and QA services deleted. After the reference run, 0 QA services and
  0 active QA bookings were left in the demo.
