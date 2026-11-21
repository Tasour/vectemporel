import { register } from './registry.js';

/* Lentille V2 E039 — robustesse géométrique et garde-fous complémentaires des
   arêtes du graphe (vue Constellation). Seconde passe : dix chantiers inédits,
   tous implémentés, sans réseau ni source aléatoire, sans minuteur ni boucle
   d'animation propre. Tous les identifiants sont préfixés `v2e039` afin de ne
   jamais collisionner avec la lentille E039 de la première passe. */

const COORDONNEES = ['x1', 'y1', 'x2', 'y2'];
const LIMITE_CROISEMENTS = 220; /* au-delà, l'analyse quadratique est suspendue */
const SEUIL_LONGUEUR = 113;     /* 0,8 × la diagonale du viewBox 0 0 100 100 */
const SEUIL_MICRO = 2;          /* unités de viewBox sous une arête illisible */
const SEUIL_BIAIS = 0.6;        /* part d'une orientation dominante */
const SEUIL_FANOUT = 0.4;       /* part d'une origine dominante */
const EPSILON = 1e-9;

/* Persiste entre deux reconstructions du DOM : seule l'intention de
   l'utilisateur est conservée, jamais un nœud du rendu précédent. */
let detailOuvert = false;

function attr(noeud, nom) {
  return noeud && typeof noeud.getAttribute === 'function' ? noeud.getAttribute(nom) : null;
}

function setAttr(noeud, nom, valeur) {
  if (!noeud || typeof noeud.setAttribute !== 'function') return;
  try { noeud.setAttribute(nom, valeur); } catch { /* nœud verrouillé : on passe outre */ }
}

function flag(noeud, nom, actif) {
  setAttr(noeud, nom, actif ? '1' : '0');
}

function nombre(noeud, nom) {
  const brut = attr(noeud, nom);
  if (brut === null || brut === '') return NaN;
  return Number(brut);
}

function coordonneesFinies(geom) {
  return COORDONNEES.every((nom) => Number.isFinite(geom[nom]));
}

function requete(racine, selecteur) {
  return racine && typeof racine.querySelector === 'function' ? racine.querySelector(selecteur) : null;
}

function collecte(racine, selecteur) {
  if (!racine || typeof racine.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(racine.querySelectorAll(selecteur));
}

function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

function frNombre(valeur, decimales) {
  if (!Number.isFinite(valeur)) return '—';
  const chaine = decimales ? valeur.toFixed(decimales) : String(Math.round(valeur));
  const [entiere, fraction] = chaine.split('.');
  const groupe = entiere.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return fraction ? `${groupe},${fraction}` : groupe;
}

function cle(x, y) {
  return `${x.toFixed(2)}|${y.toFixed(2)}`;
}

/* Une seule feuille, portée par `data-v2e039` posé sur le champ : aucune
   règle ne s'échappe de la vue Constellation. */
const CSS = `
[data-v2e039="1"] .constellation-edges line{stroke-linecap:round}
/* E039-01 — doublon géométrique : trait ondulé, distinct des motifs E039. */
[data-v2e039="1"] line[data-v2e039-doublon="1"]{stroke-dasharray:1 3;opacity:.4}
/* E039-02 — arête croisée : tiret moyen, compté à part. */
[data-v2e039="1"] line[data-v2e039-croisement="1"]{stroke-dasharray:4 2}
/* E039-03 — arête invisible : signalée sans changer sa couleur d'origine. */
[data-v2e039="1"] line[data-v2e039-invisible="1"]{stroke-dasharray:2 4;opacity:.5}
/* E039-06 — arête surlongue : trait fin pour ne pas dominer le champ. */
[data-v2e039="1"] line[data-v2e039-longue="1"]{stroke-width:.9}
/* E039-09 — micro-arête : marqueur court et dense. */
[data-v2e039="1"] line[data-v2e039-micro="1"]{stroke-dasharray:.5 2.5;opacity:.7}
/* E039-10 — révélation à la demande de tous les signalements V2. */
[data-v2e039="1"][data-v2e039-reveal="1"] line[data-v2e039-doublon="1"],
[data-v2e039="1"][data-v2e039-reveal="1"] line[data-v2e039-croisement="1"],
[data-v2e039="1"][data-v2e039-reveal="1"] line[data-v2e039-invisible="1"],
[data-v2e039="1"][data-v2e039-reveal="1"] line[data-v2e039-longue="1"],
[data-v2e039="1"][data-v2e039-reveal="1"] line[data-v2e039-micro="1"],
[data-v2e039="1"][data-v2e039-reveal="1"] line[data-v2e039-fanout="1"]{
  stroke:var(--gold-bright);stroke-width:2.2;opacity:1;stroke-dasharray:none
}
#v2e039-longueur{
  flex:1 1 100%;margin:0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
#v2e039-detail{
  min-height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--ink-soft);font:inherit;font-size:9px;cursor:pointer;
}
#v2e039-detail:hover{border-color:var(--gold)}
#v2e039-detail:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#v2e039-detail[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright)}
#v2e039-detail-panel{
  flex:1 1 100%;margin:0;color:var(--muted);font-size:9px;line-height:1.5;
  font-variant-numeric:tabular-nums;
}
@media (max-width:620px){#v2e039-longueur,#v2e039-detail-panel{flex-basis:100%}}
@media (prefers-reduced-motion:reduce){#v2e039-detail{transition:none}}
`;

register('E039', (ctx) => {
  /* Garde d'entrée obligatoire : contexte incomplet ou vue absente → aucun
     ajout au DOM, aucune exception. Le viewId V2 est `constellationv2` ; on ne
     filtre pas dessus, la présence du champ fait foi. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const field = requete(layout, '.constellation-field');
  if (!field) return;
  const edges = requete(field, '.constellation-edges');
  if (!edges) return;

  const creer = (tag, className, text) => typeof ctx.el === 'function'
    ? ctx.el(tag, className, text) : document.createElement(tag);

  /* Géométrie lue une seule fois : nœud + quatre coordonnées + extrémités. */
  const geometries = collecte(edges, 'line').map((noeud) => {
    const geom = { noeud };
    COORDONNEES.forEach((nom) => { geom[nom] = nombre(noeud, nom); });
    geom.valide = coordonneesFinies(geom);
    if (geom.valide) {
      geom.debut = cle(geom.x1, geom.y1);
      geom.fin = cle(geom.x2, geom.y2);
      geom.longueur = Math.hypot(geom.x2 - geom.x1, geom.y2 - geom.y1);
    }
    return geom;
  });
  const valides = geometries.filter((geom) => geom.valide);

  /* Une seule feuille injectée une fois par cssOnce, puis périmètre posé. */
  css('constellation-v2-e039', CSS);
  setAttr(field, 'data-v2e039', '1');

  /* E039-01 — Doublons géométriques : deux arêtes reliant les mêmes extrémités
     (orientation confondue) sont comptées et marquées, jamais laissées en
     surcharge invisible. Aucune valeur n'est saisie en dur dans le texte. */
  const vus = new Map();
  valides.forEach((geom) => {
    const cleGeom = [geom.debut, geom.fin].sort().join('→');
    geom.cleGeom = cleGeom;
    vus.set(cleGeom, (vus.get(cleGeom) || 0) + 1);
  });
  let doublonsLignes = 0;
  let doublonsGroupes = 0;
  valides.forEach((geom) => {
    if ((vus.get(geom.cleGeom) || 0) > 1) {
      flag(geom.noeud, 'data-v2e039-doublon', true);
      doublonsLignes += 1;
    }
  });
  vus.forEach((count) => { if (count > 1) doublonsGroupes += 1; });
  setAttr(field, 'data-v2e039-doublons', String(doublonsLignes));
  setAttr(field, 'data-v2e039-doublons-groupes', String(doublonsGroupes));

  /* E039-02 — Croisements : test d'intersection propre par orientation, en
     excluant les arêtes adjacentes (extrémité partagée). La portée est bornée
     à LIMITE_CROISEMENTS pour rester locale et dégradable. */
  let croisements = 0;
  if (valides.length <= LIMITE_CROISEMENTS) {
    const signe = (v) => (v > EPSILON ? 1 : v < -EPSILON ? -1 : 0);
    for (let i = 0; i < valides.length; i += 1) {
      const a = valides[i];
      for (let j = i + 1; j < valides.length; j += 1) {
        const b = valides[j];
        if (a.debut === b.debut || a.debut === b.fin || a.fin === b.debut || a.fin === b.fin) continue;
        /* a est le segment de référence ; on teste b de part et d'autre. */
        const o1 = signe((a.x2 - a.x1) * (b.y1 - a.y1) - (a.y2 - a.y1) * (b.x1 - a.x1));
        const o2 = signe((a.x2 - a.x1) * (b.y2 - a.y1) - (a.y2 - a.y1) * (b.x2 - a.x1));
        const o3 = signe((b.x2 - b.x1) * (a.y1 - b.y1) - (b.y2 - b.y1) * (a.x1 - b.x1));
        const o4 = signe((b.x2 - b.x1) * (a.y2 - b.y1) - (b.y2 - b.y1) * (a.x2 - b.x1));
        if (o1 * o2 < 0 && o3 * o4 < 0) {
          croisements += 1;
          flag(a.noeud, 'data-v2e039-croisement', true);
          flag(b.noeud, 'data-v2e039-croisement', true);
        }
      }
    }
  }
  setAttr(edges, 'data-v2e039-croisements',
    valides.length <= LIMITE_CROISEMENTS ? String(croisements) : 'non évalué');
  flag(edges, 'data-v2e039-croisements-limite', valides.length > LIMITE_CROISEMENTS);

  /* E039-03 — Arêtes invisibles : trait `none`/transparent, opacité nulle ou
     épaisseur nulle, en attribut comme en style inline. Une liaison présente
     mais invisible est une anomalie au même titre qu'une liaison fantôme. */
  let invisibles = 0;
  valides.forEach((geom) => {
    const style = geom.noeud.style || {};
    const brutStroke = attr(geom.noeud, 'stroke') || '';
    const brutOpacite = attr(geom.noeud, 'opacity');
    const brutTrait = attr(geom.noeud, 'stroke-width');
    const stroke = (brutStroke || (style.stroke || '')).toLowerCase();
    const opacite = brutOpacite !== null ? Number(brutOpacite) : Number(style.opacity);
    const epaisseur = brutTrait !== null ? Number(brutTrait) : Number(style.strokeWidth);
    const incolore = stroke === 'none' || stroke === 'transparent';
    const absent = (Number.isFinite(opacite) && opacite === 0)
      || (Number.isFinite(epaisseur) && epaisseur === 0);
    if (incolore || absent) {
      flag(geom.noeud, 'data-v2e039-invisible', true);
      invisibles += 1;
    }
  });
  setAttr(field, 'data-v2e039-invisibles', String(invisibles));

  /* E039-04 — Éléments étrangers : le SVG décoratif ne doit contenir que des
     <line>. Tout autre enfant (cercle, texte, groupe) est décompté : la
     première passe ne collectait que les traits et l'ignorait donc. */
  const enfants = Array.prototype.slice.call(edges.children || []);
  const etrangers = enfants.filter((noeud) => noeud.nodeType === 1
    && String(noeud.localName || noeud.nodeName || '').toLowerCase() !== 'line');
  setAttr(edges, 'data-v2e039-etrangers', String(etrangers.length));
  flag(edges, 'data-v2e039-etrangers-presents', etrangers.length > 0);

  /* E039-05 — Styles inline d'animation neutralisés : une lentille tiers peut
     poser `animation` ou `transition` en inline, contournant la feuille de gel
     de la passe 1. On retire ces deux propriétés, sans toucher au trait. */
  let stylesNettoyes = 0;
  valides.forEach((geom) => {
    const style = geom.noeud.style;
    if (!style || typeof style.getPropertyValue !== 'function') return;
    try {
      const animation = style.getPropertyValue('animation');
      const transition = style.getPropertyValue('transition');
      if (animation || transition) {
        if (animation) style.removeProperty('animation');
        if (transition) style.removeProperty('transition');
        flag(geom.noeud, 'data-v2e039-style-nettoye', true);
        stylesNettoyes += 1;
      }
    } catch { /* style verrouillé : le marquage restera absent, sans erreur */ }
  });
  setAttr(field, 'data-v2e039-styles-nettoyes', String(stylesNettoyes));

  /* E039-06 — Arêtes surlongues et statistiques de longueur : au-delà de
     0,8 × la diagonale du viewBox, un trait traverse tout le champ et nuit à
     la lisibilité. Le bilan chiffré est énoncé en texte dans une région live. */
  let longueMin = Infinity;
  let longueMax = 0;
  let longueSomme = 0;
  let longues = 0;
  valides.forEach((geom) => {
    longueMin = Math.min(longueMin, geom.longueur);
    longueMax = Math.max(longueMax, geom.longueur);
    longueSomme += geom.longueur;
    if (geom.longueur > SEUIL_LONGUEUR) {
      flag(geom.noeud, 'data-v2e039-longue', true);
      longues += 1;
    }
  });
  const moyenne = valides.length ? longueSomme / valides.length : 0;
  setAttr(field, 'data-v2e039-longues', String(longues));
  setAttr(field, 'data-v2e039-longueur-max', valides.length ? longueMax.toFixed(2) : '0');
  const caption = requete(layout, '.constellation-caption');
  let mesure = requete(layout, '#v2e039-longueur');
  if (!mesure && caption) {
    mesure = creer('p', '', '');
    mesure.id = 'v2e039-longueur';
    mesure.setAttribute('role', 'status');
    mesure.setAttribute('aria-live', 'polite');
    mesure.setAttribute('aria-atomic', 'true');
    caption.insertBefore(mesure, caption.firstChild);
  }
  if (mesure) {
    ecrire(mesure, `Longueur des arêtes — min ${frNombre(longueMin, 2)}, max ${frNombre(longueMax, 2)}, moyenne ${frNombre(moyenne, 2)}, totale ${frNombre(longueSomme, 2)} unités de viewBox ; ${frNombre(longues)} arête(s) surlongue(s).`);
  }

  /* E039-07 — Biais angulaire : quatre secteurs d'orientation ; si l'un
     concentre plus de 60 % des traits (avec au moins six arêtes), la
     répartition est signalée, car elle trahit un graphe déséquilibré. */
  const secteurs = { horizontale: 0, verticale: 0, 'montante': 0, 'descendante': 0 };
  valides.forEach((geom) => {
    let angle = Math.atan2(geom.y2 - geom.y1, geom.x2 - geom.x1) * 180 / Math.PI;
    if (angle < 0) angle += 180;
    if (angle < 15 || angle >= 165) secteurs.horizontale += 1;
    else if (angle >= 75 && angle < 105) secteurs.verticale += 1;
    else if (angle < 75) secteurs.montante += 1;
    else secteurs.descendante += 1;
  });
  let dominant = '';
  let partDominante = 0;
  Object.keys(secteurs).forEach((nom) => {
    const part = valides.length ? secteurs[nom] / valides.length : 0;
    if (part > partDominante) { partDominante = part; dominant = nom; }
  });
  const biais = valides.length >= 6 && partDominante >= SEUIL_BIAIS;
  flag(edges, 'data-v2e039-biais', biais);
  setAttr(edges, 'data-v2e039-orientation', dominant || 'aucune');
  setAttr(edges, 'data-v2e039-orientation-part', partDominante.toFixed(2));

  /* E039-08 — Concentration d'origine : si une seule extrémité de départ
     émet plus de 40 % des traits (avec au moins six arêtes), les arêtes
     concernées sont marquées et l'éventail est consigné. */
  const origines = new Map();
  valides.forEach((geom) => origines.set(geom.debut, (origines.get(geom.debut) || 0) + 1));
  let origineDominante = '';
  let tailleDominante = 0;
  origines.forEach((count, cleOrigine) => {
    if (count > tailleDominante) { tailleDominante = count; origineDominante = cleOrigine; }
  });
  const concentration = valides.length >= 6 && tailleDominante / valides.length >= SEUIL_FANOUT;
  let fanoutLignes = 0;
  if (concentration) {
    valides.forEach((geom) => {
      if (geom.debut === origineDominante) {
        flag(geom.noeud, 'data-v2e039-fanout', true);
        fanoutLignes += 1;
      }
    });
  }
  setAttr(field, 'data-v2e039-fanout', String(fanoutLignes));
  setAttr(field, 'data-v2e039-fanout-origine', concentration ? origineDominante : '');

  /* E039-09 — Micro-arêtes lisibles : entre la tolérance de dégénérescence de
     la passe 1 (0,01) et 2 unités, un trait existe mais reste illisible ; on
     le signale sans le confondre avec une arête dégénérée. */
  let micro = 0;
  valides.forEach((geom) => {
    if (geom.longueur >= 0.01 && geom.longueur < SEUIL_MICRO) {
      flag(geom.noeud, 'data-v2e039-micro', true);
      micro += 1;
    }
  });
  setAttr(field, 'data-v2e039-micro', String(micro));

  /* E039-10 — Indice de lisibilité et soupape de détail : l'indice agrège les
     neuf contrôles en un score borné 0–100, énoncé en texte ; un bouton à
     bascule indépendante révèle les arêtes signalées. L'état survit aux
     re-renders par une variable de module, aucun nœud n'est mémorisé. */
  const anomalies = doublonsLignes + croisements + invisibles + etrangers.length
    + stylesNettoyes + longues + micro + fanoutLignes + (biais ? 1 : 0);
  const score = Math.max(0, Math.round(100 - (anomalies / Math.max(1, valides.length)) * 100));
  setAttr(field, 'data-v2e039-score', String(score));

  let panel = requete(layout, '#v2e039-detail-panel');
  if (!panel && caption) {
    panel = creer('p', '', '');
    panel.id = 'v2e039-detail-panel';
    panel.setAttribute('role', 'status');
    panel.setAttribute('aria-live', 'polite');
    caption.appendChild(panel);
  }
  if (panel) {
    ecrire(panel, `Indice de lisibilité : ${score} / 100. Doublons ${doublonsLignes} (${doublonsGroupes} groupe(s)), croisements ${croisements}, invisibles ${invisibles}, éléments étrangers ${etrangers.length}, styles neutralisés ${stylesNettoyes}, surlongues ${longues}, micro-arêtes ${micro}, arêtes en éventail ${fanoutLignes}, biais angulaire ${biais ? dominant : 'aucun'}.`);
    panel.hidden = !detailOuvert;
  }
  let bouton = requete(layout, '#v2e039-detail');
  if (!bouton && caption) {
    bouton = creer('button', '', 'Détail de l’indice de lisibilité');
    bouton.type = 'button';
    bouton.id = 'v2e039-detail';
    bouton.setAttribute('aria-controls', 'v2e039-detail-panel');
    bouton.addEventListener('click', () => {
      detailOuvert = !detailOuvert;
      setAttr(bouton, 'aria-pressed', detailOuvert ? 'true' : 'false');
      setAttr(field, 'data-v2e039-reveal', detailOuvert ? '1' : '0');
      if (panel) panel.hidden = !detailOuvert;
    });
    caption.appendChild(bouton);
  }
  if (bouton) setAttr(bouton, 'aria-pressed', detailOuvert ? 'true' : 'false');
  setAttr(field, 'data-v2e039-reveal', detailOuvert ? '1' : '0');
});
