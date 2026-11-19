import { expect, type Locator, type Page } from '@playwright/test';
import type { AppointmentStatus } from '../support/api-client';

/** Admin › Appointments list with filters, plus the appointment detail panel. */
export class AppointmentsPage {
  readonly search: Locator;
  readonly period: Locator;
  readonly statusFilter: Locator;
  readonly staffFilter: Locator;
  readonly from: Locator;
  readonly to: Locator;
  readonly rows: Locator;
  readonly summary: Locator;
  readonly statusActions: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByTestId('appointments-search');
    this.period = page.getByTestId('appointments-period');
    this.statusFilter = page.getByTestId('appointments-status-filter');
    this.staffFilter = page.getByTestId('appointments-staff-filter');
    this.from = page.getByTestId('appointments-from');
    this.to = page.getByTestId('appointments-to');
    this.rows = page.getByTestId('appointment-row');
    this.summary = page.getByTestId('appointments-summary');
    this.statusActions = page.getByTestId('status-actions');
  }

  async goto() {
    await this.page.goto('/app/appointments');
    await expect(this.search).toBeVisible();
  }

  /** Shows a custom date range (inclusive). */
  async showRange(from: string, to = from) {
    await this.period.selectOption('custom');
    await this.from.fill(from);
    await this.to.fill(to);
  }

  async filterByStatus(status: AppointmentStatus | '') {
    await this.statusFilter.selectOption(status);
  }

  /** Finds an appointment by its booking code and opens its detail panel. */
  async open(code: string) {
    await this.search.fill(code);
    await expect(this.rows).toHaveCount(1);
    await this.rows.first().click();
    await expect(this.statusActions).toBeVisible();
  }

  statusButton(status: AppointmentStatus) {
    return this.page.getByTestId(`set-status-${status.toLowerCase()}`);
  }

  async setStatus(status: AppointmentStatus) {
    await this.statusButton(status).click();
  }
}
