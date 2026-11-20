import { register } from './registry.js';

/* Lentille E091 — accessibilité clavier appliquée au champ d'étoiles de la vue
   Constellation. Dix chantiers locaux et déterministes : lecture des positions
   déposées par la vue, calcul de proximité géométrique, tabindex mobile,
   annonces vocalisées et repères visuels. Aucune écriture de journal, aucun
   appel réseau, aucune source aléatoire, aucun minuteur ni boucle d'animation
   propre, aucune ressource distante. Aucun fichier partagé n'est modifié. */

const CSS_ID = 'constellation-e091';
const CHAMP_ID = 'e091-champ';
const SKIP_ID = 'e091-skip';
const LIVE_ID = 'e091-live';
const COUNTER_ID = 'e091-counter';
const HINT_ID = 'e091-hint';

const TYPES = { sun: 'Ère', planet: 'Repère', moon: 'Point' };
const COUCHES = ['sun', 'planet', 'moon'];
const TOUCHES = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown', 'Alt+K'];

/* Références partagées entre deux rendus : le shell recrée le DOM à chaque set(). */
let champCourant = null;
let noeuds = [];
let indexCourant = 0;
let regionVive = null;
let compteur = null;
let flechesInstalle = false;
let extremiteInstalle = false;
let coucheInstalle = false;
let raccourciInstalle = false;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function sur(fn) {
  try { fn(); } catch (erreur) { /* neutralisé sans bruit */ }
}

function pourcentage(valeur) {
  const nombre = parseFloat(valeur);
  return Number.isFinite(nombre) ? nombre : 50;
}

function typeDe(noeud) {
  const cle = noeud && noeud.dataset ? (noeud.dataset.constKey || '') : '';
  const prefix = cle.split(':')[0];
  return Object.prototype.hasOwnProperty.call(TYPES, prefix) ? prefix : '';
}

function positionDe(noeud) {
  return {
    x: pourcentage(noeud.style.getPropertyValue('--x')),
    y: pourcentage(noeud.style.getPropertyValue('--y')),
  };
}

function libelleDe(noeud) {
  const type = typeDe(noeud);
  const famille = noeuds.filter((n) => typeDe(n) === type);
  const rang = famille.indexOf(noeud) + 1;
  const nom = noeud.dataset.label || noeud.getAttribute('aria-label') || 'étoile';
  const mot = TYPES[type] || 'Étoile';
  return `${mot} ${rang} sur ${famille.length} : ${nom}.`;
}

function peindreCompteur() {
  if (!compteur || !compteur.isConnected) return;
  compteur.textContent = noeuds.length ? `${indexCourant + 1} / ${noeuds.length}` : '0 / 0';
}

function annonce(texte) {
  if (!regionVive || !regionVive.isConnected || !texte) return;
  if (regionVive.textContent === texte) return;
  regionVive.textContent = texte;
}

function poserRoving(index) {
  if (!noeuds.length) return;
  indexCourant = ((index % noeuds.length) + noeuds.length) % noeuds.length;
  noeuds.forEach((noeud, i) => {
    noeud.setAttribute('tabindex', i === indexCourant ? '0' : '-1');
    noeud.dataset.e091Index = String(i);
  });
  peindreCompteur();
}

function focaliser(index) {
  if (!noeuds.length) return;
  poserRoving(index);
  const cible = noeuds[indexCourant];
  if (cible && typeof cible.focus === 'function') cible.focus({ preventScroll: true });
}

function dansLeChamp(cible) {
  return Boolean(champCourant && champCourant.isConnected
    && cible instanceof Element && champCourant.contains(cible));
}

/* Voisin géométrique : distance principale plus deux fois l'écart perpendiculaire.
   Repli sur l'extrémité opposée quand aucun voisin n'existe dans la direction. */
function voisinDirection(direction) {
  if (noeuds.length < 2) return indexCourant;
  const origine = positionDe(noeuds[indexCourant]);
  const horizontal = direction === 'right' || direction === 'left';
  const sens = direction === 'right' || direction === 'down' ? 1 : -1;
  let meilleur = -1;
  let meilleurCout = Infinity;
  let extreme = -1;
  let extremeValeur = sens > 0 ? -Infinity : Infinity;

  noeuds.forEach((noeud, i) => {
    if (i === indexCourant) return;
    const point = positionDe(noeud);
    const primaire = (horizontal ? point.x - origine.x : point.y - origine.y) * sens;
    const perpendiculaire = Math.abs(horizontal ? point.y - origine.y : point.x - origine.x);
    const valeur = horizontal ? point.x : point.y;
    if ((sens > 0 && valeur > extremeValeur) || (sens < 0 && valeur < extremeValeur)) {
      extremeValeur = valeur;
      extreme = i;
    }
    if (primaire <= 0.5) return;
    const cout = primaire + 2 * perpendiculaire;
    if (cout < meilleurCout) {
      meilleurCout = cout;
      meilleur = i;
    }
  });
  return meilleur >= 0 ? meilleur : (extreme >= 0 ? extreme : indexCourant);
}

function allerExtremite(bord) {
  if (!noeuds.length) return;
  focaliser(bord === 'debut' ? 0 : noeuds.length - 1);
}

function changerCouche(sens) {
  const presentes = COUCHES.filter((type) => noeuds.some((n) => typeDe(n) === type));
  if (!presentes.length) return;
  const courant = typeDe(noeuds[indexCourant]);
  const pos = presentes.indexOf(courant);
  const base = pos < 0 ? 0 : pos;
  const suivante = presentes[((base + sens) % presentes.length + presentes.length) % presentes.length];
  const cible = noeuds.findIndex((n) => typeDe(n) === suivante);
  if (cible >= 0) focaliser(cible);
}

register('E091', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  if (typeof ctx.css !== 'function') return;
  const layout = ctx.layout;
  const champ = layout.querySelector('.constellation-field');
  if (!champ) return;

  const make = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, text) => {
        const noeud = document.createElement(tag);
        if (className) noeud.className = className;
        if (text !== undefined) noeud.textContent = text;
        return noeud;
      };

  sur(() => {
    /* E091-01 — Roving tabindex unique sur les étoiles du champ. */
    champ.id = CHAMP_ID;
    champCourant = champ;
    noeuds = Array.from(champ.querySelectorAll('[data-const-key]'));
    const actif = noeuds.findIndex((n) => n.getAttribute('aria-current') === 'true');
    poserRoving(actif >= 0 ? actif : 0);
  });

  sur(() => {
    /* E091-02 — Navigation spatiale : le voisin est trouvé par calcul de proximité. */
    if (!flechesInstalle && typeof window.addEventListener === 'function') {
      flechesInstalle = true;
      window.addEventListener('keydown', (event) => {
        if (!event || !dansLeChamp(event.target)) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const fleches = {
          ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        };
        const direction = fleches[event.key];
        if (!Object.prototype.hasOwnProperty.call(fleches, event.key)) return;
        const vers = voisinDirection(direction);
        champCourant.dataset.e091Voisin = String(vers);
        event.preventDefault();
        event.stopPropagation();
        focaliser(vers);
      }, true);
    }
  });

  sur(() => {
    /* E091-03 — Extrémités du parcours atteintes par Début et Fin. */
    if (!extremiteInstalle && typeof window.addEventListener === 'function') {
      extremiteInstalle = true;
      window.addEventListener('keydown', (event) => {
        if (!event || !dansLeChamp(event.target)) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key !== 'Home' && event.key !== 'End') return;
        event.preventDefault();
        event.stopPropagation();
        allerExtremite(event.key === 'Home' ? 'debut' : 'fin');
        champCourant.dataset.e091Bord = String(indexCourant);
      }, true);
    }
  });

  sur(() => {
    /* E091-04 — Cyclage des couches ère / repère / point par PageUp et PageDown. */
    if (!coucheInstalle && typeof window.addEventListener === 'function') {
      coucheInstalle = true;
      window.addEventListener('keydown', (event) => {
        if (!event || !dansLeChamp(event.target)) return;
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key !== 'PageUp' && event.key !== 'PageDown') return;
        event.preventDefault();
        event.stopPropagation();
        changerCouche(event.key === 'PageDown' ? 1 : -1);
        champCourant.dataset.e091Couche = typeDe(noeuds[indexCourant]) || 'aucune';
      }, true);
    }
  });

  sur(() => {
    /* E091-05 — Lien d'évitement vers le champ, ancre posée et focus recentré. */
    const tete = layout.querySelector('.constellation-head') || layout;
    if (!layout.querySelector(`#${SKIP_ID}`)) {
      const evasion = make('a', 'e091-skip', 'Aller au champ d’étoiles');
      evasion.id = SKIP_ID;
      evasion.href = `#${CHAMP_ID}`;
      evasion.addEventListener('click', (event) => {
        event.preventDefault();
        const cible = noeuds[indexCourant] || champCourant;
        if (cible && typeof cible.focus === 'function') cible.focus({ preventScroll: true });
      });
      tete.insertBefore(evasion, tete.firstChild);
    }
  });

  sur(() => {
    /* E091-06 — Région live : annonce du libellé de l'étoile focalisée. */
    if (!regionVive || !regionVive.isConnected) {
      regionVive = layout.querySelector(`#${LIVE_ID}`) || make('p', 'e091-live', '');
      regionVive.id = LIVE_ID;
      regionVive.setAttribute('role', 'status');
      regionVive.setAttribute('aria-live', 'polite');
      regionVive.setAttribute('aria-atomic', 'true');
      champ.appendChild(regionVive);
    }
    if (champ.dataset.e091Focus !== '1') {
      champ.dataset.e091Focus = '1';
      champ.addEventListener('focusin', (event) => {
        if (!dansLeChamp(event.target)) return;
        const i = noeuds.indexOf(event.target);
        if (i < 0) return;
        poserRoving(i);
        annonce(libelleDe(noeuds[i]));
      }, true);
    }
  });

  sur(() => {
    /* E091-07 — Compteur de position « N / total » synchronisé au focus. */
    if (!compteur || !compteur.isConnected) {
      compteur = layout.querySelector(`#${COUNTER_ID}`) || make('span', 'e091-counter', '');
      compteur.id = COUNTER_ID;
      const ancre = layout.querySelector('.constellation-legend') || layout;
      ancre.appendChild(compteur);
    }
    peindreCompteur();
  });

  sur(() => {
    /* E091-08 — Feuille unique : focus visible, cible 24 px, lien, live, compteur. */
    ctx.css(CSS_ID, `
/* champ E091-08 : anneau de focus et cible clavier minimale. */
.constellation-layout .constellation-field [data-e091-index] { min-width:24px; min-height:24px; }
.constellation-layout .constellation-field [data-e091-index]:focus-visible {
  outline:2px solid var(--gold-bright,#f0cf8f);
  outline-offset:3px;
  box-shadow:0 0 0 5px rgba(230,185,111,.22);
}
/* champ E091-05 : lien d'évitement masqué hors focus. */
#e091-skip {
  position:absolute; left:8px; top:-60px; z-index:20;
  padding:6px 10px; border:1px solid var(--gold,#e6b96f); border-radius:6px;
  background:var(--surface-2,#141a24); color:var(--gold-bright,#f5e6c4);
  font-size:11px; text-decoration:none; transition:top .15s ease;
}
#e091-skip:focus { top:8px; }
/* champ E091-06 : région vocalisée, invisible à l'écran. */
#e091-live {
  position:absolute !important; width:1px; height:1px;
  padding:0; margin:-1px; overflow:hidden;
  clip:rect(0 0 0 0); white-space:nowrap; border:0;
}
/* champ E091-07 : pastille de position, chiffres alignés. */
#e091-counter {
  display:inline-block; min-width:3.2em; padding:2px 6px;
  border:1px solid var(--gold,#e6b96f); border-radius:10px;
  color:var(--gold,#e6b96f); font-size:9px;
  font-variant-numeric:tabular-nums; text-align:center;
}
/* champ E091-10 : aide clavier discrète sous la constellation. */
#e091-hint { color:var(--muted-2,#93a0b4); font-size:9px; line-height:1.45; }
@media (prefers-reduced-motion: reduce) { #e091-skip { transition:none; } }
`);
  });

  sur(() => {
    /* E091-09 — Raccourci Alt+K : focaliser l'étoile courante depuis la vue. */
    if (!raccourciInstalle && typeof document.addEventListener === 'function') {
      raccourciInstalle = true;
      document.addEventListener('keydown', (event) => {
        if (!event || !event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key !== 'k' && event.key !== 'K') return;
        if (!champCourant || !champCourant.isConnected || !noeuds.length) return;
        event.preventDefault();
        event.stopPropagation();
        focaliser(indexCourant);
      }, true);
    }
  });

  sur(() => {
    /* E091-10 — Aide visible, raccourcis exposés et mode de mouvement tracé. */
    noeuds.forEach((noeud) => {
      const touches = (noeud.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
      TOUCHES.forEach((touche) => { if (touches.indexOf(touche) < 0) touches.push(touche); });
      noeud.setAttribute('aria-keyshortcuts', touches.join(' '));
      const decrits = (noeud.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (decrits.indexOf(HINT_ID) < 0) decrits.push(HINT_ID);
      noeud.setAttribute('aria-describedby', decrits.join(' '));
    });
    if (!layout.querySelector(`#${HINT_ID}`)) {
      const aide = make('p', 'e091-hint',
        'Champ d’étoiles : ← → ↑ ↓ choisir l’étoile voisine, Début/Fin aux extrémités, PageUp/PageDown changer de couche, Alt+K focaliser le champ, Entrée ouvrir le détail.');
      aide.id = HINT_ID;
      const ancre = layout.querySelector('.constellation-caption') || layout;
      ancre.appendChild(aide);
    }
    const reduit = typeof ctx.reducedMotion === 'function' && Boolean(ctx.reducedMotion());
    champ.dataset.e091Motion = reduit ? 'reduced' : 'full';
  });
});
