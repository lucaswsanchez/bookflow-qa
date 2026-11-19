import { expect, type Locator, type Page } from '@playwright/test';
import { env } from '../support/env';

export const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Public booking flow: service → professional → day and time → client details → confirmation. */
export class BookingPage {
  readonly businessName: Locator;
  readonly serviceStep: Locator;
  readonly staffStep: Locator;
  readonly dateTimeStep: Locator;
  readonly detailsStep: Locator;
  readonly dayPicker: Locator;
  readonly slotList: Locator;
  readonly slotsEmpty: Locator;
  readonly nameInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly notesInput: Locator;
  readonly submitButton: Locator;
  readonly confirmation: Locator;
  readonly bookingCode: Locator;
  readonly backButton: Locator;
  readonly errorState: Locator;
  readonly mobileSummary: Locator;

  constructor(readonly page: Page) {
    this.businessName = page.getByTestId('business-name');
    this.serviceStep = page.getByTestId('step-service');
    this.staffStep = page.getByTestId('step-staff');
    this.dateTimeStep = page.getByTestId('step-datetime');
    this.detailsStep = page.getByTestId('step-details');
    this.dayPicker = page.getByTestId('day-picker');
    this.slotList = page.getByTestId('slot-list');
    this.slotsEmpty = page.getByTestId('slots-empty');
    this.nameInput = page.getByTestId('input-name');
    this.phoneInput = page.getByTestId('input-phone');
    this.emailInput = page.getByTestId('input-email');
    this.notesInput = page.getByTestId('input-notes');
    this.submitButton = page.getByTestId('submit-booking');
    this.confirmation = page.getByTestId('booking-confirmation');
    this.bookingCode = page.getByTestId('booking-code');
    this.backButton = page.getByTestId('back-button');
    this.errorState = page.getByTestId('error-state');
    this.mobileSummary = page.getByTestId('booking-summary');
  }

  async goto(slug = env.slug) {
    await this.page.goto(`/book/${slug}`);
  }

  async chooseService(name: string) {
    await this.page.getByTestId(`service-option-${slugify(name)}`).click();
    await expect(this.staffStep).toBeVisible();
  }

  async chooseStaff(name: string) {
    await this.page.getByTestId(`staff-option-${slugify(name)}`).click();
    await expect(this.dateTimeStep).toBeVisible();
  }

  staffOption(name: string) {
    return this.page.getByTestId(`staff-option-${slugify(name)}`);
  }

  dayOption(date: string) {
    return this.page.getByTestId(`day-option-${date}`);
  }

  /** Clicks a day and waits until its availability has loaded (slots or the empty state). */
  async chooseDay(date: string) {
    await this.dayOption(date).click();
    await expect(this.slotList.or(this.slotsEmpty)).toBeVisible();
  }

  /**
   * Picks the latest day in the 14-day picker that still has free times.
   * Tests book far ahead so they don't crowd the demo's "today" agenda.
   */
  async chooseLatestDayWithSlots(): Promise<string> {
    const days = this.dayPicker.locator('[data-testid^="day-option-"]');
    const ids = await days.evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')!));
    for (const id of ids.reverse()) {
      const date = id.replace('day-option-', '');
      await this.chooseDay(date);
      if (await this.slotList.isVisible()) return date;
    }
    throw new Error('No day with free times in the next 14 days');
  }

  slots() {
    return this.slotList.locator('[data-testid^="slot-option-"]');
  }

  /** Picks the first free time of the selected day and returns its label (HH:mm). */
  async chooseFirstSlot(): Promise<string> {
    const first = this.slots().first();
    const time = ((await first.getAttribute('data-testid')) ?? '')
      .replace('slot-option-', '')
      .replace('-', ':');
    await first.click();
    await expect(this.detailsStep).toBeVisible();
    return time;
  }

  async fillDetails(d: { name: string; phone: string; email?: string; notes?: string }) {
    await this.nameInput.fill(d.name);
    await this.phoneInput.fill(d.phone);
    if (d.email !== undefined) await this.emailInput.fill(d.email);
    if (d.notes !== undefined) await this.notesInput.fill(d.notes);
  }

  async submit() {
    await this.submitButton.click();
  }

  /** Inline validation message under a field (`<p id="<field>-error" role="alert">`). */
  fieldError(field: 'name' | 'phone' | 'email') {
    return this.page.locator(`#${field}-error`);
  }
}
