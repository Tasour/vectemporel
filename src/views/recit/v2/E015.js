import { register } from './registry.js';

/* V2 lentille E015 — « Accessibilité, second regard » de la vue Récit.
 *
 * La passe 1 E015 a posé les fondations ARIA (repère de lecture, description
 * du titre, barre de progression, sémantique du fil, noms des commandes,
 * certitude textuelle, aide clavier, légende, média, préambule). Cette passe V2
 * ne les remplace pas : elle comble les angles morts encore ouverts — repère
 * de recherche, lien d'évitement, contraste forcé, cibles tactiles, reflow à
 * 200 %, atomicité du statut, raccourcis du fil, raison des commandes
 * désactivées, repère non coloré du point courant et mouvement réduit.
 *
 * Dix chantiers E015-01 … E015-10, strictement additifs et non destructifs :
 * aucune suppression de texte, aucune ré-attribution d'événement, aucun
 * fichier partagé modifié. Une seule classe racine `recit-v2-e015-root` posée
 * sur `layout`, un seul bloc CSS injecté via la feuille `recit-v2-e015`
 * (`cssOnce` garantit l'idempotence). Toutes les classes créées sont préfixées
 * `recit-v2-e015-` ; aucun identifiant d'élément n'est ajouté (les marqueurs
 * sont des attributs `data-v2-e015-*` et des classes, ce qui écarte toute
 * collision avec les ids `e015-` de la passe 1 et avec le mode diagnostic).
 * Aucun appel réseau, aucune journalisation, aucune source d'aléa ni de date
 * courante, aucune animation JavaScript.
 *
 * Les dix chantiers sont détaillés dans UNIFIED_AUDIT/RECIT/V2/views/E015.md.
 */

const RACINE = 'recit-v2-e015-root';

/* Bloc CSS unique. Les règles de surcharge utilisent un sélecteur préfixé
   (spécificité supérieure aux règles de base) ; :where() n'est employé que
   lorsqu'aucune règle concurrente n'existe. */
const CSS = `
/* E015-01 — repère de recherche : la barre d'outils devient un landmark. */
.recit-v2-e015-root .recit-v2-e015-tools{margin-top:0}
/* E015-02 — lien d'évitement : masqué au repos, rentré au focus clavier. */
.recit-v2-e015-root .recit-v2-e015-skip{
  position:absolute;left:-9999px;top:0;z-index:20;
  min-height:36px;padding:8px 12px;border:1px solid var(--gold-bright);border-radius:6px;
  background:var(--bg,#0b0f16);color:var(--gold-bright);font:inherit;font-size:10px;
}
.recit-v2-e015-root .recit-v2-e015-skip:focus-visible{
  left:0;top:0;outline:2px solid var(--gold-bright);outline-offset:2px;
}
/* E015-03 — contraste forcé : garder focus, bordures et progression visibles. */
@media (forced-colors: active){
  .recit-v2-e015-root :is(button, a, summary, input):focus-visible{
    outline:2px solid Highlight;outline-offset:2px;
  }
  .recit-v2-e015-root .recit-thread-item.is-current,
  .recit-v2-e015-root .recit-thread-item[aria-current="step"]{border:2px solid Highlight}
  .recit-v2-e015-root .recit-progress>span{background:Highlight;forced-color-adjust:none}
  .recit-v2-e015-root :where(.recit-conf, .recit-v2-e015-skip){border:1px solid CanvasText}
}
/* E015-04 — cibles tactiles : au moins 36 px, 44 px sur pointe grossière. */
.recit-v2-e015-root .c3a-filter,
.recit-v2-e015-root .recit-trace summary,
.recit-v2-e015-root .recit-actions button,
.recit-v2-e015-root .recit-play{min-height:36px}
@media (pointer: coarse){
  .recit-v2-e015-root .c3a-filter,
  .recit-v2-e015-root .recit-thread-item,
  .recit-v2-e015-root .recit-trace summary,
  .recit-v2-e015-root .recit-actions button{min-height:44px}
}
/* E015-05 — reflow à 200 % : aucun texte ne doit être rogné. */
:where(.recit-v2-e015-root .recit-body){overflow-wrap:anywhere}
:where(.recit-v2-e015-root .recit-title){overflow-wrap:anywhere}
.recit-v2-e015-root .recit-conf{white-space:normal}
.recit-v2-e015-root .recit-media :where(img){max-width:100%;height:auto}
/* E015-06 — statut de filtrage : l'annonce doit être atomique. */
.recit-v2-e015-root .recit-v2-e015-status{font-variant-numeric:tabular-nums}
/* E015-07 — raccourcis du fil : indice visuel discret, jamais la seule couleur. */
.recit-v2-e015-root .recit-v2-e015-item{position:relative}
/* E015-08 — commandes désactivées : raison lisible au survol et au focus. */
.recit-v2-e015-root .recit-actions button[disabled]{cursor:help}
/* E015-09 — repère non coloré du point courant dans le fil. */
.recit-v2-e015-root .recit-thread-item[data-v2-e015-current="1"]::after{
  content:' ◀ courant';font-size:8px;font-weight:700;color:var(--gold-bright);
}
/* E015-10 — mouvement réduit : neutraliser toute transition résiduelle. */
@media (prefers-reduced-motion: reduce){
  .recit-v2-e015-root :where(button, a, .recit-thread-item, .recit-progress>span){transition:none!important;animation:none!important}
}
.recit-v2-e015-root[data-v2-e015-motion="reduced"] :where(button, a, .recit-thread-item){transition:none!important}
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

/* Vrai si la classe est déjà portée (idempotence). */
function deja(node, className) {
  return !!(present(node) && node.classList && typeof node.classList.contains === 'function'
    && node.classList.contains(className));
}

/* Pose un attribut seulement s'il n'existe pas déjà (coque et passe 1 intactes). */
function attrSiAbsent(node, name, value) {
  if (!present(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute(name)) return;
  try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
}

/* Pose un attribut data-* réservé à la lentille (jamais un id d'élément). */
function data(node, name, value) {
  if (!present(node)) return;
  try { node.setAttribute(`data-v2-e015-${name}`, String(value)); } catch { /* facultatif */ }
}

/* Sélecteurs sûrs : renvoient null / [] plutôt que de lever. */
function q(root, selector) {
  try { return (root && typeof root.querySelector === 'function') ? root.querySelector(selector) : null; }
  catch { return null; }
}

function qa(root, selector) {
  try { return (root && typeof root.querySelectorAll === 'function') ? Array.from(root.querySelectorAll(selector)) : []; }
  catch { return []; }
}

/* Fabrique un nœud via l'api ctx.el quand elle est disponible. */
function fabrique(ctx, tag, className, text) {
  if (ctx && typeof ctx.el === 'function') {
    try {
      const node = ctx.el(tag, className, text);
      if (present(node)) return node;
    } catch { /* repli ci-dessous */ }
  }
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Dérive une raison textuelle d'un bouton désactivé depuis SON texte réel. */
function raisonDesactive(texte) {
  const t = String(texte || '');
  if (/précédent/i.test(t)) return 'Aucun point précédent : vous êtes au premier point.';
  if (/suivant.*point|point suivant/i.test(t)) return 'Aucun point suivant : vous êtes au dernier point.';
  if (/recommencer/i.test(t)) return 'Déjà au premier point : aucun retour en arrière possible.';
  if (/repère suivant/i.test(t)) return 'Dernier repère de la chronologie.';
  return 'Commande indisponible dans l’état courant.';
}

/* Chaque chantier est isolé : un échec local n'affecte ni les autres ni le rendu. */
function garde(fn) {
  try { return fn(); } catch { return null; }
}

register('E015', (ctx) => {
  try {
    if (!ctx) return;
    const root = present(ctx.layout) ? ctx.layout : ctx.stage;
    if (!present(root) || typeof root.querySelector !== 'function') return;

    /* Un seul bloc CSS pour toute la lentille (cssOnce garantit l'idempotence). */
    if (typeof ctx.css === 'function') {
      try { ctx.css('recit-v2-e015', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    marquer(root, RACINE);
    const corps = q(root, '.recit-body');

    /* --- E015-01 : repère de recherche ----------------------------------- */
    garde(() => {
      const outils = q(root, '.c3a-tools');
      if (!present(outils)) return;
      marquer(outils, 'recit-v2-e015-tools');
      attrSiAbsent(outils, 'role', 'search');
      attrSiAbsent(outils, 'aria-label', 'Recherche et filtres du repère');
      data(outils, 'landmark', '1');
    });

    /* --- E015-02 : lien d'évitement vers le point courant ---------------- */
    garde(() => {
      if (!present(corps) || qa(corps, '.recit-v2-e015-skip').length) return;
      const lien = fabrique(ctx, 'a', 'recit-v2-e015-skip', 'Aller au point courant');
      lien.setAttribute('href', '#recit-point-title');
      data(lien, 'skip', '1');
      corps.insertBefore(lien, corps.firstChild);
    });

    /* --- E015-03 : contraste forcé ---------------------------------------- */
    garde(() => {
      data(root, 'forced', '1');
      const courant = q(root, '.recit-thread-item.is-current, .recit-thread-item[aria-current="step"]');
      if (present(courant)) data(courant, 'forced-current', '1');
    });

    /* --- E015-04 : cibles tactiles ---------------------------------------- */
    garde(() => {
      data(root, 'touch', '1');
      qa(root, '.c3a-filter, .recit-trace summary, .recit-actions button').forEach((cible) => {
        marquer(cible, 'recit-v2-e015-cible');
      });
    });

    /* --- E015-05 : reflow à 200 % ----------------------------------------- */
    garde(() => {
      data(root, 'reflow', '1');
      const conf = q(root, '.recit-conf');
      if (present(conf)) marquer(conf, 'recit-v2-e015-reflow');
    });

    /* --- E015-06 : statut de filtrage atomique ---------------------------- */
    garde(() => {
      const statut = q(root, '#c3a-status');
      if (!present(statut)) return;
      marquer(statut, 'recit-v2-e015-status');
      attrSiAbsent(statut, 'aria-atomic', 'true');
      attrSiAbsent(statut, 'aria-relevant', 'text');
      data(statut, 'atomic', '1');
    });

    /* --- E015-07 : raccourcis du fil -------------------------------------- */
    garde(() => {
      qa(root, '.recit-thread-item').forEach((item) => {
        if (deja(item, 'recit-v2-e015-item')) return;
        marquer(item, 'recit-v2-e015-item');
        attrSiAbsent(item, 'aria-keyshortcuts', 'ArrowUp ArrowDown Home End Enter');
      });
    });

    /* --- E015-08 : raison des commandes désactivées ----------------------- */
    garde(() => {
      qa(root, '.recit-actions button[disabled]').forEach((bouton) => {
        if (deja(bouton, 'recit-v2-e015-raison')) return;
        marquer(bouton, 'recit-v2-e015-raison');
        attrSiAbsent(bouton, 'title', raisonDesactive(bouton.textContent));
      });
    });

    /* --- E015-09 : repère non coloré du point courant --------------------- */
    garde(() => {
      const courants = qa(root, '.recit-thread-item.is-current, .recit-thread-item[aria-current="step"]');
      courants.forEach((item) => data(item, 'current', '1'));
    });

    /* --- E015-10 : mouvement réduit --------------------------------------- */
    garde(() => {
      const reduit = (typeof ctx.reducedMotion === 'function') ? !!ctx.reducedMotion() : false;
      data(root, 'motion', reduit ? 'reduced' : 'normal');
    });
  } catch { /* rendu préservé coûte que coûte */ }
});
