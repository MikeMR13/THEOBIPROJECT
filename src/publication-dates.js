// Fechas públicas: nunca interpretar años abreviados como 1996 u otros años fantasma.
// Solo se valida la presentación; ningún timestamp almacenado se modifica.
const EARLIEST_PUBLIC_YEAR = 2000;

export function publicationDate(value, now = Date.now()) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:[T ][0-2]\d:[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?)?$/.test(value.trim())) return null;
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return null;
  const parsed = new Date(time);
  if (parsed.getUTCFullYear() < EARLIEST_PUBLIC_YEAR || parsed.getUTCFullYear() > new Date(now).getUTCFullYear() + 1) return null;
  // No considerar como "publicadas" fechas futuras en las etiquetas de actualizaciones.
  if (time > now + 5 * 60 * 1000) return null;
  return parsed;
}
export function publicationAge(value, now = Date.now()) {
  const parsed = publicationDate(value, now);
  if (!parsed) return '';
  const seconds = Math.max(0, (now - parsed.getTime()) / 1000);
  if (seconds < 3600) return 'hace ' + Math.max(1, Math.round(seconds / 60)) + ' min';
  if (seconds < 86400) return 'hace ' + Math.round(seconds / 3600) + ' h';
  if (seconds < 2592000) return 'hace ' + Math.round(seconds / 86400) + ' d';
  return parsed.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}
export function publicationDay(value, now = Date.now()) {
  const d = publicationDate(value, now);
  if (!d) return 'Sin fecha';
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const days = Math.round((today - d) / 864e5);
  return days <= 0 ? 'Hoy' : days === 1 ? 'Ayer' : days < 7 ? 'Esta semana' : 'Antes';
}
