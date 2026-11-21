import { register } from './registry.js';

/* V2 lentille E002 — Hiérarchie visuelle et informationnelle (second regard).
 *
 * Complète la passe 1 sans la remplacer : là où E002 travaillait l'échelle
 * typographique, l'eyebrow, la pastille de certitude, le chapeau, le profil,
 * la légende et les commandes, cette passe porte sur la HIÉRARCHIE
 * SÉMANTIQUE ET STRUCTURELLE encore absente : progression annoncée, région
 * nommée, rythme vertical, barre de filtres, comptage, média, traçabilité,
 * état de lecture, items du fil et impression.
 *
 * Greffon strictement additif : aucune suppression de texte, aucune
 * ré-attribution d'événement, aucun fichier partagé modifié. Une seule classe
 * racine `recit-v2-e002-root` posée sur `layout`, un seul bloc CSS injecté via
 * `css` avec l'identifiant unique `recit-v2-e002` (`cssOnce` garantit
 * l'idempotence). Toutes les
 * classes créées sont préfixées `recit-v2-e002-` ; aucun identifiant
 * d'élément n'est ajouté (seul l'id de la feuille de style est injecté, et il
 * est géré par `cssOnce`). Aucun appel réseau, aucune journalisation, aucun
 * `Math.random`, aucune animation JavaScript.
 *
 * Les dix chantiers E002-01 … E002-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E002.md.
 */

const RACINE = 'recit-v2-e002-root';

/* Bloc CSS unique. Les règles de rythme utilisent `:where()` pour rester de
   spécificité inférieure à celles de la passe 1 : aucun margement existant
   n'est écrasé. */
const CSS = `
/* E002-01 — barre de progression sémantisée : rôle, valeurs ARIA et texture. */
.recit-v2-e002-root .recit-v2-e002-progress{position:relative}
.recit-v2-e002-root .recit-v2-e002-progress[data-v2-e002-valeur]>span{
  background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.28) 0 1px,transparent 1px 8px);
  background-clip:padding-box;
}
/* E002-02 — région nommée pour la lecture : repère d'ancrage au défilement. */
.recit-v2-e002-root .recit-v2-e002-region{scroll-margin-block-start:8px}
/* E002-03 — rythme vertical gradué : :where() garde une spécificité basse. */
.recit-v2-e002-root[data-v2-e002-rhythm]{
  --v2-e002-gap-xs:6px;--v2-e002-gap-s:10px;--v2-e002-gap-m:16px;--v2-e002-gap-l:22px;
}
:where(.recit-v2-e002-root .recit-body)>.recit-progress{margin-bottom:var(--v2-e002-gap-m)}
:where(.recit-v2-e002-root .recit-body)>.view-kicker{margin-bottom:var(--v2-e002-gap-s)}
:where(.recit-v2-e002-root .recit-body)>.recit-meta{margin-bottom:var(--v2-e002-gap-xs)}
:where(.recit-v2-e002-root .recit-body)>.recit-timing{margin-bottom:var(--v2-e002-gap-m)}
:where(.recit-v2-e002-root .recit-body)>.recit-context{margin-bottom:var(--v2-e002-gap-m)}
:where(.recit-v2-e002-root .recit-body)>.recit-thread{margin-bottom:var(--v2-e002-gap-s)}
:where(.recit-v2-e002-root .recit-body)>.recit-actions{margin-top:var(--v2-e002-gap-m)}
:where(.recit-v2-e002-root .recit-body)>.recit-legend{margin-top:var(--v2-e002-gap-s)}
/* E002-04 — barre de filtres : saisie et filtre actif en tête, label tertiaire. */
.recit-v2-e002-root .recit-v2-e002-tools{padding:8px 0 4px;border-top:1px solid var(--line)}
.recit-v2-e002-root .recit-v2-e002-search{border-color:var(--line-strong);font-size:11px}
.recit-v2-e002-root .recit-v2-e002-search:focus-visible,
.recit-v2-e002-root .recit-v2-e002-group .c3a-filter:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-v2-e002-root .recit-v2-e002-group .c3a-group-label{
  font-size:8px;letter-spacing:.12em;text-transform:uppercase;
}
.recit-v2-e002-root .recit-v2-e002-group .c3a-filter[aria-pressed="true"]{font-weight:700}
/* E002-05 — comptage de filtres en pastille numérique dérivée du statut. */
.recit-v2-e002-root .recit-v2-e002-status{
  display:flex;align-items:center;gap:8px;font-variant-numeric:tabular-nums;
}
.recit-v2-e002-root .recit-v2-e002-status[data-v2-e002-count]::before{
  content:attr(data-v2-e002-count);flex:none;
  min-height:20px;padding:2px 8px;border:1px solid var(--line-strong);border-radius:999px;
  background:rgba(230,185,111,.08);color:var(--gold-bright);
  font-size:9px;font-weight:700;
}
/* E002-06 — média : légende lisible, crédit discrètement subordonné. */
.recit-v2-e002-root .recit-media[data-v2-e002-media]{position:relative}
.recit-v2-e002-root .recit-v2-e002-caption{
  padding:3px 8px;border-radius:6px;
  background:linear-gradient(0deg,rgba(0,0,0,.55),rgba(0,0,0,.25));color:#fff;
}
.recit-v2-e002-root .recit-v2-e002-credit{opacity:.75;letter-spacing:.02em}
/* E002-07 — traçabilité : flèche d'ouverture, jamais portée par la couleur seule. */
.recit-v2-e002-root .recit-v2-e002-trace>summary::after{
  content:'▸';margin-left:8px;color:var(--gold);font-size:10px;
}
.recit-v2-e002-root .recit-v2-e002-trace[open]>summary::after{content:'▾'}
.recit-v2-e002-root .recit-v2-e002-trace>summary:focus-visible{
  outline:2px solid var(--gold-bright);outline-offset:2px;
}
/* E002-08 — lecture automatique : libellé d'état dérivé de aria-pressed. */
.recit-v2-e002-root .recit-v2-e002-play[data-v2-e002-play]::after{
  content:' · ' attr(data-v2-e002-play);font-size:9px;font-weight:400;color:var(--muted);
}
.recit-v2-e002-root .recit-v2-e002-play[aria-pressed="true"]{
  border-color:var(--gold);color:var(--gold-bright);
}
/* E002-09 — fil : le type devient une pastille de rang alignée. */
.recit-v2-e002-root .recit-v2-e002-item{display:flex;align-items:baseline;gap:6px;text-align:left}
.recit-v2-e002-root .recit-v2-e002-kind{
  flex:none;min-width:52px;
  color:var(--gold);font-size:8px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;
}
/* E002-10 — impression : ne conserver que la hiérarchie éditoriale. */
@media print{
  .recit-v2-e002-root[data-v2-e002-print] .recit-media,
  .recit-v2-e002-root[data-v2-e002-print] .c3a-tools,
  .recit-v2-e002-root[data-v2-e002-print] .c3a-status,
  .recit-v2-e002-root[data-v2-e002-print] .recit-thread,
  .recit-v2-e002-root[data-v2-e002-print] .recit-actions,
  .recit-v2-e002-root[data-v2-e002-print] .recit-v2-e002-trace{display:none!important}
  .recit-v2-e002-root[data-v2-e002-print] .recit-progress{display:none}
  .recit-v2-e002-root[data-v2-e002-print] .recit-title{font-size:22pt;line-height:1.15}
  .recit-v2-e002-root[data-v2-e002-print] .recit-context{font-size:11pt}
  .recit-v2-e002-root[data-v2-e002-print] .recit-legend{font-size:8pt;color:#333}
  .recit-v2-e002-root[data-v2-e002-print] .recit-meta,
  .recit-v2-e002-root[data-v2-e002-print] .recit-timing{color:#444}
}
@media (max-width:620px){
  .recit-v2-e002-root .recit-v2-e002-group .c3a-group-label{width:100%}
  .recit-v2-e002-root .recit-v2-e002-item{flex-wrap:wrap}
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

/* Lit « Étape X / Y » dans le surtitre sans modifier son texte. */
function lireEtape(kicker) {
  const texte = String((kicker && kicker.textContent) || '');
  const found = texte.match(/(\d+)\s*\/\s*(\d+)/);
  if (!found) return null;
  return { etape: found[1], total: found[2] };
}

/* Lit « N point(s) affiché(s) sur M » dans le statut C3-03, sans le réécrire. */
function lireComptage(status) {
  const texte = String((status && status.textContent) || '');
  const found = texte.match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/i);
  if (!found) return null;
  return { affiches: found[1], total: found[2] };
}

/* Isole le nom du repère dans « Fil du repère · <nom> ». */
function titreRepere(threadTitle) {
  const texte = String((threadTitle && threadTitle.textContent) || '');
  const parts = texte.split('·');
  const nom = (parts.length > 1 ? parts[parts.length - 1] : '').trim();
  return nom || null;
}

/* Pose un attribut seulement s'il n'existe pas déjà (coque et passe 1 intactes). */
function attrSiAbsent(node, name, value) {
  if (!present(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute(name)) return;
  try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
}

/* Pose un attribut data-* réservé à la lentille (jamais un id d'élément). */
function data(node, name, value) {
  if (!present(node)) return;
  try { node.setAttribute(`data-v2-e002-${name}`, String(value)); } catch { /* facultatif */ }
}

register('E002', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    const { layout, css } = ctx;
    const root = layout;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') {
      try { css('recit-v2-e002', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }
    marquer(root, RACINE);

    /* --- E002-01 : progression sémantisée -------------------------------- */
    const progression = root.querySelector('.recit-progress');
    if (present(progression)) {
      marquer(progression, 'recit-v2-e002-progress');
      const etape = lireEtape(root.querySelector('.view-kicker'));
      if (etape) {
        attrSiAbsent(progression, 'role', 'progressbar');
        attrSiAbsent(progression, 'aria-valuemin', '0');
        attrSiAbsent(progression, 'aria-valuemax', etape.total);
        attrSiAbsent(progression, 'aria-valuenow', etape.etape);
        attrSiAbsent(progression, 'aria-label',
          `Progression du récit : étape ${etape.etape} sur ${etape.total}`);
        data(progression, 'valeur', etape.etape);
      }
    }

    /* --- E002-02 : région nommée pour la lecture -------------------------- */
    const corps = root.querySelector('.recit-body');
    if (present(corps)) {
      marquer(corps, 'recit-v2-e002-region');
      attrSiAbsent(corps, 'role', 'region');
      const nom = titreRepere(root.querySelector('.recit-thread-title'));
      if (nom) attrSiAbsent(corps, 'aria-label', `Lecture du récit — ${nom}`);
    }

    /* --- E002-03 : rythme vertical ---------------------------------------- */
    data(root, 'rhythm', '1');

    /* --- E002-04 : hiérarchie de la barre de filtres ---------------------- */
    const outils = root.querySelector('.c3a-tools');
    if (present(outils)) {
      marquer(outils, 'recit-v2-e002-tools');
      const recherche = outils.querySelector('.c3a-search');
      if (present(recherche)) marquer(recherche, 'recit-v2-e002-search');
      const groupes = outils.querySelectorAll('.c3a-group');
      Array.prototype.forEach.call(groupes, (groupe) => marquer(groupe, 'recit-v2-e002-group'));
    }

    /* --- E002-05 : comptage de filtres en pastille ------------------------ */
    const statut = root.querySelector('#c3a-status');
    if (present(statut)) {
      marquer(statut, 'recit-v2-e002-status');
      const comptage = lireComptage(statut);
      if (comptage) data(statut, 'count', `${comptage.affiches} / ${comptage.total}`);
    }

    /* --- E002-06 : média, légende et crédit ------------------------------- */
    const media = root.querySelector('.recit-media');
    if (present(media)) {
      data(media, 'media', '1');
      const legende = media.querySelector('.media-caption');
      if (present(legende)) marquer(legende, 'recit-v2-e002-caption');
      const credit = media.querySelector('.recit-media-credit');
      if (present(credit)) marquer(credit, 'recit-v2-e002-credit');
    }

    /* --- E002-07 : traçabilité, état d'ouverture -------------------------- */
    const trace = root.querySelector('details.recit-trace');
    if (present(trace)) marquer(trace, 'recit-v2-e002-trace');

    /* --- E002-08 : lecture automatique, état dérivé ----------------------- */
    const lecture = root.querySelector('.recit-play');
    if (present(lecture)) {
      marquer(lecture, 'recit-v2-e002-play');
      const pressed = lecture.getAttribute('aria-pressed');
      if (pressed === 'true' || pressed === 'false') {
        data(lecture, 'play', pressed === 'true' ? 'En cours' : 'En pause');
      }
    }

    /* --- E002-09 : items du fil, type en pastille de rang ----------------- */
    const items = root.querySelectorAll('.c3a-thread-item');
    Array.prototype.forEach.call(items, (item) => {
      marquer(item, 'recit-v2-e002-item');
      const type = item.querySelector('.thread-kind');
      if (present(type)) marquer(type, 'recit-v2-e002-kind');
    });

    /* --- E002-10 : impression --------------------------------------------- */
    data(root, 'print', '1');
  } catch { /* rendu préservé coûte que coûte */ }
});
