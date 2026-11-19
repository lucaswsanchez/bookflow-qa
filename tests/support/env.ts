import 'dotenv/config';

/**
 * Test targets and demo accounts. Defaults point to the public BookFlow demo;
 * override any of them in a local .env (see .env.example) or in CI.
 */
export const env = {
  webUrl: (process.env.WEB_URL ?? 'https://bookflow-phi-ivory.vercel.app').replace(/\/$/, ''),
  apiUrl: (process.env.API_URL ?? 'https://bookflow-api-f8qe.onrender.com').replace(/\/$/, ''),
  slug: process.env.BUSINESS_SLUG ?? 'barberia-costanera',
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@demo.com',
    password: process.env.ADMIN_PASSWORD ?? 'Admin123!',
  },
  staff: {
    email: process.env.STAFF_EMAIL ?? 'staff@demo.com',
    password: process.env.STAFF_PASSWORD ?? 'Staff123!',
  },
};
