import { register } from './registry.js';

/* V2 — lentille E015 (vague GEOGRAPHIE).
 * Thème : biomes et forêts.
 *
 * Les dix chantiers E015-01 … E015-10 sont réellement implémentés ici :
 *   01 section sémantique d'introduction, lisible sans JS ;
 *   02 tableau comparatif des six biomes de référence ;
 *   03 sélecteur de biome en radiogroupe (choix unique) ;
 *   04 curseurs de température et de précipitations ;
 *   05 diagramme canvas schématique, déterministe, DPR ≤ 2 ;
 *   06 grandeurs chiffrées comparées à un seuil (readout live) ;
 *   07 boucle rAF unique, pause sur document.hidden, mouvement réduit ;
 *   08 hachures et formes : aucune information portée par la seule couleur ;
 *   09 badge textuel de non-localité sur la carte existante ;
 *   10 accessibilité clavier, défi falsifiable, idempotence multi-rendus.
 *
 * Rigueur des contenus : le jeu de données ne fournit aucune température ni
 * précipitation locale. Le laboratoire est un SCHÉMA global de biomes
 * (diagramme de Whittaker simplifié à seuils), explicitement présenté comme tel.
 * Aucune valeur n'est attribuée au pays affiché, aucune date ni mesure locale
 * n'est inventée. Tout le contenu pédagogique est du texte sémantique inséré
 * dans le DOM (titres, paragraphes, tableau, fieldset, liste, figcaption) :
 * le canvas n'est qu'un laboratoire, jamais la seule source d'information.
 *
 * Contrat : import de './registry.js' uniquement ; un seul register('E015', …) ;
 * CSS unique via ctx.css('geography-v2-e015', …) ; ids préfixés
 * geography-v2-e015-* ; français partout ; zéro console, zéro réseau, zéro
 * Math.random ; au plus une boucle rAF suspendue sur document.hidden et
 * respectueuse de ctx.reducedMotion().
 *
 * ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text),
 *         reducedMotion() }.
 */

/* ---------- Identifiants (tous préfixés geography-v2-e015-) ---------- */

const CSS_ID = 'geography-v2-e015';
const PREFIX = 'geography-v2-e015';
const PANEL_ID = `${PREFIX}-panel`;
const TITLE_ID = `${PREFIX}-title`;
const TABLE_ID = `${PREFIX}-table`;
const GROUPE_ID = `${PREFIX}-groupe`;
const RADIO_NAME = `${PREFIX}-biome`;
const TEMP_ID = `${PREFIX}-temperature`;
const TEMP_OUT_ID = `${PREFIX}-temperature-valeur`;
const PLUIE_ID = `${PREFIX}-pluies`;
const PLUIE_OUT_ID = `${PREFIX}-pluies-valeur`;
const CANVAS_ID = `${PREFIX}-canvas`;
const FIGCAP_ID = `${PREFIX}-figcaption`;
const READOUT_ID = `${PREFIX}-readout`;
const MESURES_ID = `${PREFIX}-mesures`;
const LEGENDE_ID = `${PREFIX}-legende`;
const LIMITE_ID = `${PREFIX}-limite`;
const DEFI_ID = `${PREFIX}-defi`;
const PLAY_ID = `${PREFIX}-animation`;
const BADGE_ID = `${PREFIX}-badge`;
const CLAVIER_ID = `${PREFIX}-clavier`;

/* ---------- Données canoniques : seuils schématiques déclarés une seule fois ---------- */

const SEUILS = {
  desert: 250,      // mm/an : sous ce seuil, couvert végétal très clair.
  boreale: 300,     // mm/an : seuil de précipitations de la taïga.
  temperee: 750,    // mm/an : seuil de la forêt tempérée décidue.
  tropicale: 2000,  // mm/an : seuil conventionnel de la forêt humide.
  froid: 5,         // °C : limite taïga / forêt tempérée.
  doux: 15,         // °C : limite forêt tempérée / biome tropical.
};

const X_MIN = -10;
const X_MAX = 35;
const Y_MIN = 0;
const Y_MAX = 3000;

/* Six biomes de référence. Les plages sont des ordres de grandeur globaux,
 * pas des mesures locales ; chaque entrée porte une signature textuelle et un
 * style de hachure, donc aucune information ne dépend de la couleur. */
const BIOMES = [
  {
    key: 'tropicale', nom: 'Forêt tropicale humide', court: 'Forêt tropicale',
    plage: '≥ 15 °C · ≥ 2 000 mm/an', signature: 'Feuillage persistant, plusieurs étages',
    hachure: 'points', forme: 'cercle', famille: 'foret',
    preset: { temp: 27, pluie: 2600 },
  },
  {
    key: 'savane', nom: 'Savane et forêt claire', court: 'Savane',
    plage: '≥ 15 °C · 250 à 2 000 mm/an', signature: 'Graminées et arbres épars',
    hachure: 'obliques', forme: 'losange', famille: 'autre',
    preset: { temp: 27, pluie: 1200 },
  },
  {
    key: 'temperee', nom: 'Forêt tempérée décidue', court: 'Forêt tempérée',
    plage: '5 à 15 °C · ≥ 750 mm/an', signature: 'Feuillus caducs, sous-bois saisonnier',
    hachure: 'horizontales', forme: 'cercle', famille: 'foret',
    preset: { temp: 11, pluie: 1100 },
  },
  {
    key: 'prairie', nom: 'Prairie tempérée', court: 'Prairie',
    plage: '5 à 15 °C · 250 à 750 mm/an', signature: 'Graminées vivaces, arbres rares',
    hachure: 'obliques', forme: 'losange', famille: 'autre',
    preset: { temp: 11, pluie: 500 },
  },
  {
    key: 'boreale', nom: 'Taïga (forêt boréale)', court: 'Taïga',
    plage: '< 5 °C · ≥ 300 mm/an', signature: 'Conifères à aiguilles, été court',
    hachure: 'verticales', forme: 'cercle', famille: 'foret',
    preset: { temp: 0, pluie: 550 },
  },
  {
    key: 'desert', nom: 'Désert et steppe', court: 'Désert',
    plage: '< 250 mm/an (toutes températures)', signature: 'Xérophytes, couvert arboré très faible',
    hachure: 'croisées', forme: 'losange', famille: 'autre',
    preset: { temp: 28, pluie: 120 },
  },
];

/* ---------- État de module (survit à la reconstruction du `stage` par la coque) ---------- */

const S = {
  biome: 'tropicale',
  temperature: 27,
  pluies: 2600,
  anime: false,
  progression: 0,
  rafId: 0,
  depart: 0,
  visibilityBound: false,
  motionBound: false,
  reduced: () => false,
  nodes: {},
};

/* ---------- Utilitaires déterministes ---------- */

const parCle = (cle) => BIOMES.find((biome) => biome.key === cle) || BIOMES[0];

/* Classification à seuils : elle découle uniquement des deux curseurs et des
 * constantes ci-dessus. Aucun résultat n'est codé en dur, aucun aléa. */
function classerBiome(temperature, pluies) {
  if (pluies < SEUILS.desert) return parCle('desert');
  if (temperature < SEUILS.froid) {
    return pluies < SEUILS.boreale ? parCle('desert') : parCle('boreale');
  }
  if (temperature < SEUILS.doux) {
    return pluies < SEUILS.temperee ? parCle('prairie') : parCle('temperee');
  }
  return pluies < SEUILS.tropicale ? parCle('savane') : parCle('tropicale');
}

const arrondi = (valeur) => Math.round(valeur * 100) / 100;
const fmt = (valeur) => arrondi(valeur).toFixed(2).replace('.', ',');
const bornes = (valeur, min, max) => Math.max(min, Math.min(max, valeur));

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#${PANEL_ID}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${TITLE_ID}{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${PANEL_ID} p{margin:5px 0;max-width:68ch}
#${PANEL_ID} .${PREFIX}-lede,#${PANEL_ID} .${PREFIX}-note{color:var(--ink-soft,#d7d1c6)}
#${PANEL_ID} .${PREFIX}-note{color:var(--muted);font-size:10px}
#${PANEL_ID} .${PREFIX}-caption{margin:6px 0;color:var(--muted);font-size:10px;line-height:1.5}
#${GROUPE_ID}{margin:10px 0 6px;padding:7px;border:1px solid var(--line);border-radius:8px}
#${GROUPE_ID} legend{padding:0 4px;color:var(--muted)}
#${PANEL_ID} .${PREFIX}-radios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:6px}
#${PANEL_ID} .${PREFIX}-radio{
  display:flex;align-items:center;gap:5px;min-height:44px;padding:4px 6px;
  border:1px solid var(--line);border-radius:8px;color:var(--muted);
  font-size:10px;line-height:1.25;cursor:pointer;
}
#${PANEL_ID} .${PREFIX}-radio:has(input:checked){border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12);color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} .${PREFIX}-radio input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f);flex:none}
#${PANEL_ID} .${PREFIX}-curseur{margin:9px 0}
#${PANEL_ID} .${PREFIX}-curseur label{display:flex;justify-content:space-between;gap:8px;color:var(--ink-soft,#d7d1c6);font-size:10px}
#${PANEL_ID} .${PREFIX}-valeur{color:var(--gold-bright,#f4d69e);font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
#${PANEL_ID} .${PREFIX}-range{width:100%;min-height:24px;margin:4px 0 0;accent-color:var(--gold,#e6b96f)}
#${PANEL_ID} .${PREFIX}-figure{margin:10px 0;padding:7px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.2)}
#${CANVAS_ID}{display:block;width:100%;max-width:360px;height:auto;aspect-ratio:320/224;margin:0 auto;touch-action:manipulation;background:rgba(0,0,0,.25);border-radius:6px}
#${TABLE_ID}{width:100%;margin:8px 0;border-collapse:collapse;font-size:10px;font-variant-numeric:tabular-nums}
#${TABLE_ID} caption{margin:0 0 5px;color:var(--muted);font-size:10px;text-align:left}
#${TABLE_ID} th,#${TABLE_ID} td{padding:4px 5px;border-bottom:1px dotted var(--line);text-align:left;vertical-align:top;line-height:1.45}
#${TABLE_ID} th{color:var(--muted);font-weight:700}
#${TABLE_ID} td{color:var(--ink-soft,#d7d1c6)}
#${TABLE_ID} tr.is-active td{color:var(--gold-bright,#f4d69e);background:rgba(230,185,111,.08)}
#${LEGENDE_ID}{margin:8px 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px;color:var(--muted);font-size:10px;line-height:1.5}
#${MESURES_ID}{margin:8px 0;padding:7px 9px;border-left:2px solid var(--gold,#e6b96f);background:rgba(255,255,255,.02);color:var(--ink-soft,#d7d1c6);font-size:10px;line-height:1.7;font-variant-numeric:tabular-nums}
#${LIMITE_ID}{margin:9px 0 0;padding:7px 9px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-size:10px;line-height:1.7}
#${DEFI_ID}{margin:6px 0;padding-left:18px;font-size:10px;color:var(--ink-soft,#d7d1c6)}
#${DEFI_ID} li{margin:2px 0}
#${READOUT_ID}{
  min-height:34px;margin:8px 0;padding:7px 9px;border:1px solid var(--line);
  border-left:2px solid var(--gold,#e6b96f);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);
  font-size:10px;line-height:1.6;font-variant-numeric:tabular-nums;
}
#${READOUT_ID} strong{color:var(--gold-bright,#f4d69e)}
#${PANEL_ID} button{
  display:inline-block;width:auto;min-height:44px;margin:6px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;font-weight:600;cursor:pointer;
  transition:border-color .18s,background-color .18s;
}
#${PANEL_ID} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${PANEL_ID} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${PREFIX}-badge{
  position:absolute;right:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${PANEL_ID}[data-${PREFIX}-reduced="1"] button,
#${PANEL_ID}[data-${PREFIX}-reduced="1"] .${PREFIX}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${PANEL_ID} button,.${PREFIX}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${PANEL_ID}{font-size:10px;padding:9px}
  #${PANEL_ID} .${PREFIX}-radios{grid-template-columns:repeat(2,minmax(0,1fr))}
  #${LEGENDE_ID}{grid-template-columns:1fr}
  #${TABLE_ID}{font-size:9px}
  #${CANVAS_ID}{max-width:100%}
  .${PREFIX}-badge{right:8px;bottom:8px;max-width:70%;font-size:9px}
}
`;

/* ---------- Fabrique DOM locale et gardes d'idempotence ---------- */

function fabriquer(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function assure(parent, ctx, id, tag, className, text) {
  let node = document.getElementById(id);
  if (node && parent.contains(node)) return node;
  node = fabriquer(ctx, tag, className, text);
  node.id = id;
  parent.appendChild(node);
  return node;
}

/* E015-01 : faits de définition, texte sémantique réel (pas de canvas). */
function staticFait() {
  const wrap = document.createElement('div');
  const faits = [
    'Un biome est un grand type de végétation déterminé surtout par la température et les précipitations moyennes annuelles. Une forêt est un biome où les arbres forment un couvert continu.',
    'Forêt tropicale humide, forêt tempérée décidue et taïga sont trois biomes forestiers. Ils diffèrent par la chaleur et l’humidité : la canopée tropicale est persistante et étagée, la forêt tempérée est décidue, la taïga est dominée par les conifères.',
    'Savane, prairie et désert sont des milieux moins boisés : le couvert arboré y est clair ou absent. Les plages présentées ici sont des ordres de grandeur globaux, jamais des mesures du pays affiché.',
  ];
  faits.forEach((texte) => {
    const p = document.createElement('p');
    p.className = `${PREFIX}-lede`;
    p.textContent = texte;
    p.setAttribute('role', 'note');
    wrap.appendChild(p);
  });
  return wrap;
}

/* E015-10 : défi falsifiable en cinq temps, aligné sur la limite du schéma. */
function staticDefi() {
  const wrap = document.createElement('div');
  const titre = document.createElement('h3');
  titre.textContent = 'À vous de jouer : le biome suit-il vraiment les curseurs ?';
  const ol = document.createElement('ol');
  ol.id = DEFI_ID;
  const etapes = [
    'Prédiction : à 27 °C, augmenter les précipitations de 1 200 à 2 600 mm/an doit faire passer le biome de la savane à la forêt tropicale humide.',
    'Réglage : placez la température à 27 °C, puis faites glisser le curseur de précipitations au-delà de 2 000 mm/an.',
    'Résultat attendu : le point traverse la ligne des 2 000 mm/an, la forme devient un cercle et le readout annonce « forêt tropicale humide ».',
    'Falsification : si le biome changeait sans qu’aucun curseur ni seuil n’ait bougé, le modèle décrit ici est en défaut.',
    'Débrief : le classement est une fonction déterministe de deux variables globales ; il ne dit rien du climat réel du pays affiché, dont le jeu de données ne contient aucune mesure locale.',
  ];
  etapes.forEach((texte) => {
    const li = document.createElement('li');
    li.textContent = texte;
    ol.appendChild(li);
  });
  wrap.append(titre, ol);
  return wrap;
}

/* E015-02 : tableau comparatif, construit depuis BIOMES. */
function staticTable(ctx) {
  const table = fabriquer(ctx, 'table', `${PREFIX}-table`);
  table.id = TABLE_ID;
  const caption = assure(table, ctx, `${PREFIX}-caption`, 'caption', '',
    'Ordres de grandeur de référence (schéma global, aucune mesure locale).');
  caption.setAttribute('role', 'note');

  const thead = assure(table, ctx, `${PREFIX}-thead`, 'thead', '');
  const headRow = assure(thead, ctx, `${PREFIX}-head-row`, 'tr', '');
  ['Biome', 'Température', 'Précipitations', 'Signature végétale'].forEach((libelle, index) => {
    const th = assure(headRow, ctx, `${PREFIX}-th-${index}`, 'th', '', libelle);
    th.setAttribute('scope', 'col');
  });

  const tbody = assure(table, ctx, `${PREFIX}-tbody`, 'tbody', '');
  BIOMES.forEach((biome) => {
    const ligne = assure(tbody, ctx, `${PREFIX}-ligne-${biome.key}`, 'tr', `${PREFIX}-ligne`);
    ligne.dataset.biome = biome.key;
    [biome.nom, biome.plage.split(' · ')[0], biome.plage.split(' · ')[1] || '—', biome.signature]
      .forEach((texte, index) => {
        assure(ligne, ctx, `${PREFIX}-cell-${biome.key}-${index}`, 'td', '', texte);
      });
  });
  return table;
}

/* ---------- Construction du panneau (texte sémantique, lisible sans JS) ---------- */

function ensurePanel(ctx) {
  const existant = document.getElementById(PANEL_ID);
  if (existant && existant.isConnected) {
    return {
      panel: existant, fresh: false,
      radios: BIOMES.map((b) => document.getElementById(`${PREFIX}-radio-${b.key}`)),
      temperature: document.getElementById(TEMP_ID),
      temperatureValeur: document.getElementById(TEMP_OUT_ID),
      pluies: document.getElementById(PLUIE_ID),
      pluiesValeur: document.getElementById(PLUIE_OUT_ID),
      canvas: document.getElementById(CANVAS_ID),
      readout: document.getElementById(READOUT_ID),
      play: document.getElementById(PLAY_ID),
      lignes: Array.from(existant.querySelectorAll(`.${PREFIX}-ligne`)),
    };
  }

  const panel = fabriquer(ctx, 'section', `${PREFIX}-panel`);
  panel.id = PANEL_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const titre = assure(panel, ctx, TITLE_ID, 'h2', '', 'Biomes et forêts · diagramme climatique schématique');
  const lede = assure(panel, ctx, `${PREFIX}-intro`, 'div', '');
  lede.append(...Array.from(staticFait().childNodes));

  /* E015-02 — tableau des six biomes. */
  const table = staticTable(ctx);
  panel.appendChild(table);

  /* E015-03 — sélecteur de biome en choix unique : radios natifs dans un
   * fieldset légendé portant role="radiogroup" (pas d'aria-pressed ici). */
  const fieldset = assure(panel, ctx, GROUPE_ID, 'fieldset', `${PREFIX}-groupe`);
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Choisir un biome de référence (choix unique)');
  assure(fieldset, ctx, `${PREFIX}-legende-radios`, 'legend', '', 'Biome de référence (choix unique)');
  const radios = assure(fieldset, ctx, `${PREFIX}-radios`, 'div', `${PREFIX}-radios`);
  BIOMES.forEach((biome) => {
    const label = assure(radios, ctx, `${PREFIX}-label-${biome.key}`, 'label', `${PREFIX}-radio`);
    const input = assure(label, ctx, `${PREFIX}-radio-${biome.key}`, 'input', `${PREFIX}-input`);
    input.type = 'radio';
    input.name = RADIO_NAME;
    input.value = biome.key;
    input.checked = S.biome === biome.key;
    input.setAttribute('aria-label', `${biome.nom} : ${biome.plage}`);
    assure(label, ctx, `${PREFIX}-radio-texte-${biome.key}`, 'span', '', biome.court);
  });

  /* E015-04 — deux curseurs pilotant la classification. */
  const blocCurseurs = assure(panel, ctx, `${PREFIX}-curseurs`, 'div', '');
  const curseurTemp = assure(blocCurseurs, ctx, `${PREFIX}-bloc-temperature`, 'div', `${PREFIX}-curseur`);
  const labelTemp = assure(curseurTemp, ctx, `${PREFIX}-label-temperature`, 'label', '');
  assure(labelTemp, ctx, `${PREFIX}-texte-temperature`, 'span', '', 'Température moyenne annuelle');
  const valeurTemp = assure(labelTemp, ctx, TEMP_OUT_ID, 'span', `${PREFIX}-valeur`, '');
  const rangeTemp = assure(curseurTemp, ctx, TEMP_ID, 'input', `${PREFIX}-range`);
  rangeTemp.type = 'range';
  rangeTemp.min = String(X_MIN);
  rangeTemp.max = String(X_MAX);
  rangeTemp.step = '1';
  rangeTemp.value = String(S.temperature);
  rangeTemp.setAttribute('aria-label', 'Température moyenne annuelle, de moins 10 à 35 degrés Celsius');
  labelTemp.setAttribute('for', TEMP_ID);

  const curseurPluie = assure(blocCurseurs, ctx, `${PREFIX}-bloc-pluies`, 'div', `${PREFIX}-curseur`);
  const labelPluie = assure(curseurPluie, ctx, `${PREFIX}-label-pluies`, 'label', '');
  assure(labelPluie, ctx, `${PREFIX}-texte-pluies`, 'span', '', 'Précipitations annuelles');
  const valeurPluie = assure(labelPluie, ctx, PLUIE_OUT_ID, 'span', `${PREFIX}-valeur`, '');
  const rangePluie = assure(curseurPluie, ctx, PLUIE_ID, 'input', `${PREFIX}-range`);
  rangePluie.type = 'range';
  rangePluie.min = String(Y_MIN);
  rangePluie.max = String(Y_MAX);
  rangePluie.step = '50';
  rangePluie.value = String(S.pluies);
  rangePluie.setAttribute('aria-label', 'Précipitations annuelles, de 0 à 3 000 millimètres');
  labelPluie.setAttribute('for', PLUIE_ID);

  /* E015-05 / E015-07 — laboratoire canvas : un seul canvas, tabindex, rôle
   * image, aria-label unique et équivalent clavier décrit en texte. */
  const figure = assure(panel, ctx, `${PREFIX}-figure`, 'figure', `${PREFIX}-figure`);
  const canvas = assure(figure, ctx, CANVAS_ID, 'canvas', `${PREFIX}-canvas`);
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Diagramme schématique des biomes : température en abscisse, précipitations en ordonnée. Zones hachées et point courant en forme de cercle ou de losange.');
  canvas.setAttribute('aria-describedby', `${CLAVIER_ID} ${FIGCAP_ID}`);
  assure(figure, ctx, FIGCAP_ID, 'figcaption', `${PREFIX}-caption`,
    'Figure schématique : les hachures distinguent les zones, le cercle marque une forêt et le losange un milieu non forestier. Le point ne bouge pas quand l’animation est lancée : seule sa pulsation change.');

  /* E015-07 — bascule d'animation indépendante : aria-pressed légitime. */
  const play = assure(panel, ctx, PLAY_ID, 'button', '', '');
  play.type = 'button';
  play.setAttribute('aria-label', 'Lancer ou arrêter la pulsation du point sur le diagramme');

  /* E015-06 — annonce live et grandeurs chiffrées comparées à un seuil. */
  const readout = assure(panel, ctx, READOUT_ID, 'p', '');
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  /* E015-08 — légende textuelle des formes et des hachures. */
  const legende = assure(panel, ctx, LEGENDE_ID, 'ul', '');
  BIOMES.forEach((biome) => {
    const li = assure(legende, ctx, `${PREFIX}-legende-${biome.key}`, 'li', '');
    const glyph = biome.forme === 'cercle' ? '●' : '◆';
    assure(li, ctx, `${PREFIX}-legende-glyphe-${biome.key}`, 'span', '', `${glyph} ${biome.court} · hachures ${biome.hachure}`);
  });

  const mesures = assure(panel, ctx, MESURES_ID, 'p', '',
    `Mesures de référence : ${SEUILS.desert} mm/an = seuil de désert retenu ; ${SEUILS.boreale} mm/an = ${fmt(SEUILS.boreale / SEUILS.desert)}× ce seuil pour la taïga ; ${SEUILS.tropicale} mm/an = ${fmt(SEUILS.tropicale / SEUILS.desert)}× pour la forêt tropicale humide. ${SEUILS.doux} °C sépare les forêts tempérées des biomes tropicaux. Ce sont des ordres de grandeur schématiques, pas des mesures du pays affiché.`);
  mesures.setAttribute('role', 'note');

  const clavier = assure(panel, ctx, CLAVIER_ID, 'p', `${PREFIX}-note`,
    'Clavier : Tab atteint les curseurs, les boutons radio et le diagramme. Sur le diagramme, ← et → changent la température de 1 °C, ↑ et ↓ changent les précipitations de 100 mm/an, Début et Fin bornent la température. Les mêmes valeurs restent lisibles dans les deux champs et dans l’annonce live.');
  clavier.setAttribute('role', 'note');

  /* E015-10 — limite falsifiable, alignée sur l'absence de données locales. */
  const limite = assure(panel, ctx, LIMITE_ID, 'p', `${PREFIX}-limite`,
    'Limite et angle mort : ce diagramme est un schéma global à seuils, pas une mesure du territoire affiché ; le jeu de données ne contient ni température ni précipitation locale. Falsification : si l’on attribuait un biome au pays ou à un lieu de la carte à partir de ce seul diagramme, l’outil serait en défaut. Le classement change seulement quand les deux curseurs changent : si le biome affiché variait sans modification des curseurs ni du seuil, le modèle serait en défaut. Les effets du sol, de l’altitude et de la saisonnalité ne sont pas traités.');
  limite.setAttribute('role', 'note');

  panel.append(staticDefi());

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  if (aside && typeof aside.insertBefore === 'function') aside.insertBefore(panel, aside.firstChild);
  else if (aside && typeof aside.appendChild === 'function') aside.appendChild(panel);

  return {
    panel, fresh: true,
    radios: BIOMES.map((b) => document.getElementById(`${PREFIX}-radio-${b.key}`)),
    temperature: rangeTemp, temperatureValeur: valeurTemp,
    pluies: rangePluie, pluiesValeur: valeurPluie,
    canvas, readout, play,
    lignes: Array.from(table.querySelectorAll(`.${PREFIX}-ligne`)),
  };
}

/* ---------- E015-05 : rendu du laboratoire (un seul canvas, DPR ≤ 2) ---------- */

function palette(canvas) {
  const repli = { gold: '#e6b96f', muted: '#9aa4b2', fond: 'rgba(8,12,18,.86)' };
  try {
    const theme = getComputedStyle(canvas);
    const gold = theme.getPropertyValue('--gold-bright').trim();
    const muted = theme.getPropertyValue('--muted').trim();
    return { gold: gold || repli.gold, muted: muted || repli.muted, fond: repli.fond };
  } catch {
    return repli;
  }
}

/* Couvre une zone du diagramme de hachures, jamais d'une couleur seule :
 * cinq styles nommés dans la légende textuelle du panneau. */
function hachures(painter, x0, y0, x1, y1, style, couleur) {
  if (!(x1 > x0) || !(y1 > y0)) return;
  painter.save();
  painter.beginPath();
  painter.rect(x0, y0, x1 - x0, y1 - y0);
  painter.clip();
  painter.globalAlpha = 0.2;
  painter.strokeStyle = couleur;
  painter.fillStyle = couleur;
  painter.lineWidth = 1;
  const hauteur = y1 - y0;
  if (style === 'points') {
    for (let y = y0 + 4; y < y1; y += 9) {
      for (let x = x0 + 4; x < x1; x += 9) painter.fillRect(x, y, 1.3, 1.3);
    }
  } else if (style === 'horizontales') {
    for (let y = y0 + 4; y < y1; y += 8) {
      painter.beginPath(); painter.moveTo(x0, y); painter.lineTo(x1, y); painter.stroke();
    }
  } else if (style === 'verticales') {
    for (let x = x0 + 4; x < x1; x += 8) {
      painter.beginPath(); painter.moveTo(x, y0); painter.lineTo(x, y1); painter.stroke();
    }
  } else if (style === 'obliques') {
    for (let x = x0 - hauteur; x < x1; x += 9) {
      painter.beginPath(); painter.moveTo(x, y1); painter.lineTo(x + hauteur, y0); painter.stroke();
    }
  } else {
    for (let x = x0 - hauteur; x < x1; x += 12) {
      painter.beginPath();
      painter.moveTo(x, y1); painter.lineTo(x + hauteur, y0);
      painter.moveTo(x, y0); painter.lineTo(x + hauteur, y1);
      painter.stroke();
    }
  }
  painter.restore();
}

function drawLab() {
  const canvas = S.nodes.canvas;
  if (!canvas || !canvas.isConnected || typeof canvas.getContext !== 'function') return;
  const painter = canvas.getContext('2d');
  if (!painter) return;

  const cssW = Math.max(240, Math.min(360, canvas.clientWidth || 320));
  const cssH = Math.max(160, Math.min(260, canvas.clientHeight || Math.round(cssW * 0.7)));
  const dpr = Math.min(2, Math.max(1, (typeof window !== 'undefined' && window.devicePixelRatio) || 1));
  const pixelsW = Math.round(cssW * dpr);
  const pixelsH = Math.round(cssH * dpr);
  if (canvas.width !== pixelsW || canvas.height !== pixelsH) {
    canvas.width = pixelsW;
    canvas.height = pixelsH;
  }
  painter.setTransform(dpr, 0, 0, dpr, 0, 0);
  painter.clearRect(0, 0, cssW, cssH);

  const couleurs = palette(canvas);
  const pad = { gauche: 34, droite: 8, haut: 13, bas: 24 };
  const largeur = cssW - pad.gauche - pad.droite;
  const hauteur = cssH - pad.haut - pad.bas;
  const px = (temperature) => pad.gauche + ((temperature - X_MIN) / (X_MAX - X_MIN)) * largeur;
  const py = (pluies) => pad.haut + (1 - (pluies - Y_MIN) / (Y_MAX - Y_MIN)) * hauteur;
  const bande = (tMin, tMax, pMin, pMax, style) => hachures(
    painter,
    px(Math.max(X_MIN, tMin)), py(Math.min(Y_MAX, pMax)),
    px(Math.min(X_MAX, tMax)), py(Math.max(Y_MIN, pMin)),
    style, couleurs.muted,
  );

  bande(X_MIN, X_MAX, 0, SEUILS.desert, 'croisées');
  bande(X_MIN, SEUILS.froid, SEUILS.boreale, Y_MAX, 'verticales');
  bande(SEUILS.froid, SEUILS.doux, SEUILS.desert, SEUILS.temperee, 'obliques');
  bande(SEUILS.froid, SEUILS.doux, SEUILS.temperee, Y_MAX, 'horizontales');
  bande(SEUILS.doux, X_MAX, SEUILS.desert, SEUILS.tropicale, 'obliques');
  bande(SEUILS.doux, X_MAX, SEUILS.tropicale, Y_MAX, 'points');

  painter.lineWidth = 1;
  painter.strokeStyle = couleurs.muted;
  painter.globalAlpha = 0.6;
  painter.strokeRect(px(X_MIN), py(Y_MAX), px(X_MAX) - px(X_MIN), py(Y_MIN) - py(Y_MAX));
  painter.setLineDash([4, 4]);
  [SEUILS.desert, SEUILS.boreale, SEUILS.temperee, SEUILS.tropicale].forEach((seuil) => {
    painter.beginPath(); painter.moveTo(px(X_MIN), py(seuil)); painter.lineTo(px(X_MAX), py(seuil)); painter.stroke();
  });
  [SEUILS.froid, SEUILS.doux].forEach((seuil) => {
    painter.beginPath(); painter.moveTo(px(seuil), py(Y_MAX)); painter.lineTo(px(seuil), py(Y_MIN)); painter.stroke();
  });
  painter.setLineDash([]);
  painter.globalAlpha = 1;

  painter.fillStyle = couleurs.muted;
  painter.font = '600 8px system-ui, sans-serif';
  painter.textAlign = 'left';
  painter.textBaseline = 'middle';
  [SEUILS.desert, SEUILS.tropicale].forEach((seuil) => {
    painter.fillText(`${seuil} mm`, px(X_MIN) + 3, py(seuil) - 5);
  });
  painter.textAlign = 'center';
  painter.textBaseline = 'top';
  [SEUILS.froid, SEUILS.doux].forEach((seuil) => {
    painter.fillText(`${seuil} °C`, px(seuil), py(Y_MIN) + 4);
  });
  painter.textAlign = 'center';
  painter.fillText('Température moyenne (°C)', px(12), cssH - 11);
  painter.textAlign = 'left';
  painter.fillText('Précipitations (mm/an)', px(X_MIN) + 2, 1);

  /* Point courant : cercle pour une forêt, losange sinon, croix centrale.
   * La pulsation découle du temps écoulé : reproductible, sans aléa. */
  const biome = classerBiome(S.temperature, S.pluies);
  const cx = px(bornes(S.temperature, X_MIN, X_MAX));
  const cy = py(bornes(S.pluies, Y_MIN, Y_MAX));
  const pulse = S.anime && !S.reduced() ? 1.5 * Math.sin(S.progression * Math.PI * 2) : 0;
  const rayon = 5 + pulse;
  painter.fillStyle = couleurs.gold;
  painter.globalAlpha = 0.35;
  painter.beginPath(); painter.arc(cx, cy, rayon + 3, 0, Math.PI * 2); painter.fill();
  painter.globalAlpha = 1;
  painter.beginPath();
  if (biome.forme === 'cercle') {
    painter.arc(cx, cy, rayon, 0, Math.PI * 2);
  } else {
    painter.moveTo(cx, cy - rayon - 1);
    painter.lineTo(cx + rayon + 1, cy);
    painter.lineTo(cx, cy + rayon + 1);
    painter.lineTo(cx - rayon - 1, cy);
    painter.closePath();
  }
  painter.fill();
  painter.strokeStyle = '#0b0f15';
  painter.lineWidth = 1.4;
  painter.beginPath();
  painter.moveTo(cx - 2.5, cy); painter.lineTo(cx + 2.5, cy);
  painter.moveTo(cx, cy - 2.5); painter.lineTo(cx, cy + 2.5);
  painter.stroke();

  painter.font = '700 9px system-ui, sans-serif';
  painter.textAlign = cx > px(24) ? 'right' : 'left';
  painter.textBaseline = 'bottom';
  const decalage = cx > px(24) ? -9 : 9;
  const labelX = bornes(cx + decalage, px(X_MIN) + 2, px(X_MAX) - 2);
  const labelY = Math.max(py(Y_MAX) + 10, cy - 7);
  painter.lineWidth = 3;
  painter.strokeStyle = couleurs.fond;
  painter.strokeText(biome.court, labelX, labelY);
  painter.fillStyle = couleurs.gold;
  painter.fillText(biome.court, labelX, labelY);
  painter.globalAlpha = 1;

  canvas.setAttribute(`data-${PREFIX}-biome`, biome.key);
}

/* ---------- E015-06 : mesures chiffrées référencées dans un readout live ---------- */

function majAffichage() {
  const biome = classerBiome(S.temperature, S.pluies);
  const n = S.nodes;
  if (n.temperatureValeur) n.temperatureValeur.textContent = `${S.temperature} °C`;
  if (n.pluiesValeur) n.pluiesValeur.textContent = `${S.pluies} mm/an`;
  if (n.temperature) n.temperature.value = String(S.temperature);
  if (n.pluies) n.pluies.value = String(S.pluies);
  if (n.lignes) {
    n.lignes.forEach((ligne) => {
      ligne.classList.toggle('is-active', ligne.dataset.biome === biome.key);
    });
  }
  if (n.radios) {
    n.radios.forEach((radio) => { if (radio) radio.checked = radio.value === S.biome; });
  }
  if (n.play) {
    n.play.textContent = S.anime ? '■ Arrêter la pulsation du point' : '▶ Animer la pulsation du point';
    n.play.setAttribute('aria-pressed', S.anime ? 'true' : 'false');
  }
  if (n.readout) {
    const fort = (texte) => {
      const s = document.createElement('strong');
      s.textContent = texte;
      return s;
    };
    n.readout.textContent = '';
    n.readout.append(document.createTextNode('Lecture : '));
    n.readout.appendChild(fort(`${S.temperature} °C`));
    n.readout.append(document.createTextNode(' et '));
    n.readout.appendChild(fort(`${S.pluies} mm/an`));
    n.readout.append(document.createTextNode(` conduisent au biome « ${biome.nom} » (${biome.famille === 'foret' ? 'forêt' : 'milieu non forestier'}). Référence : ${SEUILS.desert} mm/an marque le désert ; `));
    n.readout.appendChild(fort(`${S.pluies} mm/an = ${fmt(S.pluies / SEUILS.desert)}×`));
    n.readout.append(document.createTextNode(` ce seuil. Le seuil conventionnel de la forêt tropicale humide est ${SEUILS.tropicale} mm/an, soit `));
    n.readout.appendChild(fort(`${fmt(SEUILS.tropicale / SEUILS.desert)}×`));
    n.readout.append(document.createTextNode(' le seuil de référence. Schéma global, aucune mesure locale.'));
  }
  drawLab();
}

/* ---------- E015-07 : boucle rAF unique, pause sur document.hidden, mouvement réduit ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
}

function startLoop() {
  if (S.rafId || typeof requestAnimationFrame !== 'function') return;
  if (S.reduced() || !S.anime) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.nodes.canvas || !S.nodes.canvas.isConnected) return;
  S.depart = 0;
  S.rafId = requestAnimationFrame(tick);
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.nodes.canvas || !S.nodes.canvas.isConnected) return;
  if (!S.anime || S.reduced()) {
    drawLab();
    return;
  }
  if (!S.depart) S.depart = ts;
  /* Progression périodique calculée depuis le temps écoulé : reproductible,
   * sans source aléatoire et sans variation de la position du point. */
  S.progression = ((ts - S.depart) / 2200) % 1;
  drawLab();
  S.rafId = requestAnimationFrame(tick);
}

function installGlobalListeners() {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.setAttribute(`data-${PREFIX}-reduced`, mq.matches ? '1' : '0');
        if (mq.matches) {
          stopLoop();
          S.anime = false;
        }
        majAffichage();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch {
      /* Préférence indisponible : ctx.reducedMotion() reste la source. */
    }
  }
}

/* ---------- E015-09 : badge de non-localité posé sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map || document.getElementById(BADGE_ID)) return;
  const badge = fabriquer(ctx, 'div', `${PREFIX}-badge`,
    'Biomes : schéma climatique global à seuils · aucune donnée locale de climat dans ce pays.');
  badge.id = BADGE_ID;
  badge.setAttribute('aria-hidden', 'true');
  map.appendChild(badge);
}

/* ---------- E015-10 : point d'entrée unique, idempotent ---------- */

register('E015', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof document === 'undefined') return;

  ctx.css(CSS_ID, CSS);

  S.reduced = typeof ctx.reducedMotion === 'function' ? () => !!ctx.reducedMotion() : () => false;

  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  const reduced = S.reduced();
  S.nodes.panel.setAttribute(`data-${PREFIX}-reduced`, reduced ? '1' : '0');
  if (reduced) S.anime = false;

  /* Reconfiguration de l'unique boucle à chaque rendu : l'ancien canvas
   * n'appartient plus au document, on annule avant de reprendre. */
  stopLoop();
  majAffichage();

  if (S.nodes.fresh) {
    const n = S.nodes;
    n.panel.addEventListener('click', (event) => {
      const cible = event.target;
      if (cible === n.play) {
        if (S.reduced()) return;
        S.anime = !S.anime;
        if (!S.anime) stopLoop();
        majAffichage();
        if (S.anime) startLoop();
        return;
      }
      if (!cible || typeof cible.closest !== 'function') return;
      const entree = cible.closest(`.${PREFIX}-radio`);
      if (!entree) return;
      const radio = entree.querySelector('input[type="radio"]');
      if (!radio) return;
      S.biome = radio.value;
      const reglage = parCle(S.biome).preset;
      S.temperature = reglage.temp;
      S.pluies = reglage.pluie;
      S.progression = 0;
      majAffichage();
    });

    n.panel.addEventListener('change', (event) => {
      const cible = event.target;
      if (!cible || cible.name !== RADIO_NAME) return;
      S.biome = cible.value;
      const reglage = parCle(S.biome).preset;
      S.temperature = reglage.temp;
      S.pluies = reglage.pluie;
      S.progression = 0;
      majAffichage();
    });

    n.panel.addEventListener('input', (event) => {
      const cible = event.target;
      if (cible === n.temperature) {
        S.temperature = bornes(Number(cible.value) || 0, X_MIN, X_MAX);
        majAffichage();
      } else if (cible === n.pluies) {
        S.pluies = bornes(Number(cible.value) || 0, Y_MIN, Y_MAX);
        majAffichage();
      }
    });

    n.panel.addEventListener('keydown', (event) => {
      if (event.target !== n.canvas) return;
      let next = null;
      if (event.key === 'ArrowRight') next = { temperature: Math.min(X_MAX, S.temperature + 1) };
      else if (event.key === 'ArrowLeft') next = { temperature: Math.max(X_MIN, S.temperature - 1) };
      else if (event.key === 'ArrowUp') next = { pluies: Math.min(Y_MAX, S.pluies + 100) };
      else if (event.key === 'ArrowDown') next = { pluies: Math.max(Y_MIN, S.pluies - 100) };
      else if (event.key === 'Home') next = { temperature: X_MIN };
      else if (event.key === 'End') next = { temperature: X_MAX };
      else return;
      event.preventDefault();
      event.stopPropagation();
      if ('temperature' in next) S.temperature = next.temperature;
      if ('pluies' in next) S.pluies = next.pluies;
      majAffichage();
    });
  }

  installGlobalListeners();
  startLoop();
});
