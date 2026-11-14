const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const WEEKDAYS_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

export const parseISODate = (iso: string): Date => new Date(`${iso}T00:00:00`);

export const toISODate = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const todayISO = (): string => toISODate(new Date());

export const formatDateLong = (iso: string): string => {
  const date = parseISODate(iso);
  const weekday = WEEKDAYS_LONG[date.getDay()];
  return `${weekday}, ${date.getDate()} de ${MONTHS_LONG[date.getMonth()]} de ${date.getFullYear()}`;
};

export const formatDateMedium = (iso: string): string => {
  const date = parseISODate(iso);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`;
};

export const formatDateShort = (iso: string): string => {
  const date = parseISODate(iso);
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS_SHORT[date.getMonth()]}`;
};

export const formatMonthYear = (date: Date): string =>
  `${MONTHS_LONG[date.getMonth()]} ${date.getFullYear()}`;

export const monthShort = (monthIndex: number): string => MONTHS_SHORT[monthIndex];

export const initials = (name: string): string => {
  const clean = name
    .replace(/^(Dra?\.|Enf\.|Lic\.)\s*/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (clean.length === 0) {
    return 'HT';
  }
  const first = clean[0].charAt(0);
  const last = clean.length > 1 ? clean[clean.length - 1].charAt(0) : '';
  return `${first}${last}`.toUpperCase();
};

export const greetingByHour = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 'Buenos días';
  }
  if (hour < 19) {
    return 'Buenas tardes';
  }
  return 'Buenas noches';
};
