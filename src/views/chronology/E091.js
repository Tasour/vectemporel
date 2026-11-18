import { register } from './registry.js';

/*
 * Lentille E091 — « ordre de lecture et séquence de tabulation cohérente »
 * (rapport UNIFIED_AUDIT/CHRONOLOGIE/views/E091.md).
 *
 * Dix chantiers (E091-01 … E091-10) implémentés dans CE seul module. Aucun
 * fichier partagé n'est modifié : la vue reconstruit son layout à chaque
 * rendu (chronology.js:537-541) et le registre rejoue les lentilles à chaque
 * passe (registry.js:39-43). Toutes les opérations sont donc idempotentes,
 * gardées par identifiant, et lisent toujours le dernier contexte reçu.
 *
 * CSS unique : ctx.css('chronology-e091', …), cadré par [data-e091="on"] posé
 * sur .chronology-layout. Préfixe DOM : `e091-`. Zéro console, zéro réseau,
 * zéro aléa, zéro boucle rAF, zéro timer, zéro région live concurrente.
 * Aucune donnée historique n'est inventée : la lentille ne produit que des
 * mesures de structure (ordre DOM, focusables, libellés, annonces) dérivées
 * du rendu réel.
 */

const CSS_ID = 'chronology-e091';

/* E091-02 — les huit temps de l'ordre de lecture attendu, dans l'ordre du DOM
   produit par chronology.js:227-526. Les ancres sont les IDs réels de la vue. */
const READING_STEPS = [
  ['Titre et préambule', 'atlas-chrono-title'],
  ['Statut et situation', 'atlas-chrono-status'],
  ['Ères', 'atlas-chrono-eras'],
  ['Outils de filtrage', 'atlas-chrono-tools'],
  ['Repères', 'atlas-chrono-events'],
  ['Fiche du repère', 'atlas-chrono-aside'],
  ['Points vérifiés', 'atlas-chrono-points-title'],
];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]';
const FOLLOWING = (typeof Node !== 'undefined' && Node.DOCUMENT_POSITION_FOLLOWING) || 4;

/* -------------------------------------------------------------------------- *
 * Feuille unique E091-01, -03, -04, -08, -09. Tout ce qui touche à la vue est
 * cadré par [data-e091="on"] ; les panneaux de mesure sont masqués par leur
 * propre classe et remontés dans le tiroir de diagnostics de la coque.
 * -------------------------------------------------------------------------- */
const RULES = `
.e091-sr-only {
  position: absolute !important; width: 1px; height: 1px; padding: 0;
  margin: -1px; overflow: hidden; clip: rect(0 0 0 0);
  white-space: nowrap; border: 0;
}
/* E091-01 — lien d'évitement : hors écran tant qu'il n'a pas le focus. */
.e091-skip {
  position: fixed; top: 8px; left: -9999px; z-index: 60;
  min-height: 36px; padding: 8px 14px; border: 1px solid var(--gold);
  border-radius: 8px; background: var(--surface-2); color: var(--gold-bright);
  font: inherit; font-size: 12px; text-decoration: none; cursor: pointer;
}
.e091-skip:focus, .e091-skip:focus-visible {
  left: 8px; outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
/* E091-03/-04 — anneau de focus visible sur la séquence de tabulation. */
.chronology-layout[data-e091="on"] .atlas-chrono-tag:focus-visible,
.chronology-layout[data-e091="on"] .event-card:focus-visible,
.chronology-layout[data-e091="on"] .era-band:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
.chronology-layout[data-e091="on"] #atlas-chrono-events:focus {
  outline: 2px solid var(--gold); outline-offset: 2px;
}
/* E091-08 — panneaux de mesure : texte statique, jamais de live region. */
.e091-panel { display: none !important; }
body.chronology-diagnostics .e091-panel {
  display: block !important; margin: 0 0 12px; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
.e091-panel h2 { margin: 0 0 6px; color: var(--gold); font-size: 12px; font-weight: 600; }
.e091-panel p, .e091-panel li {
  margin: 0 0 4px; color: var(--muted); font-size: 11px;
  line-height: 1.45; font-variant-numeric: tabular-nums;
}
.e091-panel ol { margin: 0; padding-left: 18px; }
/* E091-09 — aucun défilement animé, y compris sous mouvement complet. */
.chronology-layout[data-e091="on"] .chronology-main,
.chronology-layout[data-e091="on"] .chronology-aside { scroll-behavior: auto; }
@media (prefers-reduced-motion: reduce) {
  .e091-skip, .chronology-layout[data-e091="on"] .atlas-chrono-tag { transition: none !important; }
  .chronology-layout[data-e091="on"] .chronology-main,
  .chronology-layout[data-e091="on"] .chronology-aside { scroll-behavior: auto !important; }
}
`;

let latest = null; // dernier contexte : { stage, layout, reducedMotion, panels }

/* -------------------------------------------------------------------------- *
 * Utilitaire de garde d'existence E091-10 : réutilise un nœud encore connecté,
 * sinon le crée ; le déplace toujours dans le parent courant. Aucun doublon
 * d'ID, même si la coque ne reconstruit pas complètement le stage.
 * -------------------------------------------------------------------------- */
function ensureNode(ctx, id, tag, cls, text, parent) {
  if (!parent || typeof parent.appendChild !== 'function') return null;
  let node = document.getElementById(id);
  if (!node) {
    node = ctx.el(tag, cls, text);
    node.id = id;
  }
  if (cls && node.className !== cls) node.className = cls;
  if (text !== undefined && node.textContent !== text) node.textContent = text;
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* -------------------------------------------------------------------------- *
 * E091-01 — lien d'évitement vers la liste des repères.
 * Premier arrêt de tabulation du panneau principal, visible seulement au focus.
 * Le clic place un tabindex=-1 sur la cible (non focusable par défaut) puis y
 * amène le focus sans défilement animé.
 * -------------------------------------------------------------------------- */
function addSkipLink(ctx) {
  const main = ctx.layout.querySelector('.chronology-main');
  if (!main) return;
  const link = ensureNode(ctx, 'e091-skip-events', 'a', 'e091-skip', 'Aller aux repères ↓', main);
  if (!link) return;
  link.setAttribute('href', '#atlas-chrono-events');
  if (link.dataset.e091Bound !== '1') {
    link.dataset.e091Bound = '1';
    link.addEventListener('click', (event) => {
      const target = document.getElementById('atlas-chrono-events');
      if (!target) return;
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      try { target.focus({ preventScroll: true }); }
      catch { target.focus(); }
      const pane = target.closest('.chronology-main');
      if (pane) pane.scrollTop = 0;
    });
  }
  if (main.firstChild !== link) main.insertBefore(link, main.firstChild);
}

/* -------------------------------------------------------------------------- *
 * E091-06 — description jointe à chaque carte : l'activation met à jour la
 * fiche (aria-controls, chronology.js:389) mais le focus reste sur la carte
 * (focusIntent, chronology.js:407). Le texte sr-only rend ce chemin lisible
 * sans déplacer le focus ni doubler la live region de la vue.
 * -------------------------------------------------------------------------- */
function addCardHelp(ctx) {
  const main = ctx.layout.querySelector('.chronology-main');
  if (!main) return;
  ensureNode(
    ctx, 'e091-card-focus-help', 'p', 'e091-sr-only',
    'Entrée met à jour la fiche du repère ; le focus reste sur la carte activée.', main
  );
  const cards = ctx.layout.querySelectorAll('.event-card');
  if (!cards || typeof cards.forEach !== 'function') return;
  cards.forEach((card) => {
    const existing = card.getAttribute('aria-describedby');
    const ids = existing ? existing.split(/\s+/).filter(Boolean) : [];
    if (ids.indexOf('e091-card-focus-help') === -1) ids.push('e091-card-focus-help');
    card.setAttribute('aria-describedby', ids.join(' '));
    card.dataset.e091FocusTarget = 'carte';
  });
}

/* -------------------------------------------------------------------------- *
 * E091-05 — deux jeux de puces portent le même libellé et la même action
 * (chronology.js:330-343 et :443-458). On contextualise leurs noms accessibles
 * sans retirer aucun contrôle de la séquence de tabulation.
 * -------------------------------------------------------------------------- */
function disambiguateTags(ctx) {
  const chips = ctx.layout.querySelectorAll('.atlas-chrono-tag[data-tag]');
  if (!chips || typeof chips.forEach !== 'function') return;
  chips.forEach((chip) => {
    const tag = chip.dataset.tag;
    const inAside = Boolean(chip.closest('.chronology-aside'));
    const scope = inAside ? 'fiche du repère' : 'liste des repères';
    chip.dataset.e091TagScope = scope;
    chip.setAttribute('aria-label', `Filtrer par le thème ${tag} — ${scope}`);
  });
}

/* -------------------------------------------------------------------------- *
 * E091-07 — le compteur visible (chronology.js:344) répète le statut visible
 * (chronology.js:247-255). On le retire de la lecture uniquement si le statut
 * existe : l'information reste donc portée par un texte visible et audible.
 * -------------------------------------------------------------------------- */
function mirrorCount(ctx) {
  const count = ctx.layout.querySelector('#atlas-chrono-count');
  const status = ctx.layout.querySelector('#atlas-chrono-status');
  if (!count || !status) return;
  count.setAttribute('aria-hidden', 'true');
  count.dataset.e091CountMirrored = '1';
}

/* -------------------------------------------------------------------------- *
 * E091-02 / -03 / -08 — deux panneaux de mesure, texte réel, sans role=status.
 * -------------------------------------------------------------------------- */
function addPanels(ctx) {
  const plan = ensureNode(ctx, 'e091-reading-plan', 'section', 'e091-panel', undefined, ctx.stage);
  const audit = ensureNode(ctx, 'e091-tab-audit', 'section', 'e091-panel', undefined, ctx.stage);
  if (!plan || !audit) return null;

  plan.setAttribute('aria-label', 'Ordre de lecture de la vue chronologie');
  ensureNode(ctx, 'e091-reading-plan-title', 'h2', '', 'Ordre de lecture — chronologie', plan);
  const orderFlag = ensureNode(ctx, 'e091-order-flag', 'p', '', 'Ordre de lecture : —', plan);
  const list = ensureNode(ctx, 'e091-reading-list', 'ol', '', undefined, plan);
  while (list.firstChild) list.removeChild(list.firstChild);
  READING_STEPS.forEach(([label, id], index) => {
    const li = ctx.el('li', '', `${index + 1}. ${label} — #${id}`);
    li.id = `e091-step-${index + 1}`;
    list.appendChild(li);
  });

  audit.setAttribute('aria-label', 'Séquence de tabulation de la vue chronologie');
  ensureNode(ctx, 'e091-tab-audit-title', 'h2', '', 'Séquence de tabulation — chronologie', audit);
  const fields = [
    ['tab-list', 'Tabulation : —'],
    ['tab-summary', 'Résumé : —'],
    ['live-count', 'Régions live : —'],
    ['motion-state', 'Mouvement : —'],
  ];
  const nodes = { order: orderFlag };
  fields.forEach(([key, text]) => {
    const line = ensureNode(ctx, `e091-${key}`, 'p', '', text, audit);
    nodes[key] = line;
  });
  return nodes;
}

/* Nom accessible approximatif, utilisé seulement pour l'audit textuel. */
function accessibleName(node) {
  try {
    const label = node.getAttribute('aria-label');
    if (label && label.trim()) return label.replace(/\s+/g, ' ').trim().slice(0, 64);
    const by = node.getAttribute('aria-labelledby');
    if (by) {
      const parts = by.split(/\s+/).filter(Boolean).map((id) => {
        const ref = document.getElementById(id);
        return ref ? (ref.textContent || '').trim() : '';
      }).filter(Boolean);
      if (parts.length) return parts.join(' ').replace(/\s+/g, ' ').slice(0, 64);
    }
    const text = (node.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 64);
    return text || '(sans libellé)';
  } catch {
    return '(libellé indisponible)';
  }
}

/* -------------------------------------------------------------------------- *
 * E091-02 à E091-09 — une seule mesure par application, sans rAF ni timer.
 * -------------------------------------------------------------------------- */
function measure(ctx) {
  const cur = latest;
  if (!cur || !cur.panels || !cur.layout) return;
  const nodes = cur.panels;
  const layout = cur.layout;

  /* E091-02 — conformité de l'ordre de lecture, démontrée par compareDocumentPosition. */
  let orderOk = true;
  const missing = [];
  for (let i = 0; i < READING_STEPS.length; i += 1) {
    if (!document.getElementById(READING_STEPS[i][1])) { orderOk = false; missing.push(READING_STEPS[i][1]); }
  }
  for (let i = 1; i < READING_STEPS.length && orderOk; i += 1) {
    const before = document.getElementById(READING_STEPS[i - 1][1]);
    const after = document.getElementById(READING_STEPS[i][1]);
    if (before && after && !(before.compareDocumentPosition(after) & FOLLOWING)) orderOk = false;
  }
  layout.dataset.e091Order = orderOk ? 'conforme' : 'devie';
  setText(nodes.order, `Ordre de lecture : ${orderOk ? 'conforme aux 7 temps déclarés' : `écart détecté${missing.length ? ` (${missing.join(', ')})` : ''}`}.`);

  /* E091-04 — aucun tabindex positif : l'ordre DOM fait foi. Les -1 (cibles
     programmatiques, dont le titre de fiche en chronology.js:427) sont conservés. */
  let positive = 0;
  let programmatic = 0;
  const entries = [];
  const nameCount = new Map();
  const all = layout.querySelectorAll(FOCUSABLE);
  if (all && typeof all.forEach === 'function') {
    all.forEach((node) => {
      const raw = node.getAttribute('tabindex');
      const value = raw === null ? NaN : Number(raw);
      if (!Number.isNaN(value) && value > 0) {
        node.setAttribute('tabindex', '0');
        positive += 1;
      }
      if (typeof node.getBoundingClientRect === 'function') {
        const rect = node.getBoundingClientRect();
        if (rect.width < 1 && rect.height < 1) return;
      }
      if (node.hasAttribute('aria-hidden') || (node.closest && node.closest('[hidden]'))) return;
      const name = accessibleName(node);
      if (!Number.isNaN(value) && value < 0) {
        programmatic += 1;
        return;
      }
      const id = node.id ? `#${node.id}` : '';
      entries.push(`${node.tagName.toLowerCase()}${id} « ${name} »`);
      nameCount.set(name, (nameCount.get(name) || 0) + 1);
    });
  }
  layout.dataset.e091PositiveTabs = String(positive);
  const duplicates = [];
  nameCount.forEach((count, name) => { if (count > 1) duplicates.push(`${name} ×${count}`); });

  setText(nodes['tab-list'], entries.length
    ? `Tabulation (${entries.length} arrêts) : ${entries.join(' → ')}.`
    : 'Tabulation : aucun arrêt mesurable dans ce rendu.');
  setText(nodes['tab-summary'],
    `Résumé : ${positive} tabindex positif(s) corrigé(s), ${programmatic} cible(s) programmatique(s) hors tabulation,`
    + ` ${duplicates.length} libellé(s) ambigu(s)${duplicates.length ? ` (${duplicates.join(' ; ')})` : ''}.`);

  /* E091-08 — la seule région live attendue est #nav-c2a-live (chronology.js:119-138). */
  const lives = document.querySelectorAll('[role="status"], [aria-live]');
  const liveIds = [];
  if (lives && typeof lives.forEach === 'function') {
    lives.forEach((node) => liveIds.push(node.id || node.tagName.toLowerCase()));
  }
  setText(nodes['live-count'], `Régions live : ${lives ? lives.length : 0} (${liveIds.join(', ') || 'aucune'}).`);

  const reduced = cur.reducedMotion && cur.reducedMotion();
  setText(nodes['motion-state'], `Mouvement : ${reduced ? 'réduit' : 'complet'} · saut d'évitement instantané, sans défilement animé.`);
}

register('E091', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);
  ctx.layout.dataset.e091 = 'on';
  latest = {
    stage: ctx.stage,
    layout: ctx.layout,
    reducedMotion: ctx.reducedMotion,
    panels: null,
  };
  addCardHelp(ctx);
  addSkipLink(ctx);
  disambiguateTags(ctx);
  mirrorCount(ctx);
  latest.panels = addPanels(ctx);
  measure(ctx);
});
