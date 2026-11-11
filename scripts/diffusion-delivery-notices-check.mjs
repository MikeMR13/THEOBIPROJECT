import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {immediateDeliveryNotice,automaticDeliveryNotice} from '../src/diffusion-delivery-notices.js';
const sent={status:'sent'},unknown={status:'uncertain'},blocked={status:'blocked'},already={status:'already'};
assert.equal(immediateDeliveryNotice([sent]),'Aviso enviado correctamente a 1 canal.');
assert.equal(immediateDeliveryNotice([sent,sent]),'Aviso enviado correctamente a 2 canales.');
assert.equal(immediateDeliveryNotice([sent,unknown]),'Aviso enviado a 1 de 2 canales. Comprueba los destinos no confirmados antes de repetir.');
assert.doesNotMatch(immediateDeliveryNotice([unknown,blocked]),/enviado correctamente|Aviso enviado a/);
assert.equal(immediateDeliveryNotice([already,already]),
 'Esta publicación ya se anunció anteriormente en 2 canales. No se envió ningún duplicado.');
assert.equal(immediateDeliveryNotice([already,blocked]),
 'Ya se había anunciado en 1 canal. No hay nuevos envíos confirmados; revisa los demás destinos.');
assert.doesNotMatch(immediateDeliveryNotice([already,already]),/Aviso enviado|enviado correctamente/);
const ui=readFileSync(new URL('../src/diffusion-panel.js',import.meta.url),'utf8');
assert.ok(ui.includes("results.some(r=>r.status==='sent'||r.status==='already')"),
 'La interfaz debe avisar explícitamente que el contenido ya fue anunciado.');
assert.ok(ui.includes('Las reglas no envían avisos por activarse o por guardar un borrador'),
 'El estado automático debe explicar por qué no hay avisos.');
const conns=[{id:'d',label:'Noticias',provider:'discord'},{id:'t',label:'Lectores',provider:'telegram'}];
const previous=[{id:'1',status:'planned',delivery_mode:'automatic',provider:'discord',connection_id:'d'},
 {id:'2',status:'planned',delivery_mode:'automatic',provider:'telegram',connection_id:'t'},
 {id:'3',status:'planned',delivery_mode:'manual',provider:'discord',connection_id:'d'}];
const next=[{...previous[0],status:'sent'},{...previous[1],status:'unknown'},{...previous[2],status:'sent'}];
assert.equal(automaticDeliveryNotice(previous,next,conns),'Aviso enviado automáticamente a 1 canal: Discord · Noticias.');
assert.equal(automaticDeliveryNotice(next,next,conns),'','Nunca mostrar dos veces el aviso de una entrega ya vista');
assert.equal(automaticDeliveryNotice([],next,conns),'','No inventar entrega de envíos anteriores a abrir Calendario');
assert.equal(automaticDeliveryNotice(previous,[{...previous[0],status:'planned'},{...previous[1],status:'unknown'},{...previous[2],status:'sent'}],conns),'','No confundir programación/falla/manual con confirmación automática');
console.log('Aviso enviado: manual completo/parcial e identificador automático sin falsos positivos — PASS');
