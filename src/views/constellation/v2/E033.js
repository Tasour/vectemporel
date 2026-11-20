import { register } from './registry.js';

/* Lentille V2 E033 — contraste visuel des arêtes du graphe. Seconde passe :
   dix chantiers inédits, tous implémentés, déterministes, sans réseau, sans
   aléa, sans minuteur ni boucle d'animation propre. Le préfixe v2e033 isole
   entièrement cette passe de la passe 1 et de toute autre lentille. */

const CSS_ID = 'constellation-v2-e033';
const SELECT_FIELD = '.constellation-field';
const SELECT_HEAD = '.constellation-head';
const SELECT_SVG = '.constellation-edges';
const SELECT_EDGES = '.constellation-edges line';
const SELECT_SUNS = '.const-layer-suns .const-sun';

/* Palettes de référence : miroir exact des déclarations CSS de cette feuille. */
const FOND = [15, 17, 22];        /* fond sombre de l'atlas. */
const SURFACE = [24, 27, 34];     /* surface des cartes. */
const CHAUD = [38, 31, 24];       /* fond teinté derrière le chemin actif. */
const OR = [244, 214, 158];       /* arêtes secondaires. */
const CHEMIN = [250, 216, 150];   /* arêtes du chemin actif. */
const LUNE = [196, 159, 235];     /* arêtes lunaires. */
const REPERE_OBJET = 3;           /* WCAG 1.4.11 : objet graphique. */
const REPERE_TEXTE = 4.5;         /* WCAG 1.4.3 : texte normal. */
const REPERE_AAA = 7;             /* WCAG 1.4.6 : contraste renforcé. */
const LONGUEUR_COURTE = 7;        /* unités du viewBox 0 0 100 100. */
const PROFONDEUR_MAX = 2;

/* Luminance relative WCAG d'une couleur RGB opaque. */
function luminance(rgb) {
  const parts = rgb.map((value) => {
    const canal = value / 255;
    return canal <= 0.03928 ? canal / 12.92 : Math.pow((canal + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2];
}

/* Composition d'une teinte translucide sur un fond choisi. */
function composer(rgb, alpha, fond) {
  return rgb.map((value, index) => Math.round(alpha * value + (1 - alpha) * fond[index]));
}

/* Ratio de contraste entre une teinte composée et son fond, arrondi au centième. */
function contraste(rgb, alpha, fond) {
  const avant = luminance(composer(rgb, alpha, fond));
  const arriere = luminance(fond);
  const haut = Math.max(avant, arriere);
  const bas = Math.min(avant, arriere);
  return Math.round(((haut + 0.05) / (bas + 0.05)) * 100) / 100;
}

/* Le pire cas est le plus faible des trois fonds plausibles de la scène. */
function pireContraste(rgb, alpha) {
  return Math.min(
    contraste(rgb, alpha, FOND),
    contraste(rgb, alpha, SURFACE),
    contraste(rgb, alpha, CHAUD)
  );
}

/* Alpha minimal, cherché par pas de 1 %, qui atteint la cible sur le pire fond. */
function alphaPour(rgb, cible) {
  let alpha = 0.05;
  while (alpha < 1) {
    if (pireContraste(rgb, alpha) >= cible) return Math.round(alpha * 100) / 100;
    alpha = Math.round((alpha + 0.01) * 100) / 100;
  }
  return 1;
}

/* Lecture défensive d'une coordonnée : une valeur absente vaut zéro. */
function nombre(valeur) {
  const resultat = parseFloat(valeur == null ? '' : String(valeur));
  return Number.isFinite(resultat) ? resultat : 0;
}

function debut(line) {
  return { x: nombre(line.getAttribute('x1')), y: nombre(line.getAttribute('y1')) };
}

function fin(line) {
  return { x: nombre(line.getAttribute('x2')), y: nombre(line.getAttribute('y2')) };
}

function ecart(a, b) {
  return Math.sqrt((a.x - b.x) * (a.x - b.x) + (a.y - b.y) * (a.y - b.y));
}

/* Orientation du triplet : le signe suffit à tester une intersection propre. */
function orienter(a, b, c) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

/* Intersection stricte, les extrémités partagées n'étant pas des croisements. */
function croisent(a, b, c, d) {
  const o1 = orienter(a, b, c);
  const o2 = orienter(a, b, d);
  const o3 = orienter(c, d, a);
  const o4 = orienter(c, d, b);
  return ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
         ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0));
}

/* Clé de nœud arrondie : les coordonnées répétées désignent le même sommet. */
function cle(point) {
  return point.x.toFixed(2) + ';' + point.y.toFixed(2);
}

/* Création de nœud par le contrat, avec repli silencieux sur le document propriétaire. */
function creer(ctx, tag, className, texte) {
  if (typeof ctx.el === 'function') return ctx.el(tag, className, texte);
  const noeud = ctx.layout.ownerDocument.createElement(tag);
  if (className) noeud.className = className;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
}

/* Région d'annonce unique, créée une seule fois et réutilisée. */
function assurerStatut(ctx, layout, id) {
  try {
    let noeud = layout.querySelector('#' + id);
    if (!noeud) {
      noeud = creer(ctx, 'p', 'v2e033-sr', '');
      noeud.id = id;
      noeud.setAttribute('role', 'status');
      noeud.setAttribute('aria-live', 'polite');
      noeud.setAttribute('aria-atomic', 'true');
      layout.appendChild(noeud);
    }
    return noeud;
  } catch {
    return null;
  }
}

register('E033', (ctx) => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  let field;
  let head;
  let svg;
  let edges;
  let suns;
  try {
    field = layout.querySelector(SELECT_FIELD);
    head = layout.querySelector(SELECT_HEAD);
    svg = field ? field.querySelector(SELECT_SVG) : null;
    edges = svg ? Array.from(svg.querySelectorAll(SELECT_EDGES)) : [];
    suns = field ? Array.from(field.querySelectorAll(SELECT_SUNS)) : [];
  } catch {
    return;
  }
  if (!field) return;

  /* Calculs une seule fois, partagés par les chantiers 01, 02, 05, 07 et 09. */
  const alphaOr = alphaPour(OR, REPERE_OBJET);
  const alphaLune = alphaPour(LUNE, REPERE_OBJET);
  const pireOr = pireContraste(OR, alphaOr);
  const pireLune = pireContraste(LUNE, alphaLune);
  const pireChemin = pireContraste(CHEMIN, 0.96);
  let statut = null;

  /* Feuille unique : aucune règle ne s'applique avant l'attribut final. */
  try {
    css(CSS_ID, `
/* E033-01 — plancher calculé sur le pire fond pour les arêtes secondaires. */
.constellation-field[data-v2e033-ready="1"] .constellation-edges line[data-v2e033-secondaire="1"] {
  stroke: rgba(244, 214, 158, var(--v2e033-alpha, .52));
  stroke-width: 1.2;
}
/* E033-02 — le chemin se distingue par l'épaisseur, pas par la couleur seule. */
.constellation-field[data-v2e033-ready="1"] .constellation-edges line.is-path:not([data-v2e033-court="1"]) {
  stroke: rgba(250, 216, 150, .96);
  stroke-width: 2.4;
}
/* E033-03 — compensation de contraste sur les arêtes courtes. */
.constellation-field[data-v2e033-ready="1"] .constellation-edges line[data-v2e033-court="1"] {
  stroke: #ffe6ad;
  stroke-width: 1.8;
}
/* E033-04 — croisement désambiguïsé par un trait fin et plus clair. */
.constellation-field[data-v2e033-ready="1"] .constellation-edges line[data-v2e033-croise="1"] {
  stroke: rgba(255, 232, 186, .9);
  stroke-width: .9;
}
/* E033-05 — échelle de contraste selon la profondeur topologique. */
.constellation-field[data-v2e033-ready="1"] .constellation-edges line[data-v2e033-profondeur="0"] {
  stroke: rgba(244, 214, 158, var(--v2e033-p0, .68));
}
.constellation-field[data-v2e033-ready="1"] .constellation-edges line[data-v2e033-profondeur="1"] {
  stroke: rgba(244, 214, 158, var(--v2e033-p1, .6));
}
.constellation-field[data-v2e033-ready="1"] .constellation-edges line[data-v2e033-profondeur="2"] {
  stroke: rgba(244, 214, 158, var(--v2e033-p2, .52));
}
/* E033-06 — inversion de la palette sur fond clair détecté. */
.constellation-field[data-v2e033-ready="1"].v2e033-clair .constellation-edges line:not(.is-path):not(.is-moon) {
  stroke: rgba(26, 29, 36, .94);
}
.constellation-field[data-v2e033-ready="1"].v2e033-clair .constellation-edges line.is-path {
  stroke: rgba(14, 16, 21, 1);
}
.constellation-field[data-v2e033-ready="1"].v2e033-clair .constellation-edges line.is-moon {
  stroke: rgba(74, 32, 110, .92);
  stroke-dasharray: 2 1.6;
}
/* E033-07 — tableau des ratios, replié par défaut. */
.constellation-layout[data-v2e033-ui="1"] #v2e033-tableau {
  margin-top: 4px; color: var(--muted-2); font-size: 8px;
}
.constellation-layout[data-v2e033-ui="1"] #v2e033-tableau summary {
  min-height: 36px; display: inline-flex; align-items: center;
  padding: 0 8px; cursor: pointer; color: var(--ink-soft);
}
.constellation-layout[data-v2e033-ui="1"] #v2e033-tableau summary:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
.constellation-layout[data-v2e033-ui="1"] #v2e033-tableau table { border-collapse: collapse; }
.constellation-layout[data-v2e033-ui="1"] #v2e033-tableau th,
.constellation-layout[data-v2e033-ui="1"] #v2e033-tableau td {
  padding: 1px 10px 1px 0; text-align: left; font-variant-numeric: tabular-nums;
}
/* E033-08 — choix unique du mode, jamais aria-pressed. */
.constellation-layout[data-v2e033-ui="1"] #v2e033-mode {
  display: inline-flex; gap: 4px; align-items: center; margin-left: 6px;
}
.constellation-layout[data-v2e033-ui="1"] .v2e033-mode-btn {
  min-height: 36px; min-width: 44px; padding: 0 9px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255, 255, 255, .03); color: var(--ink-soft);
  font-size: 9px; cursor: pointer;
}
.constellation-layout[data-v2e033-ui="1"] .v2e033-mode-btn:focus-visible {
  outline: 2px solid var(--gold-bright); outline-offset: 2px;
}
.constellation-layout[data-v2e033-ui="1"] .v2e033-mode-btn[aria-checked="true"] {
  border-color: var(--gold); color: var(--gold-bright);
  background: rgba(244, 214, 158, .12);
}
.constellation-field[data-v2e033-ready="1"][data-v2e033-mode="max"] .constellation-edges line[data-v2e033-secondaire="1"] {
  stroke: #fff8e7; stroke-width: 1.4; stroke-dasharray: 1 3;
}
.constellation-field[data-v2e033-ready="1"][data-v2e033-mode="max"] .constellation-edges line.is-path {
  stroke: #ffffff; stroke-width: 3;
}
.constellation-field[data-v2e033-ready="1"][data-v2e033-mode="max"] .constellation-edges line.is-moon {
  stroke: #ffffff; stroke-width: 2; stroke-dasharray: 5 2;
}
.constellation-layout[data-v2e033-ui="1"] .v2e033-sr {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
}
/* E033-10 — relais du réglage système et calmement du mouvement réduit. */
@media (prefers-contrast: more) {
  .constellation-field[data-v2e033-ready="1"] .constellation-edges line[data-v2e033-secondaire="1"] {
    stroke: #fff8e7; stroke-width: 1.4; stroke-dasharray: 1 3;
  }
  .constellation-field[data-v2e033-ready="1"] .constellation-edges line.is-path {
    stroke: #ffffff; stroke-width: 3;
  }
}
@media (prefers-reduced-motion: reduce) {
  .constellation-layout[data-v2e033-ui="1"] .v2e033-mode-btn { transition: none; }
}
`);
  } catch {
    return;
  }

  /* E033-01 — alpha calculé sur le pire fond, posé sur les traits secondaires. */
  try {
    field.style.setProperty('--v2e033-alpha', alphaOr.toFixed(2));
    edges.forEach((line) => {
      if (!line.classList.contains('is-path') && !line.classList.contains('is-moon')) {
        line.setAttribute('data-v2e033-secondaire', '1');
      }
    });
  } catch {
    /* Un style ou un attribut refusé ne doit pas arrêter la passe. */
  }

  /* E033-02 — trois repères WCAG et conformité mesurée, sans chiffre inventé. */
  try {
    field.setAttribute('data-v2e033-pire-second', pireOr.toFixed(2));
    field.setAttribute('data-v2e033-pire-chemin', pireChemin.toFixed(2));
    field.setAttribute('data-v2e033-pire-lune', pireLune.toFixed(2));
    field.setAttribute('data-v2e033-reperes',
      REPERE_OBJET + '/' + REPERE_TEXTE + '/' + REPERE_AAA);
    field.setAttribute('data-v2e033-conformite',
      (pireOr >= REPERE_OBJET ? 'objet:oui' : 'objet:non') + ';' +
      (pireOr >= REPERE_TEXTE ? 'texte:oui' : 'texte:non') + ';' +
      (pireOr >= REPERE_AAA ? 'aaa:oui' : 'aaa:non'));
  } catch {
    /* Les attributs d'audit sont facultatifs. */
  }

  /* E033-03 — les traits très courts reçoivent un surcroît de lisibilité. */
  let courts = 0;
  edges.forEach((line) => {
    if (ecart(debut(line), fin(line)) < LONGUEUR_COURTE) {
      line.setAttribute('data-v2e033-court', '1');
      courts += 1;
    }
  });
  field.setAttribute('data-v2e033-courts', String(courts));

  /* E033-04 — détection géométrique des croisements avec le chemin actif. */
  const chemin = edges.filter((line) => line.classList.contains('is-path'));
  const autres = edges.filter((line) => !line.classList.contains('is-path'));
  let croisements = 0;
  chemin.forEach((trait) => {
    const a = debut(trait);
    const b = fin(trait);
    autres.forEach((line) => {
      if (croisent(a, b, debut(line), fin(line))) {
        line.setAttribute('data-v2e033-croise', '1');
        croisements += 1;
      }
    });
  });
  field.setAttribute('data-v2e033-croisements', String(croisements));

  /* E033-05 — profondeur topologique calculée par parcours en largeur. */
  try {
    const voisins = new Map();
    const relier = (a, b) => {
      const ca = cle(a);
      const cb = cle(b);
      if (ca === cb) return;
      if (!voisins.has(ca)) voisins.set(ca, []);
      if (!voisins.has(cb)) voisins.set(cb, []);
      voisins.get(ca).push(cb);
      voisins.get(cb).push(ca);
    };
    edges.forEach((line) => relier(debut(line), fin(line)));

    let racine = null;
    const actif = suns.find((soleil) => soleil.classList.contains('is-active'));
    if (actif) {
      racine = {
        x: nombre(actif.style.getPropertyValue('--x')),
        y: nombre(actif.style.getPropertyValue('--y')),
      };
    }
    if (!racine || !voisins.has(cle(racine))) {
      racine = edges.length ? debut(edges[0]) : null;
    }

    const profondeur = new Map();
    const repartition = { 0: 0, 1: 0, 2: 0 };
    if (racine) {
      profondeur.set(cle(racine), 0);
      let front = [cle(racine)];
      for (let niveau = 1; niveau <= PROFONDEUR_MAX && front.length; niveau += 1) {
        const suivants = [];
        front.forEach((noeud) => {
          (voisins.get(noeud) || []).forEach((voisin) => {
            if (!profondeur.has(voisin)) {
              profondeur.set(voisin, niveau);
              suivants.push(voisin);
            }
          });
        });
        front = suivants;
      }
    }
    edges.forEach((line) => {
      const d = debut(line);
      const f = fin(line);
      const valeur = profondeur.has(cle(d)) ? profondeur.get(cle(d))
        : (profondeur.has(cle(f)) ? profondeur.get(cle(f)) : PROFONDEUR_MAX);
      const niveau = Math.min(valeur, PROFONDEUR_MAX);
      line.setAttribute('data-v2e033-profondeur', String(niveau));
      repartition[niveau] += 1;
    });
    field.style.setProperty('--v2e033-p0', alphaPour(OR, 3.8).toFixed(2));
    field.style.setProperty('--v2e033-p1', alphaPour(OR, 3.4).toFixed(2));
    field.style.setProperty('--v2e033-p2', alphaOr.toFixed(2));
    field.setAttribute('data-v2e033-profondeurs',
      repartition[0] + '/' + repartition[1] + '/' + repartition[2]);
  } catch {
    /* Sans graphe exploitable, les traits gardent le plancher du chantier 01. */
  }

  /* E033-06 — détection d'un fond clair et inversion de la palette. */
  let clair = false;
  try {
    if (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') {
      const fondCalcule = window.getComputedStyle(field).backgroundColor || '';
      const composantes = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(fondCalcule);
      if (composantes) {
        clair = luminance([
          Number(composantes[1]), Number(composantes[2]), Number(composantes[3]),
        ]) > 0.5;
      }
    }
  } catch {
    clair = false;
  }
  if (clair) field.classList.add('v2e033-clair');
  else field.classList.remove('v2e033-clair');
  field.setAttribute('data-v2e033-theme', clair ? 'clair' : 'sombre');

  /* E033-07 — tableau replié des ratios minimaux par catégorie d'arête. */
  try {
    if (head && !layout.querySelector('#v2e033-tableau')) {
      const panneau = creer(ctx, 'details', 'v2e033-tableau', '');
      panneau.id = 'v2e033-tableau';
      const resume = creer(ctx, 'summary', '', 'Ratios des arêtes');
      const table = creer(ctx, 'table', '', '');
      table.appendChild(creer(ctx, 'caption', '', 'Contraste minimal par catégorie'));
      const entete = creer(ctx, 'thead', '', '');
      const ligneEntete = creer(ctx, 'tr', '', '');
      ['Catégorie', 'Ratio', 'Repère 3 : 1'].forEach((libelle) => {
        const cellule = creer(ctx, 'th', '', libelle);
        cellule.setAttribute('scope', 'col');
        ligneEntete.appendChild(cellule);
      });
      entete.appendChild(ligneEntete);
      const corps = creer(ctx, 'tbody', '', '');
      [['Secondaire', pireOr], ['Chemin', pireChemin], ['Lune', pireLune]].forEach((entree) => {
        const ligne = creer(ctx, 'tr', '', '');
        const intitule = creer(ctx, 'th', '', entree[0]);
        intitule.setAttribute('scope', 'row');
        ligne.appendChild(intitule);
        ligne.appendChild(creer(ctx, 'td', '', entree[1].toFixed(2) + ' : 1'));
        ligne.appendChild(creer(ctx, 'td', '',
          entree[1] >= REPERE_OBJET ? 'atteint' : 'sous le seuil'));
        corps.appendChild(ligne);
      });
      table.appendChild(entete);
      table.appendChild(corps);
      panneau.appendChild(resume);
      panneau.appendChild(table);
      head.appendChild(panneau);
    }
  } catch {
    /* Le tableau est documentaire : son échec ne modifie pas les arêtes. */
  }

  /* E033-08 — radiogroupe à choix unique, jamais une bascule aria-pressed. */
  try {
    if (head && !layout.querySelector('#v2e033-mode')) {
      const groupe = creer(ctx, 'div', 'v2e033-mode', '');
      groupe.id = 'v2e033-mode';
      groupe.setAttribute('role', 'radiogroup');
      groupe.setAttribute('aria-label', 'Contraste des arêtes : choisir un mode');
      [['standard', 'Standard'], ['max', 'Contraste maximal']].forEach((choix) => {
        const bouton = creer(ctx, 'button', 'v2e033-mode-btn', choix[1]);
        bouton.type = 'button';
        bouton.dataset.v2e033Mode = choix[0];
        bouton.setAttribute('role', 'radio');
        bouton.setAttribute('aria-checked', choix[0] === 'standard' ? 'true' : 'false');
        bouton.addEventListener('click', () => {
          try {
            field.setAttribute('data-v2e033-mode', choix[0]);
            Array.from(groupe.querySelectorAll('button')).forEach((autre) => {
              autre.setAttribute('aria-checked',
                autre.dataset.v2e033Mode === choix[0] ? 'true' : 'false');
            });
            if (statut) {
              statut.textContent = choix[0] === 'max'
                ? 'Contraste maximal activé : traits clairs et motifs distincts selon la catégorie.'
                : 'Contraste standard activé : ratios calculés sur le fond le plus défavorable.';
            }
          } catch {
            /* Un mode devenu orpheline ne propage aucune exception. */
          }
        });
        groupe.appendChild(bouton);
      });
      head.appendChild(groupe);
    }
  } catch {
    /* Le choix de mode est facultatif : les ratios calculés restent actifs. */
  }

  /* E033-09 — alerte sur les traits restés sous le repère, annoncée poliment. */
  let sousSeuil = 0;
  edges.forEach((line) => {
    const ratio = line.classList.contains('is-moon') ? pireLune : pireOr;
    if (ratio < REPERE_OBJET) {
      line.setAttribute('data-v2e033-sous-seuil', '1');
      sousSeuil += 1;
    }
  });
  field.setAttribute('data-v2e033-sous-seuil', String(sousSeuil));
  statut = assurerStatut(ctx, layout, 'v2e033-statut');
  if (statut) {
    statut.textContent = 'Arêtes sous le repère de 3 pour 1 : ' + sousSeuil + ' sur ' +
      edges.length + '. Pire cas secondaire ' + pireOr.toFixed(2) + ' pour 1, lune ' +
      pireLune.toFixed(2) + ' pour 1.';
  }

  /* E033-10 — coexistence sans collision, mouvement réduit et activation finale. */
  try {
    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
      if (head) head.classList.add('v2e033-sobre');
    } else if (head) {
      head.classList.remove('v2e033-sobre');
    }
  } catch {
    /* La préférence de mouvement est un complément, jamais une dépendance. */
  }
  field.setAttribute('data-v2e033-total', String(edges.length));
  layout.setAttribute('data-v2e033-ui', '1');
  field.setAttribute('data-v2e033-ready', '1');
});
