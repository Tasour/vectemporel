import { register } from './registry.js';

/* Lentille E025 — Accessibilité ARIA et lecteurs d'écran (vue Récit).
   Dix chantiers indépendants, tous non destructifs et silencieux. Aucun
   fichier partagé n'est modifié ; l'enrichissement s'applique après le rendu
   et reste sans effet si le JavaScript est désactivé. */

let fabriquer = null;       // ctx.el, mémorisé pour les helpers.
let regies = null;          // conteneur persistant des régions live, hors #app.
let docEcoute = false;      // écouteurs document posés une seule fois.
let clavierActif = false;   // distingue déplacement clavier / clic souris.
let focusLive = null;       // pointeur courant vers la région de cap du fil.

/* Conteneur sans identifiant, donc non marqué par le tiroir de diagnostic
   (_diagnostics.js ne cible que les nœuds portant un id). Il vit dans <body>,
   hors du stage reconstruit à chaque rendu : les annonces survivent au rendu. */
function obtenirRegies() {
  try {
    if (regies && regies.isConnected) return regies;
    const conteneur = document.createElement('div');
    conteneur.className = 'recit-e025-sr';
    document.body.appendChild(conteneur);
    regies = conteneur;
    return conteneur;
  } catch {
    return null;
  }
}

function corpsDe(layout) {
  return layout.querySelector('.recit-body') || layout;
}

/* Paragraphe masqué visuellement, rattaché à la vue courante. */
function description(layout, id, texte) {
  try {
    const present = layout.querySelector(`#${id}`);
    if (present) {
      present.textContent = texte;
      return present;
    }
    const noeud = fabriquer('p', 'recit-e025-sr', texte);
    noeud.id = id;
    corpsDe(layout).appendChild(noeud);
    return noeud;
  } catch {
    return null;
  }
}

/* Région live persistante, hors du stage. */
function regionVive(id) {
  try {
    const conteneur = obtenirRegies();
    if (!conteneur) return null;
    const present = conteneur.querySelector(`#${id}`);
    if (present) return present;
    const noeud = fabriquer('p', 'recit-e025-sr');
    noeud.id = id;
    noeud.setAttribute('role', 'status');
    noeud.setAttribute('aria-live', 'polite');
    noeud.setAttribute('aria-atomic', 'true');
    conteneur.appendChild(noeud);
    return noeud;
  } catch {
    return null;
  }
}

/* Ajoute une référence sans écraser une description déjà posée par la vue. */
function ajouterDescr(noeud, id) {
  if (!noeud || !id) return;
  const courant = noeud.getAttribute('aria-describedby') || '';
  if (courant.split(/\s+/).includes(id)) return;
  noeud.setAttribute('aria-describedby', (courant + ' ' + id).trim());
}

function elementCible(cible) {
  return typeof Element !== 'undefined' && cible instanceof Element;
}

function essai(fn) {
  try {
    fn();
  } catch {
    /* Un chantier défaillant est neutralisé sans casser les autres ni le rendu. */
  }
}

/* E025-01 — La barre de progression devient un composant ARIA lisible. */
function progression(layout) {
  const barre = layout.querySelector('.recit-progress');
  if (!barre) return;
  const remplissage = barre.querySelector('span');
  if (remplissage) remplissage.setAttribute('aria-hidden', 'true');

  let pourcent = 0;
  if (remplissage && remplissage.style) {
    const brut = parseInt(String(remplissage.style.width || '').replace('%', ''), 10);
    if (Number.isFinite(brut)) pourcent = Math.max(0, Math.min(100, brut));
  }

  const kicker = layout.querySelector('.view-kicker');
  const texte = kicker ? (kicker.textContent || '') : '';
  const mesures = /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(texte);
  const courant = mesures ? Number(mesures[1]) : null;
  const total = mesures ? Number(mesures[2]) : null;
  if (!pourcent && courant !== null && total > 0) {
    pourcent = Math.round((courant / total) * 100);
  }

  barre.setAttribute('role', 'progressbar');
  barre.setAttribute('aria-label', 'Progression de la lecture du récit');
  barre.setAttribute('aria-valuemin', '0');
  barre.setAttribute('aria-valuemax', '100');
  barre.setAttribute('aria-valuenow', String(pourcent));
  if (courant !== null && total !== null) {
    barre.setAttribute('aria-valuetext', `Point ${courant} sur ${total}, ${pourcent} pour cent parcourus`);
  }
}

/* E025-02 — Le titre porte une description vocale persistante du rang,
   du type et de la certitude, en plus de celle du premier point. */
function titreDescrit(layout) {
  const titre = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
  if (!titre) return;
  const kicker = layout.querySelector('.view-kicker');
  const texte = kicker ? (kicker.textContent || '') : '';
  const mesures = /Étape\s+(\d+)\s*\/\s*(\d+)/.exec(texte);
  const type = /·\s*([^·]+)\s*$/.exec(texte);
  const conf = layout.querySelector('.recit-conf');
  const morceaux = [];
  if (mesures) morceaux.push(`Point ${mesures[1]} sur ${mesures[2]}`);
  if (type) morceaux.push(`type ${type[1].trim()}`);
  if (conf) {
    const libelle = (conf.textContent || '').trim().replace(/^[^A-Za-zÀ-ÿ]+/, '');
    if (libelle) morceaux.push(`certitude ${libelle}`);
  }
  if (!morceaux.length) return;
  const desc = description(layout, 'e025-title-desc', `${morceaux.join(', ')}.`);
  if (desc) ajouterDescr(titre, 'e025-title-desc');
}

/* E025-03 — Une région live distincte annonce les bascules de lecture
   automatique, sans toucher à #atlas-recit-live (dédié au changement de point). */
function lectureVive(layout) {
  const region = regionVive('e025-play-live');
  const bouton = layout.querySelector('.recit-play');
  if (!region || !bouton) return;
  layout.addEventListener('click', (event) => {
    try {
      const cible = elementCible(event.target) ? event.target.closest('.recit-play') : null;
      if (!cible || !layout.contains(cible)) return;
      const actif = cible.getAttribute('aria-pressed') === 'true';
      region.textContent = actif
        ? 'Lecture automatique mise en pause.'
        : 'Lecture automatique activée.';
    } catch {
      /* annonce best-effort */
    }
  }, true);
}

/* E025-04 — Deux points de repère nommés pour la navigation par landmarks. */
function regions(layout) {
  const media = layout.querySelector('.recit-media');
  if (media && !media.hasAttribute('role')) {
    media.setAttribute('role', 'region');
    media.setAttribute('aria-label', 'Illustration du repère');
  }
  const corps = layout.querySelector('.recit-body');
  if (corps && !corps.hasAttribute('role')) {
    corps.setAttribute('role', 'region');
    corps.setAttribute('aria-label', 'Récit guidé, contenu du repère');
  }
}

/* E025-05 — Le symbole de certitude est relié à la légende déjà présente,
   plutôt que de doubler le texte dans un paragraphe fantôme. */
function certitudeDecrite(layout) {
  const chip = layout.querySelector('.recit-conf');
  if (!chip) return;
  let cle = layout.querySelector('#e025-legend-conf');
  if (!cle) {
    const paragraphes = layout.querySelectorAll('.recit-legend p');
    for (const paragraphe of paragraphes) {
      if (/Degrés de certitude/.test(paragraphe.textContent || '')) {
        cle = paragraphe;
        break;
      }
    }
    if (cle && !cle.id) cle.id = 'e025-legend-conf';
  }
  if (cle) {
    ajouterDescr(chip, 'e025-legend-conf');
    return;
  }
  const secours = description(layout, 'e025-conf-key',
    'Symbole de certitude : coche pour vérifié, carré pour certain, demi-cercle pour probable, approximation pour contesté.');
  if (secours) ajouterDescr(chip, 'e025-conf-key');
}

/* E025-06 — Le groupe de commandes devient une barre d'outils nommée dont
   l'aide reprend les raccourcis réellement exposés par les boutons. */
function barreOutils(layout) {
  const actions = layout.querySelector('.recit-actions');
  if (!actions) return;
  actions.setAttribute('role', 'toolbar');
  actions.setAttribute('aria-label', 'Commandes de lecture du récit');
  actions.setAttribute('aria-orientation', 'horizontal');

  const raccourcis = [];
  actions.querySelectorAll('button').forEach((bouton) => {
    const raccourci = bouton.getAttribute('aria-keyshortcuts');
    if (raccourci) raccourcis.push(raccourci.split(/\s+/).join(' ou '));
    if (!bouton.hasAttribute('aria-label')) {
      const titre = bouton.getAttribute('title');
      if (titre) bouton.setAttribute('aria-label', titre);
    }
  });
  if (!raccourcis.length) return;
  const aide = description(layout, 'e025-actions-help',
    `Commandes de lecture. Raccourcis présents : ${raccourcis.join(' ; ')}.`);
  if (aide) ajouterDescr(actions, 'e025-actions-help');
}

/* E025-07 — Lien d'évitement clavier vers le point courant, révélé au focus. */
function evasion(layout, reducedMotion) {
  const titre = layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
  if (!titre || layout.querySelector('#e025-skip')) return;
  const bouton = fabriquer('button', 'recit-e025-skip', 'Aller au point courant');
  bouton.type = 'button';
  bouton.id = 'e025-skip';
  bouton.addEventListener('click', () => {
    try {
      titre.focus({ preventScroll: reducedMotion() });
    } catch {
      titre.focus();
    }
  });
  const corps = corpsDe(layout);
  corps.insertBefore(bouton, corps.firstChild);
}

/* E025-08 — Les touches de parcours du fil sont exposées aux technologies
   d'assistance sur chaque item et via une aide attachée à la navigation. */
function aideFil(layout) {
  const nav = layout.querySelector('.recit-thread');
  if (!nav) return;
  nav.querySelectorAll('.recit-thread-item').forEach((item) => {
    if (!item.hasAttribute('aria-keyshortcuts')) {
      item.setAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown Home End');
    }
  });
  const aide = description(layout, 'e025-thread-help',
    'Fil du repère : les flèches haut et bas parcourent les points affichés, Début et Fin vont aux extrémités, Entrée ouvre le point sélectionné.');
  if (aide) ajouterDescr(nav, 'e025-thread-help');
}

/* E025-09 — Annonce du cap lorsque le focus entre dans le fil, uniquement
   après un déplacement clavier (jamais sur un clic de souris). */
function capFil(layout) {
  const region = regionVive('e025-focus-live');
  if (!region) return;
  focusLive = region;
  if (!docEcoute && typeof document !== 'undefined') {
    docEcoute = true;
    document.addEventListener('pointerdown', () => { clavierActif = false; }, true);
    document.addEventListener('keydown', (event) => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey) clavierActif = true;
    }, true);
  }
  layout.addEventListener('focusin', (event) => {
    try {
      if (!clavierActif || !focusLive || !focusLive.isConnected) return;
      const cible = elementCible(event.target) ? event.target.closest('.recit-thread-item') : null;
      if (!cible || !layout.contains(cible)) return;
      const nom = (cible.getAttribute('aria-label') || cible.textContent || '').trim();
      focusLive.textContent = `Fil : ${nom}. Entrée ouvre ce point.`;
    } catch {
      /* annonce best-effort */
    }
  });
}

/* E025-10 — Sémantique de note pour la légende et l'état des sources,
   nom explicite du résumé de traçabilité, et mode de mouvement consigné. */
function notesEtMouvement(layout, reducedMotion) {
  const legend = layout.querySelector('.recit-legend');
  if (legend && !legend.hasAttribute('role')) {
    legend.setAttribute('role', 'note');
    legend.setAttribute('aria-label', 'Légende des symboles et des raccourcis');
  }
  const sources = layout.querySelector('.recit-sources');
  if (sources && !sources.hasAttribute('role')) {
    sources.setAttribute('role', 'note');
    sources.setAttribute('aria-label', 'État des sources du point');
  }
  const trace = layout.querySelector('.recit-trace');
  if (trace) {
    const resume = trace.querySelector('summary');
    if (resume && !resume.hasAttribute('aria-label')) {
      const base = (resume.textContent || '').trim();
      resume.setAttribute('aria-label', `${base}. Identifiants locaux, sans lien externe.`);
    }
  }
  layout.setAttribute('data-e025-motion', reducedMotion() ? 'reduced' : 'full');
}

const CSS = `
.recit-e025-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.recit-e025-skip{position:absolute;left:-9999px;top:0;z-index:60;min-height:36px;padding:6px 12px;border:1px solid var(--gold,#e6b96f);border-radius:8px;background:rgba(12,16,24,.96);color:#f5e9d0;font:inherit;font-size:11px;cursor:pointer}
.recit-e025-skip:focus{left:8px;top:8px}
.recit-e025-skip:focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.recit-e025-skip{transition:none}}
`;

register('E025', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  css('recit-e025', CSS);
  fabriquer = el || ((tag, cls, texte) => {
    const noeud = document.createElement(tag);
    if (cls) noeud.className = cls;
    if (texte !== undefined) noeud.textContent = texte;
    return noeud;
  });
  const racineValide = layout && (layout.isConnected || (stage && stage.isConnected));
  if (!racineValide || typeof document === 'undefined') return;

  [
    progression,
    titreDescrit,
    lectureVive,
    regions,
    certitudeDecrite,
    barreOutils,
    evasion,
    aideFil,
    capFil,
    notesEtMouvement,
  ].forEach((chantier) => {
    essai(() => chantier(layout, reducedMotion));
  });
});
