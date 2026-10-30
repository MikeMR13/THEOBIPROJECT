// Convierte portadas grandes en el cliente, sin servicios de imágenes de pago.
// Si la conversión no mejora el peso, conservar el original validado.
export async function optimizeStudioCover(file, maxWidth=1200, maxHeight=1600) {
  if (!file || !/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return file;
  let bitmap;
  try {
    bitmap=await createImageBitmap(file);
    const factor=Math.min(1,maxWidth/bitmap.width,maxHeight/bitmap.height);
    const width=Math.max(1,Math.round(bitmap.width*factor));
    const height=Math.max(1,Math.round(bitmap.height*factor));
    if (width*height>12000000) return file;
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');if(!ctx)return file;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(bitmap,0,0,width,height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));
    return blob?.type==='image/webp' && blob.size>0 && blob.size<file.size ? blob : file;
  } catch {return file;} finally {bitmap?.close?.();}
}
