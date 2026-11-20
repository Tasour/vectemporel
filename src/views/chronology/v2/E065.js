import { register } from './registry.js';

/* Lentille E065 — déterminisme du rendu : aucun aléa natif, graine affichée.
 * (domaine G : performance et rendu de la vue Chronologie, passe V2).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E065.md — chantiers E065-01 à E065-10.
 * Fichier possédé : src/views/chronology/v2/E065.js uniquement. Lectures seules :
 * src/views/chronology.js, src/views/chronology/v2/index.js,
 * src/views/chronology/v2/registry.js, src/views/chronology/E049.js.
 * Aucun fichier partagé n'est modifié.
 *
 * Contrat exploité : viewId, stage, layout, css, el, reducedMotion. Le registre
 * V2 ne fournit pas say() : la lentille n'ajoute aucune région live et n'écrit
 * dans aucune région existante ; son état est du texte visible, dédupliqué.
 *
 * Invariants :
 * - un seul register('E065', …), un seul ctx.css('chronology-v2-e065', …) ;
 * - aucun générateur natif non déterministe, aucun appel réseau, aucun timer,
 *   aucune boucle d'animation, aucune journalisation, aucun HTML brut ;
 * - toute séquence visuelle est produite par un générateur à graine locale
 *   (hash FNV-1a + mulberry32) et sa graine est affichée à côté du visuel.
 */

const CSS_ID = 'chronology-v2-e065';
const PANEL_ID = 'chronology-v2-e065-panel';
const TITLE_ID = 'chronology-v2-e065-title';
const BADGE_ID = 'chronology-v2-e065-badge';
const SEED_ID = 'chronology-v2-e065-seed';
const STRIP_ID = 'chronology-v2-e065-strip';
const CAPTION_ID = 'chronology-v2-e065-caption';
const STABILITY_ID = 'chronology-v2-e065-stability';
const AUDIT_ID = 'chronology-v2-e065-audit';
const ACTION_ID = 'chronology-v2-e065-regenerate';
const SUMMARY_ID = 'chronology-v2-e065-summary';
const HOST_ID = 'atlas-chrono-main';
const BAR_COUNT = 12;

/* E065-01, E065-04, E065-09 : une seule feuille, bloc en flux normal en fin
   de colonne (jamais modale, jamais superposée), sans transition propre et avec
   replis mouvement réduit / couleurs forcées. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e065-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
  }
  #${PANEL_ID} .e065-badge {
    display: inline-block; margin: 0 0 8px; padding: 2px 8px;
    border: 1px solid var(--line-strong); border-radius: 999px;
    color: var(--gold-bright); font-size: 9px;
  }
  #${PANEL_ID} .e065-seed,
  #${PANEL_ID} .e065-caption,
  #${PANEL_ID} .e065-stability,
  #${PANEL_ID} .e065-audit,
  #${PANEL_ID} .e065-summary { margin: 5px 0 0; }
  #${PANEL_ID} .e065-seed { color: var(--gold-bright); }
  #${PANEL_ID} .e065-caption,
  #${PANEL_ID} .e065-audit,
  #${PANEL_ID} .e065-summary { color: var(--muted); }
  #${PANEL_ID} .e065-stability { color: var(--muted-2); font-size: 9px; }
  #${STRIP_ID} {
    display: flex; align-items: flex-end; gap: 3px;
    height: 34px; margin: 8px 0 0; padding: 0;
    border-bottom: 1px solid var(--line); list-style: none;
  }
  #${STRIP_ID} .e065-bar {
    flex: 1 1 0; min-width: 2px; max-width: 14px;
    background: var(--gold); border-radius: 2px 2px 0 0;
  }
  #${ACTION_ID} {
    min-height: 36px; margin: 9px 0 0; padding: 4px 12px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 10px; cursor: pointer;
  }
  #${ACTION_ID}:hover { border-color: var(--gold); }
  #${ACTION_ID}:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  @media (max-width: 620px) {
    #${PANEL_ID} .e065-bar { max-width: 9px; }
    #${ACTION_ID} { min-height: 44px; width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${ACTION_ID} {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${STRIP_ID} .e065-bar { background: CanvasText; }
    #${PANEL_ID} .e065-title,
    #${PANEL_ID} .e065-seed,
    #${PANEL_ID} .e065-badge,
    #${ACTION_ID} { color: CanvasText; }
  }
`;

let generation = 0;
let lastSeed = '';
let lastChecksum = '';
let divergences = 0;
let renderCount = 0;
let buttonBound = false;
let currentCtx = null;

/* E065-02 / E065-03 : les deux seules sources de variation sont un hash
   déterministe et un générateur à état local. Aucune API non déterministe. */
function hashSeed(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function makeGenerator(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* E065-02 : la graine dérive uniquement du DOM réellement rendu (pays, ère
   courante, repère courant), jamais d'une horloge ni d'un tirage. */
function readSource(layout) {
  const country = layout && layout.dataset ? (layout.dataset.countryId || '') : '';
  const eraNode = document.querySelector('#atlas-chrono-eras [aria-current="true"]');
  const eventNode = document.querySelector('#atlas-chrono-events [aria-current="true"]');
  const eraId = eraNode ? (eraNode.dataset.eraId || eraNode.id || '') : '';
  const eventId = eventNode ? (eventNode.dataset.eventId || eventNode.id || '') : '';
  return `${country}|${eraId}|${eventId}`;
}

function seedFor(source) {
  return `e065-${hashSeed(source).toString(16).padStart(8, '0')}-${generation}`;
}

/* E065-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
   #app, un nœud de la rendu précédent est détaché : getElementById ne le
   retrouve pas, il est donc recréé dans le parent courant. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E065-03 / E065-04 / E065-06 : le bandeau est entièrement calculé depuis la
   graine. L'empreinte sert de témoin de stabilité entre rendus. */
function drawStrip(make, strip, seed) {
  const next = makeGenerator(hashSeed(seed));
  const values = [];
  for (let i = 0; i < BAR_COUNT; i += 1) {
    values.push(Math.round(14 + next() * 86));
  }
  const bars = values.map((value) => {
    const bar = make('li', 'e065-bar');
    bar.style.height = `${value}%`;
    bar.dataset.e065Value = String(value);
    return bar;
  });
  strip.replaceChildren(...bars);
  const checksum = values
    .reduce((acc, value, index) => (acc + value * (index + 1)) % 4294967296, 0)
    .toString(16)
    .padStart(8, '0');
  strip.dataset.e065Checksum = checksum;
  return checksum;
}

function render(ctx) {
  if (!ctx || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const make = ctx.el;
  renderCount += 1;
  currentCtx = ctx;

  /* E065-01 / E065-10 : une seule feuille (le registre la déduplique aussi par
     ID) et un seul panneau, réutilisé d'un rendu à l'autre. */
  ctx.css(CSS_ID, CSS);
  const host = document.getElementById(HOST_ID) || ctx.layout;
  if (!host) return;

  const panel = ensureNode(make, PANEL_ID, 'section', 'e065-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ensureNode(make, TITLE_ID, 'h2', 'e065-title', panel);
  write(title, 'Déterminisme du rendu et graine affichée');
  const badge = ensureNode(make, BADGE_ID, 'p', 'e065-badge', panel);
  write(badge, 'Garantie : aucun aléa natif — toute variation provient d’une graine affichée.');
  const seedLine = ensureNode(make, SEED_ID, 'p', 'e065-seed', panel);
  const strip = ensureNode(make, STRIP_ID, 'ol', 'e065-strip', panel);
  const caption = ensureNode(make, CAPTION_ID, 'p', 'e065-caption', panel);
  const stability = ensureNode(make, STABILITY_ID, 'p', 'e065-stability', panel);
  const audit = ensureNode(make, AUDIT_ID, 'p', 'e065-audit', panel);

  /* E065-08 : la régénération incrémente un compteur visible ; la nouvelle
     graine reste dérivée du DOM, elle n'est pas tirée au hasard. */
  const action = ensureNode(make, ACTION_ID, 'button', 'e065-action', panel);
  action.type = 'button';
  write(action, 'Régénérer la graine');
  action.title = 'Incrémenter un compteur visible : la graine reste dérivée du DOM, sans tirage aléatoire.';
  if (!buttonBound) {
    action.addEventListener('click', () => {
      generation += 1;
      if (currentCtx) render(currentCtx);
    });
    buttonBound = true;
  }

  const summary = ensureNode(make, SUMMARY_ID, 'p', 'e065-summary', panel);

  const source = readSource(ctx.layout);
  const seed = seedFor(source);
  const checksum = drawStrip(make, strip, seed);
  if (lastSeed === seed && lastChecksum !== checksum) divergences += 1;
  lastSeed = seed;
  lastChecksum = checksum;

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;

  write(seedLine, `Graine : ${seed} — source : ${source || 'contexte par défaut'}.`);
  write(caption, `Le bandeau de ${BAR_COUNT} barres est calculé uniquement depuis cette graine : mêmes entrée et graine donnent toujours le même dessin.`);
  write(stability, `Empreinte du bandeau : ${checksum} · divergences observées : ${divergences}.`);
  write(audit, 'Audit du greffon : 0 tirage natif non déterministe · 0 horodatage · 0 requête réseau · 0 minuteur.');
  write(summary, `Rendus : ${renderCount} · générations : ${generation} · mouvement réduit : ${reduced ? 'oui' : 'non'}.`);

  strip.setAttribute('role', 'img');
  strip.setAttribute('aria-label', `Bandeau déterministe de ${BAR_COUNT} barres, graine ${seed}, empreinte ${checksum}.`);
  panel.dataset.e065Seed = seed;
  panel.dataset.e065Checksum = checksum;
  panel.dataset.e065Divergences = String(divergences);
  panel.dataset.e065Reduced = reduced ? '1' : '0';
}

register('E065', ctx => { render(ctx); });
