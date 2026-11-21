import { register } from './registry.js';

/* V2 lentille E055 — « Accessibilité ARIA et lecteurs d'écran » (complément).
   Dix chantiers V2 neufs et distincts de ceux de la passe 1 : régions landmark,
   visuel comme figure légendée, description audible du titre, lien d'évitement,
   aide au champ de recherche, explication des groupes de filtres, aide au fil au
   clavier, statut atomique, destination de « Chronologie » et valeur lisible de
   la barre de progression. Tout est additif et dérivé du DOM réel : sans ce
   module, la vue reste intégralement lisible et navigable.
   Préfixes : classes recit-v2-e055- ; ids DOM v2-e055- (jamais e055- de la passe 1,
   qui tourne sur le même document). Zéro réseau, zéro console, zéro aléa. */

const CSS = `
/* E055-01 — Région landmark nommée pour le corps du récit. */
.recit-layout[data-v2-e055="on"] .recit-body{scroll-margin-top:12px}

/* E055-02 — Visuel comme figure légendée. */
.recit-layout[data-v2-e055="on"] .recit-media{scroll-margin-top:12px}

/* E055-03 — Description audible du titre du point. */
.recit-v2-e055-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}

/* E055-04 — Lien d'évitement vers le contenu du point. */
.recit-v2-e055-skip{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.recit-v2-e055-skip:focus{position:static!important;width:auto!important;height:auto!important;margin:0 0 8px!important;clip:auto!important;overflow:visible!important;white-space:normal!important;display:inline-flex;align-items:center;min-height:36px;padding:6px 10px;border:1px solid var(--gold);border-radius:8px;background:rgba(12,16,24,.96);color:var(--gold-bright);font-size:10px;text-decoration:none}
.recit-v2-e055-skip:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E055-05 — Aide au champ de recherche : texte porté par aria-describedby. */
.recit-layout[data-v2-e055="on"] .c3a-search{scroll-margin-top:12px}

/* E055-06 — Explication des groupes de filtres à choix unique. */
.recit-layout[data-v2-e055="on"] .c3a-group{scroll-margin-top:12px}

/* E055-07 — Aide au parcours du fil au clavier. */
.recit-layout[data-v2-e055="on"] .recit-thread-list{scroll-margin-top:12px}

/* E055-08 — Statut de filtrage atomique et nommé. */
.recit-layout[data-v2-e055="on"] .c3a-status{font-variant-numeric:tabular-nums}

/* E055-09 — Destination audible de la commande « Chronologie ». */
.recit-layout[data-v2-e055="on"] .recit-actions{scroll-margin-top:12px}

/* E055-10 — Valeur lisible de la barre de progression (aria-valuetext). */
.recit-layout[data-v2-e055="on"] .recit-progress{scroll-margin-top:12px}

/* Confort : aucun mouvement animé dans les enrichissements V2. */
@media (prefers-reduced-motion:reduce){.recit-v2-e055-skip{transition:none}}
`;

/* Ne jamais écraser un attribut déjà posé (passe 1 ou greffon antérieur). */
function setOnce(noeud, nom, valeur) {
  if (!noeud || typeof noeud.setAttribute !== 'function') return false;
  if (valeur === undefined || valeur === null) return false;
  if (typeof noeud.hasAttribute === 'function' && noeud.hasAttribute(nom)) return false;
  noeud.setAttribute(nom, String(valeur));
  return true;
}

/* Ajouter un identifiant à une liste sans effacer les autres. */
function addToken(noeud, nom, jeton) {
  if (!noeud || !jeton || typeof noeud.getAttribute !== 'function' || typeof noeud.setAttribute !== 'function') return false;
  const courant = noeud.getAttribute(nom) || '';
  const jetons = courant.split(/\s+/).filter(Boolean);
  if (jetons.indexOf(jeton) >= 0) return false;
  jetons.push(jeton);
  noeud.setAttribute(nom, jetons.join(' '));
  return true;
}

/* Réutiliser un id existant ou en poser un nouveau, préfixé v2-e055-. */
function idOf(noeud, voulu) {
  if (!noeud || typeof noeud.getAttribute !== 'function') return null;
  const existant = noeud.getAttribute('id');
  if (existant) return existant;
  if (typeof noeud.setAttribute !== 'function') return null;
  noeud.setAttribute('id', voulu);
  return voulu;
}

/* Recréer un nœud propre : retire toute incarnation antérieure du même id. */
function fresh(el, id, balise, classe, texte) {
  try {
    const ancien = document.getElementById(id);
    if (ancien && ancien.parentNode) ancien.parentNode.removeChild(ancien);
  } catch { /* document indisponible ou nœud déjà détaché */ }
  const noeud = el(balise, classe, texte);
  noeud.id = id;
  return noeud;
}

/* Chaque chantier est isolé : une cible absente ne casse jamais le rendu. */
function safe(fn) {
  try { return fn(); } catch { return null; }
}

/* ------------------------------------------------------------------------- *
 * E055-01 — Région landmark nommée pour le corps du récit.
 * ------------------------------------------------------------------------- */
function chantier01(layout) {
  const corps = layout.querySelector('.recit-body');
  if (!corps) return null;
  setOnce(corps, 'role', 'region');
  setOnce(corps, 'aria-label', 'Contenu du récit guidé');
  return { role: 'region', nom: 'Contenu du récit guidé' };
}

/* ------------------------------------------------------------------------- *
 * E055-02 — Visuel comme figure légendée.
 * ------------------------------------------------------------------------- */
function chantier02(el, layout) {
  const media = layout.querySelector('.recit-media');
  if (!media) return null;
  setOnce(media, 'role', 'figure');
  const legende = media.querySelector('.media-caption');
  if (legende) {
    const cid = idOf(legende, 'v2-e055-caption');
    if (cid) addToken(media, 'aria-labelledby', cid);
    return { type: 'legende', id: cid, texte: (legende.textContent || '').trim() };
  }
  setOnce(media, 'aria-label', 'Visuel du repère, sans légende affichée');
  return { type: 'sans-legende' };
}

/* ------------------------------------------------------------------------- *
 * E055-03 — Description audible du titre du point (position réelle).
 * ------------------------------------------------------------------------- */
function chantier03(el, layout) {
  const titre = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
  if (!titre || !titre.parentNode) return null;
  const kicker = layout.querySelector('.view-kicker');
  const brut = kicker ? (kicker.textContent || '').trim() : '';
  const texte = brut
    ? `Étape courante : ${brut}.`
    : 'Position du point dans le repère non précisée par l’interface.';
  const note = fresh(el, 'v2-e055-titre-desc', 'span', 'recit-v2-e055-sr', texte);
  titre.parentNode.insertBefore(note, titre.nextSibling);
  addToken(titre, 'aria-describedby', note.id);
  return { texte: brut };
}

/* ------------------------------------------------------------------------- *
 * E055-04 — Lien d'évitement vers le contenu du point.
 * ------------------------------------------------------------------------- */
function chantier04(el, layout) {
  const titre = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
  const corps = layout.querySelector('.recit-body');
  if (!titre || !corps) return null;
  const cible = idOf(titre, 'v2-e055-titre-cible');
  if (!cible) return null;
  const lien = fresh(el, 'v2-e055-skip', 'a', 'recit-v2-e055-skip', 'Aller au contenu du point');
  lien.setAttribute('href', `#${cible}`);
  const premier = corps.firstChild;
  if (premier) corps.insertBefore(lien, premier);
  else corps.appendChild(lien);
  return { cible };
}

/* ------------------------------------------------------------------------- *
 * E055-05 — Aide au champ de recherche.
 * ------------------------------------------------------------------------- */
function chantier05(el, layout) {
  const recherche = layout.querySelector('#c3a-search') || layout.querySelector('.c3a-search');
  if (!recherche || !recherche.parentNode) return null;
  const note = fresh(el, 'v2-e055-search-help', 'span', 'recit-v2-e055-sr',
    'Recherche insensible à la casse sur le texte, le type, la certitude et l’année du repère. Les résultats filtrent le fil ci-dessous.');
  recherche.parentNode.insertBefore(note, recherche.nextSibling);
  addToken(recherche, 'aria-describedby', note.id);
  return { id: note.id };
}

/* ------------------------------------------------------------------------- *
 * E055-06 — Explication des groupes de filtres à choix unique.
 * ------------------------------------------------------------------------- */
function chantier06(el, layout) {
  const groupes = Array.from(layout.querySelectorAll('.c3a-group'));
  let compte = 0;
  groupes.forEach((groupe, i) => {
    if (!groupe) return;
    const note = fresh(el, `v2-e055-groupe-${i}`, 'span', 'recit-v2-e055-sr',
      'Filtre à choix unique : sélectionner une option remplace la précédente. « Tous » rétablit l’affichage complet.');
    groupe.appendChild(note);
    addToken(groupe, 'aria-describedby', note.id);
    compte += 1;
  });
  return { compte };
}

/* ------------------------------------------------------------------------- *
 * E055-07 — Aide au parcours du fil au clavier.
 * ------------------------------------------------------------------------- */
function chantier07(el, layout) {
  const fil = layout.querySelector('#c3a-thread') || layout.querySelector('.recit-thread-list');
  if (!fil || !fil.parentNode) return null;
  const note = fresh(el, 'v2-e055-thread-keys', 'span', 'recit-v2-e055-sr',
    'Dans le fil : les touches Haut et Bas parcourent les points affichés, Début et Fin vont aux extrémités, Entrée sélectionne le point.');
  fil.parentNode.insertBefore(note, fil.nextSibling);
  addToken(fil, 'aria-describedby', note.id);
  setOnce(fil, 'aria-keyshortcuts', 'ArrowUp ArrowDown Home End');
  return { id: note.id };
}

/* ------------------------------------------------------------------------- *
 * E055-08 — Statut de filtrage atomique et nommé.
 * ------------------------------------------------------------------------- */
function chantier08(layout) {
  const statut = layout.querySelector('#c3a-status') || layout.querySelector('.c3a-status');
  if (!statut) return null;
  setOnce(statut, 'role', 'status');
  setOnce(statut, 'aria-live', 'polite');
  setOnce(statut, 'aria-atomic', 'true');
  setOnce(statut, 'aria-relevant', 'additions text');
  setOnce(statut, 'aria-label', 'Résultats du filtrage du fil');
  return { atomic: statut.getAttribute('aria-atomic') === 'true' };
}

/* ------------------------------------------------------------------------- *
 * E055-09 — Destination audible de la commande « Chronologie ».
 * ------------------------------------------------------------------------- */
function chantier09(el, layout) {
  const chrono = layout.querySelector('[data-fk="c3a-chrono"]');
  if (!chrono || !chrono.parentNode) return null;
  const note = fresh(el, 'v2-e055-chrono-desc', 'span', 'recit-v2-e055-sr',
    'Quitte le récit guidé et ouvre la vue Chronologie.');
  chrono.parentNode.insertBefore(note, chrono.nextSibling);
  addToken(chrono, 'aria-describedby', note.id);
  return { id: note.id };
}

/* ------------------------------------------------------------------------- *
 * E055-10 — Valeur lisible de la barre de progression (aria-valuetext).
 * ------------------------------------------------------------------------- */
function chantier10(layout) {
  const barre = layout.querySelector('.recit-progress');
  if (!barre) return null;
  const kicker = layout.querySelector('.view-kicker');
  const trouve = kicker ? (kicker.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/i) : null;
  if (!trouve) return null;
  const valeur = `Étape ${trouve[1]} sur ${trouve[2]}`;
  setOnce(barre, 'aria-valuetext', valeur);
  return { valeur };
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique de la lentille V2.
 * ------------------------------------------------------------------------- */
register('E055', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { layout, css, el } = ctx;
    if (!layout || typeof layout.querySelector !== 'function' || typeof css !== 'function' || typeof el !== 'function') return;
    css('recit-v2-e055', CSS); /* un seul appel, toutes les règles du module. */
    layout.setAttribute('data-v2-e055', 'on');

    const rapport = {};
    rapport.regions = safe(() => chantier01(layout));
    rapport.figure = safe(() => chantier02(el, layout));
    rapport.titre = safe(() => chantier03(el, layout));
    rapport.skip = safe(() => chantier04(el, layout));
    rapport.recherche = safe(() => chantier05(el, layout));
    rapport.groupes = safe(() => chantier06(el, layout));
    rapport.fil = safe(() => chantier07(el, layout));
    rapport.statut = safe(() => chantier08(layout));
    rapport.chrono = safe(() => chantier09(el, layout));
    rapport.valeur = safe(() => chantier10(layout));
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
