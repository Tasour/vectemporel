import { register } from './registry.js';

/*
 * Lentille E055 — « Accessibilité ARIA et lecteurs d'écran » (vue Récit).
 *
 * Dix chantiers concrets et distincts (E055-01 … E055-10) sont implémentés dans
 * CE seul module : aucun fichier partagé n'est modifié. La coque reconstruisant
 * le DOM à chaque rendu, apply() recrée ses nœuds dans le stage courant.
 *
 * Un seul register('E055', …) et un seul css('recit-e055', …) regroupant toutes
 * les règles, cadrées par .recit-layout[data-e055="on"]. Toutes les classes
 * créées sont préfixées `recit-e055-` ; tous les ids sont préfixés `e055-` et
 * uniques. Zéro console, zéro réseau, zéro aléa, aucun innerHTML. Enrichissement
 * strictement additif : aucun attribut préexistant n'est supprimé ni réécrit ;
 * sans JavaScript, le récit reste intégralement lisible et navigable.
 */

const CSS_ID = 'recit-e055';
const PANEL_ID = 'e055-diagnostic';

/* ------------------------------------------------------------------------- *
 * Feuille de style unique. Les textes « cachés » restent exposés aux lecteurs
 * d'écran (aucun aria-hidden) ; ils n'occupent aucun pixel à l'écran.
 * ------------------------------------------------------------------------- */
const RULES = `
.recit-e055-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.recit-layout[data-e055="on"] .recit-progress{position:relative}
.recit-e055-panel{display:none!important}
body.recit-diagnostics [data-recit-diagnostic].recit-e055-panel,
body.recit-diagnostics .recit-e055-panel{
  display:block!important;margin:0 0 12px;padding:8px 10px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);
}
.recit-e055-panel h2{margin:0 0 6px;color:var(--gold);font-size:12px;font-weight:600}
.recit-e055-panel p{
  margin:0 0 4px;color:var(--muted);font-size:11px;line-height:1.45;
  font-variant-numeric:tabular-nums;
}
`;

/* ------------------------------------------------------------------------- *
 * Utilitaires non destructifs.
 * ------------------------------------------------------------------------- */

/* ne jamais écraser un attribut déjà posé (par une lentille antérieure). */
function setOnce(node, name, value) {
  if (!node || typeof node.setAttribute !== 'function' || value === undefined || value === null) return false;
  if (typeof node.hasAttribute === 'function' && node.hasAttribute(name)) return false;
  node.setAttribute(name, String(value));
  return true;
}

/* ajouter un jeton à une liste d'identifiants sans toucher aux autres. */
function addToken(node, name, token) {
  if (!node || !token || typeof node.getAttribute !== 'function' || typeof node.setAttribute !== 'function') return false;
  const current = node.getAttribute(name) || '';
  const tokens = current.split(/\s+/).filter(Boolean);
  if (tokens.indexOf(token) >= 0) return false;
  tokens.push(token);
  node.setAttribute(name, tokens.join(' '));
  return true;
}

/* réutiliser un id existant, ou en poser un nouveau préfixé. */
function idOf(node, wanted) {
  if (!node || typeof node.getAttribute !== 'function') return null;
  const existing = node.getAttribute('id');
  if (existing) return existing;
  if (typeof node.setAttribute !== 'function') return null;
  node.setAttribute('id', wanted);
  return wanted;
}

/* détruire toute incarnation antérieure d'un id avant de le recréer. */
function fresh(el, id, tag, className, value) {
  try {
    const old = document.getElementById(id);
    if (old && old.parentNode) old.parentNode.removeChild(old);
  } catch { /* document indisponible ou nœud déjà détaché */ }
  const node = el(tag, className, value);
  node.id = id;
  return node;
}

/* chaque chantier est isolé : une cible manquante ne casse jamais le rendu. */
function safe(fn) {
  try { return fn(); } catch { return null; }
}

/* ------------------------------------------------------------------------- *
 * E055-01 — rang ordinal des points du fil.
 * ------------------------------------------------------------------------- */
function chantier01(layout) {
  const list = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  if (!list || typeof list.querySelectorAll !== 'function') return { total: 0 };
  const items = Array.from(list.querySelectorAll('li'));
  items.forEach((li, i) => {
    setOnce(li, 'aria-posinset', String(i + 1));
    setOnce(li, 'aria-setsize', String(items.length));
  });
  return { total: items.length };
}

/* ------------------------------------------------------------------------- *
 * E055-02 — le nom du fil vient du titre réellement affiché.
 * ------------------------------------------------------------------------- */
function chantier02(layout) {
  const nav = layout.querySelector('.recit-thread');
  if (!nav) return null;
  const title = nav.querySelector('.recit-thread-title');
  if (!title) return null;
  const id = idOf(title, 'e055-thread-title');
  if (!id) return null;
  addToken(nav, 'aria-labelledby', id);
  return { id, texte: (title.textContent || '').trim() };
}

/* ------------------------------------------------------------------------- *
 * E055-03 — nommer la barre de progression et préciser son orientation.
 * ------------------------------------------------------------------------- */
function chantier03(layout) {
  const bar = layout.querySelector('.recit-progress');
  if (!bar) return null;
  setOnce(bar, 'role', 'progressbar');
  const kicker = layout.querySelector('.view-kicker');
  const id = kicker ? idOf(kicker, 'e055-kicker') : null;
  if (id) addToken(bar, 'aria-labelledby', id);
  else setOnce(bar, 'aria-label', 'Progression de la lecture du récit');
  setOnce(bar, 'aria-orientation', 'horizontal');
  return { nomme: Boolean(id || bar.hasAttribute('aria-label')) };
}

/* ------------------------------------------------------------------------- *
 * E055-04 — degré de certitude doublé d'un niveau chiffré audible.
 * ------------------------------------------------------------------------- */
function chantier04(el, layout) {
  const chip = layout.querySelector('.recit-conf');
  if (!chip || !chip.parentNode) return null;
  const visible = (chip.textContent || '').trim();
  let niveau = 0;
  let nom = 'non précisée';
  if (visible.indexOf('✓') >= 0) { niveau = 4; nom = 'vérifié'; }
  else if (visible.indexOf('■') >= 0) { niveau = 3; nom = 'certain'; }
  else if (visible.indexOf('◐') >= 0) { niveau = 2; nom = 'probable'; }
  else if (visible.indexOf('≈') >= 0) { niveau = 1; nom = 'contesté'; }
  const note = fresh(el, 'e055-conf-detail', 'span', 'recit-e055-sr',
    `Niveau de certitude : ${nom}, ${niveau} sur 4. Libellé visible : ${visible}.`);
  chip.parentNode.insertBefore(note, chip.nextSibling);
  addToken(chip, 'aria-describedby', note.id);
  return { niveau, nom, visible };
}

/* ------------------------------------------------------------------------- *
 * E055-05 — dire pourquoi une commande est indisponible.
 * ------------------------------------------------------------------------- */
function chantier05(el, layout) {
  const targets = [];
  const actions = layout.querySelectorAll('.recit-actions button[disabled]');
  const fil = layout.querySelectorAll('.recit-thread-item[disabled]');
  if (actions && actions.length) Array.prototype.push.apply(targets, Array.from(actions));
  if (fil && fil.length) Array.prototype.push.apply(targets, Array.from(fil));
  let compte = 0;
  targets.forEach((button, i) => {
    if (!button || !button.parentNode) return;
    const libelle = (button.textContent || button.getAttribute('aria-label') || '').trim();
    let raison = 'indisponible à cette étape';
    if (/précédent/i.test(libelle)) raison = 'aucun point précédent : vous êtes au début du repère';
    else if (/suivant/i.test(libelle)) raison = 'aucun point suivant : vous êtes à la fin du repère';
    else if (/recommencer/i.test(libelle)) raison = 'le récit est déjà au premier point';
    else if (/repère suivant/i.test(libelle)) raison = 'il n’y a pas de repère suivant';
    const note = fresh(el, `e055-indisponible-${i}`, 'span', 'recit-e055-sr',
      `Commande indisponible : ${raison}.`);
    button.parentNode.insertBefore(note, button.nextSibling);
    addToken(button, 'aria-describedby', note.id);
    setOnce(button, 'aria-disabled', 'true');
    compte += 1;
  });
  return { compte };
}

/* ------------------------------------------------------------------------- *
 * E055-06 — traçabilité : contenu nommé et indice d'ouverture du résumé.
 * ------------------------------------------------------------------------- */
function chantier06(el, layout) {
  const details = layout.querySelector('details.recit-trace');
  const sources = layout.querySelector('.recit-sources');
  if (!details && !sources) return null;
  if (details) {
    setOnce(details, 'aria-label', 'Traçabilité des sources du point');
    const contenu = Array.from(details.children || []).find((n) => n.tagName !== 'SUMMARY') || null;
    const cid = contenu ? idOf(contenu, 'e055-trace-contenu') : null;
    if (cid) setOnce(contenu, 'role', 'note');
    const summary = details.querySelector('summary');
    if (summary) {
      const note = fresh(el, 'e055-trace-indice', 'span', 'recit-e055-sr',
        'Détail replié : appuyez sur Entrée ou Espace pour afficher ou masquer les identifiants de sources locaux.');
      summary.appendChild(note);
      addToken(summary, 'aria-describedby', note.id);
      if (cid) addToken(summary, 'aria-controls', cid);
    }
    return { type: 'trace', contenu: Boolean(cid) };
  }
  setOnce(sources, 'role', 'note');
  setOnce(sources, 'aria-label', 'Aucune source locale attachée à ce point');
  return { type: 'absence' };
}

/* ------------------------------------------------------------------------- *
 * E055-07 — un titre de légende pour la navigation par titres.
 * ------------------------------------------------------------------------- */
function chantier07(el, layout) {
  const legend = layout.querySelector('.recit-legend');
  if (!legend) return null;
  setOnce(legend, 'role', 'group');
  const heading = fresh(el, 'e055-legende-titre', 'h2', 'recit-e055-sr',
    'Aide, légende et raccourcis clavier');
  legend.insertBefore(heading, legend.firstChild);
  addToken(legend, 'aria-labelledby', heading.id);
  return { id: heading.id };
}

/* ------------------------------------------------------------------------- *
 * E055-08 — les commandes de point annoncent ce qu'elles modifient.
 * ------------------------------------------------------------------------- */
function chantier08(layout) {
  const title = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
  const tid = title ? idOf(title, 'e055-point-titre') : null;
  if (!tid) return { compte: 0 };
  let compte = 0;
  ['c3a-prev', 'c3a-next', 'c3a-restart'].forEach((key) => {
    const button = layout.querySelector(`[data-fk="${key}"]`);
    if (!button) return;
    if (addToken(button, 'aria-controls', tid)) compte += 1;
  });
  return { compte, cible: tid };
}

/* ------------------------------------------------------------------------- *
 * E055-09 — le raccourci de lecture automatique est énoncé au bon endroit.
 * ------------------------------------------------------------------------- */
function chantier09(el, layout) {
  const play = layout.querySelector('.recit-play');
  if (!play || !play.parentNode) return null;
  const enCours = play.getAttribute('aria-pressed') === 'true';
  const note = fresh(el, 'e055-lecture-raccourci', 'span', 'recit-e055-sr',
    enCours
      ? ' lecture automatique active : appuyez sur Espace pour la mettre en pause.'
      : ' lecture automatique inactive : appuyez sur Espace pour la lancer.');
  play.parentNode.insertBefore(note, play.nextSibling);
  addToken(play, 'aria-describedby', note.id);
  return { enCours };
}

/* ------------------------------------------------------------------------- *
 * E055-10 — panneau de mesures, masqué puis remonté dans le tiroir diagnostic.
 * ------------------------------------------------------------------------- */
function chantier10(el, stage, rapport, mouvementReduit) {
  const old = document.getElementById(PANEL_ID);
  if (old && old.parentNode) {
    try { old.parentNode.removeChild(old); } catch { /* déjà détaché */ }
  }
  const panel = el('section', 'recit-e055-panel');
  panel.id = PANEL_ID;
  panel.setAttribute('data-recit-diagnostic', '');
  panel.setAttribute('aria-label', 'Mesures d’accessibilité ARIA de la vue récit');
  const heading = el('h2', '', 'E055 — Accessibilité ARIA et lecteurs d’écran · mesures');
  heading.id = 'e055-panel-titre';
  panel.appendChild(heading);
  const r = rapport || {};
  const lignes = [
    ['fil', `Fil : ${(r.ordre && r.ordre.total) || 0} point(s) avec rang ordinal (aria-posinset/aria-setsize).`],
    ['nom', `Fil nommé : ${r.nom && r.nom.id ? r.nom.id : 'absent'} · titre visible : « ${(r.nom && r.nom.texte) || '—'} ».`],
    ['progression', `Progression : ${r.progression && r.progression.nomme ? 'barre nommée et orientée' : 'barre sans nom'}.`],
    ['certitude', `Certitude : ${(r.certitude && r.certitude.nom) || '—'} · niveau ${(r.certitude && r.certitude.niveau) || 0} sur 4 (libellé : « ${(r.certitude && r.certitude.visible) || '—'} »).`],
    ['commandes', `Commandes indisponibles expliquées : ${(r.indisponibles && r.indisponibles.compte) || 0} · cibles aria-controls : ${(r.cibles && r.cibles.compte) || 0}.`],
    ['trace', `Traçabilité : ${(r.trace && r.trace.type) || 'aucune'} · contenu nommé : ${r.trace && r.trace.contenu ? 'oui' : 'non'}.`],
    ['aide', `Légende : titre d'aide ${r.aide && r.aide.id ? 'présent' : 'absent'} (${(r.aide && r.aide.id) || '—'}).`],
    ['lecture', `Lecture automatique : ${r.lecture && r.lecture.enCours ? 'active' : 'inactive'} · raccourci Espace décrit.`],
    ['mouvement', `Préférence système : mouvement ${mouvementReduit ? 'réduit' : 'complet'} (aucune animation JS dans E055).`],
    ['jeu', 'Jeu de données : 901 points · 587 sans identifiant de source (aucune valeur inventée).'],
  ];
  lignes.forEach(([cle, texte]) => {
    const line = el('p', '', texte);
    line.id = `e055-mesure-${cle}`;
    panel.appendChild(line);
  });
  stage.appendChild(panel);
  return { present: true, lignes: lignes.length };
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille.
 * ------------------------------------------------------------------------- */
register('E055', (ctx) => {
  if (!ctx || !ctx.stage || !ctx.layout || typeof document === 'undefined') return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  css(CSS_ID, RULES);
  layout.setAttribute('data-e055', 'on');

  const mouvementReduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
  const rapport = {};

  rapport.ordre = safe(() => chantier01(layout));
  rapport.nom = safe(() => chantier02(layout));
  rapport.progression = safe(() => chantier03(layout));
  rapport.certitude = safe(() => chantier04(el, layout));
  rapport.indisponibles = safe(() => chantier05(el, layout));
  rapport.trace = safe(() => chantier06(el, layout));
  rapport.aide = safe(() => chantier07(el, layout));
  rapport.cibles = safe(() => chantier08(layout));
  rapport.lecture = safe(() => chantier09(el, layout));
  rapport.panneau = safe(() => chantier10(el, stage, rapport, mouvementReduit));
});
