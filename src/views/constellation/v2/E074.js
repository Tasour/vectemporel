import { register } from './registry.js';

/* Lentille V2 E074 — Structure sémantique enrichie du survol dans la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau ni source aléatoire ni minuteur propre. */
register('E074', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.addEventListener !== 'function') return;
  const NODE_SEL = 'button.const-sun, button.const-planet, button.const-moon';
  const nodes = Array.prototype.slice.call(field.querySelectorAll(NODE_SEL));
  if (!nodes.length) return;

  /* Feuille unique de la lentille : fiche, fil, statut, épinglage, sobre. */
  css('constellation-v2-e074', `
.v2e074-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#v2e074-fiche{margin-top:10px;padding:10px 12px;max-width:560px;border:1px solid var(--line);border-radius:10px;background:var(--surface-2)}
#v2e074-fiche[hidden]{display:none}
.v2e074-titre{margin:0 0 6px;font-family:var(--serif);font-size:13px;font-weight:500;color:var(--gold-bright)}
.v2e074-crumbs{display:flex;flex-wrap:wrap;gap:2px;align-items:center;margin:0 0 8px;padding:0;list-style:none;font-size:9px;color:var(--muted)}
.v2e074-crumbs li:not(:last-child)::after{content:'\\203A';margin-left:6px;color:var(--gold)}
.v2e074-dl{margin:0;display:grid;grid-template-columns:auto 1fr;gap:4px 12px}
.v2e074-pair{display:contents}
.v2e074-pair dt{margin:0;color:var(--gold);font-size:9px;text-transform:uppercase;letter-spacing:.08em}
.v2e074-pair dd{margin:0;color:var(--ink-soft);font-size:10px;line-height:1.4}
.v2e074-composition{margin:8px 0 0;font-size:9px;color:var(--muted)}
.v2e074-pin{min-height:36px;padding:0 12px;margin-top:8px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:9px;cursor:pointer}
.v2e074-pin:hover{border-color:var(--gold);color:var(--gold-bright)}
.v2e074-pin:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.v2e074-pin[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright)}
.v2e074-calm,.v2e074-calm *{transition:none!important}
@media (prefers-reduced-motion: reduce){#v2e074-fiche,.v2e074-pin{transition:none!important}}
`);

  /* Fabrique locale : réutilise ctx.el quand il est fourni, sinon le DOM nu. */
  const make = (tag, className, text) => {
    const node = typeof ctx.el === 'function' ? ctx.el(tag, className, text) : document.createElement(tag);
    if (className && node.className !== className) node.className = className;
    if (text !== undefined && !node.textContent) node.textContent = text;
    return node;
  };
  const nodeFrom = event => {
    const target = event && event.target;
    if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return null;
    const node = target.closest(NODE_SEL);
    return node && field.contains(node) ? node : null;
  };

  let pinned = false;
  let spatialActive = null;
  let lastAnnounced = '';

  /* E074-01 — Fiche enrichie autonome : structure sémantique complète. */
  let card = layout.querySelector('#v2e074-fiche');
  if (!card) {
    card = make('section', 'v2e074-fiche');
    card.id = 'v2e074-fiche';
    card.setAttribute('aria-labelledby', 'v2e074-titre');
    const heading = make('h3', 'v2e074-titre', 'Fiche détaillée du nœud');
    heading.id = 'v2e074-titre';
    card.appendChild(heading);
    const crumbs = document.createElement('ol');
    crumbs.id = 'v2e074-crumbs';
    crumbs.className = 'v2e074-crumbs';
    crumbs.setAttribute('aria-label', 'Chemin hiérarchique du nœud');
    card.appendChild(crumbs);
    const dl = document.createElement('dl');
    dl.id = 'v2e074-dl';
    dl.className = 'v2e074-dl';
    [['Nature', 'v2e074-nature'], ['Rang', 'v2e074-rang'],
     ['Statut', 'v2e074-statut'], ['Sources', 'v2e074-sources']].forEach(pair => {
      const row = document.createElement('div');
      row.className = 'v2e074-pair';
      const dt = document.createElement('dt');
      dt.textContent = pair[0];
      const dd = document.createElement('dd');
      dd.id = pair[1];
      dd.className = 'v2e074-dd';
      row.appendChild(dt);
      row.appendChild(dd);
      dl.appendChild(row);
    });
    card.appendChild(dl);
    const composition = make('p', 'v2e074-composition', '');
    composition.id = 'v2e074-composition';
    card.appendChild(composition);
    if (field.parentNode) field.parentNode.insertBefore(card, field.nextSibling);
    else layout.appendChild(card);
  }
  card.setAttribute('hidden', '');
  const heading = card.querySelector('#v2e074-titre');
  const crumbs = card.querySelector('#v2e074-crumbs');
  const natureDD = card.querySelector('#v2e074-nature');
  const rangDD = card.querySelector('#v2e074-rang');
  const statutDD = card.querySelector('#v2e074-statut');
  const sourcesDD = card.querySelector('#v2e074-sources');
  const composition = card.querySelector('#v2e074-composition');
  if (!heading || !crumbs || !natureDD || !rangDD || !statutDD || !sourcesDD || !composition) return;

  /* E074-02 — Lien aria-details : chaque nœud découvre la fiche enrichie. */
  nodes.forEach(node => {
    if (typeof node.setAttribute === 'function') node.setAttribute('aria-details', 'v2e074-fiche');
    if (node.dataset) node.dataset.v2e074Linked = 'true';
  });

  /* E074-03 — Facettes normalisées : nature, fraction de rang, effectif de catégorie. */
  const KINDS = { sun: 'Ère', planet: 'Repère', moon: 'Point vérifié' };
  const parsed = nodes.map(node => {
    const bits = (node.dataset.constKey || '').split(':');
    const prefix = KINDS[bits[0]] ? bits[0] : '';
    const index = parseInt(bits[1], 10);
    return { node, prefix, index: isNaN(index) ? -1 : index };
  });
  const totals = {};
  parsed.forEach(entry => {
    if (entry.prefix) totals[entry.prefix] = (totals[entry.prefix] || 0) + 1;
  });
  const seen = {};
  parsed.forEach(entry => {
    if (!entry.prefix || entry.index < 0) return;
    seen[entry.prefix] = (seen[entry.prefix] || 0) + 1;
    entry.node.dataset.v2e074Facet = KINDS[entry.prefix];
    entry.node.dataset.v2e074Fraction = `${seen[entry.prefix]} / ${totals[entry.prefix]}`;
    entry.node.dataset.v2e074Total = String(totals[entry.prefix]);
  });

  /* E074-04 — Résumé de composition : décompte textuel des trois catégories. */
  const nSun = totals.sun || 0;
  const nPlanet = totals.planet || 0;
  const nMoon = totals.moon || 0;
  composition.textContent = `Composition : ${nSun} ère${nSun > 1 ? 's' : ''}, `
    + `${nPlanet} repère${nPlanet > 1 ? 's' : ''}, `
    + `${nMoon} point${nMoon > 1 ? 's' : ''} vérifié${nMoon > 1 ? 's' : ''}.`;
  layout.dataset.v2e074Composition = `${nSun}/${nPlanet}/${nMoon}`;

  /* E074-05 — Fil d'Ariane : chemin Ère › Repère › Point reconstruit à l'affichage. */
  const fillCrumbs = node => {
    while (crumbs.firstChild) crumbs.removeChild(crumbs.firstChild);
    const activeSun = field.querySelector('button.const-sun.is-active');
    const activePlanet = field.querySelector('button.const-planet.is-active');
    const steps = [];
    const sunLabel = activeSun ? (activeSun.dataset.label || '') : '';
    if (sunLabel) steps.push(`Ère · ${sunLabel}`);
    const facet = node.dataset.v2e074Facet || 'Nœud';
    const planetLabel = activePlanet ? (activePlanet.dataset.label || '') : '';
    if ((facet === 'Repère' || facet === 'Point vérifié') && planetLabel) {
      steps.push(`Repère · ${planetLabel}`);
    }
    steps.push(`${facet} · ${node.dataset.label || ''}`);
    steps.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      crumbs.appendChild(li);
    });
  };

  /* E074-06 — Statut de sélection textualisé, jamais porté par la seule couleur. */
  const statutOf = node => {
    const current = node.getAttribute('aria-current') === 'true' || node.classList.contains('is-active');
    return current ? 'Sélection courante' : 'Nœud ordinaire';
  };
  nodes.forEach(node => {
    if (node.dataset) node.dataset.v2e074Statut = statutOf(node);
  });

  /* Mise à jour unique de la fiche, partagée par le pointeur et le clavier. */
  const show = node => {
    if (!node) return;
    const facet = node.dataset.v2e074Facet || 'Nœud';
    const label = node.dataset.label || node.getAttribute('aria-label') || '';
    heading.textContent = `${facet} · ${label}`;
    natureDD.textContent = facet;
    rangDD.textContent = node.dataset.v2e074Fraction || '—';
    statutDD.textContent = statutOf(node);
    const prefix = (node.dataset.constKey || '').split(':')[0];
    sourcesDD.textContent = prefix === 'moon' ? (node.getAttribute('aria-label') || label) : '—';
    fillCrumbs(node);
    card.removeAttribute('hidden');
    card.dataset.v2e074Shown = node.dataset.constKey || '';
    announce(`${facet} : ${label}. Rang ${rangDD.textContent}. ${statutDD.textContent}.`);
  };

  /* E074-07 — Résolution spatiale stable : bascule si le nœud visé est nettement plus proche. */
  const centerOf = node => {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };
  const distance = (point, x, y) => {
    const dx = point.x - x;
    const dy = point.y - y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  field.addEventListener('pointermove', event => {
    if (pinned || !event) return;
    const x = event.clientX;
    const y = event.clientY;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    const under = nodeFrom(event);
    /* Aucun nœud sous le pointeur : on conserve la fiche courante (anti-scintillement). */
    if (!under) return;
    if (!spatialActive || under === spatialActive) {
      spatialActive = under;
      show(under);
      return;
    }
    const tolerance = 12;
    if (distance(centerOf(under), x, y) + tolerance < distance(centerOf(spatialActive), x, y)) {
      spatialActive = under;
      show(under);
    }
  }, true);
  field.addEventListener('pointerover', event => {
    const node = nodeFrom(event);
    if (node) { spatialActive = node; show(node); }
  }, true);
  field.addEventListener('focusin', event => {
    const node = nodeFrom(event);
    if (node) { spatialActive = node; show(node); }
  }, true);
  const leave = event => {
    if (pinned) return;
    const next = event && event.relatedTarget;
    if (next && next.nodeType === 1 && typeof next.closest === 'function') {
      const other = next.closest(NODE_SEL);
      if (other && field.contains(other)) return;
    }
    spatialActive = null;
    card.setAttribute('hidden', '');
    delete card.dataset.v2e074Shown;
    announce('');
  };
  field.addEventListener('pointerout', leave, true);
  field.addEventListener('focusout', leave, true);

  /* E074-08 — Canal live dés-dupliqué : une seule annonce par changement de texte. */
  let live = layout.querySelector('#v2e074-live');
  if (!live) {
    live = make('p', 'v2e074-sr', '');
    live.id = 'v2e074-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  const announce = text => {
    if (!text || text === lastAnnounced) return;
    lastAnnounced = text;
    live.textContent = text;
  };

  /* E074-09 — Épinglage de la fiche : bascule indépendante annoncée par aria-pressed. */
  let pin = card.querySelector('#v2e074-pin');
  if (!pin) {
    pin = make('button', 'v2e074-pin', 'Épingler la fiche');
    pin.id = 'v2e074-pin';
    pin.type = 'button';
    card.appendChild(pin);
  }
  pin.setAttribute('aria-pressed', pinned ? 'true' : 'false');
  if (pin.dataset.v2e074Bound !== 'true') {
    pin.addEventListener('click', () => {
      pinned = !pinned;
      pin.setAttribute('aria-pressed', pinned ? 'true' : 'false');
      pin.textContent = pinned ? 'Désépingler la fiche' : 'Épingler la fiche';
      announce(pinned
        ? 'Fiche épinglée : elle reste affichée hors survol.'
        : 'Fiche libérée : elle suit à nouveau le survol.');
    });
    pin.dataset.v2e074Bound = 'true';
  }

  /* E074-10 — Index sémantique des nœuds : registre textuel masqué, indexable. */
  let index = layout.querySelector('#v2e074-index');
  if (!index) {
    index = document.createElement('dl');
    index.id = 'v2e074-index';
    index.className = 'v2e074-sr';
    parsed.forEach(entry => {
      const dt = document.createElement('dt');
      dt.textContent = entry.node.dataset.constKey || 'nœud';
      const dd = document.createElement('dd');
      dd.textContent = `${entry.node.dataset.v2e074Facet || 'Nœud'} · `
        + `${entry.node.dataset.v2e074Fraction || ''} · ${entry.node.dataset.label || ''}`;
      index.appendChild(dt);
      index.appendChild(dd);
    });
    layout.appendChild(index);
  }

  /* Repli de mouvement réduit, intégré à la feuille unique (non numéroté). */
  if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() && card.classList) {
    card.classList.add('v2e074-calm');
  }
});
