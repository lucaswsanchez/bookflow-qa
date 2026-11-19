import { expect, type Locator, type Page } from '@playwright/test';

export type NavItem =
  | 'dashboard'
  | 'agenda'
  | 'appointments'
  | 'reports'
  | 'services'
  | 'staff'
  | 'clients'
  | 'settings';

export const ADMIN_ONLY_NAV: NavItem[] = ['reports', 'services', 'staff', 'clients', 'settings'];
export const SHARED_NAV: NavItem[] = ['dashboard', 'agenda', 'appointments'];

/** The authenticated layout: sidebar navigation, current user and logout. */
export class AdminShell {
  readonly sidebar: Locator;
  readonly menuButton: Locator;
  readonly userName: Locator;
  readonly userRole: Locator;
  readonly logoutButton: Locator;

  constructor(readonly page: Page) {
    this.sidebar = page.getByRole('complementary', { name: 'Sidebar' });
    this.menuButton = page.getByTestId('menu-button');
    this.userName = page.getByTestId('current-user-name');
    this.userRole = page.getByTestId('current-user-role');
    this.logoutButton = page.getByTestId('logout-button');
  }

  nav(item: NavItem) {
    return this.page.getByTestId(`nav-${item}`);
  }

  async goto(path = '/app') {
    await this.page.goto(path);
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
  }

  /** On small screens the sidebar is a drawer behind the menu button. */
  async openNavIfCollapsed() {
    if (await this.menuButton.isVisible()) await this.menuButton.click();
    await expect(this.sidebar).toBeVisible();
  }

  async logout() {
    await this.openNavIfCollapsed();
    await this.logoutButton.click();
  }
}
