import { register } from './registry.js';

/* Lentille V2 E066 — pilotage de l'état des métriques chiffrées de la vue
   Constellation (seconde passe). Dix chantiers inédits, tous implémentés,
   déterministes et locaux : zéro réseau, zéro aléa, zéro minuteur ni boucle
   d'animation propre. Tout identifiant est préfixé `v2e066` afin de ne jamais
   collisionner avec la lentille E066 de la première passe. */

const SEUIL_FAIBLE = 20;      /* densité en dessous de laquelle l'état est sobre */
const SEUIL_ELEVE = 45;       /* densité au-delà de laquelle l'état est dense */
const SEUIL_STAGNATION = 3;   /* rendus identiques consécutifs avant signalement */
const ECART_DISPERSION = 2;   /* écarts-types tolérés avant signalement d'un nœud */
const FACTEUR_FNV = 16777619; /* facteur premier de la signature FNV-1a */
const NOMS_COMPTEURS = ['ères', 'repères', 'points', 'sources'];

/* Mémoire inter-rendus, attachée à la scène stable du shell : seuls les
   compteurs et l'intention de l'utilisateur sont conservés, jamais un nœud
   du DOM éphémère. Aucune purge, aucun minuteur : la WeakMap suffit. */
const memoire = new WeakMap();
let detailOuvert = false;

function attr(noeud, nom) {
  return noeud && typeof noeud.getAttribute === 'function'
    ? (noeud.getAttribute(nom) || '') : '';
}

function setAttr(noeud, nom, valeur) {
  if (!noeud || typeof noeud.setAttribute !== 'function') return;
  try { noeud.setAttribute(nom, String(valeur)); } catch { /* nœud verrouillé : on passe outre */ }
}

function flag(noeud, nom, actif) { setAttr(noeud, nom, actif ? '1' : '0'); }

function requete(racine, selecteur) {
  return racine && typeof racine.querySelector === 'function'
    ? racine.querySelector(selecteur) : null;
}

function collecte(racine, selecteur) {
  if (!racine || typeof racine.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(racine.querySelectorAll(selecteur));
}

function creer(ctx, tag, cls, texte) {
  if (typeof ctx.el === 'function') {
    const noeud = ctx.el(tag, cls, texte);
    if (noeud) return noeud;
  }
  const noeud = document.createElement(tag);
  if (cls) noeud.className = cls;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
}

function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

function nbStyle(noeud, nom) {
  if (!noeud || !noeud.style || typeof noeud.style.getPropertyValue !== 'function') return NaN;
  return parseFloat(noeud.style.getPropertyValue(nom));
}

function srcDe(noeud) {
  const motif = attr(noeud, 'data-label').match(/(\d+)\s*src/);
  return motif ? (Number.parseInt(motif[1], 10) || 0) : 0;
}

function frNombre(valeur, decimales) {
  if (!Number.isFinite(valeur)) return '—';
  const chaine = decimales ? valeur.toFixed(decimales) : String(Math.round(valeur));
  const [entiere, fraction] = chaine.split('.');
  const groupe = entiere.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${groupe},${fraction}` : groupe;
}

/* Signature 32 bits FNV-1a : entièrement déterministe, sans graine tirée au
   hasard. Deux états canoniquement identiques produisent la même valeur. */
function signature(chaine) {
  let h = 2166136261;
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, FACTEUR_FNV) >>> 0;
  }
  return h >>> 0;
}

/* Une seule feuille, périmétrée par l'attribut posé sur le layout : aucune
   règle ne s'échappe de la vue Constellation. */
const CSS = `
.constellation-layout[data-v2e066="1"] #v2e066-synthese{
  margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;
  background:var(--surface-2);color:var(--muted);font:inherit;font-size:9px;
  line-height:1.5;contain:layout style;
}
#v2e066-titre{margin:0 0 6px;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450;}
#v2e066-resume{margin:2px 0;color:var(--ink-soft);font-variant-numeric:tabular-nums;}
#v2e066-detail{margin:6px 0 0;padding-left:16px;color:var(--muted);font-variant-numeric:tabular-nums;}
#v2e066-detail li{margin:1px 0;overflow-wrap:anywhere;}
#v2e066-bascule{
  min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink-soft);font:inherit;
  font-size:9px;cursor:pointer;
}
#v2e066-bascule:hover{border-color:var(--gold)}
#v2e066-bascule:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#v2e066-bascule[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright)}
.constellation-layout[data-v2e066="1"] #v2e066-synthese.v2e066-eleve{border-color:var(--violet)}
.constellation-layout[data-v2e066="1"] [data-v2e066-cle-anormale="1"]{outline:1px dashed var(--violet);outline-offset:2px}
.constellation-layout[data-v2e066="1"] [data-v2e066-dispersion-hors="1"]{outline:1px dotted var(--gold);outline-offset:2px}
@media (max-width:620px){#v2e066-synthese{padding:6px 8px;font-size:8px}}
@media (prefers-reduced-motion:reduce){#v2e066-bascule{transition:none}}
`;

register('E066', (ctx) => {
  /* Garde d'entrée obligatoire : contexte incomplet, vue absente ou document
     indisponible → aucun ajout au DOM, aucune exception. Le viewId V2 est
     `constellationv2` ; la présence du champ scénique fait foi. Le registre
     isole lui-même toute exception résiduelle du greffon. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelectorAll !== 'function') return;

  const soleils = collecte(layout, '.const-sun');
  const planetes = collecte(layout, '.const-planet');
  const lunes = collecte(layout, '.const-moon');
  const noeuds = soleils.concat(planetes, lunes);
  const champ = requete(layout, '.constellation-field');
  const caption = requete(layout, '.constellation-caption');
  if (!noeuds.length) return;

  css('constellation-v2-e066', CSS);
  setAttr(layout, 'data-v2e066', '1');

  /* Scène stable : le shell recrée le DOM à chaque rendu, mais conserve la
     même scène. C'est elle qui sert de clé à la mémoire inter-rendus. */
  const cleScene = (ctx.stage && typeof ctx.stage === 'object')
    ? ctx.stage : (layout.ownerDocument || layout);
  const precedent = memoire.get(cleScene) || null;

  const sources = lunes.reduce((somme, lune) => somme + srcDe(lune), 0);
  const population = [soleils.length, planetes.length, lunes.length, sources];
  const coordonnees = noeuds.map((noeud) => {
    const x = nbStyle(noeud, '--x');
    const y = nbStyle(noeud, '--y');
    return { noeud, x: Number.isFinite(x) ? x : NaN, y: Number.isFinite(y) ? y : NaN };
  });
  const actifSoleil = requete(layout, '.const-sun.is-active');
  const actifPlanete = requete(layout, '.const-planet.is-active');
  const actifLune = requete(layout, '.const-moon.is-active');
  const actifs = [actifSoleil, actifPlanete, actifLune]
    .map((noeud) => (noeud ? attr(noeud, 'data-const-key') : ''));

  /* E066-01 — Empreinte de contenu déterministe : une signature courte et
   * stable de l'état chiffré, calculée par FNV-1a sur une chaîne canonique.
   * Elle identifie un état sans dépendre de l'ordre de parcours du DOM. */
  const canonique = [
    population.join('.'),
    actifs.slice().sort().join(','),
    lunes.map(srcDe).sort((a, b) => a - b).join(','),
    coordonnees.map((p) => `${Number.isFinite(p.x) ? p.x.toFixed(1) : 'x'}${Number.isFinite(p.y) ? p.y.toFixed(1) : 'y'}`).sort().join(';'),
  ].join('|');
  const empreinte = signature(canonique).toString(16).padStart(8, '0');
  setAttr(layout, 'data-v2e066-empreinte', empreinte);
  setAttr(layout, 'data-v2e066-canonique-longueur', canonique.length);

  /* E066-02 — Monotonie des compteurs : un effectif qui diminue entre deux
   * rendus est une régression d'état, pas une simple dérive. On décompte les
   * champs concernés et l'on nomme leur type, sans rien corriger. */
  let regression = 'initial';
  let regressionChamps = '';
  if (precedent && Array.isArray(precedent.population)) {
    const baisse = population.reduce((acc, valeur, i) => {
      if (valeur < precedent.population[i]) acc.push(NOMS_COMPTEURS[i]);
      return acc;
    }, []);
    regression = String(baisse.length);
    regressionChamps = baisse.join(', ');
  }
  setAttr(layout, 'data-v2e066-regression', regression);
  setAttr(layout, 'data-v2e066-regression-champs', regressionChamps);

  /* E066-03 — Sérialisation canonique des annotations sources : la suite
   * des effectifs par point est triée, donc insensible à l'ordre des lunes.
   * Un déplacement de nœuds dans le DOM ne modifie pas la représentation. */
  const srcTries = lunes.map(srcDe).sort((a, b) => a - b);
  const srcCanonique = srcTries.join(',');
  setAttr(layout, 'data-v2e066-src-canonique', srcCanonique);
  const bins = {
    zero: srcTries.filter((n) => n === 0).length,
    un: srcTries.filter((n) => n === 1).length,
    plusieurs: srcTries.filter((n) => n > 1).length,
  };
  setAttr(layout, 'data-v2e066-src-bins', `${bins.zero}|${bins.un}|${bins.plusieurs}`);
  setAttr(layout, 'data-v2e066-src-stable',
    precedent && precedent.srcCanonique === srcCanonique ? '1' : '0');

  /* E066-04 — Intégrité des identifiants : clés mal formées, dupliquées ou
   * présentant des trous dans la suite d'indices d'un niveau. Les nœuds
   * fautifs reçoivent un marqueur de contour, jamais une modification de clé. */
  const toutes = noeuds.map((noeud) => attr(noeud, 'data-const-key'));
  const vus = new Map();
  toutes.forEach((cle) => vus.set(cle, (vus.get(cle) || 0) + 1));
  let doublons = 0;
  let malformes = 0;
  const indices = { sun: [], planet: [], moon: [] };
  noeuds.forEach((noeud) => {
    const cle = attr(noeud, 'data-const-key');
    const motif = /^(sun|planet|moon):(\d+)$/.exec(cle);
    if (!motif) {
      malformes += 1;
      flag(noeud, 'data-v2e066-cle-anormale', true);
      return;
    }
    if ((vus.get(cle) || 0) > 1) {
      doublons += 1;
      flag(noeud, 'data-v2e066-cle-anormale', true);
    }
    indices[motif[1]].push(Number.parseInt(motif[2], 10));
  });
  let trous = 0;
  Object.keys(indices).forEach((niveau) => {
    const suite = indices[niveau];
    if (!suite.length) return;
    const max = Math.max.apply(null, suite);
    for (let i = 0; i <= max; i += 1) if (suite.indexOf(i) < 0) trous += 1;
  });
  setAttr(layout, 'data-v2e066-cles', `${doublons}|${malformes}|${trous}`);

  /* E066-05 — Dispersion géométrique : moyenne et écart-type des coordonnées
   * normalisées, puis signalement des nœuds éloignés de plus de deux écarts.
   * L'information est portée par un contour pointillé, pas par une couleur. */
  const stats = (vals) => {
    if (!vals.length) return { min: 0, max: 0, moy: 0, ecart: 0 };
    const min = Math.min.apply(null, vals);
    const max = Math.max.apply(null, vals);
    const moy = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - moy) * (b - moy), 0) / vals.length;
    return { min, max, moy, ecart: Math.sqrt(variance) };
  };
  const sx = stats(coordonnees.filter((p) => Number.isFinite(p.x)).map((p) => p.x));
  const sy = stats(coordonnees.filter((p) => Number.isFinite(p.y)).map((p) => p.y));
  let hors = 0;
  coordonnees.forEach((p) => {
    const ex = Number.isFinite(p.x) && sx.ecart > 0 ? Math.abs(p.x - sx.moy) / sx.ecart : 0;
    const ey = Number.isFinite(p.y) && sy.ecart > 0 ? Math.abs(p.y - sy.moy) / sy.ecart : 0;
    if (ex > ECART_DISPERSION || ey > ECART_DISPERSION) {
      flag(p.noeud, 'data-v2e066-dispersion-hors', true);
      hors += 1;
    }
  });
  setAttr(layout, 'data-v2e066-dispersion-x',
    `${sx.min.toFixed(1)}|${sx.max.toFixed(1)}|${sx.moy.toFixed(1)}|${sx.ecart.toFixed(1)}`);
  setAttr(layout, 'data-v2e066-dispersion-y',
    `${sy.min.toFixed(1)}|${sy.max.toFixed(1)}|${sy.moy.toFixed(1)}|${sy.ecart.toFixed(1)}`);
  setAttr(layout, 'data-v2e066-dispersion-hors', String(hors));

  /* E066-06 — Niveau de sévérité de la densité : trois états nommés dérivés
   * de seuils déclarés en tête de module, plus expressifs que le mode compact
   * binaire de la passe 1. Le niveau est écrit en toutes lettres et en attribut. */
  const densite = population.reduce((a, b) => a + b, 0)
    + doublons + malformes + trous + hors;
  const severite = densite < SEUIL_FAIBLE ? 'faible'
    : densite <= SEUIL_ELEVE ? 'moyen' : 'élevé';
  setAttr(layout, 'data-v2e066-densite', String(densite));
  setAttr(layout, 'data-v2e066-severite', severite);

  /* E066-07 — Génération de rendu : compteur monotone conservé dans la
   * mémoire attachée à la scène, indépendant du nombre d'actions utilisateur
   * enregistrées par l'historique de la passe 1. */
  const generation = precedent && Number.isFinite(precedent.generation)
    ? precedent.generation + 1 : 1;
  setAttr(layout, 'data-v2e066-generation', String(generation));

  /* E066-08 — Stagnation : nombre de rendus consécutifs dont l'empreinte est
   * identique. Au-delà du seuil, l'état est déclaré stable, sans rien figer. */
  const stagnation = precedent && precedent.empreinte === empreinte
    ? (Number.isFinite(precedent.stagnation) ? precedent.stagnation + 1 : 1)
    : 0;
  setAttr(layout, 'data-v2e066-stagnation', String(stagnation));
  flag(layout, 'data-v2e066-stagne', stagnation >= SEUIL_STAGNATION);

  /* E066-09 — Cohérence de la hiérarchie d'activation : un niveau profond ne
   * doit pas être actif si son parent ne l'est pas. Contrôle transversal,
   * distinct du « au plus un actif par niveau » déjà réalisé en passe 1. */
  let ruptures = 0;
  if (actifLune && !actifPlanete) ruptures += 1;
  if (actifPlanete && !actifSoleil) ruptures += 1;
  const coherence = ruptures === 0 ? 'ok' : 'rompue';
  setAttr(layout, 'data-v2e066-coherence', coherence);
  setAttr(layout, 'data-v2e066-ruptures', String(ruptures));

  /* E066-10 — Indice de cohérence d'état, résumé vocalisé et bascule de
   * détail : les neuf indicateurs sont agrégés en un score borné 0–100,
   * énoncés en français dans une région live, avec un bouton à bascule
   * indépendante dont l'intention survit aux reconstructions du DOM. */
  const sains = [
    empreinte.length === 8,
    regression === '0' || regression === 'initial',
    srcTries.length === lunes.length,
    doublons === 0 && malformes === 0 && trous === 0,
    hors === 0,
    severite !== 'élevé',
    generation >= 1,
    stagnation < SEUIL_STAGNATION,
    ruptures === 0,
  ].filter(Boolean).length;
  const indice = Math.round((sains / 9) * 100);
  setAttr(layout, 'data-v2e066-indice', String(indice));

  let reduit = false;
  try { reduit = typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion(); }
  catch { reduit = false; }
  setAttr(layout, 'data-v2e066-motion', reduit ? 'reduced' : 'full');

  const ancienne = requete(layout, '#v2e066-synthese');
  if (ancienne && ancienne.parentNode) ancienne.parentNode.removeChild(ancienne);
  const synthese = creer(ctx, 'section', severite === 'élevé' ? 'v2e066-eleve' : '');
  synthese.id = 'v2e066-synthese';
  synthese.setAttribute('aria-labelledby', 'v2e066-titre');
  const titre = creer(ctx, 'h3', '', 'Synthèse V2 des métriques chiffrées · E066');
  titre.id = 'v2e066-titre';
  synthese.appendChild(titre);
  const resume = creer(ctx, 'p', 'v2e066-resume', '');
  resume.id = 'v2e066-resume';
  resume.setAttribute('role', 'status');
  resume.setAttribute('aria-live', 'polite');
  resume.setAttribute('aria-atomic', 'true');
  synthese.appendChild(resume);
  const liste = creer(ctx, 'ul', 'v2e066-detail');
  liste.id = 'v2e066-detail';
  const lignes = [
    `Empreinte de l'état : ${empreinte}.`,
    `Régression des compteurs : ${regression}${regressionChamps ? ` (${regressionChamps})` : ''}.`,
    `Sources en ordre canonique : ${srcCanonique || 'aucune'}.`,
    `Identifiants — doublons ${doublons}, mal formés ${malformes}, trous ${trous}.`,
    `Dispersion : ${hors} nœud(s) éloigné(s) ; x ${sx.moy.toFixed(1)} ± ${sx.ecart.toFixed(1)}, y ${sy.moy.toFixed(1)} ± ${sy.ecart.toFixed(1)}.`,
    `Densité ${frNombre(densite, 0)} — sévérité ${severite}.`,
    `Génération de rendu : ${generation}.`,
    `Stagnation : ${stagnation} rendu(s) identique(s) consécutif(s).`,
    `Activation : ${coherence} (${ruptures} rupture(s)).`,
  ];
  lignes.forEach((texte) => liste.appendChild(creer(ctx, 'li', '', texte)));
  synthese.appendChild(liste);
  const bascule = creer(ctx, 'button', '', 'Détail de l’indice de cohérence');
  bascule.type = 'button';
  bascule.id = 'v2e066-bascule';
  bascule.setAttribute('aria-controls', 'v2e066-detail');
  bascule.addEventListener('click', () => {
    detailOuvert = !detailOuvert;
    setAttr(bascule, 'aria-pressed', detailOuvert ? 'true' : 'false');
    liste.hidden = !detailOuvert;
  });
  synthese.appendChild(bascule);
  if (caption) caption.appendChild(synthese);
  else layout.appendChild(synthese);

  ecrire(resume, `Indice de cohérence d'état : ${indice} / 100. Génération ${generation}, `
    + `empreinte ${empreinte}, régression ${regression}, sévérité ${severite}, `
    + `dispersion ${hors} hors norme, clés ${doublons}/${malformes}/${trous}, `
    + `stagnation ${stagnation}, activation ${coherence}.`);
  setAttr(bascule, 'aria-pressed', detailOuvert ? 'true' : 'false');
  liste.hidden = !detailOuvert;

  /* Écriture de la mémoire après tous les calculs : le rendu suivant
     comparera ses propres valeurs à cet instantané, sans sonde ni réseau. */
  memoire.set(cleScene, {
    empreinte,
    population: population.slice(),
    srcCanonique,
    generation,
    stagnation,
  });
});
