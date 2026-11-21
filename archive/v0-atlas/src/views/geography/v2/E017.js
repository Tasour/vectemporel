import { register } from './registry.js';

/* Lentille E017 — vue GEOGRAPHIE (seconde passe, V2).
 * Thème : zones climatiques et températures, isothermes.
 *
 * Les dix chantiers E017-01 … E017-10 sont réellement implémentés et décrits
 * dans UNIFIED_AUDIT/GEOGRAPHIE/V2/views/E017.md. La V2 reprend le thème de la
 * passe 1 mais la reconstruit : préfixe DOM `geography-v2-e017-`, radiogroupe
 * explicite, défi falsifiable en cinq temps, boucle rAF unique, movement réduit.
 *
 * Tout est local : aucune requête réseau, aucune valeur aléatoire, aucune
 * journalisation, aucun fichier partagé modifié. Le contenu pédagogique est du
 * texte sémantique réel (titres, paragraphes, tableau, listes) présent dans le
 * DOM même sans animation ; le canvas n'est qu'un laboratoire qui trace des
 * isothermes à partir d'un modèle schématique déterministe, jamais des relevés.
 *
 * ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const P = 'geography-v2-e017';
const CSS_ID = P;

/* Table des identifiants, tous préfixés `geography-v2-e017-`. */
const ID = {
  panel: P + '-panel',
  title: P + '-title',
  legendGroup: P + '-legend-group',
  radioJanvier: P + '-janvier',
  radioJuillet: P + '-juillet',
  lat: P + '-lat',
  latValue: P + '-lat-value',
  alt: P + '-alt',
  altValue: P + '-alt-value',
  canvas: P + '-canvas',
  legend: P + '-legend',
  readout: P + '-readout',
  play: P + '-play',
  table: P + '-table',
  badge: P + '-badge',
  challenge: P + '-challenge',
  challengeToggle: P + '-challenge-toggle',
  challengeDebrief: P + '-challenge-debrief',
};

/* Un seul point de scheduling : une seule boucle rAF, jamais deux. */
const RAF = typeof requestAnimationFrame === 'function'
  ? (callback) => requestAnimationFrame(callback)
  : null;

const RAD = Math.PI / 180;
const OBLIQUITE = 23.44;   // Obliquité de l'axe terrestre, en degrés.
const GRADIENT = 6.5;      // Gradient thermique normal de la troposphère, °C/km (ISA/OMM).
const TROPOPAUSE_KM = 11;  // Hauteur de la tropopause de l'atmosphère standard, km.
const JOUR_JANVIER = 15;   // Mi-janvier, jour 15 de l'année civile.
const JOUR_JUILLET = 196;  // Mi-juillet, jour 196 de l'année civile.
const SEUILS = [30, 20, 10, 0, -10];
const LONS = [];
const LATS = [];

for (let lon = -180; lon <= 180; lon += 10) {
  LONS.push({ deg: lon, cos: Math.cos(lon * RAD) });
}
for (let lat = -89; lat <= 89; lat += 2) {
  LATS.push({ deg: lat, sin: Math.sin(lat * RAD), cos: Math.cos(lat * RAD) });
}

/* État de module : survit au `stage.innerHTML = ''` de la coque. */
const S = {
  saison: 'janvier',
  lat: 45,
  alt: 0,
  playing: false,
  sweep: 0,
  lastTs: 0,
  rafId: 0,
  visibilityBound: false,
  motionBound: false,
  lastAnnouncedDay: -999,
  reduced: false,
  challengeOpen: false,
  nodes: null,
};

/* ---------- E017-05 : modèle déterministe, aucune donnée fabriquée ---------- */

const fmt = (n) => (Math.round(n * 10) / 10).toFixed(1).replace('.', ',');

/* Déclinaison solaire : approximation de Cooper, référence classique. */
function declinaison(jour) {
  return OBLIQUITE * Math.sin((2 * Math.PI * (jour - 81)) / 365);
}

function jourActif() {
  if (S.playing) return 1 + Math.floor(S.sweep * 364);
  return S.saison === 'janvier' ? JOUR_JANVIER : JOUR_JUILLET;
}

/* Température schématique :
 *   T = -8 + 35 cos Z + 5 (delta / 23,44) cos lambda - 6,5 h
 * avec Z l'angle zénithal solaire à midi, delta la déclinaison, lambda la
 * longitude (modulation continent/océan schématique) et h l'altitude en km.
 * Les constantes -8 et 35 calent l'échelle ; le gradient 6,5 °C/km est une
 * grandeur de référence de l'atmosphère standard. */
function temperatureGrille(point, decSin, decCos, facteurSaison, altKm) {
  const cosZ = Math.max(0, point.sin * decSin + point.cos * decCos);
  return -8 + 35 * cosZ + 5 * facteurSaison * point.cosLon - GRADIENT * altKm;
}

function temperature(lat, lon, jour, alt) {
  const delta = declinaison(jour);
  const dec = delta * RAD;
  const phi = lat * RAD;
  const cosZ = Math.max(0, Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec));
  return -8 + 35 * cosZ + 5 * (delta / OBLIQUITE) * Math.cos(lon * RAD) - GRADIENT * (alt / 1000);
}

/* Classement thermique d'après les seuls températures mensuelles ; la classe
 * B (aride) exige des précipitations et ne peut pas être déduite ici. */
function classeThermique() {
  const tJanvier = temperature(S.lat, 0, JOUR_JANVIER, S.alt);
  const tJuillet = temperature(S.lat, 0, JOUR_JUILLET, S.alt);
  const froid = Math.min(tJanvier, tJuillet);
  const chaud = Math.max(tJanvier, tJuillet);
  if (chaud < 10) return 'E — polaire';
  if (froid >= 18) return 'A — tropical';
  if (froid <= -3) return 'D — boréal';
  return 'C — tempéré';
}

/* ---------- E017-06 : contours d'isothermes par interpolation linéaire ---------- */

function lignesIsothermes(jour, alt) {
  const delta = declinaison(jour);
  const decSin = Math.sin(delta * RAD);
  const decCos = Math.cos(delta * RAD);
  const facteurSaison = delta / OBLIQUITE;
  const altKm = alt / 1000;
  const grille = LATS.map((p) => ({ sin: p.sin, cos: p.cos, cosLon: 0 }));
  const resultats = [];

  LONS.forEach((lon) => {
    grille.forEach((p) => { p.cosLon = lon.cos; });
    SEUILS.forEach((seuil) => {
      if (!resultats[seuil]) resultats[seuil] = [];
      const crossings = [];
      let precedent = temperatureGrille(grille[0], decSin, decCos, facteurSaison, altKm) - seuil;
      for (let i = 1; i < grille.length; i += 1) {
        const courant = temperatureGrille(grille[i], decSin, decCos, facteurSaison, altKm) - seuil;
        if ((precedent <= 0 && courant > 0) || (precedent > 0 && courant <= 0)) {
          const fraction = precedent === courant ? 0.5 : precedent / (precedent - courant);
          crossings.push(LATS[i - 1].deg + (LATS[i].deg - LATS[i - 1].deg) * fraction);
        }
        precedent = courant;
      }
      crossings.forEach((lat, index) => {
        if (!resultats[seuil][index]) resultats[seuil][index] = [];
        resultats[seuil][index].push([lon.deg, lat]);
      });
    });
  });

  const lignes = [];
  SEUILS.forEach((seuil) => {
    (resultats[seuil] || []).forEach((points) => {
      if (points.length > 1) lignes.push({ seuil, points });
    });
  });
  return lignes;
}

/* ---------- E017-01 / E017-02 : texte sémantique et tableau statique ---------- */

function staticFacts(ctx) {
  const wrap = ctx.el('div', P + '-facts');
  const faits = [
    'Une zone climatique regroupe des régions dont le régime de température et d’humidité se ressemble : la classification Köppen-Geiger définit ses groupes par des seuils mensuels chiffrés.',
    'Une isotherme relie les points d’une carte qui ont la même température à un instant donné ; son tracé quitte les parallèles sous l’effet des continents, des courants marins et de l’altitude.',
    'Le laboratoire utilise un modèle schématique et transparent : T = −8 + 35 cos Z + 5 (δ / 23,44) cos λ − 6,5 h, avec δ la déclinaison solaire, Z l’angle zénithal solaire à midi, λ la longitude et h l’altitude en kilomètres. Il illustre les mécanismes, il ne remplace pas des relevés.',
    'Le gradient de 6,5 °C/km est la valeur de l’atmosphère standard (ISA/OMM), valable jusqu’à la tropopause vers 11 km : c’est une grandeur de référence, distincte des constantes de calage du modèle.',
  ];
  faits.forEach((texte) => {
    wrap.appendChild(ctx.el('p', P + '-fait', texte));
  });
  return wrap;
}

function staticTable(ctx) {
  const table = ctx.el('table', P + '-table');
  table.id = ID.table;
  table.appendChild(ctx.el('caption', '',
    'Seuils Köppen-Geiger et constantes de référence, indépendants du modèle schématique.'));

  const thead = ctx.el('thead', '');
  const hr = ctx.el('tr', '');
  ['Grandeur', 'Valeur', 'Définition ou référence'].forEach((titre) => {
    const th = ctx.el('th', '', titre);
    th.scope = 'col';
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = ctx.el('tbody', '');
  const lignes = [
    ['Obliquité de l’axe terrestre', '23,44°', 'Amplitude maximale de la déclinaison solaire'],
    ['Déclinaison (approx. de Cooper)', '±23,44°', 'δ = 23,44 sin[2π(jour − 81)/365]'],
    ['Gradient thermique normal (ISA/OMM)', '6,5 °C/km', `Jusqu’à la tropopause, vers ${TROPOPAUSE_KM} km`],
    ['Température ISA au niveau de la mer', '15 °C', 'Référence de l’atmosphère standard'],
    ['Climat tropical (A)', '≥ 18 °C', 'Température du mois le plus froid'],
    ['Climat tempéré (C)', '−3 °C à 18 °C', 'Mois le plus froid (variante : 0 °C)'],
    ['Climat boréal (D)', '≤ −3 °C', 'Mois le plus froid ; mois le plus chaud > 10 °C'],
    ['Climat polaire (E)', '< 10 °C', 'Température du mois le plus chaud'],
  ];
  lignes.forEach((cells) => {
    const tr = ctx.el('tr', '');
    cells.forEach((contenu, index) => {
      const cellule = ctx.el(index === 0 ? 'th' : 'td', '', contenu);
      if (index === 0) cellule.scope = 'row';
      tr.appendChild(cellule);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

/* ---------- E017-10 : défi falsifiable en cinq temps ---------- */

function challengeBlock(ctx) {
  const bloc = ctx.el('section', P + '-challenge');
  bloc.id = ID.challenge;
  bloc.appendChild(ctx.el('h3', '', 'Défi falsifiable — vérifier le modèle'));
  const ordre = ctx.el('ol', P + '-etapes');
  [
    'Prédiction : à 45° de latitude, l’isotherme 20 °C se trouve plus au nord en juillet qu’en janvier.',
    'Réglage : placer la latitude à 45° et l’altitude à 0 m, puis comparer les deux saisons sur le canvas.',
    'Résultat attendu : la courbe 20 °C monte en latitude en juillet, car la déclinaison solaire devient positive.',
    'Falsification : porter l’altitude à 4000 m ; si aucune isotherme positive n’apparaît, l’effet du gradient est confirmé, sinon le modèle serait réfuté.',
    'Débrief : le modèle prédit le déplacement saisonnier et le refroidissement en altitude ; il reste schématique et ne remplace aucun relevé.',
  ].forEach((texte) => ordre.appendChild(ctx.el('li', '', texte)));
  bloc.appendChild(ordre);

  const bouton = ctx.el('button', P + '-challenge-toggle', 'Afficher le débrief');
  bouton.type = 'button';
  bouton.id = ID.challengeToggle;
  bouton.setAttribute('aria-controls', ID.challengeDebrief);
  bouton.setAttribute('aria-expanded', 'false');

  const debrief = ctx.el('p', P + '-debrief',
    'Débrief : la prédiction est confirmée par les formules — déclinaison positive en juillet et correction de −26,0 °C à 4000 m (4 km × 6,5 °C/km). Un résultat contraire invaliderait le modèle,ce qui le rend falsifiable.');
  debrief.id = ID.challengeDebrief;
  debrief.hidden = true;

  bouton.addEventListener('click', () => {
    S.challengeOpen = !S.challengeOpen;
    debrief.hidden = !S.challengeOpen;
    bouton.setAttribute('aria-expanded', S.challengeOpen ? 'true' : 'false');
    bouton.textContent = S.challengeOpen ? 'Masquer le débrief' : 'Afficher le débrief';
    if (S.nodes && S.nodes.readout) {
      S.nodes.readout.textContent = S.challengeOpen
        ? 'Défi : débrief affiché — modèle confirmé par les formules (déclinaison et gradient).'
        : 'Défi : débrief masqué — le modèle reste une hypothèse falsifiable.';
    }
  });
  bloc.append(bouton, debrief);
  return bloc;
}

/* ---------- Feuille de style unique, injectée une seule fois ---------- */

const CSS = `
#${ID.panel}{
  margin:14px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;
  background:rgba(255,255,255,.02);color:var(--ink);font-size:11px;line-height:1.6;
}
#${ID.panel} h2{margin:0 0 6px;font-size:14px;color:var(--gold-bright,#f4d69e)}
#${ID.panel} h3{margin:12px 0 4px;font-size:11px;color:var(--ink)}
#${ID.panel} p{margin:5px 0;max-width:68ch}
.${P}-fait{margin:5px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
#${ID.table}{width:100%;border-collapse:collapse;margin:8px 0;font-variant-numeric:tabular-nums;font-size:10px}
#${ID.table} caption{text-align:left;margin-bottom:4px;color:var(--muted)}
#${ID.table} th,#${ID.table} td{border:1px solid var(--line);padding:4px 5px;text-align:left;vertical-align:top}
#${ID.table} th{color:var(--gold-bright,#f4d69e);font-weight:600}
#${ID.legendGroup}{margin:8px 0;padding:7px;border:1px solid var(--line);border-radius:8px}
#${ID.legendGroup} legend{padding:0 4px;color:var(--muted)}
.${P}-choix{display:inline-flex;align-items:center;gap:5px;min-height:36px;margin-right:8px;padding:2px 6px;cursor:pointer}
.${P}-choix input{min-width:18px;min-height:18px;accent-color:var(--gold,#e6b96f)}
#${ID.lat},#${ID.alt}{width:100%;min-height:36px;accent-color:var(--gold,#e6b96f)}
.${P}-valeur{font-variant-numeric:tabular-nums;color:var(--gold-bright,#f4d69e);font-weight:600}
#${ID.canvas}{
  display:block;width:100%;height:230px;margin:8px 0;border:1px solid var(--line);
  border-radius:8px;background:rgba(0,0,0,.28);touch-action:none;
}
#${ID.legend}{font-size:10px;color:var(--muted)}
#${ID.readout}{
  min-height:44px;padding:7px 8px;border:1px solid var(--line);border-radius:8px;
  background:rgba(230,185,111,.06);color:var(--ink-soft,#d7d1c6);font-size:10px;
  font-variant-numeric:tabular-nums;
}
#${ID.readout} strong{color:var(--gold-bright,#f4d69e)}
#${ID.panel} button{
  display:inline-block;width:auto;min-height:40px;margin:8px 6px 0 0;padding:6px 12px;
  border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);
  color:var(--gold-bright,#f4d69e);font:inherit;font-size:11px;cursor:pointer;
  transition:border-color .18s,background-color .18s,color .18s;
}
#${ID.panel} button:hover{border-color:var(--gold,#e6b96f);background:rgba(230,185,111,.12)}
#${ID.panel} button:disabled{opacity:.6;cursor:not-allowed}
#${ID.panel} :focus-visible{outline:2px solid var(--gold-bright,#f4d69e);outline-offset:2px}
.${P}-etapes{margin:6px 0;padding-left:20px;font-size:10px}
.${P}-etapes li{margin:3px 0;max-width:68ch}
.${P}-debrief{margin:6px 0;padding-left:9px;border-left:2px solid var(--gold,#e6b96f)}
.${P}-badge{
  position:absolute;left:16px;bottom:14px;z-index:3;max-width:62%;padding:4px 8px;
  border:1px solid var(--gold,#e6b96f);border-radius:6px;
  background:rgba(8,12,18,.9);color:var(--gold-bright,#f4d69e);
  font-size:10px;line-height:1.4;pointer-events:none;
}
#${ID.panel}[data-${P}-reduced="1"] button,
#${ID.panel}[data-${P}-reduced="1"] .${P}-badge{transition:none}
@media (prefers-reduced-motion:reduce){
  #${ID.panel} button,.${P}-badge{transition:none!important;animation:none!important}
}
@media (max-width:620px){
  #${ID.panel}{font-size:10px;padding:9px}
  #${ID.canvas}{height:190px}
  #${ID.panel} button{min-height:44px}
  .${P}-choix{margin-right:4px}
}
`;

/* ---------- Construction du panneau (texte sémantique lisible sans animation) ---------- */

function withinContext(node, ctx) {
  const hosts = [ctx.layout, ctx.stage].filter(Boolean);
  return hosts.some((host) => typeof host.contains === 'function' && host.contains(node));
}

function ensurePanel(ctx) {
  let panel = document.getElementById(ID.panel);
  const usable = panel && panel.isConnected && withinContext(panel, ctx)
    && panel.querySelector('#' + ID.canvas) && panel.querySelector('#' + ID.readout);
  if (usable) {
    return {
      panel, fresh: false,
      janvier: document.getElementById(ID.radioJanvier),
      juillet: document.getElementById(ID.radioJuillet),
      lat: document.getElementById(ID.lat),
      latOut: document.getElementById(ID.latValue),
      alt: document.getElementById(ID.alt),
      altOut: document.getElementById(ID.altValue),
      canvas: document.getElementById(ID.canvas),
      readout: document.getElementById(ID.readout),
      play: document.getElementById(ID.play),
      legend: document.getElementById(ID.legend),
      challenge: document.getElementById(ID.challengeToggle),
    };
  }
  if (panel && panel.parentNode) panel.parentNode.removeChild(panel);

  panel = ctx.el('section', P + '-panel');
  panel.id = ID.panel;
  panel.setAttribute('aria-labelledby', ID.title);

  const title = ctx.el('h2', '', 'Zones climatiques et températures, isothermes');
  title.id = ID.title;
  const lead = ctx.el('p', '',
    'Comparer les isothermes de janvier et de juillet montre que la température dépend de la latitude, de l’altitude et de la position des continents : aucune carte climatique n’est un simple décalque des parallèles.');

  /* E017-03 : radiogroupe explicite, choix unique — jamais aria-pressed. */
  const fieldset = document.createElement('fieldset');
  fieldset.id = ID.legendGroup;
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-labelledby', ID.legendGroup + '-legend');
  const legend = ctx.el('legend', '', 'Saison de référence (choix unique)');
  legend.id = ID.legendGroup + '-legend';
  fieldset.appendChild(legend);
  [
    [ID.radioJanvier, 'janvier', 'Janvier (jour 15)'],
    [ID.radioJuillet, 'juillet', 'Juillet (jour 196)'],
  ].forEach(([id, valeur, libelle]) => {
    const lab = ctx.el('label', P + '-choix');
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = P + '-saison';
    radio.id = id;
    radio.value = valeur;
    radio.checked = S.saison === valeur;
    lab.appendChild(radio);
    lab.appendChild(document.createTextNode(libelle));
    fieldset.appendChild(lab);
  });

  /* E017-04 : curseurs de latitude et d'altitude, valeurs affichées. */
  const sousTitre = ctx.el('h3', '', 'Observer la température');

  const latRow = ctx.el('p', '');
  const latLabel = document.createElement('label');
  latLabel.setAttribute('for', ID.lat);
  latLabel.appendChild(document.createTextNode('Latitude : '));
  const latOut = ctx.el('span', P + '-valeur', '');
  latOut.id = ID.latValue;
  latLabel.appendChild(latOut);
  latRow.appendChild(latLabel);

  const lat = document.createElement('input');
  lat.type = 'range';
  lat.id = ID.lat;
  lat.min = '0';
  lat.max = '80';
  lat.step = '5';
  lat.value = String(S.lat);
  lat.setAttribute('aria-label', 'Latitude, de 0 à 80 degrés');

  const altRow = ctx.el('p', '');
  const altLabel = document.createElement('label');
  altLabel.setAttribute('for', ID.alt);
  altLabel.appendChild(document.createTextNode('Altitude : '));
  const altOut = ctx.el('span', P + '-valeur', '');
  altOut.id = ID.altValue;
  altLabel.appendChild(altOut);
  altRow.appendChild(altLabel);

  const alt = document.createElement('input');
  alt.type = 'range';
  alt.id = ID.alt;
  alt.min = '0';
  alt.max = '4000';
  alt.step = '250';
  alt.value = String(S.alt);
  alt.setAttribute('aria-label', 'Altitude, de 0 à 4000 mètres');

  const canvas = document.createElement('canvas');
  canvas.id = ID.canvas;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    'Carte schématique des isothermes de −10 à 30 degrés Celsius. Flèches gauche et droite : changer de saison ; flèches haut et bas : changer la latitude ; Page précédente et Page suivante : changer l’altitude ; Origine : réinitialiser.');
  canvas.setAttribute('aria-describedby', ID.legend);

  const legendText = ctx.el('p', P + '-legend',
    'Traits pleins : isothermes positives ; tirets : isothermes négatives ; pointillés : isotherme 0 °C. Les valeurs sont écrites sur le tracé et reprises dans le statut, jamais portées par la seule couleur.');
  legendText.id = ID.legend;

  const readout = ctx.el('p', P + '-readout', 'Mesures en attente de calcul.');
  readout.id = ID.readout;
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');

  const play = ctx.el('button', '', '▶ Animer l’année');
  play.type = 'button';
  play.id = ID.play;
  play.setAttribute('aria-pressed', 'false');

  panel.append(title, lead, staticFacts(ctx), staticTable(ctx), fieldset, sousTitre,
    latRow, lat, altRow, alt, canvas, legendText, readout, play, challengeBlock(ctx));

  const host = ctx.layout || ctx.stage;
  const aside = host && typeof host.querySelector === 'function'
    ? (host.querySelector('.geo-panel') || host)
    : ctx.stage;
  aside.insertBefore(panel, aside.firstChild);

  return {
    panel, fresh: true,
    janvier: document.getElementById(ID.radioJanvier),
    juillet: document.getElementById(ID.radioJuillet),
    lat, latOut, alt, altOut, canvas, readout, play, legend: legendText,
    challenge: document.getElementById(ID.challengeToggle),
  };
}

/* ---------- E017-06 / E017-09 : laboratoire canvas ---------- */

function drawLab() {
  const cv = S.nodes && S.nodes.canvas;
  if (!cv || typeof cv.getContext !== 'function') return;
  const g = cv.getContext('2d');
  if (!g) return;

  const cssW = cv.clientWidth || 320;
  const cssH = cv.clientHeight || 230;
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const bw = Math.round(cssW * dpr);
  const bh = Math.round(cssH * dpr);
  if (cv.width !== bw || cv.height !== bh) {
    cv.width = bw;
    cv.height = bh;
  }
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);

  const pad = 18;
  const iw = Math.max(10, cssW - pad * 2);
  const ih = Math.max(10, cssH - pad * 2);
  const px = (lon) => pad + ((lon + 180) / 360) * iw;
  const py = (lat) => pad + ((90 - lat) / 180) * ih;

  g.strokeStyle = 'rgba(255,255,255,.14)';
  g.lineWidth = 1;
  if (g.setLineDash) g.setLineDash([]);
  g.strokeRect(pad, pad, iw, ih);
  for (let lon = -120; lon <= 120; lon += 60) {
    g.beginPath();
    g.moveTo(px(lon), pad);
    g.lineTo(px(lon), pad + ih);
    g.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    g.beginPath();
    g.moveTo(pad, py(lat));
    g.lineTo(pad + iw, py(lat));
    g.stroke();
  }

  /* E017-09 : un style de trait par seuil, jamais la seule couleur. */
  lignesIsothermes(jourActif(), S.alt).forEach(({ seuil, points }) => {
    const dash = seuil < 0 ? [5, 4] : (seuil === 0 ? [2, 3] : []);
    if (g.setLineDash) g.setLineDash(dash);
    g.strokeStyle = seuil === 0 ? 'rgba(255,255,255,.95)' : 'rgba(214,207,193,.65)';
    g.lineWidth = seuil === 0 ? 2 : 1.2;
    g.beginPath();
    points.forEach(([lon, lat], index) => {
      const x = px(lon);
      const y = py(lat);
      if (index === 0) g.moveTo(x, y); else g.lineTo(x, y);
    });
    g.stroke();
    const dernier = points[points.length - 1];
    const etiquette = seuil < 0 ? `−${Math.abs(seuil)} °C` : `${seuil} °C`;
    if (g.setLineDash) g.setLineDash([]);
    g.fillStyle = 'rgba(244,214,158,.95)';
    g.font = '10px sans-serif';
    g.fillText(etiquette, px(dernier[0]) - 38, py(dernier[1]) - 4);
  });

  /* Repère non chromatique du lieu observé : croix cerclée à longitude 0. */
  const x = px(0);
  const y = py(S.lat);
  g.strokeStyle = 'rgba(244,214,158,.98)';
  g.lineWidth = 1.6;
  g.beginPath();
  g.arc(x, y, 5, 0, 2 * Math.PI);
  g.moveTo(x - 9, y); g.lineTo(x + 9, y);
  g.moveTo(x, y - 9); g.lineTo(x, y + 9);
  g.stroke();

  g.fillStyle = 'rgba(244,214,158,.95)';
  g.font = '11px sans-serif';
  const nomSaison = S.playing ? `jour ${jourActif()}/365` : (S.saison === 'janvier' ? 'janvier' : 'juillet');
  g.fillText(`Isothermes schématiques — ${nomSaison}`, pad + 2, pad + 13);
  g.fillText(`${S.lat}° de latitude · ${S.alt} m`, pad + 2, cssH - pad - 4);
}

/* ---------- E017-07 : grandeurs chiffrées et comparaison à une référence ---------- */

function updateReadout() {
  const n = S.nodes && S.nodes.readout;
  if (!n) return;
  const jour = jourActif();
  const t = temperature(S.lat, 0, jour, S.alt);
  const delta = declinaison(jour);
  const correction = GRADIENT * (S.alt / 1000);
  const fort = (texte) => {
    const s = document.createElement('strong');
    s.textContent = texte;
    return s;
  };
  n.textContent = '';
  n.appendChild(document.createTextNode(`À ${S.lat}° de latitude et ${S.alt} m d’altitude (jour ${jour}) : température schématique `));
  n.appendChild(fort(`${fmt(t)} °C`));
  n.appendChild(document.createTextNode(' ; déclinaison solaire '));
  n.appendChild(fort(`${fmt(delta)}°`));
  n.appendChild(document.createTextNode(' ; correction d’altitude '));
  n.appendChild(fort(`−${fmt(correction)} °C`));
  n.appendChild(document.createTextNode(` (référence ISA/OMM : ${fmt(GRADIENT)} °C/km, tropopause vers ${TROPOPAUSE_KM} km) ; classe d’après le seul régime thermique : `));
  n.appendChild(fort(classeThermique()));
  n.appendChild(document.createTextNode(' (seuil Köppen 18 °C pour le climat tropical ; le climat aride B dépend des précipitations, absentes du modèle).'));
}

function syncControls() {
  const n = S.nodes;
  if (!n) return;
  if (n.janvier) n.janvier.checked = S.saison === 'janvier';
  if (n.juillet) n.juillet.checked = S.saison === 'juillet';
  if (n.lat) n.lat.value = String(S.lat);
  if (n.latOut) n.latOut.textContent = `${S.lat}°`;
  if (n.alt) n.alt.value = String(S.alt);
  if (n.altOut) n.altOut.textContent = `${S.alt} m`;
  if (n.play) {
    n.play.textContent = S.reduced
      ? '▶ Animation désactivée (mouvement réduit)'
      : (S.playing ? '■ Arrêter l’animation' : '▶ Animer l’année');
    n.play.setAttribute('aria-pressed', S.playing ? 'true' : 'false');
    n.play.disabled = S.reduced;
  }
  if (n.challenge) {
    n.challenge.textContent = S.challengeOpen ? 'Masquer le débrief' : 'Afficher le débrief';
    n.challenge.setAttribute('aria-expanded', S.challengeOpen ? 'true' : 'false');
  }
  const debrief = document.getElementById(ID.challengeDebrief);
  if (debrief) debrief.hidden = !S.challengeOpen;
  if (n.panel) n.panel.setAttribute('data-' + P + '-reduced', S.reduced ? '1' : '0');
  S.lastAnnouncedDay = jourActif();
  updateReadout();
  drawLab();
}

/* ---------- E017-08 : boucle rAF unique, pause sur document.hidden ---------- */

function stopLoop() {
  if (S.rafId) {
    cancelAnimationFrame(S.rafId);
    S.rafId = 0;
  }
  S.lastTs = 0;
}

function scheduleFrame() {
  if (RAF) S.rafId = RAF(tick);
}

function startLoop() {
  if (S.rafId || !RAF) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced) return;
  S.lastTs = 0;
  scheduleFrame();
}

function tick(ts) {
  S.rafId = 0;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (S.reduced) return;
  if (S.lastTs) {
    const dt = Math.min(80, ts - S.lastTs);
    if (S.playing) S.sweep = (S.sweep + dt * 0.00006) % 1;
  }
  S.lastTs = ts;
  drawLab();
  if (Math.abs(jourActif() - S.lastAnnouncedDay) >= 20) {
    S.lastAnnouncedDay = jourActif();
    updateReadout();
  }
  if (S.playing && !S.reduced) scheduleFrame();
}

function installGlobalListeners(ctx) {
  if (typeof document !== 'undefined' && !S.visibilityBound) {
    S.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else if (S.playing && !S.reduced) startLoop();
    });
  }
  if (!S.motionBound && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    S.motionBound = true;
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const onChange = () => {
        S.reduced = mq.matches;
        if (S.reduced) {
          S.playing = false;
          stopLoop();
        }
        syncControls();
      };
      if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onChange);
      else if (typeof mq.addListener === 'function') mq.addListener(onChange);
    } catch { /* Préférence indisponible : ctx.reducedMotion() reste la source. */ }
  }
  void ctx;
}

/* ---------- E017-10 : badge textuel sur la carte existante ---------- */

function addMapBadge(ctx) {
  const scope = ctx.layout || ctx.stage;
  const map = scope && typeof scope.querySelector === 'function'
    ? (scope.querySelector('.geo-map') || null) : null;
  if (!map) return;
  let badge = document.getElementById(ID.badge);
  if (!badge) {
    badge = ctx.el('div', P + '-badge',
      'Carte schématique : aucun relevé climatique n’est projeté ici. Les isothermes du laboratoire sont un modèle d’enseignement.');
    badge.id = ID.badge;
    map.appendChild(badge);
  } else if (!map.contains(badge)) {
    map.appendChild(badge);
  }
}

/* ---------- Point d'entrée : les dix chantiers sont branchés ici ---------- */

register('E017', (ctx) => {
  if (!ctx || !ctx.stage || typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (ctx.viewId && !/^geography/.test(String(ctx.viewId))) return;

  /* E017-01 / E017-02 / E017-09 / E017-10 : feuille unique, panneau et badge. */
  ctx.css(CSS_ID, CSS);
  S.nodes = ensurePanel(ctx);
  addMapBadge(ctx);

  S.reduced = typeof ctx.reducedMotion === 'function' ? !!ctx.reducedMotion() : false;
  if (S.reduced) S.playing = false;

  /* E017-03 / E017-04 / E017-05 / E017-06 / E017-07 : première synchronisation. */
  syncControls();

  if (S.nodes.fresh) {
    const n = S.nodes;
    [n.janvier, n.juillet].forEach((radio) => {
      if (!radio) return;
      radio.addEventListener('change', () => {
        if (!radio.checked) return;
        S.saison = radio.value;
        S.playing = false;
        stopLoop();
        syncControls();
      });
    });
    n.lat.addEventListener('input', () => {
      S.lat = Math.max(0, Math.min(80, Math.round(Number(n.lat.value) / 5) * 5));
      syncControls();
    });
    n.alt.addEventListener('input', () => {
      S.alt = Math.max(0, Math.min(4000, Math.round(Number(n.alt.value) / 250) * 250));
      syncControls();
    });
    n.play.addEventListener('click', () => {
      if (S.reduced) return;
      S.playing = !S.playing;
      if (S.playing) startLoop(); else stopLoop();
      syncControls();
    });
    n.canvas.addEventListener('keydown', (event) => {
      let used = true;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        S.saison = S.saison === 'janvier' ? 'juillet' : 'janvier';
        S.playing = false;
        stopLoop();
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const pas = event.key === 'ArrowUp' ? 5 : -5;
        S.lat = Math.max(0, Math.min(80, S.lat + pas));
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        const pas = event.key === 'PageUp' ? 250 : -250;
        S.alt = Math.max(0, Math.min(4000, S.alt + pas));
      } else if (event.key === 'Home') {
        S.saison = 'janvier';
        S.lat = 45;
        S.alt = 0;
        S.playing = false;
        stopLoop();
      } else {
        used = false;
      }
      if (used) {
        event.preventDefault();
        syncControls();
      }
    });
  }

  /* E017-08 (boucle rAF unique) et E017-10 (mouvement réduit, robustesse). */
  installGlobalListeners(ctx);
  if (S.playing && !S.reduced) startLoop();
});
