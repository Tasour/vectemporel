import { register } from './registry.js';

/* Lentille V2 E091 — accessibilité clavier avancée du champ d'étoiles de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sous
   le préfixe exclusif v2e091 (aucune collision avec la passe 1). Aucune écriture
   de journal, aucun appel réseau, aucune source aléatoire, aucun minuteur ni
   boucle d'animation propre. Le module reste passif : il n'installe que des
   écouteurs et des attributs, jamais d'horloge. */

const CSS_ID = 'constellation-v2-e091';
const LIVE_ID = 'v2e091-move-live';
const HELP_ID = 'v2e091-help';
const NAV_KEY = '__v2e091_nav';

const COUCHES = ['sun', 'planet', 'moon'];
const NOMS_COUCHES = { sun: 'ère', planet: 'repère', moon: 'point vérifié' };
const NOMS_DIRECTIONS = { left: 'de gauche', right: 'de droite', up: 'du haut', down: 'du bas' };
const DIRECTIONS = ['left', 'right', 'up', 'down'];
const TOUCHES_V2 = ['1', '2', '3', 'Shift+ArrowLeft', 'Shift+ArrowRight',
  'Shift+ArrowUp', 'Shift+ArrowDown', 'A-Z'];

/* Exécution défensive : un chantier défaillant neutralise seulement le sien. */
function sur(fn) {
  try { fn(); } catch (erreur) { /* neutralisé sans bruit */ }
}

function pourcentage(valeur) {
  const nombre = parseFloat(valeur);
  return Number.isFinite(nombre) ? nombre : 50;
}

function typeDe(noeud) {
  const cle = noeud && noeud.dataset ? (noeud.dataset.constKey || '') : '';
  const prefixe = cle.split(':')[0];
  return Object.prototype.hasOwnProperty.call(NOMS_COUCHES, prefixe) ? prefixe : '';
}

function positionDe(noeud) {
  return {
    x: pourcentage(noeud.style.getPropertyValue('--x')),
    y: pourcentage(noeud.style.getPropertyValue('--y')),
  };
}

function normalise(texte) {
  return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function libelleCourt(noeud) {
  if (!noeud) return '';
  return noeud.dataset.label || noeud.getAttribute('aria-label') || noeud.title || '';
}

/* Nom de recherche : on ôte le type et le numéro pour cibler le texte utile. */
function nomRecherche(noeud) {
  return normalise(noeud.getAttribute('aria-label') || libelleCourt(noeud))
    .replace(/^(ere|repere|point)\s+\d+\s*:\s*/, '')
    .replace(/^ere\s+/, '')
    .trim();
}

function focusSansDefilement(noeud) {
  if (noeud && typeof noeud.focus === 'function') noeud.focus({ preventScroll: true });
}

function modulo(index, taille) {
  return taille > 0 ? ((index % taille) + taille) % taille : 0;
}

register('E091', ctx => {
  /* Garde d'entrée : aucun ajout au DOM sans layout exploitable ni navigateur. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;
  const champ = layout.querySelector('.constellation-field');
  if (!champ) return;
  const noeuds = Array.from(champ.querySelectorAll('[data-const-key]'));
  if (!noeuds.length) return;

  const total = noeuds.length;
  const positionDuFocus = () => {
    const parTab = noeuds.findIndex(n => n.getAttribute('tabindex') === '0');
    if (parTab >= 0) return parTab;
    const parEtat = noeuds.findIndex(n => n.getAttribute('aria-current') === 'true');
    return parEtat >= 0 ? parEtat : 0;
  };

  /* Cout géométrique déterministe : avance principale + deux fois l'écart
     perpendiculaire, avec repli sur l'extrémité quand la direction est vide. */
  function voisin(index, direction) {
    if (total < 2) return index;
    const origine = positionDe(noeuds[index]);
    const horizontal = direction === 'left' || direction === 'right';
    const sens = direction === 'right' || direction === 'down' ? 1 : -1;
    let meilleur = -1;
    let meilleurCout = Infinity;
    let extreme = -1;
    let extremeValeur = sens > 0 ? -Infinity : Infinity;
    noeuds.forEach((noeud, i) => {
      if (i === index) return;
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
    return meilleur >= 0 ? meilleur : (extreme >= 0 ? extreme : index);
  }

  /* E091-01 — Carte de voisinage pré-calculée : le voisin le plus proche dans
     chaque direction est calculé une seule fois par étoile et publié dans le
     DOM, pour rendre la géométrie auditable sans refaire le calcul à chaque touche. */
  let carteVoisinage = [];
  sur(() => {
    carteVoisinage = noeuds.map((noeud, index) => {
      const carte = {};
      DIRECTIONS.forEach(direction => { carte[direction] = voisin(index, direction); });
      return carte;
    });
    noeuds.forEach((noeud, index) => {
      const carte = carteVoisinage[index] || {};
      noeud.dataset.v2e091VoisinGauche = String(carte.left);
      noeud.dataset.v2e091VoisinDroite = String(carte.right);
      noeud.dataset.v2e091VoisinHaut = String(carte.up);
      noeud.dataset.v2e091VoisinBas = String(carte.down);
    });
    champ.dataset.v2e091Carte = String(total);
  });

  /* E091-02 — Position canonique à deux niveaux : rang global dans le champ et
     rang dans la famille sémantique (ère, repère ou point), exposés aux lecteurs
     d'écran et au CSS sans remplacer le tabindex mobile de la passe 1. */
  sur(() => {
    const familles = {};
    noeuds.forEach(noeud => {
      const type = typeDe(noeud);
      if (!familles[type]) familles[type] = [];
      familles[type].push(noeud);
    });
    noeuds.forEach((noeud, index) => {
      const type = typeDe(noeud);
      const famille = familles[type] || [];
      const rang = famille.indexOf(noeud) + 1;
      noeud.setAttribute('aria-posinset', String(index + 1));
      noeud.setAttribute('aria-setsize', String(total));
      noeud.dataset.v2e091Rang = String(index + 1);
      noeud.dataset.v2e091RangGlobal = `${index + 1}/${total}`;
      noeud.dataset.v2e091RangFamille = `${rang}/${famille.length}`;
      noeud.dataset.v2e091Famille = NOMS_COUCHES[type] || 'étoile';
    });
  });

  /* E091-03 — Orientation cardinale de chaque étoile, déduite des variables
     --x/--y déjà posées par la vue. Le mot est ajouté au libellé accessible :
     l'information n'est jamais portée par la seule couleur ni le seul mouvement. */
  sur(() => {
    const cardinal = (x, y) => {
      const angle = (Math.atan2(y - 50, x - 50) * 180 / Math.PI + 360) % 360;
      const directions = ['Est', 'Sud-Est', 'Sud', 'Sud-Ouest',
        'Ouest', 'Nord-Ouest', 'Nord', 'Nord-Est'];
      return directions[Math.round(angle / 45) % 8];
    };
    noeuds.forEach(noeud => {
      const point = positionDe(noeud);
      if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
      const direction = cardinal(point.x, point.y);
      noeud.dataset.v2e091Orientation = direction;
      const label = noeud.getAttribute('aria-label') || '';
      if (label.indexOf('orientation') === -1) {
        noeud.setAttribute('aria-label', `${label} — orientation ${direction} (placement décoratif)`);
      }
    });
  });

  /* E091-04 — Région live V2 réservée aux déplacements, distincte de l'annonce
     de sélection de la passe 1. Le texte est écrit avant le changement de focus
     et n'est pas réécrit quand il est identique. */
  let moveLive = null;
  sur(() => {
    moveLive = layout.querySelector(`#${LIVE_ID}`);
    if (!moveLive) {
      moveLive = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e091-sr', '') : document.createElement('p');
      moveLive.id = LIVE_ID;
      layout.appendChild(moveLive);
    }
    moveLive.setAttribute('role', 'status');
    moveLive.setAttribute('aria-live', 'polite');
    moveLive.setAttribute('aria-atomic', 'true');
  });

  function annonceDeplacement(prefixe, index) {
    if (!moveLive || !moveLive.isConnected) return;
    const noeud = noeuds[index];
    if (!noeud) return;
    const texte = `${prefixe} : étoile ${index + 1} sur ${total}, `
      + `${noeud.dataset.v2e091Famille || 'étoile'} ${noeud.dataset.v2e091RangFamille || ''} — `
      + `${libelleCourt(noeud) || 'étoile'}.`;
    if (moveLive.textContent !== texte) moveLive.textContent = texte;
  }

  function allerA(index, prefixe) {
    const cible = modulo(index, total);
    annonceDeplacement(prefixe, cible);
    focusSansDefilement(noeuds[cible]);
  }

  /* E091-05 — Touches 1, 2 et 3 : saut direct à la première étoile de chaque
     couche (ère, repère, point), sans parcours géométrique ni changement d'état. */
  /* E091-06 — Recherche par initiale sur tout le champ : une lettre accentuée
     ou non mène à la première étoile dont le nom commence par cette lettre. */
  /* E091-07 — Sondage directionnel : Maj + flèche annonce le voisin dans cette
     direction sans déplacer le focus, pour explorer avant de se déplacer. */
  /* Ces trois chantiers partagent un unique écouteur enregistré en capture. */
  sur(() => {
    if (typeof window.addEventListener !== 'function') return;
    const precedent = window[NAV_KEY];
    if (typeof precedent === 'function' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', precedent, true);
    }
    const surNav = evenement => {
      if (!evenement || evenement.defaultPrevented || !champ.isConnected) return;
      const cible = evenement.target;
      if (!cible || cible.nodeType !== 1 || !champ.contains(cible)) return;
      const index = noeuds.indexOf(cible);
      if (index < 0) return;
      const cle = evenement.key || '';

      if (cle === '1' || cle === '2' || cle === '3') {
        const type = COUCHES[Number(cle) - 1];
        const premier = noeuds.findIndex(n => typeDe(n) === type);
        if (premier < 0) return;
        evenement.preventDefault();
        evenement.stopPropagation();
        allerA(premier, `Saut vers ${NOMS_COUCHES[type]}`);
        return;
      }

      if (cle.length === 1 && /^[a-zà-ÿ]$/iu.test(cle)) {
        const lettre = normalise(cle);
        for (let pas = 1; pas <= total; pas += 1) {
          const trouve = (index + pas) % total;
          if (nomRecherche(noeuds[trouve]).indexOf(lettre) === 0) {
            evenement.preventDefault();
            evenement.stopPropagation();
            allerA(trouve, 'Recherche par initiale');
            return;
          }
        }
        return;
      }

      if (evenement.shiftKey && !evenement.ctrlKey && !evenement.metaKey && !evenement.altKey) {
        const fleches = {
          ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
        };
        if (!Object.prototype.hasOwnProperty.call(fleches, cle)) return;
        const carte = carteVoisinage[index] || {};
        const voisinIndex = carte[fleches[cle]];
        if (!Number.isInteger(voisinIndex) || voisinIndex === index) return;
        evenement.preventDefault();
        evenement.stopPropagation();
        annonceDeplacement(`Voisin ${NOMS_DIRECTIONS[fleches[cle]]} sans déplacement`, voisinIndex);
        champ.dataset.v2e091Sonde = String(voisinIndex);
      }
    };
    window[NAV_KEY] = surNav;
    window.addEventListener('keydown', surNav, true);
  });

  /* E091-08 — Feuille unique : anneau de focus à deux niveaux, distinct de
     l'état .is-active. La forme (double contour, coin arrondi) et le décalage
     complètent la couleur, conformément au critère « pas de couleur seule ». */
  sur(() => {
    css(CSS_ID, `
.v2e091-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout .constellation-field [data-v2e091-rang]:focus-visible{
  outline:2px solid var(--gold-bright,#f0cf8f);
  outline-offset:3px;
  box-shadow:0 0 0 2px var(--surface-1,#0c1118),0 0 0 6px rgba(230,185,111,.28);
  border-radius:50%;
  z-index:6;
}
.v2e091-steady [data-v2e091-rang]{transition:none}
#v2e091-help{color:var(--muted-2,#93a0b4);font-size:9px;line-height:1.45}
@media (prefers-reduced-motion: reduce){.constellation-field [data-v2e091-rang]{transition:none!important}}
`);
  });

  /* E091-09 — Aide V2 rattachée sans écraser l'aide de la passe 1, et nouvelles
     touches déclarées dans aria-keyshortcuts de façon incrémentale. */
  sur(() => {
    let aide = layout.querySelector(`#${HELP_ID}`);
    if (!aide) {
      aide = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e091-sr', '')
        : document.createElement('p');
      aide.id = HELP_ID;
      layout.appendChild(aide);
    }
    aide.textContent = 'Raccourcis V2 : 1 ère, 2 repère, 3 point ; une lettre saute à une étoile ; Maj et flèche annoncent le voisin sans déplacer le focus.';
    [champ].concat(noeuds).forEach(noeud => {
      const decrits = (noeud.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (decrits.indexOf(HELP_ID) === -1) decrits.push(HELP_ID);
      noeud.setAttribute('aria-describedby', decrits.join(' '));
    });
    noeuds.forEach(noeud => {
      const touches = (noeud.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
      TOUCHES_V2.forEach(touche => {
        if (touches.indexOf(touche) === -1) touches.push(touche);
      });
      noeud.setAttribute('aria-keyshortcuts', touches.join(' '));
      noeud.dataset.v2e091Touches = touches.join(' ');
    });
  });

  /* E091-10 — Stabilité du focus : déplacement sans défilement (déjà utilisé
     par allerA) et repli sobre demandé au contexte, sans sonde ni boucle propre. */
  sur(() => {
    const positions = positionDuFocus();
    champ.dataset.v2e091Focus = String(positions + 1);
    let sobre = false;
    if (typeof ctx.reducedMotion === 'function') {
      try { sobre = Boolean(ctx.reducedMotion()); } catch (erreur) { sobre = false; }
    }
    champ.dataset.v2e091Motion = sobre ? 'reduced' : 'full';
    if (sobre) champ.classList.add('v2e091-steady');
    else champ.classList.remove('v2e091-steady');
  });
});
