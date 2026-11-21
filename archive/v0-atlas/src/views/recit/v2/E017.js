import { register } from './registry.js';

/* V2 lentille E017 — Contraste et perception (complément de la passe 1).
   La passe 1 traite déjà le jalon courant, les degrés de confiance, la
   progression chiffrée, la légende, le crédit image, le focus, prefers-contrast,
   le kicker typé, l'absence de source et le contraste du titre. La V2 propose
   donc dix chantiers neufs et distincts : état actif des filtres, étiquettes
   de type du fil, métadonnées et timing, statut de filtrage, état vide,
   légende d'image, message « aucune image », deux bilans chiffrés dérivés du
   DOM réel et contraste forcé système. Tout est non destructif : sans ce
   module, la vue reste intégralement lisible. Préfixes : classes
   recit-v2-e017-, ids DOM v2-e017- (jamais les ids e017- de la passe 1 qui
   tourne sur le même DOM). Zéro réseau, zéro console, zéro aléa, aucun
   fichier partagé modifié. */

const CSS = `
/* E017-01 — Filtres actifs : liseré inférieur et graisse, en plus de la couleur,
   pour que l'état aria-pressed survive à la vision en niveaux de gris. */
.recit-layout .recit-v2-e017-filtres .c3a-filter[aria-pressed="true"]{
  border-bottom:2px solid var(--gold-bright);
  font-weight:700;
}

/* E017-02 — Étiquettes de type du fil : pastille cadrée et contrastée, pour
   distinguer le type du libellé du point sans toucher au bouton. */
.recit-layout .recit-v2-e017-fil .thread-kind{
  color:var(--ink-soft);
  font-size:9px;
  padding:0 4px;
  border:1px solid var(--line-strong);
  border-radius:4px;
  background:rgba(255,255,255,.04);
}

/* E017-03 — Métadonnées et durée de lecture : filet latéral et contraste,
   pour hiérarchiser les informations secondaires autour du titre. */
.recit-layout .recit-v2-e017-meta .recit-meta,
.recit-layout .recit-v2-e017-meta .recit-timing{
  color:var(--ink-soft);
  padding-left:8px;
  border-left:2px solid var(--line-strong);
  font-variant-numeric:tabular-nums;
}

/* E017-04 — Statut de filtrage et libellés de groupe : contraste relevé par
   défaut (la passe 1 ne les durcissait que sous prefers-contrast: more). */
.recit-layout .recit-v2-e017-statut .c3a-status,
.recit-layout .recit-v2-e017-statut .c3a-group-label{color:var(--ink-soft)}

/* E017-05 — État vide : le cadre existant est renforcé par une barre latérale
   et un fond stable, pour percevoir l'absence de résultat avant de lire. */
.recit-layout .c3a-empty.recit-v2-e017-vide{
  border-color:var(--muted);
  border-left:3px solid var(--gold);
  background:rgba(230,185,111,.06);
  color:var(--ink-soft);
}

/* E017-06 — Légende de l'image : fond opaque appliqué à la légende elle-même
   (la passe 1 ne traitait que le crédit), pour un contraste indépendant de la
   luminosité de l'illustration. */
.recit-layout .media-caption.recit-v2-e017-caption{
  padding:3px 8px;
  border-radius:6px;
  background:rgba(7,10,14,.8);
  color:var(--ink-soft);
  text-shadow:none;
  font-size:9px;
}

/* E017-07 — Absence d'image vérifiée : message encadré et contrasté, au lieu
   d'un texte perdu dans le panneau média. */
.recit-layout .media-empty.recit-v2-e017-sans-image{
  padding:8px;
  border:1px dashed var(--line-strong);
  border-radius:8px;
  background:rgba(255,255,255,.02);
  color:var(--ink-soft);
  font-size:11px;
}

/* E017-08 — Bilan des types : paragraphe visible à mesure tabulaire, avec
   liseré doré, pour lire la répartition du fil sans deviner de chiffre. */
.recit-v2-e017-readout{
  margin:6px 0 0;
  padding-left:8px;
  border-left:2px solid var(--gold);
  color:var(--ink-soft);
  font-size:10px;
  line-height:1.5;
  font-variant-numeric:tabular-nums;
}

/* E017-09 — Bilan des certitudes : même forme de paragraphe visible, mais un
   liseré neutre pour distinguer les deux synthèses l'une de l'autre. */
.recit-layout .recit-v2-e017-certitudes{border-left-color:var(--muted)}

/* E017-10 — Modes de contraste système : les repères de forme passent en
   couleurs système sous forced-colors, et le texte des bilans durcit en --ink
   sous prefers-contrast: more, sans toucher à l'apparence par défaut. */
@media (forced-colors: active){
  .recit-layout .recit-v2-e017-filtres .c3a-filter[aria-pressed="true"]{border-bottom-color:Highlight}
  .recit-layout .recit-v2-e017-fil .thread-kind,
  .recit-layout .c3a-empty.recit-v2-e017-vide,
  .recit-layout .media-empty.recit-v2-e017-sans-image{border-color:CanvasText}
  .recit-layout .recit-v2-e017-readout{border-left-color:Highlight}
}
@media (prefers-contrast: more){
  .recit-layout .recit-v2-e017-readout{color:var(--ink);border-left-width:3px}
}
`;

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Dépose (ou réutilise) un paragraphe visible à un emplacement stable. `el` est
   passé en paramètre : le helper vit au niveau module et ne peut pas lire la
   variable locale de register(). */
function placeParagraphe(el, id, classe, parent, ancre, texte) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = el('p', `recit-v2-e017-readout ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E017', (ctx) => {
  const { layout, css, el } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e017', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const fil = layout.querySelector('.recit-thread');
    const titreFil = fil ? fil.querySelector('.recit-thread-title') : null;
    const legende = corps.querySelector('.recit-legend');
    const caption = layout.querySelector('.media-caption');
    const sansImage = layout.querySelector('.media-empty');
    const vide = layout.querySelector('.c3a-empty');

    /* E017-01 — état actif des filtres : classe porteuse du liseré. */
    ajouteClasse(corps, 'recit-v2-e017-filtres');

    /* E017-02 — étiquettes de type du fil : classe porteuse de la pastille. */
    ajouteClasse(fil, 'recit-v2-e017-fil');

    /* E017-03 — métadonnées et timing : classe porteuse du filet latéral. */
    ajouteClasse(corps, 'recit-v2-e017-meta');

    /* E017-04 — statut et libellés de groupe : classe porteuse du contraste. */
    ajouteClasse(corps, 'recit-v2-e017-statut');

    /* E017-05 — état vide : classe posée sur le cadre existant. */
    ajouteClasse(vide, 'recit-v2-e017-vide');

    /* E017-06 — légende de l'image : classe posée sur la légende elle-même. */
    ajouteClasse(caption, 'recit-v2-e017-caption');

    /* E017-07 — absence d'image : classe posée sur le message existant. */
    ajouteClasse(sansImage, 'recit-v2-e017-sans-image');

    /* E017-08 — répartition des types du fil, comptée sur les vrais attributs
       data-kind des boutons après filtrage ; aucun chiffre n'est inventé. */
    const items = fil ? Array.from(fil.querySelectorAll('.c3a-thread-item')) : [];
    if (items.length) {
      const comptes = new Map();
      items.forEach((item) => {
        const cle = item.getAttribute('data-kind') || 'point';
        comptes.set(cle, (comptes.get(cle) || 0) + 1);
      });
      const parties = Array.from(comptes, ([cle, n]) => `${cle} ${n}`);
      placeParagraphe(el, 'v2-e017-types', 'recit-v2-e017-types', fil, titreFil,
        `Types du fil : ${parties.join(' · ')} (${items.length} point${items.length > 1 ? 's' : ''}).`);
    }

    /* E017-09 — répartition des certitudes, comptée sur data-confidence des
       mêmes boutons ; les clés viennent du DOM, le reste est « non renseigné ». */
    if (items.length) {
      const comptes = new Map();
      let nonRenseigne = 0;
      items.forEach((item) => {
        const cle = item.getAttribute('data-confidence');
        if (cle) comptes.set(cle, (comptes.get(cle) || 0) + 1);
        else nonRenseigne += 1;
      });
      const parties = Array.from(comptes, ([cle, n]) => `${cle} ${n}`);
      if (nonRenseigne) parties.push(`non renseigné ${nonRenseigne}`);
      if (parties.length) {
        placeParagraphe(el, 'v2-e017-certitudes', 'recit-v2-e017-certitudes', corps, legende,
          `Certitudes du fil : ${parties.join(' · ')}.`);
      }
    }

    /* E017-10 — la tenue sous contraste renforcé est portée par le bloc média
       CSS ci-dessus, sans attribut JS : aucun état supplémentaire n'est posé. */
  } catch (_) {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
