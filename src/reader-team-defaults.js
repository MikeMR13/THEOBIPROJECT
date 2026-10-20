// Preferencias que un equipo puede establecer como valores predeterminados para sus obras.
// Lista explícita: jamás persistir propiedades desconocidas ni sobrescribir preferencias de usuarios.
export const READER_TEAM_OPTIONS = Object.freeze({
  theme: [['auto','Como el sistema'],['claro','Claro'],['sepia','Sepia'],['noche','Noche cálida'],['oscuro','Oscuro'],['negro','Negro (OLED)']],
  font: [['original','Original del EPUB'],['Literata','Literata'],['serif','Serif'],['sans','Sans']],
  width: [['estrecho','Estrecho'],['normal','Normal'],['amplio','Amplio']],
  lh: [['compacto','Compacto'],['comodo','Cómodo'],['amplio','Amplio']],
  align: [['izquierda','Izquierda'],['justificada','Justificada']],
  para: [['espacio','Separados'],['sangria','Con sangría']],
  continuous: [['off','Por capítulo'],['volume','Continuo en el volumen'],['all','Continuo entre volúmenes']],
  cw: [['show','Mostrar avisos'],['icon','Solo icono'],['hide','Ocultar avisos']],
  illus: [[true,'Mostrar ilustraciones'],[false,'Ocultar ilustraciones']],
  autonext: [[false,'No avanzar automáticamente'],[true,'Avanzar automáticamente']],
  awake: [[true,'Mantener pantalla activa'],[false,'Sin bloqueo de pantalla']]
});
export const READER_TEAM_LABELS = Object.freeze({
  theme:'Tema del lector',font:'Fuente',width:'Ancho de página',lh:'Interlineado',
  align:'Alineación',para:'Párrafos',continuous:'Modo de lectura',
  cw:'Avisos de contenido',illus:'Ilustraciones',autonext:'Siguiente capítulo',awake:'Pantalla'
});
export const DEFAULT_READER_TEAM_SIZE = 20;
export function cleanReaderTeamDefaults(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out={};
  for(const [key, options] of Object.entries(READER_TEAM_OPTIONS)){
    if(!Object.hasOwn(raw,key))continue;
    const value=raw[key];
    if(options.some(([v])=>v===value))out[key]=value;
  }
  if(Number.isInteger(raw.size) && raw.size>=14 && raw.size<=30)out.size=raw.size;
  if(Number.isInteger(raw.autosecs) && raw.autosecs>=3 && raw.autosecs<=30)out.autosecs=raw.autosecs;
  return out;
}
export const readerTeamDefaultIsValid=(key,value)=>
  key==='size'?Number.isInteger(value)&&value>=14&&value<=30:
  key==='autosecs'?Number.isInteger(value)&&value>=3&&value<=30:
  !!READER_TEAM_OPTIONS[key]?.some(([v])=>v===value);
