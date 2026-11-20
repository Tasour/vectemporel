import { register } from './registry.js';

/* V2 lentille E066 — « Mobile et reflow responsive » (second regard).
 *
 * La passe 1 (src/views/recit/E066.js) a traité le reflow anticipé à 1180 px,
 * le média en dvh, les cibles tactiles grossières, la barre d'outils empilée,
 * le fil vertical sur téléphone, les safe-area, le paysage court, l'anti-zoom
 * iOS, la grille d'actions et la bascule « vue compacte ». Cette passe V2 ne
 * reprend aucun de ces mécanismes : elle s'attaque à l'ADAPTATION FINE AU
 * CONTENU RÉEL — la mesure de lecture plafonnée, le retour à la line des
 * titres, la taille du titre dérivée de sa longueur, le centrage sur très
 * grand écran, le fil en bandeau défilant sur tablette, l'indice de
 * débordement, l'ajustement du média, l'ancrage à l'épreuve du chrome mobile,
 * le plancher de taille des légendes et un témoin responsive auditable.
 *
 * Greffon strictement additif : aucune suppression ni réécriture de texte,
 * aucune ré-attribution de gestionnaire, aucun fichier partagé modifié. Une
 * seule classe racine `recit-v2-e066-racine` posée sur `layout`, un seul bloc
 * CSS injecté en une fois (cssOnce garantit l'idempotence). Toutes les classes
 * créées sont préfixées `recit-v2-e066-`, tous les attributs `data-v2-e066-`,
 * les deux seuls ids d'élément sont `v2-e066-fil-indice` et `v2-e066-temoins`
 * (préfixe `v2-`, distinct des ids de la passe 1 `e066-…`). Les nœuds visibles
 * sont imbriqués dans `.recit-thread` / `.recit-legend` (descendants de
 * `.recit-body`) : ils échappent ainsi au marquage diagnostic de
 * `_diagnostics.js`. Aucun appel réseau, aucune journalisation, aucune source
 * d'aléa ni d'horodatage, aucune animation JS.
 *
 * Les dix chantiers E066-01 … E066-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E066.md. Chaque chiffre affiché est dérivé du
 * DOM réel (textContent, nombre de nœuds, matchMedia), jamais inventé.
 */

const CSS = `
/* E066-01 — mesure de lecture plafonnée en ch sur tous les blocs de prose. */
.recit-v2-e066-racine{--v2-e066-mesure:72ch}
.recit-v2-e066-racine .recit-title,
.recit-v2-e066-racine .recit-context,
.recit-v2-e066-racine .recit-legend p,
.recit-v2-e066-racine .recit-trace p{
  max-width:min(var(--v2-e066-mesure,72ch),100%);margin-inline:auto
}

/* E066-02 — retour à la line maîtrisé du titre et du chapeau. */
.recit-v2-e066-racine .recit-title{text-wrap:balance}
.recit-v2-e066-racine .recit-context,
.recit-v2-e066-racine .recit-legend p{text-wrap:pretty}

/* E066-03 — titre long : taille fluide dérivée de la longueur réelle du texte. */
.recit-v2-e066-racine[data-v2-e066-titre="long"] .recit-title{
  font-size:clamp(20px,5.2vw,30px);line-height:1.25;overflow-wrap:anywhere
}
.recit-v2-e066-racine[data-v2-e066-titre="moyen"] .recit-title{
  font-size:clamp(22px,6vw,32px)
}

/* E066-04 — centrage de la colonne de lecture sur très grand écran. */
@media (min-width:1600px){
  .recit-v2-e066-racine .recit-body{max-width:72ch;margin-inline:auto}
}

/* E066-05 — fil en bandeau défilant avec scroll-snap sur tablette. */
@media (min-width:621px) and (max-width:1180px){
  .recit-v2-e066-racine .recit-thread-list{
    flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;
    scroll-snap-type:x proximity;padding-bottom:6px;scrollbar-width:thin
  }
  .recit-v2-e066-racine .recit-thread-list>li{flex:0 0 auto;scroll-snap-align:start}
  .recit-v2-e066-racine .recit-thread-item{white-space:nowrap}
}

/* E066-06 — indice de débordement horizontal du fil, texte + fondu décoratif. */
.recit-v2-e066-fil-indice{
  margin:2px 0 0;color:var(--muted-2);font-size:10px;
  font-variant-numeric:tabular-nums;overflow-wrap:anywhere
}
@media (min-width:621px) and (max-width:1180px){
  .recit-v2-e066-racine .recit-thread{position:relative}
  .recit-v2-e066-racine .recit-thread::after{
    content:'';position:absolute;right:0;bottom:26px;width:34px;height:30px;
    background:linear-gradient(to right,transparent,var(--bg,rgba(10,13,20,.9)));
    pointer-events:none
  }
}

/* E066-07 — média : object-fit stable dans le bandeau, vide lisible. */
.recit-v2-e066-racine .recit-media{overflow:hidden}
.recit-v2-e066-racine .recit-media img{
  width:100%;height:100%;object-fit:cover;object-position:center;display:block
}
.recit-v2-e066-racine .media-empty{
  display:flex;align-items:center;justify-content:center;width:100%;height:100%;
  text-align:center;font-size:11px;color:var(--muted-2)
}

/* E066-08 — ancrage à l'épreuve du chrome mobile (scroll-margin du titre). */
.recit-v2-e066-racine .recit-body{scroll-padding-block-start:12px}
.recit-v2-e066-racine #recit-point-title{scroll-margin-block-start:12px}

/* E066-09 — plancher de taille pour les légendes et le statut sur mobile. */
@media (max-width:620px),(pointer:coarse){
  .recit-v2-e066-racine .recit-legend,
  .recit-v2-e066-racine .recit-timing,
  .recit-v2-e066-racine .c3a-status{font-size:11px;line-height:1.5}
}

/* E066-10 — bandeau de témoin responsive et coupe-circuit mouvement réduit. */
.recit-v2-e066-temoins{
  margin:6px 0 0;padding-top:6px;border-top:1px dashed var(--line);
  color:var(--muted);font-size:10px;line-height:1.5;overflow-wrap:anywhere
}
.recit-v2-e066-racine .recit-v2-e066-fil-indice,
.recit-v2-e066-racine .recit-v2-e066-temoins{transition:color .2s linear}
.recit-v2-e066-racine[data-v2-e066-motion="reduce"] .recit-v2-e066-fil-indice,
.recit-v2-e066-racine[data-v2-e066-motion="reduce"] .recit-v2-e066-temoins{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e066-fil-indice,.recit-v2-e066-temoins{transition:none}
}
`;

/* ------------------------------------------------------------------------- *
 * Utilitaires — toute recherche ou écriture DOM est gardée.
 * ------------------------------------------------------------------------- */
function estNoeud(noeud) {
  return !!(noeud && noeud.nodeType === 1);
}

function q(racine, selecteur) {
  return racine && typeof racine.querySelector === 'function'
    ? racine.querySelector(selecteur) : null;
}

function qa(racine, selecteur) {
  return racine && typeof racine.querySelectorAll === 'function'
    ? Array.from(racine.querySelectorAll(selecteur)) : [];
}

function marquer(noeud, classe) {
  if (estNoeud(noeud) && noeud.classList && typeof noeud.classList.add === 'function') {
    try { noeud.classList.add(classe); } catch { /* classe facultative */ }
  }
}

function poserAttribut(noeud, nom, valeur) {
  if (estNoeud(noeud) && typeof noeud.setAttribute === 'function') {
    try { noeud.setAttribute(nom, String(valeur)); } catch { /* attribut facultatif */ }
  }
}

/* Écrit un attribut data réservé à la lentille (jamais un attribut de la coque). */
function data(noeud, nom, valeur) {
  poserAttribut(noeud, `data-v2-e066-${nom}`, valeur);
}

/* Crée un nœud visible, en réutilisant l'éventuel doublon d'un rendu précédent. */
function noeudUnique(doc, fabrique, id, tag, className) {
  let noeud = doc.getElementById(id);
  if (noeud && noeud.parentNode && typeof noeud.parentNode.removeChild === 'function') {
    try { noeud.parentNode.removeChild(noeud); } catch { /* déjà détaché */ }
  }
  noeud = fabrique(tag, className);
  noeud.id = id;
  return noeud;
}

/* Lit « ≈ N s » du texte réel du .recit-timing, sans rien inventer. */
function lireSecondes(timing) {
  const texte = String((timing && timing.textContent) || '');
  const trouve = /≈\s*(\d+)\s*s/i.exec(texte);
  return trouve ? (Number(trouve[1]) || 0) : null;
}

/* Classe de longueur du titre, d'après son textContent réel. */
function classeTitre(titre) {
  const longueur = String((titre && titre.textContent) || '').trim().length;
  if (longueur > 110) return 'long';
  if (longueur > 60) return 'moyen';
  return 'court';
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique.
 * ------------------------------------------------------------------------- */
register('E066', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    if (typeof document === 'undefined') return;
    const doc = document;
    const { stage, layout, css, el, reducedMotion } = ctx;
    const racine = layout;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') {
      try { css('recit-v2-e066', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    marquer(racine, 'recit-v2-e066-racine');

    let mouvementReduit = false;
    try {
      mouvementReduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    } catch { mouvementReduit = false; }
    data(racine, 'motion', mouvementReduit ? 'reduce' : 'full');

    /* --- E066-01 : jeton de mesure plafonnée ------------------------------ */
    data(racine, 'mesure', '72ch');

    /* --- E066-02 : retour à la line (entièrement CSS) -------------------- */
    /* Les règles `text-wrap: balance/pretty` sont portées par la feuille. */

    /* --- E066-03 : classe de longueur du titre --------------------------- */
    const titre = q(racine, '#recit-point-title, .recit-title');
    const classeTitreReelle = classeTitre(titre);
    if (estNoeud(titre)) data(racine, 'titre', classeTitreReelle);

    /* --- E066-04 : centrage grand écran (entièrement CSS) ---------------- */
    /* @media (min-width:1600px) dans la feuille. */

    /* --- E066-05 : fil défilant sur tablette (entièrement CSS) ----------- */
    /* @media (min-width:621px) and (max-width:1180px) dans la feuille. */

    /* --- E066-06 : indice de débordement du fil -------------------------- */
    const fil = q(racine, '.recit-thread');
    const itemsFil = qa(racine, '.c3a-thread .recit-thread-item, .recit-thread-item');
    if (estNoeud(fil) && typeof el === 'function') {
      const indice = noeudUnique(doc, el, 'v2-e066-fil-indice', 'p', 'recit-v2-e066-fil-indice');
      indice.textContent = `Fil horizontal · ${itemsFil.length} point(s) affiché(s) · faites défiler →`;
      fil.appendChild(indice);
    }

    /* --- E066-07 : ajustement du média (entièrement CSS) ----------------- */
    /* object-fit/object-position dans la feuille. */

    /* --- E066-08 : ancrage chrome mobile (entièrement CSS) --------------- */
    /* scroll-padding / scroll-margin dans la feuille. */

    /* --- E066-09 : plancher de taille des légendes (entièrement CSS) ----- */
    /* @media (max-width:620px),(pointer:coarse) dans la feuille. */

    /* --- E066-10 : témoin responsive auditable --------------------------- */
    const legend = q(racine, '.recit-legend');
    const corps = q(racine, '.recit-body');
    const parentTemoins = estNoeud(legend) ? legend : corps;
    if (estNoeud(parentTemoins) && typeof el === 'function') {
      const temoins = noeudUnique(doc, el, 'v2-e066-temoins', 'p', 'recit-v2-e066-temoins');
      const secondes = lireSecondes(q(racine, '.recit-timing'));
      const points = qa(racine, '.recit-thread-item').length;
      let grandEcran = false;
      try {
        grandEcran = typeof window !== 'undefined'
          && typeof window.matchMedia === 'function'
          && window.matchMedia('(min-width:1600px)').matches;
      } catch { grandEcran = false; }
      temoins.textContent = `Responsive V2 — ${points} point(s) · `
        + `${secondes === null ? 'durée non lue' : `≈ ${secondes} s de lecture`} · `
        + `titre ${classeTitreReelle} · colonne ${grandEcran ? 'large' : 'compacte'} · `
        + `mouvement ${mouvementReduit ? 'réduit' : 'complet'} · 10 chantiers.`;
      parentTemoins.appendChild(temoins);
    }
    data(racine, 'chantiers', '10');
    data(racine, 'unique', qa(doc, '#v2-e066-fil-indice, #v2-e066-temoins').length);
  } catch {
    /* Greffon neutralisé silencieusement : la vue reste lisible et utilisable. */
  }
});
