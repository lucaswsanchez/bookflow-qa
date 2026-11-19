// Generates postman/bookflow.postman_collection.json (Postman Collection v2.1).
import fs from 'node:fs';

const out = process.argv[2] ?? 'postman/bookflow.postman_collection.json';
const lines = (s) => s.trim().split('\n');

const req = (name, method, path, { auth, body, test, pre, description, headers = [] } = {}) => {
  const url = `{{baseUrl}}${path}`;
  const [raw, query] = url.split('?');
  const item = {
    name,
    request: {
      method,
      header: [...headers],
      url: {
        raw: url,
        host: ['{{baseUrl}}'],
        path: raw.replace('{{baseUrl}}/', '').split('/'),
        ...(query
          ? {
              query: query.split('&').map((p) => {
                const [key, value] = p.split('=');
                return { key, value };
              }),
            }
          : {}),
      },
      ...(description ? { description } : {}),
    },
    event: [],
  };
  if (auth === 'none') item.request.auth = { type: 'noauth' };
  else if (auth)
    item.request.auth = {
      type: 'bearer',
      bearer: [{ key: 'token', value: `{{${auth}}}`, type: 'string' }],
    };
  if (body !== undefined) {
    item.request.header.push({ key: 'Content-Type', value: 'application/json' });
    item.request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2) };
  }
  if (pre)
    item.event.push({
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: lines(pre) },
    });
  if (test)
    item.event.push({ listen: 'test', script: { type: 'text/javascript', exec: lines(test) } });
  return item;
};

const folder = (name, description, item) => ({ name, description, item });

const ERROR_SCHEMA = {
  type: 'object',
  required: ['statusCode', 'error', 'message', 'path', 'timestamp'],
  properties: {
    statusCode: { type: 'integer' },
    error: { type: 'string' },
    message: { anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] },
    path: { type: 'string' },
    timestamp: { type: 'string' },
  },
};

const collection = {
  info: {
    name: 'BookFlow API',
    description:
      'Functional and negative API tests for BookFlow (https://github.com/lucaswsanchez/bookflow).\n\n' +
      'Run the folders in order: later requests reuse ids and tokens saved by earlier ones. ' +
      'The collection cleans up after itself: the booking is cancelled and the QA service is deleted.\n\n' +
      'Run from the CLI: `pnpm newman` (see the README).',
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
  },
  variable: [{ key: 'errorSchema', value: JSON.stringify(ERROR_SCHEMA) }],
  event: [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: lines(`
// Collection-level checks that run after every request.
pm.test('Response time is under 5 s (API is warm)', () => pm.expect(pm.response.responseTime).to.be.below(5000));
if (pm.response.code >= 400) {
  pm.test('Error response uses the standard error schema', () =>
    pm.response.to.have.jsonSchema(JSON.parse(pm.collectionVariables.get('errorSchema'))));
}
pm.test('Never a 5xx', () => pm.expect(pm.response.code).to.be.below(500));`),
      },
    },
  ],
  item: [
    folder('00 Health', 'Smoke check that the API is up.', [
      req('Health check', 'GET', '/health', {
        auth: 'none',
        test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
pm.test('Status is ok', () => pm.expect(pm.response.json().status).to.eql('ok'));`,
      }),
    ]),

    folder('01 Auth', 'Login, profile and refresh token rotation.', [
      req('Login as ADMIN', 'POST', '/auth/login', {
        auth: 'none',
        body: { email: '{{adminEmail}}', password: '{{adminPassword}}' },
        test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
const schema = {
  type: 'object',
  required: ['accessToken', 'refreshToken', 'expiresIn', 'user'],
  properties: {
    accessToken: { type: 'string', pattern: '^[\\\\w-]+\\\\.[\\\\w-]+\\\\.[\\\\w-]+$' },
    refreshToken: { type: 'string' },
    expiresIn: { type: 'integer' },
    user: {
      type: 'object',
      required: ['id', 'email', 'name', 'role', 'staffId'],
      properties: { role: { enum: ['ADMIN', 'STAFF'] } },
    },
  },
};
pm.test('Body matches the token schema', () => pm.response.to.have.jsonSchema(schema));
const b = pm.response.json();
pm.test('Role is ADMIN', () => pm.expect(b.user.role).to.eql('ADMIN'));
pm.collectionVariables.set('adminToken', b.accessToken);
pm.collectionVariables.set('adminRefresh', b.refreshToken);`,
      }),
      req('Login as STAFF', 'POST', '/auth/login', {
        auth: 'none',
        body: { email: '{{staffEmail}}', password: '{{staffPassword}}' },
        test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
const b = pm.response.json();
pm.test('Role is STAFF and linked to a professional', () => {
  pm.expect(b.user.role).to.eql('STAFF');
  pm.expect(b.user.staffId).to.be.a('string');
});
pm.collectionVariables.set('staffToken', b.accessToken);
pm.collectionVariables.set('staffUserStaffId', b.user.staffId);`,
      }),
      req('Login with wrong password (401)', 'POST', '/auth/login', {
        auth: 'none',
        body: { email: '{{adminEmail}}', password: 'WrongPassword1!' },
        test: `
pm.test('Status code is 401', () => pm.response.to.have.status(401));
pm.test('Generic message (does not reveal which field is wrong)', () =>
  pm.expect(pm.response.json().message).to.eql('Invalid email or password'));`,
      }),
      req('Login with invalid email format (400)', 'POST', '/auth/login', {
        auth: 'none',
        body: { email: 'not-an-email', password: 'Admin123!' },
        test: `
pm.test('Status code is 400', () => pm.response.to.have.status(400));
pm.test('Validation message names the field', () =>
  pm.expect(pm.response.json().message.join(' ')).to.include('email must be an email'));`,
      }),
      req('Get current user', 'GET', '/auth/me', {
        auth: 'adminToken',
        test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
pm.test('Profile includes the business', () =>
  pm.expect(pm.response.json().business.slug).to.eql(pm.environment.get('slug')));`,
      }),
      req('Get current user without token (401)', 'GET', '/auth/me', {
        auth: 'none',
        test: `
pm.test('Status code is 401', () => pm.response.to.have.status(401));
pm.test('Message explains the missing token', () =>
  pm.expect(pm.response.json().message).to.eql('Missing access token'));`,
      }),
      req('Refresh tokens', 'POST', '/auth/refresh', {
        auth: 'none',
        body: { refreshToken: '{{adminRefresh}}' },
        test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
const b = pm.response.json();
pm.test('A new refresh token is issued (rotation)', () =>
  pm.expect(b.refreshToken).to.not.eql(pm.collectionVariables.get('adminRefresh')));
pm.collectionVariables.set('usedRefresh', pm.collectionVariables.get('adminRefresh'));
pm.collectionVariables.set('adminRefresh', b.refreshToken);
pm.collectionVariables.set('adminToken', b.accessToken);`,
      }),
      req('Reuse a rotated refresh token (401)', 'POST', '/auth/refresh', {
        auth: 'none',
        body: { refreshToken: '{{usedRefresh}}' },
        test: `
pm.test('Status code is 401', () => pm.response.to.have.status(401));
pm.test('Old refresh token is revoked', () =>
  pm.expect(pm.response.json().message).to.eql('Invalid refresh token'));`,
      }),
    ]),

    folder(
      '02 Public booking',
      'Anonymous booking flow: business, services, staff, availability and bookings.',
      [
        req('Get business profile', 'GET', '/public/businesses/{{slug}}', {
          auth: 'none',
          test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
pm.test('Body matches the business schema', () =>
  pm.response.to.have.jsonSchema({
    type: 'object',
    required: ['id', 'slug', 'name', 'timezone', 'currency'],
    properties: { slug: { type: 'string' }, timezone: { type: 'string' }, currency: { const: 'ARS' } },
  }));
pm.collectionVariables.set('timezone', pm.response.json().timezone);`,
        }),
        req(
          'Get unknown business (404)',
          'GET',
          '/public/businesses/this-business-does-not-exist',
          {
            auth: 'none',
            test: `
pm.test('Status code is 404', () => pm.response.to.have.status(404));
pm.test('Message', () => pm.expect(pm.response.json().message).to.eql('Business not found'));`,
          },
        ),
        req('List bookable services', 'GET', '/public/businesses/{{slug}}/services', {
          auth: 'none',
          test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
const services = pm.response.json();
pm.test('Every service has a duration and a price', () =>
  pm.response.to.have.jsonSchema({
    type: 'array',
    minItems: 1,
    items: {
      type: 'object',
      required: ['id', 'name', 'durationMinutes', 'price'],
      properties: { durationMinutes: { type: 'integer', minimum: 5 }, price: { type: 'integer', minimum: 0 } },
    },
  }));
pm.test('Sorted by price (ascending)', () => {
  const prices = services.map((s) => s.price);
  pm.expect(prices).to.eql([...prices].sort((a, b) => a - b));
});
pm.collectionVariables.set('serviceId', services.find((s) => s.name === 'Classic Haircut').id);`,
        }),
        req(
          'List staff offering the service',
          'GET',
          '/public/businesses/{{slug}}/staff?serviceId={{serviceId}}',
          {
            auth: 'none',
            test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
const staff = pm.response.json();
pm.test('At least one professional offers Classic Haircut', () => pm.expect(staff.length).to.be.above(0));
// Diego works Monday to Saturday; the logged-in STAFF user (Martín) must NOT own this booking.
pm.collectionVariables.set('bookingStaffId', staff.find((s) => s.name === 'Diego Ramírez').id);`,
          },
        ),
        req(
          'Get availability 30 days ahead',
          'GET',
          '/public/businesses/{{slug}}/availability?serviceId={{serviceId}}&staffId={{bookingStaffId}}&date={{bookingDate}}',
          {
            auth: 'none',
            pre: `
// Pick a date ~30 days ahead in the business time zone, skipping Sundays (no working hours).
// The Postman sandbox has no Intl time zones; Buenos Aires is UTC-3 all year (no DST).
const OFFSET_MS = -3 * 3600000;
const localDate = (days) => new Date(Date.now() + OFFSET_MS + days * 86400000);
let d = localDate(30);
if (d.getUTCDay() === 0) d = localDate(31);
pm.collectionVariables.set('bookingDate', d.toISOString().slice(0, 10));
pm.collectionVariables.set('dateBeyondHorizon', localDate(61).toISOString().slice(0, 10));`,
            test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
const b = pm.response.json();
pm.test('Slots have start, end and a local time', () =>
  pm.response.to.have.jsonSchema({
    type: 'object',
    required: ['date', 'timezone', 'service', 'staff', 'slots'],
    properties: {
      slots: { type: 'array', items: { type: 'object', required: ['start', 'end', 'time'] } },
    },
  }));
pm.test('There is at least one free slot', () => pm.expect(b.slots.length).to.be.above(0));
// A previous run may have left the first slot cancelled (free again) or a parallel run may hold it:
// use a random slot to make collisions unlikely.
const slot = b.slots[Math.floor(Math.random() * b.slots.length)];
pm.collectionVariables.set('slotStart', slot.start);`,
          },
        ),
        req(
          'Get availability beyond the 60-day horizon (400)',
          'GET',
          '/public/businesses/{{slug}}/availability?serviceId={{serviceId}}&staffId={{bookingStaffId}}&date={{dateBeyondHorizon}}',
          {
            auth: 'none',
            test: `
pm.test('Status code is 400', () => pm.response.to.have.status(400));
pm.test('Message explains the horizon', () =>
  pm.expect(pm.response.json().message).to.eql('Bookings can be made up to 60 days in advance'));`,
          },
        ),
        req(
          'Get availability without required params (400)',
          'GET',
          '/public/businesses/{{slug}}/availability',
          {
            auth: 'none',
            test: `
pm.test('Status code is 400', () => pm.response.to.have.status(400));
pm.test('Lists every missing parameter', () => {
  const msg = pm.response.json().message.join(' ');
  ['serviceId', 'staffId', 'date'].forEach((f) => pm.expect(msg).to.include(f));
});`,
          },
        ),
        req('Create a booking', 'POST', '/public/businesses/{{slug}}/bookings', {
          auth: 'none',
          body: {
            serviceId: '{{serviceId}}',
            staffId: '{{bookingStaffId}}',
            startsAt: '{{slotStart}}',
            client: {
              name: 'QA Automation',
              phone: '+54 379 4000000',
              email: 'qa.automation@example.com',
            },
            notes: 'Created by the bookflow-qa Newman run',
          },
          test: `
pm.test('Status code is 201', () => pm.response.to.have.status(201));
const b = pm.response.json();
pm.test('Booking code has the BF-XXXXXX format', () => pm.expect(b.code).to.match(/^BF-[A-Z0-9]{6}$/));
pm.test('Booking is confirmed for the requested slot', () => {
  pm.expect(b.status).to.eql('CONFIRMED');
  pm.expect(b.startsAt).to.eql(pm.collectionVariables.get('slotStart'));
});
pm.collectionVariables.set('bookingCode', b.code);`,
        }),
        req('Book the same slot again (409)', 'POST', '/public/businesses/{{slug}}/bookings', {
          auth: 'none',
          body: {
            serviceId: '{{serviceId}}',
            staffId: '{{bookingStaffId}}',
            startsAt: '{{slotStart}}',
            client: { name: 'QA Automation', phone: '+54 379 4000000' },
          },
          test: `
pm.test('Status code is 409', () => pm.response.to.have.status(409));
pm.test('No double booking', () =>
  pm.expect(pm.response.json().message).to.eql('The selected time slot is no longer available'));`,
        }),
        req(
          'Create a booking with an invalid phone (400)',
          'POST',
          '/public/businesses/{{slug}}/bookings',
          {
            auth: 'none',
            body: {
              serviceId: '{{serviceId}}',
              staffId: '{{bookingStaffId}}',
              startsAt: '{{slotStart}}',
              client: { name: 'QA Automation', phone: 'call me' },
            },
            test: `
pm.test('Status code is 400', () => pm.response.to.have.status(400));
pm.test('Validation message for the nested field', () =>
  pm.expect(pm.response.json().message).to.include('client.phone must be a valid phone number'));`,
          },
        ),
        req('Look up the booking by code', 'GET', '/public/bookings/{{bookingCode}}', {
          auth: 'none',
          test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
const b = pm.response.json();
pm.test('Returns the same booking with service and staff', () => {
  pm.expect(b.code).to.eql(pm.collectionVariables.get('bookingCode'));
  pm.expect(b.service.name).to.eql('Classic Haircut');
  pm.expect(b.staff.name).to.eql('Diego Ramírez');
});
pm.test('Does not expose the client phone or email', () => {
  pm.expect(b).to.not.have.property('client');
  pm.expect(JSON.stringify(b)).to.not.include('4000000');
});`,
        }),
        req('Look up an unknown booking code (404)', 'GET', '/public/bookings/BF-000000', {
          auth: 'none',
          test: `
pm.test('Status code is 404', () => pm.response.to.have.status(404));`,
        }),
      ],
    ),

    folder(
      '03 Appointments',
      'Agenda management, STAFF scoping and status changes. Cancels the booking at the end.',
      [
        req(
          'List appointments for the booking date (ADMIN)',
          'GET',
          '/appointments?from={{bookingDate}}&to={{bookingDate}}',
          {
            auth: 'adminToken',
            test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
const list = pm.response.json();
const mine = list.find((a) => a.code === pm.collectionVariables.get('bookingCode'));
pm.test('The new booking is in the agenda', () => pm.expect(mine).to.be.an('object'));
pm.test('Includes client, service and staff details', () => {
  pm.expect(mine.client.name).to.eql('QA Automation');
  pm.expect(mine.service).to.have.property('durationMinutes');
});
pm.collectionVariables.set('appointmentId', mine.id);`,
          },
        ),
        req(
          "STAFF reads another professional's appointment (404)",
          'GET',
          '/appointments/{{appointmentId}}',
          {
            auth: 'staffToken',
            test: `
pm.test('Status code is 404 (no data leak between professionals)', () => pm.response.to.have.status(404));`,
          },
        ),
        req(
          'STAFF list is scoped to their own agenda',
          'GET',
          '/appointments?from={{bookingDate}}&to={{bookingDate}}&staffId={{bookingStaffId}}',
          {
            auth: 'staffToken',
            test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
pm.test('staffId filter is ignored for STAFF users', () => {
  const own = pm.collectionVariables.get('staffUserStaffId');
  pm.response.json().forEach((a) => pm.expect(a.staffId).to.eql(own));
});`,
          },
        ),
        req(
          'Update status with an invalid value (400)',
          'PATCH',
          '/appointments/{{appointmentId}}/status',
          {
            auth: 'adminToken',
            body: { status: 'DONE' },
            test: `
pm.test('Status code is 400', () => pm.response.to.have.status(400));
pm.test('Lists the allowed values', () =>
  pm.expect(pm.response.json().message[0]).to.include('CONFIRMED, COMPLETED, CANCELLED, NO_SHOW'));`,
          },
        ),
        req('Cancel the booking (cleanup)', 'PATCH', '/appointments/{{appointmentId}}/status', {
          auth: 'adminToken',
          body: { status: 'CANCELLED' },
          test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
pm.test('Status is CANCELLED', () => pm.expect(pm.response.json().status).to.eql('CANCELLED'));`,
        }),
        req(
          'Cancelled slot is offered again',
          'GET',
          '/public/businesses/{{slug}}/availability?serviceId={{serviceId}}&staffId={{bookingStaffId}}&date={{bookingDate}}',
          {
            auth: 'none',
            test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
pm.test('The slot is free again', () =>
  pm.expect(pm.response.json().slots.map((s) => s.start)).to.include(pm.collectionVariables.get('slotStart')));`,
          },
        ),
        req('Dashboard summary', 'GET', '/dashboard/summary', {
          auth: 'adminToken',
          test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
pm.test('Has today and week totals', () =>
  pm.response.to.have.jsonSchema({
    type: 'object',
    required: ['timezone', 'currency', 'today', 'week'],
    properties: {
      today: { type: 'object', required: ['appointments', 'estimatedRevenue', 'byStatus'] },
      week: { type: 'object', required: ['appointments', 'estimatedRevenue'] },
    },
  }));`,
        }),
        req(
          'Export appointments as CSV',
          'GET',
          '/appointments/export?from={{bookingDate}}&to={{bookingDate}}',
          {
            auth: 'adminToken',
            test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
pm.test('Content type is CSV', () => pm.expect(pm.response.headers.get('Content-Type')).to.include('text/csv'));
pm.test('Has a header row', () => pm.expect(pm.response.text().split('\\n')[0].toLowerCase()).to.include('code'));`,
          },
        ),
      ],
    ),

    folder(
      '04 Services',
      'CRUD as ADMIN and authorization for STAFF. Deletes the QA service at the end.',
      [
        req('STAFF cannot create a service (403)', 'POST', '/services', {
          auth: 'staffToken',
          body: { name: 'QA Forbidden', durationMinutes: 30, price: 1000 },
          test: `
pm.test('Status code is 403', () => pm.response.to.have.status(403));`,
        }),
        req('STAFF cannot list clients (403)', 'GET', '/clients', {
          auth: 'staffToken',
          test: `
pm.test('Status code is 403', () => pm.response.to.have.status(403));`,
        }),
        req('Create a service', 'POST', '/services', {
          auth: 'adminToken',
          pre: `pm.collectionVariables.set('qaServiceName', 'QA Newman ' + Date.now().toString(36));`,
          body: { name: '{{qaServiceName}}', durationMinutes: 45, price: 12000, active: false },
          test: `
pm.test('Status code is 201', () => pm.response.to.have.status(201));
const s = pm.response.json();
pm.test('Saved with the sent values', () => {
  pm.expect(s.name).to.eql(pm.collectionVariables.get('qaServiceName'));
  pm.expect(s.durationMinutes).to.eql(45);
  pm.expect(s.active).to.eql(false);
});
pm.collectionVariables.set('qaServiceId', s.id);`,
        }),
        req('Create a service below the minimum duration (400)', 'POST', '/services', {
          auth: 'adminToken',
          body: { name: 'QA Invalid', durationMinutes: 4, price: 1000 },
          test: `
pm.test('Status code is 400', () => pm.response.to.have.status(400));
pm.test('Duration boundary message', () =>
  pm.expect(pm.response.json().message.join(' ')).to.include('durationMinutes must not be less than 5'));`,
        }),
        req('Update the service price', 'PATCH', '/services/{{qaServiceId}}', {
          auth: 'adminToken',
          body: { price: 15500 },
          test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));
pm.test('Price updated, other fields kept', () => {
  const s = pm.response.json();
  pm.expect(s.price).to.eql(15500);
  pm.expect(s.durationMinutes).to.eql(45);
});`,
        }),
        req('Delete the service (cleanup)', 'DELETE', '/services/{{qaServiceId}}', {
          auth: 'adminToken',
          test: `
pm.test('Status code is 200', () => pm.response.to.have.status(200));`,
        }),
        req('Get the deleted service (404)', 'GET', '/services/{{qaServiceId}}', {
          auth: 'adminToken',
          test: `
pm.test('Status code is 404', () => pm.response.to.have.status(404));`,
        }),
      ],
    ),
  ],
};

fs.writeFileSync(out, JSON.stringify(collection, null, 2) + '\n');
const count = collection.item.reduce((n, f) => n + f.item.length, 0);
console.log(`Wrote ${out} with ${count} requests`);
