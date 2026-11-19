import { expect, test } from '../fixtures';
import { INVALID_CLIENT_INPUTS, QA_CLIENT } from '../support/test-data';

/** One professional per browser project, so parallel projects never race for the same slot. */
const STAFF_BY_PROJECT: Record<string, string> = {
  chromium: 'Martín Acosta',
  firefox: 'Lucía Benítez',
  'mobile-chrome': 'Diego Ramírez',
};

test.describe('Public booking', () => {
  test.beforeEach(async ({ bookingPage }) => {
    await bookingPage.goto();
    await expect(bookingPage.businessName).toContainText('Barbería Costanera');
  });

  test(
    'TC-BK-01 client books an appointment end to end and gets a confirmation code',
    { tag: ['@smoke', '@cross-browser', '@mobile'] },
    async ({ bookingPage, bookings, page }, testInfo) => {
      const staff = STAFF_BY_PROJECT[testInfo.project.name] ?? 'Martín Acosta';

      await bookingPage.chooseService('Classic Haircut');
      await bookingPage.chooseStaff(staff);
      const date = await bookingPage.chooseLatestDayWithSlots();
      await bookingPage.chooseFirstSlot();
      await bookingPage.fillDetails({ ...QA_CLIENT, notes: 'bookflow-qa E2E run' });
      await bookingPage.submit();

      await expect(bookingPage.confirmation).toBeVisible();
      await expect(bookingPage.bookingCode).toHaveText(/^BF-[A-Z0-9]{6}$/);
      const code = (await bookingPage.bookingCode.textContent())!.trim();
      bookings.track(code, date);
      await expect(page.getByTestId('add-to-calendar')).toBeVisible();
    },
  );

  test('TC-BK-02 professionals are filtered by the chosen service', async ({ bookingPage }) => {
    // Seed data: only Lucía offers Hair Coloring; Kids Haircut is not offered by Diego.
    await bookingPage.chooseService('Hair Coloring');
    await expect(bookingPage.staffOption('Lucía Benítez')).toBeVisible();
    await expect(bookingPage.staffOption('Martín Acosta')).toHaveCount(0);
    await expect(bookingPage.staffOption('Diego Ramírez')).toHaveCount(0);
  });

  test('TC-BK-03 back button returns to the previous step keeping the flow', async ({
    bookingPage,
  }) => {
    await bookingPage.chooseService('Beard Trim');
    await bookingPage.chooseStaff('Martín Acosta');
    await bookingPage.backButton.click();
    await expect(bookingPage.staffStep).toBeVisible();
    await bookingPage.backButton.click();
    await expect(bookingPage.serviceStep).toBeVisible();
  });

  test('TC-BK-04 required fields are validated before submitting', async ({
    bookingPage,
    page,
  }) => {
    await bookingPage.chooseService('Classic Haircut');
    await bookingPage.chooseStaff('Martín Acosta');
    await bookingPage.chooseLatestDayWithSlots();
    await bookingPage.chooseFirstSlot();

    let bookingRequests = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/bookings')) bookingRequests++;
    });
    await bookingPage.submit();

    await expect(bookingPage.fieldError('name')).toHaveText('Please enter your full name');
    await expect(bookingPage.fieldError('phone')).toHaveText('Please enter a valid phone number');
    await expect(bookingPage.fieldError('email')).toBeHidden(); // email is optional
    await expect(bookingPage.nameInput).toHaveAttribute('aria-invalid', 'true');
    expect(bookingRequests, 'no booking request is sent with invalid data').toBe(0);
  });

  test.describe('client details: invalid equivalence classes', () => {
    for (const input of INVALID_CLIENT_INPUTS) {
      test(`TC-BK-05 rejects ${input.id}`, async ({ bookingPage }) => {
        await bookingPage.chooseService('Classic Haircut');
        await bookingPage.chooseStaff('Martín Acosta');
        await bookingPage.chooseLatestDayWithSlots();
        await bookingPage.chooseFirstSlot();
        await bookingPage.fillDetails(input);
        await bookingPage.submit();
        await expect(bookingPage.fieldError(input.field)).toHaveText(input.message);
        await expect(bookingPage.confirmation).toBeHidden();
      });
    }
  });

  test('TC-BK-06 unknown business shows an error state', async ({ bookingPage }) => {
    await bookingPage.goto('this-business-does-not-exist');
    await expect(bookingPage.errorState).toContainText('This business does not exist.');
  });
});
