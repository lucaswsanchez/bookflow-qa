/**
 * Test data rules (the suite runs against a shared public demo):
 * - Everything the suite creates is prefixed with "QA" and the run id, so it is easy to spot and clean.
 * - Bookings use one fixed QA client phone, so repeated runs reuse a single client record.
 * - Bookings are cancelled after each test, which frees the slot again.
 */
export const RUN_ID = (process.env.GITHUB_RUN_ID ?? Date.now().toString(36)).slice(-6);

export const qaName = (label: string) =>
  `QA ${RUN_ID} ${label} ${Math.random().toString(36).slice(2, 6)}`;

export const QA_CLIENT = {
  name: 'QA Automation',
  phone: '+54 379 4000000',
  email: 'qa.automation@example.com',
};

/** Equivalence classes for the booking form (see docs/test-cases.md, TC-BK-*). */
export const INVALID_CLIENT_INPUTS = [
  {
    id: 'name too short (1 char, below the 2-char boundary)',
    name: 'A',
    phone: QA_CLIENT.phone,
    email: '',
    field: 'name',
    message: 'Please enter your full name',
  },
  {
    id: 'phone with letters',
    name: QA_CLIENT.name,
    phone: '379-ABC-123',
    email: '',
    field: 'phone',
    message: 'Please enter a valid phone number',
  },
  {
    id: 'phone too short (5 chars, below the 6-char boundary)',
    name: QA_CLIENT.name,
    phone: '12345',
    email: '',
    field: 'phone',
    message: 'Please enter a valid phone number',
  },
  {
    id: 'malformed email',
    name: QA_CLIENT.name,
    phone: QA_CLIENT.phone,
    email: 'qa.automation@',
    field: 'email',
    message: 'Please enter a valid email',
  },
] as const;
