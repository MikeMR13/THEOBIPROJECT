// Fase 3: seguridad visual de integrantes, anuncios y conversión del perfil público.
import assert from 'node:assert/strict';
import { normalize, render, fillFollow, exportTheme } from '../src/teampage.js';

const escapeHtml = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const members = Array.from({length: 9}, (_, i) => ({
  role: i === 0 ? 'owner' : 'member',
  profiles: { username: i === 8 ? '<img src=x onerror=alert(1)>' : 'Traductor ' + (i+1) },
  team_roles: { name: i === 1 ? 'Correctora' : 'Traductor', color: i === 0 ? '#dd8844' : i === 8 ? 'url(javascript:evil)' : '#4444aa' }
}));
const data = {
  t: { name:'Equipo Sakura',slug:'equipo-sakura',color:'#b76c7c',
    settings:{show_members:true,show_stats:true},bio:'Equipo público' },
  works:[],recent:[],mem:members,next:null
};
const ctx={esc:escapeHtml,media: v=>v,sim:''};
const html=(design={}, source=data)=>render(source,design,ctx);
const def=normalize(null);
assert.deepEqual(def.community, {
  memberStyle:'tarjetas',memberCount:6,showRoles:true,announceStyle:'editorial',
  showCta:true,ctaText:'Gracias por apoyar nuestras traducciones'
});
const invalid=normalize({community:{
  memberStyle:'javascript',memberCount:1000,announceStyle:'evil',
  showRoles:false,showCta:false,ctaText:'x'.repeat(500)
}});
assert.equal(invalid.community.memberStyle,'tarjetas');
assert.equal(invalid.community.memberCount,6);
assert.equal(invalid.community.announceStyle,'editorial');
assert.equal(invalid.community.showRoles,false);
assert.equal(invalid.community.showCta,false);
assert.equal(invalid.community.ctaText.length,120);

for (const template of ['revista','clasica','editorial']) {
  const out=html({template,announce:{title:'Reunión del equipo',text:'Nuevas traducciones',until:'2999-12-31',url:'/biblioteca'},
    community:{memberStyle:'tarjetas',memberCount:4,announceStyle:'editorial'}});
  assert.match(out,/class="tp2-sec tp2-members-sec"/);
  assert.match(out,/data-view="tarjetas"/);
  assert.match(out,/Nuestro equipo/);
  assert.match(out,/Ver 5 integrantes más/);
  assert.equal((out.match(/class="tp2-person"/g)||[]).length,9);
  assert.match(out,/tp2-ann-editorial/);
  assert.match(out,/Reunión del equipo/);
  assert.match(out,/class="tp2-community-cta"/);
  assert.match(out,/class="tp2-fslot3"/);
  assert.doesNotMatch(out,/<img src=x onerror/);
  assert.match(out,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(out,/url\(javascript:evil\)/);
  assert.match(out,/--role-ac:#dd8844/);
}
const labels=html({community:{memberStyle:'etiquetas',memberCount:12,showRoles:false,showCta:false,announceStyle:'compacto'},
  announce:{title:'Aviso',text:'Mensaje'}});
assert.match(labels,/data-view="etiquetas"/);
assert.doesNotMatch(labels,/<small>Correctora<\/small>/);
assert.doesNotMatch(labels,/tp2-community-cta/);
assert.doesNotMatch(labels,/tp2-member-more/);
assert.match(labels,/tp2-ann-compacto/);

const list=html({community:{memberStyle:'lista',memberCount:4,ctaText:'Apoya nuestras novedades'}});
assert.match(list,/data-view="lista"/);
assert.match(list,/Apoya nuestras novedades/);
const hidden=html({hidden:['members','announce'],announce:{title:'Oculto',text:'No visible'}});
assert.doesNotMatch(hidden,/id="grupo-integrantes"/);
assert.doesNotMatch(hidden,/id="grupo-anuncios"/);
assert.doesNotMatch(hidden,/href="#grupo-integrantes"/);
const disabled=html({}, {...data,t:{...data.t,settings:{show_members:false}},mem:[]});
assert.doesNotMatch(disabled,/class="tp2-person"/);
assert.doesNotMatch(disabled,/href="#grupo-integrantes"/);
const expired=html({announce:{title:'Caducado',text:'Texto',until:'2000-01-01'}});
assert.doesNotMatch(expired,/Caducado/);

const slot1={innerHTML:''},slot2={innerHTML:''},slot3={innerHTML:''}, count={textContent:''};
const fakeRoot={
  dataset:{followLabel:'grupo'},
  querySelectorAll(query){
    if (query==='.tp2-fslot,.tp2-fslot2,.tp2-fslot3') return [slot1,slot2,slot3];
    if (query==='[data-follow-count]') return [count];
    throw new Error('Selector inesperado: '+query);
  }
};
fillFollow(fakeRoot,false,23);
assert.ok([slot1,slot2,slot3].every(s=>/Seguir grupo/.test(s.innerHTML)));
assert.equal(count.textContent,'23');
fillFollow(fakeRoot,true,24);
assert.ok([slot1,slot2,slot3].every(s=>/Siguiendo/.test(s.innerHTML)));
assert.equal(count.textContent,'24');

const exportData=JSON.parse(exportTheme('Equipo', normalize({community:{showCta:false,memberStyle:'lista'},accent:'#aa6611'})));
assert.equal(exportData.design.community,undefined);
assert.equal(exportData.design.accent,'#aa6611');

const previewAnn = html({ announce: { title: 'Anuncio de prueba', text: 'Visible', until: '2999-12-31' }, community: { announceStyle: 'compacto' } });
const previewMatch = previewAnn.match(/<aside class="tp2-ann[^"]*"[^>]*>[\s\S]*?<\/aside>/)?.[0];
assert.ok(previewMatch?.includes('Anuncio de prueba'), 'El preview de Studio extrae el anuncio con estilos nuevos');

console.log('Perfil grupal Fase 3: integrantes públicos, privacidad, anuncios, CTA y 3 plantillas OK');
