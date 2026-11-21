import { register } from './registry.js';

/* V2 lentille E098 — Performance et sobriété (second regard).
 *
 * La passe 1 d'E098 isolait le corps, réservait la gouttière, coupait le
 * scroll chaining, stabilisait la typographie, différéait la peinture du fil
 * long, neutralisait les animations, bridait les couches GPU et consignait un
 * budget dans un attribut masqué. Cette passe V2 ne reprend AUCUN de ces
 * chantiers : elle vise la STABILITÉ DIMENSIONNELLE et le COÛT
 * D'INTERACTION — décodage asynchrone de l'image, confinement de peinture du
 * média, touch-action sur les contrôles, isolation de la barre de progression,
 * calques décoratifs hors hit-testing, confinement de la légende, miroir de
 * sobriété VISIBLE (chiffres dérivés du DOM), sobriété d'impression, lectures
 * groupées avant écritures et structure à feuille unique.
 *
 * Une seule feuille `css('recit-v2-e098', …)`, un seul marqueur
 * `data-v2-e098-passe` (distinct du `data-e098-passe` de la passe 1), un seul
 * id d'élément `v2-e098-sobriete` (préfixé, donc sans collision avec la passe 1
 * ni avec les 99 autres lentilles). Aucun écouteur, timer, observateur, rAF,
 * aléa, réseau ni journalisation. Aucun attribut existant n'est écrasé.
 *
 * Les dix chantiers E098-01 … E098-10 sont détaillés dans
 * UNIFIED_AUDIT/RECIT/V2/views/E098.md.
 */

const PASSE = 'data-v2-e098-passe';
const MIRROIR_ID = 'v2-e098-sobriete';
const CLASSE_MEDIA = 'recit-v2-e098-media';
const CLASSE_PROGRESSION = 'recit-v2-e098-progress';
const CLASSE_LEGENDE = 'recit-v2-e098-legend';
const CLASSE_MIRROIR = 'recit-v2-e098-sobriete';

/* Feuille unique. Aucun sélecteur universel, aucune couche GPU imposée, aucun
   `!important`. Aucune information n'est portée par la seule couleur. */
const CSS = `
/* E098-01 — décodage asynchrone : aucun style dédié (attribut posé en JS). */

/* E098-02 — confinement de peinture du panneau média : les calques absolus ne
   débordent pas du cadre et n'invalident pas le reste de la vue. */
.recit-layout .recit-media.recit-v2-e098-media{
  contain:paint;
}

/* E098-03 — touch-action manipulation : suppression du délai tactile de
   300 ms sur les contrôles, sans toucher au défilement du corps. */
.recit-layout .recit-actions button,
.recit-layout .recit-thread-item,
.recit-layout .c3a-filter,
.recit-layout .c3a-reset{
  touch-action:manipulation;
}

/* E098-04 — isolation de la barre de progression : le remplissage en largeur
   ne relance pas la mise en page du bloc de lecture. */
.recit-layout .recit-progress.recit-v2-e098-progress{
  contain:layout paint;
}

/* E098-05 — calques décoratifs hors hit-testing : crédit et légende d'image
   ne captent plus les pointeurs, sans quitter le DOM ni le texte. */
.recit-layout .recit-media-credit,
.recit-layout .media-caption{
  pointer-events:none;
}

/* E098-06 — confinement de la légende longue : son style et sa mise en page
   restent locaux quand le point change. */
.recit-layout .recit-legend.recit-v2-e098-legend{
  contain:layout style;
}

/* E098-07 — miroir de sobriété visible : texte lisible, chiffres dérivés du
   DOM réel, jamais de couleur seule pour porter une information. */
.recit-layout .recit-body .recit-v2-e098-sobriete{
  margin:8px 0 0;
  color:var(--muted-2,#8a8a8a);
  font-size:9px;
  line-height:1.5;
  font-variant-numeric:tabular-nums;
}

/* E098-08 — sobriété d'impression : le décoratif disparaît, le miroir reste
   un texte imprimable. */
@media print{
  .recit-layout .recit-media-credit,
  .recit-layout .media-caption{
    display:none;
  }
  .recit-layout .recit-v2-e098-sobriete{
    color:#333;
    font-size:8pt;
  }
}

/* E098-09 — lectures groupées avant écritures : aucun style dédié (séquence
   gérée en JS pour éviter le layout thrashing). */

/* E098-10 — structure sobre : une seule feuille, un seul miroir, ids
   préfixés v2-e098- ; aucune règle supplémentaire. */
`;

/* Vrai nœud d'élément (nodeType 1) : écarte textes et commentaires. */
function present(node) {
  return !!(node && node.nodeType === 1);
}

/* Sélecteur sûr : jamais appelé sur un hôte dépourvu de querySelector. */
function q(root, selector) {
  return present(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector)
    : null;
}

/* Liste sûre, ramenée à un tableau pour .length et .forEach. */
function qa(root, selector) {
  return present(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector))
    : [];
}

/* Ajout de classe sous garde : n'écrase rien, reste idempotent. */
function ajouteClasse(node, name) {
  if (!present(node) || !node.classList
      || typeof node.classList.add !== 'function'
      || typeof node.classList.contains !== 'function') return;
  if (!node.classList.contains(name)) node.classList.add(name);
}

/* Écriture d'attribut sous garde : n'écrase JAMAIS un attribut existant. */
function attributSiAbsent(node, name, value) {
  if (!present(node) || typeof node.hasAttribute !== 'function'
      || typeof node.setAttribute !== 'function') return;
  if (node.hasAttribute(name)) return;
  try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
}

/* E098-01 — décodage asynchrone de l'image du média. L'attribut n'est posé
   que s'il est absent : un `decoding` déjà porté par la coque est préservé. */
function decodageAsync(root) {
  const img = q(root, '.recit-media img');
  if (!present(img) || typeof img.hasAttribute !== 'function') return 0;
  if (img.hasAttribute('decoding')) return 0;
  attributSiAbsent(img, 'decoding', 'async');
  return 1;
}

/* E098-07 — miroir de sobriété. Tout chiffre est dérivé du DOM réel :
   mots = textContent des blocs de texte visibles, calques = nombre de nœuds
   décoratifs, image = présence d'un <img> dans le média. */
function miroir(root, el) {
  if (typeof el !== 'function') return null;
  const deja = q(root, `#${MIRROIR_ID}`);
  if (present(deja)) return deja; /* réutilisation du nœud déjà inséré. */

  /* E098-09 — toutes les lectures d'abord, une seule écriture ensuite. */
  const textNodes = qa(root,
    '.recit-title, .recit-context, .recit-meta, .recit-timing, .recit-legend');
  const mots = textNodes.reduce((total, node) => {
    const chaine = String((node && node.textContent) || '').trim();
    return total + (chaine ? chaine.split(/\s+/).filter(Boolean).length : 0);
  }, 0);
  const calques = qa(root,
    '.recit-media-credit, .media-caption, .media-empty').length;
  const image = q(root, '.recit-media img') ? 1 : 0;

  const node = el('p', CLASSE_MIRROIR,
    `Empreinte du repère : ${mots} mot(s) de texte · ${calques} calque(s) décoratif(s) · image ${image ? 'présente' : 'absente'}.`);
  if (!present(node)) return null;
  node.id = MIRROIR_ID;

  /* Greffe dans .recit-body : parent stable, texte visible et indexable. */
  const body = q(root, '.recit-body');
  if (!present(body) || typeof body.appendChild !== 'function') return null;
  body.appendChild(node);
  return node;
}

register('E098', (ctx) => {
  try {
    if (!ctx) return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    void stage; /* Le miroir est greffé dans .recit-body, pas dans stage. */
    void reducedMotion; /* Aucune animation JS : la sobriété est statique. */
    if (!present(layout) || typeof layout.querySelector !== 'function') return;

    /* E098-10 — une seule feuille, injectée une seule fois par cssOnce. */
    if (typeof css === 'function') {
      try { css('recit-v2-e098', CSS); } catch { /* rendu préservé coûte que coûte */ }
    }

    /* Garde d'idempotence préfixée : une seule passe par rendu, sans effet
       accumulé quand runEnhancements repasse sur le même DOM. */
    if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(PASSE)) return;
    try { layout.setAttribute(PASSE, '1'); } catch { /* marqueur facultatif */ }

    /* E098-01 — décodage asynchrone sous garde d'absence. */
    decodageAsync(layout);

    /* E098-02 / E098-04 / E098-06 — classes préfixées posées sous garde. */
    ajouteClasse(q(layout, '.recit-media'), CLASSE_MEDIA);
    ajouteClasse(q(layout, '.recit-progress'), CLASSE_PROGRESSION);
    ajouteClasse(q(layout, '.recit-legend'), CLASSE_LEGENDE);

    /* E098-07 — miroir visible, chiffres dérivés du DOM réel. */
    miroir(layout, el);

    /* E098-03 / E098-05 / E098-08 / E098-09 / E098-10 — portés par la feuille
       unique et par la séquence de lectures/écritures ci-dessus. */
  } catch { /* une lentille défaillante ne doit jamais casser le rendu. */ }
});
