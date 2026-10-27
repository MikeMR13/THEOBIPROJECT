// Diálogos coherentes de El Obi: nunca usar ventanas nativas del navegador
// para las decisiones, avisos o solicitudes de texto de la aplicación.
let tail = Promise.resolve();

const dialog = ({ kind = 'confirm', message = '', initial = '', confirmLabel, danger = false }) => {
  const operation = () => new Promise(resolve => {
    // Los mensajes van en textContent, nunca en HTML procedente de usuarios.
    const previous = document.activeElement;
    const node = document.createElement('dialog');
    node.className = 'obi-dialog';
    node.setAttribute('aria-labelledby', 'obi-dialog-heading');
    node.setAttribute('aria-describedby', 'obi-dialog-message');

    const frame = document.createElement('div');
    frame.className = 'obi-dialog-inner';
    const eyebrow = document.createElement('span');
    eyebrow.className = 'obi-dialog-eyebrow';
    eyebrow.textContent = 'EL OBI DEL LECTOR · ' + (kind === 'confirm' ? 'CONFIRMACIÓN' : kind === 'prompt' ? 'INTRODUCIR TEXTO' : 'AVISO');
    const heading = document.createElement('h2');
    heading.id = 'obi-dialog-heading';
    heading.textContent = kind === 'confirm' ? 'Confirmar acción' : kind === 'prompt' ? 'Introduce la información' : 'Aviso';
    const copy = document.createElement('p');
    copy.id = 'obi-dialog-message';
    copy.className = 'obi-dialog-message';
    copy.textContent = String(message);
    const actions = document.createElement('div');
    actions.className = 'obi-dialog-actions';
    let field;
    if (kind === 'prompt') {
      field = document.createElement('textarea');
      field.className = 'obi-dialog-field';
      field.rows = 3;
      field.value = String(initial ?? '');
      field.setAttribute('aria-label', String(message));
      field.spellcheck = false;
    }
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.className = 'obi-dialog-cancel';
    cancel.textContent = 'Cancelar';
    cancel.hidden = kind === 'alert';
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'obi-dialog-accept' + (danger ? ' is-danger' : '');
    accept.textContent = confirmLabel || (kind === 'prompt' ? 'Aceptar' : kind === 'alert' ? 'Entendido' : 'Confirmar');
    actions.append(cancel, accept);
    frame.append(eyebrow, heading, copy);
    if (field) frame.append(field);
    frame.append(actions);
    node.append(frame);
    document.body.append(node);

    let finished = false;
    const finish = value => {
      if (finished) return;
      finished = true;
      node.close();
      node.remove();
      if (previous?.isConnected && typeof previous.focus === 'function') previous.focus({preventScroll:true});
      resolve(value);
    };
    cancel.addEventListener('click', () => finish(kind === 'confirm' ? false : null));
    accept.addEventListener('click', () => finish(kind === 'confirm' ? true : kind === 'prompt' ? field.value : undefined));
    node.addEventListener('cancel', e => { e.preventDefault(); finish(kind === 'confirm' ? false : null); });
    node.addEventListener('click', e => { if (e.target === node) finish(kind === 'confirm' ? false : null); });
    node.addEventListener('close', () => { if (!finished) finish(kind === 'confirm' ? false : null); });
    node.showModal();
    (field || (kind === 'alert' ? accept : cancel)).focus({preventScroll:true});
    field?.select();
  });
  // Nunca superponer dos confirmaciones de acciones simultáneas.
  const run = tail.then(operation, operation);
  tail = run.then(() => undefined, () => undefined);
  return run;
};

export const confirmInApp = (message, options = {}) => dialog({kind:'confirm', message, ...options});
export const promptInApp = (message, initial = '') => dialog({kind:'prompt', message, initial});
export const alertInApp = message => dialog({kind:'alert', message});
