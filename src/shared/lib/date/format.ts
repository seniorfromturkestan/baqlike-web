/**
 * src/shared/lib/date/format.ts
 * Утилиты форматирования дат, времени и таймера смены
 */

/**
 * Дополняет число нулями слева до нужной длины
 */
const padZero = (value: number, length = 2): string => {
  return String(value).padStart(length, '0');
};

/**
 * Универсальный парсер любых типов времени (Date, number ms, ISO string, Firestore Timestamp, объект с time/timestamp)
 * в миллисекунды эпохи (number).
 */
export const parseToTimestamp = (val: any): number | null => {
  if (!val) return null;
  if (val instanceof Date) {
    const t = val.getTime();
    return isNaN(t) ? null : t;
  }
  if (typeof val === 'number') {
    if (isNaN(val)) return null;
    return val > 100000000000 ? val : val * 1000;
  }
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
    const num = Number(val);
    if (!isNaN(num)) return num > 100000000000 ? num : num * 1000;
    return null;
  }
  if (typeof val.toDate === 'function') {
    try {
      const d = val.toDate();
      return d instanceof Date && !isNaN(d.getTime()) ? d.getTime() : null;
    } catch {}
  }
  if (val.seconds !== undefined) return val.seconds * 1000;
  if (val._seconds !== undefined) return val._seconds * 1000;
  if (val.timestamp) return parseToTimestamp(val.timestamp);
  if (val.time) return parseToTimestamp(val.time);
  return null;
};

/**
 * Преобразует миллисекунды или секунды в строку таймера смены: HH:mm:ss
 * @param durationMs Длительность в миллисекундах
 */
export const formatDuration = (durationMs: number): string => {
  if (durationMs < 0 || isNaN(durationMs)) return '00:00:00';

  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
};

/**
 * Расчет времени, прошедшего с момента начала смены
 * @param checkInTimestamp Время начала смены
 */
export const getShiftDurationFromStart = (checkInTimestamp: any): string => {
  const start = parseToTimestamp(checkInTimestamp);
  if (!start) return '00:00:00';
  const now = Date.now();
  const elapsed = Math.max(0, now - start);
  return formatDuration(elapsed);
};

/**
 * Форматирует дату в формат DD.MM.YYYY
 */
export const formatDate = (input: any): string => {
  const ts = parseToTimestamp(input);
  if (!ts) return '';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';

  const day = padZero(date.getDate());
  const month = padZero(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

/**
 * Форматирует время в формат HH:mm
 */
export const formatTime = (input: any): string => {
  const ts = parseToTimestamp(input);
  if (!ts) return '';
  const date = new Date(ts);
  if (isNaN(date.getTime())) return '';

  const hours = padZero(date.getHours());
  const minutes = padZero(date.getMinutes());

  return `${hours}:${minutes}`;
};

/**
 * Форматирует дату и время в формат DD.MM.YYYY, HH:mm
 */
export const formatDateTime = (input: Date | number | string | null | undefined): string => {
  if (!input) return '';
  const d = formatDate(input);
  const t = formatTime(input);
  return d && t ? `${d}, ${t}` : d || t;
};
