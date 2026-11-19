# Technical decisions

## 1. Playwright + TypeScript with the Page Object Model

Playwright gives Chromium, Firefox and mobile emulation from one runner, with auto-waiting locators, traces and an
HTML report out of the box. It also has a `request` fixture, so the UI and API tests share fixtures, config and
reporting. Page objects (`tests/pages/`) hold the locators and the user actions; specs read as test cases.
Assertions stay in the specs, except for "page is ready" checks.

**Selectors:** `data-testid` (BookFlow ships stable test ids) or accessible roles and labels. There are no CSS or
XPath selectors tied to styling, and no `waitForTimeout` (an ESLint rule turns it into an error). Tests wait for state.

## 2. Session pool instead of logging in per test

Two constraints of the system under test shaped the auth strategy:

- `POST /auth/login` is rate limited to **10 requests per minute per IP**;
- refresh tokens **rotate**: using one revokes it, so a classic `storageState` file is invalid after the first test.

The `setup` project logs in 3 times (2 ADMIN, 1 STAFF) and stores one refresh token per "slot". A browser test
leases a slot through an atomic `mkdir` lock. It refreshes the token, injects it into `localStorage` before the app
loads and, on teardown, writes back the newest token the app stored. API clients share one access token per role
(access tokens are not rotated). A full run makes about 8 logins instead of 30+.

The first CI run exposed a deadlock: each test held a slot and its API fixture waited for a second one. Moving API
clients to the shared access token fixed it, and locks older than 150 s are treated as stale. The fix was
verified with 3 workers and no retries.

## 3. Testing against the live demo, safely

The suites run against the real deployment (Vercel + Render + Supabase), because that is what a recruiter opens.
The demo is shared, so:

- IDs are looked up at runtime;
- QA data is prefixed and booked 2 to 5 weeks ahead;
- every booking is cancelled after its test and QA services are deleted;
- each browser project books with a different professional;
- a `concurrency` group prevents two pipeline runs from overlapping.

No load testing is done against the demo (`k6/smoke.js` refuses to run against `onrender.com`).

## 4. Known defects as executable checks

Reported API defects have tests marked `test.fail()` with a link to the issue. Accessibility uses a baseline of
known violations. Both pass while the defect exists and fail when it changes, so a fix (or a new problem) can't go
unnoticed, and the pipeline stays green for unrelated changes.

## 5. Postman/Newman next to Playwright API tests

They overlap on purpose, but they serve different audiences:

- the Postman collection is what a QA team shares with developers and runs by hand from Postman, and it documents
  the API flow folder by folder;
- the Playwright API tests live with the E2E code and reuse its fixtures (for example the concurrent double-booking
  test).

Newman runs after Playwright in CI, so their logins don't add up against the rate limit.

## 6. Reports on GitHub Pages

The `publish` job builds a small landing page from the JSON results of both runners and deploys it to Pages with
the Playwright HTML report (traces, screenshots and videos of failures) and the Newman htmlextra report. It runs
even when tests fail, because a red report is the one people need to see.
