import { register } from './registry.js';

/* Lentille E074 — Structure sémantique appliquée au survol de la vue
   Constellation. Dix chantiers locaux et complémentaires : aucune requête,
   aucune source aléatoire, aucun minuteur ni boucle d'animation propre. */
register('E074', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.layout.querySelector !== 'function') return;
  const layout = ctx.layout;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.addEventListener !== 'function') return;

  /* Feuille unique de la lentille : texte discret, fiche, état et mode sobre. */
  css('constellation-e074', `
.e074-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#e074-fiche{margin-top:10px;padding:10px 12px;max-width:520px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)}
#e074-fiche[hidden]{display:none}
.e074-fiche-titre{margin:0 0 6px;font-family:var(--serif);font-size:13px;font-weight:500;color:var(--gold-bright)}
.e074-fiche-dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px}
.e074-pair{display:contents}
.e074-pair dt{margin:0;color:var(--gold);font-size:9px;text-transform:uppercase;letter-spacing:.08em}
.e074-pair dd{margin:0;color:var(--ink-soft);font-size:10px;line-height:1.4}
.e074-card-on .const-sun::after,.e074-card-on .const-planet::after,.e074-card-on .const-moon::after{opacity:0}
#e074-fiche.e074-calm{transition:none}
@media (prefers-reduced-motion: reduce){#e074-fiche{transition:none!important}}
`);

  const NODE_SEL = 'button.const-sun, button.const-planet, button.const-moon';
  const nodes = Array.prototype.slice.call(field.querySelectorAll(NODE_SEL));
  if (!nodes.length) return;

  /* E074-01 — Groupes nommés : roledescription et description du survol sur les trois calques. */
  const layerDefs = [
    { sel: '.const-layer-suns', role: 'calque d’ères', label: 'Ères — survolez un soleil pour sa fiche' },
    { sel: '.const-layer-planets', role: 'calque de repères', label: 'Repères — survolez un repère pour sa fiche' },
    { sel: '.const-layer-moons', role: 'calque de points vérifiés', label: 'Points vérifiés — survolez un point pour sa fiche' },
  ];
  layerDefs.forEach(def => {
    const layer = layout.querySelector(def.sel);
    if (!layer || typeof layer.setAttribute !== 'function') return;
    layer.setAttribute('aria-roledescription', def.role);
    layer.dataset.e074Group = def.role;
  });

  /* E074-02 — Aide sémantique : texte discret relié au champ par aria-describedby. */
  const addDescribedBy = (node, id) => {
    if (!node || typeof node.getAttribute !== 'function' || !id) return;
    const current = node.getAttribute('aria-describedby') || '';
    const ids = current.split(/\s+/).filter(Boolean);
    if (ids.indexOf(id) === -1) ids.push(id);
    node.setAttribute('aria-describedby', ids.join(' '));
  };
  let help = layout.querySelector('#e074-help');
  if (!help) {
    help = typeof ctx.el === 'function'
      ? ctx.el('p', 'e074-sr', 'Survol ou focus : une fiche structurée (titre, nature, repère, détail) apparaît et est annoncée.')
      : document.createElement('p');
    if (!help.textContent) {
      help.textContent = 'Survol ou focus : une fiche structurée (titre, nature, repère, détail) apparaît et est annoncée.';
    }
    help.id = 'e074-help';
    layout.appendChild(help);
  }
  addDescribedBy(field, help.id);

  /* E074-03 — Fiche sémantique : section titrée et liste de définitions, au lieu du seul ::after. */
  let card = layout.querySelector('#e074-fiche');
  if (!card) {
    card = typeof ctx.el === 'function' ? ctx.el('section', 'e074-fiche') : document.createElement('section');
    card.id = 'e074-fiche';
    card.setAttribute('aria-labelledby', 'e074-fiche-titre');
    const title = document.createElement('h3');
    title.id = 'e074-fiche-titre';
    title.className = 'e074-fiche-titre';
    card.appendChild(title);
    const dl = document.createElement('dl');
    dl.id = 'e074-fiche-dl';
    dl.className = 'e074-fiche-dl';
    [['Nature', 'e074-fiche-kind'], ['Repère', 'e074-fiche-label'], ['Détail', 'e074-fiche-detail']].forEach(pair => {
      const row = document.createElement('div');
      row.className = 'e074-pair';
      const dt = document.createElement('dt');
      dt.textContent = pair[0];
      const dd = document.createElement('dd');
      dd.id = pair[1];
      dd.className = 'e074-dd';
      row.appendChild(dt);
      row.appendChild(dd);
      dl.appendChild(row);
    });
    card.appendChild(dl);
    layout.appendChild(card);
  }
  const title = card.querySelector('#e074-fiche-titre');
  const kindDD = card.querySelector('#e074-fiche-kind');
  const labelDD = card.querySelector('#e074-fiche-label');
  const detailDD = card.querySelector('#e074-fiche-detail');
  if (!title || !kindDD || !labelDD || !detailDD) return;
  card.setAttribute('hidden', '');

  /* E074-04 — Nature et rang calculés depuis la clé, exposés comme données et description. */
  const kindNames = { sun: 'Ère', planet: 'Repère', moon: 'Point vérifié' };
  nodes.forEach(node => {
    const key = node.dataset.constKey || '';
    const parts = key.split(':');
    const kind = kindNames[parts[0]] || 'Nœud';
    const rank = parseInt(parts[1], 10);
    node.dataset.e074Kind = kind;
    if (!isNaN(rank)) node.dataset.e074Rank = String(rank + 1);
    addDescribedBy(node, help.id);
  });

  /* E074-05 — Canal d'annonce : région live unique pour le survol et le focus. */
  let live = layout.querySelector('#e074-live');
  if (!live) {
    live = typeof ctx.el === 'function' ? ctx.el('p', 'e074-sr', '') : document.createElement('p');
    live.id = 'e074-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }

  /* E074-06 — État de survol : marquage du nœud et masquage des doublons CSS. */
  const mark = node => {
    nodes.forEach(other => {
      if (other !== node) other.removeAttribute('data-e074-peek');
    });
    if (node) node.setAttribute('data-e074-peek', 'true');
    if (layout.classList) layout.classList.add('e074-card-on');
  };

  /* E074-07 — Survol délégué : la fiche et la région live reçoivent une structure textuelle. */
  const nodeFrom = event => {
    const target = event && event.target;
    if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return null;
    const node = target.closest(NODE_SEL);
    return node && field.contains(node) ? node : null;
  };
  const show = node => {
    if (!node) return;
    const kind = node.dataset.e074Kind || 'Nœud';
    const label = node.dataset.label || node.getAttribute('aria-label') || '';
    const detail = node.getAttribute('aria-label') || label;
    title.textContent = `${kind} · ${label}`;
    kindDD.textContent = kind;
    labelDD.textContent = label;
    detailDD.textContent = detail;
    card.removeAttribute('hidden');
    live.textContent = `${kind} : ${label}. ${detail}.`;
    mark(node);
  };
  field.addEventListener('pointerover', event => {
    const node = nodeFrom(event);
    if (node) show(node);
  }, true);

  /* E074-08 — Équivalence clavier : le focus alimente la même fiche structurée. */
  field.addEventListener('focusin', event => {
    const node = nodeFrom(event);
    if (node) show(node);
  }, true);

  /* E074-09 — Sortie symétrique : effacement de la fiche, du canal live et du marquage. */
  const leave = event => {
    const next = event && event.relatedTarget;
    if (next && next.nodeType === 1 && typeof next.closest === 'function') {
      const other = next.closest(NODE_SEL);
      if (other && field.contains(other)) return;
    }
    nodes.forEach(node => node.removeAttribute('data-e074-peek'));
    if (layout.classList) layout.classList.remove('e074-card-on');
    card.setAttribute('hidden', '');
    live.textContent = '';
  };
  field.addEventListener('pointerout', leave, true);
  field.addEventListener('focusout', leave, true);

  /* E074-10 — Mouvement réduit : classe sobre demandée au contexte, sans interpolation JS. */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
    if (card.classList) card.classList.add('e074-calm');
  } else if (card.classList) {
    card.classList.remove('e074-calm');
  }
});
