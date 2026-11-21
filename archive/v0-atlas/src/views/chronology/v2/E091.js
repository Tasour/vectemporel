import { register } from './registry.js';

/* Lentille E091 — passe V2, domaine J (pédagogie & narration).
 * Thème : « kicker « Frise chronologique » mis en récit » (themes.json, clé E091).
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E091.md — chantiers
 * E091-01 à E091-10. Fichier possédé : src/views/chronology/v2/E091.js
 * uniquement. Rapport possédé : le présent fichier uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css,
 * src/views/chronology.js, passe 1 et autres lentilles laissés intacts).
 *
 * Le kicker de la vue est le chapô écrit par chronology.js:231 (« Une seule
 * ère à la fois. Les bandes gardent le contexte, la fiche donne les points
 * vérifiés. »), relayé par le titre de chronology.js:228-230. La lentille ne
 * les réécrit pas : elle lit leur texte réel et le met en récit dans un bandeau
 * local inséré juste après le chapô, comme le fait la lentille homologue du
 * domaine J pour la vue Points.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } et helpers
 * ctx.css, ctx.el, ctx.reducedMotion. Une seule feuille CSS est injectée via
 * ctx.css('chronology-v2-e091', CSS). Tous les IDs DOM sont préfixés
 * chronology-v2-e091- et protégés par une garde d'existence.
 *
 * Invariants :
 * - exactement un register('E091', ctx => { … }) et un seul ctx.css ;
 * - zéro console.*, zéro fetch/XHR, zéro import distant, zéro Math.random,
 *   zéro innerHTML, zéro timer, zéro boucle rAF, zéro écouteur, zéro région
 *   live ajoutée, zéro vol de focus ;
 * - aucun contrôle interactif créé : le bandeau est un bloc en flux, sans
 *   tabindex, donc sans arrêt Tab supplémentaire ;
 * - aucun chiffre inventé : les deux compteurs du récit sont dérivés du DOM.
 */

const CSS_ID = 'chronology-v2-e091';
const STORY_ID = 'chronology-v2-e091-story';
const TITLE_ID = 'chronology-v2-e091-title';
const KICKER_ID = 'chronology-v2-e091-kicker';
const ACCROCHE_ID = 'chronology-v2-e091-accroche';
const MOTS_ID = 'chronology-v2-e091-mots';
const QUESTION_ID = 'chronology-v2-e091-question';
const ARC_ID = 'chronology-v2-e091-arc';
const VOIX_ID = 'chronology-v2-e091-voix';
const MESURE_ID = 'chronology-v2-e091-mesure';
const METAPHORE_ID = 'chronology-v2-e091-metaphore';
const PONT_ID = 'chronology-v2-e091-pont';
const ECHO_ID = 'chronology-v2-e091-echo';
const BILAN_ID = 'chronology-v2-e091-bilan';
const HOST_ID = 'atlas-chrono-main';

/* E091-02, E091-05, E091-08, E091-09, E091-10 : feuille unique, en flux
   normal. Aucune animation, aucune transition, aucun défilement fluide : le
   récit est porté par le texte et la bordure, jamais par un mouvement. Les
   replis reduced-motion et forced-colors sont défensifs, pas créatifs. */
const CSS = `
  #${STORY_ID} {
    margin: 12px 0 16px; padding: 12px 14px 13px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.6;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${STORY_ID} .v2e091-title {
    margin: 0 0 7px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${STORY_ID} .v2e091-kicker {
    margin: 0 0 9px; color: var(--gold); font-size: 9px; font-weight: 600;
    letter-spacing: .12em; text-transform: uppercase;
  }
  #${STORY_ID} .v2e091-accroche,
  #${STORY_ID} .v2e091-question,
  #${STORY_ID} .v2e091-voix,
  #${STORY_ID} .v2e091-mesure,
  #${STORY_ID} .v2e091-metaphore,
  #${STORY_ID} .v2e091-pont,
  #${STORY_ID} .v2e091-bilan { margin: 0 0 8px; }
  #${STORY_ID} .v2e091-accroche { color: var(--ink); font-size: 12px; }
  #${STORY_ID} .v2e091-question {
    padding-left: 10px; border-left: 2px solid var(--line-strong);
    color: var(--gold-bright); font-style: italic;
  }
  #${STORY_ID} .v2e091-mots { margin: 0 0 9px; }
  #${STORY_ID} .v2e091-mot {
    display: flex; gap: 10px; margin: 0 0 3px;
    padding: 0 0 3px; border-bottom: 1px solid var(--line);
  }
  #${STORY_ID} .v2e091-mot dt { flex: 0 0 104px; margin: 0; color: var(--gold-bright); font-weight: 600; }
  #${STORY_ID} .v2e091-mot dd { flex: 1 1 auto; min-width: 0; margin: 0; color: var(--ink-soft); }
  #${STORY_ID} .v2e091-arc { margin: 0 0 9px; padding-left: 18px; }
  #${STORY_ID} .v2e091-arc li { margin: 0 0 2px; }
  #${STORY_ID} .v2e091-voix,
  #${STORY_ID} .v2e091-mesure,
  #${STORY_ID} .v2e091-bilan { color: var(--muted); font-size: 10px; }
  #${STORY_ID} .v2e091-echo {
    margin: 9px 0 0; padding: 8px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    color: var(--ink); font-family: var(--serif); font-style: italic;
  }
  @media (max-width: 620px) {
    #${STORY_ID} .v2e091-mot { flex-wrap: wrap; gap: 1px 8px; }
    #${STORY_ID} .v2e091-mot dt { flex-basis: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${STORY_ID}, #${STORY_ID} * {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
  @media (forced-colors: active) {
    #${STORY_ID}, #${STORY_ID} .v2e091-echo {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${STORY_ID} .v2e091-title,
    #${STORY_ID} .v2e091-kicker,
    #${STORY_ID} .v2e091-mot dt,
    #${STORY_ID} .v2e091-question { color: CanvasText; }
  }
`;

/* E091-01 : repli uniquement si le chapô réel est introuvable dans le DOM.
   Le texte observé est toujours préféré : aucune phrase historique inventée. */
const KICKER_REPLI = 'Une seule ère à la fois — le kicker de la frise chronologique.';

/* E091-02 et E091-10 : l'accroche promet un cadre, l'écho le reprend mot pour
   mot. C'est un dispositif de clôture narratif, pas une synthèse de la vue. */
const ACCROCHE = 'Une frise chronologique n’est pas une pile de dates : c’est un récit qui se parcourt. Le kicker pose le cadre, les bandes le tiennent, la fiche le vérifie. Suivez ce fil du début à la fin.';
const ECHO = 'Frise chronologique : le cadre posé au début se retrouve à la fin — une ère à la fois, le contexte gardé, les points vérifiés.';

/* E091-03 : les deux mots du kicker sont expliqués pour eux-mêmes. Le
   glossaire du domaine (ère, repère, confiance) appartient à E095 : aucun
   chevauchement. */
const MOTS = [
  ['Frise', 'une bande où les repères se succèdent : le support visible du récit.'],
  ['Chronologique', 'du grec chronos, le temps : l’ordre qui donne au récit sa direction.'],
];

/* E091-04 : une problématique, c'est-à-dire une question qui ouvre la lecture
   sans préjuger de la réponse. */
const QUESTION = 'Comment une suite de dates devient-elle une histoire que l’on peut suivre ?';

/* E091-05 : trois temps narratifs, rédigés d'après le chapô réel de la vue
   (chronology.js:231), jamais d'après une source externe. Ce n'est pas un
   tutoriel : aucun geste n'est prescrit (E097 reste seul maître du mode d'emploi). */
const ARC = [
  'Ouverture — le kicker donne le cadre : une seule ère à la fois.',
  'Exploration — les bandes gardent le contexte pendant qu’un repère se détaille.',
  'Retour — la fiche donne les points vérifiés, puis le récit reprend le fil.',
];

/* E091-06, E091-08, E091-09 : registre, métaphore et transition, trois voix
   distinctes du même récit. */
const VOIX = 'Registre : présent de l’indicatif, seconde personne implicite. Le récit décrit ce que la vue montre ; il ne prescrit aucun clic et n’ajoute aucune commande.';
const METAPHORE = 'Métaphore filée : le temps est un fil, la frise est la main qui le tient et chaque repère en est un nœud. La même image court du kicker à l’écho.';
const PONT = 'Du mot à la frise : « chronologique » annonce l’ordre, la bande d’ère le rend visible. Le récit passe du titre aux bandes sans changer de voix.';

let rendus = 0;
let refs = {
  story: null, kicker: null, mesure: null, bilan: null,
  eres: 0, reperes: 0, kickerLu: '',
};

/* E091-10 : garde d'existence. La coque reconstruisant le stage, un nœud de la
   rendu précédent est détaché : on le réutilise et on le déplace plutôt que d'en
   créer un doublon. */
function assurerNoeud(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E091-01 : placement juste après le chapô réel, sans le déplacer ni l'écraser.
   À défaut d'ancre, le bandeau reste un bloc en fin de colonne. */
function placerApres(node, ancre, parent) {
  if (ancre && ancre.parentElement === parent) {
    if (ancre.nextSibling !== node) parent.insertBefore(node, ancre.nextSibling);
  } else if (node.parentElement !== parent) {
    parent.appendChild(node);
  }
}

function ecrire(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function setData(node, key, value) {
  if (node && node.dataset[key] !== value) node.dataset[key] = value;
}

function texte(node) {
  return String(node && node.textContent ? node.textContent.trim() : '');
}

/* E091-01 et E091-07 : le kicker et les deux compteurs sont lus dans le DOM
   courant. Aucune date, aucun effectif et aucun libellé d'ère n'est codé en dur. */
function lireSIGNAL(host) {
  const kicker = host.querySelector('.view-lede')
    || host.querySelector('.atlas-chrono-h1')
    || document.getElementById('atlas-chrono-title');
  const texteKicker = texte(kicker);
  return {
    kicker: texteKicker || KICKER_REPLI,
    present: Boolean(texteKicker),
    eres: host.querySelectorAll('.era-band').length,
    reperes: host.querySelectorAll('.event-card').length,
  };
}

/* E091-01 à E091-10 : une seule fonction de peinture, sans région live. Chaque
   chantier publie son état en texte visible et dans un attribut data distinct. */
function peindre() {
  const r = refs;
  if (!r.story || !r.story.isConnected) return;

  ecrire(r.kicker, `Kicker observé : « ${r.kickerLu} »`);
  ecrire(r.mesure, `Le récit s’appuie sur ${r.eres} ère(s) et ${r.reperes} repère(s) réellement présents dans le DOM : aucun chiffre n’est inventé.`);
  ecrire(r.bilan, `Chantiers mis en récit : 10 · rendus du greffon : ${rendus} · kicker ${r.kickerLu && r.kickerLu !== KICKER_REPLI ? 'lu dans la vue' : 'en repli'} · mouvement propre : aucun.`);

  setData(r.story, 'v2e091Kicker', r.kickerLu && r.kickerLu !== KICKER_REPLI ? 'dom' : 'repli');
  setData(r.story, 'v2e091Accroche', '1');
  setData(r.story, 'v2e091Mots', String(MOTS.length));
  setData(r.story, 'v2e091Question', '1');
  setData(r.story, 'v2e091Arc', String(ARC.length));
  setData(r.story, 'v2e091Voix', 'present-2e');
  setData(r.story, 'v2e091Eres', String(r.eres));
  setData(r.story, 'v2e091Reperes', String(r.reperes));
  setData(r.story, 'v2e091Metaphore', 'fil');
  setData(r.story, 'v2e091Pont', '1');
  setData(r.story, 'v2e091Echo', '1');
  setData(r.story, 'v2e091Rendus', String(rendus));
}

function ajouterMot(liste, make, terme, definition) {
  const ligne = make('div', 'v2e091-mot');
  ligne.append(make('dt', '', terme), make('dd', '', definition));
  liste.appendChild(ligne);
}

function install(ctx) {
  const make = ctx && ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  rendus += 1;
  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(HOST_ID) || ctx.stage || ctx.layout;
  if (!host || typeof host.appendChild !== 'function') return;

  const signal = lireSIGNAL(host);

  const story = assurerNoeud(make, STORY_ID, 'section', 'v2e091-story', host);
  story.setAttribute('role', 'region');
  story.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'v2e091-title', 'Frise chronologique — le récit de la lecture');
  title.id = TITLE_ID;

  const kicker = make('p', 'v2e091-kicker');
  kicker.id = KICKER_ID;

  const accroche = make('p', 'v2e091-accroche', ACCROCHE);
  accroche.id = ACCROCHE_ID;

  const mots = make('dl', 'v2e091-mots');
  mots.id = MOTS_ID;
  MOTS.forEach(([terme, definition]) => ajouterMot(mots, make, terme, definition));

  const question = make('p', 'v2e091-question', QUESTION);
  question.id = QUESTION_ID;

  const arc = make('ol', 'v2e091-arc');
  arc.id = ARC_ID;
  ARC.forEach((etape) => arc.appendChild(make('li', '', etape)));

  const voix = make('p', 'v2e091-voix', VOIX);
  voix.id = VOIX_ID;

  const mesure = make('p', 'v2e091-mesure');
  mesure.id = MESURE_ID;

  const metaphore = make('p', 'v2e091-metaphore', METAPHORE);
  metaphore.id = METAPHORE_ID;

  const pont = make('p', 'v2e091-pont', PONT);
  pont.id = PONT_ID;

  const echo = make('blockquote', 'v2e091-echo', ECHO);
  echo.id = ECHO_ID;

  const bilan = make('p', 'v2e091-bilan');
  bilan.id = BILAN_ID;

  /* replaceChildren plutôt que innerHTML : les nœuds de la rendu précédente
     sont détachés, donc aucun ID en doublon ne subsiste dans le document. */
  story.replaceChildren(
    title, kicker, accroche, mots, question, arc,
    voix, mesure, metaphore, pont, echo, bilan
  );

  const ancre = host.querySelector('.view-lede') || host.querySelector('#atlas-chrono-title');
  placerApres(story, ancre, host);

  refs = {
    story, kicker, mesure, bilan,
    eres: signal.eres,
    reperes: signal.reperes,
    kickerLu: signal.present ? signal.kicker : KICKER_REPLI,
  };
  peindre();
}

register('E091', ctx => { install(ctx); });
