// Example load smoke test for a LOCAL BookFlow instance (docker compose up in the bookflow repo).
// Do NOT point this at the public demo: it runs on Render's free tier and is shared by everyone.
//
//   k6 run k6/smoke.js                       # defaults to http://localhost:3000
//   k6 run -e API_URL=http://localhost:3000 k6/smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const API = __ENV.API_URL || 'http://localhost:3000';
const SLUG = __ENV.BUSINESS_SLUG || 'barberia-costanera';

if (/onrender\.com/.test(API)) throw new Error('Refusing to load-test the shared public demo');

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

export function setup() {
  const services = http.get(`${API}/public/businesses/${SLUG}/services`).json();
  const serviceId = services[0].id;
  const staff = http.get(`${API}/public/businesses/${SLUG}/staff?serviceId=${serviceId}`).json();
  return { serviceId, staffId: staff[0].id };
}

export default function ({ serviceId, staffId }) {
  const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const business = http.get(`${API}/public/businesses/${SLUG}`);
  const availability = http.get(
    `${API}/public/businesses/${SLUG}/availability?serviceId=${serviceId}&staffId=${staffId}&date=${date}`,
  );
  check(business, { 'business 200': (r) => r.status === 200 });
  check(availability, { 'availability 200': (r) => r.status === 200 });
  sleep(1);
}
