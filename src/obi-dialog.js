// Diálogos coherentes con El Obi del Lector, sin confirm(), alert() ni prompt() del navegador.
// Son asíncronos: la acción solamente continúa al pulsar el botón dentro del sitio.
const CSS = `
.obi-dialog{box-sizing:border-box;width:min(500px,calc(100vw - 28px));max-width:500px;max-height:min(85vh,780px);margin:auto;padding:0;border:1px solid #8f7240;border-radius:7px;background:#1b1710;color:#efe9dc;box-shadow:0 26px 85px #000d;font-family:'IBM Plex Sans',sans-serif}
.obi-dialog::backdrop{background:rgba(0,0,0,.8);backdrop-filter:blur(3px)}
.obi-dialog-inner{padding:clamp(19px,4vw,29px);display:grid;gap:16px}
.obi-dialog-tag{margin:0;color:#cba655;letter-spacing:.12em;text-transform:uppercase;font:700 10px 'IBM Plex Mono',monospace}
.obi-dialog h2{margin:0;color:#f2ebdc;font:700 clamp(21px,4vw,28px)/1.3 'Shippori Mincho B1',serif}
.obi-dialog-message{margin:0;white-space:pre-line;overflow-wrap:anywhere;color:#d6c9b2;font:14px/1.7 'IBM Plex Sans',sans-serif}
.obi-dialog-label{display:grid;gap:7px;color:#e0d4bb;font:600 13px/1.5 'IBM Plex Sans',sans-serif}
.obi-dialog-label input,.obi-dialog-label textarea{box-sizing:border-box;width:100%;min-height:45px;background:#110f0c;border:1px solid #78613e;border-radius:3px;color:#f2ebdc;padding:9px 12px;font:14px/1.5 'IBM Plex Sans',sans-serif}
.obi-dialog-label textarea{min-height:96px;resize:vertical}
.obi-dialog-error{margin:0;color:#ffb5a4;font:12px/1.5 'IBM Plex Sans',sans-serif}
.obi-dialog-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
.obi-dialog button{min-height:44px;padding:10px 16px;border-radius:3px;font:700 13px 'IBM Plex Sans',sans-serif;cursor:pointer}
.obi-dialog-cancel{color:#e7ddc8;background:transparent;border:1px solid #746247}
.obi-dialog-accept{background:#f2c230;color:#1a160c;border:1px solid #f2c230}
.obi-dialog-accept.danger{color:#fff0ea;background:#873f31;border-color:#b26d58}
.obi-dialog button:focus-visible,.obi-dialog input:focus-visible,.obi-dialog textarea:focus-visible{outline:2px solid #f2c230;outline-offset:3px}
.obi-dialog button:disabled{opacity:.5;cursor:not-allowed}
@media(max-width:480px){.obi-dialog-actions{display:grid;grid-template-columns:1fr 1fr}.obi-dialog-actions button{min-width:0;padding:10px 6px}}
@media(prefers-reduced-motion:reduce){.obi-dialog::backdrop{backdrop-filter:none}}
`;
let stylesReady = false;
const queue = [];
let active = false;

function ensureStyle() {
  if (stylesReady || typeof document === 'undefined') return;
  const style = document.createElement('style');
  style.id = 'obi-dialog-styles';
  style.textContent = CSS;
  (document.head || document.documentElement).append(style);
  stylesReady = true;
}
function showNext() {
  if (active || !queue.length) return;
  active = true;
  const { kind, message, opts, resolve } = queue.shift();
  ensureStyle();
  const previous = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.className = 'obi-dialog';
  dialog.setAttribute('aria-labelledby', 'obi-dialog-title');
  dialog.setAttribute('aria-describedby', 'obi-dialog-description');
  const inner = document.createElement('div'); inner.className = 'obi-dialog-inner';
  const tag = document.createElement('p'); tag.className = 'obi-dialog-tag';
  tag.textContent = opts?.category || (kind === 'confirm' ? 'Confirmación' : kind === 'input' ? 'Datos necesarios' : 'Aviso');
  const title = document.createElement('h2'); title.id = 'obi-dialog-title';
  title.textContent = opts?.title || (kind === 'confirm' ? '¿Confirmar acción?' : kind === 'input' ? 'Escribe tu respuesta' : 'El Obi del Lector');
  const body = document.createElement('p'); body.id = 'obi-dialog-description'; body.className = 'obi-dialog-message';
  body.textContent = String(message ?? '');
  inner.append(tag,title,body);
  let field = null, error = null;
  if (kind === 'input') {
    const label = document.createElement('label'); label.className = 'obi-dialog-label';
    const labelText = document.createElement('span'); labelText.textContent = opts?.label || 'Respuesta';
    field = document.createElement(opts?.multiline ? 'textarea' : 'input');
    if (field.tagName === 'INPUT') field.type = 'text';
    field.value = String(opts?.defaultValue ?? '');
    field.maxLength = Math.min(5000, Math.max(1, opts?.maxLength || 500));
    if (opts?.minLength) field.minLength = opts.minLength;
    if (opts?.placeholder) field.placeholder = opts.placeholder;
    label.append(labelText,field); inner.append(label);
    error = document.createElement('p'); error.className = 'obi-dialog-error'; error.setAttribute('role','alert'); error.hidden = true;
    inner.append(error);
  }
  const actions = document.createElement('div'); actions.className = 'obi-dialog-actions';
  const cancel = document.createElement('button'); cancel.type = 'button'; cancel.className = 'obi-dialog-cancel';
  cancel.textContent = opts?.cancelLabel || 'Cancelar';
  const accept = document.createElement('button'); accept.type = 'button'; accept.className = 'obi-dialog-accept';
  if (opts?.danger) accept.classList.add('danger');
  accept.textContent = opts?.acceptLabel || (kind === 'confirm' ? 'Confirmar' : kind === 'input' ? 'Aceptar' : 'Entendido');
  if (kind !== 'notice') actions.append(cancel);
  actions.append(accept); inner.append(actions); dialog.append(inner);
  document.body.append(dialog);
  let finished = false;
  const finish = value => {
    if (finished) return;
    finished = true;
    dialog.close(); dialog.remove();
    if (previous?.isConnected && typeof previous.focus === 'function') previous.focus({preventScroll:true});
    active = false; resolve(value); showNext();
  };
  cancel.onclick = () => finish(kind === 'input' ? null : false);
  accept.onclick = () => {
    if (kind === 'input') {
      const text = field.value.trim();
      if (opts?.minLength && text.length < opts.minLength) {
        error.textContent = 'Escribe al menos ' + opts.minLength + ' caracteres.';
        error.hidden = false; field.focus(); return;
      }
      finish(text);
    } else finish(true);
  };
  dialog.addEventListener('cancel', event => {event.preventDefault(); finish(kind === 'input' ? null : false);});
  try { dialog.showModal(); (field || (kind === 'notice' ? accept : cancel)).focus(); }
  catch { // Si aún no existe un documento interactivo, no ejecutar la acción por defecto.
    dialog.remove(); active = false; resolve(kind === 'input' ? null : false); showNext();
  }
}
function enqueue(kind, message, opts = {}) {
  if (typeof document === 'undefined' || !document.body) return Promise.resolve(kind === 'input' ? null : false);
  return new Promise(resolve => { queue.push({kind,message,opts,resolve}); showNext(); });
}
export const confirmObi = (message, opts = {}) => enqueue('confirm',message,opts);
export const noticeObi = (message, opts = {}) => enqueue('notice',message,opts);
export const inputObi = (message, opts = {}) => enqueue('input',message,opts);
