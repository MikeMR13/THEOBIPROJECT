// Modelos puros para vistas explicativas de Preferencias.
// No consultan datos, no guardan cambios ni alteran el comportamiento del lector.
export function readingPreviewDescription(p = {}) {
  const mode = p.continuous === 'volume' ? 'Lectura continua dentro del volumen'
    : p.continuous === 'all' ? 'Lectura continua entre volúmenes' : 'Lectura por capítulo';
  const next = p.continuous === 'volume' || p.continuous === 'all'
    ? 'Los capítulos enlazados continúan según el modo elegido.'
    : p.autonext === false ? 'El siguiente capítulo se abre manualmente.'
    : 'El siguiente capítulo se abrirá tras ' + Math.max(3, Math.min(30, Number(p.autosecs) || 5)) + ' segundos; puedes detenerlo.';
  const warnings = p.cw === 'hide' ? 'Los avisos de contenido no se muestran.'
    : p.cw === 'icon' ? 'Los avisos de contenido se indican con un icono.'
    : 'Los avisos de contenido se pueden desplegar.';
  const illustration = p.illus === false ? 'Ilustraciones ocultas.' : 'Ilustraciones visibles.';
  return { mode, next, warnings, illustration };
}

const SECTIONS = [
  ['favs', 'Favoritas'],
  ['seals', 'Sellos'],
  ['shelves', 'Estanterías'],
  ['reviews', 'Reseñas']
];
export function privacyPreviewModel(p = {}, sections = {}, audience = 'guest') {
  const visibility = ['all', 'auth', 'none'].includes(p.profile_visibility) ? p.profile_visibility : 'all';
  const isGuest = audience !== 'auth';
  const accessible = visibility === 'all' || (visibility === 'auth' && !isGuest);
  const headline = visibility === 'none'
    ? 'Solo tú puedes ver el carnet completo.'
    : visibility === 'auth' && isGuest
      ? 'Quien no tiene sesión iniciada no puede abrir tu carnet.'
      : isGuest ? 'Cualquier visitante puede abrir tu carnet.' : 'Los lectores con cuenta pueden abrir tu carnet.';
  const note = visibility === 'none'
    ? 'Los demás solo ven tu nombre y avatar.'
    : visibility === 'auth' && isGuest ? 'Se muestra una invitación para iniciar sesión.'
    : 'Las secciones que hayas activado se mostrarán a este visitante.';
  const visible = accessible
    ? SECTIONS.filter(([key]) => sections[key] === true).map(([, label]) => label)
        .concat(p.public_activity === true ? ['Estadísticas'] : [])
    : [];
  const hidden = SECTIONS.filter(([key]) => sections[key] !== true).map(([, label]) => label)
    .concat(p.public_activity === true ? [] : ['Estadísticas']);
  const search = p.discoverable === true
    ? 'Tu perfil puede aparecer en la búsqueda de lectores.'
    : 'Tu perfil no aparece en la búsqueda de lectores.';
  const reading = p.hide_reading === true
    ? 'En tus estanterías no se muestra «Leyendo».'
    : 'El estante «Leyendo» se mostrará si corresponde y has habilitado las estanterías.';
  return { accessible, headline, note, visible, hidden, search, reading, since: p.show_since === true && accessible };
}

export function notificationPreviewSummary(config = {}, kinds = []) {
  const web = config.web || {}, email = config.email || {};
  const webCount = kinds.filter(([key]) => web[key] !== false).length;
  const emailCount = kinds.filter(([key,,, defaultEmail]) => (email[key] ?? defaultEmail) === true).length;
  const frequency = config.freq || 'off';
  const description = {
    off: 'El correo está pausado. Las opciones de correo se conservarán hasta que lo reactives.',
    inmediato: 'Los tipos de aviso seleccionados podrán generar correos al momento.',
    diario: 'Los tipos seleccionados entran en el resumen diario.',
    semanal: 'Los tipos seleccionados entran en el resumen semanal.'
  }[frequency] || 'Consulta la frecuencia de correo seleccionada.';
  return { webCount, emailCount, total: kinds.length, mailEnabled: frequency !== 'off', description };
}
