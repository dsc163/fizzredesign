// Formatting helpers. Written by hand instead of Intl so they behave the same
// on every platform. All times are shown in Houston time (where Rice is), no
// matter what timezone the viewer's device is set to.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// US Central time: UTC-5 from the second Sunday in March to the first Sunday
// in November (2 AM local), UTC-6 otherwise.
function nthSunday(year: number, month: number, n: number) {
  const first = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((7 - first) % 7) + (n - 1) * 7;
}

function houstonOffsetHours(ms: number) {
  const year = new Date(ms).getUTCFullYear();
  const dstStart = Date.UTC(year, 2, nthSunday(year, 2, 2), 8); // 2 AM CST = 8 AM UTC
  const dstEnd = Date.UTC(year, 10, nthSunday(year, 10, 1), 7); // 2 AM CDT = 7 AM UTC
  return ms >= dstStart && ms < dstEnd ? -5 : -6;
}

// A Date whose UTC fields read as Houston wall-clock time.
function houston(ms: number) {
  return new Date(ms + houstonOffsetHours(ms) * 3600000);
}

// Milliseconds for a Houston wall-clock time.
export function fromHouston(year: number, month: number, day: number, hour = 0, minute = 0) {
  const guess = Date.UTC(year, month, day, hour, minute);
  return guess - houstonOffsetHours(guess + 6 * 3600000) * 3600000;
}

// Start of the Houston day containing `ms`, plus `addDays` days.
export function houstonDayStart(ms: number, addDays = 0) {
  const d = houston(ms);
  return fromHouston(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + addDays);
}

export function atHoustonTime(dayStart: number, hour: number, minute: number) {
  const d = houston(dayStart + 12 * 3600000);
  return fromHouston(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour, minute);
}

export function formatPrice(price: number | null | undefined) {
  if (price === null || price === undefined) return '';
  if (price === 0) return 'Free';
  return Number.isInteger(price) ? `$${price}` : `$${price.toFixed(2)}`;
}

export function formatTime(ms: number) {
  const d = houston(ms);
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}

export function formatDay(ms: number) {
  const diff = Math.round((houstonDayStart(ms) - houstonDayStart(Date.now())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  const d = houston(ms);
  return `${DAYS[d.getUTCDay()]}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function formatDateTime(ms: number) {
  return `${formatDay(ms)} at ${formatTime(ms)}`;
}

export function formatAgo(ms: number) {
  const minutes = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
}
