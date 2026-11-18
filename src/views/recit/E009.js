import { register } from './registry.js';

/*
 * Lentille E009 — « Transitions et mouvement » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E009-01 … E009-10) sont implémentés dans
 * CE seul module : aucun fichier partagé n'est modifié. La coque reconstruisant
 * le DOM à chaque rendu, apply() recrée ses nœuds dans le stage courant ; les
 * écouteurs globaux, eux, sont posés une seule fois au niveau module et lisent
 * toujours le dernier contexte mémorisé.
 *
 * CSS unique : ctx.css('recit-e009', …), cadré par .recit-layout[data-e009="on"].
 * Toutes les classes créées sont préfixées `recit-e009-` ; tous les ids sont
 * préfixés `e009-` et uniques. Zéro journalisation, zéro requête, zéro aléa,
 * aucune écriture HTML directe. Enrichissement non destructif : sans JS, le
 * récit reste lisible.
 * Mouvement réduit (système OU bascule locale E009-06) : aucune animation.
 */

const CSS_ID = 'recit-e009';
const PANEL_ID = 'e009-motion-audit';

/* État module — surviv aux reconstructions du DOM, jamais écrit ailleurs. */
let latest = null;      // dernier contexte enrichi
let installed = false;  // garde des écouteurs globaux
let frame = 0;          // au plus une requête d'animation en vol
let lastIndex = null;   // étape précédente, pour le sens de marche (E009-01)
let lastFill = '0%';    // dernière largeur connue de la barre (E009-01)
let motionOff = false;  // bascule locale « transitions » (E009-06)
let mediaObserver = null; // unique IntersectionObserver (E009-09)

/* ------------------------------------------------------------------------- *
 * Feuille de style unique. Tout est cadré par [data-e009="on"] posé sur la
 * grille .recit-layout : aucune règle ne déborde sur une autre vue.
 * ------------------------------------------------------------------------- */
const RULES = `
/* E009-01 — barre de progression : transition de largeur et sens de marche. */
.recit-layout[data-e009="on"] .recit-progress > span {
  transition: width 480ms cubic-bezier(.22,.61,.36,1);
}
.recit-layout[data-e009="on"][data-e009-sens="arriere"] .recit-progress > span,
.recit-layout[data-e009="on"][data-e009-sens="boucle"] .recit-progress > span {
  transition-timing-function: cubic-bezier(.55,.06,.68,.19);
}
.recit-e009-direction {
  display: flex; align-items: center; gap: 7px; margin: 0 0 9px;
  color: var(--muted-2); font-size: 10px; font-variant-numeric: tabular-nums;
}
.recit-e009-direction-fleche {
  display: inline-block; min-width: 14px; color: var(--gold);
  text-align: center; font-size: 12px; transition: transform 300ms ease;
}
.recit-layout[data-e009="on"][data-e009-sens="arriere"] .recit-e009-direction-fleche { transform: rotate(180deg); }
.recit-layout[data-e009="on"][data-e009-sens="boucle"] .recit-e009-direction-fleche { transform: rotate(-90deg); }

/* E009-02 — entrée du titre : fondu et léger glissement à chaque point. */
.recit-e009-entree { animation: e009-fondu-monte 420ms cubic-bezier(.22,.61,.36,1) both; }
@keyframes e009-fondu-monte {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* E009-04 — repères directionnels des commandes précédent / suivant. */
.recit-layout[data-e009="on"] .recit-e009-nav-avant,
.recit-layout[data-e009="on"] .recit-e009-nav-arriere {
  transition: transform 180ms ease, border-color 180ms ease, color 180ms ease;
}
.recit-layout[data-e009="on"] .recit-e009-nav-avant:hover,
.recit-layout[data-e009="on"] .recit-e009-nav-avant:focus-visible { transform: translateX(3px); }
.recit-layout[data-e009="on"] .recit-e009-nav-arriere:hover,
.recit-layout[data-e009="on"] .recit-e009-nav-arriere:focus-visible { transform: translateX(-3px); }
.recit-layout[data-e009="on"] .recit-e009-nav-avant:active { transform: translateX(1px); }
.recit-layout[data-e009="on"] .recit-e009-nav-arriere:active { transform: translateX(-1px); }

/* E009-05 — pulsation de la lecture automatique + son équivalent textuel. */
.recit-layout[data-e009="on"] .recit-play[aria-pressed="true"] { animation: e009-pulse 1600ms ease-in-out infinite; }
@keyframes e009-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(230,185,111,0); }
  50%      { box-shadow: 0 0 0 4px rgba(230,185,111,.14); }
}
.recit-e009-lecture {
  display: inline-flex; align-items: center; align-self: center;
  margin-left: 6px; color: var(--muted-2); font-size: 9px; line-height: 1.4;
}

/* E009-06 — bascule locale « transitions », indépendante du système. */
.recit-e009-toggle {
  min-height: 36px; padding: 5px 10px; border: 1px solid var(--line-strong);
  border-radius: 8px; background: transparent; color: var(--gold-bright);
  font: inherit; font-size: 10px; cursor: pointer;
  transition: background-color 180ms ease, border-color 180ms ease;
}
.recit-e009-toggle[aria-pressed="true"] { background: rgba(230,185,111,.12); border-color: var(--gold); }
.recit-e009-toggle:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
.recit-e009-toggle-etat { align-self: center; color: var(--muted-2); font-size: 9px; }

/* E009-07 — jauge de certitude animée, doublée d'un texte lisible. */
.recit-e009-jauge {
  display: flex; align-items: center; gap: 9px; margin: 0 0 11px;
  color: var(--muted); font-size: 10px;
}
.recit-e009-jauge-piste {
  position: relative; flex: 0 1 120px; height: 6px; border-radius: 999px;
  background: rgba(255,255,255,.09); overflow: hidden;
}
.recit-e009-jauge-remplissage {
  display: block; height: 100%; width: 0%; border-radius: 999px;
  background: var(--gold); transition: width 520ms cubic-bezier(.22,.61,.36,1);
}
.recit-e009-jauge-texte { font-variant-numeric: tabular-nums; }

/* E009-08 — tête de lecture mobile dans le fil du repère. */
.recit-e009-playhead {
  position: relative; height: 12px; margin: 2px 0 9px;
  border-bottom: 1px solid var(--line);
}
.recit-e009-playhead-dot {
  position: absolute; bottom: -4px; left: 0%; width: 9px; height: 9px;
  margin-left: -4px; border-radius: 50%; background: var(--gold);
  transition: left 420ms cubic-bezier(.22,.61,.36,1);
}
.recit-e009-playhead-texte {
  position: absolute; right: 0; top: -2px; color: var(--muted-2);
  font-size: 9px; font-variant-numeric: tabular-nums;
}

/* E009-09 — fondu du média à son entrée dans la zone visible. */
.recit-layout[data-e009="on"] .recit-e009-media {
  opacity: 0; transition: opacity 460ms ease;
}
.recit-layout[data-e009="on"] .recit-e009-media.recit-e009-visible { opacity: 1; }

/* E009-10 — panneau de mesures, masqué puis remonté dans le tiroir diagnostic. */
.recit-e009-panel { display: none !important; }
body.recit-diagnostics .recit-e009-panel,
body.recit-diagnostics [data-recit-diagnostic].recit-e009-panel {
  display: block !important; margin: 0 0 12px; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
}
.recit-e009-panel h2 { margin: 0 0 6px; color: var(--gold); font-size: 12px; font-weight: 600; }
.recit-e009-panel p {
  margin: 0 0 4px; color: var(--muted); font-size: 11px;
  line-height: 1.45; font-variant-numeric: tabular-nums;
}

/* E009-06 / mouvement réduit : neutralisation de TOUTE animation et transition. */
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-progress > span,
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-e009-direction-fleche,
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-e009-entree,
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-play,
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-e009-nav-avant,
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-e009-nav-arriere,
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-e009-jauge-remplissage,
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-e009-playhead-dot,
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-e009-media,
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-e009-toggle {
  animation: none !important; transition: none !important;
}
.recit-layout[data-e009="on"].recit-e009-sans-mouvement .recit-e009-entree { opacity: 1 !important; transform: none !important; }
`;

/* ------------------------------------------------------------------------- *
 * Lecture de la position courante depuis le libellé réel du récit.
 * ------------------------------------------------------------------------- */
function readPosition(layout) {
  const kicker = layout.querySelector('.view-kicker');
  const match = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
  if (match) return { index: Math.max(0, Number(match[1]) - 1), total: Math.max(0, Number(match[2])) };
  return { index: 0, total: 0 };
}

function directionOf(index, total) {
  if (lastIndex === null) return { key: 'stable', arrow: '•', label: 'point de départ' };
  if (index === lastIndex) return { key: 'stable', arrow: '•', label: 'stable' };
  if (index === 0 && lastIndex === total - 1 && total > 1) {
    return { key: 'boucle', arrow: '↻', label: 'retour au début' };
  }
  if (index > lastIndex) return { key: 'avant', arrow: '→', label: 'vers l’avant' };
  return { key: 'arriere', arrow: '←', label: 'vers l’arrière' };
}

/* ------------------------------------------------------------------------- *
 * E009-01 — repère de sens, inséré après la barre de progression.
 * ------------------------------------------------------------------------- */
function addDirection(el, layout, position, direction) {
  const progress = layout.querySelector('.recit-progress');
  if (!progress) return null;
  const wrap = el('div', 'recit-e009-direction');
  wrap.id = 'e009-direction';
  const arrow = el('span', 'recit-e009-direction-fleche', direction.arrow);
  arrow.setAttribute('aria-hidden', 'true');
  const text = el('span', 'recit-e009-direction-texte',
    `Progression : ${direction.label} · étape ${position.index + 1} sur ${position.total || '—'}.`);
  wrap.append(arrow, text);
  progress.parentNode.insertBefore(wrap, progress.nextSibling);
  return { wrap, text };
}

/* ------------------------------------------------------------------------- *
 * E009-02 — entrée du titre (animation portée par une classe ajoutée au DOM).
 * ------------------------------------------------------------------------- */
function addTitleEntrance(el, layout, motion) {
  const title = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
  if (title && motion) title.classList.add('recit-e009-entree');
  return title;
}

/* ------------------------------------------------------------------------- *
 * E009-04 — micro-translation directionnelle des boutons de point.
 * ------------------------------------------------------------------------- */
function addNavCues(el, layout) {
  const prev = layout.querySelector('[data-fk="c3a-prev"]');
  const next = layout.querySelector('[data-fk="c3a-next"]');
  if (prev) prev.classList.add('recit-e009-nav-arriere');
  if (next) next.classList.add('recit-e009-nav-avant');
  return { prev, next };
}

/* ------------------------------------------------------------------------- *
 * E009-05 — équivalent textuel de la pulsation de lecture automatique.
 * ------------------------------------------------------------------------- */
function addPlayState(el, layout) {
  const play = layout.querySelector('.recit-play');
  if (!play || !play.parentNode) return null;
  const playing = play.getAttribute('aria-pressed') === 'true';
  const label = el('span', 'recit-e009-lecture',
    playing ? 'Lecture en cours : le récit avance seul.' : 'Lecture en pause : avance manuelle.');
  label.id = 'e009-lecture';
  play.parentNode.insertBefore(label, play.nextSibling);
  return label;
}

/* ------------------------------------------------------------------------- *
 * E009-06 — bascule locale « transitions » (bascule indépendante → aria-pressed).
 * ------------------------------------------------------------------------- */
function addToggle(el, layout) {
  const tools = layout.querySelector('#c3a-tools') || layout.querySelector('.c3a-tools');
  if (!tools) return null;
  const button = el('button', 'recit-e009-toggle', 'Transitions');
  button.id = 'e009-motion-toggle';
  button.type = 'button';
  button.setAttribute('aria-pressed', String(!motionOff));
  button.setAttribute('aria-controls', PANEL_ID);
  const state = el('span', 'recit-e009-toggle-etat', '');
  state.id = 'e009-toggle-etat';
  button.addEventListener('click', () => {
    motionOff = !motionOff;
    syncMotion();
    schedule();
  });
  tools.appendChild(button);
  tools.appendChild(state);
  return { button, state };
}

/* ------------------------------------------------------------------------- *
 * E009-07 — jauge de certitude animée, doublée par un texte non coloriel.
 * ------------------------------------------------------------------------- */
function addConfidenceGauge(el, layout) {
  const chip = layout.querySelector('.recit-conf');
  const meta = layout.querySelector('.recit-meta');
  if (!chip || !meta || !meta.parentNode) return null;
  const text = (chip.textContent || '').trim();
  let fraction = 0.25;
  let nom = 'contesté';
  if (text.indexOf('✓') >= 0) { fraction = 1; nom = 'vérifié'; }
  else if (text.indexOf('■') >= 0) { fraction = 0.75; nom = 'certain'; }
  else if (text.indexOf('◐') >= 0) { fraction = 0.5; nom = 'probable'; }
  const percent = Math.round(fraction * 100);
  const wrap = el('div', 'recit-e009-jauge');
  wrap.id = 'e009-conf-gauge';
  const track = el('div', 'recit-e009-jauge-piste');
  const fill = el('span', 'recit-e009-jauge-remplissage');
  fill.id = 'e009-conf-gauge-fill';
  if (latest && latest.motion) fill.style.width = '0%';
  else fill.style.width = `${percent}%`;
  track.appendChild(fill);
  const label = el('span', 'recit-e009-jauge-texte',
    `Certitude : ${nom} · jauge ${percent} %.`);
  wrap.append(track, label);
  meta.parentNode.insertBefore(wrap, meta.nextSibling);
  return { fill, label, percent, nom };
}

/* ------------------------------------------------------------------------- *
 * E009-08 — tête de lecture positionnée dans le fil du repère.
 * ------------------------------------------------------------------------- */
function addPlayhead(el, layout) {
  const thread = layout.querySelector('.recit-thread');
  if (!thread || !thread.parentNode) return null;
  const items = Array.from(layout.querySelectorAll('.recit-thread-item'));
  const total = items.length;
  const current = items.findIndex((node) =>
    node.getAttribute('aria-current') === 'step' || node.classList.contains('is-current'));
  const index = current < 0 ? 0 : current;
  const pos = total > 1 ? Math.round((index / (total - 1)) * 100) : 0;
  const wrap = el('div', 'recit-e009-playhead');
  wrap.id = 'e009-thread-playhead';
  const dot = el('span', 'recit-e009-playhead-dot');
  dot.id = 'e009-thread-playhead-dot';
  dot.style.left = (latest && latest.motion) ? '0%' : `${pos}%`;
  const label = el('span', 'recit-e009-playhead-texte',
    `Position dans le fil : ${index + 1} / ${total || '—'}.`);
  wrap.append(dot, label);
  const list = layout.querySelector('#c3a-thread');
  if (list && list.parentNode === thread) thread.insertBefore(wrap, list);
  else thread.appendChild(wrap);
  return { dot, label, index, total, pos };
}

/* ------------------------------------------------------------------------- *
 * E009-09 — fondu du média, déclenché seulement à son entrée à l'écran.
 * ------------------------------------------------------------------------- */
function addMediaFade(layout, motion) {
  const img = layout.querySelector('.recit-media img');
  if (!img || !motion) return null;
  img.classList.add('recit-e009-media');
  if (mediaObserver) {
    try { mediaObserver.disconnect(); } catch { /* observation déjà éteinte */ }
    mediaObserver = null;
  }
  if (typeof IntersectionObserver === 'function') {
    try {
      mediaObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry || !entry.isIntersecting) return;
          const node = entry.target;
          if (node && node.classList && typeof node.classList.add === 'function') {
            node.classList.add('recit-e009-visible');
          }
          if (mediaObserver && typeof mediaObserver.unobserve === 'function') mediaObserver.unobserve(node);
        });
      }, { threshold: 0.08 });
      mediaObserver.observe(img);
    } catch { img.classList.add('recit-e009-visible'); mediaObserver = null; }
  } else {
    img.classList.add('recit-e009-visible');
  }
  return img;
}

/* ------------------------------------------------------------------------- *
 * E009-10 — panneau de mesures, texte réel et falsifiable.
 * ------------------------------------------------------------------------- */
function addAuditPanel(el, stage) {
  const existing = document.getElementById(PANEL_ID);
  if (existing && existing.parentNode) {
    try { existing.parentNode.removeChild(existing); } catch { /* panneau déjà détaché */ }
  }
  const panel = el('section', 'recit-e009-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('data-recit-diagnostic', '');
  panel.setAttribute('aria-label', 'Mesures des transitions de la vue récit');
  const heading = el('h2', '', 'E009 — Transitions et mouvement · mesures');
  heading.id = 'e009-audit-titre';
  panel.appendChild(heading);
  const fields = [
    ['etat', 'État : —'],
    ['sens', 'Sens : —'],
    ['progression', 'Progression : —'],
    ['jauge', 'Certitude : —'],
    ['fil', 'Fil : —'],
    ['media', 'Média : —'],
    ['cibles', 'Animations : —'],
  ];
  const nodes = {};
  fields.forEach(([key, text]) => {
    const line = el('p', '', text);
    line.id = `e009-audit-${key}`;
    panel.appendChild(line);
    nodes[key] = line;
  });
  stage.appendChild(panel);
  return nodes;
}

/* ------------------------------------------------------------------------- *
 * Synchronise la neutralisation du mouvement (système OU bascule locale).
 * ------------------------------------------------------------------------- */
function syncMotion() {
  const cur = latest;
  if (!cur || !cur.layout) return { off: true, sys: true };
  const sys = typeof cur.reducedMotion === 'function' ? Boolean(cur.reducedMotion()) : false;
  const off = motionOff || sys;
  cur.motion = !off;
  cur.layout.classList.toggle('recit-e009-sans-mouvement', off);
  cur.layout.dataset.e009Motion = off ? 'off' : 'on';
  if (cur.refs && cur.refs.toggle) {
    cur.refs.toggle.setAttribute('aria-pressed', String(!motionOff));
  }
  if (cur.refs && cur.refs.toggleState) {
    cur.refs.toggleState.textContent = sys
      ? 'mouvement réduit (système)'
      : (motionOff ? 'désactivées' : 'activées');
  }
  return { off, sys };
}

/* ------------------------------------------------------------------------- *
 * Unique frame de peinture : valeurs finales des transitions + mesures.
 * ------------------------------------------------------------------------- */
function paint() {
  const cur = latest;
  if (!cur || !cur.layout || !cur.layout.isConnected) return;
  const set = (node, text) => { if (node && node.textContent !== text) node.textContent = text; };

  /* Valeurs cibles : posées après insertion pour que les transitions s'exécutent. */
  if (cur.refs.fill && cur.targetFill) {
    try { cur.refs.fill.style.width = cur.targetFill; } catch { /* largeur non applicable */ }
  }
  if (cur.refs.gaugeFill && cur.gaugePercent !== null) {
    try { cur.refs.gaugeFill.style.width = `${cur.gaugePercent}%`; } catch { /* jauge non applicable */ }
  }
  if (cur.refs.playheadDot && cur.playheadPos !== null) {
    try { cur.refs.playheadDot.style.left = `${cur.playheadPos}%`; } catch { /* repère non applicable */ }
  }

  const sys = typeof cur.reducedMotion === 'function' ? Boolean(cur.reducedMotion()) : false;
  const state = syncMotion();
  set(cur.nodes.etat, `État : transitions ${state.off ? 'neutralisées' : 'actives'} · `
    + `${sys ? 'préférence système réduite' : 'préférence système complète'} · `
    + `bascale locale : ${motionOff ? 'transitions coupées' : 'transitions autorisées'} · `
    + `rAF ${frame ? 'en attente' : 'au repos'}.`);
  set(cur.nodes.sens, `Sens : ${cur.direction.label} · étape ${cur.position.index + 1} sur ${cur.position.total || '—'} `
    + `(précédente ${lastIndex === null ? 'aucune' : lastIndex + 1}).`);
  set(cur.nodes.progression, `Progression : largeur cible ${cur.targetFill} · largeur de départ ${cur.startFill} `
    + `· transition ${cur.motion ? '480 ms' : 'aucune'}.`);
  set(cur.nodes.jauge, `Certitude : ${cur.gaugeNom} · jauge ${cur.gaugePercent} % (formule : niveau / 4).`);
  set(cur.nodes.fil, `Fil : point ${cur.playIndex + 1} sur ${cur.playTotal || '—'} `
    + `· tête de lecture à ${cur.playheadPos} %.`);
  set(cur.nodes.media, `Média : ${cur.mediaState}.`);
  let anim = 0;
  if (cur.layout && typeof cur.layout.querySelectorAll === 'function') {
    anim = cur.layout.querySelectorAll('.recit-e009-entree, .recit-e009-playhead-dot, .recit-e009-jauge-remplissage').length;
  }
  set(cur.nodes.cibles, `Animations : ${anim} élément(s) porteur(s) · `
    + `${cur.motion ? 'mouvement autorisé' : 'mouvement réduit'} · une seule frame rAF.`);
}

/* Une seule frame pour resize, orientation, visibilité et préférence système. */
function schedule() {
  if (frame || (typeof document !== 'undefined' && document.hidden)) return;
  if (typeof requestAnimationFrame !== 'function') { paint(); return; }
  frame = requestAnimationFrame(() => { frame = 0; paint(); });
}

/* E009-10 — installation unique, silencieuse et réversible au repos. */
function install() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  try {
    if (typeof window.matchMedia === 'function') {
      const query = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (query && typeof query.addEventListener === 'function') query.addEventListener('change', schedule);
    }
  } catch { /* media-query indisponible : ctx.reducedMotion() reste la source vivante. */ }
}

/* ------------------------------------------------------------------------- *
 * E009-03 — recentrage du point courant dans le fil (défilement borné).
 * ------------------------------------------------------------------------- */
function revealCurrent(layout, motion) {
  const current = layout.querySelector('.recit-thread-item[aria-current="step"]')
    || layout.querySelector('.recit-thread-item.is-current');
  if (!current || typeof current.scrollIntoView !== 'function') return;
  try {
    current.scrollIntoView({
      block: 'nearest', inline: 'nearest',
      behavior: motion ? 'smooth' : 'auto',
    });
  } catch {
    try { current.scrollIntoView(); } catch { /* ancrage indisponible */ }
  }
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille.
 * ------------------------------------------------------------------------- */
register('E009', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  css(CSS_ID, RULES);
  const body = layout.querySelector('.recit-body');
  if (!body) return;

  /* Détection du sens avant toute insertion (E009-01). */
  const position = readPosition(layout);
  const direction = directionOf(position.index, position.total);
  layout.dataset.e009 = 'on';
  layout.dataset.e009Sens = direction.key;
  const sys = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
  const motion = !motionOff && !sys;

  latest = {
    stage, layout, reducedMotion, motion,
    refs: {}, nodes: null,
    position, direction,
    targetFill: '', startFill: lastFill,
    gaugePercent: null, gaugeNom: '—',
    playheadPos: 0, playIndex: 0, playTotal: 0,
    mediaState: 'aucun média',
  };

  /* E009-01 — barre : on repart de la dernière largeur puis on vise la nouvelle. */
  const fill = layout.querySelector('.recit-progress > span');
  if (fill) {
    const target = fill.style.width || '0%';
    if (motion) fill.style.width = lastFill;
    latest.startFill = motion ? lastFill : target;
    latest.targetFill = target;
    lastFill = target;
    latest.refs.fill = fill;
  }
  const dirRefs = addDirection(el, layout, position, direction);
  if (dirRefs) latest.refs.direction = dirRefs;

  /* E009-02 / E009-04 / E009-05 — entrée du titre et repères de commande. */
  addTitleEntrance(el, layout, motion);
  addNavCues(el, layout);
  addPlayState(el, layout);

  /* E009-06 — bascule locale puis synchronisation immédiate de l'état. */
  const toggle = addToggle(el, layout);
  if (toggle) { latest.refs.toggle = toggle.button; latest.refs.toggleState = toggle.state; }
  syncMotion();

  /* E009-07 / E009-08 — jauge de certitude et tête de lecture du fil. */
  const gauge = addConfidenceGauge(el, layout);
  if (gauge) {
    latest.refs.gaugeFill = gauge.fill;
    latest.gaugePercent = gauge.percent;
    latest.gaugeNom = gauge.nom;
  }
  const playhead = addPlayhead(el, layout);
  if (playhead) {
    latest.refs.playheadDot = playhead.dot;
    latest.playheadPos = playhead.pos;
    latest.playIndex = playhead.index;
    latest.playTotal = playhead.total;
  }

  /* E009-09 / E009-03 — média à fondu, puis recentrage du point courant. */
  const media = addMediaFade(layout, motion);
  latest.mediaState = media
    ? (motion ? 'fondu à l’entrée dans la zone visible' : 'affiché sans transition')
    : 'aucun média vérifié';
  revealCurrent(layout, motion);

  /* E009-10 — témoin textuel, puis unique frame de peinture. */
  latest.nodes = addAuditPanel(el, stage);
  lastIndex = position.index;
  install();
  schedule();
});
