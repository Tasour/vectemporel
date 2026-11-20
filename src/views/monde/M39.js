import { register } from './registry.js';

/* Lentille M39 — Taxonomie du Monde (domaine D : données & sémantique).
 *
 * Un seul fichier possédé. Tout passe par ctx : CSS injecté une seule fois,
 * un panneau à ID unique dans la colonne de décision, aucun bouton, aucun lien,
 * aucune région live, aucun écouteur, aucun réseau, aucun aléa, zéro trace de débogage.
 *
 * Les libellés, rôles, niveaux, raccourcis, définitions et la version sont lus
 * dans l'API publique window.VATLAS (app.js:17-39, 132-155). Le repli local
 * ci-dessous est le miroir strict de app.js : il ne sert qu'au premier rendu,
 * car app.js:126 appelle mount() avant de publier window.VATLAS à la ligne 132.
 * Aucun compteur n'est saisi à la main : tout est recalculé depuis ctx.countries.
 */

const CSS_ID = 'monde-m39';
const PANEL_ID = 'm39-situation';
const TITLE_ID = 'm39-situation-title';
const POSITION_ID = 'm39-position';
const LADDER_ID = 'm39-ladder';
const COUNTS_ID = 'm39-counts';
const ANCHOR_ID = 'm39-anchor';
const LEX_ID = 'm39-lexicon';
const VERSION_ID = 'm39-version';

/* Miroir de app.js:17-39 — aucune valeur nouvelle, aucune donnée historique. */
const FALLBACK_VERSION = 'm4.2';
const FALLBACK_TAXONOMY = Object.freeze([
  Object.freeze({ id: 'globe', label: 'Monde', digit: '1', letter: 'm', level: 1, role: 'Quels pays sont documentés ?' }),
  Object.freeze({ id: 'chronology', label: 'Chrono', digit: '2', letter: 'c', level: 2, role: 'Quelles ères et quels repères ?' }),
  Object.freeze({ id: 'recit', label: 'Récit', digit: '3', letter: 'r', level: 3, role: 'Que disent les points vérifiés ?' }),
  Object.freeze({ id: 'geography', label: 'Géo', digit: '4', letter: 'g', level: 4, role: 'Où se situent les lieux ?' }),
  Object.freeze({ id: 'constellation', label: 'Const', digit: '5', letter: 's', level: 5, role: 'Comment l’ensemble se synthétise-t-il ?' }),
  Object.freeze({ id: 'points', label: 'Points', digit: '6', letter: 'p', level: 6, role: 'Quels points vérifiés isoler ?' }),
]);
const FALLBACK_LEXICON = Object.freeze({
  pays: 'Une des 10 entrées documentées par les audits locaux.',
  ère: 'Période d’un pays, porteuse de repères.',
  repère: 'Événement daté rattaché à une ère ; 229 au total.',
  point: 'Assertion extraite d’un audit local, isolée par ère et domaine ; 845 au total.',
  lieu: 'Repère géographique documenté, avec coordonnées locales.',
  certitude: 'Degré repris de l’audit : certain, probable, disputé, non documenté.',
  source: 'Référence du registre local, affichée sans lien externe.',
});

/* M39-10 : une seule feuille, injectée par ctx.css (cssOnce). Le panneau vit
   dans le flux de la colonne de décision : pas de position absolue, donc aucun
   chevauchement avec le HUD (styles.css:132), les commandes (:162) ou les
   panneaux M06/M17 (right/bottom). Aucune cible clavier n'est introduite. */
const CSS = `
  #${PANEL_ID}{
    margin-top:14px;padding:10px 11px;
    border:1px solid var(--line);border-radius:8px;
    background:rgba(255,255,255,.02);color:var(--muted);
    font-size:11px;line-height:1.45;font-variant-numeric:tabular-nums;
    pointer-events:none;
  }
  #${PANEL_ID} h2{
    margin:0 0 6px;color:var(--gold);font-family:var(--serif);
    font-size:15px;font-weight:600;
  }
  #${PANEL_ID} p{margin:0 0 6px}
  #${PANEL_ID} p:last-child{margin-bottom:0}
  #${PANEL_ID} .m39-kicker{
    display:block;margin:8px 0 3px;color:var(--ink-soft);
    font-size:9px;letter-spacing:.12em;text-transform:uppercase;
  }
  #${PANEL_ID} ol{margin:3px 0 6px;padding-left:18px}
  #${PANEL_ID} li{margin:1px 0;color:var(--ink-soft)}
  #${PANEL_ID} li[aria-current="location"]{color:var(--gold-bright);font-weight:600}
  #${PANEL_ID} .m39-key{color:var(--gold);font-variant-numeric:tabular-nums}
  #${PANEL_ID} dl{
    display:grid;grid-template-columns:max-content minmax(0,1fr);
    gap:2px 8px;margin:3px 0 0;
  }
  #${PANEL_ID} dt{color:var(--gold-bright);font-weight:600}
  #${PANEL_ID} dd{margin:0;color:var(--muted)}
  #${VERSION_ID}{color:var(--muted-2)}
  @media (max-width:700px){
    #${PANEL_ID}{font-size:10px;padding:8px 9px}
    #${PANEL_ID} dl{grid-template-columns:1fr;gap:0}
    #${PANEL_ID} dd{margin:0 0 3px}
  }
`;

function api() {
  return window.VATLAS || null;
}

/* M39-06 : lecture défensive, même motif que keyboard.js:18-25. */
function taxonomy() {
  const published = api();
  return published && Array.isArray(published.taxonomy) && published.taxonomy.length
    ? published.taxonomy : FALLBACK_TAXONOMY;
}

function lexicon() {
  const published = api();
  return published && published.lexicon && typeof published.lexicon === 'object'
    ? published.lexicon : FALLBACK_LEXICON;
}

function version() {
  const published = api();
  return published && published.taxonomyVersion
    ? String(published.taxonomyVersion) : FALLBACK_VERSION;
}

function snapshot() {
  const published = api();
  if (!published || typeof published.position !== 'function') return null;
  try { return published.position(); } catch { return null; }
}

/* M39-01/02 : l'entrée courante est celle de position(), pas un littéral. */
function currentEntry(list, ctx) {
  const pos = snapshot();
  const view = (pos && pos.view) || (ctx.state && ctx.state.view) || 'globe';
  return list.find((entry) => entry && entry.id === view)
    || list.find((entry) => entry && entry.id === 'globe')
    || list[0] || null;
}

function positionText(entry, list, ctx) {
  const entryLabel = entry && entry.label ? entry.label : '';
  const entryLevel = entry && entry.level ? entry.level : 1;
  const entryRole = entry && entry.role ? entry.role : '';
  const pos = snapshot();
  const label = (pos && pos.label) || entryLabel;
  const level = (pos && pos.level) || entryLevel;
  const role = entryRole || (pos && pos.role) || '';
  const base = `Vous êtes ici : ${label} · niveau ${level} sur ${list.length} · ${role}`;
  const name = (pos && pos.countryName)
    || (ctx.selected && ctx.selected.name) || null;
  return name ? `${base} · pays courant : ${name}` : `${base} · aucun pays sélectionné`;
}

/* M39-04 : zéro chiffre écrit à la main ; tout vient des pays reçus. */
function countsText(ctx) {
  const countries = Array.isArray(ctx.countries) ? ctx.countries : [];
  let eras = 0;
  let events = 0;
  let points = 0;
  for (const country of countries) {
    if (Array.isArray(country.eras)) eras += country.eras.length;
    if (Array.isArray(country.events)) events += country.events.length;
    if (Array.isArray(country.points)) points += country.points.length;
  }
  return `Portée comptée depuis les pays : ${countries.length} pays · ${eras} ères · ${events} repères · ${points} points`;
}

function anchorFor(ctx) {
  const countries = Array.isArray(ctx.countries) ? ctx.countries : [];
  const id = ctx.state && ctx.state.countryId;
  const chosen = countries.find((country) => country.id === id) || ctx.selected || null;
  return chosen ? `Ancrage : ${chosen.name}` : 'Ancrage : aucun pays sélectionné';
}

/* M39-09 : les rappels réinterrogent le nœud courant ; aucun état module. */
function setAnchor(ctx, country) {
  const node = document.getElementById(ANCHOR_ID);
  if (!node) return;
  node.textContent = country && country.name
    ? `Ancrage : survol ${country.name}`
    : anchorFor(ctx);
}

function buildLadder(ctx, list, entry) {
  const ladder = ctx.el('ol', 'm39-ladder');
  ladder.id = LADDER_ID;
  list.forEach((view, index) => {
    if (!view) return;
    const level = view.level || index + 1;
    const key = view.digit && view.letter ? ` (${view.digit}/${view.letter})` : '';
    const li = ctx.el('li', 'm39-step',
      `Niveau ${level} · ${view.label || ''}${key} — ${view.role || ''}`);
    if (entry && view.id === entry.id) li.setAttribute('aria-current', 'location');
    ladder.appendChild(li);
  });
  return ladder;
}

function buildLexicon(ctx) {
  const dl = ctx.el('dl', 'm39-lexicon');
  dl.id = LEX_ID;
  const words = lexicon();
  Object.keys(words).forEach((term) => {
    dl.appendChild(ctx.el('dt', 'm39-term', term));
    dl.appendChild(ctx.el('dd', 'm39-def', String(words[term])));
  });
  return dl;
}

function buildPanel(ctx) {
  const list = taxonomy();
  const entry = currentEntry(list, ctx);
  const panel = ctx.el('section', 'm39-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = ctx.el('h2', 'm39-title', 'Taxonomie du Monde');
  title.id = TITLE_ID;
  const position = ctx.el('p', 'm39-position', positionText(entry, list, ctx));
  position.id = POSITION_ID;
  const versionLine = ctx.el('p', 'm39-version',
    `Modèle de navigation : ${version()} · ${list.length} vues ordonnées`);
  versionLine.id = VERSION_ID;

  const ladderKicker = ctx.el('span', 'm39-kicker', 'Fil macro → micro');
  const counts = ctx.el('p', 'm39-counts', countsText(ctx));
  counts.id = COUNTS_ID;
  const anchor = ctx.el('p', 'm39-anchor', anchorFor(ctx));
  anchor.id = ANCHOR_ID;
  const lexKicker = ctx.el('span', 'm39-kicker', 'Vocabulaire normatif (API publique)');

  panel.append(title, position, versionLine, ladderKicker, buildLadder(ctx, list, entry),
    counts, anchor, lexKicker, buildLexicon(ctx));
  return panel;
}

register('M39', (ctx) => {
  if (!ctx || (!ctx.scene && !ctx.stage)) return;
  ctx.css(CSS_ID, CSS);

  /* M39-08 : ajout en fin de colonne de décision, sans bouton : le compteur
     E2E `.globe-list button === 10` (tests/e2e.mjs:24) reste inchangé. */
  const decision = ctx.stage && typeof ctx.stage.querySelector === 'function'
    ? ctx.stage.querySelector('.globe-list') : null;
  const parent = decision || ctx.scene;
  if (!parent || typeof parent.appendChild !== 'function') return;

  const previous = document.getElementById(PANEL_ID);
  if (previous) previous.remove();
  parent.appendChild(buildPanel(ctx));

  /* M39-09 : le survol clavier est déjà notifié par globe.js:193 et le survol
     moteur par globe.js:455 ; aucun écouteur propre, aucun message live. */
  ctx.onHover(({ country } = {}) => { setAnchor(ctx, country || null); });
  ctx.onLeave(() => { setAnchor(ctx, null); });
});
