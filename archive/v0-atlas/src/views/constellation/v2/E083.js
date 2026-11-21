import { register } from './registry.js';

/* Lentille V2 E083 — métrologie et robustesse du contraste du chemin de
   connexion de la vue Constellation. Seconde passe : dix chantiers inédits,
   tous implémentés, sans réseau, sans source aléatoire et sans minuteur ni
   boucle d'animation propre. Préfixe exclusif : v2e083 (aucune collision
   avec la passe 1 e083-). */

const CSS_ID = 'constellation-v2-e083';
const AUDIT_ID = 'v2e083-audit';
const LIVE_ID = 'v2e083-live';
const ACTIVE = 'data-v2e083-on';
const SEUIL_GRAPH = 3;
const SEUIL_TEXTE = 4.5;
const FOND = [12, 15, 22];
const MOTIFS = ['6 3', '2 2', '1 4'];

const CSS = `
.constellation-layout[data-v2e083-on] .constellation-edges line { vector-effect: non-scaling-stroke; }
.v2e083-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout[data-v2e083-on] .v2e083-audit{display:none}
@media (prefers-reduced-motion: reduce){.constellation-layout[data-v2e083-on] *{transition:none!important}}
`;

function nettoyer(texte) {
  return String(texte == null ? '' : texte).replace(/\s+/g, ' ').trim();
}

function lireComputed(node, propriete) {
  try {
    if (typeof window === 'undefined' || !window.getComputedStyle) return '';
    const style = window.getComputedStyle(node);
    return style ? String(style.getPropertyValue(propriete) || '') : '';
  } catch { return ''; }
}

function rgbDepuis(chaine) {
  const texte = String(chaine || '').trim();
  const rgba = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/.exec(texte);
  if (rgba) {
    return {
      rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])],
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }
  const hex = texte.replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(hex)) {
    return {
      rgb: [parseInt(hex[0] + hex[0], 16), parseInt(hex[1] + hex[1], 16), parseInt(hex[2] + hex[2], 16)],
      alpha: 1,
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(hex)) {
    return {
      rgb: [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)],
      alpha: 1,
    };
  }
  return null;
}

function luminance(rgb) {
  const canal = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(rgb[0]) + 0.7152 * canal(rgb[1]) + 0.0722 * canal(rgb[2]);
}

function contraste(a, b) {
  const clair = Math.max(luminance(a), luminance(b));
  const sombre = Math.min(luminance(a), luminance(b));
  return (clair + 0.05) / (sombre + 0.05);
}

function composer(rgb, fond, alpha) {
  const a = Number.isFinite(alpha) ? Math.min(1, Math.max(0, alpha)) : 1;
  return rgb.map((canal, i) => Math.round(canal * a + fond[i] * (1 - a)));
}

function attributNombre(node, nom) {
  const brut = node && typeof node.getAttribute === 'function' ? node.getAttribute(nom) : null;
  const valeur = parseFloat(String(brut == null ? '' : brut));
  return Number.isFinite(valeur) ? valeur : Number.NaN;
}

function classe(node, nom) {
  try { return Boolean(node.classList && node.classList.contains(nom)); }
  catch { return false; }
}

function styleLine(node, propriete, valeur) {
  try { node.style.setProperty(propriete, valeur); return true; }
  catch { return false; }
}

function marquer(node, nom, valeur) {
  try { node.setAttribute(nom, valeur); }
  catch { /* attribut non critique */ }
}

function creerNode(ctx, tag, className, texte) {
  if (ctx && typeof ctx.el === 'function') return ctx.el(tag, className, texte);
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (texte !== undefined) node.textContent = texte;
  return node;
}

/* Mesure du contraste réellement rendu, d'après le style calculé. */
function mesurerRendu(lignes, etat, fond) {
  let mesures = 0;
  lignes.forEach((line) => {
    const brut = lireComputed(line, 'stroke') || String(line.style.stroke || '');
    const parse = rgbDepuis(brut);
    if (!parse) {
      marquer(line, 'data-v2e083-rendered-ratio', 'indisponible');
      return;
    }
    const ratio = contraste(composer(parse.rgb, fond, parse.alpha), fond);
    etat.ratios.set(line, ratio);
    marquer(line, 'data-v2e083-rendered-ratio', `${ratio.toFixed(2)}:1`);
    if (ratio < SEUIL_GRAPH) etat.sousSeuil += 1;
    mesures += 1;
  });
  return mesures;
}

/* Détection des traits dégénérés : longueur nulle ou coordonnées illisibles. */
function detecterDegeneres(lignes, etat) {
  let anomalies = 0;
  lignes.forEach((line) => {
    const x1 = attributNombre(line, 'x1');
    const y1 = attributNombre(line, 'y1');
    const x2 = attributNombre(line, 'x2');
    const y2 = attributNombre(line, 'y2');
    const longueur = Math.hypot(x2 - x1, y2 - y1);
    if (!Number.isFinite(longueur)) {
      marquer(line, 'data-v2e083-degenerate', 'illisible');
      anomalies += 1;
    } else if (longueur < 0.5) {
      marquer(line, 'data-v2e083-degenerate', 'nul');
      anomalies += 1;
    } else {
      try { line.removeAttribute('data-v2e083-degenerate'); }
      catch { /* attribut non critique */ }
    }
  });
  etat.degeneres = anomalies;
  return anomalies;
}

/* Catalogage des types de liaison et repérage des classes inconnues. */
function cataloguerTypes(edges, lignes, etat) {
  lignes.forEach((line) => {
    const estPath = classe(line, 'is-path');
    const estMoon = classe(line, 'is-moon');
    const estBase = classe(line, 'const-edge');
    let type;
    if (estPath) type = 'actif';
    else if (estMoon) type = 'lunaire';
    else if (estBase) type = 'secondaire';
    else type = 'inconnu';
    etat.dist[type] += 1;
    etat.types.set(line, type);
    marquer(line, 'data-v2e083-type', type);
  });
  if (edges && edges.dataset) {
    edges.dataset.v2e083Dist = `a${etat.dist.actif} l${etat.dist.lunaire} `
      + `s${etat.dist.secondaire} i${etat.dist.inconnu}`;
  }
  return lignes.length;
}

/* Contrôle de la hiérarchie de contraste : actif ≥ lunaire ≥ secondaire. */
function verifierHierarchie(lignes, etat) {
  const minimum = (type) => {
    let min = Number.POSITIVE_INFINITY;
    etat.ratios.forEach((ratio, line) => {
      if (etat.types.get(line) === type && Number.isFinite(ratio) && ratio < min) min = ratio;
    });
    return Number.isFinite(min) ? min : null;
  };
  const actif = minimum('actif');
  const lunaire = minimum('lunaire');
  const secondaire = minimum('secondaire');
  const ecart = 0.2;
  const hausseLunaire = actif !== null && lunaire !== null && lunaire > actif + ecart;
  const hausseSecondaire = lunaire !== null && secondaire !== null && secondaire > lunaire + ecart;
  let inversions = 0;
  lignes.forEach((line) => {
    const type = etat.types.get(line);
    const coupable = (type === 'lunaire' && hausseLunaire)
      || (type === 'secondaire' && hausseSecondaire);
    if (coupable) {
      marquer(line, 'data-v2e083-inversion', `${type} dépasse le niveau supérieur`);
      inversions += 1;
    } else {
      try { line.removeAttribute('data-v2e083-inversion'); }
      catch { /* attribut non critique */ }
    }
  });
  etat.inversions = inversions;
  etat.hierarchie = {
    actif: actif === null ? '—' : actif.toFixed(2),
    lunaire: lunaire === null ? '—' : lunaire.toFixed(2),
    secondaire: secondaire === null ? '—' : secondaire.toFixed(2),
  };
  return inversions;
}

/* Codage redondant : un motif de tirets distinct par niveau de liaison. */
function verifierCodage(lignes, etat) {
  const ordre = ['actif', 'lunaire', 'secondaire', 'inconnu'];
  const presents = ordre.filter((type) => etat.dist[type] > 0);
  const occupes = new Set();
  let corrections = 0;
  presents.forEach((type) => {
    let motif = '';
    lignes.forEach((line) => {
      if (etat.types.get(line) !== type || motif) return;
      const brut = nettoyer(lireComputed(line, 'strokeDasharray')
        || String(line.style.strokeDasharray || ''));
      if (brut && brut !== 'none') motif = brut;
    });
    if (type === 'actif') motif = 'none';
    if (!motif || occupes.has(motif)) {
      const index = Math.max(0, presents.indexOf(type) - 1);
      motif = MOTIFS[index % MOTIFS.length];
      let garde = 0;
      while (occupes.has(motif) && garde < MOTIFS.length) {
        motif = MOTIFS[(MOTIFS.indexOf(motif) + 1) % MOTIFS.length];
        garde += 1;
      }
      lignes.forEach((line) => {
        if (etat.types.get(line) !== type) return;
        if (styleLine(line, 'stroke-dasharray', motif)) corrections += 1;
      });
    }
    occupes.add(motif);
    etat.motifs[type] = motif;
    lignes.forEach((line) => {
      if (etat.types.get(line) === type) marquer(line, 'data-v2e083-pattern', motif);
    });
  });
  return corrections;
}

/* Largeur minimale effective imposée à chaque niveau de liaison. */
function verifierLargeur(lignes, etat) {
  const planchers = { actif: 2, lunaire: 1.2, secondaire: 1, inconnu: 1 };
  let corrections = 0;
  lignes.forEach((line) => {
    const type = etat.types.get(line) || 'inconnu';
    const brut = parseFloat(lireComputed(line, 'strokeWidth')
      || String(line.style.strokeWidth || ''));
    const actuelle = Number.isFinite(brut) ? brut : 0;
    const plancher = planchers[type];
    if (actuelle >= plancher) {
      try { line.removeAttribute('data-v2e083-width-floor'); }
      catch { /* attribut non critique */ }
      return;
    }
    if (styleLine(line, 'stroke-width', String(plancher))) corrections += 1;
    marquer(line, 'data-v2e083-width-floor', `${actuelle.toFixed(2)}→${plancher}`);
  });
  return corrections;
}

/* Ancrage des extrémités du chemin sur un nœud réellement présent. */
function verifierAncrage(layout, lignes, etat) {
  const noeuds = [];
  Array.from(layout.querySelectorAll('[data-const-key]')).forEach((node) => {
    let x = Number.NaN;
    let y = Number.NaN;
    try {
      x = parseFloat(node.style.getPropertyValue('--x'));
      y = parseFloat(node.style.getPropertyValue('--y'));
    } catch { return; }
    if (Number.isFinite(x) && Number.isFinite(y)) noeuds.push([x, y]);
  });
  if (!noeuds.length) return 0;
  const tolerance = 3;
  let orphelins = 0;
  lignes.forEach((line) => {
    const coordonnees = [
      [attributNombre(line, 'x1'), attributNombre(line, 'y1')],
      [attributNombre(line, 'x2'), attributNombre(line, 'y2')],
    ];
    const ancree = coordonnees.some(([px, py]) => Number.isFinite(px) && Number.isFinite(py)
      && noeuds.some(([nx, ny]) => Math.hypot(px - nx, py - ny) <= tolerance));
    if (ancree) {
      marquer(line, 'data-v2e083-ancrage', 'ancre');
    } else {
      marquer(line, 'data-v2e083-ancrage', 'orphelin');
      orphelins += 1;
    }
  });
  etat.orhelins = orphelins;
  return orphelins;
}

/* Conformité 4.5:1 des textes de légende et d'état (référence WCAG). */
function auditerTextes(layout, etat, fond) {
  const cibles = Array.from(layout.querySelectorAll(
    '.constellation-note, .constellation-state, .constellation-caption p, .v2e083-audit-ligne'
  ));
  let anomalies = 0;
  cibles.forEach((node) => {
    if (!nettoyer(node.textContent)) return;
    const parse = rgbDepuis(lireComputed(node, 'color'));
    if (!parse) return;
    const ratio = contraste(composer(parse.rgb, fond, parse.alpha), fond);
    marquer(node, 'data-v2e083-text-ratio', `${ratio.toFixed(2)}:1`);
    if (ratio < SEUIL_TEXTE) anomalies += 1;
  });
  etat.textesNonConformes = anomalies;
  etat.textesExamines = cibles.length;
  return anomalies;
}

/* Indice de conformité contrastée et annonce dans une région live. */
function indiceConformite(ctx, layout, etat) {
  let conformes = 0;
  etat.ratios.forEach((ratio) => { if (ratio >= SEUIL_GRAPH) conformes += 1; });
  const total = etat.ratios.size;
  let score = total ? Math.round((conformes / total) * 100) : 0;
  const penalite = Math.min(40,
    etat.degeneres * 5 + etat.inversions * 5 + etat.textesNonConformes * 2);
  score = Math.max(0, score - penalite);
  etat.indice = score;
  if (layout && layout.dataset) layout.dataset.v2e083Indice = String(score);

  let live = document.getElementById(LIVE_ID);
  if (!live || live.parentNode !== layout) {
    if (live && live.parentNode) live.parentNode.removeChild(live);
    live = creerNode(ctx, 'p', 'v2e083-sr', '');
    live.id = LIVE_ID;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  live.textContent = `Contraste du chemin : indice ${score} %, `
    + `${conformes}/${total} trait(s) au-dessus de ${SEUIL_GRAPH}:1, `
    + `${etat.degeneres} trait(s) dégénéré(s), ${etat.inversions} inversion(s) hiérarchique(s), `
    + `${etat.textesNonConformes} texte(s) sous ${SEUIL_TEXTE}:1.`;
  return 1;
}

/* Sceau d'audit idempotent du diagnostic V2. */
function scellerAudit(ctx, counts, etat) {
  const layout = ctx.layout;
  if (layout && layout.dataset) {
    layout.dataset.v2e083Checks = counts
      .map((n, index) => `${String(index + 1).padStart(2, '0')}:${n}`).join(' ');
    layout.dataset.v2e083Traits = String(etat.ratios.size);
  }

  let panneau = document.getElementById(AUDIT_ID);
  if (!panneau || panneau.parentNode !== layout) {
    if (panneau && panneau.parentNode) panneau.parentNode.removeChild(panneau);
    panneau = creerNode(ctx, 'section', 'v2e083-audit', '');
    panneau.id = AUDIT_ID;
    panneau.setAttribute('aria-label', 'Diagnostic V2 du contraste du chemin de connexion');
    layout.appendChild(panneau);
  }
  while (panneau.firstChild) panneau.removeChild(panneau.firstChild);
  const dist = etat.dist;
  panneau.appendChild(creerNode(ctx, 'h3', 'v2e083-audit-titre',
    'Contraste du chemin — audit V2 (E083)'));
  panneau.appendChild(creerNode(ctx, 'p', 'v2e083-audit-ligne',
    `${etat.ratios.size} trait(s) mesuré(s) · actifs ${dist.actif}, lunaires ${dist.lunaire}, `
    + `secondaires ${dist.secondaire}, inconnus ${dist.inconnu} · indice ${etat.indice} %.`));
  panneau.appendChild(creerNode(ctx, 'p', 'v2e083-audit-ligne',
    `Ratios minimaux (référence ${SEUIL_GRAPH}:1) : actif ${etat.hierarchie.actif}, `
    + `lunaire ${etat.hierarchie.lunaire}, secondaire ${etat.hierarchie.secondaire}.`));
  panneau.appendChild(creerNode(ctx, 'p', 'v2e083-audit-ligne',
    `Traits sous le seuil : ${etat.sousSeuil} · dégénérés : ${etat.degeneres} · `
    + `inversions : ${etat.inversions} · orphelins : ${etat.orhelins} · `
    + `textes sous ${SEUIL_TEXTE}:1 : ${etat.textesNonConformes}.`));
  counts.forEach((n, index) => {
    panneau.appendChild(creerNode(ctx, 'p', 'v2e083-audit-ligne',
      `E083-${String(index + 1).padStart(2, '0')} : ${n} effet(s).`));
  });
  const calme = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  panneau.appendChild(creerNode(ctx, 'p', 'v2e083-audit-ligne',
    `Mouvement réduit : ${calme ? 'actif' : 'inactif'} · aucune animation ajoutée.`));
  return 1;
}

register('E083', (ctx) => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;

  css(CSS_ID, CSS);
  try { layout.setAttribute(ACTIVE, 'on'); }
  catch { /* marqueur non critique */ }

  const edges = layout.querySelector('.constellation-edges');
  const lignes = Array.from(layout.querySelectorAll('.constellation-edges line'));
  const fondParse = rgbDepuis(lireComputed(edges, 'backgroundColor')
    || lireComputed(layout, 'backgroundColor'));
  const fond = fondParse && fondParse.rgb && fondParse.alpha > 0 ? fondParse.rgb : FOND;
  const etat = {
    ratios: new Map(),
    types: new Map(),
    dist: { actif: 0, lunaire: 0, secondaire: 0, inconnu: 0 },
    hierarchie: { actif: '—', lunaire: '—', secondaire: '—' },
    motifs: {},
    sousSeuil: 0,
    degeneres: 0,
    inversions: 0,
    orhelins: 0,
    textesNonConformes: 0,
    textesExamines: 0,
    indice: 0,
  };

  /* E083-01 — Contraste réellement rendu mesuré sur le style calculé. */
  /* E083-02 — Traits dégénérés (longueur nulle ou coordonnées illisibles). */
  /* E083-03 — Catalogage des types de liaison et détection des orphelins. */
  /* E083-04 — Hiérarchie de contraste vérifiée (monotonie des niveaux). */
  /* E083-05 — Codage redondant : motifs de tirets distincts par niveau. */
  /* E083-06 — Largeur minimale effective imposée à chaque niveau. */
  /* E083-07 — Ancrage des extrémités du chemin sur un nœud réel. */
  /* E083-08 — Conformité 4.5:1 des textes de légende et d'état. */
  /* E083-09 — Indice de conformité contrastée et annonce live. */
  /* E083-10 — Sceau d'audit idempotent du diagnostic V2. */

  const etapes = [
    () => mesurerRendu(lignes, etat, fond),
    () => detecterDegeneres(lignes, etat),
    () => cataloguerTypes(edges, lignes, etat),
    () => verifierHierarchie(lignes, etat),
    () => verifierCodage(lignes, etat),
    () => verifierLargeur(lignes, etat),
    () => verifierAncrage(layout, lignes, etat),
    () => auditerTextes(layout, etat, fond),
    () => indiceConformite(ctx, layout, etat),
  ];
  const counts = etapes.map((etape) => {
    try { return Math.max(0, Number(etape()) || 0); }
    catch { return 0; }
  });
  counts.push(1);
  try { scellerAudit(ctx, counts, etat); }
  catch { /* Greffon tolérant : un rendu partiel reste lisible. */ }
});
