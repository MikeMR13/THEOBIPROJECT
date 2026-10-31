// Rutas exclusivas por trabajo de importación; nunca sobrescribir multimedia existente.
// Cada intento reserva un nombre nuevo (también en el subdirectorio fuentes/).
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function makeImportUploadPath(baseDir,jobId) {
  if(typeof baseDir!=='string'||!baseDir.endsWith('/')||baseDir.includes('..')||
    !UUID.test(String(jobId||''))) throw new Error('Directorio o trabajo de importación inválido');
  const run=jobId.replace(/-/g,'').toLowerCase();
  let sequence=0;
  return (subdir,filename)=>{
    if(subdir!==''&&subdir!=='fuentes/') throw new Error('Subcarpeta de importación no permitida');
    const safe=String(filename||'recurso').replace(/[^\w.-]/g,'_').replace(/^\.+/,'')||'recurso';
    const extension=safe.match(/\.[a-z0-9]{1,10}$/i)?.[0]||'';
    const stem=(extension?safe.slice(0,-extension.length):safe)||'recurso';
    const suffix='-'+run+'-'+(++sequence);
    const reserved=Math.max(1,180-suffix.length-extension.length);
    return baseDir+subdir+stem.slice(0,reserved)+suffix+extension;
  };
}

export function isImportStorageConflict(error) {
  const code=String(error?.code||error?.error||'').toLowerCase();
  const status=Number(error?.statusCode??error?.status);
  const message=String(error?.message||'');
  return code==='keyalreadyexist'||code==='resourcealreadyexists'||
    (status===409 && /already exists|duplicate|ya existe/i.test(message));
}

export async function uploadImportAsset(bucket,nextPath,{subdir='',filename,blob,contentType},uploaded) {
  if(!bucket||typeof bucket.upload!=='function'||!Array.isArray(uploaded))
    throw new Error('Almacenamiento de importación no disponible');
  for(let attempt=0;attempt<3;attempt++){
    const path=nextPath(subdir,filename);
    const {error}=await bucket.upload(path,blob,{contentType,upsert:false});
    if(!error){uploaded.push(path);return path;}
    if(!isImportStorageConflict(error)||attempt===2)throw error;
  }
  throw new Error('No se pudo reservar una ruta de multimedia');
}
