import { register } from './registry.js';

/* V2 lentille E035 — « Accessibilité ARIA et lecteurs d'écran » (second regard).
 *
 * La passe 1 du même numéro couvre déjà : titres de section masqués, langue de
 * lecture, aria-controls du fil, aria-posinset/aria-setsize, aide à la
 * recherche, traçabilité, groupes de filtres, état de lecture, média absent et
 * lien de la légende depuis les commandes. Cette V2 propose DIX chantiers
 * neufs et distincts, tous centrés sur les relations et les noms accessibles
 * encore absents, et tous dérivés du DOM réellement rendu :
 *
 *   E035-01 résumé du point associé au <h1> (aria-describedby)
 *   E035-02 commandes nommées et comptées (role=group + aria-label)
 *   E035-03 glossaire de certitude audible (aria-describedby de la pastille)
 *   E035-04 raccourcis du fil annoncés (aria-keyshortcuts)
 *   E035-05 média avec image nommé comme figure (role=figure + aria-label)
 *   E035-06 compte des filtres actifs (note + aria-describedby du statut)
 *   E035-07 navigation de point → aria-controls du titre
 *   E035-08 titre → aria-details de la légende
 *   E035-09 raccourcis de lecture audibles (note + aria-describedby du play)
 *   E035-10 légende groupée et comptée (role=group + aria-label)
 *
 * Greffon strictement additif : aucun texte retiré, aucun gestionnaire
 * ré-attribué, aucun attribut existant écrasé (setOnce / addToken), aucun
 * fichier partagé modifié. Les identifiants créés portent tous le préfixe
 * v2-e035- (jamais e035- : la passe 1 tourne sur le MÊME DOM). Une seule feuille
 * de style, posée par un unique appel css() regroupant toutes les règles.
 * Zéro réseau, zéro console, zéro aléa. Chaque chantier est isolé par safe().
 */

const CSS = `
.recit-v2-e035-sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
.recit-v2-e035-note{margin:0;transition:opacity .18s linear}
.recit-layout[data-v2-e035-motion="reduce"] .recit-v2-e035-note{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e035-note{transition:none}}
`;

const API = { el: null };
const ID_AIDES = 'v2-e035-aides';

/* Un chantier défaillant ne peut toucher ni les autres ni la vue. */
function safe(fn) {
  try { return fn(); } catch { return null; }
}

/* Vrai nœud d'élément (nodeType 1) : écarte textes et commentaires. */
function presente(node) {
  return !!(node && node.nodeType === 1);
}

function un(root, selector) {
  return safe(() => (root && typeof root.querySelector === 'function')
    ? root.querySelector(selector) : null);
}

function tous(root, selector) {
  return safe(() => (root && typeof root.querySelectorAll === 'function')
    ? Array.from(root.querySelectorAll(selector)) : []) || [];
}

function texte(node) {
  return String((node && node.textContent) || '');
}

function cree(tag, className, text) {
  if (API.el && typeof API.el === 'function') return API.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/* Pose un attribut seulement s'il est absent : coque et passe 1 intactes. */
function setOnce(node, name, value) {
  if (!presente(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute(name)) return;
  try { node.setAttribute(name, String(value)); } catch { /* attribut facultatif */ }
}

/* Ajoute un jeton à une liste d'identifiants sans écraser ni doubler. */
function addToken(node, name, token) {
  if (!presente(node) || !token) return;
  const tokens = (node.getAttribute(name) || '').split(/\s+/).filter(Boolean);
  if (tokens.indexOf(token) >= 0) return;
  tokens.push(token);
  try { node.setAttribute(name, tokens.join(' ')); } catch { /* facultatif */ }
}

/* Reprend l'identifiant existant d'un nœud ou lui en attribue un, une seule
   fois : jamais de doublon, jamais d'écrasement d'un id de la passe 1. */
function idOf(node, wanted) {
  if (!presente(node) || !wanted) return null;
  if (!node.id) {
    try { node.id = wanted; } catch { return null; }
  }
  return node.id || null;
}

/* Conteneur discret unique des notes lecteur d'écran, dans .recit-body pour
   rester annonçable même quand le mode diagnostic masque les greffons. */
function assureAides(corps) {
  const existant = un(document, `#${ID_AIDES}`) || un(corps, `#${ID_AIDES}`);
  if (existant) return existant;
  if (!corps || typeof corps.appendChild !== 'function') return null;
  const aides = cree('div', 'recit-v2-e035-sr-only');
  aides.id = ID_AIDES;
  corps.appendChild(aides);
  return aides;
}

/* Dépose (ou réutilise) une note <p>, reconstruite à chaque rendu. */
function note(id, contenu, aides) {
  let node = un(document, `#${id}`);
  if (!node) {
    node = cree('p', 'recit-v2-e035-note recit-v2-e035-sr-only', contenu);
    node.id = id;
    if (aides && typeof aides.appendChild === 'function') aides.appendChild(node);
  } else {
    node.textContent = contenu;
  }
  return node;
}

/* Boutons qui déplacent le point courant (attribut data-fk posé par la coque,
   repli par libellé si un rendu ultérieur ne le porte plus). */
function boutonsNavigation(actions) {
  if (!actions) return [];
  return tous(actions, 'button').filter((bouton) => {
    const fk = bouton.dataset ? bouton.dataset.fk : '';
    if (fk === 'c3a-prev' || fk === 'c3a-next' || fk === 'c3a-restart') return true;
    return /Point précédent|Point suivant|Recommencer/.test(texte(bouton));
  });
}

/* E035-01 — Résumé du point associé au titre. La coque n'attache au <h1> que
   le contexte du premier point ; les métadonnées et le temps de lecture restent
   hors de la description du titre. Note maskée reconstruite depuis textContent. */
function resumePoint(corps) {
  const titre = un(document, '#recit-point-title') || un(corps, '.recit-title');
  if (!titre) return;
  const meta = un(corps, '.recit-meta');
  const timing = un(corps, '.recit-timing');
  const parties = [texte(meta), texte(timing)].map((s) => s.trim()).filter(Boolean);
  if (!parties.length) return;
  const aides = assureAides(corps);
  if (!aides) return;
  const n = note('v2-e035-point-resume', `Résumé du point : ${parties.join(' ')}`, aides);
  addToken(titre, 'aria-describedby', n.id);
}

/* E035-02 — Commandes : rôle de groupe et nom compté. Le div .recit-actions
   n'est pas nommé ; le nombre réel de boutons est lu dans le DOM, pas inventé. */
function groupeCommandes(corps) {
  const actions = un(corps, '.recit-actions');
  if (!actions) return;
  const total = tous(actions, 'button').length;
  if (!total) return;
  setOnce(actions, 'role', 'group');
  setOnce(actions, 'aria-label', `Commandes de lecture du point (${total} boutons)`);
}

/* E035-03 — Pastille de certitude : le glossaire n'existe que dans l'attribut
   title ; on le rend audible via une description dérivée de cet attribut. */
function certitude(corps) {
  const pastille = un(corps, '.recit-conf');
  if (!pastille) return;
  const gloss = pastille.getAttribute('title');
  if (!gloss) return;
  const aides = assureAides(corps);
  if (!aides) return;
  const n = note('v2-e035-conf', `Certitude du point : ${gloss}.`, aides);
  addToken(pastille, 'aria-describedby', n.id);
}

/* E035-04 — Raccourcis du fil : la liste des points sait gérer ↑ ↓ Début Fin,
   mais ne l'annonce pas. aria-keyshortcuts est un attribut global, posé sans
   toucher à l'aria-label existant. */
function raccourcisFil(corps) {
  const liste = un(document, '#c3a-thread') || un(corps, '.recit-thread-list');
  if (!liste) return;
  setOnce(liste, 'aria-keyshortcuts', 'ArrowUp ArrowDown Home End');
}

/* E035-05 — Média avec image : le cas « sans image » est traité en passe 1 ;
   ici, quand une image et sa légende existent, le bloc devient une figure
   nommée depuis le texte réel de .media-caption. */
function mediaFigure(layout) {
  const media = un(layout, '.recit-media');
  if (!media || !un(media, 'img')) return;
  const legende = texte(un(media, '.media-caption')).trim();
  setOnce(media, 'role', 'figure');
  if (legende) setOnce(media, 'aria-label', `Illustration du repère : ${legende}`);
}

/* E035-06 — Filtres actifs : le statut annonce le nombre de points affichés,
   pas celui des critères réellement activés. Comptage dérivé des aria-pressed. */
function filtresActifs(corps) {
  const statut = un(document, '#c3a-status') || un(corps, '.c3a-status');
  if (!statut) return;
  const filtres = tous(corps, '.c3a-filter');
  if (!filtres.length) return;
  const actifs = filtres.filter((b) => b.getAttribute('aria-pressed') === 'true').length;
  const aides = assureAides(corps);
  if (!aides) return;
  const n = note('v2-e035-filtres', `Filtres actifs : ${actifs} sur ${filtres.length}.`, aides);
  addToken(statut, 'aria-describedby', n.id);
  setOnce(statut, 'aria-atomic', 'true');
}

/* E035-07 — Boutons de déplacement du point : la passe 1 relie les boutons du
   FIL au titre ; ici ce sont les commandes « précédent / suivant / recommencer »
   qui reçoivent aria-controls vers le même titre, sans remplacer une valeur
   déjà posée. */
function navigationPoint(corps) {
  const titre = un(document, '#recit-point-title');
  /* L'identifiant est posé par la coque : on le lit, on ne le recrée pas. */
  const cible = titre && titre.id ? titre.id : null;
  if (!cible) return;
  const actions = un(corps, '.recit-actions');
  boutonsNavigation(actions).forEach((bouton) => {
    setOnce(bouton, 'aria-controls', cible);
  });
}

/* E035-08 — Titre → légende : la passe 1 relie les COMMANDES à la légende via
   aria-details ; on relie ici le <h1> à cette même documentation détaillée.
   L'identifiant est réutilisé s'il existe déjà. */
function titreLegende(corps) {
  const titre = un(document, '#recit-point-title') || un(corps, '.recit-title');
  const legende = un(corps, '.recit-legend');
  if (!titre || !legende) return;
  const identifiant = idOf(legende, 'v2-e035-legende');
  if (identifiant) setOnce(titre, 'aria-details', identifiant);
}

/* E035-09 — Raccourcis de lecture audibles : les valeurs sont lues dans les
   aria-keyshortcuts réels du bouton de lecture et des commandes de point, puis
   reformulées dans une note décrite par le bouton de lecture. */
function raccourcisLecture(corps) {
  const lecture = un(corps, '.recit-play');
  if (!lecture) return;
  const actions = un(corps, '.recit-actions');
  const valeurs = [lecture].concat(boutonsNavigation(actions))
    .map((b) => b.getAttribute('aria-keyshortcuts'))
    .filter(Boolean);
  const uniques = Array.from(new Set(valeurs));
  if (!uniques.length) return;
  const aides = assureAides(corps);
  if (!aides) return;
  const n = note('v2-e035-keys', `Raccourcis disponibles : ${uniques.join(', ')}.`, aides);
  addToken(lecture, 'aria-describedby', n.id);
}

/* E035-10 — Légende : les quatre paragraphes forment un ensemble non nommé.
   On les regroupe et on annonce leur nombre réel, dérivé de querySelectorAll. */
function legendeGroupe(corps) {
  const legende = un(corps, '.recit-legend');
  if (!legende) return;
  const total = tous(legende, 'p').length;
  if (!total) return;
  setOnce(legende, 'role', 'group');
  setOnce(legende, 'aria-label', `Légende de lecture (${total} paragraphes)`);
}

/* Passe différée : une lentille postérieure peut réécrire un attribut via
   setAttribute. Sans nouvel écouteur, on réaffirme nos seuls jetons sur des
   nœuds encore connectés, en préservant ceux des autres lentilles. */
function reaffirmer(corps) {
  const paires = [
    [un(document, '#recit-point-title'), 'aria-describedby', 'v2-e035-point-resume'],
    [un(corps, '.recit-conf'), 'aria-describedby', 'v2-e035-conf'],
    [un(document, '#c3a-status') || un(corps, '.c3a-status'), 'aria-describedby', 'v2-e035-filtres'],
    [un(corps, '.recit-play'), 'aria-describedby', 'v2-e035-keys'],
  ];
  paires.forEach(([node, attribut, jeton]) => {
    if (node && node.isConnected !== false) addToken(node, attribut, jeton);
  });
  const cible = un(document, '#recit-point-title');
  if (cible && cible.id) {
    boutonsNavigation(un(corps, '.recit-actions')).forEach((bouton) => {
      if (bouton.isConnected !== false) addToken(bouton, 'aria-controls', cible.id);
    });
  }
}

register('E035', (ctx) => {
  const contexte = ctx || {};
  const { layout, css, el, reducedMotion } = contexte;
  try {
    if (typeof document === 'undefined' || !layout
      || typeof layout.querySelector !== 'function') return;

    API.el = typeof el === 'function' ? el : null;
    if (typeof css === 'function') css('recit-v2-e035', CSS);

    /* Mouvement réduit, lu une fois par rendu ; attribut propre à la V2. */
    let reduit = false;
    try { reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduit = false; }
    try { layout.setAttribute('data-v2-e035-motion', reduit ? 'reduce' : 'full'); }
    catch { /* attribut facultatif */ }

    const corps = un(layout, '.recit-body');
    if (!corps) return;

    const taches = [
      () => resumePoint(corps),
      () => groupeCommandes(corps),
      () => certitude(corps),
      () => raccourcisFil(corps),
      () => mediaFigure(layout),
      () => filtresActifs(corps),
      () => navigationPoint(corps),
      () => titreLegende(corps),
      () => raccourcisLecture(corps),
      () => legendeGroupe(corps),
    ];
    taches.forEach((tache) => safe(tache));

    safe(() => {
      const differe = () => {
        if (corps.isConnected === false) return;
        safe(() => reaffirmer(corps));
      };
      if (typeof queueMicrotask === 'function') queueMicrotask(differe);
      else differe();
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
