# Test cases

Test cases for **BookFlow** (version on `main` @ `5433f11`, live demo), written for manual execution and
automated where it pays off. IDs match the automated tests (`TC-BK-01 ...` appears in the Playwright test titles),
so a failing test points straight to its case.

**48 test cases** · 41 automated (Playwright and/or Newman) · last execution on 2026-11-19:
**44 pass, 3 fail, 1 not run**. Also available as [CSV](test-cases.csv) to import into
Jira (Xray/Zephyr), TestRail or a spreadsheet.

**Types:** Functional, Negative, Boundary, Usability. **Priority:** High, Medium, Low.

## Test design techniques

### Equivalence partitioning: client details (booking form)

| Field            | Valid classes                  | Invalid classes                                          | Cases                                    |
| ---------------- | ------------------------------ | -------------------------------------------------------- | ---------------------------------------- |
| Name             | 2–80 characters after trimming | empty; 1 character; only spaces; > 80                    | TC-BK-04, TC-BK-05a                      |
| Phone            | 6–20 of `+ 0-9 space ( ) -`    | empty; contains letters; < 6 chars; **no digits at all** | TC-BK-04, TC-BK-05b, TC-BK-05c, TC-BK-07 |
| Email (optional) | empty; valid address           | malformed (`user@`)                                      | TC-BK-04, TC-BK-05d                      |

### Boundary value analysis

| Rule                                             | Below | On the boundary | Above                       | Cases     |
| ------------------------------------------------ | ----- | --------------- | --------------------------- | --------- |
| Name length 2–80                                 | 1 ✗   | 2 ✓             |                             | TC-BK-05a |
| Phone length 6–20                                | 5 ✗   | 6 ✓             |                             | TC-BK-05c |
| Password length ≥ 6 (login)                      | 5 ✗   | 6 ✓             |                             | TC-AU-03  |
| Service duration 5–480 min                       | 4 ✗   | 5 ✓ / 480 ✓     | 481 ✗                       | TC-SV-02  |
| Booking horizon (days ahead)                     |       | 60 ✓            | 61 ✗                        | TC-AV-07  |
| Last slot of a range (Lucía 10:00–18:00, 90 min) |       | 16:30 ✓         | 16:45 ✗                     | TC-AV-02  |
| Service price (32-bit column)                    |       | 2,147,483,647   | 2,147,483,648 → 500 ✗ (bug) | TC-SV-04  |
| Login attempts per minute                        |       | 10 ✓            | 11 → 429                    | TC-AU-07  |

### Decision table: is a time slot offered?

Conditions are evaluated for one professional, one service and one date in the business time zone
(America/Argentina/Buenos_Aires).

| Condition                                     | R1       | R2          | R3          | R4                       | R5                    | R6          | R7       | R8       |
| --------------------------------------------- | -------- | ----------- | ----------- | ------------------------ | --------------------- | ----------- | -------- | -------- |
| Professional offers the service and is active | Y        | Y           | Y           | Y                        | Y                     | Y           | Y        | **N**    |
| Date ≤ today + 60 days                        | Y        | Y           | Y           | Y                        | Y                     | Y           | **N**    | –        |
| Day has working hours                         | Y        | Y           | Y           | Y                        | **N**                 | Y           | –        | –        |
| Start time is in the future                   | Y        | Y           | Y           | Y                        | –                     | **N**       | –        | –        |
| Start + duration ≤ end of the working range   | Y        | **N**       | Y           | Y                        | –                     | –           | –        | –        |
| Overlaps an appointment that is not CANCELLED | N        | –           | **Y**       | N (only a CANCELLED one) | –                     | –           | –        | –        |
| **Result**                                    | Offered  | Not offered | Not offered | Offered                  | No slots (200, empty) | Not offered | 400      | 404      |
| **Case**                                      | TC-AV-01 | TC-AV-02    | TC-AV-03    | TC-AV-04                 | TC-AV-05              | TC-AV-06    | TC-AV-07 | TC-AV-08 |

"–" means the condition does not matter for that rule. Concurrency (two requests for the same free slot) is covered
separately by TC-AV-09.

### State transition: appointment status

`CONFIRMED` is the initial state of every booking. ADMIN (and STAFF on their own agenda) can move it to
`COMPLETED`, `NO_SHOW` or `CANCELLED`; only states other than `CANCELLED` block the slot (TC-AP-01, TC-AP-02, TC-AV-04).

## Summary

| ID                      | Title                                                                      | Story | Type       | Priority | Automation                                                                                             | Last result                                                               |
| ----------------------- | -------------------------------------------------------------------------- | ----- | ---------- | -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [TC-BK-01](#tc-bk-01)   | Client books an appointment end to end                                     | US-01 | Functional | High     | Playwright `tests/e2e/booking.spec.ts` (Chromium, Firefox, Mobile Chrome)                              | Pass                                                                      |
| [TC-BK-02](#tc-bk-02)   | Professionals are filtered by the chosen service                           | US-01 | Functional | Medium   | Playwright `tests/e2e/booking.spec.ts`                                                                 | Pass                                                                      |
| [TC-BK-03](#tc-bk-03)   | Back button returns to the previous step                                   | US-01 | Usability  | Low      | Playwright `tests/e2e/booking.spec.ts`                                                                 | Pass                                                                      |
| [TC-BK-04](#tc-bk-04)   | Required client fields are validated                                       | US-01 | Negative   | High     | Playwright `tests/e2e/booking.spec.ts`                                                                 | Pass                                                                      |
| [TC-BK-05a](#tc-bk-05a) | Name shorter than 2 characters is rejected                                 | US-01 | Boundary   | Medium   | Playwright `tests/e2e/booking.spec.ts`                                                                 | Pass                                                                      |
| [TC-BK-05b](#tc-bk-05b) | Phone with letters is rejected                                             | US-01 | Negative   | Medium   | Playwright `tests/e2e/booking.spec.ts`                                                                 | Pass                                                                      |
| [TC-BK-05c](#tc-bk-05c) | Phone shorter than 6 characters is rejected                                | US-01 | Boundary   | Medium   | Playwright `tests/e2e/booking.spec.ts`                                                                 | Pass                                                                      |
| [TC-BK-05d](#tc-bk-05d) | Malformed email is rejected                                                | US-01 | Negative   | Medium   | Playwright `tests/e2e/booking.spec.ts`                                                                 | Pass                                                                      |
| [TC-BK-06](#tc-bk-06)   | Unknown business shows an error state                                      | US-01 | Negative   | Low      | Playwright `tests/e2e/booking.spec.ts`                                                                 | Pass                                                                      |
| [TC-BK-07](#tc-bk-07)   | Phone made only of symbols is rejected                                     | US-10 | Negative   | Medium   | Exploratory API session (2026-11-19)                                                                   | Fail: lucaswsanchez/bookflow#59                                           |
| [TC-BK-08](#tc-bk-08)   | Booking can be looked up by its code without exposing contact data         | US-01 | Functional | Medium   | Newman: "Look up the booking by code"                                                                  | Pass                                                                      |
| [TC-AV-01](#tc-av-01)   | Decision table R1: free slot inside working hours is offered               | US-02 | Functional | High     | Newman: "Get availability 30 days ahead"; exploratory API session                                      | Pass                                                                      |
| [TC-AV-02](#tc-av-02)   | Decision table R2: service must end before the range ends                  | US-02 | Boundary   | High     | Exploratory API session (2026-11-19)                                                                   | Pass                                                                      |
| [TC-AV-03](#tc-av-03)   | Decision table R3: overlapping a non-cancelled appointment is not offered  | US-08 | Functional | High     | Playwright `tests/e2e/appointments.spec.ts` (TC-AP-02, first assertion)                                | Pass                                                                      |
| [TC-AV-04](#tc-av-04)   | Decision table R4: a cancelled appointment frees the slot                  | US-05 | Functional | High     | Playwright `tests/e2e/appointments.spec.ts`; Newman: "Cancelled slot is offered again"                 | Pass                                                                      |
| [TC-AV-05](#tc-av-05)   | Decision table R5: day without working hours has no slots                  | US-02 | Functional | Medium   | Exploratory API session (2026-11-19)                                                                   | Pass                                                                      |
| [TC-AV-06](#tc-av-06)   | Decision table R6: past times and past dates are not offered               | US-02 | Boundary   | High     | Exploratory API session (2026-11-19)                                                                   | Pass                                                                      |
| [TC-AV-07](#tc-av-07)   | Decision table R7: booking horizon is 60 days                              | US-02 | Boundary   | High     | Playwright `tests/api/booking.api.spec.ts`; Newman: "Get availability beyond the 60-day horizon (400)" | Pass                                                                      |
| [TC-AV-08](#tc-av-08)   | Decision table R8: professional who does not offer the service             | US-02 | Negative   | Medium   | Exploratory API session (2026-11-19)                                                                   | Pass                                                                      |
| [TC-AV-09](#tc-av-09)   | Two concurrent bookings for the same slot                                  | US-08 | Functional | High     | Playwright `tests/api/booking.api.spec.ts`; Newman: "Book the same slot again (409)"                   | Pass                                                                      |
| [TC-AU-01](#tc-au-01)   | Admin logs in with valid credentials                                       | US-03 | Functional | High     | Playwright `tests/e2e/auth.spec.ts`                                                                    | Pass                                                                      |
| [TC-AU-02](#tc-au-02)   | Wrong password is rejected                                                 | US-03 | Negative   | High     | Playwright `tests/e2e/auth.spec.ts`; Playwright `tests/api/auth-and-roles.api.spec.ts`                 | Pass                                                                      |
| [TC-AU-03](#tc-au-03)   | Invalid email format and short password are caught on the client           | US-03 | Boundary   | Medium   | Playwright `tests/e2e/auth.spec.ts`                                                                    | Pass                                                                      |
| [TC-AU-04](#tc-au-04)   | Staff logs in and logs out                                                 | US-03 | Functional | High     | Playwright `tests/e2e/auth.spec.ts`                                                                    | Pass                                                                      |
| [TC-AU-05](#tc-au-05)   | Anonymous access to the panel redirects to login                           | US-04 | Negative   | High     | Playwright `tests/e2e/auth.spec.ts`                                                                    | Pass                                                                      |
| [TC-AU-06](#tc-au-06)   | Used refresh tokens cannot be reused (rotation)                            | US-03 | Functional | High     | Playwright `tests/api/auth-and-roles.api.spec.ts`; Newman: "Reuse a rotated refresh token (401)"       | Pass                                                                      |
| [TC-AU-07](#tc-au-07)   | Login is rate limited after 10 attempts per minute                         | US-03 | Negative   | Medium   | Manual only (local environment)                                                                        | Not run: would lock the shared demo login for every visitor for a minute  |
| [TC-RB-01](#tc-rb-01)   | Admin sees every section                                                   | US-04 | Functional | High     | Playwright `tests/e2e/permissions.spec.ts` (Chromium, Firefox)                                         | Pass                                                                      |
| [TC-RB-02](#tc-rb-02)   | Admin can filter appointments by professional                              | US-04 | Functional | Medium   | Playwright `tests/e2e/permissions.spec.ts`                                                             | Pass                                                                      |
| [TC-RB-03](#tc-rb-03)   | Staff only sees shared sections                                            | US-04 | Functional | High     | Playwright `tests/e2e/permissions.spec.ts` (Chromium, Firefox)                                         | Pass                                                                      |
| [TC-RB-04](#tc-rb-04)   | Staff opening an admin URL is redirected                                   | US-04 | Negative   | High     | Playwright `tests/e2e/permissions.spec.ts`                                                             | Pass                                                                      |
| [TC-RB-05](#tc-rb-05)   | Staff only sees their own appointments                                     | US-04 | Functional | High     | Playwright `tests/e2e/permissions.spec.ts`                                                             | Pass                                                                      |
| [TC-RB-06](#tc-rb-06)   | Staff cannot read or change another professional's appointment via the API | US-04 | Negative   | High     | Playwright `tests/api/auth-and-roles.api.spec.ts`; Newman                                              | Pass                                                                      |
| [TC-RB-07](#tc-rb-07)   | Staff gets 403 on admin-only endpoints                                     | US-04 | Negative   | High     | Playwright `tests/api/auth-and-roles.api.spec.ts`; Newman                                              | Pass                                                                      |
| [TC-AP-01](#tc-ap-01)   | Admin marks an appointment as completed                                    | US-05 | Functional | High     | Playwright `tests/e2e/appointments.spec.ts` (Chromium, Firefox)                                        | Pass                                                                      |
| [TC-AP-02](#tc-ap-02)   | Cancelling frees the slot                                                  | US-05 | Functional | High     | Playwright `tests/e2e/appointments.spec.ts`                                                            | Pass                                                                      |
| [TC-AP-03](#tc-ap-03)   | Status filter lists only that status                                       | US-07 | Functional | Medium   | Playwright `tests/e2e/appointments.spec.ts`                                                            | Pass                                                                      |
| [TC-AP-04](#tc-ap-04)   | Invalid status value is rejected                                           | US-10 | Negative   | Medium   | Newman: "Update status with an invalid value (400)"                                                    | Pass                                                                      |
| [TC-AP-05](#tc-ap-05)   | Appointments CSV export                                                    | US-07 | Functional | Medium   | Newman: "Export appointments as CSV"                                                                   | Pass                                                                      |
| [TC-AP-06](#tc-ap-06)   | Impossible calendar dates are rejected                                     | US-10 | Negative   | Medium   | Playwright `tests/api/booking.api.spec.ts` (test.fail)                                                 | Fail: lucaswsanchez/bookflow#57 (returns 500)                             |
| [TC-SV-01](#tc-sv-01)   | Admin creates, edits and deletes a service                                 | US-06 | Functional | High     | Playwright `tests/e2e/services.spec.ts` (Chromium, Firefox); Newman                                    | Pass                                                                      |
| [TC-SV-02](#tc-sv-02)   | Duration outside 5–480 minutes is rejected                                 | US-06 | Boundary   | High     | Playwright `tests/e2e/services.spec.ts`; Newman (4 min via API)                                        | Pass                                                                      |
| [TC-SV-03](#tc-sv-03)   | Empty name and negative price are rejected                                 | US-06 | Negative   | Medium   | Playwright `tests/e2e/services.spec.ts`                                                                | Pass                                                                      |
| [TC-SV-04](#tc-sv-04)   | Price above the 32-bit integer limit is rejected                           | US-10 | Boundary   | Low      | Playwright `tests/api/booking.api.spec.ts` (test.fail)                                                 | Fail: lucaswsanchez/bookflow#58 (returns 500)                             |
| [TC-UX-01](#tc-ux-01)   | Booking flow can be completed with the keyboard only                       | US-09 | Usability  | High     | Manual, built-in browser (2026-11-19)                                                                  | Pass with observations (see bug-reports.md, suggestions S-01, S-02, S-03) |
| [TC-UX-02](#tc-ux-02)   | Public pages have no new critical/serious WCAG A/AA violations             | US-09 | Usability  | High     | Playwright `tests/a11y/accessibility.spec.ts`                                                          | Pass with known issue lucaswsanchez/bookflow#60 (color contrast)          |
| [TC-RS-01](#tc-rs-01)   | Booking page on a phone                                                    | US-09 | Usability  | Medium   | Playwright `tests/e2e/responsive.spec.ts` (Mobile Chrome)                                              | Pass                                                                      |
| [TC-RS-02](#tc-rs-02)   | Admin navigation on a phone                                                | US-09 | Usability  | Medium   | Playwright `tests/e2e/responsive.spec.ts` (Mobile Chrome)                                              | Pass                                                                      |

## Cases

### Booking (BK)

#### TC-BK-01

**Client books an appointment end to end**

| Story | Type       | Technique | Priority |
| ----- | ---------- | --------- | -------- |
| US-01 | Functional | Use case  | High     |

- **Preconditions:** Booking page /book/barberia-costanera is reachable. API warm.
- **Steps:**
  1. Choose "Classic Haircut"
  2. Choose a professional
  3. Choose a day with free times and the first time
  4. Enter name, phone and email
  5. Click "Confirm booking"
- **Expected result:** Confirmation screen with a code in the format BF-XXXXXX and an "Add to calendar" button.
- **Automation:** Playwright `tests/e2e/booking.spec.ts` (Chromium, Firefox, Mobile Chrome)
- **Last result (2026-11-19):** Pass

#### TC-BK-02

**Professionals are filtered by the chosen service**

| Story | Type       | Technique                | Priority |
| ----- | ---------- | ------------------------ | -------- |
| US-01 | Functional | Equivalence partitioning | Medium   |

- **Preconditions:** Seed data: Hair Coloring is offered only by Lucía Benítez.
- **Steps:**
  1. Choose "Hair Coloring"
- **Expected result:** Only Lucía Benítez is listed; Martín and Diego are not.
- **Automation:** Playwright `tests/e2e/booking.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-BK-03

**Back button returns to the previous step**

| Story | Type      | Technique | Priority |
| ----- | --------- | --------- | -------- |
| US-01 | Usability | Use case  | Low      |

- **Preconditions:** Booking page open.
- **Steps:**
  1. Choose a service and a professional
  2. Click "Go back" twice
- **Expected result:** The professional step and then the service step are shown again.
- **Automation:** Playwright `tests/e2e/booking.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-BK-04

**Required client fields are validated**

| Story | Type     | Technique                | Priority |
| ----- | -------- | ------------------------ | -------- |
| US-01 | Negative | Equivalence partitioning | High     |

- **Preconditions:** Details step reached (service, professional and time chosen).
- **Steps:**
  1. Leave all fields empty
  2. Click "Confirm booking"
- **Expected result:** Errors under Name and Phone; Email (optional) has no error; inputs get aria-invalid; no booking request is sent.
- **Automation:** Playwright `tests/e2e/booking.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-BK-05a

**Name shorter than 2 characters is rejected**

| Story | Type     | Technique               | Priority |
| ----- | -------- | ----------------------- | -------- |
| US-01 | Boundary | Boundary value analysis | Medium   |

- **Preconditions:** Details step reached.
- **Steps:**
  1. Name "A" (1 char), valid phone
  2. Submit
- **Expected result:** "Please enter your full name". Boundary: 1 char invalid, 2 chars valid (lower bound of 2–80).
- **Automation:** Playwright `tests/e2e/booking.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-BK-05b

**Phone with letters is rejected**

| Story | Type     | Technique                | Priority |
| ----- | -------- | ------------------------ | -------- |
| US-01 | Negative | Equivalence partitioning | Medium   |

- **Preconditions:** Details step reached.
- **Steps:**
  1. Phone "379-ABC-123"
  2. Submit
- **Expected result:** "Please enter a valid phone number".
- **Automation:** Playwright `tests/e2e/booking.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-BK-05c

**Phone shorter than 6 characters is rejected**

| Story | Type     | Technique               | Priority |
| ----- | -------- | ----------------------- | -------- |
| US-01 | Boundary | Boundary value analysis | Medium   |

- **Preconditions:** Details step reached.
- **Steps:**
  1. Phone "12345" (5 chars)
  2. Submit
- **Expected result:** "Please enter a valid phone number" (valid length is 6–20).
- **Automation:** Playwright `tests/e2e/booking.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-BK-05d

**Malformed email is rejected**

| Story | Type     | Technique                | Priority |
| ----- | -------- | ------------------------ | -------- |
| US-01 | Negative | Equivalence partitioning | Medium   |

- **Preconditions:** Details step reached.
- **Steps:**
  1. Email "qa.automation@"
  2. Submit
- **Expected result:** "Please enter a valid email".
- **Automation:** Playwright `tests/e2e/booking.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-BK-06

**Unknown business shows an error state**

| Story | Type     | Technique      | Priority |
| ----- | -------- | -------------- | -------- |
| US-01 | Negative | Error guessing | Low      |

- **Preconditions:** None.
- **Steps:**
  1. Open /book/this-business-does-not-exist
- **Expected result:** Error state "This business does not exist." with a retry button.
- **Automation:** Playwright `tests/e2e/booking.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-BK-07

**Phone made only of symbols is rejected**

| Story | Type     | Technique                | Priority |
| ----- | -------- | ------------------------ | -------- |
| US-10 | Negative | Equivalence partitioning | Medium   |

- **Preconditions:** Admin access token.
- **Steps:**
  1. POST /clients with phone "------"
- **Expected result:** 400 Bad Request: a phone needs digits.
- **Automation:** Exploratory API session (2026-11-19)
- **Last result (2026-11-19):** Fail: lucaswsanchez/bookflow#59

#### TC-BK-08

**Booking can be looked up by its code without exposing contact data**

| Story | Type       | Technique | Priority |
| ----- | ---------- | --------- | -------- |
| US-01 | Functional | Use case  | Medium   |

- **Preconditions:** A booking exists.
- **Steps:**
  1. GET /public/bookings/{code}
- **Expected result:** 200 with service, professional and time; no client phone or email in the body.
- **Automation:** Newman: "Look up the booking by code"
- **Last result (2026-11-19):** Pass

### Availability, decision table (AV)

#### TC-AV-01

**Decision table R1: free slot inside working hours is offered**

| Story | Type       | Technique      | Priority |
| ----- | ---------- | -------------- | -------- |
| US-02 | Functional | Decision table | High     |

- **Preconditions:** Weekday with free time for Martín (09:00–13:00, 16:00–20:00).
- **Steps:**
  1. GET availability for Classic Haircut (30 min), Martín, that day
- **Expected result:** Slots start inside the working ranges, every 15 minutes.
- **Automation:** Newman: "Get availability 30 days ahead"; exploratory API session
- **Last result (2026-11-19):** Pass

#### TC-AV-02

**Decision table R2: service must end before the range ends**

| Story | Type     | Technique            | Priority |
| ----- | -------- | -------------------- | -------- |
| US-02 | Boundary | Decision table + BVA | High     |

- **Preconditions:** Lucía works 10:00–18:00 on weekdays.
- **Steps:**
  1. GET availability for Hair Coloring (90 min) with Lucía
- **Expected result:** Last slot is 16:30 (16:30 + 90 min = 18:00); 16:45 is not offered.
- **Automation:** Exploratory API session (2026-11-19)
- **Last result (2026-11-19):** Pass

#### TC-AV-03

**Decision table R3: overlapping a non-cancelled appointment is not offered**

| Story | Type       | Technique      | Priority |
| ----- | ---------- | -------------- | -------- |
| US-08 | Functional | Decision table | High     |

- **Preconditions:** An appointment exists for the slot.
- **Steps:**
  1. Book a slot
  2. GET availability for the same day
- **Expected result:** The booked start time is no longer listed.
- **Automation:** Playwright `tests/e2e/appointments.spec.ts` (TC-AP-02, first assertion)
- **Last result (2026-11-19):** Pass

#### TC-AV-04

**Decision table R4: a cancelled appointment frees the slot**

| Story | Type       | Technique      | Priority |
| ----- | ---------- | -------------- | -------- |
| US-05 | Functional | Decision table | High     |

- **Preconditions:** A booked slot.
- **Steps:**
  1. Cancel the appointment
  2. GET availability again
- **Expected result:** The start time is offered again.
- **Automation:** Playwright `tests/e2e/appointments.spec.ts`; Newman: "Cancelled slot is offered again"
- **Last result (2026-11-19):** Pass

#### TC-AV-05

**Decision table R5: day without working hours has no slots**

| Story | Type       | Technique      | Priority |
| ----- | ---------- | -------------- | -------- |
| US-02 | Functional | Decision table | Medium   |

- **Preconditions:** Martín does not work on Sundays.
- **Steps:**
  1. GET availability for Martín on a Sunday
- **Expected result:** 200 with an empty slot list.
- **Automation:** Exploratory API session (2026-11-19)
- **Last result (2026-11-19):** Pass

#### TC-AV-06

**Decision table R6: past times and past dates are not offered**

| Story | Type     | Technique      | Priority |
| ----- | -------- | -------------- | -------- |
| US-02 | Boundary | Decision table | High     |

- **Preconditions:** Today, after opening time.
- **Steps:**
  1. GET availability for today
  2. GET availability for 2020-01-01
- **Expected result:** Today only lists times after "now" (business time zone); a past date returns no slots.
- **Automation:** Exploratory API session (2026-11-19)
- **Last result (2026-11-19):** Pass

#### TC-AV-07

**Decision table R7: booking horizon is 60 days**

| Story | Type     | Technique               | Priority |
| ----- | -------- | ----------------------- | -------- |
| US-02 | Boundary | Boundary value analysis | High     |

- **Preconditions:** None.
- **Steps:**
  1. GET availability for today + 60
  2. GET availability for today + 61
- **Expected result:** Day 60: 200. Day 61: 400 "Bookings can be made up to 60 days in advance".
- **Automation:** Playwright `tests/api/booking.api.spec.ts`; Newman: "Get availability beyond the 60-day horizon (400)"
- **Last result (2026-11-19):** Pass

#### TC-AV-08

**Decision table R8: professional who does not offer the service**

| Story | Type     | Technique      | Priority |
| ----- | -------- | -------------- | -------- |
| US-02 | Negative | Decision table | Medium   |

- **Preconditions:** Martín does not offer Hair Coloring.
- **Steps:**
  1. GET availability for Hair Coloring with Martín
- **Expected result:** 404 "Staff member not found or does not offer this service".
- **Automation:** Exploratory API session (2026-11-19)
- **Last result (2026-11-19):** Pass

#### TC-AV-09

**Two concurrent bookings for the same slot**

| Story | Type       | Technique                       | Priority |
| ----- | ---------- | ------------------------------- | -------- |
| US-08 | Functional | Error guessing (race condition) | High     |

- **Preconditions:** A free slot.
- **Steps:**
  1. Send two identical POST /bookings at the same time
- **Expected result:** Exactly one 201 and one 409 "The selected time slot is no longer available".
- **Automation:** Playwright `tests/api/booking.api.spec.ts`; Newman: "Book the same slot again (409)"
- **Last result (2026-11-19):** Pass

### Authentication (AU)

#### TC-AU-01

**Admin logs in with valid credentials**

| Story | Type       | Technique                | Priority |
| ----- | ---------- | ------------------------ | -------- |
| US-03 | Functional | Equivalence partitioning | High     |

- **Preconditions:** Logged out.
- **Steps:**
  1. Open /login
  2. Enter admin@demo.com / Admin123!
  3. Click "Sign in"
- **Expected result:** Redirect to /app; sidebar shows "Admin Demo" and the ADMIN role.
- **Automation:** Playwright `tests/e2e/auth.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-AU-02

**Wrong password is rejected**

| Story | Type     | Technique                | Priority |
| ----- | -------- | ------------------------ | -------- |
| US-03 | Negative | Equivalence partitioning | High     |

- **Preconditions:** Logged out.
- **Steps:**
  1. Log in with a wrong password
- **Expected result:** Generic error "Invalid email or password"; user stays on /login.
- **Automation:** Playwright `tests/e2e/auth.spec.ts`; Playwright `tests/api/auth-and-roles.api.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-AU-03

**Invalid email format and short password are caught on the client**

| Story | Type     | Technique            | Priority |
| ----- | -------- | -------------------- | -------- |
| US-03 | Boundary | BVA (password min 6) | Medium   |

- **Preconditions:** Logged out.
- **Steps:**
  1. Email "admin@", password "12345" (5 chars)
  2. Submit
- **Expected result:** Field errors for both fields; no request is sent to /auth/login.
- **Automation:** Playwright `tests/e2e/auth.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-AU-04

**Staff logs in and logs out**

| Story | Type       | Technique | Priority |
| ----- | ---------- | --------- | -------- |
| US-03 | Functional | Use case  | High     |

- **Preconditions:** Logged out.
- **Steps:**
  1. Log in as staff@demo.com
  2. Click "Log out"
  3. Open /app
- **Expected result:** STAFF role shown; after logout /app redirects to /login.
- **Automation:** Playwright `tests/e2e/auth.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-AU-05

**Anonymous access to the panel redirects to login**

| Story | Type     | Technique      | Priority |
| ----- | -------- | -------------- | -------- |
| US-04 | Negative | Error guessing | High     |

- **Preconditions:** Logged out.
- **Steps:**
  1. Open /app/appointments
- **Expected result:** Redirect to /login.
- **Automation:** Playwright `tests/e2e/auth.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-AU-06

**Used refresh tokens cannot be reused (rotation)**

| Story | Type       | Technique        | Priority |
| ----- | ---------- | ---------------- | -------- |
| US-03 | Functional | State transition | High     |

- **Preconditions:** A valid refresh token.
- **Steps:**
  1. POST /auth/refresh with token A
  2. POST /auth/refresh with token A again
- **Expected result:** First call: 200 with a new token B. Second call: 401 "Invalid refresh token".
- **Automation:** Playwright `tests/api/auth-and-roles.api.spec.ts`; Newman: "Reuse a rotated refresh token (401)"
- **Last result (2026-11-19):** Pass

#### TC-AU-07

**Login is rate limited after 10 attempts per minute**

| Story | Type     | Technique               | Priority |
| ----- | -------- | ----------------------- | -------- |
| US-03 | Negative | Boundary value analysis | Medium   |

- **Preconditions:** Logged out.
- **Steps:**
  1. Send 11 login requests within one minute from the same IP
- **Expected result:** The 11th returns 429 and the UI shows "Too many attempts. Please wait a minute and try again."
- **Automation:** Manual only (local environment)
- **Last result (2026-11-19):** Not run: would lock the shared demo login for every visitor for a minute

### Roles and permissions (RB)

#### TC-RB-01

**Admin sees every section**

| Story | Type       | Technique                       | Priority |
| ----- | ---------- | ------------------------------- | -------- |
| US-04 | Functional | Decision table (role × section) | High     |

- **Preconditions:** Logged in as ADMIN.
- **Steps:**
  1. Open the sidebar
- **Expected result:** Overview, Agenda, Appointments, Reports, Services, Staff, Clients and Settings are visible.
- **Automation:** Playwright `tests/e2e/permissions.spec.ts` (Chromium, Firefox)
- **Last result (2026-11-19):** Pass

#### TC-RB-02

**Admin can filter appointments by professional**

| Story | Type       | Technique | Priority |
| ----- | ---------- | --------- | -------- |
| US-04 | Functional | Use case  | Medium   |

- **Preconditions:** Logged in as ADMIN.
- **Steps:**
  1. Open Appointments
- **Expected result:** Professional filter with "All professionals" + 3 staff.
- **Automation:** Playwright `tests/e2e/permissions.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-RB-03

**Staff only sees shared sections**

| Story | Type       | Technique                       | Priority |
| ----- | ---------- | ------------------------------- | -------- |
| US-04 | Functional | Decision table (role × section) | High     |

- **Preconditions:** Logged in as STAFF.
- **Steps:**
  1. Open the sidebar
- **Expected result:** Overview, Agenda and Appointments only; no admin sections.
- **Automation:** Playwright `tests/e2e/permissions.spec.ts` (Chromium, Firefox)
- **Last result (2026-11-19):** Pass

#### TC-RB-04

**Staff opening an admin URL is redirected**

| Story | Type     | Technique      | Priority |
| ----- | -------- | -------------- | -------- |
| US-04 | Negative | Error guessing | High     |

- **Preconditions:** Logged in as STAFF.
- **Steps:**
  1. Open /app/services, /app/reports and /app/clients
- **Expected result:** Each one redirects to /app.
- **Automation:** Playwright `tests/e2e/permissions.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-RB-05

**Staff only sees their own appointments**

| Story | Type       | Technique                | Priority |
| ----- | ---------- | ------------------------ | -------- |
| US-04 | Functional | Equivalence partitioning | High     |

- **Preconditions:** One appointment for the logged-in staff member and one for another professional.
- **Steps:**
  1. Open Appointments as STAFF
  2. Search each booking code
- **Expected result:** Own booking is listed; the other professional's booking is not; no professional filter.
- **Automation:** Playwright `tests/e2e/permissions.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-RB-06

**Staff cannot read or change another professional's appointment via the API**

| Story | Type     | Technique      | Priority |
| ----- | -------- | -------------- | -------- |
| US-04 | Negative | Error guessing | High     |

- **Preconditions:** STAFF access token.
- **Steps:**
  1. GET and PATCH another professional's appointment
  2. GET /appointments?staffId=<other>
- **Expected result:** 404 on GET/PATCH (no data leak); the staffId filter is ignored.
- **Automation:** Playwright `tests/api/auth-and-roles.api.spec.ts`; Newman
- **Last result (2026-11-19):** Pass

#### TC-RB-07

**Staff gets 403 on admin-only endpoints**

| Story | Type     | Technique                | Priority |
| ----- | -------- | ------------------------ | -------- |
| US-04 | Negative | Equivalence partitioning | High     |

- **Preconditions:** STAFF access token.
- **Steps:**
  1. POST /services
  2. GET /clients
- **Expected result:** 403 with the standard error body.
- **Automation:** Playwright `tests/api/auth-and-roles.api.spec.ts`; Newman
- **Last result (2026-11-19):** Pass

### Appointments (AP)

#### TC-AP-01

**Admin marks an appointment as completed**

| Story | Type       | Technique        | Priority |
| ----- | ---------- | ---------------- | -------- |
| US-05 | Functional | State transition | High     |

- **Preconditions:** A CONFIRMED appointment.
- **Steps:**
  1. Open Appointments, custom range, search the code
  2. Open the appointment
  3. Click "Completed"
- **Expected result:** Completed is the current status, a toast is shown and the API returns COMPLETED.
- **Automation:** Playwright `tests/e2e/appointments.spec.ts` (Chromium, Firefox)
- **Last result (2026-11-19):** Pass

#### TC-AP-02

**Cancelling frees the slot**

| Story | Type       | Technique        | Priority |
| ----- | ---------- | ---------------- | -------- |
| US-05 | Functional | State transition | High     |

- **Preconditions:** A CONFIRMED appointment.
- **Steps:**
  1. Set status to Cancelled
- **Expected result:** The slot is offered again in the public availability.
- **Automation:** Playwright `tests/e2e/appointments.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-AP-03

**Status filter lists only that status**

| Story | Type       | Technique                | Priority |
| ----- | ---------- | ------------------------ | -------- |
| US-07 | Functional | Equivalence partitioning | Medium   |

- **Preconditions:** Logged in as ADMIN.
- **Steps:**
  1. Period "This week"
  2. Status "Completed"
- **Expected result:** Every row has status COMPLETED.
- **Automation:** Playwright `tests/e2e/appointments.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-AP-04

**Invalid status value is rejected**

| Story | Type     | Technique                | Priority |
| ----- | -------- | ------------------------ | -------- |
| US-10 | Negative | Equivalence partitioning | Medium   |

- **Preconditions:** Admin token.
- **Steps:**
  1. PATCH /appointments/{id}/status with "DONE"
- **Expected result:** 400 listing CONFIRMED, COMPLETED, CANCELLED, NO_SHOW.
- **Automation:** Newman: "Update status with an invalid value (400)"
- **Last result (2026-11-19):** Pass

#### TC-AP-05

**Appointments CSV export**

| Story | Type       | Technique | Priority |
| ----- | ---------- | --------- | -------- |
| US-07 | Functional | Use case  | Medium   |

- **Preconditions:** Admin token.
- **Steps:**
  1. GET /appointments/export for a date
- **Expected result:** 200, Content-Type text/csv and a header row.
- **Automation:** Newman: "Export appointments as CSV"
- **Last result (2026-11-19):** Pass

#### TC-AP-06

**Impossible calendar dates are rejected**

| Story | Type     | Technique               | Priority |
| ----- | -------- | ----------------------- | -------- |
| US-10 | Negative | Boundary value analysis | Medium   |

- **Preconditions:** Admin token.
- **Steps:**
  1. GET /appointments?from=2026-02-30
  2. GET /appointments?from=2026-13-45
- **Expected result:** 400 Bad Request.
- **Automation:** Playwright `tests/api/booking.api.spec.ts` (test.fail)
- **Last result (2026-11-19):** Fail: lucaswsanchez/bookflow#57 (returns 500)

### Services (SV)

#### TC-SV-01

**Admin creates, edits and deletes a service**

| Story | Type       | Technique       | Priority |
| ----- | ---------- | --------------- | -------- |
| US-06 | Functional | Use case (CRUD) | High     |

- **Preconditions:** Logged in as ADMIN.
- **Steps:**
  1. New service: name, 45 min, ARS 12,000, not bookable online
  2. Edit price to 15,500
  3. Delete and confirm
- **Expected result:** Row appears with 45 min and $ 12.000, then $ 15.500, then disappears.
- **Automation:** Playwright `tests/e2e/services.spec.ts` (Chromium, Firefox); Newman
- **Last result (2026-11-19):** Pass

#### TC-SV-02

**Duration outside 5–480 minutes is rejected**

| Story | Type     | Technique               | Priority |
| ----- | -------- | ----------------------- | -------- |
| US-06 | Boundary | Boundary value analysis | High     |

- **Preconditions:** New service form open.
- **Steps:**
  1. Duration 4
  2. Duration 481
- **Expected result:** "At least 5 minutes" / "At most 8 hours"; the form stays open.
- **Automation:** Playwright `tests/e2e/services.spec.ts`; Newman (4 min via API)
- **Last result (2026-11-19):** Pass

#### TC-SV-03

**Empty name and negative price are rejected**

| Story | Type     | Technique                | Priority |
| ----- | -------- | ------------------------ | -------- |
| US-06 | Negative | Equivalence partitioning | Medium   |

- **Preconditions:** New service form open.
- **Steps:**
  1. Name " ", price -1
- **Expected result:** "Name is required" and "Price cannot be negative".
- **Automation:** Playwright `tests/e2e/services.spec.ts`
- **Last result (2026-11-19):** Pass

#### TC-SV-04

**Price above the 32-bit integer limit is rejected**

| Story | Type     | Technique               | Priority |
| ----- | -------- | ----------------------- | -------- |
| US-10 | Boundary | Boundary value analysis | Low      |

- **Preconditions:** Admin token.
- **Steps:**
  1. POST /services with price 2147483648
- **Expected result:** 400 Bad Request.
- **Automation:** Playwright `tests/api/booking.api.spec.ts` (test.fail)
- **Last result (2026-11-19):** Fail: lucaswsanchez/bookflow#58 (returns 500)

### Usability, accessibility and responsive (UX, RS)

#### TC-UX-01

**Booking flow can be completed with the keyboard only**

| Story | Type      | Technique              | Priority |
| ----- | --------- | ---------------------- | -------- |
| US-09 | Usability | Exploratory (keyboard) | High     |

- **Preconditions:** Booking page, no mouse.
- **Steps:**
  1. Tab to a service, Enter
  2. Tab to a professional, Enter
  3. Tab to a time, Enter
  4. Tab into the form, Enter with empty fields
- **Expected result:** Every control is reachable with a visible focus; on submit, focus moves to the first invalid field.
- **Automation:** Manual, built-in browser (2026-11-19)
- **Last result (2026-11-19):** Pass with observations (see bug-reports.md, suggestions S-01, S-02, S-03)

#### TC-UX-02

**Public pages have no new critical/serious WCAG A/AA violations**

| Story | Type      | Technique                      | Priority |
| ----- | --------- | ------------------------------ | -------- |
| US-09 | Usability | Automated a11y scan (axe-core) | High     |

- **Preconditions:** None.
- **Steps:**
  1. Scan landing, booking and login pages
- **Expected result:** No critical/serious violations outside the documented baseline.
- **Automation:** Playwright `tests/a11y/accessibility.spec.ts`
- **Last result (2026-11-19):** Pass with known issue lucaswsanchez/bookflow#60 (color contrast)

#### TC-RS-01

**Booking page on a phone**

| Story | Type      | Technique        | Priority |
| ----- | --------- | ---------------- | -------- |
| US-09 | Usability | Responsive check | Medium   |

- **Preconditions:** Pixel 7 viewport.
- **Steps:**
  1. Open the booking page and choose a service
- **Expected result:** Compact summary chips are shown, side panel hidden, no horizontal scroll.
- **Automation:** Playwright `tests/e2e/responsive.spec.ts` (Mobile Chrome)
- **Last result (2026-11-19):** Pass

#### TC-RS-02

**Admin navigation on a phone**

| Story | Type      | Technique        | Priority |
| ----- | --------- | ---------------- | -------- |
| US-09 | Usability | Responsive check | Medium   |

- **Preconditions:** Pixel 7 viewport, logged in as ADMIN.
- **Steps:**
  1. Tap the menu button
  2. Tap Services
- **Expected result:** The drawer opens and navigates to /app/services.
- **Automation:** Playwright `tests/e2e/responsive.spec.ts` (Mobile Chrome)
- **Last result (2026-11-19):** Pass
