// Normaliza solo las dos erratas editoriales conocidas de la configuración pública.
// No toca enlaces, modos de apoyo, Patreon ni la configuración almacenada.
export function normalizeSupportCopy(config = {}) {
  const source = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  const title = source.title === 'Apoya a la El Obi del Lector'
    ? 'Apoya a El Obi del Lector' : source.title;
  const intro = typeof source.intro === 'string'
    ? source.intro.replace(/\bptoyecto\b/g, 'proyecto') : source.intro;
  return { ...source, title, intro };
}
