import { register } from './registry.js';

/* V2 lentille E041 — Lisibilité et mesure de lecture (second regard).
 *
 * La passe 1 (src/views/recit/E041.js) a travaillé la mesure de ligne,
 * l'interlignage, l'équilibre du titre, les chiffres tabulaires, le compteur
 * de mots, l'avancement en pourcentage, le temps du repère, le mode confort,
 * la coupure des identifiants et la transparence de l'estimation. Cette passe
 * ne reprend aucun de ces chantiers : elle porte sur l'ORIENTATION et
 * l'EFFORT DE LECTURE encore absents — longueur en caractères, points
 * restants, contraste, mode « texte seul », aperçu du point suivant, charge
 * du repère, densité des items du fil, retour au titre, légende en colonnes
 * et mesure à l'impression.
 *
 * Greffon strictement additif : aucune suppression de texte, aucune
 * ré-attribution d'événement, aucun fichier partagé modifié. Une seule classe
 * racine `recit-v2-e041-root` posée sur `layout`, un seul bloc CSS injecté via
 * l'identifiant de feuille « recit-v2-e041 » (`cssOnce` garantit l'idempotence). Toutes les
 * classes créées sont préfixées `recit-v2-e041-` ; tous les identifiants
 * d'élément sont préfixés `v2-e041-` (la passe 1 occupe déjà `e041-` sur le
 * MÊME DOM). Les attributs portés par la coque ne sont jamais écrasés
 * (`attrSiAbsent`). Aucun appel réseau, aucune journalisation, aucun
 * aucune source d'aléa, aucune animation JavaScript.
 *
 * Chaque chiffre affiché est recalculé depuis le DOM réel : texte du titre,
 * libellé « Étape i / n », `aria-label` complet des items du fil (dont le
 * texte visible est tronqué). Les dix chantiers E041-01 … E041-10 sont
 * détaillés dans UNIFIED_AUDIT/RECIT/V2/views/E041.md.
 */

const RACINE = 'recit-v2-e041-root';

/* Bloc CSS unique. Les règles sont toutes sous la classe racine afin de ne
   jamais modifier un autre composant ni la passe 1. */
const CSS = `
/* E041-01 — longueur du point en caractères : pastille numérique à côté du timing. */
.recit-v2-e041-root .recit-v2-e041-chip{
  display:inline-flex;align-items:center;gap:4px;
  padding:1px 7px;margin-left:6px;
  border:1px solid var(--line,rgba(255,255,255,.18));border-radius:999px;
  color:var(--muted,#9aa6b8);font-size:9px;white-space:nowrap;vertical-align:middle;
}
/* E041-02 — points restants : ligne textuelle et audible après la barre. */
.recit-v2-e041-root .recit-v2-e041-chiffres{font-variant-numeric:tabular-nums}
.recit-v2-e041-root .recit-v2-e041-restant{
  margin:2px 0 6px;color:var(--muted,#9aa6b8);font-size:9px;line-height:1.4;
}
/* E041-03 — contraste accru des paragraphes narratifs. */
.recit-v2-e041-root .recit-v2-e041-contraste{color:var(--ink,#eef1f6)}
/* E041-04 — mode « texte seul » : le média décoratif s'efface, la grille se recentre. */
html[data-v2-e041-texte-seul="on"] .recit-v2-e041-root{grid-template-columns:1fr}
html[data-v2-e041-texte-seul="on"] .recit-v2-e041-root .recit-media{display:none}
/* E041-05 — aperçu du point suivant : ligne discrète dans la méta. */
.recit-v2-e041-root .recit-v2-e041-suivant{
  margin:4px 0 0;color:var(--muted-2,#8c8d91);font-size:9px;line-height:1.5;
}
/* E041-06 — charge du repère : pastille qualitative dérivée du nombre de points. */
.recit-v2-e041-root .recit-v2-e041-charge{
  border-color:rgba(230,185,111,.45);color:var(--gold-bright,#f4d69e);
}
/* E041-07 — densité des items du fil : marque textuelle et type en renfort. */
.recit-v2-e041-root .recit-v2-e041-densite{color:var(--muted-2,#8c8d91);font-size:8px}
.recit-v2-e041-root .recit-v2-e041-type{color:var(--gold,#e6b96f)}
/* E041-08 — retour au titre : cible tactile et focus visible. */
.recit-v2-e041-root .recit-v2-e041-bouton{
  min-height:36px;padding:4px 10px;border:1px solid var(--line,rgba(255,255,255,.18));
  border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font-size:9px;white-space:nowrap;cursor:pointer;
}
.recit-v2-e041-root .recit-v2-e041-bouton[aria-pressed="true"]{
  border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);
}
.recit-v2-e041-root .recit-v2-e041-bouton:focus-visible{
  outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px;
}
.recit-v2-e041-root .recit-v2-e041-retour{margin-top:8px}
/* E041-09 — légende en deux colonnes pour un balayage plus rapide. */
.recit-v2-e041-root .recit-legend{
  display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2px 18px;
}
/* E041-10 — impression : ne garder que la mesure de lecture éditoriale. */
@media print{
  .recit-v2-e041-root[data-v2-e041-print] .recit-media,
  .recit-v2-e041-root[data-v2-e041-print] .c3a-tools,
  .recit-v2-e041-root[data-v2-e041-print] .recit-thread,
  .recit-v2-e041-root[data-v2-e041-print] .recit-actions,
  .recit-v2-e041-root[data-v2-e041-print] .recit-v2-e041-bouton,
  .recit-v2-e041-root[data-v2-e041-print] .recit-v2-e041-suivant{display:none!important}
  .recit-v2-e041-root[data-v2-e041-print] .recit-title{font-size:20pt;line-height:1.2}
  .recit-v2-e041-root[data-v2-e041-print] .recit-context,
  .recit-v2-e041-root[data-v2-e041-print] .recit-legend{color:#111;max-width:none}
  .recit-v2-e041-root[data-v2-e041-print] .recit-meta,
  .recit-v2-e041-root[data-v2-e041-print] .recit-timing{color:#222}
}
@media (max-width:620px){
  .recit-v2-e041-root .recit-v2-e041-chip{margin-left:0;margin-top:4px}
  .recit-v2-e041-root .recit-v2-e041-bouton{min-height:40px}
  .recit-v2-e041-root .recit-legend{grid-template-columns:1fr}
}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e041-root .recit-v2-e041-bouton{transition:none}
}
`;

/* Vrai nœud d'élément (nodeType 1) — écarte textes et commentaires. */
function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Ajoute une classe sans jamais lever d'erreur si le nœud est absent. */
function marquer(node, className) {
  if (present(node) && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(className);
  }
}

/* Pose un attribut seulement s'il n'existe pas déjà (coque et passe 1 intactes). */
function attrSiAbsent(node, name, value) {
  if (!present(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute(name)) return;
  try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
}

/* Pose un attribut data-* réservé à cette lentille (jamais un id d'élément). */
function data(node, name, value) {
  if (!present(node)) return;
  try { node.setAttribute(`data-v2-e041-${name}`, String(value)); } catch { /* facultatif */ }
}

/* Un id v2-e041- ne doit exister qu'une fois dans le document, même si
   runEnhancements repasse sur un DOM non reconstruit. */
function deja(id) {
  try { return !!document.getElementById(id); } catch { return false; }
}

/* Texte lisible d'un nœud, sans jamais inventer de valeur. */
function texte(node) {
  return String((present(node) && node.textContent) || '');
}

/* Découpage identique à celui de la vue (recit.js:57). */
function mots(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

/* Troncature d'un aperçu, sans toucher au nœud d'origine. */
function clip(value, max) {
  const v = String(value || '').trim();
  return v.length > max ? v.slice(0, max - 1).trimEnd() : v;
}

/* Lit « Étape i / n » dans le surtitre réel. */
function lireEtape(kicker) {
  const found = texte(kicker).match(/Étape\s+(\d+)\s*\/\s*(\d+)/);
  return found ? { now: Number(found[1]), max: Number(found[2]) } : null;
}

/* Le texte complet d'un item est dans son aria-label (« Point i sur n,
   kind : texte ») ; le texte visible, lui, est tronqué par clip(). */
function texteItem(item) {
  const aria = String((present(item) && item.getAttribute('aria-label')) || '');
  const coupe = aria.indexOf(' : ');
  return coupe >= 0 ? aria.slice(coupe + 3).trim() : texte(item).trim();
}

/* Rang global d'un item, relu depuis son aria-label. */
function rangItem(item) {
  const aria = String((present(item) && item.getAttribute('aria-label')) || '');
  const found = aria.match(/Point\s+(\d+)\s+sur\s+(\d+)/);
  return found ? Number(found[1]) : 0;
}

/* --- E041-01 : longueur du point en caractères ---------------------------- */
function chantier01(body, creer) {
  if (deja('v2-e041-caracteres')) return;
  const timing = body.querySelector('.recit-timing');
  const titre = body.querySelector('#recit-point-title') || document.getElementById('recit-point-title');
  if (!present(timing) || !present(titre)) return;
  const n = texte(titre).length;
  const pastille = creer('span', 'recit-v2-e041-chip recit-v2-e041-chiffres',
    `${n} caractère${n > 1 ? 's' : ''}`);
  pastille.id = 'v2-e041-caracteres';
  timing.appendChild(pastille);
}

/* --- E041-02 : points restants dans le repère ----------------------------- */
function chantier02(body, creer) {
  if (deja('v2-e041-restant')) return;
  const barre = body.querySelector('.recit-progress');
  const etape = lireEtape(body.querySelector('.view-kicker'));
  if (!present(barre) || !etape) return;
  const restants = Math.max(0, etape.max - etape.now);
  const ligne = creer('p', 'recit-v2-e041-restant recit-v2-e041-chiffres',
    restants > 0
      ? `Restants : ${restants} point${restants > 1 ? 's' : ''} sur ${etape.max} dans ce repère.`
      : 'Dernier point de ce repère.');
  ligne.id = 'v2-e041-restant';
  ligne.setAttribute('role', 'status');
  ligne.setAttribute('aria-live', 'polite');
  const parent = barre.parentNode;
  if (present(parent)) parent.insertBefore(ligne, barre.nextSibling);
  else body.appendChild(ligne);
}

/* --- E041-03 : contraste du texte narratif -------------------------------- */
function chantier03(body) {
  ['.recit-context', '.recit-meta', '.recit-legend'].forEach((selecteur) => {
    const noeud = body.querySelector(selecteur);
    if (present(noeud)) marquer(noeud, 'recit-v2-e041-contraste');
  });
  Array.prototype.forEach.call(body.querySelectorAll('.recit-legend p'), (p) => {
    marquer(p, 'recit-v2-e041-contraste');
  });
}

/* Préférence de concentration : survit aux reconstructions complètes du DOM. */
let texteSeul = false;
function appliquerTexteSeul() {
  if (typeof document === 'undefined') return;
  try { document.documentElement.setAttribute('data-v2-e041-texte-seul', texteSeul ? 'on' : 'off'); }
  catch { /* attribut documentaire facultatif */ }
}

/* --- E041-04 : bascule « texte seul » ------------------------------------- */
function chantier04(body, creer) {
  appliquerTexteSeul();
  const actions = body.querySelector('.recit-actions');
  if (!present(actions) || deja('v2-e041-texte-seul')) return;
  const bouton = creer('button', 'recit-v2-e041-bouton',
    texteSeul ? 'Texte seul : activé' : 'Texte seul : désactivé');
  bouton.id = 'v2-e041-texte-seul';
  bouton.type = 'button';
  bouton.setAttribute('aria-pressed', String(texteSeul));
  bouton.title = 'Masquer le média décoratif pour se concentrer sur le texte';
  bouton.addEventListener('click', () => {
    texteSeul = !texteSeul;
    appliquerTexteSeul();
    bouton.setAttribute('aria-pressed', String(texteSeul));
    bouton.textContent = texteSeul ? 'Texte seul : activé' : 'Texte seul : désactivé';
  });
  actions.insertBefore(bouton, actions.firstChild);
}

/* --- E041-05 : aperçu du point suivant ------------------------------------ */
function chantier05(body, creer) {
  if (deja('v2-e041-suivant')) return;
  const meta = body.querySelector('.recit-meta');
  const etape = lireEtape(body.querySelector('.view-kicker'));
  if (!present(meta) || !etape) return;
  const cible = etape.now + 1;
  let suivant = '';
  Array.prototype.forEach.call(body.querySelectorAll('.c3a-thread-item'), (item) => {
    if (!suivant && rangItem(item) === cible) suivant = texteItem(item);
  });
  if (!suivant) return;
  const apercu = clip(suivant, 90);
  const ligne = creer('p', 'recit-v2-e041-suivant',
    `À suivre : ${apercu}${apercu.length < suivant.length ? '…' : ''}`);
  ligne.id = 'v2-e041-suivant';
  meta.appendChild(ligne);
}

/* --- E041-06 : charge de lecture du repère -------------------------------- */
function chantier06(body, creer) {
  if (deja('v2-e041-charge')) return;
  const meta = body.querySelector('.recit-meta');
  const etape = lireEtape(body.querySelector('.view-kicker'));
  if (!present(meta) || !etape || etape.max <= 0) return;
  const niveau = etape.max <= 10 ? 'légère' : (etape.max <= 30 ? 'modérée' : 'importante');
  const pastille = creer('span', 'recit-v2-e041-chip recit-v2-e041-chiffres recit-v2-e041-charge',
    `Charge du repère : ${niveau} (${etape.max} points)`);
  pastille.id = 'v2-e041-charge';
  meta.appendChild(pastille);
}

/* --- E041-07 : densité de lecture des items du fil ------------------------ */
function chantier07(body, creer) {
  Array.prototype.forEach.call(body.querySelectorAll('.c3a-thread-item'), (item) => {
    marquer(item, 'recit-v2-e041-item');
    const n = mots(texteItem(item));
    const niveau = n <= 6 ? 'court' : (n <= 18 ? 'moyen' : 'long');
    data(item, 'densite', niveau);
    attrSiAbsent(item, 'title', `Point de lecture ${niveau} (${n} mots)`);
    if (!item.querySelector('.recit-v2-e041-densite')) {
      item.appendChild(creer('span', 'recit-v2-e041-densite', ` · ${niveau}`));
    }
    const type = item.querySelector('.thread-kind');
    if (present(type)) marquer(type, 'recit-v2-e041-type');
  });
}

/* --- E041-08 : retour au titre du point ----------------------------------- */
function chantier08(body, creer,reduced) {
  if (deja('v2-e041-retour-titre')) return;
  const legend = body.querySelector('.recit-legend');
  const titre = body.querySelector('#recit-point-title') || document.getElementById('recit-point-title');
  if (!present(legend) || !present(titre)) return;
  const bouton = creer('button', 'recit-v2-e041-bouton recit-v2-e041-retour',
    '↑ Revenir au titre du point');
  bouton.id = 'v2-e041-retour-titre';
  bouton.type = 'button';
  bouton.addEventListener('click', () => {
    try { titre.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); }
    catch { /* défilement facultatif */ }
    try { titre.focus({ preventScroll: true }); } catch { /* focus facultatif */ }
  });
  legend.appendChild(bouton);
}

/* --- E041-09 : légende en colonnes ---------------------------------------- */
function chantier09(body) {
  data(body, 'legende', '1');
}

/* --- E041-10 : mesure de lecture à l'impression --------------------------- */
function chantier10(body) {
  data(body, 'print', '1');
}

/* Un chantier défaillant est isolé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

register('E041', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    const { layout, css, el, reducedMotion } = ctx;
    const body = layout.querySelector('.recit-body');
    if (!present(body)) return;

    /* Repli local si l'hôte ne fournit pas l'assistant DOM. */
    const creer = typeof el === 'function' ? el : (tag, className, contenu) => {
      const noeud = document.createElement(tag);
      if (className) noeud.className = className;
      if (contenu !== undefined) noeud.textContent = contenu;
      return noeud;
    };

    if (typeof css === 'function') {
      try { css('recit-v2-e041', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }
    marquer(layout, RACINE);

    let reduced = false;
    try { reduced = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduced = false; }

    safe(() => chantier01(body, creer));
    safe(() => chantier02(body, creer));
    safe(() => chantier03(body));
    safe(() => chantier04(body, creer));
    safe(() => chantier05(body, creer));
    safe(() => chantier06(body, creer));
    safe(() => chantier07(body, creer));
    safe(() => chantier08(body, creer, reduced));
    safe(() => chantier09(body));
    safe(() => chantier10(body));
  } catch { /* rendu préservé coûte que coûte */ }
});
