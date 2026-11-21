import { register } from './registry.js';

/* Lentille E076 — Mobile et reflow responsive (vue Récit).
   Dix chantiers indépendants et distincts (E076-01 … E076-10), tous non
   destructifs : ils ajoutent des classes, un style et quelques repères
   d'interface, sans retirer ni réécrire le contenu du récit. Sans ce module,
   la vue reste intégralement lisible et navigable.

   Un seul enregistrement, une seule feuille css ('recit-e076'), toutes les
   classes préfixées recit-e076-, tous les ids préfixés e076- et uniques.
   Zéro réseau, zéro sortie de débogage, zéro aléa. */

const CSS = `
/* E076-01 — Champ de recherche à 16 px : sous iOS, un champ plus petit
   déclenche un zoom automatique à la saisie. La sélectivité l'emporte sur la
   règle générique des outils afin de garder le focus utilisable. */
@media (max-width:620px){
  .recit-e076.recit-layout .recit-e076-recherche{font-size:16px}
}

/* E076-02 — Neutralisation de l'inflation de texte des navigateurs mobiles
   qui agrandissent les colonnes étroites et provoquent des reflows en cascade. */
.recit-e076.recit-layout{-webkit-text-size-adjust:100%;text-size-adjust:100%}

/* E076-03 — Réactivité tactile : pas de délai de 300 ms ni de double-tap zoom
   sur les commandes, et pas de halo bleu au toucher. Le champ de recherche est
   exclu pour préserver la sélection de texte. */
.recit-e076 button,
.recit-e076 .recit-thread-item,
.recit-e076 summary,
.recit-e076 .recit-e076-top{-webkit-tap-highlight-color:transparent;touch-action:manipulation}

/* E076-04 — Le corps a son propre défilement : on confine le scroll pour ne
   pas le chaîner à la page ni déclencher le « pull to refresh » sur mobile. */
.recit-e076 .recit-body{overscroll-behavior:contain;-webkit-overflow-scrolling:touch}

/* E076-05 — Marge d'ancrage : quand le navigateur amène un élément focalisé
   dans la vue, il tient compte de la barre d'actions ancrée en bas. */
.recit-e076 .recit-body{scroll-padding-block:16px 76px}
@media (max-width:620px){.recit-e076 .recit-body{scroll-padding-bottom:88px}}

/* E076-06 — Badge de mode de présentation, repère visible de la largeur
   active. Simple texte d'interface : aucune donnée historique ajoutée. */
.recit-e076 .recit-e076-mode{margin:2px 0 6px;padding:2px 8px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E076-07 — Retour en haut du récit : bouton collant, masqué tant que le corps
   n'a pas été défilé, donc absent de l'ordre de tabulation au repos. */
.recit-e076 .recit-e076-top{display:none;position:sticky;bottom:96px;z-index:5;margin:8px 0 0 auto;padding:0 12px;min-height:36px;border:1px solid var(--gold);border-radius:999px;background:rgba(8,11,18,.94);color:var(--gold-bright);font-size:10px;cursor:pointer}
.recit-e076.recit-e076-scrolled .recit-e076-top{display:block}
.recit-e076 .recit-e076-top:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}

/* E076-08 — Fil en mosaïque adaptative : le nombre de colonnes suit la
   largeur réelle, sans débordement ni bandeau défilant obligatoire. */
.recit-e076 .recit-e076-thread-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,176px),1fr));gap:6px;align-items:stretch}
.recit-e076 .recit-e076-thread-list>li{display:flex;min-width:0}
.recit-e076 .recit-e076-thread-list .recit-thread-item{width:100%;height:100%;min-height:36px;white-space:normal;overflow-wrap:anywhere;text-align:left}

/* E076-09 — Jauge de lecture interne : distingue la position dans le point
   (défilement du corps) de la position dans le repère (.recit-progress). */
.recit-e076 .recit-e076-jauge{height:2px;width:100%;margin:0 0 6px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
.recit-e076 .recit-e076-jauge>span{display:block;height:100%;width:0;background:var(--gold);transition:width .12s linear}
.recit-e076.recit-e076-reduit .recit-e076-jauge>span{transition:none}
@media (prefers-reduced-motion:reduce){.recit-e076 .recit-e076-jauge>span{transition:none}}

/* E076-10 — Clavier virtuel : le visualViewport réel, quand il se réduit,
   comprime la bande image pour préserver la hauteur de lecture. */
.recit-e076.recit-e076-clavier .recit-media{min-height:0;max-height:9vh}
@media (max-width:620px){.recit-e076.recit-e076-clavier .recit-e076-top{bottom:84px}}
`;

/* Les deux écouteurs globaux sont installés une seule fois par session ; les
   fonctions ciblent les nœuds courants, reconstruits à chaque rendu. */
let ecouteModeInstallee = false;
let ecouteClavierInstallee = false;

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function surMedia(mediaQuery, ecoute) {
  if (!mediaQuery) return;
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', ecoute);
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(ecoute);
  }
}

/* E076-06 — libellé dérivé des media queries réelles, jamais d'une valeur
   supposée ; repli explicite si matchMedia est indisponible. */
function libelleMode() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'Affichage : mode non déterminé';
  }
  try {
    if (window.matchMedia('(max-width:620px)').matches) {
      return 'Affichage compact · une colonne (≤ 620 px)';
    }
    if (window.matchMedia('(max-width:1000px)').matches) {
      return 'Affichage intermédiaire · une colonne (≤ 1000 px)';
    }
    return 'Affichage étendu · deux colonnes (> 1000 px)';
  } catch {
    return 'Affichage : mode non déterminé';
  }
}

function metAJourMode() {
  if (typeof document === 'undefined') return;
  const libelle = libelleMode();
  Array.prototype.forEach.call(document.querySelectorAll('#e076-mode'), (noeud) => {
    noeud.textContent = libelle;
  });
}

function installeMode() {
  if (ecouteModeInstallee || typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  ecouteModeInstallee = true;
  try {
    [window.matchMedia('(max-width:620px)'), window.matchMedia('(max-width:1000px)')]
      .forEach((requete) => surMedia(requete, metAJourMode));
  } catch {
    /* Le libellé reste recalculé à chaque rendu : repli sans erreur. */
  }
}

/* E076-10 — seuil de 72 % : en dessous, la hauteur visible est celle d'un
   clavier ouvert ; au-dessus, on revient à la mise en page normale. */
function metAJourClavier() {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  let ouvert = false;
  try {
    const vv = window.visualViewport;
    if (vv && typeof vv.height === 'number' && window.innerHeight > 0) {
      ouvert = vv.height < window.innerHeight * 0.72;
    }
  } catch {
    ouvert = false;
  }
  Array.prototype.forEach.call(document.querySelectorAll('.recit-e076'), (noeud) => {
    if (noeud && noeud.classList) noeud.classList.toggle('recit-e076-clavier', ouvert);
  });
}

function installeClavier() {
  if (ecouteClavierInstallee || typeof window === 'undefined') return;
  const vv = window.visualViewport;
  if (!vv || typeof vv.addEventListener !== 'function') return;
  ecouteClavierInstallee = true;
  vv.addEventListener('resize', metAJourClavier, { passive: true });
}

/* E076-07 et E076-09 partagent un seul écouteur passif : une lecture de
   scrollTop alimente la jauge et l'état du bouton, sans boucle rAF. */
function metAJourDefilement(corps, layout, jauge, bouton) {
  if (!corps || typeof corps.scrollTop !== 'number') return;
  const hauteur = Math.max(0, (corps.scrollHeight || 0) - (corps.clientHeight || 0));
  const taux = hauteur > 0
    ? Math.min(100, Math.max(0, Math.round((corps.scrollTop / hauteur) * 100)))
    : 100;
  if (jauge && jauge.firstElementChild) {
    jauge.firstElementChild.style.width = `${taux}%`;
    jauge.setAttribute('aria-valuenow', String(taux));
  }
  if (layout && layout.classList) {
    layout.classList.toggle('recit-e076-scrolled', corps.scrollTop > 200);
  }
  if (bouton && bouton.setAttribute) {
    bouton.setAttribute('title', `Progression de ce point : ${taux} %`);
  }
}

register('E076', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined') return;
    const racine = layout && typeof layout.querySelector === 'function'
      ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!racine) return;

    css('recit-e076', CSS); /* un seul appel, toutes les règles du module. */

    const reduit = typeof reducedMotion === 'function' && reducedMotion();
    const corps = racine.querySelector('.recit-body');
    const progression = racine.querySelector('.recit-progress');
    const recherche = racine.querySelector('#c3a-search') || racine.querySelector('.c3a-search');
    const listeFil = racine.querySelector('.recit-thread-list') || racine.querySelector('#c3a-thread');

    ajouteClasse(racine, 'recit-e076');
    if (reduit) ajouteClasse(racine, 'recit-e076-reduit');

    /* E076-01 — taille de champ anti-zoom. */
    ajouteClasse(recherche, 'recit-e076-recherche');

    /* E076-06 — badge de mode, inséré après la barre de progression. */
    let badge = document.getElementById('e076-mode');
    if (!badge || badge.parentElement !== (progression ? progression.parentNode : corps)) {
      badge = el('p', 'recit-e076-mode');
      badge.id = 'e076-mode';
    }
    if (!badge.parentNode) {
      if (progression && progression.parentNode) {
        progression.parentNode.insertBefore(badge, progression.nextSibling);
      } else if (corps) {
        corps.appendChild(badge);
      }
    }
    metAJourMode();
    installeMode();

    /* E076-09 — jauge de lecture dans le corps. */
    let jauge = document.getElementById('e076-jauge');
    if (!jauge || (corps && jauge.parentElement !== corps)) {
      jauge = el('div', 'recit-e076-jauge');
      jauge.id = 'e076-jauge';
      jauge.setAttribute('role', 'progressbar');
      jauge.setAttribute('aria-label', 'Progression de la lecture dans ce point');
      jauge.setAttribute('aria-valuemin', '0');
      jauge.setAttribute('aria-valuemax', '100');
      jauge.setAttribute('aria-valuenow', '0');
      jauge.appendChild(el('span'));
    }
    if (!jauge.parentNode) {
      if (badge && badge.parentNode) badge.parentNode.insertBefore(jauge, badge);
      else if (progression && progression.parentNode) progression.parentNode.insertBefore(jauge, progression.nextSibling);
      else if (corps) corps.appendChild(jauge);
    }

    /* E076-07 — bouton de retour en haut. */
    let bouton = document.getElementById('e076-top');
    if (!bouton || (corps && bouton.parentElement !== corps)) {
      bouton = el('button', 'recit-e076-top', '↑ Début du récit');
      bouton.id = 'e076-top';
      bouton.type = 'button';
      bouton.setAttribute('aria-label', 'Revenir au début du récit');
    }
    if (!bouton.parentNode && corps) corps.appendChild(bouton);
    if (bouton.getAttribute('data-e076-bound') !== '1' && corps) {
      bouton.setAttribute('data-e076-bound', '1');
      bouton.addEventListener('click', () => {
        try {
          if (typeof corps.scrollTo === 'function') {
            corps.scrollTo({ top: 0, behavior: reduit ? 'auto' : 'smooth' });
          } else {
            corps.scrollTop = 0;
          }
        } catch {
          corps.scrollTop = 0;
        }
      });
    }

    /* Écouteur de défilement unique, gardé contre les doubles liaisons. */
    if (corps && typeof corps.addEventListener === 'function'
        && corps.getAttribute('data-e076-scroll-bound') !== '1') {
      corps.setAttribute('data-e076-scroll-bound', '1');
      corps.addEventListener('scroll', () => metAJourDefilement(corps, racine, jauge, bouton), { passive: true });
    }
    metAJourDefilement(corps, racine, jauge, bouton);

    /* E076-08 — mosaïque du fil : aucune suppression, seulement une grille. */
    ajouteClasse(listeFil, 'recit-e076-thread-list');

    /* E076-10 — clavier virtuel, évalué au rendu puis à chaque resize. */
    installeClavier();
    metAJourClavier();
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
