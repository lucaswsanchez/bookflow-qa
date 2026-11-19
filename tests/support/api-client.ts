import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { env } from './env';

export type Role = 'admin' | 'staff';
export type AppointmentStatus = 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'STAFF';
    staffId: string | null;
  };
}
export interface PublicService {
  id: string;
  name: string;
  durationMinutes: number;
  price: number;
}
export interface PublicStaff {
  id: string;
  name: string;
  title: string | null;
  color: string;
}
export interface Slot {
  start: string;
  end: string;
  time: string;
}
export interface Booking {
  code: string;
  status: AppointmentStatus;
  startsAt: string;
  endsAt: string;
  price: number;
}
export interface Appointment {
  id: string;
  code: string;
  staffId: string;
  status: AppointmentStatus;
  startsAt: string;
  client: { name: string; phone: string };
}
export interface Service extends PublicService {
  active: boolean;
  description: string | null;
}

/**
 * Thin, typed wrapper around the BookFlow REST API. Used to arrange test data
 * (and clean it up) much faster than through the UI, and by the API specs.
 */
export class BookFlowApi {
  constructor(
    private readonly request: APIRequestContext,
    private readonly accessToken?: string,
  ) {}

  private get headers() {
    return this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : undefined;
  }

  private async json<T>(res: APIResponse, status = 200): Promise<T> {
    expect(res.status(), `${res.url()} → ${await res.text()}`).toBe(status);
    return (await res.json()) as T;
  }

  url(path: string) {
    return `${env.apiUrl}${path}`;
  }

  get(path: string) {
    return this.request.get(this.url(path), { headers: this.headers });
  }
  post(path: string, data?: unknown) {
    return this.request.post(this.url(path), { headers: this.headers, data });
  }
  patch(path: string, data?: unknown) {
    return this.request.patch(this.url(path), { headers: this.headers, data });
  }
  delete(path: string) {
    return this.request.delete(this.url(path), { headers: this.headers });
  }

  // ---- auth ----
  async login(email: string, password: string) {
    return this.json<Tokens>(await this.post('/auth/login', { email, password }));
  }
  async refresh(refreshToken: string) {
    return this.json<Tokens>(await this.post('/auth/refresh', { refreshToken }));
  }

  // ---- public booking ----
  private get pub() {
    return `/public/businesses/${env.slug}`;
  }
  async publicServices() {
    return this.json<PublicService[]>(await this.get(`${this.pub}/services`));
  }
  async publicStaff(serviceId?: string) {
    const q = serviceId ? `?serviceId=${serviceId}` : '';
    return this.json<PublicStaff[]>(await this.get(`${this.pub}/staff${q}`));
  }
  async availability(serviceId: string, staffId: string, date: string) {
    const res = await this.get(
      `${this.pub}/availability?serviceId=${serviceId}&staffId=${staffId}&date=${date}`,
    );
    return (await this.json<{ slots: Slot[] }>(res)).slots;
  }
  async book(body: {
    serviceId: string;
    staffId: string;
    startsAt: string;
    client: { name: string; phone: string; email?: string };
    notes?: string;
  }) {
    return this.json<Booking>(await this.post(`${this.pub}/bookings`, body), 201);
  }

  // ---- admin ----
  async appointments(from: string, to = from) {
    return this.json<Appointment[]>(await this.get(`/appointments?from=${from}&to=${to}`));
  }
  async setStatus(id: string, status: AppointmentStatus) {
    return this.json<Appointment>(await this.patch(`/appointments/${id}/status`, { status }));
  }
  async services() {
    return this.json<Service[]>(await this.get('/services'));
  }
  async createService(body: Partial<Service> & { name: string }) {
    return this.json<Service>(
      await this.post('/services', { durationMinutes: 30, price: 1000, active: false, ...body }),
      201,
    );
  }
  async deleteService(id: string) {
    return this.delete(`/services/${id}`);
  }
}
