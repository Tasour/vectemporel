import { register } from './registry.js';

/* Lentille E024 — Navigation clavier (vue Récit).
   Dix chantiers additifs et distincts (E024-01 … E024-10) : détection du mode
   clavier, parcours horizontal et paginé du fil, accès direct par chiffre,
   retour au point par Échap, flèches sur la traçabilité, raccourcis J/K,
   Début/Fin, retour audible et raccourcis de recherche.

   Contrat : un seul register, une seule feuille css('recit-e024', ...), classes
   préfixées recit-e024-, ids préfixés e024-, zéro appel réseau, zéro sortie
   console, zéro aléa. Chaque chantier est gardé et isolé : une défaillance
   locale ne casse jamais le rendu. Sans JavaScript la vue reste lisible. */

const STYLE_ID = 'recit-e024';

const RULES = `
.recit-e024-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.recit-e024-clavier :is(button,a,input,summary,[tabindex]):focus-visible{outline:3px solid var(--gold-bright,#f5e9d0);outline-offset:3px;box-shadow:0 0 0 6px rgba(230,185,111,.18);border-radius:6px}
.recit-e024-curseur:not(:focus-visible){outline:1px dashed var(--gold,#e6b96f);outline-offset:1px}
.recit-e024-sans-mouvement :is(button,a,input,summary,[tabindex]):focus-visible{transition:none!important}
@media (prefers-reduced-motion:reduce){.recit-e024-clavier :is(button,a,input,summary,[tabindex]):focus-visible{transition:none}}
`;

/* État module : le mode clavier survit aux reconstructions du DOM opérées par
   la coque ; les écouteurs, eux, ne sont armés qu'une seule fois. */
let modeClavier = false;
let ecouteursArmes = false;

/* Un chantier défaillant est neutralisé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

/* Ajoute un jeton à une liste d'identifiants (aria-keyshortcuts,
   aria-describedby) sans écraser les valeurs déjà présentes. */
function addToken(node, name, token) {
  if (!node || node.nodeType !== 1 || !token) return;
  const tokens = String(node.getAttribute(name) || '').split(/\s+/).filter(Boolean);
  if (tokens.indexOf(token) === -1) tokens.push(token);
  node.setAttribute(name, tokens.join(' '));
}

/* Les boutons du fil présents dans le DOM sont précisément les points
   affichés après filtrage : aucun tri supplémentaire n'est appliqué. */
function itemsDuFil(body) {
  if (!body) return [];
  const list = body.querySelector('#c3a-thread') || body.querySelector('.recit-thread-list');
  if (!list) return [];
  return Array.prototype.slice.call(list.querySelectorAll('.recit-thread-item'))
    .filter((button) => !button.disabled);
}

function listeDuFil(body) {
  if (!body) return null;
  return body.querySelector('#c3a-thread') || body.querySelector('.recit-thread-list') || null;
}

/* Indice du point où se trouve le curseur clavier, avec repli sur le point
   courant (aria-current / is-current) puis sur le premier. */
function indiceCourant(body) {
  const buttons = itemsDuFil(body);
  if (!buttons.length) return -1;
  const active = typeof document === 'undefined' ? null : document.activeElement;
  const at = buttons.indexOf(active);
  if (at >= 0) return at;
  const current = buttons.findIndex((button) => button.classList.contains('is-current')
    || button.getAttribute('aria-current') === 'step');
  return current >= 0 ? current : 0;
}

/* Déplace le curseur clavier dans le fil : un seul tabIndex à 0 (roving),
   marqueur visuel persistant et focalisation sans défilement parasite. */
function placerCurseur(body, index) {
  const buttons = itemsDuFil(body);
  if (!buttons.length) return false;
  const at = Math.min(Math.max(index, 0), buttons.length - 1);
  buttons.forEach((button) => {
    button.tabIndex = -1;
    button.classList.remove('recit-e024-curseur');
  });
  const cible = buttons[at];
  cible.tabIndex = 0;
  cible.classList.add('recit-e024-curseur');
  try { cible.focus({ preventScroll: true }); }
  catch { cible.focus(); }
  return true;
}

/* Région d'annonce dédiée aux actions clavier. Jamais de création en double :
   l'identifiant e024-live est unique et le nœud vit dans .recit-body. */
function assurerAnnonce(body, el) {
  if (!body) return null;
  const existing = document.getElementById('e024-live');
  if (existing && existing.isConnected) return existing;
  if (typeof el !== 'function') return null;
  const node = el('p', 'recit-e024-sr');
  node.id = 'e024-live';
  node.setAttribute('role', 'status');
  node.setAttribute('aria-live', 'polite');
  node.setAttribute('aria-atomic', 'true');
  body.appendChild(node);
  return node;
}

/* Le nœud est relu à chaque appel : la coque reconstruit le corps à chaque
   changement de point, l'ancien paragraphe n'est alors plus connecté. */
function annonce(message) {
  const text = String(message || '');
  if (!text || typeof document === 'undefined') return;
  const node = document.getElementById('e024-live');
  if (!node || node.nodeType !== 1) return;
  if (node.textContent !== text) { node.textContent = text; return; }
  node.textContent = '';
  const reprendre = () => { if (node.isConnected) node.textContent = text; };
  if (typeof queueMicrotask === 'function') queueMicrotask(reprendre);
  else reprendre();
}

function appliquerModeClavier(on) {
  modeClavier = Boolean(on);
  const roots = document.querySelectorAll('.recit-e024-racine');
  Array.prototype.forEach.call(roots, (root) => {
    root.classList.toggle('recit-e024-clavier', modeClavier);
  });
}

/* E024-01 — détection du mode clavier (Tab / flèches) et retour au pointeur.
   L'écouteur est unique, installé une seule fois, en phase capture. */
let ecouteurPointeur = null;
function chargerEcouteurs() {
  if (ecouteursArmes || typeof window === 'undefined') return;
  ecouteursArmes = true;
  window.VECTEMPOREL_KEYS?.registerScoped?.(() => true, surTouche);
  ecouteurPointeur = () => appliquerModeClavier(false);
  window.addEventListener('pointerdown', ecouteurPointeur, true);
}

/* E024-02 — flèches gauche / droite dans le fil : parcours horizontal des
   points, en complément des flèches haut / bas déjà présentes dans la vue. */
function chantier02(body, el) {
  const thread = body.querySelector('.recit-thread');
  const list = listeDuFil(body);
  if (!thread || !list) return;
  if (!document.getElementById('e024-fil-aide')) {
    const aide = el('p', 'recit-e024-sr',
      'Dans ce fil : les flèches gauche et droite parcourent les points, Page précédente et Page suivante sautent cinq points, les chiffres de 1 à 9 et 0 vont au point de même rang, Échap revient au point courant.');
    aide.id = 'e024-fil-aide';
    thread.appendChild(aide);
    addToken(list, 'aria-describedby', 'e024-fil-aide');
  }
  const buttons = itemsDuFil(body);
  if (!buttons.length) return;
  buttons.forEach((button) => button.classList.remove('recit-e024-curseur'));
  const current = buttons.findIndex((button) => button.classList.contains('is-current')
    || button.getAttribute('aria-current') === 'step');
  (current >= 0 ? buttons[current] : buttons[0]).classList.add('recit-e024-curseur');
}

/* E024-03 — Page précédente / Page suivante : saut de cinq points dans le fil,
   borné aux extrémités, avec annonce du nouveau rang. */
function chantier03(body) {
  const list = listeDuFil(body);
  if (list) addToken(list, 'aria-keyshortcuts', 'PageUp PageDown');
}

/* E024-04 — touches numériques 1 à 9 et 0 : accès direct au n-ième point
   affiché du fil (0 désigne le dixième). */
function chantier04(body) {
  const list = listeDuFil(body);
  if (!list) return;
  ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0']
    .forEach((token) => addToken(list, 'aria-keyshortcuts', token));
}

/* E024-05 — Échap depuis le fil : retour au point courant au lieu de quitter
   la vue. Le routeur global est neutralisé uniquement dans ce contexte. */
function chantier05(body) {
  const list = listeDuFil(body);
  if (list) addToken(list, 'aria-keyshortcuts', 'Escape');
}

/* E024-06 — flèches sur le résumé de traçabilité : droite ouvre, gauche
   ferme le details natif, sans toucher à l'activation Entrée / Espace. */
function chantier06(body) {
  const summary = body.querySelector('.recit-trace summary');
  if (summary) addToken(summary, 'aria-keyshortcuts', 'ArrowLeft ArrowRight');
}

/* E024-07 — J / K : point suivant / précédent, comme dans un lecteur. Les
   raccourcis sont documentés sur les boutons d'action existants. */
function chantier07(body) {
  const prev = body.querySelector('[data-fk="c3a-prev"]');
  const next = body.querySelector('[data-fk="c3a-next"]');
  if (prev) addToken(prev, 'aria-keyshortcuts', 'KeyK');
  if (next) addToken(next, 'aria-keyshortcuts', 'KeyJ');
}

/* E024-08 — Début / Fin hors du fil : premier / dernier point affiché. */
function chantier08(body) {
  const actions = body.querySelector('.recit-actions');
  if (actions) addToken(actions, 'aria-keyshortcuts', 'Home End');
}

/* E024-09 — région live dédiée, installée une seule fois par rendu. */
function chantier09(body, el) {
  assurerAnnonce(body, el);
}

/* E024-10 — recherche : Entrée joint le premier résultat, Échap efface le
   champ et y ramène le focus. */
function chantier10(body) {
  const search = body.querySelector('#c3a-search');
  if (search) addToken(search, 'aria-keyshortcuts', 'Enter Escape');
}

/* Unique dispatch clavier. L'ordre des gardes évite tout conflit avec le
   garde-fou de recit.js (déjà preventDefault) et avec le routeur global. */
function surTouche(event) {
  if (!event || event.defaultPrevented) return;
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (typeof Element === 'undefined' || !(target instanceof Element)) return;
  const layout = document.querySelector('.recit-e024-racine');
  if (!layout || !layout.isConnected || !layout.contains(target)) return;
  const body = layout.querySelector('.recit-body');
  if (!body) return;
  const key = event.key;

  if (key === 'Tab' || String(key).indexOf('Arrow') === 0) appliquerModeClavier(true);

  let modal = false;
  try {
    const st = typeof window !== 'undefined' && window.VATLAS
      && typeof window.VATLAS.getState === 'function' ? window.VATLAS.getState() : null;
    modal = Boolean(st && (st.helpOpen || st.detailOpen));
  } catch { modal = false; }
  if (modal) return;

  const search = target.closest('#c3a-search');
  if (search) {
    if (key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      const buttons = itemsDuFil(body);
      if (buttons.length) {
        placerCurseur(body, 0);
        annonce(`Premier résultat : point 1 sur ${buttons.length}.`);
      } else annonce('Aucun point ne correspond à la recherche.');
    } else if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (search.value !== '') {
        search.value = '';
        try { search.dispatchEvent(new Event('input', { bubbles: true })); }
        catch { /* neutralisé */ }
      }
      annonce('Recherche effacée.');
      const revenir = () => {
        const champ = document.querySelector('.recit-e024-racine #c3a-search');
        if (!champ) return;
        try { champ.focus({ preventScroll: true }); }
        catch { champ.focus(); }
      };
      if (typeof queueMicrotask === 'function') queueMicrotask(revenir);
      else revenir();
    }
    return;
  }

  if (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].indexOf(target.tagName) >= 0) return;

  const summary = target.closest('.recit-trace summary');
  if (summary && (key === 'ArrowRight' || key === 'ArrowLeft')) {
    const details = summary.closest('details');
    if (details) {
      event.preventDefault();
      event.stopPropagation();
      const ouvrir = key === 'ArrowRight';
      if (details.open !== ouvrir) details.open = ouvrir;
      annonce(ouvrir ? 'Traçabilité ouverte.' : 'Traçabilité fermée.');
    }
    return;
  }

  if (target.closest('.recit-thread')) {
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      const at = indiceCourant(body);
      if (placerCurseur(body, at + (key === 'ArrowRight' ? 1 : -1))) {
        annonce(`Fil : point ${indiceCourant(body) + 1} sur ${itemsDuFil(body).length}.`);
      }
    } else if (key === 'PageDown' || key === 'PageUp') {
      event.preventDefault();
      event.stopPropagation();
      const at = indiceCourant(body);
      if (placerCurseur(body, at + (key === 'PageDown' ? 5 : -5))) {
        annonce(`Fil : point ${indiceCourant(body) + 1} sur ${itemsDuFil(body).length}.`);
      }
    } else if (/^[0-9]$/.test(key)) {
      event.preventDefault();
      event.stopPropagation();
      const rang = key === '0' ? 10 : Number(key);
      const boutons = itemsDuFil(body);
      if (boutons.length && placerCurseur(body, rang - 1)) {
        boutons[Math.min(rang, boutons.length) - 1].click();
        annonce(`Fil : point ${Math.min(rang, boutons.length)} sur ${boutons.length}.`);
      }
    } else if (key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      const titre = document.getElementById('recit-point-title') || body.querySelector('.recit-title');
      if (titre) {
        try { titre.focus({ preventScroll: true }); }
        catch { titre.focus(); }
      }
      annonce('Retour au point courant.');
    }
    return;
  }

  if (key === 'j' || key === 'J' || key === 'k' || key === 'K') {
    const suivant = key === 'j' || key === 'J';
    const bouton = body.querySelector(`[data-fk="${suivant ? 'c3a-next' : 'c3a-prev'}"]`);
    if (bouton && !bouton.disabled) {
      event.preventDefault();
      event.stopPropagation();
      bouton.click();
      annonce(suivant ? 'Point suivant.' : 'Point précédent.');
    }
    return;
  }

  if (key === 'Home' || key === 'End') {
    const boutons = itemsDuFil(body);
    if (boutons.length) {
      event.preventDefault();
      event.stopPropagation();
      const at = key === 'Home' ? 0 : boutons.length - 1;
      placerCurseur(body, at);
      boutons[at].click();
      annonce(key === 'Home' ? 'Premier point du repère.' : 'Dernier point affiché du fil.');
    }
  }
}

register('E024', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (typeof document === 'undefined' || !stage || !layout) return;
  safe(() => css(STYLE_ID, RULES));
  const body = layout.querySelector('.recit-body');
  if (!body) return;
  safe(() => layout.classList.add('recit-e024-racine'));
  safe(() => appliquerModeClavier(modeClavier));
  safe(() => {
    let reduce = false;
    try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduce = false; }
    layout.classList.toggle('recit-e024-sans-mouvement', reduce);
  });
  safe(() => chantier02(body, el));
  safe(() => chantier03(body));
  safe(() => chantier04(body));
  safe(() => chantier05(body));
  safe(() => chantier06(body));
  safe(() => chantier07(body));
  safe(() => chantier08(body));
  safe(() => chantier09(body, el));
  safe(() => chantier10(body));
  safe(() => chargerEcouteurs());
});
