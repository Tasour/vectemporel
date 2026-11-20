import { register } from './registry.js';

/* Lentille V2 E048 — instrumentation E2E appliquée à la légende de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous locaux et
   dégradables. Aucun réseau, aucune source aléatoire, aucun appel de
   débogage, aucun minuteur ni boucle d'animation propre. */
register('E048', ctx => {
  /* Garde d'entrée : sans layout ni feuille de style, rien n'est touché. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;

  const legend = layout.querySelector('.constellation-legend');
  if (!legend) return;

  const factory = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
      };

  /* Feuille de style unique de la lentille V2, idempotente par son identifiant. */
  css('constellation-v2-e048', `
  #v2e048-panel{
    margin:10px 0 4px;padding:8px 10px;
    border:1px solid rgba(178,139,221,.34);border-radius:8px;
    background:rgba(11,16,24,.88);color:var(--ink-soft,#cfd8e6);
    font:10px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;
  }
  .v2e048-head{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-bottom:6px}
  .v2e048-title{margin:0;color:#b28bdd;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
  /* Cibles de légende : largeur de 36 px et focus visible. */
  .v2e048-entry{
    display:inline-flex;align-items:center;min-height:36px;padding:0 6px;
    border-radius:5px;text-decoration:underline dashed rgba(178,139,221,.6);
    text-underline-offset:3px;cursor:pointer;
  }
  .v2e048-entry:focus-visible{outline:2px solid #e6b96f;outline-offset:2px;background:rgba(230,185,111,.14)}
  .v2e048-entry[data-v2e048-focus="1"]{box-shadow:0 0 0 2px rgba(230,185,111,.34)}
  .v2e048-map,.v2e048-mutations{margin:4px 0;padding-left:18px;color:#bcc8d8}
  .v2e048-map li,.v2e048-mutations li{margin:1px 0}
  .v2e048-order,.v2e048-drift,.v2e048-duplicates,.v2e048-signature{margin:3px 0;color:#cbd5e1;font-variant-numeric:tabular-nums}
  .v2e048-order[data-v2e048-alert="1"],.v2e048-drift[data-v2e048-alert="1"],
  .v2e048-duplicates[data-v2e048-alert="1"]{padding-left:6px;border-left:2px solid #d98a8a;color:#f0b4b4}
  #v2e048-dump{display:none;margin:5px 0 0;padding:6px 8px;white-space:pre-wrap;
    border:1px solid rgba(120,140,165,.32);border-radius:6px;
    background:rgba(6,9,14,.72);color:#d5deea;font:inherit}
  #v2e048-panel[data-v2e048-dump="1"] #v2e048-dump{display:block}
  #v2e048-readout{margin:6px 0 0;color:#f0cf8f;font-variant-numeric:tabular-nums}
  .v2e048-dump-button{
    min-height:36px;min-width:36px;padding:0 10px;
    border:1px solid var(--line,#3a4150);border-radius:7px;
    background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);
    font:inherit;font-size:10px;cursor:pointer;
  }
  .v2e048-dump-button[aria-expanded="true"]{border-color:#b28bdd;background:rgba(178,139,221,.16)}
  .v2e048-dump-button:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
  @media (prefers-reduced-motion: reduce){#v2e048-panel *{transition:none!important}}
  @media (max-width:620px){
    #v2e048-panel{padding:6px 8px;font-size:9px}
    .v2e048-mutations{max-height:84px;overflow:auto}
  }
  `);

  /* Appariement des trois clés de lecture : sélecteur, libellé et couche. */
  const KEYS = [
    { key: 'sun', selector: '.legend-sun', label: 'Ère', layer: '.const-layer-suns', layerId: 'v2e048-layer-suns' },
    { key: 'planet', selector: '.legend-planet', label: 'Repère', layer: '.const-layer-planets', layerId: 'v2e048-layer-planets' },
    { key: 'moon', selector: '.legend-moon', label: 'Point vérifié du repère', layer: '.const-layer-moons', layerId: 'v2e048-layer-moons' },
  ];

  const entries = [];
  KEYS.forEach(spec => {
    const node = legend.querySelector(spec.selector);
    if (node) entries.push({ key: spec.key, label: spec.label, layer: spec.layer, layerId: spec.layerId, node });
  });
  const byKey = key => entries.find(entry => entry.key === key) || null;

  function ensureNode(id, tag, className, parent) {
    let node = null;
    try { node = document.getElementById(id); } catch (error) { node = null; }
    if (!node) {
      node = factory(tag, className);
      node.id = id;
    }
    if (node.parentNode !== parent) parent.appendChild(node);
    return node;
  }

  function text(node) {
    return node && typeof node.textContent === 'string' ? node.textContent.trim() : '';
  }

  function normalize(node) {
    return text(node).replace(/\s+/g, ' ').trim();
  }

  const head = layout.querySelector('.constellation-head');
  const anchor = head && head.parentNode === layout ? head.nextSibling : null;
  const panel = ensureNode('v2e048-panel', 'section', null, layout);
  if (anchor && panel.nextSibling !== anchor) layout.insertBefore(panel, anchor);
  panel.setAttribute('aria-label', 'Instrumentation E2E de la légende — seconde passe');

  let headRow = panel.querySelector('.v2e048-head');
  if (!headRow) {
    headRow = factory('div', 'v2e048-head');
    panel.appendChild(headRow);
    headRow.appendChild(factory('h3', 'v2e048-title', 'Instrumentation E2E · légende · V2'));
  }

  const readout = ensureNode('v2e048-readout', 'p', null, panel);
  if (!readout.getAttribute('role')) {
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');
  }
  function announce(message) {
    readout.textContent = message;
  }

  const field = layout.querySelector('.constellation-field');

  /* E048-01 — Carte légende ↔ couches : chaque entrée désigne sa couche. */
  const mapLines = [];
  KEYS.forEach(spec => {
    const entry = byKey(spec.key);
    const layer = field ? field.querySelector(spec.layer) : null;
    if (!entry || !layer) return;
    if (!layer.id) layer.id = spec.layerId;
    entry.node.setAttribute('aria-controls', layer.id);
    entry.node.dataset.v2e048Layer = layer.id;
    const total = layer.querySelectorAll('button').length;
    mapLines.push(`${normalize(entry.node) || spec.label} → ${layer.id} (${total})`);
  });
  legend.dataset.v2e048Map = mapLines.join(' | ');
  const mapList = ensureNode('v2e048-map', 'ul', 'v2e048-map', panel);
  while (mapList.childElementCount > mapLines.length) mapList.removeChild(mapList.lastElementChild);
  mapLines.forEach((line, index) => {
    let item = mapList.children[index];
    if (!item) {
      item = factory('li');
      mapList.appendChild(item);
    }
    if (item.textContent !== line) item.textContent = line;
  });

  /* E048-02 — Sémantique de liste : la légende devient une liste nommée. */
  if (!legend.getAttribute('role')) legend.setAttribute('role', 'list');
  legend.setAttribute('aria-label', 'Légende de la constellation');
  legend.dataset.v2e048Role = legend.getAttribute('role') || 'list';
  entries.forEach(entry => {
    if (!entry.node.getAttribute('role')) entry.node.setAttribute('role', 'listitem');
    if (!entry.node.getAttribute('aria-label')) {
      entry.node.setAttribute('aria-label', `Légende : ${normalize(entry.node) || entry.label}`);
    }
    entry.node.dataset.v2e048Semantic = entry.node.getAttribute('role');
  });

  /* E048-03 — Ordre de lecture : contrôle de la suite ère → repère → point. */
  const children = Array.from(legend.children).filter(node => node.nodeType === 1);
  const positions = KEYS.map(spec => {
    const entry = byKey(spec.key);
    return entry ? children.indexOf(entry.node) : -1;
  });
  const orderOk = positions.every((position, index) => position >= 0
    && (index === 0 || position > positions[index - 1]));
  legend.dataset.v2e048Order = orderOk ? 'conforme' : 'perturbe';
  legend.dataset.v2e048OrderValues = positions.join(',');
  const orderNode = ensureNode('v2e048-order', 'p', 'v2e048-order', panel);
  orderNode.dataset.v2e048Alert = orderOk ? '0' : '1';
  orderNode.textContent = `Ordre ère → repère → point : ${orderOk ? 'conforme' : 'perturbé'} (positions ${positions.join(', ')})`;

  /* E048-04 — Sentinelle de dérive : libellés de référence figés dans le module. */
  const REFERENCES = { sun: 'Ère', planet: 'Repère', moon: 'Point vérifié du repère' };
  const drifts = [];
  KEYS.forEach(spec => {
    const entry = byKey(spec.key);
    if (!entry) {
      drifts.push(`${spec.key}:absent`);
      return;
    }
    const value = normalize(entry.node);
    if (value !== REFERENCES[spec.key]) drifts.push(`${spec.key}:${value || 'vide'}`);
    entry.node.dataset.v2e048Reference = REFERENCES[spec.key];
  });
  legend.dataset.v2e048Drift = drifts.length ? drifts.join(' | ') : 'aucun';
  const driftNode = ensureNode('v2e048-drift', 'p', 'v2e048-drift', panel);
  driftNode.dataset.v2e048Alert = drifts.length ? '1' : '0';
  driftNode.textContent = `Dérive des libellés : ${drifts.length ? drifts.join(' · ') : 'aucune'}`;

  /* E048-05 — Doublons : aucun libellé ne doit se répéter dans la légende. */
  const seen = new Map();
  const duplicates = [];
  entries.forEach(entry => {
    const value = normalize(entry.node).toLowerCase();
    entry.node.dataset.v2e048TextKey = value;
    if (!value) return;
    const previous = seen.get(value);
    if (previous !== undefined) duplicates.push(`${previous}+${entry.key}`);
    else seen.set(value, entry.key);
  });
  legend.dataset.v2e048Duplicates = duplicates.length ? duplicates.join(' | ') : 'aucun';
  const duplicateNode = ensureNode('v2e048-duplicates', 'p', 'v2e048-duplicates', panel);
  duplicateNode.dataset.v2e048Alert = duplicates.length ? '1' : '0';
  duplicateNode.textContent = `Libellés dupliqués : ${duplicates.length ? duplicates.join(' · ') : 'aucun'}`;

  /* E048-06 — Journal de mutations : les changements de la légende sont tracés. */
  const mutationList = ensureNode('v2e048-mutations', 'ol', 'v2e048-mutations', panel);
  mutationList.setAttribute('aria-label', 'Journal des mutations observées sur la légende');
  let mutationCount = 0;
  const mutationKey = '__v2e048_observer';
  function recordMutation(kind, detail) {
    mutationCount += 1;
    const line = factory('li', null, `mutation ${mutationCount} · ${kind} · ${detail}`);
    line.dataset.v2e048Mutation = String(mutationCount);
    mutationList.appendChild(line);
    while (mutationList.childElementCount > 6) mutationList.removeChild(mutationList.firstElementChild);
    legend.dataset.v2e048Mutations = String(mutationCount);
    announce(`${kind} : ${detail}`);
  }
  if (typeof MutationObserver === 'function' && typeof window !== 'undefined') {
    const previous = window[mutationKey];
    if (previous && typeof previous.disconnect === 'function') previous.disconnect();
    const observer = new MutationObserver(records => {
      records.forEach(record => {
        if (record.type === 'childList') {
          const added = record.addedNodes.length;
          const removed = record.removedNodes.length;
          if (added || removed) recordMutation('structure', `+${added} / -${removed}`);
        } else if (record.type === 'characterData') {
          const parent = record.target && record.target.parentElement;
          recordMutation('texte', (normalize(parent) || 'modifié').slice(0, 48));
        }
      });
    });
    /* Seuls la structure et le texte sont observés : nos attributs ne bouclent pas. */
    observer.observe(legend, { childList: true, characterData: true, subtree: true });
    window[mutationKey] = observer;
    legend.dataset.v2e048Observed = '1';
  } else {
    legend.dataset.v2e048Observed = '0';
  }

  /* E048-07 — Navigation clavier : flèches et extrémités entre les entrées. */
  const navKey = '__v2e048_legend_nav';
  entries.forEach(entry => {
    if (!entry.node.hasAttribute('tabindex')) entry.node.tabIndex = 0;
    entry.node.classList.add('v2e048-entry');
  });
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function'
      && typeof window.removeEventListener === 'function' && entries.length) {
    const previous = window[navKey];
    if (typeof previous === 'function') window.removeEventListener('keydown', previous, true);
    const onNav = event => {
      if (!event || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (!target || target.nodeType !== 1 || !legend.contains(target)) return;
      const current = entries.findIndex(entry => entry.node === target);
      if (current < 0) return;
      let next = -1;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % entries.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + entries.length) % entries.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = entries.length - 1;
      else return;
      event.preventDefault();
      event.stopPropagation();
      entries.forEach(entry => { entry.node.dataset.v2e048Focus = '0'; });
      const destination = entries[next];
      if (!destination) return;
      destination.node.dataset.v2e048Focus = '1';
      destination.node.focus({ preventScroll: true });
      announce(`Entrée ${next + 1} sur ${entries.length} : ${normalize(destination.node) || destination.label}`);
    };
    window[navKey] = onNav;
    window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, onNav);
    legend.dataset.v2e048Nav = '1';
  } else {
    legend.dataset.v2e048Nav = '0';
  }
  if (legend.dataset.v2e048FocusBound !== '1') {
    legend.dataset.v2e048FocusBound = '1';
    legend.addEventListener('focusin', event => {
      const target = event && event.target;
      if (!target || target.nodeType !== 1) return;
      entries.forEach(entry => {
        entry.node.dataset.v2e048Focus = entry.node === target ? '1' : '0';
      });
    });
    legend.addEventListener('focusout', () => {
      entries.forEach(entry => { entry.node.dataset.v2e048Focus = '0'; });
    });
  }

  /* E048-08 — Empreinte de lecture : hachage djb2 des libellés normalisés. */
  function labelSignature(values) {
    let hash = 5381;
    for (let index = 0; index < values.length; index += 1) {
      hash = ((hash << 5) + hash + values.charCodeAt(index)) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }
  const readingText = KEYS.map(spec => {
    const entry = byKey(spec.key);
    return entry ? normalize(entry.node) : '';
  }).join('|');
  const signature = labelSignature(readingText);
  legend.dataset.v2e048Signature = signature;
  const signatureNode = ensureNode('v2e048-signature', 'p', 'v2e048-signature', panel);
  signatureNode.textContent = `Empreinte de lecture : ${signature}`;

  /* E048-09 — Rapport brut : un <pre> reployable, lisible et copiable. */
  const dumpId = 'v2e048-dump';
  const dumpButton = ensureNode('v2e048-dump-button', 'button', 'v2e048-dump-button', headRow);
  dumpButton.type = 'button';
  const dumpOpen = panel.dataset.v2e048Dump === '1';
  dumpButton.setAttribute('aria-controls', dumpId);
  dumpButton.setAttribute('aria-expanded', dumpOpen ? 'true' : 'false');
  dumpButton.textContent = dumpOpen ? 'Masquer le rapport brut' : 'Afficher le rapport brut';
  const dump = ensureNode(dumpId, 'pre', null, panel);
  dump.textContent = [
    `carte : ${legend.dataset.v2e048Map || ''}`,
    `ordre : ${legend.dataset.v2e048Order || ''} (${legend.dataset.v2e048OrderValues || ''})`,
    `dérive : ${legend.dataset.v2e048Drift || ''}`,
    `doublons : ${legend.dataset.v2e048Duplicates || ''}`,
    `empreinte : ${legend.dataset.v2e048Signature || ''}`,
    `mutations : ${legend.dataset.v2e048Mutations || '0'}`,
  ].join('\n');
  if (dumpButton.dataset.v2e048Bound !== '1') {
    dumpButton.dataset.v2e048Bound = '1';
    dumpButton.addEventListener('click', () => {
      const open = panel.dataset.v2e048Dump !== '1';
      panel.dataset.v2e048Dump = open ? '1' : '0';
      dumpButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      dumpButton.textContent = open ? 'Masquer le rapport brut' : 'Afficher le rapport brut';
      announce(open ? 'Rapport brut affiché' : 'Rapport brut masqué');
    });
  }

  /* E048-10 — Pont de diagnostic : un état déterministe lu par le harnais E2E. */
  const state = {
    entrees: entries.map(entry => ({
      cle: entry.key,
      libelle: normalize(entry.node),
      cible: entry.node.dataset.v2e048Layer || '',
    })),
    carte: legend.dataset.v2e048Map || '',
    ordre: legend.dataset.v2e048Order || '',
    derive: legend.dataset.v2e048Drift || '',
    doublons: legend.dataset.v2e048Duplicates || '',
    empreinte: legend.dataset.v2e048Signature || '',
    mutations: Number(legend.dataset.v2e048Mutations || 0),
    observe: legend.dataset.v2e048Observed === '1',
    navigation: legend.dataset.v2e048Nav === '1',
  };
  if (typeof window !== 'undefined') {
    window.__v2e048_state = Object.freeze(state);
    legend.dataset.v2e048Bridge = '1';
    announce(`Légende instrumentée : ${entries.length} entrées · empreinte ${signature} · ordre ${state.ordre}`);
  } else {
    legend.dataset.v2e048Bridge = '0';
  }
});
