import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.email = page.getByTestId('login-email');
    this.password = page.getByTestId('login-password');
    this.submit = page.getByTestId('login-submit');
    this.error = page.getByTestId('login-error');
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.email).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.email.fill(email);
    await this.password.fill(password);
    await this.submit.click();
  }

  /** Client-side validation message for a field. */
  fieldError(field: 'email' | 'password') {
    return this.page.locator(`#${field}-error`);
  }
}
