// Verifica que la UI no use burbujas nativas del navegador y que el
// diálogo unificado esté disponible desde los módulos de la plataforma.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const files=readdirSync('src').filter(n=>n.endsWith('.js'));
let seen=0, converted=0;
for(const name of files){
 const path=join('src',name),source=readFileSync(path,'utf8');
 const native=source.match(/(?<![\w.])(?:confirm|alert|prompt)\s*\(/g)||[];
 assert.equal(native.length,0,name+' contiene ventanas nativas del navegador: '+native);
 if(source.includes('confirmObi(')||source.includes('promptObi(')||source.includes('alertObi(')){
  const parse=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});
  assert.equal(parse.status,0,'Sintaxis '+name+': '+parse.stderr);
  if(name!=='dialogs.js')assert(source.includes("from './dialogs.js'"),name+' necesita importar diálogos');
  converted++;
 }
 seen++;
}
const dialog=readFileSync('src/dialogs.js','utf8');
for(const marker of ['aria-modal','aria-labelledby','aria-describedby','Escape','Tab','prev.focus()','type===\'prompt\'','Cancel','document.createElement']) {
 assert(dialog.includes(marker),'Diálogos: falta '+marker);
}
assert(converted>=11,'Migración incompleta de secciones principales');
console.log('✓ '+seen+' módulos libres de confirm, alert y prompt nativos; '+converted+' módulos migrados');
