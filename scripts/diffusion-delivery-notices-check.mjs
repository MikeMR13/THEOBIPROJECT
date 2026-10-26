import assert from 'node:assert/strict';
import {immediateDeliveryNotice,automaticDeliveryNotice} from '../src/diffusion-delivery-notices.js';
const sent={status:'sent'},unknown={status:'uncertain'},blocked={status:'blocked'};
assert.equal(immediateDeliveryNotice([sent]),'Aviso enviado correctamente a 1 canal.');
assert.equal(immediateDeliveryNotice([sent,sent]),'Aviso enviado correctamente a 2 canales.');
assert.equal(immediateDeliveryNotice([sent,unknown]),'Aviso enviado a 1 de 2 canales. Comprueba los destinos no confirmados antes de repetir.');
assert.doesNotMatch(immediateDeliveryNotice([unknown,blocked]),/enviado correctamente|Aviso enviado a/);
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
