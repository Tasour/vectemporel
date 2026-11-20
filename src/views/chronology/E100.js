import { register } from './registry.js';
import { viewDiagnostics } from './registry.js';

/*
 * Lentille E100 — « validation finale et diagnostic de la vue, bilan des
 * 100 lentilles » (rapport UNIFIED_AUDIT/CHRONOLOGIE/views/E100.md).
 *
 * C'est la dernière lentille de la vague CHRONOLOGIE. Elle n'édite aucun
 * fichier partagé : elle ne pose qu'un tableau de bord de diagnostic,
 * replié par défaut, dans le stage courant. Les dix chantiers E100-01 …
 * E100-10 sont implémentés dans CE seul module.
 *
 * La coque reconstruisant le DOM à chaque rendu (chronology.js:30-31), chaque
 * nœud est (re)créé via ensureNode() avec garde d'existence par identifiant ;
 * l'état de la bascule et le dernier contexte sont mémorisés au niveau module.
 * Aucune boucle d'animation propre, aucun timer, aucun réseau, aucun aléa,
 * aucun affichage en console : le diagnostic est recalculé à la demande
 * (ouverture du panneau, retour de visibilité), jamais en continu.
 *
 * Feuille de styles unique, injectée une seule fois. Préfixe DOM : `e100-`.
 */

const CSS_ID = 'chronology-e100';
const EXPECTED = 100;   // famille E001–E100 annoncée par la vague
const TARGET_MIN = 36;  // px — plancher WCAG 2.5.4 (AA)

let current = null;    // { stage, layout, reducedMotion, nodes, toggle }
let open = false;      // état de la bascule, survivant aux re-renders
let installed = false; // garde de l'écouteur global de visibilité

/* Feuille de styles unique, cadrée par [data-e100="on"] posé sur
   .chronology-layout : aucune règle ne déborde sur une autre vue. */
const RULES = `
.chronology-layout[data-e100="on"] .e100-toggle{
  min-height:36px;padding:6px 12px;border:1px solid var(--line-strong);
  border-radius:8px;background:rgba(230,185,111,.08);color:var(--gold-bright);
  font:inherit;font-size:11px;cursor:pointer;
}
.chronology-layout[data-e100="on"] .e100-toggle:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
.chronology-layout[data-e100="on"] .e100-dashboard{
  display:none;margin:12px 0 0;padding:10px 12px;
  border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);
}
.chronology-layout[data-e100="on"][data-e100-open="1"] .e100-dashboard{display:block}
.chronology-layout[data-e100="on"] .e100-title{
  margin:0 0 8px;color:var(--gold);font-family:var(--serif);
  font-size:13px;font-weight:600;
}
.chronology-layout[data-e100="on"] .e100-line{
  margin:0 0 5px;color:var(--muted);font-size:11px;line-height:1.45;
  font-variant-numeric:tabular-nums;
}
.chronology-layout[data-e100="on"] #e100-verdict{color:var(--ink);font-weight:600}
@media (max-width:620px){
  .chronology-layout[data-e100="on"] .e100-dashboard{padding:8px 10px}
  .chronology-layout[data-e100="on"] .e100-line{overflow-wrap:anywhere}
}
@media (prefers-reduced-motion:reduce){
  .chronology-layout[data-e100="on"] .e100-toggle,
  .chronology-layout[data-e100="on"] .e100-dashboard{transition:none!important}
}
.chronology-layout[data-e100="on"][data-e100-reduced="1"] .e100-toggle,
.chronology-layout[data-e100="on"][data-e100-reduced="1"] .e100-dashboard{transition:none!important}
`;

/* E100-10 — garde d'existence : réutilise un nœud déjà monté (même id) en le
   déplaçant dans le parent courant, sinon le crée. Aucun id dupliqué, aucun
   écouteur attaché deux fois (voir dataset.e100Bound). */
function ensureNode(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = ctx.el(tag, className || '');
    node.id = id;
  }
  if (node.parentNode !== parent) parent.appendChild(node);
  return node;
}

function setText(node, text) {
  if (node) node.textContent = text;
}

function applyOpenState() {
  const lay = current && current.layout;
  if (lay) lay.dataset.e100Open = open ? '1' : '0';
  const btn = document.getElementById('e100-toggle');
  if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

/* E100-06 — la bascule elle-même respecte la cible minimale et le focus
   visible ; le côté informationnel du diagnostic ne repose pas sur la couleur
   (le verdict est un texte, cf. E100-09). */
function addToggle(ctx) {
  const tools = ctx.layout.querySelector('#atlas-chrono-tools');
  const btn = ensureNode(ctx, 'e100-toggle', 'button', 'e100-toggle', tools || ctx.layout);
  if (btn.dataset.e100Bound !== '1') {
    btn.dataset.e100Bound = '1';
    btn.type = 'button';
    btn.setAttribute('aria-controls', 'e100-dashboard');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.textContent = 'Diagnostic E100';
    btn.addEventListener('click', () => {
      open = !open;
      applyOpenState();
      if (open) paint();
    });
  }
  return btn;
}

/* E100-01 … E100-09 — un seul panneau, une seule ligne par contrôle. Le
   verdict est la seule région live ajoutée par la lentille. */
function addDashboard(ctx) {
  const panel = ensureNode(ctx, 'e100-dashboard', 'section', 'e100-dashboard', ctx.layout);
  panel.setAttribute('aria-label', 'Diagnostic final de la vue chronologie — bilan des cent lentilles');
  const title = ensureNode(ctx, 'e100-title', 'h2', 'e100-title', panel);
  title.textContent = 'Diagnostic E100 — bilan des lentilles';

  const fields = [
    ['registry', 'Registre : —'],
    ['ids', 'IDs uniques : —'],
    ['structure', 'Structure sémantique : —'],
    ['live', 'Régions live : —'],
    ['aria', 'États ARIA : —'],
    ['targets', 'Cibles tactiles : —'],
    ['network', 'Réseau : —'],
    ['motion', 'Mouvement : —'],
    ['verdict', 'Verdict : —'],
  ];
  const nodes = {};
  fields.forEach(([key, text]) => {
    const line = ensureNode(ctx, `e100-${key}`, 'p', 'e100-line', panel);
    setText(line, text);
    nodes[key] = line;
  });
  const verdict = nodes.verdict;
  verdict.setAttribute('role', 'status');
  verdict.setAttribute('aria-live', 'polite');
  verdict.setAttribute('aria-atomic', 'true');
  return nodes;
}

/* E100-02 — détection des identifiants dupliqués dans tout le document. */
function checkIds() {
  const seen = new Set();
  let duplicates = 0;
  document.querySelectorAll('[id]').forEach((node) => {
    if (seen.has(node.id)) duplicates += 1;
    else seen.add(node.id);
  });
  return { total: seen.size, duplicates };
}

/* E100-03 — contrôle de la hiérarchie de titres produite par
   chronology.js:227 (h1), :423 (h2) et :462 (h3). */
function checkStructure() {
  return {
    h1: document.querySelectorAll('h1').length,
    h2: document.querySelectorAll('h2').length,
    h3: document.querySelectorAll('h3').length,
    main: document.querySelectorAll('main').length,
  };
}

/* E100-04 — dénombre les régions live existantes (chronology.js:121-133)
   et vérifie que le verdict E100 est bien la seule région live de la lentille. */
function checkLive() {
  return {
    total: document.querySelectorAll('[role="status"], [aria-live]').length,
    verdict: document.querySelectorAll('#e100-verdict[role="status"][aria-live="polite"]').length,
  };
}

/* E100-05 — états d'état portés par l'attribut, pas par la couleur :
   arias courants des bandes/cartes (chronology.js:290, :390) et filtres
   à aria-pressed (chronology.js:334, :449). */
function checkAria() {
  return {
    bands: document.querySelectorAll('.era-band[aria-current="true"]').length,
    cards: document.querySelectorAll('.event-card[aria-current="true"]').length,
    pressed: document.querySelectorAll('.atlas-chrono-tag[aria-pressed]').length,
  };
}

/* E100-06 — mesure des cibles tactiles ; constat informationnel, la vue
   historique gardant ses propres boutons à 30 px (chronology.js:54, :111). */
function checkTargets() {
  let total = 0;
  let small = 0;
  document.querySelectorAll('button, input, select, [role="button"]').forEach((node) => {
    if (node.disabled || node.getAttribute('aria-hidden') === 'true') return;
    const rect = node.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    total += 1;
    if (rect.height < TARGET_MIN - 0.5 || rect.width < TARGET_MIN - 0.5) small += 1;
  });
  return { total, small };
}

/* E100-07 — aucune référence absolue (http/https ou « // ») ne doit être
   introduite dans le DOM : les sources sont titrées sans lien (chronology.js:489-499). */
function checkNetwork() {
  let distant = 0;
  document.querySelectorAll('[src], [href]').forEach((node) => {
    ['src', 'href'].forEach((attr) => {
      const value = node.getAttribute(attr);
      if (value && /^\s*(https?:)?\/\//i.test(value)) distant += 1;
    });
  });
  return distant;
}

/* E100-08 — couplage à la préférence de mouvement, exposée dans le DOM. */
function checkMotion() {
  const reduced = Boolean(current && current.reducedMotion && current.reducedMotion());
  if (current && current.layout) current.layout.dataset.e100Reduced = reduced ? '1' : '0';
  return reduced;
}

/* Recalcule les neuf contrôles puis le verdict agrégé. Appelé à l'ouverture
   du panneau et au retour de visibilité, jamais en boucle. */
function paint() {
  if (!current || !current.nodes) return;
  const nodes = current.nodes;
  const report = typeof viewDiagnostics === 'function'
    ? viewDiagnostics()
    : { entries: [], diagnostics: [] };
  const entries = Array.isArray(report.entries) ? report.entries.length : 0;
  const errors = Array.isArray(report.diagnostics) ? report.diagnostics.length : 0;
  const ids = checkIds();
  const structure = checkStructure();
  const live = checkLive();
  const aria = checkAria();
  const targets = checkTargets();
  const distant = checkNetwork();
  const reduced = checkMotion();

  /* E100-01 — bilan du registre, lu sans écrire dans registry.js. */
  setText(nodes.registry,
    `Registre : ${entries} lentille(s) enregistrée(s) (attendu ${EXPECTED}) · ${errors} diagnostic(s) d'erreur.`);
  setText(nodes.ids,
    `IDs : ${ids.total} identifiant(s) unique(s), ${ids.duplicates} doublon(s).`);
  setText(nodes.structure,
    `Structure : h1 ${structure.h1} · h2 ${structure.h2} · h3 ${structure.h3} · main ${structure.main} (la vue utilise une section, chronology.js:218).`);
  setText(nodes.live,
    `Régions live : ${live.total} dans le document, ${live.verdict} verdict E100.`);
  setText(nodes.aria,
    `États ARIA : ${aria.bands} ère(s) courante(s), ${aria.cards} repère(s) courant(s), ${aria.pressed} filtre(s) à aria-pressed.`);
  setText(nodes.targets,
    `Cibles : ${targets.total} mesurées, ${targets.small} sous ${TARGET_MIN} px (constat informationnel).`);
  setText(nodes.network,
    `Réseau : ${distant} référence(s) absolue(s) détectée(s) dans le DOM.`);
  setText(nodes.motion,
    `Mouvement : ${reduced ? 'réduit' : 'complet'} · panneau ${open ? 'ouvert' : 'fermé'}.`);

  /* E100-09 — limite falsifiable : le verdict échoue si l'un des contrôles
     bloquants (erreurs de lentille, ID dupliqué, h1 non unique, lien distant,
     verdict live absent) est avéré. Le texte, jamais la seule couleur, porte
     le résultat. */
  const blockers = [];
  if (errors) blockers.push(`${errors} lentille(s) en erreur`);
  if (ids.duplicates) blockers.push(`${ids.duplicates} ID(s) dupliqué(s)`);
  if (structure.h1 !== 1) blockers.push(`h1 unique non vérifié (${structure.h1})`);
  if (distant) blockers.push(`${distant} lien(s) distant(s)`);
  if (live.verdict !== 1) blockers.push('verdict live absent');
  setText(nodes.verdict, blockers.length
    ? `Verdict : À REVOIR — ${blockers.join(' · ')}.`
    : `Verdict : PRÊT POUR LIVRAISON — ${entries}/${EXPECTED} lentilles, aucun doublon d'ID, h1 unique, zéro réseau.`);
}

/* E100-08 — unique écouteur global, installé une seule fois. Aucun timer,
   aucune boucle rAF : le diagnostic est relu au retour d'onglet uniquement. */
function install() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && open) paint();
  });
}

register('E100', ctx => {
  if (!ctx || !ctx.stage || !ctx.layout) return;
  ctx.css(CSS_ID, RULES);
  ctx.layout.dataset.e100 = 'on';
  current = {
    stage: ctx.stage,
    layout: ctx.layout,
    reducedMotion: ctx.reducedMotion,
    nodes: null,
    toggle: null,
  };
  current.toggle = addToggle(ctx);
  current.nodes = addDashboard(ctx);
  applyOpenState();
  install();
  paint();
});
