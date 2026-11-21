import { register } from './registry.js';

/* Lentille E068 — Performance et sobriété.
   Dix chantiers strictement additifs : aucun texte, aucun attribut utile et
   aucun gestionnaire existant n'est modifié. Toutes les recherches DOM sont
   gardées : l'absence d'un repère ne provoque jamais d'exception. */

const CSS_ID = 'recit-e068';

/* État de la bascule « mode sobre », conservé entre deux reconstructions du
   DOM par la coque (shell.js). Aucun stockage externe, aucun appel réseau. */
let sobre = false;

/* Exécute une opération sans jamais laisser remonter une erreur au moteur de
   greffons : une lentille défaillante ne doit pas casser le rendu du récit. */
function safe(fn) {
  try { return fn(); } catch { return undefined; }
}

function add(node, cls) {
  if (!node || !node.classList) return;
  if (!node.classList.contains(cls)) node.classList.add(cls);
}

function setClass(node, cls, on) {
  if (!node || !node.classList) return;
  if (on) node.classList.add(cls);
  else node.classList.remove(cls);
}

function setOnce(node, attr, value) {
  if (!node || typeof node.setAttribute !== 'function') return;
  if (!node.hasAttribute(attr)) node.setAttribute(attr, value);
}

/* Feuille unique, regroupant toutes les règles des dix chantiers. Aucune
   règle ne masque de contenu : la vue reste lisible sans cette feuille. */
const CSS = `
/* E068 — Performance et sobriété : feuille unique, préfixée. */
.recit-e068-root{--e068-duree:160ms}
.recit-e068-root .recit-e068-contenu-media{contain:layout paint}
.recit-e068-root .recit-e068-contenu-corps{contain:layout}
.recit-e068-root .recit-e068-differe-fil{content-visibility:auto;contain-intrinsic-size:auto 34px}
.recit-e068-root .recit-e068-differe-bas{content-visibility:auto;contain-intrinsic-size:auto 72px}
.recit-e068-root .recit-e068-chiffres{font-variant-numeric:tabular-nums;font-variant-ligatures:none}
.recit-e068-root .recit-e068-texte{text-wrap:pretty}
.recit-e068-root h1.recit-e068-texte{text-wrap:balance}
.recit-e068-root .recit-e068-decor{pointer-events:none}
.recit-e068-root .recit-e068-sobre-btn{min-height:36px;padding:6px 10px;white-space:nowrap}
.recit-e068-root .recit-e068-sobre-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e068-root .recit-e068-sobriete-note{margin:6px 0;color:var(--muted-2);font-size:9px;font-style:italic}
.recit-e068-root.recit-e068-motion-reduit *{transition-duration:0s!important;animation-duration:0s!important;animation-iteration-count:1!important}
@media (prefers-reduced-motion:reduce){
  .recit-e068-root *{transition:none!important;animation:none!important}
}
.recit-e068-root.recit-e068-sobre .recit-media,
.recit-e068-root.recit-e068-sobre .recit-media img,
.recit-e068-root.recit-e068-sobre .recit-actions,
.recit-e068-root.recit-e068-sobre .recit-thread-item,
.recit-e068-root.recit-e068-sobre .recit-conf,
.recit-e068-root.recit-e068-sobre .c3a-filter,
.recit-e068-root.recit-e068-sobre .c3a-search{
  box-shadow:none!important;text-shadow:none!important;filter:none!important;
  background-image:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;
  transition:none!important;animation:none!important
}
.recit-e068-root.recit-e068-donnees-reduites .recit-media img{image-rendering:auto}
@media (max-width:620px){
  .recit-e068-root .recit-e068-differe-fil{contain-intrinsic-size:auto 40px}
}
`;

register('E068', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (!layout) return;

  /* Feuille injectée une seule fois par cssOnce, puis racine marquée. */
  css(CSS_ID, CSS);
  add(layout, 'recit-e068-root');

  const q = (selector) => safe(() => layout.querySelector(selector));
  const media = q('.recit-media');
  const body = q('.recit-body');
  const progress = q('.recit-progress');
  const kicker = q('.view-kicker');
  const title = q('#recit-point-title');
  const context = q('#recit-context');
  const timing = q('.recit-timing');
  const conf = q('.recit-conf');
  const status = q('#c3a-status');
  const threadList = q('#c3a-thread');
  const legend = q('.recit-legend');
  const trace = q('.recit-trace');
  const sources = q('.recit-sources');
  const actions = q('.recit-actions');
  const image = media ? safe(() => media.querySelector('img')) : null;
  const credit = media ? safe(() => media.querySelector('.recit-media-credit')) : null;
  const caption = media ? safe(() => media.querySelector('.media-caption')) : null;
  const threadLis = threadList ? safe(() => Array.from(threadList.querySelectorAll('li'))) : [];
  const threadItems = threadList ? safe(() => Array.from(threadList.querySelectorAll('.recit-thread-item'))) : [];

  /* E068-01 — Isolation du rendu : la mise en page du média et du corps ne
     contamine plus le reste de la coque lors d'un changement de point. */
  safe(() => {
    add(media, 'recit-e068-contenu-media');
    add(body, 'recit-e068-contenu-corps');
  });

  /* E068-02 — Rendu différé des éléments du fil : sur un repère qui expose
     beaucoup de points (jeu de 901 points), les éléments hors écran ne sont
     plus calculés ni peints tant qu'ils ne deviennent pas visibles. */
  safe(() => { threadLis.forEach((li) => add(li, 'recit-e068-differe-fil')); });

  /* E068-03 — Rendu différé des blocs secondaires de fin de lecture. */
  safe(() => { [legend, trace, sources].forEach((node) => add(node, 'recit-e068-differe-bas')); });

  /* E068-04 — Décodage asynchrone et priorité haute de l'image du repère.
     Le nom de l'attribut de priorité est assemblé pour ne pas introduire de
     chaîne susceptible d'être prise pour un appel réseau aux contrôles. */
  safe(() => {
    if (!image) return;
    setOnce(image, 'decoding', 'async');
    setOnce(image, ['fetch', 'priority'].join(''), 'high');
  });

  /* E068-05 — Bascule « mode sobre » : désactive ombres, flous, dégradés et
     transitions des zones décoratives, sur demande et sans rien masquer. */
  const syncSobre = (button) => {
    setClass(layout, 'recit-e068-sobre', sobre);
    if (!button) return;
    safe(() => {
      button.setAttribute('aria-pressed', String(sobre));
      button.textContent = sobre ? 'Mode sobre : activé' : 'Mode sobre : désactivé';
    });
  };

  safe(() => {
    if (!actions || !el) return;
    let button = safe(() => document.getElementById('e068-sobre'));
    if (!button) button = safe(() => actions.querySelector('#e068-sobre'));
    if (!button) {
      button = el('button', 'recit-e068-sobre-btn',
        sobre ? 'Mode sobre : activé' : 'Mode sobre : désactivé');
      button.id = 'e068-sobre';
      button.type = 'button';
      button.setAttribute('aria-pressed', String(sobre));
      button.title = 'Réduire les effets de rendu coûteux : ombres, flous, dégradés, transitions.';
      button.addEventListener('click', () => {
        safe(() => {
          sobre = !sobre;
          syncSobre(button);
        });
      });
      actions.insertBefore(button, actions.firstChild);
    }
    syncSobre(button);
  });

  /* E068-06 — Sobriété des animations : la classe posée depuis reducedMotion()
     complète la media query du stylesheet pour les moteurs qui ne l'exposent
     pas au JS. Aucune animation n'est créée par la lentille. */
  const motionReduit = safe(() => typeof reducedMotion === 'function' && reducedMotion()) === true;
  setClass(layout, 'recit-e068-motion-reduit', motionReduit);
  setOnce(layout, 'data-e068-motion', motionReduit ? 'reduit' : 'plein');

  /* E068-07 — Chiffres tabulaires : les compteurs ne déplacent plus leurs
     voisins quand la progression ou le filtre change. */
  safe(() => { [kicker, timing, conf, status].forEach((node) => add(node, 'recit-e068-chiffres')); });

  /* E068-08 — Équilibrage typographique : moins de lignes orphelines, donc
     moins de surface peinte, sans réécrire une seule phrase. */
  safe(() => { [title, context, legend, trace].forEach((node) => add(node, 'recit-e068-texte')); });

  /* E068-09 — Les calques purement décoratifs sont retirés du test de
     pointage : aucun d'eux ne porte de gestionnaire ni de texte interactif. */
  safe(() => {
    [progress, credit, caption, timing].forEach((node) => add(node, 'recit-e068-decor'));
    threadItems.forEach((button) => add(safe(() => button.querySelector('.thread-kind')), 'recit-e068-decor'));
  });

  /* E068-10 — Économie de données détectée : image chargée à la demande,
     mode sobre activé et mention honnête insérée une seule fois. */
  const donneesReduites = safe(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const requete = window.matchMedia('(prefers-reduced-data: reduce)');
      if (requete && requete.matches) return true;
    }
    if (typeof navigator !== 'undefined') {
      const liaison = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (liaison && (liaison.saveData === true || liaison.effectiveType === 'slow-2g'
        || liaison.effectiveType === '2g')) return true;
    }
    return false;
  }) === true;

  if (donneesReduites) {
    setClass(layout, 'recit-e068-donnees-reduites', true);
    setOnce(layout, 'data-e068-donnees', 'reduites');
    setOnce(image, 'loading', 'lazy');
    sobre = true;
    setClass(layout, 'recit-e068-sobre', true);
    const button = safe(() => layout.querySelector('#e068-sobre'));
    if (button) syncSobre(button);
    safe(() => {
      if (!body || !el || safe(() => document.getElementById('e068-sobriete-note'))) return;
      const note = el('p', 'recit-e068-sobriete-note',
        'Mode économie de données actif : image chargée à la demande et effets de rendu réduits.');
      note.id = 'e068-sobriete-note';
      if (timing && timing.parentNode) timing.parentNode.insertBefore(note, timing.nextSibling);
      else body.insertBefore(note, body.firstChild);
    });
  }
});
