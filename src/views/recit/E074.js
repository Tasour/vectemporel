import { register } from './registry.js';

/* Lentille E074 — Navigation clavier (vue Récit).
 *
 * Dix chantiers concrets et distincts, E074-01 … E074-10, tous implémentés
 * ici. Rapport : UNIFIED_AUDIT/RECIT/views/E074.md.
 *
 * Greffon strictement additif et non destructif : une seule feuille de style
 * injectée une fois via le registre, aucun texte existant réécrit,
 * aucun nœud d'origine retiré, aucun écouteur modifié sur un nœud d'origine.
 * Sans JavaScript, le récit reste intégralement lisible et navigable.
 *
 * Conventions : toutes les classes créées sont préfixées recit-e074-, les ids
 * DOM sont préfixés e074- et uniques, les attributs data-e074-* sont réservés
 * à cette lentille. Zéro console, zéro réseau, zéro aléa, zéro fichier
 * partagé modifié. Chaque chantier est isolé : une défaillance locale ne
 * provoque jamais de throw et ne casse jamais le rendu.
 */

/* Une seule feuille : toutes les règles sont regroupées ici. Aucun import,
   aucune URL distante, aucune police distante. */
const CSS = `
/* E074-01 — contour de focus lisible, y compris en contraste forcé. */
.recit-e074-racine :is(button, a, input, summary, [tabindex]):focus-visible{
  outline:3px solid var(--gold-bright, #f5e9d0);
  outline-offset:3px;
  border-radius:6px;
}
@supports not selector(:focus-visible){
  .recit-e074-racine :is(button, a, input, summary, [tabindex]):focus{
    outline:3px solid var(--gold-bright, #f5e9d0);
    outline-offset:3px;
  }
}
@media (forced-colors: active){
  .recit-e074-racine :is(button, a, input, summary, [tabindex]):focus-visible{
    outline-color:Highlight;
    border-color:Highlight;
    forced-color-adjust:none;
  }
}
/* E074-02 — cibles clavier élargies au seuil de 36 px. */
.recit-e074-racine .c3a-filter,
.recit-e074-racine .recit-thread-item,
.recit-e074-racine .recit-trace summary,
.recit-e074-racine .c3a-reset{min-height:36px}
/* E074-03 — bandeau d'indices contextuels, texte ordinaire non live. */
.recit-e074-indices{margin:0 0 8px;color:var(--muted, #9aa4b2);font-size:9px;line-height:1.5}
/* E074-04 — lien d'évitement natif, masqué hors focus. */
.recit-e074-skip{
  position:absolute;left:-9999px;top:6px;z-index:60;
  padding:8px 12px;border:1px solid var(--gold, #e6b96f);border-radius:8px;
  background:var(--surface-2, #2b2f35);color:var(--gold-bright, #f5e9d0);
  font-size:11px;text-decoration:none;
}
.recit-e074-skip:focus{left:8px;top:8px}
/* E074-09 — marqueur persistant du point courant dans le fil. */
.recit-e074-racine [data-e074-courant="1"]{box-shadow:inset 3px 0 0 var(--gold, #e6b96f)}
.recit-e074-racine [data-e074-courant="1"]::after{content:" · ici";color:var(--gold-bright, #f5e9d0)}
/* E074-08 / E074-10 — défilement et régions d'annonce sans transition parasite. */
.recit-e074-sr{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;
}
.recit-e074-racine[data-e074-motion="reduce"]{scroll-behavior:auto}
@media (prefers-reduced-motion: reduce){
  .recit-e074-racine{scroll-behavior:auto}
}
@media (max-width:620px){
  .recit-e074-indices{font-size:10px}
}
`;

/* Libellés et touches déjà présents dans la vue (recit.js : légende et
   aria-keyshortcuts) : aucune touche n'est inventée. */
const LIBELLES = {
  titre: 'titre du point',
  recherche: 'recherche du fil',
  filtres: 'filtres',
  fil: 'fil du repère',
  tracabilite: 'traçabilité',
  commandes: 'commandes',
};
const TOUCHES = {
  titre: '← → changent de point · Entrée ouvre le détail',
  recherche: 'Échap efface la recherche · Entrée rejoint le fil',
  filtres: 'Tab parcourt les filtres · Échap quitte la recherche',
  fil: '↑ ↓ parcourent les points · Entrée sélectionne · Échap revient au titre',
  tracabilite: 'Entrée ouvre et ferme · ← → parcourent les références',
  commandes: '← → changent de point · Espace lance la lecture',
};

let ecouteursInstalles = false;
let dernierFk = '';

/* Un chantier défaillant est neutralisé : les neuf autres continuent. */
function safe(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function addToken(noeud, name, token) {
  if (!noeud || typeof noeud.getAttribute !== 'function' || !token) return;
  const jetons = String(noeud.getAttribute(name) || '').split(/\s+/).filter(Boolean);
  if (jetons.indexOf(token) === -1) {
    jetons.push(token);
    noeud.setAttribute(name, jetons.join(' '));
  }
}

function focusSur(noeud) {
  if (!noeud || typeof noeud.focus !== 'function') return;
  try { noeud.focus({ preventScroll: true }); }
  catch { try { noeud.focus(); } catch { /* cible non focusable */ } }
}

function racineCourante() {
  const noeud = document.querySelector('.recit-layout.recit-e074-racine');
  return noeud && noeud.isConnected ? noeud : null;
}

function zoneDe(cible) {
  if (!cible || typeof cible.closest !== 'function') return 'titre';
  if (cible.closest('#c3a-search, input[type="search"]')) return 'recherche';
  if (cible.closest('.c3a-group, .c3a-filter')) return 'filtres';
  if (cible.closest('#c3a-thread, .recit-thread')) return 'fil';
  if (cible.closest('.recit-trace')) return 'tracabilite';
  if (cible.closest('.recit-actions')) return 'commandes';
  if (cible.closest('#recit-point-title, .recit-title')) return 'titre';
  return 'titre';
}

/* E074-03 — texte visible, non live : il ne pollue aucune région d'annonce. */
function ecrireIndices(noeud, zone) {
  if (!noeud || typeof noeud.textContent !== 'string') return;
  const cle = Object.prototype.hasOwnProperty.call(LIBELLES, zone) ? zone : 'titre';
  const texte = `Navigation clavier · ${LIBELLES[cle]} : ${TOUCHES[cle]}.`;
  if (noeud.textContent !== texte) noeud.textContent = texte;
}

/* E074-10 — annonce distincte, limitée au nom de la zone. */
function ecrireLive(noeud, zone) {
  if (!noeud || typeof noeud.textContent !== 'string') return;
  const cle = Object.prototype.hasOwnProperty.call(LIBELLES, zone) ? zone : 'titre';
  const texte = `Zone clavier : ${LIBELLES[cle]}.`;
  if (noeud.textContent !== texte) noeud.textContent = texte;
}

/* E074-03 / E074-06 / E074-10 — écouteurs uniques, posés une seule fois pour
   toute la vie du document. Aucune référence de nœud n'est conservée : la
   coque reconstruisant le DOM à chaque étape, tout est relu à l'événement. */
function installerEcouteurs() {
  if (ecouteursInstalles || typeof document === 'undefined') return;
  ecouteursInstalles = true;

  document.addEventListener('focusin', (evenement) => {
    safe(() => {
      const racine = racineCourante();
      if (!racine) return;
      const cible = evenement && evenement.target;
      if (!cible || typeof cible.closest !== 'function' || !racine.contains(cible)) return;
      const zone = zoneDe(cible);
      ecrireIndices(document.getElementById('e074-indices'), zone);
      ecrireLive(document.getElementById('e074-live'), zone);
      if (cible.closest('.recit-actions')) dernierFk = cible.getAttribute('data-fk') || '';
    });
  }, true);

  /* E074-05 — detail === 0 identifie une activation clavier (Entrée/Espace).
     Le rendu qui suit détruit l'item : on reprend le nouvel item courant. */
  document.addEventListener('click', (evenement) => {
    safe(() => {
      if (!evenement || evenement.detail !== 0) return;
      const cible = evenement.target;
      if (!cible || typeof cible.closest !== 'function') return;
      if (!cible.closest('.recit-thread-item')) return;
      const reprendre = () => {
        const racine = racineCourante();
        if (!racine) return;
        const courant = racine.querySelector('#c3a-thread [aria-current="step"]')
          || racine.querySelector('.recit-thread-item.is-current');
        if (courant && !courant.disabled) focusSur(courant);
      };
      if (typeof queueMicrotask === 'function') queueMicrotask(reprendre);
      else reprendre();
    });
  }, true);
}

register('E074', (ctx) => {
  /* Isolateur global : aucune défaillance ne peut atteindre la coque. */
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { stage, layout, css, el, reducedMotion } = ctx;

    /* Un seul bloc CSS, injecté une fois par le registre (cssOnce). */
    if (typeof css === 'function') css('recit-e074', CSS);

    const racine = layout && typeof layout.querySelector === 'function'
      ? layout
      : (stage && typeof stage.querySelector === 'function' ? stage : null);
    if (!racine || typeof racine.setAttribute !== 'function') return;

    const corps = racine.querySelector('.recit-body')
      || (typeof racine.classList === 'object' && racine.classList.contains('recit-body') ? racine : null);
    if (!corps) return;

    ajouteClasse(racine, 'recit-e074-racine');
    let mouvement = 'normal';
    try { mouvement = reducedMotion && reducedMotion() ? 'reduce' : 'normal'; }
    catch { mouvement = 'normal'; }
    racine.setAttribute('data-e074-motion', mouvement);

    /* E074-04 — ancre locale vers les commandes ; le lien natif suffit à
       déplacer le focus, aucun gestionnaire n'est ajouté à l'ancre. */
    const actions = racine.querySelector('.recit-actions');
    if (actions) {
      if (!actions.id) actions.id = 'e074-commandes';
      if (!actions.hasAttribute('tabindex')) actions.tabIndex = -1;
    }
    if (typeof el === 'function' && typeof corps.insertBefore === 'function'
        && !document.getElementById('e074-skip-commandes')) {
      const lien = el('a', 'recit-e074-skip', 'Aller aux commandes');
      lien.id = 'e074-skip-commandes';
      lien.href = '#e074-commandes';
      lien.setAttribute('aria-label', 'Aller aux commandes du récit');
      corps.insertBefore(lien, corps.firstChild);
    }

    /* E074-03 — bandeau d'indices contextuels, inséré après la progression
       sans toucher au texte du kicker ni du titre. */
    if (typeof el === 'function') {
      let indices = document.getElementById('e074-indices');
      if (!indices || indices.parentElement !== corps) {
        indices = el('p', 'recit-e074-indices');
        indices.id = 'e074-indices';
        const progression = racine.querySelector('.recit-progress');
        if (progression && progression.parentElement === corps) {
          corps.insertBefore(indices, progression.nextSibling);
        } else {
          corps.appendChild(indices);
        }
      }
    }

    /* E074-10 — région d'annonce dédiée, gardée contre la duplication. */
    if (typeof el === 'function') {
      let live = document.getElementById('e074-live');
      if (!live || live.parentElement !== corps) {
        live = el('p', 'recit-e074-sr');
        live.id = 'e074-live';
        live.setAttribute('role', 'status');
        live.setAttribute('aria-live', 'polite');
        live.setAttribute('aria-atomic', 'true');
        corps.appendChild(live);
      }
    }
    const actif = document.activeElement;
    const zoneInitiale = actif && racine.contains(actif)
      ? zoneDe(actif)
      : zoneDe(racine.querySelector('#recit-point-title'));
    ecrireIndices(document.getElementById('e074-indices'), zoneInitiale);
    ecrireLive(document.getElementById('e074-live'), zoneInitiale);

    /* E074-07 — l'état des sources devient une cible clavier explicite
       quand il existe (point sans source). Le texte d'origine est conservé. */
    const sources = racine.querySelector('.recit-sources');
    if (sources && typeof sources.setAttribute === 'function') {
      if (!sources.id) sources.id = 'e074-sources';
      if (!sources.hasAttribute('tabindex')) sources.tabIndex = 0;
      sources.setAttribute('role', 'note');
      const texte = String(sources.textContent || '').trim();
      if (texte && !sources.hasAttribute('aria-label')) {
        sources.setAttribute('aria-label', `État des sources : ${texte.slice(0, 140)}`);
      }
    }

    /* E074-08 — un corps réellement défilable reçoit un point de Tab, afin
       que les flèches et Page suivante défilent le texte au clavier. */
    if (typeof corps.scrollHeight === 'number' && typeof corps.clientHeight === 'number'
        && corps.scrollHeight > corps.clientHeight + 8) {
      if (!corps.id) corps.id = 'e074-corps';
      if (!corps.hasAttribute('tabindex')) corps.tabIndex = 0;
      if (!corps.hasAttribute('role')) corps.setAttribute('role', 'region');
      if (!corps.hasAttribute('aria-label')) {
        corps.setAttribute('aria-label', 'Texte du point, défilable au clavier');
      }
    }

    /* E074-09 — marqueur persistant du point courant, distinct du marqueur
       de focus : il indique « où l'on est » même quand le focus est ailleurs. */
    const courant = racine.querySelector('#c3a-thread [aria-current="step"]')
      || racine.querySelector('.recit-thread-item.is-current');
    if (courant && typeof courant.setAttribute === 'function') {
      courant.setAttribute('data-e074-courant', '1');
      if (typeof el === 'function' && !document.getElementById('e074-courant-note')) {
        const note = el('p', 'recit-e074-sr', 'Point courant du récit.');
        note.id = 'e074-courant-note';
        corps.appendChild(note);
      }
      addToken(courant, 'aria-describedby', 'e074-courant-note');
    }

    /* E074-06 — après reconstruction, si le focus est retombé sur le corps
       et que la dernière commande était un bouton devenu indisponible, on le
       renvoie vers la commande encore utilisable, sinon vers le titre. */
    if ((!actif || actif === document.body || !actif.isConnected) && dernierFk) {
      if (dernierFk === 'c3a-prev' || dernierFk === 'c3a-next') {
        const cible = racine.querySelector('[data-fk="c3a-next"]:not([disabled])')
          || racine.querySelector('[data-fk="c3a-prev"]:not([disabled])')
          || racine.querySelector('#recit-point-title');
        if (cible) {
          focusSur(cible);
          dernierFk = '';
        }
      }
    }

    installerEcouteurs();
  } catch {
    /* Une lentille défaillante ne casse jamais le rendu de la vue. */
  }
});
