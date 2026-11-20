import { register } from './registry.js';

/* Lentille E059 — passe V2 CHRONOLOGIE (domaine F : Sémantique & données).
 * Thème : « échelle (local → global) représentée ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E059.md — chantiers E059-01 à E059-10.
 * Fichier possédé : src/views/chronology/v2/E059.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, src/views/chronology.js), aucune
 * autre lentille, aucune passe 1 n'est modifié.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } avec css,
 * el et reducedMotion (registry.js:13-36). Une seule feuille CSS injectée via
 * ctx.css('chronology-v2-e059', …). Tous les IDs créés sont préfixés
 * chronology-v2-e059- et passent par une garde d'existence (assurerNoeud).
 *
 * Invariants :
 * - un seul register('E059', ctx => …) ;
 * - aucune donnée historique inventée : l'échelle est lue dans le DOM quand
 *   elle y est exposée, sinon l'absence est écrite explicitement ;
 * - zéro réseau, zéro aléa, zéro journalisation, zéro HTML brut, zéro timer,
 *   zéro boucle rAF : le rendu est synchrone et déductif ;
 * - aucune région live ajoutée : l'état est un texte visible ordinaire.
 */

const CSS_ID = 'chronology-v2-e059';
const PANEL_ID = 'chronology-v2-e059-panel';
const TITRE_ID = 'chronology-v2-e059-titre';
const INTRO_ID = 'chronology-v2-e059-intro';
const ECHELLE_ID = 'chronology-v2-e059-echelle';
const COUVERTURE_ID = 'chronology-v2-e059-couverture';
const REPARTITION_ID = 'chronology-v2-e059-repartition';
const MOBILITE_ID = 'chronology-v2-e059-mobilite';
const BILAN_ID = 'chronology-v2-e059-bilan';
const RANG_PREFIX = 'chronology-v2-e059-rang-';
const NB_PREFIX = 'chronology-v2-e059-nb-';
const POINT_PREFIX = 'chronology-v2-e059-point-';

/* E059-01, E059-02, E059-04, E059-08 : vocabulaire canonique du local au
   global. Les cinq rangs restent distincts (pas de fusion national/impérial)
   et chacun porte un libellé, une définition et un glyphe textuel répété. Ce
   vocabulaire est documenté dans source/audits/_AGENT_BRIEF.md:67 et dans les
   champs "scale" / "hierarchy" de src/data/dataset.js. */
const RANGS = Object.freeze([
  Object.freeze({
    code: 'local',
    libelle: 'Local',
    definition: 'Un lieu, une communauté, une ville : portée circonscrite.',
    glyphe: '•',
  }),
  Object.freeze({
    code: 'regional',
    libelle: 'Régional',
    definition: 'Une province ou une région : portée infra-nationale.',
    glyphe: '••',
  }),
  Object.freeze({
    code: 'national',
    libelle: 'National',
    definition: 'L’État ou le pays : portée institutionnelle.',
    glyphe: '•••',
  }),
  Object.freeze({
    code: 'imperial',
    libelle: 'Impérial',
    definition: 'Un empire ou un domaine plurinational.',
    glyphe: '••••',
  }),
  Object.freeze({
    code: 'transnational',
    libelle: 'Transnational',
    definition: 'Des réseaux au-delà des frontières : portée globale.',
    glyphe: '•••••',
  }),
]);

/* E059-05 : normalisation des valeurs d'échelle éventuellement exposées par
   le DOM. Toute valeur non reconnue est classée « autre », jamais transformée
   en un rang canonique inventé. */
const ALIAS = Object.freeze({
  local: 'local', locale: 'local',
  regional: 'regional', regionale: 'regional', région: 'regional', régionale: 'regional',
  national: 'national', nationale: 'national',
  imperial: 'imperial', imperiale: 'imperial', impérial: 'imperial', impériale: 'imperial',
  transnational: 'transnational', transnationale: 'transnational',
  global: 'transnational', globale: 'transnational', monde: 'transnational',
});

const CODES = RANGS.map((rang) => rang.code);

/* E059-01 à E059-10 : une seule feuille. Les couleurs d'accent sont doublées
   par un ordinal, un libellé et un glyphe textuels ; aucun mouvement n'est
   créé. Les deux médias (mobilité et couleurs forcées) sont des repli. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 13px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e059-titre {
    margin: 0 0 5px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e059-intro { margin: 0 0 9px; color: var(--muted); }
  #${PANEL_ID} .e059-legende {
    margin: 0 0 4px; color: var(--muted-2); font-size: 9px;
    text-transform: none; letter-spacing: 0;
  }
  #${ECHELLE_ID} {
    list-style: none; margin: 0 0 9px; padding: 0;
  }
  #${ECHELLE_ID} .e059-rang {
    display: grid; grid-template-columns: 18px 54px 84px 1fr;
    gap: 6px; align-items: baseline; margin: 0 0 3px; padding: 4px 6px;
    border: 1px solid var(--line); border-left-width: 3px; border-radius: 6px;
    background: rgba(255,255,255,.015);
  }
  #${ECHELLE_ID} .e059-rang[data-e059-code="local"] { border-left-color: var(--muted-2); }
  #${ECHELLE_ID} .e059-rang[data-e059-code="regional"] { border-left-color: var(--accent, var(--gold)); }
  #${ECHELLE_ID} .e059-rang[data-e059-code="national"] { border-left-color: var(--gold); }
  #${ECHELLE_ID} .e059-rang[data-e059-code="imperial"] { border-left-color: var(--gold-bright); }
  #${ECHELLE_ID} .e059-rang[data-e059-code="transnational"] { border-left-color: var(--ink); }
  #${ECHELLE_ID} .e059-ordinal { color: var(--muted-2); font-size: 9px; }
  #${ECHELLE_ID} .e059-glyphe {
    color: var(--gold-bright); font-size: 10px; letter-spacing: 1px;
    white-space: nowrap;
  }
  #${ECHELLE_ID} .e059-libelle { color: var(--ink-soft); font-weight: 600; }
  #${ECHELLE_ID} .e059-def { color: var(--muted); }
  #${PANEL_ID} .e059-couverture,
  #${PANEL_ID} .e059-mobilite,
  #${PANEL_ID} .e059-bilan {
    margin: 6px 0 0; padding-top: 6px;
    border-top: 1px solid var(--line); color: var(--muted);
  }
  #${PANEL_ID} .e059-bilan { color: var(--muted-2); font-size: 9px; }
  #${REPARTITION_ID} { list-style: none; margin: 4px 0 0; padding: 0; }
  #${REPARTITION_ID} li {
    display: flex; justify-content: space-between; gap: 8px;
    margin: 0; padding: 2px 0; border-bottom: 1px solid var(--line);
  }
  #${REPARTITION_ID} .e059-nb { color: var(--gold-bright); white-space: nowrap; }
  .e059-point {
    display: block; margin: 4px 0 0; padding: 3px 6px;
    border: 1px dashed var(--line-strong); border-radius: 5px;
    background: rgba(255,255,255,.02); color: var(--ink-soft);
    font: inherit; font-size: 9px; line-height: 1.45;
  }
  .e059-point[data-e059-scale="non-renseigne"] { color: var(--muted-2); }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 9px 10px 10px; }
    #${ECHELLE_ID} .e059-rang { grid-template-columns: 16px 60px 1fr; }
    #${ECHELLE_ID} .e059-def { grid-column: 2 / -1; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .e059-point {
      transition: none !important; animation: none !important;
      scroll-behavior: auto !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${ECHELLE_ID} .e059-rang, .e059-point {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e059-titre, #${PANEL_ID} .e059-intro,
    #${PANEL_ID} .e059-legende, #${PANEL_ID} .e059-couverture,
    #${PANEL_ID} .e059-mobilite, #${PANEL_ID} .e059-bilan,
    #${ECHELLE_ID} .e059-ordinal, #${ECHELLE_ID} .e059-glyphe,
    #${ECHELLE_ID} .e059-libelle, #${ECHELLE_ID} .e059-def,
    #${REPARTITION_ID} .e059-nb { color: CanvasText; }
  }
`;

let installations = 0;
let etat = { panneau: null, reduit: false, rangs: {}, nb: {} };

/* Idempotence multi-rendus : un nœud déjà présent est réutilisé et déplacé
   dans le parent courant, jamais dupliqué ni cloné. */
function assurerNoeud(fabriquer, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabriquer(balise, classe);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

function attribut(noeud, cle, valeur) {
  if (noeud && noeud.dataset[cle] !== valeur) noeud.dataset[cle] = valeur;
}

/* Clé de dataset hyphenée : e059Nb + 'local' donne data-e059-nb-local. */
function cleNb(code) {
  return `e059Nb${code.charAt(0).toUpperCase()}${code.slice(1)}`;
}

function trouverRacine(ctx) {
  for (const id of ['atlas-chrono-main', 'atlas-chronology-main', 'chronology-v2-main']) {
    const noeud = document.getElementById(id);
    if (noeud && noeud.appendChild) return noeud;
  }
  if (ctx.layout && ctx.layout.appendChild) return ctx.layout;
  if (ctx.stage && ctx.stage.appendChild) return ctx.stage;
  return document.body;
}

/* E059-05 : les points peuvent vivre dans l'aside de la passe 1 ou dans une
   coque V2. La collecte est tolérante et dédupliquée par nœud. */
function collecterPoints(racine) {
  const points = [];
  const vus = new Set();
  const porteurs = [racine, document.getElementById('atlas-chrono-aside')].filter(Boolean);
  porteurs.forEach((porteur) => {
    porteur.querySelectorAll('.point, [data-point-id]').forEach((noeud) => {
      if (!vus.has(noeud)) {
        vus.add(noeud);
        points.push(noeud);
      }
    });
  });
  return points;
}

/* E059-05 : aucune valeur n'est fabriquée. Une clé absente donne
   'non-renseigne' ; une valeur présente mais hors vocabulaire donne 'autre'. */
function codeEchelle(point) {
  const ds = point.dataset || {};
  const brut = ['scale', 'echelle', 'hierarchy', 'portee']
    .map((cle) => ds[cle])
    .find((valeur) => typeof valeur === 'string' && valeur.trim());
  if (!brut) return 'non-renseigne';
  const normalise = brut.trim().toLowerCase();
  return ALIAS[normalise] || (CODES.includes(normalise) ? normalise : 'autre');
}

/* E059-01, E059-02, E059-04, E059-08 : la structure même de l'échelle porte
   le sens — cinq rangs ordonnés, un ordinal, un libellé, une définition, un
   glyphe textuel et un code canonique distinct. */
function construirePanneau(fabriquer, racine) {
  const panneau = assurerNoeud(fabriquer, PANEL_ID, 'section', 'e059-panneau', racine);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITRE_ID);

  const titre = fabriquer('h2', 'e059-titre', 'Échelle des faits — du local au global');
  titre.id = TITRE_ID;

  const intro = fabriquer('p', 'e059-intro');
  intro.id = INTRO_ID;
  intro.textContent = 'Lecture de l’échelle des faits : du local au global. Le rang est porté par l’ordre de la liste, par un ordinal et par un libellé — jamais par la seule couleur. Aucune échelle n’est attribuée à un fait : l’absence est signalée telle quelle.';

  const legende = fabriquer('p', 'e059-legende', 'Rangs canoniques, du plus circonscrit au plus étendu :');

  const echelle = assurerNoeud(fabriquer, ECHELLE_ID, 'ol', 'e059-echelle', panneau);
  echelle.setAttribute('aria-label', 'Échelle des faits, du local au global');

  const rangs = RANGS.map((rang, position) => {
    const li = assurerNoeud(fabriquer, `${RANG_PREFIX}${rang.code}`, 'li', 'e059-rang', echelle);
    attribut(li, 'e059Rang', String(position + 1));
    attribut(li, 'e059Code', rang.code);
    attribut(li, 'e059Glyphe', rang.glyphe);
    const ordinal = fabriquer('span', 'e059-ordinal', String(position + 1));
    const glyphe = fabriquer('span', 'e059-glyphe', rang.glyphe);
    const libelle = fabriquer('span', 'e059-libelle', rang.libelle);
    const definition = fabriquer('span', 'e059-def', rang.definition);
    li.replaceChildren(ordinal, glyphe, libelle, definition);
    etat.rangs[rang.code] = li;
    return li;
  });
  echelle.replaceChildren(...rangs);

  const couverture = fabriquer('p', 'e059-couverture');
  couverture.id = COUVERTURE_ID;

  const legendeRepartition = fabriquer('p', 'e059-legende', 'Répartition observée dans le DOM rendu :');
  const repartition = assurerNoeud(fabriquer, REPARTITION_ID, 'ul', 'e059-repartition', panneau);
  const nb = RANGS.map((rang) => {
    const li = assurerNoeud(fabriquer, `${NB_PREFIX}${rang.code}`, 'li', 'e059-nb-ligne', repartition);
    const libelle = fabriquer('span', 'e059-libelle', rang.libelle);
    const compteur = fabriquer('span', 'e059-nb', '0 point(s)');
    li.append(libelle, compteur);
    etat.nb[rang.code] = { li, compteur };
    return li;
  });
  repartition.replaceChildren(...nb);

  const mobilite = fabriquer('p', 'e059-mobilite');
  mobilite.id = MOBILITE_ID;
  const bilan = fabriquer('p', 'e059-bilan');
  bilan.id = BILAN_ID;

  panneau.replaceChildren(titre, intro, legende, echelle, couverture, legendeRepartition, repartition, mobilite, bilan);
  return panneau;
}

/* E059-05, E059-06, E059-07 : lecture des points, annotation de chaque point
   et agrégation déductive. Les compteurs dérivent uniquement du DOM observé. */
function actualiser(ctx, panneau, fabriquer) {
  const racine = trouverRacine(ctx);
  const points = collecterPoints(racine);
  const repartition = { local: 0, regional: 0, national: 0, imperial: 0, transnational: 0 };
  let renseignes = 0;
  let autres = 0;

  points.forEach((point, index) => {
    const code = codeEchelle(point);
    const note = assurerNoeud(
      fabriquer,
      `${POINT_PREFIX}${index}`,
      'span',
      'e059-point',
      point
    );
    attribut(point, 'e059Scale', code);
    const libelle = RANGS.find((rang) => rang.code === code);
    ecrire(note, libelle
      ? `Échelle déclarée : ${libelle.libelle} (rang ${RANGS.indexOf(libelle) + 1} sur ${RANGS.length}).`
      : (code === 'autre'
        ? 'Échelle déclarée : valeur hors vocabulaire canonique (classée « autre »).'
        : 'Échelle non renseignée dans le DOM : aucun rang n’est attribué à ce fait.'));
    if (code === 'non-renseigne') return;
    renseignes += 1;
    if (code === 'autre') { autres += 1; return; }
    repartition[code] += 1;
  });

  const total = points.length;
  const nonRenseignes = total - renseignes;
  const pourcentage = total ? Math.round((renseignes / total) * 100) : 0;

  ecrire(
    document.getElementById(COUVERTURE_ID),
    `${renseignes} point(s) sur ${total} exposent une échelle lisible, soit ${pourcentage} %. ${nonRenseignes} point(s) ne déclarent aucun rang : l’absence est citée, aucune valeur n’est inventée.${autres ? ` ${autres} valeur(s) hors vocabulaire sont classée(s) « autre ».` : ''}`
  );

  RANGS.forEach((rang) => {
    const entree = etat.nb[rang.code];
    if (!entree) return;
    ecrire(entree.compteur, `${repartition[rang.code]} point(s)`);
    attribut(entree.li, 'e059Nb', String(repartition[rang.code]));
  });

  ecrire(
    document.getElementById(MOBILITE_ID),
    `Mouvement réduit demandé par le système : ${etat.reduit ? 'oui' : 'non'}. Lecture en 390 px : les cinq rangs se replient sans débordement ; aucune animation n’est créée par cette lentille.`
  );
  ecrire(
    document.getElementById(BILAN_ID),
    `Bilan — échelle locale → globale : ${RANGS.length} rangs distincts, ${renseignes}/${total} points étiquetés, ${repartition.transnational} au rang transnational. L’ordre de la liste, l’ordinal et le glyphe portent le sens, y compris en couleurs forcées. Rendus du greffon : ${installations}.`
  );

  attribut(panneau, 'e059Total', String(total));
  attribut(panneau, 'e059Renseignes', String(renseignes));
  attribut(panneau, 'e059NonRenseignes', String(nonRenseignes));
  attribut(panneau, 'e059Autres', String(autres));
  attribut(panneau, 'e059Pourcentage', String(pourcentage));
  attribut(panneau, 'e059Reduit', etat.reduit ? '1' : '0');
  attribut(panneau, 'e059Rangs', String(RANGS.length));
  attribut(panneau, 'e059Installations', String(installations));
  CODES.forEach((code) => attribut(panneau, cleNb(code), String(repartition[code])));
}

function installer(ctx) {
  const fabriquer = ctx && ctx.el;
  if (typeof fabriquer !== 'function' || !ctx.layout) return;

  installations += 1;
  ctx.css(CSS_ID, CSS);
  etat.reduit = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  etat.rangs = {};
  etat.nb = {};

  const racine = trouverRacine(ctx);
  const panneau = construirePanneau(fabriquer, racine);
  etat.panneau = panneau;
  actualiser(ctx, panneau, fabriquer);
}

register('E059', ctx => {
  installer(ctx);
});
