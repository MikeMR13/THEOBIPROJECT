// Clasificación editorial del índice. Se comparte entre Studio, importación y lector.
// No modifica el formato de capítulos ni su numeración interna.
export const SECTION_TYPES = Object.freeze([
  'Capítulo', 'Prólogo', 'Interludio', 'Epílogo', 'Afterword', 'Extra',
  'Créditos', 'Ilustraciones', 'Episodio corto', 'Avance'
]);

export const SECTION_LABELS = Object.freeze({
  'Capítulo': 'Cap.', 'Prólogo': 'Prólogo', 'Interludio': 'Interludio',
  'Epílogo': 'Epílogo', 'Afterword': 'Epílogo del autor', 'Extra': 'Extra',
  'Créditos': 'Créditos', 'Ilustraciones': 'Ilustraciones',
  'Episodio corto': 'Episodio corto', 'Avance': 'Avance'
});

// Propuesta inicial para importar: el equipo puede corregir el tipo en la vista previa.
// Solo títulos que comiencen con términos editoriales inequívocos; los demás son capítulos.
export function inferSectionType(title) {
  const t = String(title || '').trim();
  if (/^(?:cr[eé]ditos|credits?|colof[oó]n)(?:\b|$)/i.test(t)) return 'Créditos';
  if (/^(?:ilustraciones?|illustrations?|galer[ií]a de ilustraciones|カラー口絵|挿絵)(?:\b|$)/i.test(t)) return 'Ilustraciones';
  if (/^(?:episodio corto|historias? cortas?|short (?:story|episode)|短編)(?:\b|$)/i.test(t)) return 'Episodio corto';
  if (/^(?:avance|adelanto|preview|next episode|pr[oó]ximo episodio|次回予告)(?:\b|$)/i.test(t)) return 'Avance';
  if (/^(?:pr[oó]logo|prologue)(?:\b|$)/i.test(t)) return 'Prólogo';
  if (/^(?:ep[ií]logo|epilogue)(?:\b|$)/i.test(t)) return 'Epílogo';
  if (/^(?:afterword|palabras del autor|nota final del autor)(?:\b|$)/i.test(t)) return 'Afterword';
  if (/^(?:interludio|interlude)(?:\b|$)/i.test(t)) return 'Interludio';
  return 'Capítulo';
}
