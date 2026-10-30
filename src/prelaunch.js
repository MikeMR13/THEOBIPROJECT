import { creditsHTML, installCreditImageFallback } from './public-collaboration-credits.js?v=1';
import { recordPrelaunchView } from './prelaunch-views.js?v=1';
// Primer vistazo: esta vista nunca consulta ni expone capítulos borrador.
const css = '.pre-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:16px 0}.pre-actions .btn{min-height:44px}.pre-actions-note{font-size:12px;color:#a89f8a;line-height:1.5;margin:4px 0 0}.pre-card{display:grid;grid-template-columns:90px minmax(0,1fr);gap:16px;padding:16px;background:#16140f;border:1px solid #3d3628;margin:12px 0}.pre-cover{aspect-ratio:2/3;background:#29251d center/cover no-repeat}.pre-info{display:grid;gap:9px;align-content:start}.pre-info h3{margin:0}.pre-timer{color:#8cc3f2;font:700 15px monospace}.pre-lock{color:#cfc6b0;font:12px monospace}@media(max-width:560px){.pre-card{grid-template-columns:65px minmax(0,1fr);gap:10px;padding:10px}}';
function style(){if(document.getElementById('pre-css'))return;const s=document.createElement('style');s.id='pre-css';s.textContent=css;document.head.appendChild(s);}
export function cards(pre, esc, media){
 if(!pre?.volumes?.length)return '';
 style();
 return pre.volumes.map(v=>{
  const cover=v.cover_path||pre.series.cover_path;
  const date=new Date(v.published_at).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short',timeZone:window.obiTZ?.()||undefined});
  return `<article class="pre-card"><span class="pre-cover" style="${cover?`background-image:url('${esc(media(cover))}')`:''}"></span><div class="pre-info"><span style="color:#8cc3f2;font-size:12px">◷ Volumen ${+v.num} · PRÓXIMO ESTRENO</span><h3>${esc(v.title||'Volumen '+v.num)}</h3>${v.synopsis?`<p>${esc(v.synopsis)}</p>`:''}<span style="font-size:12px">Estreno: ${esc(date)}</span><span class="pre-timer" data-pre-time="${esc(v.published_at)}">Preparando cuenta regresiva…</span><span class="pre-lock">🔒 Capítulos y enlaces bloqueados hasta el estreno.</span><button class="btn ghost" data-pre-rem="${esc(v.id)}" type="button">🔔 Avísame al publicarse</button></div></article>`;
 }).join('');
}
export function landing(pre, app, esc, media){
 style();installCreditImageFallback();
 const s=pre.series,cover=s.cover_path||pre.volumes[0]?.cover_path;
 const translated={...s,teams:s.teams||{name:s.team_name,slug:s.team_slug}};
 const translator=creditsHTML(translated,{esc,media,mode:'detail'});
 app.innerHTML=`<div class="ui-wrap ui-series-page"><section class="ui-sh" style="--c:#8cc3f2;--bg:none"><span class="ui-book" style="${cover?`background-image:url('${esc(media(cover))}')`:''}"></span><div><span class="ui-lbl" style="color:#8cc3f2">PRÓXIMO ESTRENO · PRIMER VISTAZO</span><h1>${esc(s.title)}</h1><p>${esc(s.work_type||'Novela ligera')}${Array.isArray(s.genres)&&s.genres.length?' · '+s.genres.map(esc).join(' · '):''}${s.adult?' · +18':''}</p><p class="ui-syn">${esc(s.synopsis||'Descubre esta obra próximamente.')}</p><p class="mono">${s.author?'Autor: '+esc(s.author)+' · ':''}${s.illustrator?'Ilustración: '+esc(s.illustrator)+' · ':''}</p><div class="pre-credits"><span class="ui-lbl">Traducción</span>${translator}</div><p class="mono">Ficha pública de anuncio. La lectura aún está bloqueada.</p><div class="ui-series-actions pre-actions"><button type="button" class="btn ghost" data-pre-follow aria-pressed="false" aria-label="Seguir esta obra para enterarte de sus publicaciones">＋ Seguir obra</button><a class="btn ghost" href="/equipo/${encodeURIComponent(s.team_slug||s.teams?.slug||'')}">Ver equipo traductor</a></div><p class="pre-actions-note">Puedes seguir esta obra desde ahora y activar un recordatorio por volumen si quieres un aviso del estreno. «Compartir» utiliza únicamente el enlace público; nunca incluye capítulos borrador.</p></div></section><section><div class="ui-h2"><h2>Volúmenes anunciados</h2></div>${cards(pre,esc,media)}</section></div>`;
}
export function bind(pre,app,sb,getUser,go,toast){
 if(!pre?.volumes?.length)return;
 void recordPrelaunchView(sb,pre); // Medición agregada, jamás bloquea la lectura o los controles.
 const follow = app.querySelector('[data-pre-follow]');
 if (follow) {
  let active = false, busy = false;
  const paint = () => { follow.textContent = active ? '✓ Siguiendo obra' : '＋ Seguir obra'; follow.setAttribute('aria-pressed', String(active)); };
  const initialUser = getUser();
  if (initialUser) {
   follow.disabled = true;
   Promise.resolve(sb.from('follows').select('series_id').eq('user_id', initialUser.id).eq('series_id', pre.series.id).maybeSingle())
    .then(({ data, error }) => { if (error) throw error; if (follow.isConnected && getUser()?.id === initialUser.id) { active = !!data; paint(); } })
    .catch(e => { if (follow.isConnected) toast(e.message || 'No se pudo comprobar el seguimiento'); })
    .finally(() => { if (follow.isConnected) follow.disabled = false; });
  }
  follow.onclick = async () => {
   const user = getUser();
   if (!user) { toast('Entra para seguir esta obra'); return go('/entrar'); }
   if (busy) return;
   busy = true; follow.disabled = true;
   try {
    const res = active
     ? await sb.from('follows').delete().eq('user_id', user.id).eq('series_id', pre.series.id)
     : await sb.from('follows').upsert({ user_id: user.id, series_id: pre.series.id });
    if (res.error) throw res.error;
    if (follow.isConnected && getUser()?.id === user.id) {
     active = !active; paint(); toast(active ? 'Ahora sigues esta obra' : 'Ya no sigues esta obra');
    }
   } catch (e) { if (follow.isConnected) toast(e.message || 'No se pudo guardar el seguimiento'); }
   finally { busy = false; if (follow.isConnected) follow.disabled = false; }
  };
 }
 const target=app.querySelector('[data-pre-time]');if(!target)return;
 let lastCheck=0;
 const draw=()=>{if(!target.isConnected){clearInterval(timer);return;}let expired=false;app.querySelectorAll('[data-pre-time]').forEach(el=>{
  const d=Math.max(0,Date.parse(el.dataset.preTime)-Date.now());
  if(!d){expired=true;el.textContent='¡Llegó el estreno! Comprobando disponibilidad…';return;}
  const z=n=>String(n).padStart(2,'0');
  el.textContent=`${Math.floor(d/864e5)} d · ${z(Math.floor(d%864e5/36e5))} h · ${z(Math.floor(d%36e5/6e4))} min · ${z(Math.floor(d%6e4/1e3))} s`;
 });if(expired && Date.now()-lastCheck>15000){lastCheck=Date.now();sb.from('volumes').select('id').in('id',pre.volumes.map(v=>v.id)).eq('status','published').then(({data})=>{if(data?.length&&target.isConnected)location.reload();});}};
 const timer=setInterval(draw,1000);draw();
 app.querySelectorAll('[data-pre-rem]').forEach(async b=>{
  const v=pre.volumes.find(v=>v.id===b.dataset.preRem);if(!v)return;
  const at=new Date(v.published_at).toISOString();
  const where=()=>sb.from('reminders').select('id').eq('series_id',pre.series.id).eq('kind','volp').eq('at',at).is('sent_at',null);
  let id=null, ready=false;
  const sync = async () => {
   const u=getUser(); if(!u){ready=true;return;}
   b.disabled=true;
   try {
    const {data,error}=await where().eq('user_id',u.id).maybeSingle();
    if(error) throw error;
    if(b.isConnected&&getUser()?.id===u.id){id=data?.id||null;ready=true;b.textContent=id?'✓ Recordatorio activado':'🔔 Avísame al publicarse';}
   }catch(e){ready=false;toast(e.message||'No se pudo comprobar el recordatorio');}
   finally{if(b.isConnected)b.disabled=false;}
  };
  await sync();
  b.onclick=async()=>{
   const u=getUser();if(!u){toast('Entra para activar avisos');return go('/entrar');}
   if(!ready){await sync();if(!ready)return;}
   b.disabled=true;
   try {
    if(id){
     const r=await sb.from('reminders').delete().eq('id',id).eq('user_id',u.id);
     if(r.error)throw r.error;
     id=null;b.textContent='🔔 Avísame al publicarse';
    }else{
     const r=await sb.from('reminders').upsert({user_id:u.id,series_id:pre.series.id,kind:'volp',at,label:'Volumen '+v.num},{onConflict:'user_id,series_id,kind,at'}).select('id').single();
     if(r.error)throw r.error;
     id=r.data.id;b.textContent='✓ Recordatorio activado';
    }
   }catch(e){toast(e.message||'No se pudo guardar el aviso');await sync();}
   finally{b.disabled=false;}
  };
 });
}