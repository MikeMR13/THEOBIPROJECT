// Los ajustes locales de lectura nunca deben heredarse entre cuentas del mismo navegador.
export const readerPrefsKey = userId => userId ? 'obi-reader-prefs:user:' + userId : 'obi-reader-prefs';
export const emptyReaderPrefs = () => ({ global: {}, per_volume: {} });
export function readReaderPrefs(store, userId) {
  try {
    const raw=JSON.parse(store.getItem(readerPrefsKey(userId)) || 'null');
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { global: raw.global && typeof raw.global === 'object' && !Array.isArray(raw.global) ? raw.global : {},
          per_volume: raw.per_volume && typeof raw.per_volume === 'object' && !Array.isArray(raw.per_volume) ? raw.per_volume : {} }
      : emptyReaderPrefs();
  } catch { return emptyReaderPrefs(); }
}


/*
 * Borradores locales pendientes de sincronización. Nunca se comparten entre
 * cuentas, y no se eliminan hasta que el servidor confirme la misma revisión.
 * La copia local permite cerrar una pestaña o perder la red sin perder ajustes.
 */
export const readerPrefsPendingKey = userId => userId ? 'obi-reader-prefs:pending:user:' + userId : null;
export function readPendingReaderPrefs(store, userId) {
  if (!userId) return null;
  try {
    const raw = JSON.parse(store.getItem(readerPrefsPendingKey(userId)) || 'null');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
        !raw.global || typeof raw.global !== 'object' || Array.isArray(raw.global) ||
        !raw.per_volume || typeof raw.per_volume !== 'object' || Array.isArray(raw.per_volume)) return null;
    return { global: raw.global, per_volume: raw.per_volume };
  } catch { return null; }
}
export function stageReaderPrefs(store, userId, prefs) {
  if (!userId) return false;
  try {
    const data = JSON.stringify({ global: prefs.global || {}, per_volume: prefs.per_volume || {} });
    // Escribir primero el borrador: si falla la escritura de caché no se descarta.
    store.setItem(readerPrefsPendingKey(userId), data);
    store.setItem(readerPrefsKey(userId), data);
    return true;
  } catch { return false; }
}
export function acknowledgeReaderPrefs(store, userId, snapshot) {
  if (!userId) return false;
  const pending = readPendingReaderPrefs(store, userId);
  if (!pending || JSON.stringify(pending) !== JSON.stringify(snapshot)) return false;
  try { store.removeItem(readerPrefsPendingKey(userId)); return true; }
  catch { return false; }
}

export const sameReaderAccount = (a,b) => (a || null) === (b || null);
export const readingProgressPrefix = userId => 'obi-pos-' + (userId ? userId + '__' : '');
export const readingProgressKey = (seriesId,userId) => readingProgressPrefix(userId) + seriesId;
export function readerProgressKeys(store, userId) {
  const prefix=readingProgressPrefix(userId), keys=[];
  try {
    for(let i=0;i<store.length;i++){
      const k=store.key(i);
      if(k?.startsWith(prefix) && (userId || !k.slice(prefix.length).includes('__'))) keys.push(k);
    }
  } catch {}
  return keys;
}
