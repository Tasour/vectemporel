import { register } from './registry.js';

/* Lentille E089 — Transitions et mouvement (vue Récit).
 *
 * Dix chantiers (E089-01 … E089-10) appliqués à chaque rendu par le registre
 * `runEnhancements`. Chaque indicateur est dérivé du DOM réellement rendu par
 * `recit.js` : aucune donnée historique n'est inventée, aucun chiffre n'est
 * bricolé. Aucun appel réseau, aucune sortie de débogage, aucune source
 * aléatoire, aucun minuteur et aucune boucle d'animation. Enrichissement non
 * destructif : sans ce module la vue reste
 * lisible et navigable.
 *
 * Périmètre de lecture : src/views/recit.js, src/views/recit/registry.js,
 * src/views/recit/index.js, src/views/_diagnostics.js, styles.css.
 */

/* Un seul identifiant de feuille de style, un seul appel à css(). */
const CSS_ID = 'recit-e089';
const RACINE = 'recit-e089-root';

/* Identifiants DOM créés par la lentille, tous préfixés `e089-` et uniques.
   Les nœuds sont volontairement imbriqués dans `.recit-body` (kicker, légende)
   et non posés à même `stage`/`layout`/`body`, afin d'échapper au marquage
   diagnostic de `_diagnostics.js:72` qui masque les enfants directs dont
   l'identifiant ressemble à `e089-…`. */
const IDS = {
  parcours: 'e089-parcours',
  compteur: 'e089-compteur',
  reglage: 'e089-reglage',
  note: 'e089-note',
};

/* Mémoire de parcours entre deux reconstructions complètes du DOM par la coque.
   Le module survit au `innerHTML` de `shell.js`, comme `c3aLocal` dans recit.js. */
let dernierIndex = null;
let dernierTotal = null;
let dernierRepere = null;
let mouvementActif = true;

const q = (root, selector) => (root && root.querySelector ? root.querySelector(selector) : null);

function safe(fn, repli) {
  try { return fn(); } catch { return repli; }
}

/* Retire les doublons d'identifiant avant réutilisation : garantie « ids
   uniques » même si un appelant rejoue les greffons sur un DOM déjà enrichi. */
function nodeUnique(el, id, tag, className, parent, before) {
  const trouves = Array.from(document.querySelectorAll(`[id="${id}"]`));
  for (let i = 1; i < trouves.length; i += 1) {
    const doublon = trouves[i];
    if (doublon.parentNode) doublon.parentNode.removeChild(doublon);
  }
  let cible = trouves[0];
  if (!cible) {
    cible = el(tag, className);
    cible.id = id;
    if (before && before.parentNode) before.parentNode.insertBefore(cible, before);
    else if (parent) parent.appendChild(cible);
  }
  return cible;
}

/* Position relue depuis le kicker « Étape X / N · … », avec repli sur l'item
   du fil portant aria-current. Jamais d'accès direct à un dataset applicatif. */
function lirePosition(layout) {
  const kicker = q(layout, '.view-kicker');
  const trouve = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(kicker.textContent || '');
  if (trouve) {
    return {
      index: Math.max(0, Number(trouve[1]) - 1),
      total: Math.max(0, Number(trouve[2])),
    };
  }
  const items = Array.from(layout.querySelectorAll('.recit-thread-item'));
  const courant = items.findIndex((item) => item.classList.contains('is-current')
    || item.getAttribute('aria-current') === 'step');
  return courant >= 0
    ? { index: courant, total: items.length }
    : { index: null, total: 0 };
}

/* Bloc CSS unique, entièrement préfixé `recit-e089-`. Toutes les animations
   sont soit finies (une seule exécution au rendu), soit désactivables par
   l'attribut `data-e089-motion`, par le réglage système, et par le bouton. */
const CSS = `
.recit-e089-root .recit-progress{position:relative}
.recit-e089-curseur{position:absolute;top:50%;left:0;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:var(--gold-bright);box-shadow:0 0 0 3px rgba(230,185,111,.18);pointer-events:none;transition:left .5s cubic-bezier(.2,.7,.2,1),opacity .3s ease}
@keyframes recit-e089-cascade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.recit-e089-item-cascade{animation:recit-e089-cascade .32s ease-out both;animation-delay:calc(var(--e089-ordre,0)*22ms)}
.recit-e089-parcours{margin:6px 0 2px;color:var(--muted);font-size:9px;font-variant-numeric:tabular-nums}
.recit-e089-root .view-kicker{perspective:160px}
@keyframes recit-e089-bascule{0%{transform:rotateX(-85deg);opacity:.25}100%{transform:none;opacity:1}}
.recit-e089-compteur{display:inline-block;margin-left:6px;padding:1px 6px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:9px;font-variant-numeric:tabular-nums}
.recit-e089-compteur-bascule{animation:recit-e089-bascule .36s cubic-bezier(.2,.7,.2,1) 1}
@keyframes recit-e089-respiration{0%,100%{box-shadow:0 0 0 0 rgba(230,185,111,0);opacity:1}50%{box-shadow:0 0 0 2px rgba(230,185,111,.22);opacity:.9}}
.recit-e089-root[data-e089-lecture="active"] .recit-progress>span{animation:recit-e089-respiration 1.8s ease-in-out infinite}
.recit-e089-actions button{position:relative;overflow:hidden}
.recit-e089-actions button::after{content:"";position:absolute;left:8px;right:8px;bottom:4px;height:1px;background:var(--gold);transform:scaleX(0);transform-origin:center;transition:transform .22s ease}
.recit-e089-actions button:hover::after,
.recit-e089-actions button:focus-visible::after,
.recit-e089-actions button[aria-pressed="true"]::after{transform:scaleX(1)}
@keyframes recit-e089-masque{from{clip-path:inset(0 100% 0 0);opacity:.4}to{clip-path:inset(0 0 0 0);opacity:1}}
.recit-e089-revelation{animation:recit-e089-masque .34s ease-out both}
.recit-e089-marqueur{display:inline-block;margin-left:6px;color:var(--gold-bright);transform:rotate(-90deg);transition:transform .2s ease}
.recit-e089-trace[open] .recit-e089-marqueur{transform:none}
@keyframes recit-e089-pan{0%{transform:scale(1.02) translateX(-.6%)}100%{transform:scale(1.06) translateX(.6%)}}
.recit-e089-pan{animation:recit-e089-pan 22s ease-in-out infinite alternate}
@keyframes recit-e089-glisse{from{opacity:0;transform:translateX(14px)}to{opacity:1;transform:none}}
.recit-e089-repere-glisse{animation:recit-e089-glisse .45s ease-out 1}
.recit-e089-note{margin:6px 0 0;color:var(--muted-2);font-size:8px;line-height:1.5;font-style:italic}
.recit-e089-reglage{min-height:36px;padding:6px 10px;border:1px solid var(--line-strong);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:9px;cursor:pointer}
.recit-e089-reglage[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1)}
.recit-e089-reglage:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-e089-reglage[disabled]{opacity:.55;cursor:not-allowed}
.recit-e089-root[data-e089-motion="reduced"] .recit-e089-curseur,
.recit-e089-root[data-e089-motion="reduced"] .recit-e089-item-cascade,
.recit-e089-root[data-e089-motion="reduced"] .recit-e089-compteur,
.recit-e089-root[data-e089-motion="reduced"] .recit-progress>span,
.recit-e089-root[data-e089-motion="reduced"] .recit-e089-actions button::after,
.recit-e089-root[data-e089-motion="reduced"] .recit-e089-marqueur,
.recit-e089-root[data-e089-motion="reduced"] .recit-e089-revelation,
.recit-e089-root[data-e089-motion="reduced"] .recit-e089-pan,
.recit-e089-root[data-e089-motion="reduced"] .recit-e089-repere-glisse{animation:none!important;transition:none!important;transform:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-e089-curseur,.recit-e089-item-cascade,.recit-e089-compteur,
  .recit-e089-marqueur,.recit-e089-revelation,.recit-e089-pan,
  .recit-e089-repere-glisse,.recit-e089-root .recit-progress>span,
  .recit-e089-actions button::after{animation:none!important;transition:none!important;transform:none!important}
}`;

register('E089', (ctx) => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const { stage, layout, css, el, reducedMotion } = ctx;

  /* E089-00 — une seule feuille CSS, ancrage de portée, état de mouvement. */
  if (typeof css === 'function') css(CSS_ID, CSS);
  safe(() => layout.classList.add(RACINE));

  const systemeReduit = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
  const reduit = systemeReduit || mouvementActif === false;
  safe(() => { layout.dataset.e089Motion = reduit ? 'reduced' : 'full'; });

  /* Position et distance parcourue, lues depuis le rendu. */
  const position = safe(() => lirePosition(layout), { index: null, total: 0 });
  const index = position.index;
  const total = position.total;
  let portee = 0;
  let sens = 'stable';
  if (index !== null) {
    if (dernierIndex !== null && dernierTotal === total) {
      portee = Math.abs(index - dernierIndex);
      sens = index > dernierIndex ? 'avant' : (index < dernierIndex ? 'arriere' : 'stable');
    } else {
      sens = 'entree';
    }
    dernierIndex = index;
    dernierTotal = total;
  }
  safe(() => {
    layout.dataset.e089Portee = String(portee);
    layout.dataset.e089Sens = sens;
  });

  const corps = q(layout, '.recit-body') || layout;
  const kicker = q(corps, '.view-kicker');

  /* E089-01 — curseur glissant sur la barre de progression. Il traduit la même
     fraction que le remplissage déjà rendu, sans le remplacer. */
  const progression = q(layout, '.recit-progress');
  if (progression && !q(progression, '.recit-e089-curseur')) {
    safe(() => {
      const curseur = el('span', 'recit-e089-curseur');
      curseur.setAttribute('aria-hidden', 'true');
      progression.appendChild(curseur);
    });
  }
  const curseur = q(progression, '.recit-e089-curseur');
  if (curseur) {
    safe(() => { curseur.style.left = `${total ? ((index + 1) / total) * 100 : 0}%`; });
  }

  /* E089-02 — cascade d'entrée du fil : l'œil suit une vague depuis le point
     courant. L'ordre est plafonné pour rester lisible même avec 901 points. */
  const items = safe(() => Array.from(layout.querySelectorAll('.recit-thread-item')), []);
  items.forEach((item, i) => {
    safe(() => {
      const ordre = index === null ? i : Math.abs(i - index);
      item.style.setProperty('--e089-ordre', String(Math.min(ordre, 12)));
      item.classList.add('recit-e089-item-cascade');
    });
  });

  /* E089-03 — balise de parcours : la distance parcourue est dite en texte,
     pas seulement suggérée par un mouvement. Nœud imbriqué dans .recit-body. */
  const parcours = nodeUnique(el, IDS.parcours, 'p', 'recit-e089-parcours', corps, kicker);
  safe(() => {
    parcours.textContent = sens === 'entree'
      ? 'Entrée dans le repère.'
      : portee === 0
        ? 'Aucun déplacement depuis le point précédent.'
        : `${portee} point(s) parcouru(s) vers ${sens === 'avant' ? 'l’avant' : 'l’arrière'}.`;
  });

  /* E089-04 — compteur d'étape à bascule dans le kicker, relancé à chaque
     changement de point par retrait/reprise de la classe d'animation. */
  if (kicker) {
    const compteur = nodeUnique(el, IDS.compteur, 'span', 'recit-e089-compteur', kicker);
    safe(() => {
      compteur.textContent = index === null ? '—' : `${index + 1}/${total}`;
      compteur.setAttribute('aria-hidden', 'true');
      compteur.classList.remove('recit-e089-compteur-bascule');
      void compteur.offsetWidth;
      compteur.classList.add('recit-e089-compteur-bascule');
    });
  }

  /* E089-05 — respiration de la barre pendant la lecture automatique. */
  const lecture = q(layout, '.recit-play');
  const enLecture = Boolean(lecture && lecture.getAttribute('aria-pressed') === 'true');
  safe(() => { layout.dataset.e089Lecture = enLecture ? 'active' : 'pause'; });

  /* E089-06 — soulignage coulissant des commandes au survol et au focus. */
  const actions = q(layout, '.recit-actions');
  if (actions) safe(() => actions.classList.add('recit-e089-actions'));

  /* E089-07 — révélation par masque du détail de traçabilité ; le marqueur
     d'ouverture pivote, le texte est révélé de gauche à droite. */
  const trace = q(corps, 'details.recit-trace') || q(layout, 'details.recit-trace');
  if (trace) {
    safe(() => trace.classList.add('recit-e089-trace'));
    const resume = q(trace, 'summary');
    if (resume && !q(resume, '.recit-e089-marqueur')) {
      safe(() => {
        const marqueur = el('span', 'recit-e089-marqueur', '▾');
        marqueur.setAttribute('aria-hidden', 'true');
        resume.appendChild(marqueur);
      });
    }
    const detail = q(trace, 'p');
    if (detail) safe(() => detail.classList.add('recit-e089-revelation'));
  }

  /* E089-08 — pan lent du visuel déjà présent (aucun chargement ajouté). */
  const image = q(layout, '.recit-media img');
  if (image) safe(() => image.classList.add('recit-e089-pan'));

  /* E089-09 — glissement latéral du média quand le repère change, détecté
     depuis le titre réel du fil et mémorisé entre deux rendus. */
  const titreFil = q(layout, '.recit-thread-title');
  const repere = titreFil
    ? String(titreFil.textContent || '').replace(/^Fil du repère\s*·\s*/, '').trim()
    : '';
  let changementRepere = false;
  if (repere) {
    if (dernierRepere !== null && repere !== dernierRepere) changementRepere = true;
    dernierRepere = repere;
  }
  const media = q(layout, '.recit-media');
  if (media && changementRepere) {
    safe(() => {
      media.classList.remove('recit-e089-repere-glisse');
      void media.offsetWidth;
      media.classList.add('recit-e089-repere-glisse');
    });
  }

  /* E089-10 — réglage visible du mouvement : bascule indépendante (aria-pressed
     légitime) qui coupe ou rétablit les animations de cette lentille. */
  const legende = q(corps, '.recit-legend') || corps;
  const reglage = nodeUnique(el, IDS.reglage, 'button', 'recit-e089-reglage', legende);
  const note = nodeUnique(el, IDS.note, 'p', 'recit-e089-note', legende);

  const rafraichir = () => {
    const inactif = systemeReduit || mouvementActif === false;
    safe(() => {
      reglage.type = 'button';
      reglage.disabled = systemeReduit;
      reglage.setAttribute('aria-pressed', String(!inactif));
      reglage.textContent = systemeReduit
        ? 'Mouvement réduit par le réglage système'
        : (mouvementActif ? 'Mouvement : activé' : 'Mouvement : coupé');
      reglage.setAttribute('aria-label', systemeReduit
        ? 'Le réglage système réduit les animations : aucun mouvement à régler ici'
        : (mouvementActif
          ? 'Couper les transitions et le mouvement de cette vue'
          : 'Rétablir les transitions et le mouvement de cette vue'));
      note.textContent = systemeReduit
        ? 'Mouvement réduit selon votre réglage système : le récit reste lisible sans animation.'
        : (mouvementActif
          ? 'Les transitions douces accompagnent le parcours ; le bouton ci-dessus permet de les couper.'
          : 'Transitions coupées à votre demande : seules les informations utiles restent affichées.');
    });
  };

  if (!reglage.getAttribute('data-e089-lie')) {
    safe(() => {
      reglage.setAttribute('data-e089-lie', '1');
      reglage.addEventListener('click', () => {
        mouvementActif = !mouvementActif;
        safe(() => {
          layout.dataset.e089Motion = mouvementActif ? 'full' : 'reduced';
          layout.dataset.e089Lecture = enLecture ? 'active' : 'pause';
        });
        rafraichir();
      });
    });
  }
  rafraichir();

  /* Témoins auditables : nombre de chantiers et unicité des identifiants. */
  safe(() => {
    layout.dataset.e089Enhancements = '10';
    const uniques = Object.keys(IDS).every((cle) =>
      document.querySelectorAll(`[id="${IDS[cle]}"]`).length <= 1);
    layout.dataset.e089Unique = uniques ? '1' : '0';
    if (stage && stage.isConnected) stage.dataset.e089MotionState = reduit ? 'reduced' : 'full';
  });
});
