import { expect, test } from '../fixtures';
import { qaName } from '../support/test-data';

test.describe('Services management (ADMIN)', () => {
  test.use({ role: 'admin' });

  // Safety net: remove any service this test created, even if it failed halfway.
  const created = new Set<string>();

  test.afterEach(async ({ adminApi }) => {
    if (!created.size) return;
    for (const s of await adminApi.services())
      if (created.has(s.name)) await adminApi.deleteService(s.id);
    created.clear();
  });

  test(
    'TC-SV-01 admin creates, edits and deletes a service',
    { tag: ['@smoke', '@cross-browser'] },
    async ({ servicesPage }) => {
      const name = qaName('Service');
      created.add(name);
      await servicesPage.goto();

      await servicesPage.create({ name, duration: 45, price: 12000, bookableOnline: false });
      await expect(servicesPage.row(name)).toBeVisible();
      await expect(servicesPage.row(name)).toContainText('45 min');
      await expect(servicesPage.row(name)).toContainText('12.000');

      await servicesPage.edit(name, { price: 15500 });
      await expect(servicesPage.row(name)).toContainText('15.500');

      await servicesPage.remove(name);
      await expect(servicesPage.row(name)).toHaveCount(0);
    },
  );

  test.describe('duration boundaries (valid range 5–480 minutes)', () => {
    for (const { duration, error } of [
      { duration: 4, error: 'At least 5 minutes' },
      { duration: 481, error: 'At most 8 hours' },
    ]) {
      test(`TC-SV-02 rejects a duration of ${duration} minutes`, async ({ servicesPage }) => {
        await servicesPage.goto();
        await servicesPage.openNew();
        await servicesPage.fillForm({ name: qaName('Invalid'), duration, price: 1000 });
        await servicesPage.save.click();
        await expect(servicesPage.fieldError('duration')).toHaveText(error);
        await expect(servicesPage.form).toBeVisible();
      });
    }
  });

  test('TC-SV-03 rejects an empty name and a negative price', async ({ servicesPage }) => {
    await servicesPage.goto();
    await servicesPage.openNew();
    await servicesPage.fillForm({ name: ' ', duration: 30, price: -1 });
    await servicesPage.save.click();
    await expect(servicesPage.fieldError('name')).toHaveText('Name is required');
    await expect(servicesPage.fieldError('price')).toHaveText('Price cannot be negative');
  });
});
