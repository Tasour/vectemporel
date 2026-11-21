import { register } from './registry.js';

/* Lentille E015 — vue GEOGRAPHIE.
 * Thème : biomes et forêts.
 *
 * Dix chantiers concrets (E015-01 à E015-10), tous implémentés ici, décrits
 * dans UNIFIED_AUDIT/GEOGRAPHIE/views/E015.md. Ce module est une surcouche
 * additive : il n'édite ni geography.js, ni le registre, ni styles.css, ni le
 * jeu de données. La carte et le panneau restent lisibles et utilisables sans
 * lui ; tout le contenu pédagogique est du texte sémantique inséré dans le DOM,
 * jamais une information portée par le seul canvas.
 *
 * Rigueur des contenus : le jeu de données ne fournit aucune température ni
 * précipitation locale. Le laboratoire ci-dessous est donc un SCHÉMA global de
 * biomes (diagramme de Whittaker simplifié à seuils), explicitement présenté
 * comme tel. Aucune valeur n'est attribuée au pays affiché, aucune date ni
 * mesure locale n'est inventée.
 *
 * Contrat : un seul appel au registre sous la clé E015, une seule feuille de
 * style injectée avec l'identifiant geography-e015, identifiants préfixés geography-e015-*,
 * français partout, zéro sortie de journal, zéro réseau, zéro aléa, au plus
 * une boucle rAF suspendue sur document.hidden et respectueuse de
 * ctx.reducedMotion(). ctx = { viewId, stage, layout, css, el, reducedMotion() }.
 */

const PREFIX = 'geography-e015';
const PANEL_ID = `${PREFIX}-panel`;
const TITLE_ID = `${PREFIX}-title`;
const TABLE_ID = `${PREFIX}-table`;
const GROUPE_ID = `${PREFIX}-groupe`;
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
const PLAY_ID = `${PREFIX}-animation`;
const BADGE_ID = `${PREFIX}-badge`;
const CLAVIER_ID = `${PREFIX}-clavier`;

/* Seuils schématiques du diagramme, déclarés en un seul endroit. */
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

const parCle = (cle) => BIOMES.find((biome) => biome.key === cle) || BIOMES[0];

/* Classification déterministe à seuils : elle découle uniquement des deux
 * curseurs et des constantes ci-dessus. Aucun résultat n'est codé en dur. */
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

/* État de module : survit au `stage.replaceChildren()` de la coque. */
const S = {
  biome: 'tropicale',
  temperature: 27,
  pluies: 2600,
  anime: false,
  progression: 0,
  nodes: {},
};

/* Une seule animation pour toute la lentille : une boucle rAF au plus,
 * réamorcée à chaque rendu sur le canvas courant, jamais deux en parallèle. */
const anim = {
  raf: 0,
  canvas: null,
  depart: 0,
  visibilityHooked: false,
  motionHooked: false,
  reduced: () => false,
};

function stopLoop() {
  if (anim.raf) {
    cancelAnimationFrame(anim.raf);
    anim.raf = 0;
  }
}

function ensureLoop() {
  if (anim.raf) return;
  if (!S.anime || anim.reduced()) return;
  if (!anim.canvas || !anim.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  anim.raf = requestAnimationFrame(tick);
}

function tick(timestamp) {
  anim.raf = 0;
  if (!anim.canvas || !anim.canvas.isConnected) return;
  if (typeof document !== 'undefined' && document.hidden) return;
  if (!S.anime || anim.reduced()) {
    draw();
    return;
  }
  if (!anim.depart) anim.depart = timestamp;
  /* Progression périodique calculée depuis le temps écoulé : reproductible,
   * sans source aléatoire et sans variation de la position du point. */
  S.progression = ((timestamp - anim.depart) / 2200) % 1;
  draw();
  ensureLoop();
}

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
 * cinq styles de hachure sont nommés dans la légende textuelle du panneau. */
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
      painter.beginPath();
      painter.moveTo(x0, y);
      painter.lineTo(x1, y);
      painter.stroke();
    }
  } else if (style === 'verticales') {
    for (let x = x0 + 4; x < x1; x += 8) {
      painter.beginPath();
      painter.moveTo(x, y0);
      painter.lineTo(x, y1);
      painter.stroke();
    }
  } else if (style === 'obliques') {
    for (let x = x0 - hauteur; x < x1; x += 9) {
      painter.beginPath();
      painter.moveTo(x, y1);
      painter.lineTo(x + hauteur, y0);
      painter.stroke();
    }
  } else {
    for (let x = x0 - hauteur; x < x1; x += 12) {
      painter.beginPath();
      painter.moveTo(x, y1);
      painter.lineTo(x + hauteur, y0);
      painter.moveTo(x, y0);
      painter.lineTo(x + hauteur, y1);
      painter.stroke();
    }
  }
  painter.restore();
}

/* Dessin unique du laboratoire. Une seule écriture canvas par image, DPR
 * plafonné à 2, géométrie recalculée depuis les deux curseurs. */
function draw() {
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
    painter.beginPath();
    painter.moveTo(px(X_MIN), py(seuil));
    painter.lineTo(px(X_MAX), py(seuil));
    painter.stroke();
  });
  [SEUILS.froid, SEUILS.doux].forEach((seuil) => {
    painter.beginPath();
    painter.moveTo(px(seuil), py(Y_MAX));
    painter.lineTo(px(seuil), py(Y_MIN));
    painter.stroke();
  });
  painter.setLineDash([]);
  painter.globalAlpha = 1;

  /* Étiquettes des seuils : redondantes avec le tableau et la légende DOM. */
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

  /* Point courant : cercle pour une forêt, losange sinon, avec une croix
   * centrale dans les deux cas. La forme et le libellé doublent la couleur. */
  const biome = classerBiome(S.temperature, S.pluies);
  const cx = px(bornes(S.temperature, X_MIN, X_MAX));
  const cy = py(bornes(S.pluies, Y_MIN, Y_MAX));
  const pulse = S.anime && !anim.reduced() ? 1.5 * Math.sin(S.progression * Math.PI * 2) : 0;
  const rayon = 5 + pulse;
  painter.fillStyle = couleurs.gold;
  painter.globalAlpha = 0.35;
  painter.beginPath();
  painter.arc(cx, cy, rayon + 3, 0, Math.PI * 2);
  painter.fill();
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
  painter.moveTo(cx - 2.5, cy);
  painter.lineTo(cx + 2.5, cy);
  painter.moveTo(cx, cy - 2.5);
  painter.lineTo(cx, cy + 2.5);
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
}

/* ---------- Fabrique DOM locale et gardes d'idempotence ---------- */

function fabriquer(ctx, tag, className, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, text);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function assure(parent, ctx, id, tag, className, text) {
  let node = parent.querySelector(`[id="${id}"]`);
  if (node) return node;
  node = fabriquer(ctx, tag, className, text);
  node.id = id;
  parent.appendChild(node);
  return node;
}

function majAffichage() {
  const biome = classerBiome(S.temperature, S.pluies);
  const n = S.nodes;
  if (n.temperatureValeur) n.temperatureValeur.textContent = `${S.temperature} °C`;
  if (n.pluiesValeur) n.pluiesValeur.textContent = `${S.pluies} mm/an`;
  if (n.temperature) n.temperature.value = String(S.temperature);
  if (n.pluies) n.pluies.value = String(S.pluies);
  if (n.canvas) n.canvas.setAttribute('data-e015-biome', biome.key);
  if (n.lignes) {
    n.lignes.forEach((ligne) => {
      ligne.classList.toggle('is-active', ligne.dataset.biome === biome.key);
    });
  }
  if (n.readout) {
    n.readout.textContent = `Lecture : ${S.temperature} °C et ${S.pluies} mm/an conduisent au biome « ${biome.nom} » (${biome.famille === 'foret' ? 'forêt' : 'milieu non forestier'}). Référence : ${SEUILS.desert} mm/an marque le désert ; ${S.pluies} mm/an représentent ${fmt(S.pluies / SEUILS.desert)}× ce seuil. Le seuil conventionnel de la forêt tropicale humide est ${SEUILS.tropicale} mm/an, soit ${fmt(SEUILS.tropicale / SEUILS.desert)}× le seuil de référence.`;
  }
  if (n.play) {
    n.play.textContent = S.anime ? 'Arrêter l’animation' : 'Animer la pulsation du point';
  }
  draw();
}

register('E015', (ctx) => {
  const stage = ctx && ctx.stage;
  const layout = ctx && ctx.layout;
  if (!stage || !layout || typeof stage.querySelector !== 'function' || typeof document === 'undefined') return;

  const map = layout.querySelector('#c3b-map') || stage.querySelector('#c3b-map');
  const panel = layout.querySelector('.geo-panel') || stage.querySelector('.geo-panel');
  if (!map || !panel) return;

  const reduced = () => (typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false);
  anim.reduced = reduced;

  /* E015-01 / E015-10 — feuille unique, dédupliquée par cssOnce, et classe
   * de portée posée sur le layout : aucune règle ne sort de cette vue. */
  if (typeof ctx.css === 'function') {
    ctx.css('geography-e015', `
.geography-e015 .geography-e015-panel{margin:18px 0 4px;padding:12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02)}
.geography-e015 .geography-e015-titre{margin:0 0 7px;color:var(--gold-bright);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.geography-e015 .geography-e015-lede,.geography-e015 .geography-e015-note{margin:6px 0;color:var(--ink-soft);font-size:9px;line-height:1.7}
.geography-e015 .geography-e015-note{color:var(--muted)}
.geography-e015 .geography-e015-caption{margin:6px 0;color:var(--muted);font-size:9px;line-height:1.6}
.geography-e015 .geography-e015-groupe{margin:10px 0 6px;padding:8px 0 0;border:0;border-top:1px solid var(--line)}
.geography-e015 .geography-e015-groupe legend{padding:0 4px;color:var(--gold-bright);font-size:9px;font-weight:700;letter-spacing:.04em}
.geography-e015 .geography-e015-radios{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:6px}
.geography-e015 .geography-e015-radio{display:flex;align-items:center;gap:5px;min-height:44px;padding:4px 6px;border:1px solid var(--line);border-radius:8px;color:var(--muted);font-size:9px;line-height:1.25;cursor:pointer}
.geography-e015 .geography-e015-radio:has(input:checked){border-color:var(--gold);background:rgba(230,185,111,.1);color:var(--gold-bright)}
.geography-e015 .geography-e015-radio input{width:16px;height:16px;accent-color:var(--gold);flex:none}
.geography-e015 .geography-e015-radio:focus-within{outline:2px solid var(--gold-bright);outline-offset:2px}
.geography-e015 .geography-e015-curseur{margin:9px 0}
.geography-e015 .geography-e015-curseur label{display:flex;justify-content:space-between;gap:8px;color:var(--ink-soft);font-size:9px}
.geography-e015 .geography-e015-valeur{color:var(--gold-bright);font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.geography-e015 .geography-e015-range{width:100%;min-height:24px;margin:4px 0 0;accent-color:var(--gold)}
.geography-e015 .geography-e015-figure{margin:10px 0;padding:7px;border:1px solid var(--line);border-radius:8px;background:rgba(0,0,0,.12)}
.geography-e015 .geography-e015-canvas{display:block;width:100%;max-width:360px;height:auto;aspect-ratio:320/224;margin:0 auto;touch-action:manipulation}
.geography-e015 .geography-e015-canvas:focus-visible,.geography-e015 .geography-e015-bouton:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.geography-e015 .geography-e015-bouton{min-height:44px;margin:4px 0;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright);font:inherit;font-size:9px;font-weight:600;cursor:pointer}
.geography-e015 .geography-e015-bouton[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.14)}
.geography-e015 .geography-e015-readout{min-height:30px;margin:8px 0;padding:8px;border-left:2px solid var(--gold);background:rgba(255,255,255,.02);color:var(--gold-bright);font-size:9px;line-height:1.7;font-variant-numeric:tabular-nums}
.geography-e015 .geography-e015-table{width:100%;margin:8px 0;border-collapse:collapse;font-size:9px;font-variant-numeric:tabular-nums}
.geography-e015 .geography-e015-table caption{margin:0 0 5px;color:var(--gold-bright);font-size:9px;font-weight:700;text-align:left}
.geography-e015 .geography-e015-table th,.geography-e015 .geography-e015-table td{padding:4px 5px;border-bottom:1px dotted var(--line);text-align:left;vertical-align:top;line-height:1.45}
.geography-e015 .geography-e015-table th{color:var(--muted);font-weight:700}
.geography-e015 .geography-e015-table td{color:var(--ink-soft)}
.geography-e015 .geography-e015-table tr.is-active td{color:var(--gold-bright);background:rgba(230,185,111,.08)}
.geography-e015 .geography-e015-legende{margin:8px 0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px;color:var(--muted);font-size:9px;line-height:1.5}
.geography-e015 .geography-e015-mesures{margin:8px 0;padding:8px 10px;border-left:2px solid var(--gold);background:rgba(255,255,255,.02);color:var(--ink-soft);font-size:9px;line-height:1.7;font-variant-numeric:tabular-nums}
.geography-e015 .geography-e015-limite{margin:9px 0 0;padding:8px 10px;border:1px dashed var(--line);border-radius:8px;color:var(--muted);font-size:9px;line-height:1.7}
.geography-e015 #geography-e015-badge{position:absolute;right:14px;bottom:14px;z-index:2;max-width:220px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;background:rgba(8,12,18,.86);color:var(--muted);font-size:9px;line-height:1.4;pointer-events:none}
@media (max-width:620px){
.geography-e015 .geography-e015-radios{grid-template-columns:repeat(2,minmax(0,1fr))}
.geography-e015 .geography-e015-legende{grid-template-columns:1fr}
.geography-e015 .geography-e015-table{font-size:8px}
.geography-e015 .geography-e015-canvas{max-width:100%}
.geography-e015 #geography-e015-badge{right:8px;bottom:8px;max-width:160px;font-size:8px}
}
@media (prefers-reduced-motion:reduce){
.geography-e015 .geography-e015-radio,.geography-e015 .geography-e015-bouton{transition:none!important}
}
`);
  }
  layout.classList.add('geography-e015');
  layout.setAttribute('data-e015', '1');

  /* E015-02 — tableau statique lisible sans interaction. Les plages sont des
   * repères globaux, explicitement non locaux. */
  const bloc = assure(panel, ctx, PANEL_ID, 'section', 'geography-e015-panel');
  bloc.setAttribute('aria-labelledby', TITLE_ID);
  const titre = assure(bloc, ctx, TITLE_ID, 'h2', 'geography-e015-titre', 'Biomes et forêts · diagramme climatique schématique');
  titre.setAttribute('id', TITLE_ID);

  const lede = assure(bloc, ctx, `${PREFIX}-lede`, 'p', 'geography-e015-lede',
    'Un biome est un grand type de végétation déterminé surtout par la température et les précipitations moyennes annuelles. Une forêt est un biome où les arbres forment un couvert continu : forêt tropicale humide, forêt tempérée décidue et taïga en sont trois exemples. Le panneau ci-dessous compare ces forêts à des milieux moins boisés — savane, prairie et désert.');
  lede.setAttribute('role', 'note');

  const table = assure(bloc, ctx, TABLE_ID, 'table', 'geography-e015-table');
  const caption = assure(table, ctx, `${PREFIX}-caption`, 'caption', '', 'Ordres de grandeur de référence (schéma global, aucune mesure locale).');
  caption.setAttribute('role', 'note');
  const thead = assure(table, ctx, `${PREFIX}-thead`, 'thead', '');
  const headRow = assure(thead, ctx, `${PREFIX}-head-row`, 'tr', '');
  ['Biome', 'Température', 'Précipitations', 'Signature végétale'].forEach((libelle, index) => {
    const th = assure(headRow, ctx, `${PREFIX}-th-${index}`, 'th', '', libelle);
    th.setAttribute('scope', 'col');
  });
  const tbody = assure(table, ctx, `${PREFIX}-tbody`, 'tbody', '');
  BIOMES.forEach((biome) => {
    const ligne = assure(tbody, ctx, `${PREFIX}-ligne-${biome.key}`, 'tr', 'geography-e015-ligne');
    ligne.dataset.biome = biome.key;
    [biome.nom, biome.plage.split(' · ')[0], biome.plage.split(' · ')[1] || '—', biome.signature].forEach((texte, index) => {
      assure(ligne, ctx, `${PREFIX}-cell-${biome.key}-${index}`, 'td', '', texte);
    });
  });

  /* E015-03 — sélecteur de biome en choix unique : radios natifs dans un
   * fieldset légendé. Pas d'aria-pressed pour un choix unique. */
  const fieldset = assure(bloc, ctx, GROUPE_ID, 'fieldset', 'geography-e015-groupe');
  fieldset.setAttribute('role', 'radiogroup');
  fieldset.setAttribute('aria-label', 'Choisir un biome de référence (choix unique)');
  assure(fieldset, ctx, `${PREFIX}-legende-radios`, 'legend', '', 'Biome de référence (choix unique)');
  const radios = assure(fieldset, ctx, `${PREFIX}-radios`, 'div', 'geography-e015-radios');
  BIOMES.forEach((biome) => {
    const label = assure(radios, ctx, `${PREFIX}-label-${biome.key}`, 'label', 'geography-e015-radio');
    const input = assure(label, ctx, `${PREFIX}-radio-${biome.key}`, 'input', 'geography-e015-input');
    input.type = 'radio';
    input.name = `${PREFIX}-biome`;
    input.value = biome.key;
    input.checked = S.biome === biome.key;
    input.setAttribute('aria-label', `${biome.nom} : ${biome.plage}`);
    assure(label, ctx, `${PREFIX}-radio-texte-${biome.key}`, 'span', '', biome.court);
  });

  /* E015-04 — deux curseurs dont les valeurs découlent des formules de
   * classement, avec affichage textuel immédiat. */
  const blocCurseurs = assure(bloc, ctx, `${PREFIX}-curseurs`, 'div', '');
  const curseurTemp = assure(blocCurseurs, ctx, `${PREFIX}-bloc-temperature`, 'div', 'geography-e015-curseur');
  const labelTemp = assure(curseurTemp, ctx, `${PREFIX}-label-temperature`, 'label', '');
  assure(labelTemp, ctx, `${PREFIX}-texte-temperature`, 'span', '', 'Température moyenne annuelle');
  const valeurTemp = assure(labelTemp, ctx, TEMP_OUT_ID, 'span', 'geography-e015-valeur', '');
  const rangeTemp = assure(curseurTemp, ctx, TEMP_ID, 'input', 'geography-e015-range');
  rangeTemp.type = 'range';
  rangeTemp.min = String(X_MIN);
  rangeTemp.max = String(X_MAX);
  rangeTemp.step = '1';
  rangeTemp.value = String(S.temperature);
  rangeTemp.setAttribute('aria-label', 'Température moyenne annuelle, de moins 10 à 35 degrés Celsius');
  labelTemp.setAttribute('for', TEMP_ID);

  const curseurPluie = assure(blocCurseurs, ctx, `${PREFIX}-bloc-pluies`, 'div', 'geography-e015-curseur');
  const labelPluie = assure(curseurPluie, ctx, `${PREFIX}-label-pluies`, 'label', '');
  assure(labelPluie, ctx, `${PREFIX}-texte-pluies`, 'span', '', 'Précipitations annuelles');
  const valeurPluie = assure(labelPluie, ctx, PLUIE_OUT_ID, 'span', 'geography-e015-valeur', '');
  const rangePluie = assure(curseurPluie, ctx, PLUIE_ID, 'input', 'geography-e015-range');
  rangePluie.type = 'range';
  rangePluie.min = String(Y_MIN);
  rangePluie.max = String(Y_MAX);
  rangePluie.step = '50';
  rangePluie.value = String(S.pluies);
  rangePluie.setAttribute('aria-label', 'Précipitations annuelles, de 0 à 3 000 millimètres');
  labelPluie.setAttribute('for', PLUIE_ID);

  /* E015-05 / E015-08 — laboratoire canvas : une seule figure, un seul
   * canvas, tabindex, rôle image et équivalent clavier décrit en texte. */
  const figure = assure(bloc, ctx, `${PREFIX}-figure`, 'figure', 'geography-e015-figure');
  const canvas = assure(figure, ctx, CANVAS_ID, 'canvas', 'geography-e015-canvas');
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Diagramme schématique des biomes : température en abscisse, précipitations en ordonnée. Zones hachées et point courant en forme de cercle ou de losange.');
  canvas.setAttribute('aria-describedby', `${CLAVIER_ID} ${FIGCAP_ID}`);
  assure(figure, ctx, FIGCAP_ID, 'figcaption', 'geography-e015-caption',
    'Figure schématique : les hachures distinguent les zones, le cercle marque une forêt et le losange un milieu non forestier. Le point ne bouge pas quand l’animation est lancée : seule sa pulsation change.');

  /* E015-07 — bascule d'animation indépendante : aria-pressed légitime. */
  const play = assure(bloc, ctx, PLAY_ID, 'button', 'geography-e015-bouton', '');
  play.type = 'button';
  play.setAttribute('aria-pressed', S.anime ? 'true' : 'false');
  play.setAttribute('aria-label', 'Lancer ou arrêter la pulsation du point sur le diagramme');

  /* E015-06 — annonce live et grandeurs chiffrées comparées à un seuil. */
  const readout = assure(bloc, ctx, READOUT_ID, 'p', 'geography-e015-readout', '');
  readout.setAttribute('role', 'status');
  readout.setAttribute('aria-live', 'polite');
  readout.setAttribute('aria-atomic', 'true');

  /* E015-02 / E015-08 — légende textuelle des formes et des hachures. */
  const legende = assure(bloc, ctx, LEGENDE_ID, 'ul', 'geography-e015-legende');
  BIOMES.forEach((biome) => {
    const li = assure(legende, ctx, `${PREFIX}-legende-${biome.key}`, 'li', '');
    const glyph = biome.forme === 'cercle' ? '●' : '◆';
    assure(li, ctx, `${PREFIX}-legende-glyphe-${biome.key}`, 'span', '', `${glyph} ${biome.court} · hachures ${biome.hachure}`);
  });

  const mesures = assure(bloc, ctx, MESURES_ID, 'p', 'geography-e015-mesures',
    `Mesures de référence : ${SEUILS.desert} mm/an = seuil de désert retenu ; ${SEUILS.boreale} mm/an = ${fmt(SEUILS.boreale / SEUILS.desert)}× ce seuil pour la taïga ; ${SEUILS.tropicale} mm/an = ${fmt(SEUILS.tropicale / SEUILS.desert)}× pour la forêt tropicale humide. ${SEUILS.doux} °C sépare les forêts tempérées des biomes tropicaux. Ce sont des ordres de grandeur schématiques, pas des mesures du pays affiché.`);
  mesures.setAttribute('role', 'note');

  const clavier = assure(bloc, ctx, CLAVIER_ID, 'p', 'geography-e015-note',
    'Clavier : Tab atteint les curseurs, les boutons radio et le diagramme. Sur le diagramme, ← et → changent la température de 1 °C, ↑ et ↓ changent les précipitations de 100 mm/an, Début et Fin bornent la température. Les mêmes valeurs restent lisibles dans les deux champs et dans l’annonce live.');
  clavier.setAttribute('role', 'note');

  /* E015-10 — limite falsifiable, alignée sur l'absence de données locales. */
  const limite = assure(bloc, ctx, LIMITE_ID, 'p', 'geography-e015-limite',
    'Limite et angle mort : ce diagramme est un schéma global à seuils, pas une mesure du territoire affiché ; le jeu de données ne contient ni température ni précipitation locale. Falsification : si l’on attribuait un biome au pays ou à un lieu de la carte à partir de ce seul diagramme, l’outil serait en défaut. Le classement change seulement quand les deux curseurs changent : si le biome affiché variait sans modification des curseurs ni du seuil, le modèle serait en défaut. Les effets du sol, de l’altitude et de la saisonnalité ne sont pas traités.');
  limite.setAttribute('role', 'note');

  /* E015-09 — badge sur la carte existante, distinct du reste du panneau. */
  const badge = assure(map, ctx, BADGE_ID, 'div', '',
    'Biomes : schéma climatique global à seuils · aucune donnée locale de climat dans ce pays.');
  badge.setAttribute('aria-hidden', 'true');

  S.nodes = {
    panel: bloc, titre, table, lignes: Array.from(table.querySelectorAll('.geography-e015-ligne')),
    radios: Array.from(radios.querySelectorAll('input[type="radio"]')),
    temperature: rangeTemp, temperatureValeur: valeurTemp,
    pluies: rangePluie, pluiesValeur: valeurPluie,
    canvas, readout, play,
  };

  /* Reconfiguration de l'unique boucle à chaque rendu : l'ancien canvas
   * n'appartient plus au document, on annule avant de reprendre. */
  stopLoop();
  anim.canvas = canvas;
  anim.depart = 0;
  S.progression = 0;
  majAffichage();
  ensureLoop();

  /* Pause sur onglet masqué, installée une seule fois pour la durée du module. */
  if (!anim.visibilityHooked) {
    anim.visibilityHooked = true;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopLoop();
      else ensureLoop();
    });
  }

  /* Préférence de mouvement réduit lue à chaud, sans reconstruire la lentille. */
  if (!anim.motionHooked && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      const requete = window.matchMedia('(prefers-reduced-motion: reduce)');
      sonder(requete);
      anim.motionHooked = true;
    } catch {
      /* Greffon tolérant : la lecture de ctx.reducedMotion() suffit. */
    }
  }

  function sonder(requete) {
    if (typeof requete.addEventListener !== 'function') return;
    requete.addEventListener('change', () => {
      if (!S.nodes.play || !S.nodes.play.isConnected) return;
      if (reduced()) stopLoop();
      else ensureLoop();
      majAffichage();
    });
  }

  /* Écouteurs posés une seule fois par panneau fraîchement rendu. */
  if (!bloc.dataset.e015Bound) {
    bloc.dataset.e015Bound = '1';

    bloc.addEventListener('click', (event) => {
      const cible = event.target;
      if (cible === play) {
        S.anime = !S.anime;
        play.setAttribute('aria-pressed', S.anime ? 'true' : 'false');
        anim.depart = 0;
        S.progression = 0;
        majAffichage();
        if (S.anime) ensureLoop();
        else stopLoop();
        return;
      }
      if (!cible || typeof cible.closest !== 'function') return;
      const entree = cible.closest('.geography-e015-radio');
      if (!entree || !radios.contains(entree)) return;
      const radio = entree.querySelector('input[type="radio"]');
      if (!radio) return;
      S.biome = radio.value;
      const reglage = parCle(S.biome).preset;
      S.temperature = reglage.temp;
      S.pluies = reglage.pluie;
      majAffichage();
    });

    bloc.addEventListener('change', (event) => {
      const cible = event.target;
      if (!cible || cible.name !== `${PREFIX}-biome`) return;
      S.biome = cible.value;
      const reglage = parCle(S.biome).preset;
      S.temperature = reglage.temp;
      S.pluies = reglage.pluie;
      majAffichage();
    });

    bloc.addEventListener('input', (event) => {
      const cible = event.target;
      if (cible === rangeTemp) {
        S.temperature = bornes(Number(cible.value) || 0, X_MIN, X_MAX);
        majAffichage();
      } else if (cible === rangePluie) {
        S.pluies = bornes(Number(cible.value) || 0, Y_MIN, Y_MAX);
        majAffichage();
      }
    });

    bloc.addEventListener('keydown', (event) => {
      if (event.target !== canvas) return;
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
});
