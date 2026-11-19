# Test plan: BookFlow

|                       |                                                                                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Document**          | Test plan (simplified IEEE 829 / ISO/IEC/IEEE 29119-3)                                                                                                   |
| **Version**           | 1.0 · 2026-11-19                                                                                                                                         |
| **Author**            | Lucas Sanchez                                                                                                                                            |
| **System under test** | [BookFlow](https://github.com/lucaswsanchez/bookflow), `main` @ `5433f11`                                                                                |
| **Test items**        | Web app https://bookflow-phi-ivory.vercel.app · REST API https://bookflow-api-f8qe.onrender.com ([Swagger](https://bookflow-api-f8qe.onrender.com/docs)) |

## 1. Introduction

BookFlow is a booking and appointment management app for small businesses. Clients book online without
an account; the business manages its agenda, services, staff and clients in an admin panel with two
roles (ADMIN and STAFF). This plan describes how the app is tested: what, how, where, with which entry
and exit criteria, and with which risks in mind.

## 2. Feature map

Built from the README, the Swagger docs, the source code and an exploratory session on the live demo.

### 2.1 Web routes

| Route                                         | Access       | Main features                                                                                               |
| --------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------- |
| `/`                                           | Public       | Landing page, links to the booking demo and the one-click admin demo                                        |
| `/book/:slug`                                 | Public       | 4-step booking: service → professional → day and time (14-day picker) → details; confirmation code and .ics |
| `/login`                                      | Public       | Email + password, demo credential shortcuts, `?demo=admin\|staff` one-click login                           |
| `/app`                                        | ADMIN, STAFF | Overview: today/week revenue and appointments, next appointments, occupancy                                 |
| `/app/agenda`                                 | ADMIN, STAFF | Day and week views on a time grid                                                                           |
| `/app/appointments`                           | ADMIN, STAFF | List, search, filters (period, status, professional), detail with status changes, CSV export                |
| `/app/reports`                                | ADMIN        | Revenue, occupancy, cancellations, no-shows                                                                 |
| `/app/services`, `/app/staff`, `/app/clients` | ADMIN        | CRUD screens                                                                                                |
| `/app/settings`                               | ADMIN        | Read-only business settings                                                                                 |

### 2.2 API endpoints (32)

| Module         | Endpoints                                                                                                                            | Auth                            |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| Health         | `GET /health`                                                                                                                        | Public                          |
| Auth           | `POST /auth/login` (10/min/IP), `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`                                            | Public / Bearer                 |
| Public booking | `GET /public/businesses/:slug`, `…/services`, `…/staff`, `…/availability`, `POST …/bookings`, `GET /public/bookings/:code`           | Public                          |
| Appointments   | `GET /appointments`, `GET /appointments/export`, `GET /appointments/:id`, `PATCH /appointments/:id/status`, `GET /dashboard/summary` | ADMIN, STAFF (own agenda)       |
| Services       | `GET`, `GET :id`, `POST`, `PATCH :id`, `DELETE :id`                                                                                  | Read: both roles · write: ADMIN |
| Staff          | `GET`, `GET :id`, `POST`, `PATCH :id`, `PUT :id/working-hours`, `DELETE :id`                                                         | Read: both roles · write: ADMIN |
| Clients        | `GET`, `GET :id`, `POST`, `PATCH :id`, `DELETE :id`                                                                                  | ADMIN                           |

### 2.3 User stories (test basis)

| ID    | User story                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------- |
| US-01 | As a client, I want to book an appointment online without an account, so that I don't have to call.            |
| US-02 | As a client, I want to see only times that are really free, so that my booking is not rejected.                |
| US-03 | As a staff member, I want to log in securely and stay logged in, so that I can manage my day.                  |
| US-04 | As the owner, I want ADMIN and STAFF roles, so that staff only see and change their own agenda.                |
| US-05 | As staff, I want to mark appointments as completed, no-show or cancelled, so that the agenda is accurate.      |
| US-06 | As the owner, I want to manage services (duration and price), so that clients book the right time.             |
| US-07 | As the owner, I want to filter and export appointments, so that I can follow up and report.                    |
| US-08 | As the owner, I want double bookings to be impossible, so that two clients never get the same slot.            |
| US-09 | As any user, I want accessible, responsive pages, so that I can use the app on a phone or with assistive tech. |
| US-10 | As an API consumer, I want consistent validation and error responses, so that clients can handle errors.       |

## 3. Scope

**In scope**

- Functional testing of the booking flow, availability rules, authentication, roles, appointment status, services CRUD and filters.
- Negative and boundary testing of forms and API payloads.
- API contract checks: status codes, JSON schema, the standard error body, 400/401/403/404/409.
- Cross-browser (Chromium, Firefox) and mobile viewport (Pixel 7) checks of the key journeys.
- Basic accessibility: automated WCAG 2.1 A/AA scan on 3 pages, plus a manual keyboard-only session.

**Out of scope**

- Load and stress testing against the live demo. It runs on Render's free tier and is shared by every visitor; [`k6/smoke.js`](../k6/smoke.js) is a small example meant for a local Docker instance only.
- Security testing beyond authorization checks (no penetration testing, no fuzzing).
- Staff and clients CRUD in the UI, reports and agenda views (covered by BookFlow's own unit and API tests; candidates for the next iteration).
- Email/SMS notifications (not implemented in BookFlow).
- The login rate limit on the live demo (it would lock every visitor out for a minute). It is covered by BookFlow's API e2e tests.

## 4. Test approach

| Level / type           | How                                                                                                                      | Tools                                          | Where                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | -------------------------------- |
| Exploratory testing    | Time-boxed sessions on the live demo, guided by the feature map and risk list; findings become test cases or bug reports | Browser, Swagger, scripts                      | Live demo                        |
| System tests, UI (E2E) | Automated, Page Object Model, data-testid and role selectors, isolated test data                                         | Playwright + TypeScript                        | Chromium, Firefox, Mobile Chrome |
| System tests, API      | Automated contract and negative tests                                                                                    | Playwright `request` fixture, Postman + Newman | API                              |
| Accessibility          | axe-core scan (gate: no new critical/serious) + manual keyboard session                                                  | `@axe-core/playwright`                         | Chromium                         |
| Regression             | Full automated suite on every push to `main`, daily and on demand                                                        | GitHub Actions                                 | Live demo                        |
| Manual                 | Cases that are expensive or risky to automate (keyboard-only, rate limit)                                                | Test cases document                            | Live demo / local                |

**Test design techniques.** These are applied explicitly in [test-cases.md](test-cases.md):

- equivalence partitioning (client details, roles);
- boundary value analysis (lengths, duration, 60-day horizon, last slot, price);
- a decision table for slot availability;
- state transitions for the appointment status and the refresh tokens;
- error guessing (race conditions, unknown resources, forged tokens).

**Test data.** The suite runs against a shared public demo, so:

- the IDs of services and staff are looked up in every run, never hard-coded;
- everything the suite creates is prefixed `QA <runId>` or uses the client "QA Automation";
- bookings are made about 2 to 5 weeks ahead and are cancelled after each test, which frees the slot again; QA services are deleted;
- each browser project books with a different professional, so parallel runs never compete for a slot.

**Authentication strategy.** Login is limited to 10 attempts per minute per IP, and refresh tokens rotate
(a used token is revoked). A setup project logs in 3 times (2 ADMIN, 1 STAFF) and stores the tokens in a session
pool. Each test leases a session, refreshes it and returns the newest token afterwards. A full run makes about 8 logins.

## 5. Environments

| Environment                 | Web                      | API                                 | Database                                           | Use                                  |
| --------------------------- | ------------------------ | ----------------------------------- | -------------------------------------------------- | ------------------------------------ |
| Live demo (production-like) | Vercel                   | Render free tier (cold start ~50 s) | Supabase PostgreSQL, reseeded nightly at 06:00 UTC | Exploratory, regression (CI)         |
| Local                       | `pnpm dev` (Vite, :5173) | NestJS (:3000)                      | Local PostgreSQL / Docker                          | Load example (k6), rate-limit checks |

Browsers: Chromium and Firefox (Playwright bundled builds), Mobile Chrome (Pixel 7 emulation). OS: Ubuntu (CI), Windows 11 (local).
Time zone and locale for UI tests: `America/Argentina/Buenos_Aires`, `en-US`.

## 6. Entry and exit criteria

**Entry**

- The build to test is deployed and `GET /health` answers 200 (the CI warm-up step waits up to 3 minutes).
- The demo seed is present: business `barberia-costanera`, the 2 demo users and 3 professionals.
- Lint, format and typecheck of the test code pass (CI workflow).

**Exit**

- 100% of High priority test cases executed.
- No open Critical or Major defects; Minor defects are reported and linked from [bug-reports.md](bug-reports.md).
- Automated suites green, except for tests marked `test.fail()` that track a known, reported defect.
- [Test summary report](test-summary-report.md) updated.

**Suspension / resumption.** Testing is suspended if the API is down for more than 10 minutes or the demo seed is
missing, and resumed after a successful warm-up.

## 7. Risks and mitigations

| #   | Risk                                                    | Impact | Likelihood | Mitigation                                                                           |
| --- | ------------------------------------------------------- | ------ | ---------- | ------------------------------------------------------------------------------------ |
| R1  | Double booking of the same slot                         | High   | Low        | Concurrent booking test (TC-AV-09); availability decision table                      |
| R2  | STAFF can see or change other professionals' data       | High   | Low        | UI and API role tests (TC-RB-*)                                                      |
| R3  | Wrong availability (time zone, duration, working hours) | High   | Medium     | Decision table and boundary tests (TC-AV-*), fixed business time zone in tests       |
| R4  | Render cold start makes tests flaky                     | Medium | High       | Warm-up job, generous timeouts, 1 retry in CI, flaky tests are visible in the report |
| R5  | Login rate limit breaks the suite                       | Medium | Medium     | Session pool (about 8 logins per run), Newman runs after Playwright                  |
| R6  | Tests pollute the public demo seen by recruiters        | Medium | Medium     | QA prefixes, far-future dates, cancellation/deletion in teardown, nightly reseed     |
| R7  | Seed data changes (IDs, names)                          | Low    | Medium     | IDs looked up at runtime; names centralized in tests                                 |
| R8  | Accessibility regressions on public pages               | Medium | Medium     | axe baseline that fails on new violations and on fixed ones                          |

## 8. Deliverables

- This test plan and the [test cases](test-cases.md) (also as [CSV](test-cases.csv)).
- Automated suites: [`tests/`](../tests) (Playwright) and [`postman/`](../postman) (Postman collection + environments).
- Reports on GitHub Pages: https://lucaswsanchez.github.io/bookflow-qa/
- [Bug reports](bug-reports.md) (issues in the BookFlow repository) and the [test summary report](test-summary-report.md).

## 9. Traceability matrix

| User story                   | Test cases                          | Automated           |
| ---------------------------- | ----------------------------------- | ------------------- |
| US-01 Book online            | TC-BK-01, 02, 03, 04, 05a–d, 06, 08 | All                 |
| US-02 Real availability      | TC-AV-01, 02, 05, 06, 07, 08        | TC-AV-01, 07        |
| US-03 Login and session      | TC-AU-01, 02, 03, 04, 06, 07        | All except TC-AU-07 |
| US-04 Roles                  | TC-AU-05, TC-RB-01 to 07            | All                 |
| US-05 Status changes         | TC-AP-01, 02, TC-AV-04              | All                 |
| US-06 Services               | TC-SV-01, 02, 03                    | All                 |
| US-07 Filter and export      | TC-AP-03, 05                        | All                 |
| US-08 No double booking      | TC-AV-03, 09                        | All                 |
| US-09 Accessible, responsive | TC-UX-01, 02, TC-RS-01, 02          | All except TC-UX-01 |
| US-10 Validation and errors  | TC-BK-07, TC-AP-04, 06, TC-SV-04    | All except TC-BK-07 |

## 10. Roles and schedule

One-person QA effort (author) on 2026-11-19: exploration and plan, test design, automation, execution and reporting,
tracked as issues on the [project board](https://github.com/users/lucaswsanchez/projects/5).
After that, the automated regression suite runs every day in GitHub Actions.
