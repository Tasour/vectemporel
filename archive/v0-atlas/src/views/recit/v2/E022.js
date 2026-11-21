import { register } from './registry.js';

/* V2 lentille E022 — Hiérarchie visuelle et informationnelle, seconds repères.
 *
 * La passe 1 (`src/views/recit/E022.js`) a posé l'échelle typographique du point,
 * la chaîne sur-titre → titre → contexte, le regroupement des métadonnées, le
 * plancher de 10 px, le marqueur de forme du point courant, les étiquettes
 * tertiaires, la carte « preuve », la hiérarchie des actions, la survie au seuil
 * d'empilement et un audit en lecture seule. Ce jeu V2 ne reprend aucun de ces
 * chantiers : il porte sur les REPÈRES DE SECTION et la PROFONDEUR encore
 * absents — en-tête du fil, rail séquentiel, niveau « média absent »,
 * séparateur de rang des commandes, étiquettes des paragraphes de légende,
 * mise en évidence au focus, indentation de profondeur, hiérarchie de
 * proximité dans le fil, résilience des repères et audit de la couche V2.
 *
 * Tout est additif : aucun texte n'est retiré ni réécrit, aucun attribut porté
 * par la coque n'est remplacé, aucun identifiant de la passe 1 (`e022-…`) n'est
 * réutilisé. Chaque chiffre ou libellé affiché est dérivé du `textContent` réel
 * ou de la position réelle des nœuds. Un seul register, un seul bloc CSS
 * (`css(ID, CSS)`, `ID = 'recit-v2-e022'`), classes préfixées `recit-v2-e022-`, ids DOM
 * préfixés `v2-e022-` et uniques, try/catch global, zéro réseau/console/aléa.
 *
 * Les dix chantiers sont détaillés dans UNIFIED_AUDIT/RECIT/V2/views/E022.md.
 */

const ROOT = 'recit-v2-e022-root';
const REDUIT = 'recit-v2-e022-reduced';
const GLOBAL_KEY = 'VECTEMPOREL_E022_V2';
const VERSION = '1.0.0';

const CSS = `
/* E022-01 — en-tête du fil érigé en section nommée : le sur-titre est lu dans
   le texte réel (« Fil du repère · <nom> »), jamais inventé. */
.recit-v2-e022-root .recit-v2-e022-fil-titre{
  position:relative;margin:0 0 8px;padding:8px 0 0;
  border-top:2px solid var(--line-strong);
  color:var(--ink);font-size:11px;font-weight:600;letter-spacing:.02em;
}
.recit-v2-e022-root .recit-v2-e022-fil-titre::before{
  content:attr(data-v2-e022-fil-label);display:block;margin-bottom:2px;
  color:var(--gold-bright);font-size:9px;font-weight:700;
  letter-spacing:.14em;text-transform:uppercase;
}
.recit-v2-e022-root .recit-v2-e022-fil-titre[data-v2-e022-fil-label=""]::before{display:none}

/* E022-02 — rail séquentiel : barre et coches alignées sur chaque repère du
   fil, pour lire la liste comme une suite ordonnée et non comme un amas. */
.recit-v2-e022-root .recit-v2-e022-rail{position:relative;padding-left:14px}
.recit-v2-e022-root .recit-v2-e022-rail::before{
  content:"";position:absolute;left:4px;top:6px;bottom:6px;
  width:1px;background:var(--line-strong);
}
.recit-v2-e022-root .recit-v2-e022-rail>li{position:relative}
.recit-v2-e022-root .recit-v2-e022-rail>li::before{
  content:"";position:absolute;left:-14px;top:14px;
  width:7px;height:7px;border-radius:50%;
  border:1px solid var(--line-strong);background:var(--gold);
}

/* E022-03 — niveau « média absent » assumé : le vide devient un état cadré et
   subordonné, repérable par une forme (▢), pas par la seule couleur. */
.recit-v2-e022-root .recit-v2-e022-media-vide{
  display:flex;align-items:center;gap:8px;
  padding:8px 10px;border:1px dashed var(--line-strong);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--muted);
  font-size:10px;line-height:1.5;
}
.recit-v2-e022-root .recit-v2-e022-media-vide::before{
  content:"▢";color:var(--gold);font-size:14px;line-height:1;
}

/* E022-04 — séparateur de rang des commandes : filet entre le groupe
   navigation/lecture et le groupe réinitialisation/repère/vue. */
.recit-v2-e022-root .recit-v2-e022-actions button[data-fk="c3a-restart"]{position:relative;margin-left:12px}
.recit-v2-e022-root .recit-v2-e022-actions button[data-fk="c3a-restart"]::before{
  content:"";position:absolute;left:-7px;top:20%;height:60%;
  width:1px;background:var(--line-strong);
}

/* E022-05 — légende : chaque paragraphe reçoit une étiquette de niveau lue
   dans son propre texte (« Degrés de certitude », « Types de points », …). */
.recit-v2-e022-root .recit-v2-e022-legende p{position:relative;padding-left:104px;min-height:18px}
.recit-v2-e022-root .recit-v2-e022-legende p::before{
  content:attr(data-v2-e022-over);position:absolute;left:0;top:0;
  width:96px;color:var(--gold-bright);font-size:9px;font-weight:700;
  letter-spacing:.06em;text-transform:uppercase;line-height:1.5;
}
.recit-v2-e022-root .recit-v2-e022-legende p[data-v2-e022-over=""]::before{display:none}

/* E022-06 — mise en évidence contextuelle : la section qui contient le focus
   monte d'un cran dans la hiérarchie (repère de lieu, pas de couleur seule). */
.recit-v2-e022-root .recit-v2-e022-focus{
  position:relative;border-radius:8px;transition:box-shadow .16s ease;
}
.recit-v2-e022-root .recit-v2-e022-focus:focus-within{
  box-shadow:0 0 0 1px var(--gold),0 0 0 4px rgba(230,185,111,.10);
}

/* E022-07 — profondeur des niveaux secondaires : retrait gradué 6 / 12 px,
   désactivé en étroit (E022-09). */
.recit-v2-e022-root .recit-v2-e022-depth-1{padding-left:6px}
.recit-v2-e022-root .recit-v2-e022-depth-2{padding-left:12px}

/* E022-08 — hiérarchie de proximité dans le fil : les repères voisins du point
   courant restent au premier plan, les lointains passent en retrait. */
.recit-v2-e022-root .recit-v2-e022-proche{opacity:1;font-weight:600}
.recit-v2-e022-root .recit-v2-e022-lointain{opacity:.62;font-weight:400}

/* E022-09 — résilience des repères : empilement mobile, mouvement réduit,
   couleurs forcées. */
@media (max-width:620px){
  .recit-v2-e022-root .recit-v2-e022-legende p{padding-left:0}
  .recit-v2-e022-root .recit-v2-e022-legende p::before{
    position:static;display:block;width:auto;margin-bottom:2px;
  }
  .recit-v2-e022-root .recit-v2-e022-depth-1,
  .recit-v2-e022-root .recit-v2-e022-depth-2{padding-left:0}
  .recit-v2-e022-root .recit-v2-e022-lointain{opacity:.8}
}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e022-root .recit-v2-e022-focus{transition:none}
}
.recit-v2-e022-reduced .recit-v2-e022-focus{transition:none}
@media (forced-colors:active){
  .recit-v2-e022-root .recit-v2-e022-rail::before,
  .recit-v2-e022-root .recit-v2-e022-rail>li::before,
  .recit-v2-e022-root .recit-v2-e022-actions button[data-fk="c3a-restart"]::before{
    background:CanvasText;
  }
  .recit-v2-e022-root .recit-v2-e022-focus:focus-within{outline:2px solid CanvasText}
}

/* E022-10 — audit en lecture seule de la couche V2 (aucune règle décorative ;
   le point d'observation est dans le JS). */
`;

/* --- gardes minuscules, toutes non destructives -------------------------- */

function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Un chantier défaillant ne doit jamais interrompre les suivants ni le rendu. */
function safe(fn) {
  try { fn(); } catch { /* la vue reste intégralement lisible */ }
}

/* Ajoute une classe sans écraser les classes déjà posées par la coque. */
function marquer(node, classe) {
  if (present(node) && node.classList && typeof node.classList.add === 'function') {
    node.classList.add(classe);
  }
  return node;
}

/* Pose un id réservé à la lentille seulement si le nœud n'en a déjà aucun. */
function idSiAbsent(node, id) {
  if (!present(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute('id')) return;
  if (typeof document !== 'undefined' && document.getElementById(id)) return;
  try { node.setAttribute('id', id); } catch { /* identifiant facultatif */ }
}

/* Pose un attribut data-* préfixé, sans toucher aux attributs de la coque. */
function data(node, name, value) {
  if (!present(node)) return;
  try { node.setAttribute(`data-v2-e022-${name}`, String(value)); } catch { /* facultatif */ }
}

function layoutCourant(ctx) {
  if (ctx && ctx.layout && typeof ctx.layout.querySelector === 'function') return ctx.layout;
  if (typeof document !== 'undefined' && document.querySelector) {
    return document.querySelector('.recit-layout');
  }
  return null;
}

/* --- E022-10 : audit en lecture seule, recalculé depuis le DOM courant ---- */

function audit() {
  const layout = (typeof document !== 'undefined' && document.querySelector)
    ? document.querySelector('.recit-layout') : null;
  const first = (selector) => (layout && typeof layout.querySelector === 'function'
    ? layout.querySelector(selector) : null);
  const count = (selector) => (layout && typeof layout.querySelectorAll === 'function'
    ? layout.querySelectorAll(selector).length : 0);

  const racine = Boolean(layout && layout.classList && layout.classList.contains(ROOT));
  const filTitre = first('.recit-v2-e022-fil-titre');
  const rail = first('.recit-v2-e022-rail');
  const mediaVide = first('.recit-v2-e022-media-vide');
  const mediaEmpty = first('.media-empty');
  const actions = first('.recit-v2-e022-actions');
  const legend = first('.recit-v2-e022-legende');
  const surtitles = count('.recit-v2-e022-legende p[data-v2-e022-over]');
  const focuses = count('.recit-v2-e022-focus');
  const depths = count('.recit-v2-e022-depth-1, .recit-v2-e022-depth-2');
  const courant = first('.c3a-thread-item[aria-current="step"]');
  const proches = count('.recit-v2-e022-proche');
  const reduit = Boolean(layout && layout.classList && layout.classList.contains(REDUIT));

  const checks = {
    'E022-01': Boolean(filTitre && filTitre.getAttribute('data-v2-e022-fil-label') !== null),
    'E022-02': Boolean(rail),
    'E022-03': !mediaEmpty || Boolean(mediaVide),
    'E022-04': Boolean(actions && first('.recit-actions button[data-fk="c3a-restart"]')),
    'E022-05': Boolean(legend && surtitles >= 1),
    'E022-06': focuses >= 2,
    'E022-07': depths >= 1,
    'E022-08': !courant || proches > 0,
    'E022-09': racine,
    'E022-10': Boolean(typeof window !== 'undefined' && window[GLOBAL_KEY]
      && window[GLOBAL_KEY].version === VERSION),
  };
  const passed = Object.keys(checks).filter((key) => checks[key]).length;

  return {
    version: VERSION,
    styleId: 'recit-v2-e022',
    racine,
    reduit,
    surtitles,
    focuses,
    depths,
    proches,
    checks,
    passed,
  };
}

function exposeApi() {
  if (typeof window === 'undefined') return;
  const actuel = window[GLOBAL_KEY];
  if (actuel && actuel.version === VERSION) return;
  window[GLOBAL_KEY] = Object.freeze({ version: VERSION, styleId: 'recit-v2-e022', audit });
}

/* --- point d'entrée unique ------------------------------------------------ */

register('E022', (ctx) => {
  try {
    if (typeof document === 'undefined') return;
    const { css, el, reducedMotion } = ctx || {};

    /* Une seule feuille pour toute la lentille (cssOnce garantit l'idempotence). */
    safe(() => {
      if (typeof css === 'function') css('recit-v2-e022', CSS);
    });

    const layout = layoutCourant(ctx);
    if (!present(layout) || typeof layout.querySelector !== 'function') return;
    marquer(layout, ROOT);

    safe(() => {
      /* E022-01 — en-tête du fil : sur-titre lu dans « Fil du repère · … ». */
      const filTitre = layout.querySelector('.recit-thread-title');
      if (present(filTitre)) {
        marquer(filTitre, 'recit-v2-e022-fil-titre');
        idSiAbsent(filTitre, 'v2-e022-fil-titre');
        const parties = String(filTitre.textContent || '').split('·');
        const etiquette = parties.length > 1 ? parties[0].trim() : '';
        data(filTitre, 'fil-label', etiquette);
      }
    });

    safe(() => {
      /* E022-02 — rail séquentiel sur la liste <ol> du fil. */
      const liste = layout.querySelector('#c3a-thread')
        || layout.querySelector('.recit-thread-list.c3a-thread');
      if (present(liste)) marquer(liste, 'recit-v2-e022-rail');
    });

    safe(() => {
      /* E022-03 — état « aucune image vérifiée » cadré. */
      marquer(layout.querySelector('.media-empty'), 'recit-v2-e022-media-vide');
    });

    safe(() => {
      /* E022-04 — filet de séparation entre commandes primaires et secondaires. */
      marquer(layout.querySelector('.recit-actions'), 'recit-v2-e022-actions');
    });

    safe(() => {
      /* E022-05 — étiquette de niveau lue au début de chaque paragraphe. */
      const legende = layout.querySelector('.recit-legend');
      if (present(legende)) {
        marquer(legende, 'recit-v2-e022-legende');
        idSiAbsent(legende, 'v2-e022-legende');
        const paragraphes = legende.querySelectorAll('p');
        Array.prototype.forEach.call(paragraphes, (p) => {
          const texte = String(p.textContent || '').trim();
          const indice = texte.indexOf(' :');
          data(p, 'over', indice > 0 ? texte.slice(0, indice).trim() : '');
        });
      }
    });

    safe(() => {
      /* E022-06 — la section qui détient le focus monte d'un cran. */
      ['.recit-thread', '.c3a-tools', '.recit-actions'].forEach((selecteur) => {
        marquer(layout.querySelector(selecteur), 'recit-v2-e022-focus');
      });
    });

    safe(() => {
      /* E022-07 — retrait gradué des niveaux secondaires. */
      [['.recit-timing', 1], ['.c3a-tools', 2], ['.recit-thread', 2],
       ['.recit-legend', 2], ['.recit-actions', 2]].forEach(([selecteur, niveau]) => {
        marquer(layout.querySelector(selecteur), `recit-v2-e022-depth-${niveau}`);
      });
    });

    safe(() => {
      /* E022-08 — proximité au point courant, calculée depuis l'ordre réel. */
      const items = Array.prototype.slice.call(layout.querySelectorAll('.c3a-thread-item'));
      const position = items.findIndex((item) => item && item.getAttribute
        && item.getAttribute('aria-current') === 'step');
      if (position < 0) return;
      items.forEach((item, index) => {
        const distance = Math.abs(index - position);
        marquer(item, distance <= 2 ? 'recit-v2-e022-proche' : 'recit-v2-e022-lointain');
        data(item, 'proximite', distance);
      });
    });

    safe(() => {
      /* E022-09 — mouvement réduit : le repère de focus devient statique. */
      if (typeof reducedMotion !== 'function') return;
      let reduit = false;
      try { reduit = reducedMotion(); } catch { reduit = false; }
      if (reduit) marquer(layout, REDUIT);
      /* `el` est accepté par le contrat mais inutile ici : aucune coupleur
         n'est créé, tous les repères sont des classes/attributs. */
      void el;
    });

    /* E022-10 — publication d'un audit gelé, sans effet sur le rendu. */
    safe(exposeApi);
  } catch { /* garde-fou global : une lentille défaillante ne casse pas le rendu. */ }
});
