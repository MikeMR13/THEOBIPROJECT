// Visitas a fichas públicas: métricas aisladas de las lecturas y sin identificación en claro.
const TOKEN_KEY = 'obi:series-profile-visit';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function dailyProfileToken(storage, cryptoSource, now = new Date()) {
  if (!storage || !cryptoSource?.randomUUID) return null;
  try {
    const day = new Date(now).toISOString().slice(0, 10);
    const previous = JSON.parse(storage.getItem(TOKEN_KEY) || 'null');
    if (previous?.day === day && UUID_PATTERN.test(previous.token || '')) return previous.token;
    const token = cryptoSource.randomUUID();
    storage.setItem(TOKEN_KEY, JSON.stringify({ day, token }));
    return token;
  } catch {
    return null; // Las preferencias de privacidad del navegador prevalecen.
  }
}

export async function recordSeriesProfileVisit(sb, seriesId, user = null) {
  if (!seriesId || !sb?.rpc) return false;
  const token = user?.id ? null : dailyProfileToken(
    typeof localStorage === 'undefined' ? null : localStorage,
    typeof crypto === 'undefined' ? null : crypto
  );
  if (!user?.id && !token) return false;
  const { data, error } = await sb.rpc('track_series_profile_visit', {
    p_series: seriesId, p_device: token
  });
  if (error) return false; // La ausencia de la migración nunca impide abrir la ficha.
  return data === true;
}

export function profileVisitRanking(sb, { period = 'semana', genre = null, status = null, limit = 20 } = {}) {
  return sb.rpc('series_profile_ranking', {
    p_period: period, p_genre: genre, p_status: status, p_limit: limit
  });
}
