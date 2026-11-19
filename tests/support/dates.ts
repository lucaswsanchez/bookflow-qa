/** BookFlow's demo business runs on Buenos Aires time; tests use the same calendar. */
export const BUSINESS_TZ = 'America/Argentina/Buenos_Aires';

/** Local date (YYYY-MM-DD) in the business time zone, `days` from today. */
export function businessDate(days = 0): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}
