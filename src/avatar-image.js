// Avatar ligero: recorte cuadrado proporcional antes de subirlo a Storage.
// Si el navegador no puede decodificar/convertir, la validación original sigue funcionando.
export async function optimizeAvatar(file, size = 256) {
  if (!file || !/^image\/(?:jpeg|png|webp)$/.test(file.type)) throw new Error('Imagen no admitida');
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const side = Math.min(bitmap.width, bitmap.height);
    if (!side || !Number.isFinite(side)) return file;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    const out = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
    // Nunca aumentar el peso del avatar ni escribir un archivo vacío.
    return out && out.size > 0 && out.size < file.size ? out : file;
  } catch { return file; }
  finally { bitmap?.close?.(); }
}
