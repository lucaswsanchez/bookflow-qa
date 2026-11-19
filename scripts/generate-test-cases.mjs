// Single source for docs/test-cases.md and docs/test-cases.csv.
import fs from 'node:fs';

const [mdOut = 'docs/test-cases.md', csvOut = 'docs/test-cases.csv'] = process.argv.slice(2);
const PW = (f) => `Playwright \`tests/${f}\``;
const NM = (r) => `Newman: "${r}"`;

// id, title, story, type, technique, priority, pre, steps[], expected, automation, result
const C = [
  // ---------- Booking ----------
  [
    'TC-BK-01',
    'Client books an appointment end to end',
    'US-01',
    'Functional',
    'Use case',
    'High',
    'Booking page /book/barberia-costanera is reachable. API warm.',
    [
      'Choose "Classic Haircut"',
      'Choose a professional',
      'Choose a day with free times and the first time',
      'Enter name, phone and email',
      'Click "Confirm booking"',
    ],
    'Confirmation screen with a code in the format BF-XXXXXX and an "Add to calendar" button.',
    PW('e2e/booking.spec.ts') + ' (Chromium, Firefox, Mobile Chrome)',
    'Pass',
  ],
  [
    'TC-BK-02',
    'Professionals are filtered by the chosen service',
    'US-01',
    'Functional',
    'Equivalence partitioning',
    'Medium',
    'Seed data: Hair Coloring is offered only by Lucía Benítez.',
    ['Choose "Hair Coloring"'],
    'Only Lucía Benítez is listed; Martín and Diego are not.',
    PW('e2e/booking.spec.ts'),
    'Pass',
  ],
  [
    'TC-BK-03',
    'Back button returns to the previous step',
    'US-01',
    'Usability',
    'Use case',
    'Low',
    'Booking page open.',
    ['Choose a service and a professional', 'Click "Go back" twice'],
    'The professional step and then the service step are shown again.',
    PW('e2e/booking.spec.ts'),
    'Pass',
  ],
  [
    'TC-BK-04',
    'Required client fields are validated',
    'US-01',
    'Negative',
    'Equivalence partitioning',
    'High',
    'Details step reached (service, professional and time chosen).',
    ['Leave all fields empty', 'Click "Confirm booking"'],
    'Errors under Name and Phone; Email (optional) has no error; inputs get aria-invalid; no booking request is sent.',
    PW('e2e/booking.spec.ts'),
    'Pass',
  ],
  [
    'TC-BK-05a',
    'Name shorter than 2 characters is rejected',
    'US-01',
    'Boundary',
    'Boundary value analysis',
    'Medium',
    'Details step reached.',
    ['Name "A" (1 char), valid phone', 'Submit'],
    '"Please enter your full name". Boundary: 1 char invalid, 2 chars valid (lower bound of 2–80).',
    PW('e2e/booking.spec.ts'),
    'Pass',
  ],
  [
    'TC-BK-05b',
    'Phone with letters is rejected',
    'US-01',
    'Negative',
    'Equivalence partitioning',
    'Medium',
    'Details step reached.',
    ['Phone "379-ABC-123"', 'Submit'],
    '"Please enter a valid phone number".',
    PW('e2e/booking.spec.ts'),
    'Pass',
  ],
  [
    'TC-BK-05c',
    'Phone shorter than 6 characters is rejected',
    'US-01',
    'Boundary',
    'Boundary value analysis',
    'Medium',
    'Details step reached.',
    ['Phone "12345" (5 chars)', 'Submit'],
    '"Please enter a valid phone number" (valid length is 6–20).',
    PW('e2e/booking.spec.ts'),
    'Pass',
  ],
  [
    'TC-BK-05d',
    'Malformed email is rejected',
    'US-01',
    'Negative',
    'Equivalence partitioning',
    'Medium',
    'Details step reached.',
    ['Email "qa.automation@"', 'Submit'],
    '"Please enter a valid email".',
    PW('e2e/booking.spec.ts'),
    'Pass',
  ],
  [
    'TC-BK-06',
    'Unknown business shows an error state',
    'US-01',
    'Negative',
    'Error guessing',
    'Low',
    'None.',
    ['Open /book/this-business-does-not-exist'],
    'Error state "This business does not exist." with a retry button.',
    PW('e2e/booking.spec.ts'),
    'Pass',
  ],
  [
    'TC-BK-07',
    'Phone made only of symbols is rejected',
    'US-10',
    'Negative',
    'Equivalence partitioning',
    'Medium',
    'Admin access token.',
    ['POST /clients with phone "------"'],
    '400 Bad Request: a phone needs digits.',
    'Exploratory API session (2026-11-19)',
    'Fail: lucaswsanchez/bookflow#59',
  ],
  [
    'TC-BK-08',
    'Booking can be looked up by its code without exposing contact data',
    'US-01',
    'Functional',
    'Use case',
    'Medium',
    'A booking exists.',
    ['GET /public/bookings/{code}'],
    '200 with service, professional and time; no client phone or email in the body.',
    NM('Look up the booking by code'),
    'Pass',
  ],

  // ---------- Availability (decision table) ----------
  [
    'TC-AV-01',
    'Decision table R1: free slot inside working hours is offered',
    'US-02',
    'Functional',
    'Decision table',
    'High',
    'Weekday with free time for Martín (09:00–13:00, 16:00–20:00).',
    ['GET availability for Classic Haircut (30 min), Martín, that day'],
    'Slots start inside the working ranges, every 15 minutes.',
    NM('Get availability 30 days ahead') + '; exploratory API session',
    'Pass',
  ],
  [
    'TC-AV-02',
    'Decision table R2: service must end before the range ends',
    'US-02',
    'Boundary',
    'Decision table + BVA',
    'High',
    'Lucía works 10:00–18:00 on weekdays.',
    ['GET availability for Hair Coloring (90 min) with Lucía'],
    'Last slot is 16:30 (16:30 + 90 min = 18:00); 16:45 is not offered.',
    'Exploratory API session (2026-11-19)',
    'Pass',
  ],
  [
    'TC-AV-03',
    'Decision table R3: overlapping a non-cancelled appointment is not offered',
    'US-08',
    'Functional',
    'Decision table',
    'High',
    'An appointment exists for the slot.',
    ['Book a slot', 'GET availability for the same day'],
    'The booked start time is no longer listed.',
    PW('e2e/appointments.spec.ts') + ' (TC-AP-02, first assertion)',
    'Pass',
  ],
  [
    'TC-AV-04',
    'Decision table R4: a cancelled appointment frees the slot',
    'US-05',
    'Functional',
    'Decision table',
    'High',
    'A booked slot.',
    ['Cancel the appointment', 'GET availability again'],
    'The start time is offered again.',
    PW('e2e/appointments.spec.ts') + '; ' + NM('Cancelled slot is offered again'),
    'Pass',
  ],
  [
    'TC-AV-05',
    'Decision table R5: day without working hours has no slots',
    'US-02',
    'Functional',
    'Decision table',
    'Medium',
    'Martín does not work on Sundays.',
    ['GET availability for Martín on a Sunday'],
    '200 with an empty slot list.',
    'Exploratory API session (2026-11-19)',
    'Pass',
  ],
  [
    'TC-AV-06',
    'Decision table R6: past times and past dates are not offered',
    'US-02',
    'Boundary',
    'Decision table',
    'High',
    'Today, after opening time.',
    ['GET availability for today', 'GET availability for 2020-01-01'],
    'Today only lists times after "now" (business time zone); a past date returns no slots.',
    'Exploratory API session (2026-11-19)',
    'Pass',
  ],
  [
    'TC-AV-07',
    'Decision table R7: booking horizon is 60 days',
    'US-02',
    'Boundary',
    'Boundary value analysis',
    'High',
    'None.',
    ['GET availability for today + 60', 'GET availability for today + 61'],
    'Day 60: 200. Day 61: 400 "Bookings can be made up to 60 days in advance".',
    PW('api/booking.api.spec.ts') + '; ' + NM('Get availability beyond the 60-day horizon (400)'),
    'Pass',
  ],
  [
    'TC-AV-08',
    'Decision table R8: professional who does not offer the service',
    'US-02',
    'Negative',
    'Decision table',
    'Medium',
    'Martín does not offer Hair Coloring.',
    ['GET availability for Hair Coloring with Martín'],
    '404 "Staff member not found or does not offer this service".',
    'Exploratory API session (2026-11-19)',
    'Pass',
  ],
  [
    'TC-AV-09',
    'Two concurrent bookings for the same slot',
    'US-08',
    'Functional',
    'Error guessing (race condition)',
    'High',
    'A free slot.',
    ['Send two identical POST /bookings at the same time'],
    'Exactly one 201 and one 409 "The selected time slot is no longer available".',
    PW('api/booking.api.spec.ts') + '; ' + NM('Book the same slot again (409)'),
    'Pass',
  ],

  // ---------- Auth ----------
  [
    'TC-AU-01',
    'Admin logs in with valid credentials',
    'US-03',
    'Functional',
    'Equivalence partitioning',
    'High',
    'Logged out.',
    ['Open /login', 'Enter admin@demo.com / Admin123!', 'Click "Sign in"'],
    'Redirect to /app; sidebar shows "Admin Demo" and the ADMIN role.',
    PW('e2e/auth.spec.ts'),
    'Pass',
  ],
  [
    'TC-AU-02',
    'Wrong password is rejected',
    'US-03',
    'Negative',
    'Equivalence partitioning',
    'High',
    'Logged out.',
    ['Log in with a wrong password'],
    'Generic error "Invalid email or password"; user stays on /login.',
    PW('e2e/auth.spec.ts') + '; ' + PW('api/auth-and-roles.api.spec.ts'),
    'Pass',
  ],
  [
    'TC-AU-03',
    'Invalid email format and short password are caught on the client',
    'US-03',
    'Boundary',
    'BVA (password min 6)',
    'Medium',
    'Logged out.',
    ['Email "admin@", password "12345" (5 chars)', 'Submit'],
    'Field errors for both fields; no request is sent to /auth/login.',
    PW('e2e/auth.spec.ts'),
    'Pass',
  ],
  [
    'TC-AU-04',
    'Staff logs in and logs out',
    'US-03',
    'Functional',
    'Use case',
    'High',
    'Logged out.',
    ['Log in as staff@demo.com', 'Click "Log out"', 'Open /app'],
    'STAFF role shown; after logout /app redirects to /login.',
    PW('e2e/auth.spec.ts'),
    'Pass',
  ],
  [
    'TC-AU-05',
    'Anonymous access to the panel redirects to login',
    'US-04',
    'Negative',
    'Error guessing',
    'High',
    'Logged out.',
    ['Open /app/appointments'],
    'Redirect to /login.',
    PW('e2e/auth.spec.ts'),
    'Pass',
  ],
  [
    'TC-AU-06',
    'Used refresh tokens cannot be reused (rotation)',
    'US-03',
    'Functional',
    'State transition',
    'High',
    'A valid refresh token.',
    ['POST /auth/refresh with token A', 'POST /auth/refresh with token A again'],
    'First call: 200 with a new token B. Second call: 401 "Invalid refresh token".',
    PW('api/auth-and-roles.api.spec.ts') + '; ' + NM('Reuse a rotated refresh token (401)'),
    'Pass',
  ],
  [
    'TC-AU-07',
    'Login is rate limited after 10 attempts per minute',
    'US-03',
    'Negative',
    'Boundary value analysis',
    'Medium',
    'Logged out.',
    ['Send 11 login requests within one minute from the same IP'],
    'The 11th returns 429 and the UI shows "Too many attempts. Please wait a minute and try again."',
    'Manual only (local environment)',
    'Not run: would lock the shared demo login for every visitor for a minute',
  ],

  // ---------- Roles ----------
  [
    'TC-RB-01',
    'Admin sees every section',
    'US-04',
    'Functional',
    'Decision table (role × section)',
    'High',
    'Logged in as ADMIN.',
    ['Open the sidebar'],
    'Overview, Agenda, Appointments, Reports, Services, Staff, Clients and Settings are visible.',
    PW('e2e/permissions.spec.ts') + ' (Chromium, Firefox)',
    'Pass',
  ],
  [
    'TC-RB-02',
    'Admin can filter appointments by professional',
    'US-04',
    'Functional',
    'Use case',
    'Medium',
    'Logged in as ADMIN.',
    ['Open Appointments'],
    'Professional filter with "All professionals" + 3 staff.',
    PW('e2e/permissions.spec.ts'),
    'Pass',
  ],
  [
    'TC-RB-03',
    'Staff only sees shared sections',
    'US-04',
    'Functional',
    'Decision table (role × section)',
    'High',
    'Logged in as STAFF.',
    ['Open the sidebar'],
    'Overview, Agenda and Appointments only; no admin sections.',
    PW('e2e/permissions.spec.ts') + ' (Chromium, Firefox)',
    'Pass',
  ],
  [
    'TC-RB-04',
    'Staff opening an admin URL is redirected',
    'US-04',
    'Negative',
    'Error guessing',
    'High',
    'Logged in as STAFF.',
    ['Open /app/services, /app/reports and /app/clients'],
    'Each one redirects to /app.',
    PW('e2e/permissions.spec.ts'),
    'Pass',
  ],
  [
    'TC-RB-05',
    'Staff only sees their own appointments',
    'US-04',
    'Functional',
    'Equivalence partitioning',
    'High',
    'One appointment for the logged-in staff member and one for another professional.',
    ['Open Appointments as STAFF', 'Search each booking code'],
    "Own booking is listed; the other professional's booking is not; no professional filter.",
    PW('e2e/permissions.spec.ts'),
    'Pass',
  ],
  [
    'TC-RB-06',
    "Staff cannot read or change another professional's appointment via the API",
    'US-04',
    'Negative',
    'Error guessing',
    'High',
    'STAFF access token.',
    ["GET and PATCH another professional's appointment", 'GET /appointments?staffId=<other>'],
    '404 on GET/PATCH (no data leak); the staffId filter is ignored.',
    PW('api/auth-and-roles.api.spec.ts') + '; Newman',
    'Pass',
  ],
  [
    'TC-RB-07',
    'Staff gets 403 on admin-only endpoints',
    'US-04',
    'Negative',
    'Equivalence partitioning',
    'High',
    'STAFF access token.',
    ['POST /services', 'GET /clients'],
    '403 with the standard error body.',
    PW('api/auth-and-roles.api.spec.ts') + '; Newman',
    'Pass',
  ],

  // ---------- Appointments ----------
  [
    'TC-AP-01',
    'Admin marks an appointment as completed',
    'US-05',
    'Functional',
    'State transition',
    'High',
    'A CONFIRMED appointment.',
    [
      'Open Appointments, custom range, search the code',
      'Open the appointment',
      'Click "Completed"',
    ],
    'Completed is the current status, a toast is shown and the API returns COMPLETED.',
    PW('e2e/appointments.spec.ts') + ' (Chromium, Firefox)',
    'Pass',
  ],
  [
    'TC-AP-02',
    'Cancelling frees the slot',
    'US-05',
    'Functional',
    'State transition',
    'High',
    'A CONFIRMED appointment.',
    ['Set status to Cancelled'],
    'The slot is offered again in the public availability.',
    PW('e2e/appointments.spec.ts'),
    'Pass',
  ],
  [
    'TC-AP-03',
    'Status filter lists only that status',
    'US-07',
    'Functional',
    'Equivalence partitioning',
    'Medium',
    'Logged in as ADMIN.',
    ['Period "This week"', 'Status "Completed"'],
    'Every row has status COMPLETED.',
    PW('e2e/appointments.spec.ts'),
    'Pass',
  ],
  [
    'TC-AP-04',
    'Invalid status value is rejected',
    'US-10',
    'Negative',
    'Equivalence partitioning',
    'Medium',
    'Admin token.',
    ['PATCH /appointments/{id}/status with "DONE"'],
    '400 listing CONFIRMED, COMPLETED, CANCELLED, NO_SHOW.',
    NM('Update status with an invalid value (400)'),
    'Pass',
  ],
  [
    'TC-AP-05',
    'Appointments CSV export',
    'US-07',
    'Functional',
    'Use case',
    'Medium',
    'Admin token.',
    ['GET /appointments/export for a date'],
    '200, Content-Type text/csv and a header row.',
    NM('Export appointments as CSV'),
    'Pass',
  ],
  [
    'TC-AP-06',
    'Impossible calendar dates are rejected',
    'US-10',
    'Negative',
    'Boundary value analysis',
    'Medium',
    'Admin token.',
    ['GET /appointments?from=2026-02-30', 'GET /appointments?from=2026-13-45'],
    '400 Bad Request.',
    PW('api/booking.api.spec.ts') + ' (test.fail)',
    'Fail: lucaswsanchez/bookflow#57 (returns 500)',
  ],

  // ---------- Services ----------
  [
    'TC-SV-01',
    'Admin creates, edits and deletes a service',
    'US-06',
    'Functional',
    'Use case (CRUD)',
    'High',
    'Logged in as ADMIN.',
    [
      'New service: name, 45 min, ARS 12,000, not bookable online',
      'Edit price to 15,500',
      'Delete and confirm',
    ],
    'Row appears with 45 min and $ 12.000, then $ 15.500, then disappears.',
    PW('e2e/services.spec.ts') + ' (Chromium, Firefox); Newman',
    'Pass',
  ],
  [
    'TC-SV-02',
    'Duration outside 5–480 minutes is rejected',
    'US-06',
    'Boundary',
    'Boundary value analysis',
    'High',
    'New service form open.',
    ['Duration 4', 'Duration 481'],
    '"At least 5 minutes" / "At most 8 hours"; the form stays open.',
    PW('e2e/services.spec.ts') + '; Newman (4 min via API)',
    'Pass',
  ],
  [
    'TC-SV-03',
    'Empty name and negative price are rejected',
    'US-06',
    'Negative',
    'Equivalence partitioning',
    'Medium',
    'New service form open.',
    ['Name " ", price -1'],
    '"Name is required" and "Price cannot be negative".',
    PW('e2e/services.spec.ts'),
    'Pass',
  ],
  [
    'TC-SV-04',
    'Price above the 32-bit integer limit is rejected',
    'US-10',
    'Boundary',
    'Boundary value analysis',
    'Low',
    'Admin token.',
    ['POST /services with price 2147483648'],
    '400 Bad Request.',
    PW('api/booking.api.spec.ts') + ' (test.fail)',
    'Fail: lucaswsanchez/bookflow#58 (returns 500)',
  ],

  // ---------- UX / a11y / responsive ----------
  [
    'TC-UX-01',
    'Booking flow can be completed with the keyboard only',
    'US-09',
    'Usability',
    'Exploratory (keyboard)',
    'High',
    'Booking page, no mouse.',
    [
      'Tab to a service, Enter',
      'Tab to a professional, Enter',
      'Tab to a time, Enter',
      'Tab into the form, Enter with empty fields',
    ],
    'Every control is reachable with a visible focus; on submit, focus moves to the first invalid field.',
    'Manual, built-in browser (2026-11-19)',
    'Pass with observations (see bug-reports.md, suggestions S-01, S-02, S-03)',
  ],
  [
    'TC-UX-02',
    'Public pages have no new critical/serious WCAG A/AA violations',
    'US-09',
    'Usability',
    'Automated a11y scan (axe-core)',
    'High',
    'None.',
    ['Scan landing, booking and login pages'],
    'No critical/serious violations outside the documented baseline.',
    PW('a11y/accessibility.spec.ts'),
    'Pass with known issue lucaswsanchez/bookflow#60 (color contrast)',
  ],
  [
    'TC-RS-01',
    'Booking page on a phone',
    'US-09',
    'Usability',
    'Responsive check',
    'Medium',
    'Pixel 7 viewport.',
    ['Open the booking page and choose a service'],
    'Compact summary chips are shown, side panel hidden, no horizontal scroll.',
    PW('e2e/responsive.spec.ts') + ' (Mobile Chrome)',
    'Pass',
  ],
  [
    'TC-RS-02',
    'Admin navigation on a phone',
    'US-09',
    'Usability',
    'Responsive check',
    'Medium',
    'Pixel 7 viewport, logged in as ADMIN.',
    ['Tap the menu button', 'Tap Services'],
    'The drawer opens and navigates to /app/services.',
    PW('e2e/responsive.spec.ts') + ' (Mobile Chrome)',
    'Pass',
  ],
];

const esc = (s) => String(s).replace(/\|/g, '\\|');
const byArea = [
  ['Booking (BK)', 'TC-BK'],
  ['Availability, decision table (AV)', 'TC-AV'],
  ['Authentication (AU)', 'TC-AU'],
  ['Roles and permissions (RB)', 'TC-RB'],
  ['Appointments (AP)', 'TC-AP'],
  ['Services (SV)', 'TC-SV'],
  ['Usability, accessibility and responsive (UX, RS)', 'TC-UX|TC-RS'],
];

const counts = {
  total: C.length,
  automated: C.filter((c) => /Playwright|Newman/.test(c[9])).length,
  pass: C.filter((c) => c[10].startsWith('Pass')).length,
  fail: C.filter((c) => c[10].startsWith('Fail')).length,
  notRun: C.filter((c) => c[10].startsWith('Not run')).length,
};

let md = `# Test cases

Test cases for **BookFlow** (version on \`main\` @ \`5433f11\`, live demo), written for manual execution and
automated where it pays off. IDs match the automated tests (\`TC-BK-01 ...\` appears in the Playwright test titles),
so a failing test points straight to its case.

**${counts.total} test cases** · ${counts.automated} automated (Playwright and/or Newman) · last execution on 2026-11-19:
**${counts.pass} pass, ${counts.fail} fail, ${counts.notRun} not run**. Also available as [CSV](test-cases.csv) to import into
Jira (Xray/Zephyr), TestRail or a spreadsheet.

**Types:** Functional, Negative, Boundary, Usability. **Priority:** High, Medium, Low.

## Test design techniques

### Equivalence partitioning: client details (booking form)
| Field | Valid classes | Invalid classes | Cases |
|---|---|---|---|
| Name | 2–80 characters after trimming | empty; 1 character; only spaces; > 80 | TC-BK-04, TC-BK-05a |
| Phone | 6–20 of \`+ 0-9 space ( ) -\` | empty; contains letters; < 6 chars; **no digits at all** | TC-BK-04, TC-BK-05b, TC-BK-05c, TC-BK-07 |
| Email (optional) | empty; valid address | malformed (\`user@\`) | TC-BK-04, TC-BK-05d |

### Boundary value analysis
| Rule | Below | On the boundary | Above | Cases |
|---|---|---|---|---|
| Name length 2–80 | 1 ✗ | 2 ✓ | | TC-BK-05a |
| Phone length 6–20 | 5 ✗ | 6 ✓ | | TC-BK-05c |
| Password length ≥ 6 (login) | 5 ✗ | 6 ✓ | | TC-AU-03 |
| Service duration 5–480 min | 4 ✗ | 5 ✓ / 480 ✓ | 481 ✗ | TC-SV-02 |
| Booking horizon (days ahead) | | 60 ✓ | 61 ✗ | TC-AV-07 |
| Last slot of a range (Lucía 10:00–18:00, 90 min) | | 16:30 ✓ | 16:45 ✗ | TC-AV-02 |
| Service price (32-bit column) | | 2,147,483,647 | 2,147,483,648 → 500 ✗ (bug) | TC-SV-04 |
| Login attempts per minute | | 10 ✓ | 11 → 429 | TC-AU-07 |

### Decision table: is a time slot offered?
Conditions are evaluated for one professional, one service and one date in the business time zone
(America/Argentina/Buenos_Aires).

| Condition | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 |
|---|---|---|---|---|---|---|---|---|
| Professional offers the service and is active | Y | Y | Y | Y | Y | Y | Y | **N** |
| Date ≤ today + 60 days | Y | Y | Y | Y | Y | Y | **N** | – |
| Day has working hours | Y | Y | Y | Y | **N** | Y | – | – |
| Start time is in the future | Y | Y | Y | Y | – | **N** | – | – |
| Start + duration ≤ end of the working range | Y | **N** | Y | Y | – | – | – | – |
| Overlaps an appointment that is not CANCELLED | N | – | **Y** | N (only a CANCELLED one) | – | – | – | – |
| **Result** | Offered | Not offered | Not offered | Offered | No slots (200, empty) | Not offered | 400 | 404 |
| **Case** | TC-AV-01 | TC-AV-02 | TC-AV-03 | TC-AV-04 | TC-AV-05 | TC-AV-06 | TC-AV-07 | TC-AV-08 |

"–" means the condition does not matter for that rule. Concurrency (two requests for the same free slot) is covered
separately by TC-AV-09.

### State transition: appointment status
\`CONFIRMED\` is the initial state of every booking. ADMIN (and STAFF on their own agenda) can move it to
\`COMPLETED\`, \`NO_SHOW\` or \`CANCELLED\`; only states other than \`CANCELLED\` block the slot (TC-AP-01, TC-AP-02, TC-AV-04).

## Summary
| ID | Title | Story | Type | Priority | Automation | Last result |
|---|---|---|---|---|---|---|
${C.map((c) => `| [${c[0]}](#${c[0].toLowerCase()}) | ${esc(c[1])} | ${c[2]} | ${c[3]} | ${c[5]} | ${esc(c[9])} | ${esc(c[10])} |`).join('\n')}

## Cases
`;
for (const [title, prefix] of byArea) {
  md += `\n### ${title}\n`;
  for (const c of C.filter((c) => new RegExp(`^(${prefix})`).test(c[0]))) {
    md += `
#### ${c[0]}
**${esc(c[1])}**

| Story | Type | Technique | Priority |
|---|---|---|---|
| ${c[2]} | ${c[3]} | ${c[4]} | ${c[5]} |

- **Preconditions:** ${c[6]}
- **Steps:**
${c[7].map((s, i) => `  ${i + 1}. ${s}`).join('\n')}
- **Expected result:** ${c[8]}
- **Automation:** ${c[9]}
- **Last result (2026-11-19):** ${c[10]}
`;
  }
}
fs.writeFileSync(mdOut, md);

const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
const csv = [
  [
    'ID',
    'Title',
    'User story',
    'Type',
    'Technique',
    'Priority',
    'Preconditions',
    'Steps',
    'Expected result',
    'Automation',
    'Last result',
  ]
    .map(q)
    .join(','),
  ...C.map((c) =>
    [...c.slice(0, 7), c[7].map((s, i) => `${i + 1}. ${s}`).join('\n'), ...c.slice(8)]
      .map(q)
      .join(','),
  ),
].join('\n');
fs.writeFileSync(csvOut, csv + '\n');
console.log(counts);
