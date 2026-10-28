// Referencias estables del lector: los metadatos pueden refrescarse sin desmontar el capítulo activo.
export function adjacentChapter(chapters, current, delta) {
  if (!current) return null;
  const at = chapters.findIndex(ch => ch.id === current.id);
  return at < 0 ? null : chapters[at + delta] || null;
}

// Actualizar los objetos existentes evita romper la lectura continua, los observadores y el historial.
export function mergeChapterMetadata(previous, incoming, cachedBodies, cachedVersions) {
  const byId = new Map(previous.map(ch => [ch.id, ch]));
  const freshIds = new Set(incoming.map(ch => ch.id));
  const changed = new Set();
  const chapters = incoming.map(ch => {
    const old = byId.get(ch.id);
    if (!old) return ch;
    if (old.updated_at !== ch.updated_at) {
      cachedBodies.delete(ch.id);
      cachedVersions?.delete(ch.id);
      changed.add(ch.id);
    }
    Object.assign(old, ch);
    return old;
  });
  for (const old of previous) {
    if (freshIds.has(old.id)) continue;
    cachedBodies.delete(old.id);
    cachedVersions?.delete(old.id);
    changed.add(old.id);
  }
  return { chapters, changed };
}
