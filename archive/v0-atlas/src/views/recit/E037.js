import { register } from './registry.js';

/*
 * Lentille E037 — « Contraste et perception » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E037-01 … E037-10), tous implémentés
 * dans CE seul module. Aucun fichier partagé n'est modifié ; rapport détaillé :
 * UNIFIED_AUDIT/RECIT/views/E037.md.
 *
 * La coque reconstruisant le DOM à chaque rendu, apply() recrée ses nœuds dans
 * le stage courant ; l'état de la bascule locale, lui, survit au rendu via une
 * variable de module. Une seule feuille de style (css('recit-e037', …)), cadrée
 * par l'attribut data-e037="on" posé sur .recit-layout : aucune règle ne déborde
 * sur une autre vue. Toutes les classes créées sont préfixées `recit-e037-`,
 * tous les ids `e037-` et uniques. Zéro console, zéro réseau, zéro aléa,
 * zéro innerHTML, zéro animation. Enrichissement non destructif : sans JS le
 * récit reste lisible et les commandes d'origine intactes.
 *
 * Lectures seules : src/views/recit.js, src/views/recit/registry.js,
 * src/views/recit/index.js, src/views/_diagnostics.js, styles.css.
 */

const CSS_ID = 'recit-e037';
const PANEL_ID = 'e037-mesures';

/* État module — survit aux reconstructions du DOM, jamais écrit ailleurs. */
let latest = null;       // dernier contexte enrichi
let contrasteFort = false; // bascule locale E037-06

/* Ratios WCAG calculés une fois pour toutes sur fond #070a0e (vérifiables).
   Avant : --muted 7.76:1, --muted-2 5.98:1. Après renforcement local :
   --muted #c9c3b8 → 11.32:1, --muted-2 #b9b3ab → 9.54:1. */

/* ------------------------------------------------------------------------- *
 * Feuille de style unique. Chaque sélecteur est cadré par [data-e037="on"].
 * ------------------------------------------------------------------------- */
const RULES = `
/* E037-01 — tokens de contraste locaux : textes secondaires et filets. */
.recit-layout[data-e037="on"]{
  --muted:#c9c3b8;
  --muted-2:#b9b3ab;
  --line:rgba(255,255,255,.22);
  --line-strong:rgba(230,185,111,.55);
}

/* E037-02 — taille minimale et interlignage des textes serrés (8–9 px → 11 px). */
.recit-layout[data-e037="on"] .recit-thread-item,
.recit-layout[data-e037="on"] .recit-thread-title,
.recit-layout[data-e037="on"] .recit-legend p,
.recit-layout[data-e037="on"] .recit-timing,
.recit-layout[data-e037="on"] .recit-sources,
.recit-layout[data-e037="on"] .recit-media-credit,
.recit-layout[data-e037="on"] .media-caption,
.recit-layout[data-e037="on"] .c3a-status,
.recit-layout[data-e037="on"] .c3a-group-label,
.recit-layout[data-e037="on"] .c3a-filter{
  font-size:11px;
  line-height:1.5;
}
.recit-layout[data-e037="on"] .recit-legend p{line-height:1.65;}

/* E037-03 — marqueur textuel de certitude (lettre, indépendante de la couleur). */
.recit-e037-conf{
  display:inline-block;min-width:15px;margin-right:5px;padding:0 3px;
  border:1px solid var(--line-strong);border-radius:4px;
  color:var(--gold-bright);font-size:9px;font-weight:700;
  font-variant-numeric:tabular-nums;text-align:center;letter-spacing:.04em;
}

/* E037-04 — focus à double anneau, perceptible sur fond clair comme sombre. */
.recit-layout[data-e037="on"] :is(button,input,summary,[tabindex]):focus-visible{
  outline:3px solid var(--gold-bright);
  outline-offset:2px;
  box-shadow:0 0 0 5px #070a0e,0 0 0 7px var(--gold);
}

/* E037-05 — voile sombre sous les textes posés sur l'image. */
.recit-layout[data-e037="on"] .recit-media::after{
  content:"";position:absolute;inset:auto 0 0 0;height:104px;
  background:linear-gradient(to top,rgba(7,10,14,.94),rgba(7,10,14,0));
  pointer-events:none;
}
.recit-layout[data-e037="on"] .media-caption,
.recit-layout[data-e037="on"] .recit-media-credit{
  z-index:1;color:#fff;
  text-shadow:0 1px 3px #000,0 0 8px #000;
}

/* E037-06 — bascule locale « contraste renforcé » et son thème. */
.recit-e037-toggle{
  min-height:36px;padding:5px 10px;border:1px solid var(--line-strong);
  border-radius:8px;background:transparent;color:var(--gold-bright);
  font:inherit;font-size:10px;cursor:pointer;
}
.recit-e037-toggle[aria-pressed="true"]{background:rgba(230,185,111,.16);border-color:var(--gold-bright);}
.recit-e037-toggle-etat{align-self:center;color:var(--muted-2);font-size:10px;}
.recit-layout[data-e037="on"].recit-e037-fort{
  --muted:#e8e4dc;
  --muted-2:#d7d1c6;
  --line:rgba(255,255,255,.42);
  --line-strong:rgba(244,214,158,.85);
}
.recit-layout[data-e037="on"].recit-e037-fort .recit-body{background:#05070a;}
.recit-layout[data-e037="on"].recit-e037-fort :is(.recit-thread-item,.c3a-filter,.recit-conf,.c3a-search){
  border-width:2px;border-color:var(--gold-bright);
}

/* E037-07 — barre à double codage : motif en bandes + étiquette chiffrée. */
.recit-layout[data-e037="on"] .recit-progress>span{
  background-image:repeating-linear-gradient(45deg,rgba(7,10,14,.30) 0 3px,transparent 3px 6px);
  box-shadow:inset 0 0 0 1px rgba(7,10,14,.55);
}
.recit-e037-progression{
  margin:0 0 9px;color:var(--muted);font-size:10px;
  font-variant-numeric:tabular-nums;
}

/* E037-08 — point courant : marqueur de forme + filet épais (pas seulement la couleur). */
.recit-e037-courant{margin-right:4px;color:var(--gold-bright);font-size:11px;}
.recit-layout[data-e037="on"] .recit-thread-item.is-current,
.recit-layout[data-e037="on"] .recit-thread-item[aria-current="step"]{
  border-left-width:4px;font-weight:700;
}

/* E037-09 — regroupement perceptif : enclosure des outils et des commandes. */
.recit-layout[data-e037="on"] .c3a-group{
  padding:4px 6px;border:1px solid var(--line);border-radius:8px;
}
.recit-layout[data-e037="on"] .recit-actions{
  gap:10px;margin:14px 0;padding:10px;
  border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02);
}

/* E037-10 — panneau de mesures, masqué puis remonté dans le tiroir diagnostic. */
.recit-e037-mesures{display:none !important;}
body.recit-diagnostics .recit-e037-mesures{
  display:block !important;margin:0 0 12px;padding:8px 10px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);
}
.recit-e037-mesures h2{margin:0 0 6px;color:var(--gold);font-size:12px;font-weight:600;}
.recit-e037-mesures p{
  margin:0 0 4px;color:var(--muted);font-size:11px;line-height:1.45;
  font-variant-numeric:tabular-nums;
}
`;

/* ------------------------------------------------------------------------- *
 * Utilitaires de requête — jamais de jet, jamais d'effet de bord.
 * ------------------------------------------------------------------------- */
function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* Lecture bornée de l'étape courante depuis le libellé réel du récit. */
function readStep(layout) {
  const kicker = q(layout, '.view-kicker');
  const found = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
  const index = found ? Math.max(0, Number(found[1]) - 1) : 0;
  const total = found ? Math.max(0, Number(found[2])) : 0;
  const percent = total ? Math.round(((index + 1) / total) * 100) : 0;
  return { index, total, percent };
}

/* E037-03 — lettre de certitude, codée en texte et non en couleur seule. */
const CONF_LETTRE = {
  'vérifié': 'V', 'certain': 'C', 'probable': 'P', 'disputed': 'D',
};

function confidenceMarker(el, item) {
  const value = item.getAttribute && item.getAttribute('data-confidence') || '';
  const lettre = CONF_LETTRE[value] || '?';
  const marker = el('span', 'recit-e037-conf', lettre);
  marker.setAttribute('aria-hidden', 'true');
  const libelle = value ? `Certitude : ${value}` : 'Certitude non renseignée';
  if (typeof marker.title === 'string') marker.title = libelle;
  if (typeof item.insertBefore === 'function') item.insertBefore(marker, item.firstChild);
  return lettre;
}

/* E037-08 — marqueur de forme du point courant, distinct du codage coloriel. */
function currentMarker(el, item) {
  const marker = el('span', 'recit-e037-courant', '▶');
  marker.setAttribute('aria-hidden', 'true');
  if (typeof item.insertBefore === 'function') item.insertBefore(marker, item.firstChild);
}

/* E037-06 — synchronise le thème et son témoin sur le rendu courant. */
function syncContrast() {
  const cur = latest;
  if (!cur || !cur.layout || typeof cur.layout.classList !== 'object') return;
  cur.layout.classList.toggle('recit-e037-fort', contrasteFort);
  if (cur.toggle && typeof cur.toggle.setAttribute === 'function') {
    cur.toggle.setAttribute('aria-pressed', String(contrasteFort));
  }
  setText(cur.toggleEtat, contrasteFort ? 'activé' : 'désactivé');
  setText(cur.nodes.etat, `Bascale contraste renforcé : ${contrasteFort ? 'activée' : 'désactivée'}.`);
}

/* E037-06 — bouton de bascule, posé dans la barre d'outils existante. */
function addToggle(el, layout) {
  const tools = q(layout, '#c3a-tools') || q(layout, '.c3a-tools');
  if (!tools || typeof tools.appendChild !== 'function') return null;
  const button = el('button', 'recit-e037-toggle', 'Contraste renforcé');
  button.id = 'e037-contrast-toggle';
  button.type = 'button';
  button.setAttribute('aria-pressed', String(contrasteFort));
  const state = el('span', 'recit-e037-toggle-etat', contrasteFort ? 'activé' : 'désactivé');
  state.id = 'e037-contrast-etat';
  button.addEventListener('click', () => {
    contrasteFort = !contrasteFort;
    syncContrast();
  });
  tools.appendChild(button);
  tools.appendChild(state);
  return { button, state };
}

/* E037-07 — étiquette chiffrée de progression, après la barre. */
function addProgressLabel(el, layout, step) {
  const progress = q(layout, '.recit-progress');
  if (!progress || !progress.parentNode) return null;
  const label = el('p', 'recit-e037-progression',
    `Progression : ${step.percent} % · étape ${step.index + 1} sur ${step.total || '—'}.`);
  label.id = 'e037-progression';
  progress.parentNode.insertBefore(label, progress.nextSibling);
  return label;
}

/* E037-10 — panneau de mesures : texte réel, lisible et falsifiable. */
function addPanel(el, stage) {
  const old = typeof document !== 'undefined'
    ? document.getElementById(PANEL_ID) : null;
  if (old && old.parentNode) {
    try { old.parentNode.removeChild(old); } catch { /* déjà détaché */ }
  }
  const panel = el('section', 'recit-e037-mesures');
  panel.id = PANEL_ID;
  panel.setAttribute('data-recit-diagnostic', '');
  panel.setAttribute('aria-label', 'Mesures de contraste et de perception de la vue récit');
  const heading = el('h2', '', 'E037 — Contraste et perception · mesures');
  heading.id = 'e037-mesures-titre';
  panel.appendChild(heading);
  const lignes = [
    ['texte', 'Texte secondaire : --muted 7.76:1 → 11.32:1 · --muted-2 5.98:1 → 9.54:1 (fond #070a0e, cible AAA ≥ 7).'],
    ['taille', 'Petits textes : 8–9 px → 11 px, interlignage 1.5 à 1.65 (fil, légende, chrono, crédit, légendes image).'],
    ['certitude', 'Certitude : — marqueur(s) V/C/P/D dans le fil, aucun codage par la couleur seule.'],
    ['focus', 'Focus : anneau 3 px + halo 5 px + liseré 2 px, visible sur fond clair et sombre.'],
    ['image', 'Image : voile sombre 104 px sous légende et crédit, texte blanc ombré.'],
    ['etat', 'Bascale contraste renforcé : —'],
    ['progression', 'Progression : —'],
    ['courant', 'Point courant : — marqueur(s) de forme ▶ + filet gauche 4 px.'],
    ['groupes', 'Regroupement : commandes et filtres encadrés (proximité et enclosure).'],
    ['mouvement', 'Préférence de mouvement réduit : —'],
  ];
  const nodes = {};
  lignes.forEach(([key, text]) => {
    const line = el('p', '', text);
    line.id = `e037-mesures-${key}`;
    panel.appendChild(line);
    nodes[key] = line;
  });
  stage.appendChild(panel);
  return nodes;
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille.
 * ------------------------------------------------------------------------- */
register('E037', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof css === 'function') css(CSS_ID, RULES);
  const body = q(layout, '.recit-body');
  if (!body) return;

  layout.dataset.e037 = 'on';
  const step = readStep(layout);
  const items = qa(layout, '.recit-thread-item');

  /* E037-03 — marqueurs de certitude sur chaque item du fil. */
  let marques = 0;
  items.forEach((item) => {
    try { if (confidenceMarker(el, item)) marques += 1; } catch { /* item non annotable */ }
  });

  /* E037-08 — marqueur du point courant (forme, pas seulement couleur). */
  let courants = 0;
  items.forEach((item) => {
    const isCurrent = item.getAttribute && (
      item.getAttribute('aria-current') === 'step'
      || (item.classList && item.classList.contains('is-current')));
    if (!isCurrent) return;
    try { currentMarker(el, item); courants += 1; } catch { /* marqueur ignoré */ }
  });

  /* E037-07 — étiquette de progression à double codage. */
  addProgressLabel(el, layout, step);

  /* E037-09 — regroupement : les commandes et filtres sont déjà dans le DOM,
     l'enclosure est portée uniquement par la feuille de style. */

  latest = { stage, layout, reducedMotion, toggle: null, toggleEtat: null, nodes: null };

  /* E037-06 — bascule locale puis synchronisation immédiate du thème. */
  const toggle = addToggle(el, layout);
  if (toggle) { latest.toggle = toggle.button; latest.toggleEtat = toggle.state; }
  syncContrast();

  /* E037-10 — panneau de mesures, puis remplissage de ses témoins. */
  latest.nodes = addPanel(el, stage);
  if (latest.nodes) {
    setText(latest.nodes.certitude,
      `Certitude : ${marques} marqueur(s) V/C/P/D sur ${items.length} item(s) du fil, aucun codage par la couleur seule.`);
    setText(latest.nodes.progression,
      `Progression : ${step.percent} % · étape ${step.index + 1} sur ${step.total || '—'} · motif en bandes + libellé chiffré.`);
    setText(latest.nodes.courant,
      `Point courant : ${courants} marqueur(s) de forme ▶ + filet gauche 4 px.`);
    let reduit = false;
    try { reduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false; }
    catch { reduit = false; }
    setText(latest.nodes.mouvement,
      `Préférence de mouvement réduit : ${reduit ? 'activée' : 'désactivée'} (aucune animation introduite).`);
  }
  syncContrast();
});
