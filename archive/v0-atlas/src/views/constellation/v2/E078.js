import { register } from './registry.js';

/* Lentille V2 E078 — instrumentation analytique du survol dans la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau, sans source aléatoire et sans minuteur ni boucle d'animation propre.
   Préfixe exclusif : v2e078 (aucune collision avec les identifiants de la passe
   1). Le module est passif : il écoute le survol en phase capture, lit le DOM
   déjà construit par constellation.js et publie un relevé indexable, sans
   réécrire le rendu ni appeler le routeur. */

const CSS_ID = 'constellation-v2-e078';
const PANEL_ID = 'v2e078-panel';
const LIVE_ID = 'v2e078-live';
const RESET_ID = 'v2e078-reset';
const RING_MAX = 16;

/* État module : survit aux reconstructions complètes du DOM par la coque. */
let layoutCourant = null;
let ecouteursPret = false;
let rendus = 0;

let categories = Object.create(null);
let premier = null;
let dernier = null;
let dernierStamp = null;
let intervalleMin = Infinity;
let intervalleMax = 0;
let intervalleSomme = 0;
let intervalleNombre = 0;
let transitions = [];
let rebonds = 0;
let profondeurs = Object.create(null);
let balises = Object.create(null);
let orphelins = 0;
let visites = Object.create(null);
let couvertes = Object.create(null);
let quadrants = Object.create(null);
let flux = [];

/* Réinitialise l'état analytique ; utilisé par le bouton « Réinitialiser le relevé ». */
function reinitialiser() {
  categories = Object.create(null);
  premier = null;
  dernier = null;
  dernierStamp = null;
  intervalleMin = Infinity;
  intervalleMax = 0;
  intervalleSomme = 0;
  intervalleNombre = 0;
  transitions = [];
  rebonds = 0;
  profondeurs = Object.create(null);
  balises = Object.create(null);
  orphelins = 0;
  visites = Object.create(null);
  couvertes = Object.create(null);
  quadrants = Object.create(null);
  flux = [];
}

/* Horodatage natif de l'événement : aucune horloge créée par la lentille. */
function stampOf(event) {
  return event && typeof event.timeStamp === 'number' && isFinite(event.timeStamp)
    ? event.timeStamp : null;
}

function cleDe(node) {
  return node && node.dataset ? (node.dataset.constKey || '') : '';
}

/* Cible actionable : bouton porteur d'une clé, contenu dans le layout courant. */
function nodeDepuis(event) {
  if (!event || !event.target || event.target.nodeType !== 1) return null;
  if (typeof event.target.closest !== 'function') return null;
  let node = null;
  try { node = event.target.closest('button[data-const-key]'); }
  catch { return null; }
  if (!node || !layoutCourant || typeof layoutCourant.contains !== 'function') return null;
  if (!layoutCourant.contains(node)) return null;
  return node;
}

/* Famille d'une clé : sun:12, planet:4, moon:7, sinon « autre ». */
function familleDe(cle) {
  const prefixe = String(cle || '').split(':')[0];
  if (prefixe === 'sun') return 'soleil';
  if (prefixe === 'planet') return 'planete';
  if (prefixe === 'moon') return 'lune';
  return 'autre';
}

/* Nombre de niveaux entre le nœud et la racine du layout (borné à 32). */
function profondeurDe(node, layout) {
  let niveau = 0;
  let courant = node;
  while (courant && courant !== layout && niveau < 32) {
    courant = courant.parentElement;
    niveau += 1;
  }
  return niveau;
}

/* Quadrant 2×2 du nœud dans le champ, d'après son centre géométrique. */
function quadrantDe(node, layout) {
  if (!node || !layout || typeof node.getBoundingClientRect !== 'function'
      || typeof layout.getBoundingClientRect !== 'function') return 'nd';
  const r = node.getBoundingClientRect();
  const l = layout.getBoundingClientRect();
  if (!(l.width > 0) || !(l.height > 0)) return 'nd';
  const ux = (r.left + r.width / 2 - l.left) / l.width;
  const uy = (r.top + r.height / 2 - l.top) / l.height;
  return (uy < 0.5 ? 'N' : 'S') + (ux < 0.5 ? 'O' : 'E');
}

/* File bornée : on conserve les RING_MAX derniers éléments, rien de plus. */
function pousser(liste, valeur) {
  liste.push(valeur);
  if (liste.length > RING_MAX) liste.splice(0, liste.length - RING_MAX);
}

/* Empreinte FNV-1a 32 bits avec sel explicite, déterministe et reproductible. */
function empreinte(chaine, sel) {
  const texte = String(sel || '') + '|' + String(chaine || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function decimale(valeur) {
  return Number.isFinite(valeur) ? valeur.toFixed(1).replace('.', ',') : '—';
}

/* Panneau de synthèse indexable : section, tableau, région live et bouton.
   Créé au plus une fois par rendu, quel que soit l'état du DOM reçu. */
function panneauDans(layout, el) {
  const existant = layout.querySelector('#' + PANEL_ID);
  if (existant) return existant;

  const panneau = el('section', 'v2e078-panel');
  panneau.id = PANEL_ID;
  panneau.setAttribute('aria-labelledby', 'v2e078-titre');

  panneau.appendChild(el('h2', 'v2e078-titre', 'Relevé analytique du survol'));

  const table = el('table', 'v2e078-table');
  table.appendChild(el('caption', '', 'Dix mesures dérivées des survols de la constellation'));
  const tete = el('thead');
  const ligneTete = el('tr');
  ['Mesure', 'Valeur'].forEach((intitule) => {
    const cellule = el('th', '', intitule);
    cellule.setAttribute('scope', 'col');
    ligneTete.appendChild(cellule);
  });
  tete.appendChild(ligneTete);
  table.appendChild(tete);
  const corps = el('tbody');
  const libelles = [
    ['v2e078-m-categories', 'Familles de cibles'],
    ['v2e078-m-bornes', 'Premier et dernier survol'],
    ['v2e078-m-arrivees', 'Écarts entre survols (ms)'],
    ['v2e078-m-rebonds', 'Oscillations A → B → A'],
    ['v2e078-m-profondeur', 'Profondeur DOM'],
    ['v2e078-m-orphelins', 'Survols orphelins'],
    ['v2e078-m-classement', 'Classement des cibles'],
    ['v2e078-m-couverture', 'Couverture du champ'],
    ['v2e078-m-chaleur', 'Carte de chaleur (quadrants)'],
    ['v2e078-m-flux', 'Flux et empreinte typés'],
  ];
  libelles.forEach(([identifiant, libelle]) => {
    const ligne = el('tr', '');
    ligne.appendChild(el('th', '', libelle));
    const cellule = el('td', '', '—');
    cellule.id = identifiant;
    ligne.appendChild(cellule);
    corps.appendChild(ligne);
  });
  table.appendChild(corps);
  panneau.appendChild(table);

  const live = el('p', 'v2e078-live', '');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  panneau.appendChild(live);

  const reset = el('button', 'v2e078-reset', 'Réinitialiser le relevé');
  reset.id = RESET_ID;
  reset.type = 'button';
  reset.setAttribute('aria-controls', PANEL_ID);
  panneau.appendChild(reset);

  const champ = layout.querySelector('.constellation-field');
  if (champ && champ.parentNode && typeof layout.insertBefore === 'function') {
    champ.parentNode.insertBefore(panneau, champ);
  } else {
    layout.appendChild(panneau);
  }
  return panneau;
}

/* Enregistre un survol valide : toutes les mesures dérivées y sont mises à jour. */
function enregistrerSurvol(cle, node, stamp, layout) {
  /* E078-01 — Famille de la cible : on agrège les survols par soleil/planète/lune. */
  const famille = familleDe(cle);
  categories[famille] = (categories[famille] || 0) + 1;

  /* E078-02 — Bornes de session : premier et dernier survol horodatés. */
  if (!premier) premier = { cle, stamp };
  dernier = { cle, stamp };

  /* E078-03 — Inter-arrivée : écart entre deux survols, min/moyenne/max. */
  if (dernierStamp !== null && stamp !== null) {
    const ecart = Math.max(0, Math.round(stamp - dernierStamp));
    if (ecart < intervalleMin) intervalleMin = ecart;
    if (ecart > intervalleMax) intervalleMax = ecart;
    intervalleSomme += ecart;
    intervalleNombre += 1;
  }
  if (stamp !== null) dernierStamp = stamp;

  /* E078-04 — Oscillation A → B → A : retour à la clé deux transitions plus tôt. */
  if (transitions.length >= 2 && transitions[transitions.length - 2] === cle) rebonds += 1;
  pousser(transitions, cle);

  /* E078-05 — Profondeur DOM et balise de la cible, relevées une seule fois. */
  if (!Object.prototype.hasOwnProperty.call(profondeurs, cle)) {
    profondeurs[cle] = profondeurDe(node, layout);
    balises[cle] = node.tagName ? String(node.tagName).toLowerCase() : '—';
  }

  /* E078-07 — Classement : on tient à jour le compteur utilisé par le top 3. */
  visites[cle] = (visites[cle] || 0) + 1;

  /* E078-08 — Couverture : on mémorise l'ensemble des clés déjà survolées. */
  couvertes[cle] = true;

  /* E078-09 — Carte de chaleur : on compte le survol dans son quadrant. */
  const quadrant = quadrantDe(node, layout);
  quadrants[quadrant] = (quadrants[quadrant] || 0) + 1;

  /* E078-10 — Flux typé entrée/sortie : le signe distingue over de out. */
  pousser(flux, '+' + cle);
}

/* Publication consolidate : attributs data-v2e078-*, tableau et région live. */
function publier(layout) {
  if (!layout || !layout.dataset) return;
  const data = layout.dataset;

  const nsoleil = categories.soleil || 0;
  const nplanete = categories.planete || 0;
  const nlune = categories.lune || 0;
  const nautre = categories.autre || 0;
  const texteCategories = `soleil ${nsoleil} · planète ${nplanete} · lune ${nlune} · autre ${nautre}`;

  const texteBornes = premier
    ? `${premier.cle} → ${dernier.cle}`
    : '—';

  const moyenne = intervalleNombre ? intervalleSomme / intervalleNombre : NaN;
  const texteIntervalles = intervalleNombre
    ? `${decimale(intervalleMin)} / ${decimale(moyenne)} / ${decimale(intervalleMax)}`
    : '—';

  const cles = Object.keys(visites);
  const classes = cles.map((k) => ({ k, n: visites[k] }))
    .sort((a, b) => b.n - a.n || a.k.localeCompare(b.k)).slice(0, 3);
  const texteClassement = classes.length
    ? classes.map((e) => `${e.k}:${e.n}`).join(' · ')
    : '—';

  let sommeProfondeur = 0;
  let baliseDominante = '—';
  cles.forEach((k) => {
    sommeProfondeur += profondeurs[k] || 0;
    if (baliseDominante === '—') baliseDominante = balises[k] || '—';
  });
  const profMoy = cles.length ? sommeProfondeur / cles.length : NaN;
  const texteProfondeur = cles.length
    ? `${decimale(profMoy)} niveaux · balise ${baliseDominante}`
    : '—';

  const total = layout.querySelectorAll
    ? layout.querySelectorAll('button[data-const-key]').length : 0;
  const visitesUniques = Object.keys(couvertes).length;
  const pourcent = total ? Math.round(100 * visitesUniques / total) : 0;
  const texteCouverture = total
    ? `${visitesUniques}/${total} (${pourcent} %)`
    : '—';

  const texteChaleur = ['NO', 'NE', 'SO', 'SE']
    .map((q) => `${q}:${quadrants[q] || 0}`).join(' · ');

  const texteFlux = flux.length ? flux.join('|') : '—';
  const empreinteFlux = empreinte(flux.join('|'), 'v2e078-flux');

  data.v2e078 = 'on';
  data.v2e078Categories = texteCategories;
  data.v2e078Premier = premier ? premier.cle : '';
  data.v2e078Dernier = dernier ? dernier.cle : '';
  data.v2e078Intervalles = texteIntervalles;
  data.v2e078Rebonds = String(rebonds);
  data.v2e078Profondeur = texteProfondeur;
  data.v2e078Orphelins = String(orphelins);
  data.v2e078Top = texteClassement;
  data.v2e078Couverture = texteCouverture;
  data.v2e078Chaleur = texteChaleur;
  data.v2e078Flux = texteFlux;
  data.v2e078Empreinte = empreinteFlux;
  data.v2e078Rendus = String(rendus);

  const valeurs = {
    'v2e078-m-categories': texteCategories,
    'v2e078-m-bornes': texteBornes,
    'v2e078-m-arrivees': texteIntervalles,
    'v2e078-m-rebonds': String(rebonds),
    'v2e078-m-profondeur': texteProfondeur,
    'v2e078-m-orphelins': String(orphelins),
    'v2e078-m-classement': texteClassement,
    'v2e078-m-couverture': texteCouverture,
    'v2e078-m-chaleur': texteChaleur,
    'v2e078-m-flux': `${texteFlux} · empreinte ${empreinteFlux}`,
  };
  Object.keys(valeurs).forEach((id) => {
    const cellule = layout.querySelector('#' + id);
    if (cellule) cellule.textContent = valeurs[id];
  });

  const live = layout.querySelector('#' + LIVE_ID);
  if (live) {
    live.textContent = `Relevé V2 E078 — familles : ${texteCategories} · couverture : `
      + `${texteCouverture} · oscillations : ${rebonds} · orphelins : ${orphelins} · `
      + `empreinte : ${empreinteFlux}.`;
  }
}

/* Survol : on isole d'abord les cibles détachées, puis on enregistre. */
function onOver(event) {
  if (!event || !event.target || event.target.nodeType !== 1) return;
  if (typeof event.target.closest !== 'function') return;
  let node = null;
  try { node = event.target.closest('button[data-const-key]'); }
  catch { return; }
  if (!node) return;
  const cle = cleDe(node);
  if (!cle) return;

  /* E078-06 — Survol orphelin : cible valide mais détachée du layout courant. */
  const dansLayout = layoutCourant && typeof layoutCourant.contains === 'function'
    && layoutCourant.contains(node);
  if (!dansLayout) {
    orphelins += 1;
    if (layoutCourant && layoutCourant.dataset) {
      layoutCourant.dataset.v2e078Orphelins = String(orphelins);
    }
    return;
  }

  const stamp = stampOf(event);
  enregistrerSurvol(cle, node, stamp, layoutCourant);
  publier(layoutCourant);
}

/* Sortie : seul le flux typé est alimenté, sans minuteur ni horloge propre. */
function onOut(event) {
  const node = nodeDepuis(event);
  if (!node) return;
  const cle = cleDe(node);
  if (!cle) return;
  pousser(flux, '-' + cle);
  if (layoutCourant && layoutCourant.dataset) {
    layoutCourant.dataset.v2e078Flux = flux.length ? flux.join('|') : '';
  }
}

register('E078', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;

  layoutCourant = layout;
  rendus += 1;

  /* Feuille unique de la lentille, injectée une seule fois par cssOnce. */
  css(CSS_ID, `
    .constellation-layout #${PANEL_ID} {
      margin: 10px 0 4px; padding: 8px 10px;
      border: 1px solid var(--line); border-radius: 8px;
      background: rgba(255,255,255,.02); color: var(--ink-soft);
      font-family: var(--sans, inherit);
    }
    #v2e078-titre {
      margin: 0 0 5px; font-size: 10px; font-weight: 600;
      letter-spacing: .08em; text-transform: uppercase; color: var(--gold);
    }
    #v2e078-panel .v2e078-table {
      border-collapse: collapse; width: 100%; margin: 3px 0 6px; font-size: 9px;
    }
    #v2e078-panel .v2e078-table caption {
      text-align: left; margin-bottom: 3px; color: var(--gold); font-size: 9px;
    }
    #v2e078-panel .v2e078-table th,
    #v2e078-panel .v2e078-table td {
      border: 1px solid var(--line); padding: 2px 4px;
      text-align: left; line-height: 1.4; color: var(--muted-2);
      font-variant-numeric: tabular-nums;
    }
    #v2e078-panel .v2e078-table th { font-weight: 600; color: var(--gold-bright); }
    #v2e078-panel .v2e078-live {
      margin: 3px 0 0; font-size: 9px; line-height: 1.5;
      color: var(--gold-bright); font-variant-numeric: tabular-nums;
    }
    #${RESET_ID} {
      min-height: 36px; min-width: 44px; margin-top: 6px; padding: 0 12px;
      border: 1px solid var(--gold); border-radius: 8px;
      background: var(--surface-2); color: var(--gold-bright);
      font-size: 10px; cursor: pointer;
    }
    #${RESET_ID}:focus-visible {
      outline: 3px solid var(--gold-bright); outline-offset: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      #${PANEL_ID} * { transition: none !important; animation: none !important; }
    }
  `);

  /* Écouteurs de capture installés une seule fois pour toute la session. */
  if (!ecouteursPret && typeof document.addEventListener === 'function') {
    document.addEventListener('mouseover', onOver, true);
    document.addEventListener('mouseout', onOut, true);
    ecouteursPret = true;
  }

  /* Fabrique d'éléments : ctx.el d'abord, repli local sur document.createElement. */
  const faire = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, className, texte) => {
        const n = document.createElement(tag);
        if (className) n.className = className;
        if (texte !== undefined) n.textContent = texte;
        return n;
      };

  /* Panneau, région live et bouton : un seul jeu créé pour ce rendu. */
  const panneau = panneauDans(layout, faire);
  if (!panneau) return;

  const reset = panneau.querySelector('#' + RESET_ID);
  if (reset && !reset.dataset.v2e078Lie) {
    reset.dataset.v2e078Lie = '1';
    reset.addEventListener('click', () => {
      reinitialiser();
      publier(layoutCourant);
    });
  }

  publier(layout);
});
