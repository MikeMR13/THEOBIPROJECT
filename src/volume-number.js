// Números editoriales de volumen: un decimal (4.5) sin alterar los ID de los capítulos.
export const parseVolumeNumber = value => {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!/^(?:[1-9]\d{0,2})(?:\.\d)?$/.test(raw))
    throw new Error('Escribe un volumen entre 1 y 999, con hasta un decimal (por ejemplo, 4.5).');
  const num = Number(raw);
  if (!Number.isFinite(num) || num < 1 || num > 999)
    throw new Error('El número de volumen debe estar entre 1 y 999.');
  return num;
};
export const nextVolumeNumber = nums =>
  Math.floor(Math.max(0, ...nums.map(num => Number(num) || 0))) + 1;

// Importación: un número fraccionario explícito del archivo (4.5) prevalece
// sobre el siguiente entero disponible, incluso al importar desde una obra.
export const importedVolumeNumber = ({ filename = '', title = '', metadataIndex = null, fallback = 1 } = {}) => {
  const fraction = text => {
    for (const match of String(text || '').matchAll(/(?:^|[\s([_-])([1-9]\d{0,2}[.,]\d)(?=$|[\s)\]_.-])/g)) {
      try { return parseVolumeNumber(match[1]); } catch {}
    }
    return null;
  };
  const fromFilename = fraction(filename);
  if (fromFilename != null) return fromFilename;
  const fromTitle = fraction(title);
  if (fromTitle != null) return fromTitle;
  if (metadataIndex !== null && metadataIndex !== undefined && String(metadataIndex).trim()) {
    try { return parseVolumeNumber(metadataIndex); } catch {}
  }
  const labeled = /(?:vol(?:umen|ume)?\.?|tomo|libro)\s*([1-9]\d{0,2})(?![\d.,])/i;
  for (const text of [title, filename]) {
    const match = String(text || '').match(labeled);
    if (match) return parseVolumeNumber(match[1]);
  }
  return parseVolumeNumber(fallback);
};
