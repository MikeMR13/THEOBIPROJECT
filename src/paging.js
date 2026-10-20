// Lectura completa mediante páginas PostgREST, sin frameworks ni dependencias.
// El llamador define un orden estable antes de .range(from, to); no se truncan
// resultados silenciosamente al alcanzar el max_rows de Supabase.
export async function readPages(load, { size = 250, maxPages = 80 } = {}) {
  if (!Number.isInteger(size) || size < 1 || size > 1000) throw new RangeError('Tamaño de página inválido');
  if (!Number.isInteger(maxPages) || maxPages < 1) throw new RangeError('Límite de páginas inválido');
  const out = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * size;
    const result = await load(from, from + size - 1);
    if (result?.error) throw result.error;
    if (!Array.isArray(result?.data)) throw new Error('Respuesta incompleta de Supabase');
    out.push(...result.data);
    if (result.data.length < size) return { data: out, error: null };
  }
  throw new Error('Se alcanzó el límite seguro de páginas; ajusta la paginación');
}
