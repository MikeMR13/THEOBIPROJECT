// Reutilización de fuentes por SHA-256 dentro del equipo.
// Nunca se elimina aquí una fuente compartida: otra importación puede estar usándola.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
const fontType=(bytes,name)=>{
  const head=Array.from(bytes.slice(0,4));
  const sig=String.fromCharCode(...head);
  if(sig==='wOF2')return ['woff2','font/woff2'];
  if(sig==='wOFF')return ['woff','font/woff'];
  if(sig==='OTTO')return ['otf','font/otf'];
  if(head.join(',')==='0,1,0,0')return ['ttf','font/ttf'];
  const ext=/\.(woff2|woff|otf|ttf)$/i.exec(String(name||''))?.[1]?.toLowerCase()||'ttf';
  return [ext,{'woff2':'font/woff2','woff':'font/woff','otf':'font/otf','ttf':'font/ttf'}[ext]];
};
const isMissing=e=>{
  const code=String(e?.code||e?.error||'').toLowerCase();
  const message=String(e?.message||'');
  return ['not_found','nosuchkey','404'].includes(code)||
    ((Number(e?.statusCode??e?.status)===404 || Number(e?.statusCode??e?.status)===400)
      && /not found|does not exist|no such key|resource was not found/i.test(message));
};
const isConflict=e=>{
  const code=String(e?.code||e?.error||'').toLowerCase();
  return ['keyalreadyexist','resourcealreadyexists','duplicate'].includes(code)||
    ([400,409].includes(Number(e?.statusCode??e?.status)) &&
      /already exists|duplicate|ya existe/i.test(String(e?.message||'')));
};
export async function fingerprintFont(bytes,name) {
  const blob=new Blob([bytes]);
  const buffer=await blob.arrayBuffer();
  const sha256=hex(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)));
  const [extension,contentType]=fontType(new Uint8Array(buffer),name);
  return {sha256,blob,extension,contentType};
}

export function createTeamFontStore({sb,bucket,teamId,publicPrefix,maxLegacyCandidates=12}) {
  if(!UUID.test(String(teamId||''))||!publicPrefix?.endsWith('/'))
    throw new Error('Ámbito de equipo inválido para fuentes EPUB');
  if(!bucket?.download||!bucket?.upload)throw new Error('Storage de fuentes no disponible');
  const remembered=new Map(),checked=new Map();
  let candidatesPromise,legacyChecks=0;
  const pathFromUrl=url=>typeof url==='string'&&url.startsWith(publicPrefix+teamId+'/')
    ? url.slice(publicPrefix.length):'';
  const readHash=async path=>{
    if(checked.has(path))return checked.get(path);
    const {data,error}=await bucket.download(path);
    if(error) {
      if(isMissing(error)){checked.set(path,null);return null;}
      throw error;
    }
    if(!(data instanceof Blob))throw new Error('Fuente existente no verificable');
    const value=await fingerprintFont(data,path);
    checked.set(path,value.sha256);
    return value.sha256;
  };
  const legacyCandidates=async()=>{
    if(!candidatesPromise)candidatesPromise=(async()=>{
      if(!sb?.from)return [];
      try{
        const {data,error}=await sb.from('volumes')
          .select('epub_fonts,series!inner(team_id)')
          .eq('series.team_id',teamId).is('deleted_at',null).limit(250);
        if(error)return [];
        return (data||[]).filter(v=>v.series?.team_id===teamId)
          .flatMap(v=>Array.isArray(v.epub_fonts)?v.epub_fonts:[])
          .filter(f=>pathFromUrl(f?.url));
      }catch{return [];}
    })();
    return candidatesPromise;
  };
  return async function resolveFont(font) {
    const {sha256,blob,extension,contentType}=await fingerprintFont(font.bytes,font.name);
    const key=sha256+'.'+extension;
    if(remembered.has(key))return {...remembered.get(key),reused:true};
    // Pool compartido POR EQUIPO, con ruta determinista y sin sobrescrituras.
    const path=teamId+'/fuentes/sha256-'+sha256+'.'+extension;
    const oldHash=await readHash(path);
    if(oldHash!==null){
      if(oldHash!==sha256)throw new Error('La ruta de fuente compartida contiene datos diferentes');
      const found={path,sha256,reused:true};
      remembered.set(key,found);return {...found};
    }
    // Archivos antiguos: comparar siempre el contenido, nunca solo el nombre/familia.
    const candidates=(await legacyCandidates()).filter(f=>
      String(f.family||'')===String(font.family||'') &&
      String(f.style||'normal')===String(font.style||'normal') &&
      String(f.weight||'normal')===String(font.weight||'normal') &&
      (!f.sha256||f.sha256===sha256));
    let examined=0;
    for(const existing of candidates){
      if(examined++>=maxLegacyCandidates||legacyChecks>=maxLegacyCandidates)break;
      const oldPath=pathFromUrl(existing.url);
      try{
        if(!checked.has(oldPath))legacyChecks++;
        if(await readHash(oldPath)===sha256){
          const found={path:oldPath,sha256,reused:true};
          remembered.set(key,found);
          return {...found};
        }
      }catch{ /* No reutilizar referencias antiguas que no puedan comprobarse. */ }
    }
    const {error}=await bucket.upload(path,blob,{contentType,upsert:false});
    if(error){
      if(!isConflict(error))throw error;
      checked.delete(path);
      const nowHash=await readHash(path);
      if(nowHash!==sha256)throw new Error('Colisión de fuente: no se pudo verificar el archivo existente');
    }else checked.set(path,sha256);
    // La fuente del pool NO se apunta a uploaded (rollback). Otra importación
    // puede referenciarla antes de que este volumen se haya guardado.
    const result={path,sha256,reused:!!error};
    remembered.set(key,result);return {...result};
  };
}
