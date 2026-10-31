// Clasificación editorial del índice. Se comparte entre Studio, importación y lector.
// No modifica el formato de capítulos ni su numeración interna.
export const SECTION_TYPES = Object.freeze([
  'Capítulo', 'Prólogo', 'Interludio', 'Epílogo', 'Afterword', 'Extra',
  'Créditos', 'Ilustraciones', 'Episodio corto', 'Avance',
  'Portada', 'Sinopsis', 'Índice', 'Dedicatoria', 'Agradecimientos', 'Nota editorial'
]);

export const SECTION_LABELS = Object.freeze({
  'Portada': 'Portada', 'Créditos': 'Créditos', 'Sinopsis': 'Sinopsis',
  'Índice': 'Índice', 'Dedicatoria': 'Dedicatoria',
  'Ilustraciones': 'Ilustraciones', 'Prólogo': 'Prólogo', 'Capítulo': 'Cap.',
  'Interludio': 'Interludio', 'Epílogo': 'Epílogo',
  'Afterword': 'Epílogo del autor', 'Extra': 'Extra',
  'Episodio corto': 'Episodio corto', 'Avance': 'Avance',
  'Agradecimientos': 'Agradecimientos', 'Nota editorial': 'Nota editorial'
});

// Propuesta inicial para importar: el equipo puede corregir el tipo en la vista previa.
// Solo títulos que comiencen con términos editoriales inequívocos; los demás son capítulos.
export function inferSectionType(title) {
  const t = String(title || '').trim();
  if (/^(?:portada|cubierta|cover)(?:\b|$)/i.test(t)) return 'Portada';
  if (/^(?:cr[eé]ditos|credits?|colof[oó]n)(?:\b|$)/i.test(t)) return 'Créditos';
  if (/^(?:sinopsis|synopsis)(?:\b|$)/i.test(t)) return 'Sinopsis';
  if (/^(?:[íi]ndice|table of contents|contenido)(?:\b|$)/i.test(t)) return 'Índice';
  if (/^(?:dedicatoria|dedication)(?:\b|$)/i.test(t)) return 'Dedicatoria';
  if (/^(?:ilustraciones?|illustrations?|galer[ií]a de ilustraciones|カラー口絵|挿絵)(?:\b|$)/i.test(t)) return 'Ilustraciones';
  if (/^(?:episodio corto|historias? cortas?|short (?:story|episode)|短編)(?:\b|$)/i.test(t)) return 'Episodio corto';
  if (/^(?:avance|adelanto|preview|next episode|pr[oó]ximo episodio|次回予告)(?:\b|$)/i.test(t)) return 'Avance';
  if (/^(?:pr[oó]logo|prologue)(?:\b|$)/i.test(t)) return 'Prólogo';
  if (/^(?:ep[ií]logo|epilogue)(?:\b|$)/i.test(t)) return 'Epílogo';
  if (/^(?:afterword|palabras del autor|nota final del autor)(?:\b|$)/i.test(t)) return 'Afterword';
  if (/^(?:interludio|interlude)(?:\b|$)/i.test(t)) return 'Interludio';
  if (/^(?:agradecimientos|acknowledg(?:e)?ments)(?:\b|$)/i.test(t)) return 'Agradecimientos';
  if (/^(?:nota editorial|nota del editor|editorial note)(?:\b|$)/i.test(t)) return 'Nota editorial';
  return 'Capítulo';
}
