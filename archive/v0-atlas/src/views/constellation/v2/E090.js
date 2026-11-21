import { register } from './registry.js';

/* Lentille V2 E090 — Mouvement et transitions du chemin de connexion de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau, sans source aléatoire, sans minuteur ni boucle d'animation propre.
   Le « chemin de connexion » est la chaîne ordonnée des arêtes `is-path` du SVG
   `.constellation-edges` : soleil actif → planète active → lune active. */

const CSS_ID = 'constellation-v2-e090';
const OVERLAY_ID = 'v2e090-overlay';
const ROUTE_ID = 'v2e090-route';
const LEGENDE_ID = 'v2e090-legende';
const BASCULE_ID = 'v2e090-bascule';

/* État local déterministe, conservé entre les rendus successifs. */
let signaturePrecedente = null;
let mouvementActif = null; /* null = non initialisé ; sinon true / false. */

/* Toutes les règles dans une seule chaîne : un seul appel à ctx.css. Les
   animations visuelles portent sur les propres calques de la lentille, jamais
   sur les traits SVG, afin de ne pas écraser les animations de la passe 1. */
const CSS = `
/* v2e090 — calque de décoration, non interactif et ignoré des lecteurs d'écran. */
.constellation-layout #${OVERLAY_ID} {
  position: absolute; left: 0; top: 0; width: 100%; height: 100%;
  pointer-events: none; z-index: 2; overflow: hidden;
}
/* v2e090-01 / 06 — voyageur : durée pondérée et retard de relais. */
.constellation-layout .v2e090-voyageur {
  position: absolute; width: 7px; height: 7px; margin: 0; padding: 0;
  border: 1px solid rgba(255, 236, 190, .95); border-radius: 50%;
  background: rgba(255, 226, 160, .8);
  box-shadow: 0 0 6px rgba(255, 226, 160, .5);
  transform: translate(-50%, -50%);
  animation: v2e090-glisse var(--v2e090-duree, 600ms) linear var(--v2e090-retard, 0ms) both;
}
/* v2e090-05 / 06 — segment nouveau : impulsion d'entrée en plus du glissement. */
.constellation-layout .v2e090-neuf {
  animation: v2e090-entree 360ms ease-out both,
             v2e090-glisse var(--v2e090-duree, 600ms) linear var(--v2e090-retard, 0ms) both;
}
@keyframes v2e090-glisse {
  from { left: var(--v2e090-x1); top: var(--v2e090-y1); opacity: .25; }
  to   { left: var(--v2e090-x2); top: var(--v2e090-y2); opacity: 1; }
}
@keyframes v2e090-entree {
  from { transform: translate(-50%, -50%) scale(.2); opacity: 0; }
  to   { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
/* v2e090-03 — boussole de virage : rotation égale à l'angle de changement de cap. */
.constellation-layout .v2e090-boussole {
  position: absolute; width: 14px; height: 2px;
  background: var(--gold-bright, #f4d69e);
  transform-origin: 50% 50%;
  transform: translate(-50%, -50%) rotate(var(--v2e090-angle, 0deg));
  opacity: .85;
}
/* v2e090-04 — aperçu au survol/focus, jamais sur le trait actif de la passe 1. */
.constellation-layout line[data-v2e090-apercu="1"]:not([data-e090-active="1"]) {
  stroke-dasharray: 2 2;
  stroke-opacity: .55;
}
/* v2e090-08 — bascule accessible du mouvement. */
.constellation-layout .v2e090-bascule {
  min-height: 36px; padding: 0 12px;
  border: 1px solid var(--gold, #c9a227); border-radius: 8px;
  background: var(--surface-2, #181818); color: var(--gold-bright, #f4d69e);
  font-size: 11px; cursor: pointer;
}
.constellation-layout .v2e090-bascule:focus-visible {
  outline: 3px solid var(--gold-bright, #f4d69e); outline-offset: 2px;
}
/* v2e090-09 / 10 — textes visibles et région live. */
.constellation-layout .v2e090-legende {
  margin: 8px 0 0; font-size: 10px; line-height: 1.5; color: var(--muted, #aaa);
}
.constellation-layout .v2e090-route {
  margin: 4px 0 0; font-size: 10px; line-height: 1.5; color: var(--muted-2, #bbb);
}
/* Mouvement désactivé par la bascule ou par la préférence système : plus aucune
   animation, mais le trait, la légende et l'itinéraire restent lisibles. */
.constellation-layout[data-v2e090-mouvement="0"] .v2e090-voyageur,
.constellation-layout[data-v2e090-mouvement="0"] .v2e090-neuf,
.constellation-layout[data-v2e090-mouvement="0"] .v2e090-boussole {
  animation: none !important; transform: translate(-50%, -50%);
}
@media (prefers-reduced-motion: reduce) {
  .constellation-layout .v2e090-voyageur,
  .constellation-layout .v2e090-neuf,
  .constellation-layout .v2e090-boussole { animation: none !important; }
}`;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (erreur) { /* silence voulu : aucune écriture dans la console */ }
}

/* Lecture unique des arêtes, avant toute écriture dans le DOM. */
function lireSegments(layout) {
  const noeuds = layout.querySelectorAll('.constellation-edges line.const-edge');
  return Array.prototype.map.call(noeuds, (node, index) => ({
    node,
    index,
    x1: Number(node.getAttribute('x1')) || 0,
    y1: Number(node.getAttribute('y1')) || 0,
    x2: Number(node.getAttribute('x2')) || 0,
    y2: Number(node.getAttribute('y2')) || 0,
    chemin: node.classList.contains('is-path'),
    lune: node.classList.contains('is-moon'),
  }));
}

/* Signature déterministe du chemin : seules les extrémités comptent. */
function signature(segments) {
  return segments.map((s) => `${s.x1},${s.y1},${s.x2},${s.y2}`).join(';');
}

/* Angle orienté d'un segment, en degrés, sans horloge ni aléa. */
function degres(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
}

register('E090', (ctx) => {
  /* Garde d'entrée : aucun ajout DOM sans layout exploitable ni API du registre. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  const css = ctx.css;
  const el = ctx.el;
  const layout = ctx.layout;
  const field = layout.querySelector('.constellation-field') || layout;
  const reduction = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;

  /* Lecture unique : segments, chemin actif, cumul, signature courante. */
  const segments = lireSegments(layout);
  const chemin = segments.filter((s) => s.chemin);
  chemin.forEach((s) => { s.longueur = Math.hypot(s.x2 - s.x1, s.y2 - s.y1); });
  const cumul = chemin.reduce((total, s) => total + s.longueur, 0);
  const courante = signature(chemin);
  const change = signaturePrecedente !== null && signaturePrecedente !== courante;

  css(CSS_ID, CSS);

  /* Infrastructure : calque de décoration unique par rendu, partagé par 03 et 06. */
  let overlay = layout.querySelector(`#${OVERLAY_ID}`);
  if (!overlay) {
    overlay = el('div', 'v2e090-overlay');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('aria-hidden', 'true');
    field.appendChild(overlay);
  }

  /* E090-01 — Cadence pondérée : durée proportionnelle à la longueur du segment. */
  safe(() => {
    chemin.forEach((s) => {
      const poids = cumul > 0 ? (s.longueur / cumul) * 100 : 0;
      const duree = Math.round(220 + poids * 4);
      s.poids = poids;
      s.duree = duree;
      s.node.dataset.v2e090Poids = poids.toFixed(1);
      s.node.dataset.v2e090Duree = String(duree);
      s.node.style.setProperty('--v2e090-duree', `${duree}ms`);
    });
    layout.dataset.v2e090Cadence = chemin.length ? 'ponderee' : 'aucune';
  });

  /* E090-02 — Chaînage par extrémités : prédécesseur, successeur et retard cumulé. */
  safe(() => {
    const meme = (a, b) => Math.abs(a - b) < 0.02;
    chemin.forEach((s, i) => {
      const precedeur = chemin.findIndex((p) => p !== s
        && meme(p.x2, s.x1) && meme(p.y2, s.y1));
      const suivant = chemin.findIndex((n) => n !== s
        && meme(n.x1, s.x2) && meme(n.y1, s.y2));
      s.ordre = i + 1;
      s.precedeur = precedeur;
      s.suivant = suivant;
      s.retard = chemin.slice(0, i).reduce((total, p) => total + (p.duree || 0), 0);
      s.node.dataset.v2e090Ordre = String(i + 1);
      s.node.dataset.v2e090Precedeur = precedeur >= 0 ? String(precedeur + 1) : 'aucun';
      s.node.dataset.v2e090Suivant = suivant >= 0 ? String(suivant + 1) : 'aucun';
      s.node.style.setProperty('--v2e090-retard', `${s.retard}ms`);
    });
    layout.dataset.v2e090Chaine = String(chemin.length);
  });

  /* E090-03 — Virages : angle de changement de cap et boussole aux jonctions. */
  safe(() => {
    let virages = 0;
    chemin.forEach((s, i) => {
      if (i === 0) {
        s.node.dataset.v2e090Virage = '0.0';
        s.node.dataset.v2e090TypeVirage = 'depart';
        return;
      }
      const prec = chemin[i - 1];
      const a1 = degres(prec.x1, prec.y1, prec.x2, prec.y2);
      const a2 = degres(s.x1, s.y1, s.x2, s.y2);
      let delta = a2 - a1;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;
      const type = Math.abs(delta) < 20 ? 'droit' : Math.abs(delta) < 120 ? 'courbe' : 'retour';
      s.virage = delta;
      s.node.dataset.v2e090Virage = delta.toFixed(1);
      s.node.dataset.v2e090TypeVirage = type;
      if (type !== 'droit') virages += 1;
      const identifiant = `v2e090-boussole-${i}`;
      let boussole = layout.querySelector(`#${identifiant}`);
      if (!boussole) {
        boussole = el('span', 'v2e090-boussole');
        boussole.id = identifiant;
        overlay.appendChild(boussole);
      }
      boussole.style.setProperty('--v2e090-angle', `${delta.toFixed(1)}deg`);
      boussole.style.left = `${s.x1.toFixed(2)}%`;
      boussole.style.top = `${s.y1.toFixed(2)}%`;
    });
    layout.dataset.v2e090Virages = String(virages);
  });

  /* E090-04 — Aperçu de connexion au survol et au focus, sans clic ni minuteur. */
  safe(() => {
    const marquer = (cible, actif) => {
      const noeud = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
        ? cible.closest('.const-sun, .const-planet, .const-moon') : null;
      if (!noeud || !field.contains(noeud)) return;
      const x = parseFloat(noeud.style.getPropertyValue('--x'));
      const y = parseFloat(noeud.style.getPropertyValue('--y'));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      let compte = 0;
      segments.forEach((s) => {
        if (!s.chemin && Math.abs(s.x2 - x) < 0.5 && Math.abs(s.y2 - y) < 0.5) {
          s.node.dataset.v2e090Apercu = actif ? '1' : '0';
          compte += 1;
        }
      });
      if (actif) layout.dataset.v2e090Apercu = String(compte);
    };
    const entree = (event) => marquer(event && event.target, true);
    const sortie = (event) => marquer(event && event.target, false);
    field.addEventListener('focusin', entree);
    field.addEventListener('focusout', sortie);
    field.addEventListener('pointerover', entree);
    field.addEventListener('pointerout', sortie);
  });

  /* E090-05 — Différence de chemin entre rendus : segments ajoutés et retirés. */
  safe(() => {
    const precedents = signaturePrecedente ? signaturePrecedente.split(';') : [];
    const actuels = chemin.map((s) => `${s.x1},${s.y1},${s.x2},${s.y2}`);
    let ajoutes = 0;
    chemin.forEach((s, i) => {
      const neuf = !precedents.includes(actuels[i]);
      s.node.dataset.v2e090Delta = neuf ? 'nouveau' : 'stable';
      if (neuf) ajoutes += 1;
    });
    const retires = precedents.filter((p) => !actuels.includes(p)).length;
    layout.dataset.v2e090Ajoutes = String(ajoutes);
    layout.dataset.v2e090Retires = String(retires);
    layout.dataset.v2e090Changement = change ? '1' : '0';
    signaturePrecedente = courante;
  });

  /* E090-06 — Bascule d'entrée : un voyageur par segment, glissement et impulsion. */
  safe(() => {
    chemin.forEach((s, i) => {
      const identifiant = `v2e090-voyageur-${i}`;
      let voyageur = layout.querySelector(`#${identifiant}`);
      if (!voyageur) {
        voyageur = el('span', 'v2e090-voyageur');
        voyageur.id = identifiant;
        overlay.appendChild(voyageur);
      }
      voyageur.className = 'v2e090-voyageur'
        + (s.node.dataset.v2e090Delta === 'nouveau' ? ' v2e090-neuf' : '');
      voyageur.style.setProperty('--v2e090-x1', `${s.x1.toFixed(2)}%`);
      voyageur.style.setProperty('--v2e090-y1', `${s.y1.toFixed(2)}%`);
      voyageur.style.setProperty('--v2e090-x2', `${s.x2.toFixed(2)}%`);
      voyageur.style.setProperty('--v2e090-y2', `${s.y2.toFixed(2)}%`);
      voyageur.style.setProperty('--v2e090-duree', `${s.duree || 400}ms`);
      voyageur.style.setProperty('--v2e090-retard', `${s.retard || 0}ms`);
    });
    layout.dataset.v2e090Voyageurs = String(chemin.length);
  });

  /* E090-07 — Mesure physique : conversion des unités du viewBox en pixels. */
  safe(() => {
    const largeur = field.clientWidth || 0;
    const hauteur = field.clientHeight || 0;
    let totalPx = 0;
    chemin.forEach((s) => {
      const px = Math.hypot((s.x2 - s.x1) / 100 * largeur, (s.y2 - s.y1) / 100 * hauteur);
      s.node.dataset.v2e090Px = px.toFixed(1);
      totalPx += px;
    });
    layout.dataset.v2e090PxTotal = totalPx.toFixed(1);
    layout.dataset.v2e090Echelle = largeur && hauteur ? `${largeur}x${hauteur}` : 'indisponible';
  });

  /* E090-08 — Bascule d'activation du mouvement : contrôle accessible dédié. */
  safe(() => {
    if (mouvementActif === null) mouvementActif = !reduction;
    let bouton = layout.querySelector(`#${BASCULE_ID}`);
    if (!bouton) {
      bouton = el('button', 'v2e090-bascule');
      bouton.id = BASCULE_ID;
      bouton.type = 'button';
      const caption = layout.querySelector('.constellation-caption');
      if (caption && caption.parentNode) caption.parentNode.insertBefore(bouton, caption);
      else layout.appendChild(bouton);
      bouton.addEventListener('click', () => {
        mouvementActif = !mouvementActif;
        layout.dataset.v2e090Mouvement = mouvementActif ? '1' : '0';
        bouton.setAttribute('aria-pressed', mouvementActif ? 'true' : 'false');
        bouton.textContent = mouvementActif
          ? 'Mouvement du chemin : activé' : 'Mouvement du chemin : désactivé';
      });
    }
    layout.dataset.v2e090Mouvement = mouvementActif ? '1' : '0';
    bouton.setAttribute('aria-pressed', mouvementActif ? 'true' : 'false');
    bouton.textContent = mouvementActif
      ? 'Mouvement du chemin : activé' : 'Mouvement du chemin : désactivé';
  });

  /* E090-09 — Légende textuelle : le sens des mouvements, sans couleur seule. */
  safe(() => {
    let legende = layout.querySelector(`#${LEGENDE_ID}`);
    if (!legende) {
      legende = el('p', 'v2e090-legende',
        'Mouvement du chemin : le point qui glisse matérialise la connexion, '
        + 'son retard indique l’ordre du relais, la rotation du repère signale un '
        + 'changement de cap. La couleur ne porte aucune information à elle seule.');
      legende.id = LEGENDE_ID;
      layout.appendChild(legende);
    }
    const deja = field.getAttribute('aria-describedby') || '';
    if (deja.indexOf(LEGENDE_ID) < 0) {
      field.setAttribute('aria-describedby', (deja + ' ' + LEGENDE_ID).trim());
    }
  });

  /* E090-10 — Itinéraire annoncé et bilan consolidé du mouvement. */
  safe(() => {
    const soleil = layout.querySelector('.const-layer-suns .const-sun.is-active');
    const planete = layout.querySelector('.const-layer-planets .const-planet.is-active');
    const lune = layout.querySelector('.const-layer-moons .const-moon.is-active');
    const noms = [soleil, planete, lune]
      .map((n) => (n && n.dataset ? n.dataset.label : ''))
      .filter(Boolean);
    const etapes = noms.length ? noms.join(' → ') : 'aucune sélection';
    let route = layout.querySelector(`#${ROUTE_ID}`);
    if (!route) {
      route = el('p', 'v2e090-route', '');
      route.id = ROUTE_ID;
      route.setAttribute('role', 'status');
      route.setAttribute('aria-live', 'polite');
      route.setAttribute('aria-atomic', 'true');
      layout.appendChild(route);
    }
    route.textContent = `Chemin : ${etapes}.`;
    layout.dataset.v2e090Bilan = [
      `segments=${chemin.length}`,
      `longueur=${cumul.toFixed(2)}`,
      `px=${layout.dataset.v2e090PxTotal || '0'}`,
      `virages=${layout.dataset.v2e090Virages || '0'}`,
      `ajoutes=${layout.dataset.v2e090Ajoutes || '0'}`,
      `retires=${layout.dataset.v2e090Retires || '0'}`,
      `mouvement=${mouvementActif ? 'actif' : 'inactif'}`,
    ].join(';');
  });
});
