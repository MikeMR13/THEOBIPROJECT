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
