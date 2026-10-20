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
