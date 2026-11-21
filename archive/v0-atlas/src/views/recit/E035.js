import { register } from './registry.js';

/* Lentille E035 — « Accessibilité ARIA et lecteurs d'écran » de la vue Récit.
 *
 * Dix chantiers (E035-01 … E035-10) appliqués sur le DOM déjà assemblé par
 * renderRecit(stage), qui appelle runEnhancements({ viewId:'recit', stage,
 * layout }) en fin de fonction. La lentille n'écrit ni dans recit.js, ni dans
 * le jeu de données, ni dans l'état partagé : elle n'ajoute que des titres,
 * des relations ARIA et des notes textuelles, sans jamais retirer de contenu.
 * Sans JavaScript, la vue reste donc parfaitement lisible et navigable.
 *
 * Elle se distingue volontairement des lentilles E005 et E015, qui traitent
 * déjà les liens d'évitement, la barre de progression, les rôles de liste, le
 * repère de lecture, la certitude textuelle et l'aide clavier : E035 couvre
 * la hiérarchie des titres, la langue, les relations de contrôle et de
 * position du fil, l'aide à la recherche, la traçabilité, les groupes de
 * filtres, l'état de lecture, le média absent et le lien vers la légende.
 *
 * Contrat respecté : un seul register('E035', …), un seul css('recit-e035', …),
 * classes préfixées recit-e035-, identifiants créés préfixés e035- et uniques,
 * français partout, aucun appel console, aucune requête réseau, aucun aléa.
 * Chaque chantier est isolé : sa défaillance est neutralisée sans interrompre
 * les suivants ni le rendu de la vue.
 */

const STYLE_ID = 'recit-e035';
const API = { el: null };

const RULES = `
.recit-e035-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
.recit-e035-note{margin:0}
.recit-layout[data-e035-motion="reduce"] .recit-e035-section-title,
.recit-layout[data-e035-motion="reduce"] .recit-e035-note{transition:none!important;animation:none!important}
`;

/* Un chantier défaillant ne peut toucher ni les autres chantiers ni la vue. */
function safe(fn) {
  try { return fn(); } catch { return null; }
}

function one(root, selector) {
  return safe(() => (root && typeof root.querySelector === 'function')
    ? root.querySelector(selector) : null);
}

function all(root, selector) {
  return safe(() => (root && typeof root.querySelectorAll === 'function')
    ? Array.from(root.querySelectorAll(selector)) : []) || [];
}

function make(tag, className, text) {
  if (API.el && typeof API.el === 'function') return API.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Pose un attribut seulement s'il n'existe pas déjà : aucun enrichissement
   ne peut écraser une valeur posée par la coque ou par une autre lentille. */
function setOnce(node, name, value) {
  if (node && node.nodeType === 1 && !node.hasAttribute(name)) node.setAttribute(name, value);
}

/* Ajoute un jeton à une liste d'identifiants sans écraser les valeurs déjà
   présentes ni introduire de doublon. */
function addToken(node, name, token) {
  if (!node || !token || node.nodeType !== 1) return;
  const tokens = (node.getAttribute(name) || '').split(/\s+/).filter(Boolean);
  if (tokens.indexOf(token) >= 0) return;
  tokens.push(token);
  node.setAttribute(name, tokens.join(' '));
}

/* Reprend l'identifiant existant d'un nœud ou lui en attribue un, une seule
   fois : aucun identifiant en double n'est introduit dans le document. */
function idOf(node, wanted) {
  if (!node || node.nodeType !== 1 || !wanted) return null;
  if (!node.id) node.id = wanted;
  return node.id || null;
}

/* Conteneur discret unique pour les notes uniquement destinées aux lecteurs
   d'écran. Il vit dans .recit-body : les notes restent donc annonçables même
   lorsque le mode diagnostic masque les greffons suspendus. */
function ensureAides(body) {
  const existant = one(body, '#e035-aides');
  if (existant) return existant;
  if (!body || typeof body.appendChild !== 'function') return null;
  const aides = make('div', 'recit-e035-sr-only');
  aides.id = 'e035-aides';
  body.appendChild(aides);
  return aides;
}

/* E035-01 — Navigation par titres. La vue ne possède qu'un <h1> : les lecteurs
   d'écran ne peuvent pas utiliser leur liste de titres pour sauter d'une
   section à l'autre. On insère des <h2> visuellement masqués, un par section,
   sans modifier le texte visible ni la structure des sections. */
function titresDeSection(body) {
  const sections = [
    ['.recit-thread', 'e035-titre-fil', 'Fil du repère'],
    ['details.recit-trace', 'e035-titre-trace', 'Traçabilité et sources'],
    ['.recit-sources', 'e035-titre-sources', 'Sources du point'],
    ['.recit-actions', 'e035-titre-commandes', 'Commandes de lecture'],
    ['.recit-legend', 'e035-titre-legende', 'Légende et aide à la lecture'],
  ];
  sections.forEach(([selecteur, identifiant, libelle]) => {
    const section = one(body, selecteur);
    if (!section || one(document, `#${identifiant}`)) return;
    const titre = make('h2', 'recit-e035-sr-only recit-e035-section-title', libelle);
    titre.id = identifiant;
    /* Le résumé doit rester le premier enfant d'un <details> : le titre est
       donc inséré juste après lui, jamais avant. */
    const resume = section.tagName === 'DETAILS' ? one(section, 'summary') : null;
    const point = resume && resume.nextSibling ? resume.nextSibling : section.firstChild;
    section.insertBefore(titre, point || null);
  });
}

/* E035-02 — Langue de lecture. Sans indication de langue sur le contenu, un
   synthétiseur vocal peut appliquer une prononciation erronée aux titres et
   aux notes. On déclare le français sur le conteneur de la vue, sans toucher
   à la langue du document ni à celle des autres vues. */
function langueFrancaise(layout) {
  if (layout && layout.nodeType === 1) setOnce(layout, 'lang', 'fr');
}

/* E035-03 — Portée des boutons du fil. Chaque point du fil met à jour la zone
   de lecture : aria-controls rend cette relation explicite pour un lecteur
   d'écran, qui peut alors annoncer « contrôle le point courant ». */
function controlesDuFil(body) {
  const titre = one(document, '#recit-point-title') || one(body, '.recit-title');
  const cible = idOf(titre, 'recit-point-title');
  if (!cible) return;
  all(body, '.recit-thread-item').forEach((bouton) => {
    setOnce(bouton, 'aria-controls', cible);
  });
}

/* E035-04 — Position dans l'ensemble. Les attributs aria-posinset et
   aria-setsize donnent au lecteur d'écran la place exacte de chaque élément
   du fil, calculée depuis le DOM réel et non depuis une valeur inventée. */
function positionsDuFil(body) {
  all(body, '.recit-thread-list').forEach((liste) => {
    const items = all(liste, 'li');
    const total = items.length;
    if (!total) return;
    items.forEach((item, index) => {
      setOnce(item, 'aria-posinset', String(index + 1));
      setOnce(item, 'aria-setsize', String(total));
    });
  });
}

/* E035-05 — Aide à la recherche. Le champ sait déjà combien de points sont
   affichés (compte annoncé par la coque) ; on lui adjoint une instruction
   stable rappelant que les critères se cumulent et comment parcourir le fil.
   Le jeton est ajouté à aria-describedby, jamais substitué. */
function aideRecherche(body) {
  const recherche = one(body, '#c3a-search');
  if (!recherche) return;
  const aides = ensureAides(body);
  if (!aides) return;
  if (!one(body, '#e035-search-help')) {
    const note = make('p', 'recit-e035-note',
      'La recherche, le type et la certitude se cumulent ; le nombre de points affichés est annoncé séparément. Dans le fil, les flèches haut et bas parcourent les points, Entrée sélectionne un point, Début et Fin vont aux extrémités.');
    note.id = 'e035-search-help';
    aides.appendChild(note);
  }
  addToken(recherche, 'aria-describedby', 'e035-search-help');
}

/* E035-06 — Traçabilité et sources. Le résumé replié garde son libellé visible
   (qui contient le nombre de références) et reçoit une description rappelant
   que les identifiants sont locaux. Le cas « aucune source » est, lui, marqué
   comme note : les deux états sont désormais annonçables de la même façon. */
function tracabilite(body) {
  const aides = ensureAides(body);
  const details = one(body, 'details.recit-trace');
  if (details) {
    const resume = one(details, 'summary');
    if (resume) {
      if (aides && !one(body, '#e035-trace-help')) {
        const note = make('p', 'recit-e035-note',
          'Cette section repliée contient les identifiants de source du point courant, repris tels quels du jeu de données local, sans lien externe.');
        note.id = 'e035-trace-help';
        aides.appendChild(note);
      }
      addToken(resume, 'aria-describedby', 'e035-trace-help');
    }
  }
  const sources = one(body, '.recit-sources');
  if (sources && sources.nodeType === 1) {
    setOnce(sources, 'role', 'note');
    setOnce(sources, 'aria-label', 'Sources : aucun identifiant attaché à ce point');
  }
}

/* E035-07 — Groupes de filtres. L'intitulé visible devient la source du nom
   accessible du groupe : le libellé annoncé suit toujours ce qui est affiché.
   L'aria-label posé par la coque demeure intact comme repli. */
function groupesFiltres(body) {
  all(body, '.c3a-group').forEach((groupe, index) => {
    const etiquette = one(groupe, '.c3a-group-label');
    if (!etiquette || groupe.hasAttribute('aria-labelledby')) return;
    const identifiant = idOf(etiquette, `e035-groupe-label-${index + 1}`);
    if (identifiant) setOnce(groupe, 'aria-labelledby', identifiant);
  });
}

/* E035-08 — État de la lecture automatique. Le symbole ▶ / ❚❚ est décoratif
   et l'état « en cours » n'est pas audible : une note textuelle, reconstruite
   à chaque rendu depuis aria-pressed, décrit l'état réel du bouton. Aucune
   région live supplémentaire n'est créée. */
function etatLecture(body) {
  const lecture = one(body, '.recit-play') || one(body, '.recit-actions button[aria-pressed]');
  if (!lecture) return;
  const aides = ensureAides(body);
  if (!aides) return;
  let note = one(body, '#e035-play-state');
  if (!note) {
    note = make('p', 'recit-e035-note', '');
    note.id = 'e035-play-state';
    aides.appendChild(note);
  }
  const enCours = lecture.getAttribute('aria-pressed') === 'true';
  note.textContent = enCours
    ? 'Lecture automatique en cours.'
    : 'Lecture automatique en pause.';
  addToken(lecture, 'aria-describedby', 'e035-play-state');
}

/* E035-09 — Média absent. Lorsque le repère n'a pas d'image vérifiée, un
   message visible existe déjà ; lui donner un rôle de note et un nom explicite
   permet de l'annoncer comme information plutôt que comme texte isolé. */
function mediaVide(layout) {
  const media = one(layout, '.recit-media');
  if (!media) return;
  const vide = one(media, '.media-empty');
  if (!vide || vide.nodeType !== 1) return;
  setOnce(vide, 'role', 'note');
  setOnce(vide, 'aria-label', 'Aucune illustration vérifiée pour ce repère');
}

/* E035-10 — Lien vers la légende. aria-details associe les commandes à la
   légende détaillée, qui contient la signification des symboles de certitude
   et des types de points. L'identifiant est réutilisé s'il existe déjà. */
function detailsLegende(body) {
  const actions = one(body, '.recit-actions');
  const legende = one(body, '.recit-legend');
  if (!actions || !legende) return;
  const identifiant = idOf(legende, 'e035-legende');
  if (identifiant) setOnce(actions, 'aria-details', identifiant);
}

/* Les lentilles sont appliquées dans l'ordre du registre : une lentille
   postérieure peut réécrire un attribut aria-describedby avec setAttribute.
   Une passe différée, sans nouvel écouteur, réaffirme nos jetons en conservant
   ceux des autres lentilles. Elle ne touche qu'un DOM encore connecté. */
function reaffirmerRelations(body) {
  const search = one(body, '#c3a-search');
  if (search && search.isConnected !== false) addToken(search, 'aria-describedby', 'e035-search-help');
  const resume = one(body, 'details.recit-trace summary');
  if (resume && resume.isConnected !== false) addToken(resume, 'aria-describedby', 'e035-trace-help');
  const lecture = one(body, '#e035-play-state') && one(body, '.recit-play');
  if (lecture && lecture.isConnected !== false) addToken(lecture, 'aria-describedby', 'e035-play-state');
  const cible = one(document, '#recit-point-title');
  if (cible && cible.id) {
    all(body, '.recit-thread-item').forEach((bouton) => {
      if (bouton.isConnected !== false) addToken(bouton, 'aria-controls', cible.id);
    });
  }
}

register('E035', (ctx) => {
  const contexte = ctx || {};
  const { stage, layout, css, el, reducedMotion } = contexte;
  if (typeof document === 'undefined' || !stage || !layout || typeof layout.querySelector !== 'function') return;

  API.el = typeof el === 'function' ? el : null;
  safe(() => { if (typeof css === 'function') css(STYLE_ID, RULES); });

  let reduit = false;
  try { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduit = false; }
  safe(() => { if (layout.nodeType === 1) layout.setAttribute('data-e035-motion', reduit ? 'reduce' : 'full'); });

  const body = one(layout, '.recit-body');
  if (!body) return;

  const taches = [
    () => titresDeSection(body),
    () => langueFrancaise(layout),
    () => controlesDuFil(body),
    () => positionsDuFil(body),
    () => aideRecherche(body),
    () => tracabilite(body),
    () => groupesFiltres(body),
    () => etatLecture(body),
    () => mediaVide(layout),
    () => detailsLegende(body),
  ];
  taches.forEach((tache) => safe(tache));
  safe(() => {
    const differe = () => {
      if (body.isConnected === false) return;
      safe(() => reaffirmerRelations(body));
    };
    if (typeof queueMicrotask === 'function') queueMicrotask(differe);
    else differe();
  });
});
