import { expect, type Locator, type Page } from '@playwright/test';
import { slugify } from './booking.page';

export interface ServiceInput {
  name: string;
  duration?: number;
  price?: number;
  description?: string;
  bookableOnline?: boolean;
}

/** Admin › Services: list, create/edit modal and delete confirmation. */
export class ServicesPage {
  readonly newButton: Locator;
  readonly table: Locator;
  readonly form: Locator;
  readonly name: Locator;
  readonly duration: Locator;
  readonly price: Locator;
  readonly description: Locator;
  readonly bookableOnline: Locator;
  readonly save: Locator;
  readonly confirmDialog: Locator;
  readonly confirmAction: Locator;

  constructor(readonly page: Page) {
    this.newButton = page.getByTestId('new-service');
    this.table = page.getByTestId('services-table');
    this.form = page.getByTestId('service-form');
    this.name = this.form.getByLabel('Name', { exact: true });
    this.duration = this.form.getByLabel('Duration (minutes)');
    this.price = this.form.getByLabel('Price (ARS)');
    this.description = this.form.getByLabel('Description');
    this.bookableOnline = this.form.getByLabel('Bookable online');
    this.save = page.getByTestId('save-service');
    this.confirmDialog = page.getByTestId('confirm-dialog');
    this.confirmAction = page.getByTestId('confirm-action');
  }

  async goto() {
    await this.page.goto('/app/services');
    await expect(this.table).toBeVisible();
  }

  row(name: string) {
    return this.page.getByTestId(`service-row-${slugify(name)}`);
  }

  async openNew() {
    await this.newButton.click();
    await expect(this.form).toBeVisible();
  }

  async fillForm(input: Partial<ServiceInput>) {
    if (input.name !== undefined) await this.name.fill(input.name);
    if (input.description !== undefined) await this.description.fill(input.description);
    if (input.duration !== undefined) await this.duration.fill(String(input.duration));
    if (input.price !== undefined) await this.price.fill(String(input.price));
    if (input.bookableOnline !== undefined)
      await this.bookableOnline.setChecked(input.bookableOnline);
  }

  async create(input: ServiceInput) {
    await this.openNew();
    await this.fillForm(input);
    await this.save.click();
    await expect(this.form).toBeHidden();
  }

  async edit(name: string, changes: Partial<ServiceInput>) {
    await this.page.getByRole('button', { name: `Edit ${name}` }).click();
    await expect(this.form).toBeVisible();
    await this.fillForm(changes);
    await this.save.click();
    await expect(this.form).toBeHidden();
  }

  async remove(name: string) {
    await this.page.getByRole('button', { name: `Delete ${name}` }).click();
    await expect(this.confirmDialog).toBeVisible();
    await this.confirmAction.click();
    await expect(this.confirmDialog).toBeHidden();
  }

  fieldError(field: 'name' | 'duration' | 'price') {
    return this.page.locator(`#service-${field}-error`);
  }
}
