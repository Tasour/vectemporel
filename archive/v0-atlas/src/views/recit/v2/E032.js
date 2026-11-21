import { register } from './registry.js';

/* V2 lentille E032 — « Hiérarchie visuelle et informationnelle » (second regard).
 *
 * La passe 1 (src/views/recit/E032.js) a traité le rythme de proximité, le fil
 * d'Ariane, la progression segmentée, les glyphes de certitude, les étiquettes
 * de type, les compteurs de filtres, l'état du statut, le média, le badge de
 * traçabilité et le panneau de mesures. Cette passe V2 ne reprend aucun de ces
 * mécanismes : elle s'attaque à la HIÉRARCHIE DE LECTURE encore absente —
 * l'échelle de rang, le sommet éditorial unique, l'étiquette d'étape, le chapeau
 * principal, la ligne de métadonnées, l'étiquette de section du fil,
 * la numérotation des groupes de filtres, le repère de l'item courant,
 * le niveau de preuve de la traçabilité et un miroir d'outline textuel.
 *
 * Greffon strictement additif : aucune suppression ni réécriture de texte,
 * aucune ré-attribution de gestionnaire, aucun fichier partagé modifié. Une
 * seule classe racine `recit-v2-e032-racine` posée sur `layout`, un seul bloc
 * CSS injecté en une fois (`cssOnce` garantit l'idempotence). Toutes les classes
 * créées sont préfixées `recit-v2-e032-`, tous les attributs `data-v2-e032-`,
 * le seul id d'élément est `v2-e032-outline` (préfixe `v2-`, distinct des ids de
 * la passe 1 `e032-…`). Aucun appel réseau, aucune journalisation, aucune source
 * d'aléa ni d'horodatage, aucune animation JS.
 *
 * Les dix chantiers E032-01 … E032-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E032.md. Chaque chiffre affiché est dérivé du
 * DOM réel (textContent, attributs ou nombre de nœuds), jamais inventé.
 */

const CSS = `
/* E032-01 — échelle de rang : jetons de hiérarchie partagés par la lentille. */
.recit-v2-e032-racine[data-v2-e032-echelle="1"]{
  --v2-e032-sommet:19px;
  --v2-e032-eyebrow:10px;
  --v2-e032-lead:15px;
  --v2-e032-meta:10px;
  --v2-e032-section:9px;
  --v2-e032-accent:var(--gold,#e6b96f);
}

/* E032-02 — sommet éditorial : le h1 unique reçoit un filet d'accent. */
.recit-v2-e032-racine .recit-v2-e032-sommet{position:relative;padding-bottom:9px}
.recit-v2-e032-racine .recit-v2-e032-sommet::after{
  content:'';position:absolute;left:0;bottom:0;width:42px;height:2px;
  background:var(--v2-e032-accent);pointer-events:none;transition:width .18s ease;
}

/* E032-03 — surtitre en étiquette d'étape : puce + capitales espacées. */
.recit-v2-e032-racine .recit-v2-e032-eyebrow{
  display:inline-flex;align-items:center;gap:6px;
  font-size:var(--v2-e032-eyebrow);text-transform:uppercase;letter-spacing:.14em;
  color:var(--muted-2);font-weight:700;
}
.recit-v2-e032-racine .recit-v2-e032-eyebrow::before{
  content:'';flex:none;width:5px;height:5px;border-radius:50%;
  background:var(--v2-e032-accent);
}

/* E032-04 — chapeau en lead : paragraphe d'introduction mis en avant. */
.recit-v2-e032-racine .recit-v2-e032-lead{
  font-size:var(--v2-e032-lead);line-height:1.6;color:var(--ink);
}

/* E032-05 — meta et timing : ligne de métadonnées subordonnée. */
.recit-v2-e032-racine .recit-v2-e032-meta,
.recit-v2-e032-racine .recit-v2-e032-timing{
  font-size:var(--v2-e032-meta);color:var(--muted-2);
  font-variant-numeric:tabular-nums;
}

/* E032-06 — titre du fil en étiquette de section : filet et marque §. */
.recit-v2-e032-racine .recit-v2-e032-section-label{
  padding-bottom:5px;border-bottom:1px solid var(--line);
  font-size:var(--v2-e032-section);text-transform:uppercase;
  letter-spacing:.14em;color:var(--muted);
}
.recit-v2-e032-racine .recit-v2-e032-section-label::before{
  content:'§ ';color:var(--v2-e032-accent);font-weight:700;
}

/* E032-07 — groupes de filtres numérotés dans l'ordre réel du DOM. */
.recit-v2-e032-racine .recit-v2-e032-group .c3a-group-label{white-space:nowrap}
.recit-v2-e032-racine .recit-v2-e032-group .c3a-group-label[data-v2-e032-ordre]::before{
  content:attr(data-v2-e032-ordre) '. ';
  color:var(--v2-e032-accent);font-variant-numeric:tabular-nums;font-weight:700;
}

/* E032-08 — fil : item courant repéré par un filet (aria-current réel). */
.recit-v2-e032-racine .recit-v2-e032-ici{
  box-shadow:inset 3px 0 0 var(--v2-e032-accent);
}
.recit-v2-e032-racine .recit-v2-e032-ici .thread-kind{
  color:var(--gold-bright,var(--v2-e032-accent));font-weight:700;
}

/* E032-09 — traçabilité : niveau de preuve par style de bordure, jamais par
   la seule couleur (solid = présente, dashed = absente). */
.recit-v2-e032-racine .recit-v2-e032-preuve{
  padding-left:9px;border-left:2px solid var(--line-strong);
}
.recit-v2-e032-racine .recit-v2-e032-preuve[data-v2-e032-preuve="presente"]{
  border-left-style:solid;border-left-color:var(--v2-e032-accent);
}
.recit-v2-e032-racine .recit-v2-e032-preuve[data-v2-e032-preuve="absente"]{
  border-left-style:dashed;
}
.recit-v2-e032-racine .recit-v2-e032-preuve>summary:focus-visible{
  outline:2px solid var(--v2-e032-accent);outline-offset:2px;
}

/* E032-10 — panneau d'outline textuel (masqué hors tiroir par le diagnostic V2). */
.recit-v2-e032-outline{
  padding:8px 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);
}
.recit-v2-e032-outline h2{
  margin:0 0 6px;color:var(--gold,#e6b96f);font-size:12px;font-weight:600;
}
.recit-v2-e032-outline p{
  margin:0 0 4px;color:var(--muted);font-size:11px;line-height:1.45;
  font-variant-numeric:tabular-nums;overflow-wrap:anywhere;
}

/* Mouvement réduit : aucune transition ajoutée par E032 n'est conservée. */
@media (prefers-reduced-motion:reduce){
  .recit-v2-e032-racine .recit-v2-e032-sommet::after{transition:none!important}
}
.recit-v2-e032-racine.recit-v2-e032-sans-mouvement
  .recit-v2-e032-sommet::after{transition:none!important}
@media (max-width:620px){
  .recit-v2-e032-racine .recit-v2-e032-eyebrow{letter-spacing:.08em}
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
  poserAttribut(noeud, `data-v2-e032-${nom}`, valeur);
}

/* Lit « Étape X / Y » dans le surtitre sans modifier son texte. */
function lireEtape(kicker) {
  const texte = String((kicker && kicker.textContent) || '');
  const trouve = /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(texte);
  if (!trouve) return null;
  return { index: Number(trouve[1]) || 1, total: Number(trouve[2]) || 0 };
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique.
 * ------------------------------------------------------------------------- */
register('E032', (ctx) => {
  try {
    if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    const racine = layout;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof css === 'function') {
      try { css('recit-v2-e032', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    marquer(racine, 'recit-v2-e032-racine');

    let mouvementReduit = false;
    try {
      mouvementReduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    } catch { mouvementReduit = false; }
    if (mouvementReduit) marquer(racine, 'recit-v2-e032-sans-mouvement');

    /* --- E032-01 : échelle de rang globale (jetons CSS) ------------------- */
    data(racine, 'echelle', '1');

    /* --- E032-02 : sommet éditorial (h1 unique) --------------------------- */
    const sommet = q(racine, '#recit-point-title, .recit-title');
    if (estNoeud(sommet)) {
      marquer(sommet, 'recit-v2-e032-sommet');
      data(sommet, 'rang', '1');
    }

    /* --- E032-03 : surtitre en étiquette d'étape -------------------------- */
    const kicker = q(racine, '.view-kicker');
    const etape = lireEtape(kicker);
    if (estNoeud(kicker)) {
      marquer(kicker, 'recit-v2-e032-eyebrow');
      data(kicker, 'rang', '2');
      if (etape) data(kicker, 'etape', `${etape.index}/${etape.total}`);
    }

    /* --- E032-04 : chapeau en lead ---------------------------------------- */
    const chapeau = q(racine, '#recit-context, .recit-context');
    if (estNoeud(chapeau)) {
      marquer(chapeau, 'recit-v2-e032-lead');
      data(chapeau, 'rang', '3');
    }

    /* --- E032-05 : meta et timing subordonnés ----------------------------- */
    const meta = q(racine, '.recit-meta');
    const timing = q(racine, '.recit-timing');
    if (estNoeud(meta)) {
      marquer(meta, 'recit-v2-e032-meta');
      data(meta, 'rang', '4');
    }
    if (estNoeud(timing)) {
      marquer(timing, 'recit-v2-e032-timing');
      data(timing, 'rang', '4');
    }

    /* --- E032-06 : titre du fil en étiquette de section ------------------- */
    const titreFil = q(racine, '.recit-thread-title');
    if (estNoeud(titreFil)) {
      marquer(titreFil, 'recit-v2-e032-section-label');
      data(titreFil, 'rang', '5');
    }

    /* --- E032-07 : groupes de filtres numérotés --------------------------- */
    let groupes = 0;
    qa(racine, '.c3a-tools .c3a-group').forEach((groupe) => {
      groupes += 1;
      marquer(groupe, 'recit-v2-e032-group');
      const libelle = q(groupe, '.c3a-group-label');
      if (estNoeud(libelle)) data(libelle, 'ordre', groupes);
    });
    const recherche = q(racine, '.c3a-search');

    /* --- E032-08 : repère « ici » sur l'item courant du fil --------------- */
    const items = qa(racine, '.recit-thread-item');
    const courants = qa(racine,
      '.recit-thread-item[aria-current="step"], .recit-thread-item.is-current');
    const rangCourant = items.findIndex((item) =>
      item.getAttribute('aria-current') === 'step' || item.classList.contains('is-current'));
    courants.forEach((item) => {
      marquer(item, 'recit-v2-e032-ici');
      data(item, 'ici', '1');
    });

    /* --- E032-09 : traçabilité comme niveau de preuve --------------------- */
    const trace = q(racine, 'details.recit-trace');
    const sansSource = q(racine, '.recit-sources');
    let preuve = 'absente';
    if (estNoeud(trace)) {
      marquer(trace, 'recit-v2-e032-preuve');
      data(trace, 'preuve', 'presente');
      preuve = 'sources locales disponibles';
    } else if (estNoeud(sansSource)) {
      marquer(sansSource, 'recit-v2-e032-preuve');
      data(sansSource, 'preuve', 'absente');
      preuve = 'aucune source attachée';
    }

    /* --- E032-10 : miroir d'outline textuel (tiroir diagnostic V2) -------- */
    if (typeof el === 'function' && (estNoeud(stage) || estNoeud(racine))) {
      let ancien = null;
      if (typeof document !== 'undefined') {
        ancien = document.getElementById('v2-e032-outline');
      }
      if (ancien && ancien.parentNode && typeof ancien.parentNode.removeChild === 'function') {
        try { ancien.parentNode.removeChild(ancien); } catch { /* déjà détaché */ }
      }
      const panneau = el('section', 'recit-v2-e032-outline');
      panneau.id = 'v2-e032-outline';
      poserAttribut(panneau, 'data-recitv2-diagnostic', '');
      poserAttribut(panneau, 'aria-label', 'Outline hiérarchique V2 du récit');
      panneau.appendChild(el('h2', '', 'E032 V2 — Hiérarchie visuelle et informationnelle · outline'));

      const rangs = 1 + (estNoeud(kicker) ? 1 : 0) + (estNoeud(chapeau) ? 1 : 0)
        + (estNoeud(meta) ? 1 : 0) + (estNoeud(timing) ? 1 : 0)
        + (estNoeud(titreFil) ? 1 : 0);
      const lignes = [
        `Échelle de rang : ${rangs} niveau(x) marqué(s) sur 6 prévus.`,
        `Sommet : ${estNoeud(sommet) ? 'h1 présent et souligné' : 'titre absent'}.`,
        `Surtitre : ${etape ? `étape ${etape.index}/${etape.total}` : 'non lisible'}.`,
        `Chapeau : ${estNoeud(chapeau) ? 'présent en lead' : 'absent'}.`,
        `Métadonnées : meta ${estNoeud(meta) ? 'présente' : 'absente'} · `
          + `timing ${estNoeud(timing) ? 'présent' : 'absent'}.`,
        `Section du fil : ${estNoeud(titreFil) ? 'étiquette posée' : 'absente'}.`,
        `Filtres : ${groupes} groupe(s) numéroté(s) · `
          + `recherche ${estNoeud(recherche) ? 'présente' : 'absente'}.`,
        `Fil : ${items.length} item(s) · courant `
          + `${rangCourant >= 0 ? `${rangCourant + 1}/${items.length}` : 'aucun'}.`,
        `Traçabilité : ${preuve} (${courants.length} repère(s) « ici »).`,
        `Feuille : recit-v2-e032 (une seule) · mouvement `
          + `${mouvementReduit ? 'réduit' : 'complet'}.`,
      ];
      lignes.forEach((ligne) => panneau.appendChild(el('p', '', ligne)));
      (estNoeud(stage) ? stage : racine).appendChild(panneau);
    }
  } catch {
    /* Greffon neutralisé silencieusement : la vue reste lisible et utilisable. */
  }
});
