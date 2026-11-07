const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];
const WEEKDAYS_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];
const WEEKDAYS_SHORT = [
  "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
];

// ---------- formatting ----------

export function formatDatetime(date: Date, format: string): string {
  const pad = (n: number, length = 2) => n.toString().padStart(length, '0');
  const hours24 = date.getHours();
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  const replacements: { [key: string]: string } = {
    "yyyy": date.getFullYear().toString(),
    "yy": date.getFullYear().toString().slice(-2),
    "mmmm": MONTHS_LONG[date.getMonth()],
    "mmm": MONTHS_SHORT[date.getMonth()],
    "mm": pad(date.getMonth() + 1),
    "m": (date.getMonth() + 1).toString(),
    "dddd": WEEKDAYS_LONG[date.getDay()],
    "ddd": WEEKDAYS_SHORT[date.getDay()],
    "dd": pad(date.getDate()),
    "d": date.getDate().toString(),
    "HH": pad(hours24),
    "H": hours24.toString(),
    "hh": pad(hours12),
    "h": hours12.toString(),
    "MM": pad(date.getMinutes()),
    "M": date.getMinutes().toString(),
    "ss": pad(date.getSeconds()),
    "s": date.getSeconds().toString(),
    "AM/PM": hours24 >= 12 ? "PM" : "AM",
    "am/pm": hours24 >= 12 ? "pm" : "am",
    "A/P": hours24 >= 12 ? "P" : "A",
    "a/p": hours24 >= 12 ? "p" : "a",
  };

  const keys = Object.keys(replacements).sort((a, b) => b.length - a.length);
  const regex = new RegExp(keys.join('|'), 'g');
  return format.replace(regex, match => replacements[match]);
}

// ---------- parsing: "15 oct", "oct 15 2026", "15/10", "2026-10-15", "today" ----------

const MONTH_KEYS = MONTHS_SHORT.map((m) => m.toLowerCase());

// index (0-11) of a month from its name or abbreviation, or -1
const monthIndex = (s: string) => MONTH_KEYS.indexOf(s.slice(0, 3));

// returns the start of that day, or null if it isn't a real date (e.g. 31 Feb)
const validDate = (y: number, m: number, d: number): number | null => {
  const dt = new Date(y, m, d);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d ? dt.getTime() : null;
};

// returns the start of the parsed day as a timestamp, or null if the text isn't a date
export const parseDate = (text: string, now = new Date()): number | null => {
  const t = text.trim().toLowerCase();
  const y0 = now.getFullYear();
  let m: RegExpExecArray | null;

  if (t === 'today') return validDate(y0, now.getMonth(), now.getDate());
  if (t === 'yesterday') return validDate(y0, now.getMonth(), now.getDate() - 1);
  if (t === 'tomorrow') return validDate(y0, now.getMonth(), now.getDate() + 1);

  // 15 oct, 15 oct 2026
  if ((m = /^(\d{1,2})\s*([a-z]{3,9})\.?(?:\s+(\d{4}))?$/.exec(t))) {
    const mi = monthIndex(m[2]);
    if (mi >= 0) return validDate(m[3] ? +m[3] : y0, mi, +m[1]);
  }
  // oct 15, oct 15 2026
  if ((m = /^([a-z]{3,9})\.?\s*(\d{1,2})(?:,?\s+(\d{4}))?$/.exec(t))) {
    const mi = monthIndex(m[1]);
    if (mi >= 0) return validDate(m[3] ? +m[3] : y0, mi, +m[2]);
  }
  // 15/10, 15/10/2026, 15-10-26 (day first)
  if ((m = /^(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2}|\d{4}))?$/.exec(t))) {
    const year = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : y0;
    return validDate(year, +m[2] - 1, +m[1]);
  }
  // 2026-10-15
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t))) return validDate(+m[1], +m[2] - 1, +m[3]);

  return null;
};

// ---------- date arithmetic ----------

// returns the start of the day `n` days from `d` (time of day is dropped)
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

// clamps to month end, so an anchor on the 31st lands on the 30th/28th where needed
export const addMonths = (d: Date, n: number) => {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const lastDay = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), lastDay));
};

// "2026-10-18", a sortable day key (cheaper than formatDatetime(d, 'yyyy-mm-dd'))
export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;