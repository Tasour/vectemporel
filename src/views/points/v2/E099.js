import { register } from './registry.js';

/* Lentille POINTS E099 — passe 2 (V2), domaine J : pédagogie & narration.
 * Thème (UNIFIED_AUDIT/POINTS/themes.json, clé E099) : « alternative textuelle
 * complète sans CSS ».
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E099.md — chantiers E099-01 à E099-10.
 * Fichier possédé : ce module uniquement, avec son rapport. Aucun fichier de la
 * passe 1 (src/views/points/E099.js, UNIFIED_AUDIT/POINTS/views/E099.md), aucun
 * fichier partagé (vue points.js, coque, styles.css, registry.js, index.js) et
 * aucune autre lentille V2 ne sont modifiés.
 *
 * Dix chantiers INÉDITS, distincts de ceux de la passe 1 : celle-ci produisait
 * une section unique (table + narration + point courant + filtres + compteurs).
 * La V2 construit une alternative structurée en dix sections autonomes : ordre de
 * lecture, lexique des symboles, ères, domaines, cases, vides, périmètre, point
 * courant, preuve (confiance/sources), accès et repli sans style.
 *
 * Contrat exploité : ctx = { viewId:'pointsv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas say() : aucun région live n'est ajoutée, l'état
 * est rendu en texte visible ordinaire et dans des attributs de données.
 *
 * Invariants :
 * - un seul register('E099', ctx => { … }), un seul ctx.css('points-v2-e099', …) ;
 * - toutes les règles CSS commencent littéralement par `.points-v2-e099` ;
 * - tous les ids DOM sont préfixés `points-v2-e099-` et uniques, avec gardes ;
 * - zéro sortie de débogage, zéro appel réseau ou import distant, zéro aléa,
 *   zéro écriture HTML directe (tout passe par ctx.el), zéro minuteur, zéro
 *   boucle d'animation, zéro écouteur de touche et zéro vol de focus ;
 * - toute l'information est portée par des nœuds texte : le CSS est purement
 *   présentationnel, sans pseudo-élément textuel, donc le repli sans style est total.
 */

const CSS_ID = 'points-v2-e099';
const PREFIXE = 'points-v2-e099-';

const PANNEAU_ID = PREFIXE + 'panel';
const TITRE_ID = PREFIXE + 'title';
const SOMMAIRE_ID = PREFIXE + 'sommaire';
const METRIQUE_ID = PREFIXE + 'metrique';

/* Les dix sections, une par chantier : chacune a son nœud, son attribut de
   données et son texte, sans recouvrir le chantier voisin. */
const SECTIONS = [
  ['ordre', 'E099-01', 'Ordre de lecture de la matrice'],
  ['lexique', 'E099-02', 'Lexique des symboles de la grille'],
  ['eres', 'E099-03', 'Les ères : nom, rang et état'],
  ['domaines', 'E099-04', 'Les domaines : inventaire et couverture'],
  ['cases', 'E099-05', 'Chaque case verbalisée et vérifiée'],
  ['vides', 'E099-06', 'Cases vides et absences explicitées'],
  ['perimetre', 'E099-07', 'Périmètre, filtres et effectif'],
  ['courant', 'E099-08', 'Point courant transcrit depuis le détail'],
  ['preuve', 'E099-09', 'Confiance et sources, sans couleur'],
  ['acces', 'E099-10', 'Accès, sommaire et repli sans style'],
];

/* E099-01, E099-02, E099-10 : une seule feuille injectée une fois. Chaque
   sélecteur commence par `.points-v2-e099`, y compris dans les @media : aucune
   règle ne peut fuir hors de la vue. Aucune règle ne masque ni ne porte de
   donnée : couleurs, traits et espacements restent purement décoratifs. */
const CSS = `
  /* E099-01 / E099-10 : bloc en flux normal, jamais modal ni superposé. */
  .points-v2-e099.points-v2-e099-panel {
    margin: 18px 0 0; padding: 12px 14px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  .points-v2-e099 .points-v2-e099-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 16px; font-weight: 600;
  }
  .points-v2-e099 .points-v2-e099-lede { margin: 0 0 10px; color: var(--muted); }
  .points-v2-e099 .points-v2-e099-section { margin: 0 0 14px; }
  .points-v2-e099 .points-v2-e099-h {
    margin: 0 0 5px; color: var(--ink);
    font-family: var(--serif); font-size: 13px; font-weight: 600;
  }
  .points-v2-e099 .points-v2-e099-intro { margin: 0 0 6px; color: var(--muted); }
  .points-v2-e099 .points-v2-e099-liste { margin: 0 0 6px; padding-left: 20px; }
  .points-v2-e099 .points-v2-e099-liste li { margin: 0 0 4px; }
  .points-v2-e099 .points-v2-e099-rang { color: var(--gold-bright); font-weight: 600; }
  .points-v2-e099 .points-v2-e099-meta { color: var(--muted); }
  .points-v2-e099 .points-v2-e099-sommaire {
    margin: 0 0 12px; padding: 7px 9px;
    border: 1px solid var(--line); border-radius: 8px;
  }
  .points-v2-e099 .points-v2-e099-sommaire ul { margin: 0; padding-left: 18px; }
  .points-v2-e099 .points-v2-e099-sommaire a {
    display: inline-block; min-height: 24px; padding: 2px 4px;
    color: var(--gold-bright); text-decoration: underline;
  }
  .points-v2-e099 .points-v2-e099-sommaire a:hover { color: var(--ink); }
  .points-v2-e099 .points-v2-e099-plain { margin: 6px 0 0; color: var(--muted-2); }
  .points-v2-e099 .points-v2-e099-metric { margin: 6px 0 0; color: var(--muted-2); font-size: 9px; }
  .points-v2-e099 :focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  /* E099-10 : points de rupture — la mesure de lecture est préservée. */
  @media (max-width: 620px) {
    .points-v2-e099.points-v2-e099-panel { padding: 10px; }
    .points-v2-e099 .points-v2-e099-liste { padding-left: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e099, .points-v2-e099 * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    .points-v2-e099.points-v2-e099-panel { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    .points-v2-e099 .points-v2-e099-title,
    .points-v2-e099 .points-v2-e099-rang,
    .points-v2-e099 .points-v2-e099-sommaire a { color: CanvasText; }
  }
  @media print {
    .points-v2-e099.points-v2-e099-panel { border: 1px solid #333; background: #fff; color: #000; }
    .points-v2-e099 .points-v2-e099-section { break-inside: avoid; }
  }
`;

let installations = 0;

/* E099-10 : garde d'existence pour toute id préfixée. La coque reconstruisant
   le stage, un nœud du rendu précédent est détaché et n'est pas retrouvé par
   getElementById : on le recrée, sinon on le réutilise et on le déplace. */
function ensureNode(make, id, tagName, className, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = make(tagName, className);
    noeud.id = id;
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

/* Une seule fonction d'écriture : deux rafraîchissements sans changement ne
   touchent à aucun textContent. */
function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

function racines(ctx) {
  return [ctx.layout, ctx.stage].filter((r) => r && typeof r.querySelectorAll === 'function');
}

/* E099-01 à E099-09 : lecture du DOM vivant, jamais de compte ni de libellé
   codé en dur. Un Set évite de compter deux fois un nœud présent dans layout
   et stage. */
function collecter(ctx, selecteur) {
  const vus = new Set();
  racines(ctx).forEach((racine) => {
    Array.prototype.slice.call(racine.querySelectorAll(selecteur)).forEach((noeud) => vus.add(noeud));
  });
  return Array.from(vus);
}

function tronquer(texte, max) {
  if (!texte) return '';
  return texte.length > max ? texte.slice(0, max - 1).trimEnd() + '…' : texte;
}

function texteDe(noeud, max) {
  if (!noeud) return '';
  return tronquer((noeud.textContent || '').replace(/\s+/g, ' ').trim(), max);
}

function premierTexte(noeud, selecteurs, max) {
  if (!noeud) return '';
  for (let i = 0; i < selecteurs.length; i += 1) {
    const trouve = noeud.querySelector(selecteurs[i]);
    if (trouve) return texteDe(trouve, max);
  }
  return '';
}

function pluriel(n, singulier, plurielMot) {
  return n > 1 ? plurielMot : singulier;
}

function domaineDe(cellule, index, domaines) {
  if (domaines[index]) return domaines[index];
  const parties = (cellule.getAttribute('title') || '').split('·').map((partie) => partie.trim());
  return parties[1] || `domaine ${index + 1}`;
}

/* Lecture intégrale de la matrice : ères, domaines, cases, état actif. Toute
   valeur affichée plus loin dérive de ces tableaux. */
function lireMatrice(ctx) {
  const grille = collecter(ctx, '.points-grid')[0] || null;
  const titre = premierTexte(collecter(ctx, '.points-matrix')[0] || null, ['.points-title'], 90);
  const entete = grille ? grille.querySelector('.points-grid-row.is-head') : null;
  const spans = entete
    ? Array.prototype.slice.call(entete.children).filter((enfant) => enfant.tagName === 'SPAN')
    : [];
  const domaines = spans.slice(1).map((span) => texteDe(span, 40)).filter(Boolean);
  const lignes = grille
    ? Array.prototype.slice.call(grille.querySelectorAll('.points-grid-row:not(.is-head)'))
    : [];
  const eres = lignes.map((ligne, index) => {
    const cellules = Array.prototype.slice.call(ligne.querySelectorAll('.points-cell'));
    return {
      rang: index + 1,
      nom: texteDe(ligne.querySelector('.points-era'), 48) || 'Ère sans nom',
      actif: ligne.classList.contains('is-active'),
      entrees: cellules.map((cellule, j) => {
        const pleine = cellule.classList.contains('has-points');
        const affiche = texteDe(cellule, 12);
        const titreCase = (cellule.getAttribute('title') || '').trim();
        const compte = pleine ? (/^\d+$/.test(affiche) ? Number(affiche) : 1) : 0;
        const annonce = /\b(\d+)\s*point/i.exec(titreCase);
        return {
          domaine: domaineDe(cellule, j, domaines),
          affiche, pleine, compte, titreCase,
          annonce: annonce ? Number(annonce[1]) : null,
        };
      }),
    };
  });
  return { titre, domaines, eres };
}

/* E099-07 / E099-08 / E099-09 : lecture du détail et des contrôles réels. */
function lireDetail(ctx) {
  const detail = collecter(ctx, '.points-detail')[0] || null;
  const titrePoint = premierTexte(detail, ['.points-point-title'], 80);
  const meta = detail ? Array.prototype.slice.call(detail.querySelectorAll('.points-meta span')) : [];
  const metadonnees = meta.map((span) => texteDe(span, 40)).filter(Boolean);
  const confiance = detail
    ? texteDe(detail.querySelector('.points-meta .confidence'), 28)
    : '';
  const familles = [];
  if (detail) {
    Array.prototype.slice.call(detail.querySelectorAll('.points-families span'))
      .forEach((span) => familles.push(texteDe(span, 32)));
    Array.prototype.slice.call(detail.children).forEach((enfant) => {
      if (enfant.tagName === 'SPAN') familles.push(texteDe(enfant, 32));
    });
  }
  const uniques = familles.filter(Boolean)
    .filter((valeur, index, toutes) => toutes.indexOf(valeur) === index);
  const sources = premierTexte(detail, ['.points-sources'], 260);
  const justification = premierTexte(detail, ['.points-justification'], 260);
  const kicker = premierTexte(detail, ['.view-kicker'], 90);
  const vide = !titrePoint && Boolean(detail)
    && /\bAucun point validé\b/i.test(detail.textContent || '');
  return {
    titrePoint, textePoint: premierTexte(detail, ['.points-point-text'], 420),
    metadonnees, confiance, familles: uniques, sources, justification,
    kicker, vide, present: Boolean(detail),
  };
}

function lireFiltres(ctx) {
  const selects = collecter(ctx, '.points-filters select');
  const filtres = selects.map((select) => {
    const option = select.selectedOptions ? select.selectedOptions[0] : null;
    return {
      nom: (select.getAttribute('aria-label') || '').trim(),
      valeur: texteDe(option, 40) || texteDe(select, 40),
    };
  }).filter((entree) => entree.valeur);
  const reinitialise = collecter(ctx, '.points-filters button')
    .some((bouton) => /réinitialiser/i.test(texteDe(bouton, 60)));
  return { filtres, reinitialise };
}

function install(ctx) {
  const faire = ctx.el;
  if (typeof faire !== 'function') return;
  installations += 1;
  ctx.css(CSS_ID, CSS);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const hotte = ctx.layout || ctx.stage || document.body;
  const panneau = ensureNode(faire, PANNEAU_ID, 'section', 'points-v2-e099 points-v2-e099-panel', hotte);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITRE_ID);
  panneau.dataset.pointsV2E099Renders = String(installations);
  panneau.dataset.pointsV2E099Chantiers = '10';
  panneau.dataset.pointsV2E099View = ctx.viewId || 'pointsv2';
  panneau.dataset.pointsV2E099Plain = '1';

  const matrice = lireMatrice(ctx);
  const detail = lireDetail(ctx);
  const etat = lireFiltres(ctx);
  const sections = [];
  const nombreEres = matrice.eres.length;
  const nombreDomaines = matrice.domaines.length;
  let nombreCases = 0;
  let nombrePleines = 0;
  let totalPoints = 0;
  matrice.eres.forEach((ere) => ere.entrees.forEach((entree) => {
    nombreCases += 1;
    if (entree.pleine) nombrePleines += 1;
    totalPoints += entree.compte;
  }));
  const nombreVides = nombreCases - nombrePleines;

  function ouvrirSection(cle, chantier, intitule, introduction) {
    const noeud = ensureNode(faire, PREFIXE + cle, 'section', 'points-v2-e099-section', panneau);
    noeud.replaceChildren();
    const titreId = PREFIXE + 'titre-' + cle;
    const titre = ensureNode(faire, titreId, 'h3', 'points-v2-e099-h', noeud);
    ecrire(titre, intitule);
    noeud.setAttribute('aria-labelledby', titreId);
    noeud.dataset.pointsV2E099Chantier = chantier;
    if (introduction) noeud.appendChild(faire('p', 'points-v2-e099-intro', introduction));
    sections.push(noeud);
    return noeud;
  }

  /* E099-01 : colonne vertébrale — l'ordre de lecture est porté par des <ol>
     imbriquées. Sans style, ères et domaines restent numérotés et emboîtés. */
  const sOrdre = ouvrirSection('ordre', 'E099-01', SECTIONS[0][2],
    'La matrice devient une suite ordonnée : chaque ère, puis chaque domaine, dans l’ordre du document. Sans style, cet ordre reste identique — c’est la charpente de l’alternative.');
  const arbre = faire('ol', 'points-v2-e099-liste');
  arbre.dataset.pointsV2E099Eres = String(nombreEres);
  arbre.dataset.pointsV2E099Domaines = String(nombreDomaines);
  matrice.eres.forEach((ere) => {
    const item = faire('li', 'points-v2-e099-noeud-ere');
    item.dataset.pointsV2E099Ere = '1';
    item.dataset.pointsV2E099Rang = String(ere.rang);
    item.append(
      faire('span', 'points-v2-e099-rang', `Ère ${ere.rang}. `),
      faire('strong', '', ere.nom)
    );
    if (ere.entrees.length) {
      const sousListe = faire('ol', 'points-v2-e099-liste');
      ere.entrees.forEach((entree, index) => {
        const sousItem = faire('li', 'points-v2-e099-noeud-domaine');
        sousItem.dataset.pointsV2E099Domaine = '1';
        sousItem.dataset.pointsV2E099Rang = String(index + 1);
        sousItem.append(
          faire('span', 'points-v2-e099-rang', `${index + 1}. `),
          faire('span', '', `${entree.domaine} : ${entree.pleine ? entree.compte + ' point' + pluriel(entree.compte, '', 's') : 'aucun point'}.`)
        );
        sousListe.appendChild(sousItem);
      });
      item.appendChild(sousListe);
    } else {
      item.appendChild(faire('p', 'points-v2-e099-meta', 'Aucune colonne de domaine renseignée pour cette ère dans le DOM.'));
    }
    arbre.appendChild(item);
  });
  if (!nombreEres) {
    arbre.appendChild(faire('li', 'points-v2-e099-meta', 'Aucune ère détectée : la matrice est peut-être encore vide ou filtrée.'));
  }
  sOrdre.appendChild(arbre);

  /* E099-02 : le lexique des symboles, jamais une couleur. Chaque terme est
     défini par un mot et par son sens relevé dans la vue. */
  const sLexique = ouvrirSection('lexique', 'E099-02', SECTIONS[1][2],
    'Une case de la grille est un symbole : voici le vocabulaire qui permet de la lire, défini en texte et indépendant de la feuille de style.');
  const lexique = faire('dl', 'points-v2-e099-lexique');
  lexique.dataset.pointsV2E099Symboles = '4';
  const termes = [
    ['·', 'Symbole d’une case vide : aucun point validé pour cette ère et ce domaine.'],
    ['N (chiffre)', 'Le chiffre affiché indique le nombre de points validés à cette intersection.'],
    ['has-points', 'Classe posée par la vue sur une case dès que le compte est supérieur à zéro.'],
    ['is-active', 'Classe posée sur la ligne de l’ère actuellement sélectionnée.'],
  ];
  termes.forEach(([terme, definition]) => {
    lexique.appendChild(faire('dt', 'points-v2-e099-rang', terme));
    lexique.appendChild(faire('dd', 'points-v2-e099-meta', definition));
  });
  sLexique.appendChild(lexique);
  sLexique.appendChild(faire('p', 'points-v2-e099-plain',
    'L’attribut title de chaque case répète « ère · domaine · N point(s) » : il est repris et vérifié plus bas, dans la section des cases.'));

  /* E099-03 : ères — nom, rang et état actif, l'état n'étant jamais porté par
     la seule couleur de fond. */
  const sEres = ouvrirSection('eres', 'E099-03', SECTIONS[2][2],
    'Le nom d’une ère est porté par un bouton ; son état actif par une classe. Les deux sont écrits ici, avec leur rang.');
  const listeEres = faire('ul', 'points-v2-e099-liste');
  let actives = 0;
  matrice.eres.forEach((ere) => {
    if (ere.actif) actives += 1;
    const item = faire('li', 'points-v2-e099-ere');
    item.dataset.pointsV2E099EreMeta = '1';
    item.dataset.pointsV2E099Rang = String(ere.rang);
    item.dataset.pointsV2E099Actif = ere.actif ? '1' : '0';
    item.append(
      faire('strong', '', `Ère ${ere.rang} — ${ere.nom}. `),
      faire('span', 'points-v2-e099-meta',
        ere.actif
          ? 'Ère actuellement sélectionnée (ligne marquée is-active dans la grille).'
          : 'Ère non sélectionnée dans le rendu courant.')
    );
    listeEres.appendChild(item);
  });
  if (!nombreEres) listeEres.appendChild(faire('li', 'points-v2-e099-meta', 'Aucune ère à transcrire dans le rendu courant.'));
  listeEres.dataset.pointsV2E099Actives = String(actives);
  sEres.appendChild(listeEres);

  /* E099-04 : domaines — inventaire, couverture et total, relevés sur l'en-tête
     et sur les cases. */
  const sDomaines = ouvrirSection('domaines', 'E099-04', SECTIONS[3][2],
    'Les colonnes de la matrice sont des domaines : voici leur inventaire et la couverture que la grille leur donne.');
  const listeDomaines = faire('ul', 'points-v2-e099-liste');
  listeDomaines.dataset.pointsV2E099Domaines = String(nombreDomaines);
  matrice.domaines.forEach((domaine, index) => {
    let pleines = 0;
    let points = 0;
    matrice.eres.forEach((ere) => {
      const entree = ere.entrees[index];
      if (entree && entree.pleine) {
        pleines += 1;
        points += entree.compte;
      }
    });
    const item = faire('li', 'points-v2-e099-domaine');
    item.dataset.pointsV2E099DomaineMeta = '1';
    item.dataset.pointsV2E099Rang = String(index + 1);
    item.dataset.pointsV2E099Remplies = String(pleines);
    item.dataset.pointsV2E099Points = String(points);
    item.append(
      faire('strong', 'points-v2-e099-rang', `${index + 1}. ${domaine}. `),
      faire('span', 'points-v2-e099-meta',
        `${pleines} ère${pluriel(pleines, '', 's')} couverte${pluriel(pleines, '', 's')} sur ${nombreEres} · ${points} point${pluriel(points, '', 's')} au total.`)
    );
    listeDomaines.appendChild(item);
  });
  if (!nombreDomaines) listeDomaines.appendChild(faire('li', 'points-v2-e099-meta', 'Aucun domaine annoté dans l’en-tête de la grille.'));
  sDomaines.appendChild(listeDomaines);

  /* E099-05 : transcription intégrale et vérifiable de chaque case. Le chiffre
     affiché et le chiffre annoncé par title sont comparés ; un écart est signalé
     au lieu d'être corrigé ou inventé. */
  const sCases = ouvrirSection('cases', 'E099-05', SECTIONS[4][2],
    'Chaque intersection ère × domaine devient une ligne de texte. Quand le chiffre affiché diffère de celui de l’attribut title, l’écart est signalé : l’alternative ne choisit pas silencieusement une valeur.');
  const listeCases = faire('ul', 'points-v2-e099-liste');
  listeCases.dataset.pointsV2E099Cases = String(nombreCases);
  let ecarts = 0;
  matrice.eres.forEach((ere) => ere.entrees.forEach((entree) => {
    const item = faire('li', 'points-v2-e099-case');
    item.dataset.pointsV2E099Case = '1';
    item.dataset.pointsV2E099Valeur = entree.pleine ? String(entree.compte) : '0';
    item.dataset.pointsV2E099Ere = ere.nom;
    item.dataset.pointsV2E099Domaine = entree.domaine;
    const contradiction = entree.pleine && entree.annonce !== null && entree.annonce !== entree.compte;
    if (contradiction) ecarts += 1;
    item.append(
      faire('strong', '', `${ere.nom} · ${entree.domaine} : `),
      faire('span', 'points-v2-e099-meta',
        entree.pleine
          ? `${entree.compte} point${pluriel(entree.compte, '', 's')} validé${pluriel(entree.compte, '', 's')}.`
          : `${entree.affiche || '·'} — aucun point validé.`)
    );
    if (contradiction) {
      item.appendChild(faire('span', 'points-v2-e099-meta',
        ` Écart relevé : la case affiche ${entree.compte} alors que son title annonce ${entree.annonce} point${pluriel(entree.annonce, '', 's')} ; les deux lectures sont conservées.`));
    }
    listeCases.appendChild(item);
  }));
  listeCases.dataset.pointsV2E099Ecarts = String(ecarts);
  if (!nombreCases) listeCases.appendChild(faire('li', 'points-v2-e099-meta', 'Aucune case à transcrire dans le rendu courant.'));
  sCases.appendChild(listeCases);

  /* E099-06 : les vides deviennent une phrase chiffrée, distincte du symbole
     isolé du lexique. */
  const sVides = ouvrirSection('vides', 'E099-06', SECTIONS[5][2],
    'Un vide est une donnée : les cases sans point sont énumérées, avec leur ère et leur domaine, pour ne pas disparaître dans une lecture linéaire.');
  const listeVides = faire('ul', 'points-v2-e099-liste');
  listeVides.dataset.pointsV2E099Vides = String(nombreVides);
  matrice.eres.forEach((ere) => ere.entrees.forEach((entree) => {
    if (entree.pleine) return;
    const item = faire('li', 'points-v2-e099-vide');
    item.dataset.pointsV2E099Vide = '1';
    item.appendChild(faire('span', '', `${ere.nom} × ${entree.domaine} : `));
    item.appendChild(faire('span', 'points-v2-e099-meta', 'aucun point validé dans cette case.'));
    listeVides.appendChild(item);
  }));
  if (!nombreVides) listeVides.appendChild(faire('li', 'points-v2-e099-meta', 'Aucune case vide : toutes les intersections portent au moins un point.'));
  sVides.appendChild(listeVides);

  /* E099-07 : périmètre — filtres réels et effectif du détail, sans région live
     ajoutée et sans écriture des contrôles. */
  const sPerimetre = ouvrirSection('perimetre', 'E099-07', SECTIONS[6][2],
    'La matrice est filtrée : l’alternative enregistre les contrôles actifs et l’effectif annoncé pour que le lecteur sache ce qu’il lit.');
  const phrasePerimetre = faire('p', 'points-v2-e099-perimetre');
  phrasePerimetre.dataset.pointsV2E099Filtres = etat.filtres.map((entree) => entree.nom + '=' + entree.valeur).join('|');
  phrasePerimetre.dataset.pointsV2E099Reinitialise = etat.reinitialise ? '1' : '0';
  phrasePerimetre.dataset.pointsV2E099Effectif = detail.kicker || 'inconnu';
  ecrire(phrasePerimetre,
    `Périmètre du rendu : ${matrice.titre || 'matrice de couverture'} · ${nombreEres} ère${pluriel(nombreEres, '', 's')}, `
    + `${nombreDomaines} domaine${pluriel(nombreDomaines, '', 's')}, ${totalPoints} point${pluriel(totalPoints, '', 's')} affichés. `
    + `Filtres : ${etat.filtres.length ? etat.filtres.map((entree) => `« ${entree.nom || 'filtre'} : ${entree.valeur} »`).join(', ') : 'aucun contrôle renseigné'}. `
    + (etat.reinitialise
      ? 'Le bouton « Réinitialiser les filtres » rétablit l’affichage complet.'
      : 'Aucun bouton de réinitialisation détecté.')
    + (detail.kicker ? ` Le détail annonce : ${detail.kicker}.` : ''));
  sPerimetre.appendChild(phrasePerimetre);

  /* E099-08 : le point courant est transcrit depuis le détail, y compris les
     familles qui, dans la vue, sont des <span> enfants directs du détail. */
  const sCourant = ouvrirSection('courant', 'E099-08', SECTIONS[7][2],
    'La lecture de la matrice se prolonge dans le point sélectionné : ses champs sont repris mot pour mot du détail, sans copie approximative.');
  const courant = faire('p', 'points-v2-e099-courant');
  if (detail.titrePoint) {
    const parties = [`Point courant : ${detail.titrePoint}.`];
    if (detail.textePoint) parties.push(detail.textePoint);
    if (detail.metadonnees.length) parties.push(`Domaine, échelle, temps et confiance : ${detail.metadonnees.join(' · ')}.`);
    if (detail.familles.length) {
      parties.push(`Famille${pluriel(detail.familles.length, '', 's')} : ${detail.familles.join(', ')}.`);
    }
    if (detail.sources) parties.push(detail.sources);
    if (detail.justification) parties.push(`Justification : ${detail.justification}`);
    ecrire(courant, parties.join(' '));
  } else if (detail.vide) {
    ecrire(courant, 'Aucun point validé dans ce périmètre. Les agents par ère travaillent encore à la couverture.');
  } else {
    ecrire(courant, detail.present
      ? 'Aucun titre de point détecté dans le détail du rendu courant.'
      : 'Aucun détail de point n’est disponible dans le rendu courant.');
  }
  courant.dataset.pointsV2E099Titre = detail.titrePoint || 'aucun';
  courant.dataset.pointsV2E099Familles = String(detail.familles.length);
  sCourant.appendChild(courant);

  /* E099-09 : confiance et sources — la preuve est un texte, pas une teinte. */
  const sPreuve = ouvrirSection('preuve', 'E099-09', SECTIONS[8][2],
    'La fiabilité d’un point est une donnée, pas une couleur de badge : confiance et provenance sont écrites ici, avec les familles qui les situent.');
  const preuve = faire('p', 'points-v2-e099-preuve');
  preuve.dataset.pointsV2E099Confiance = detail.confiance || 'inconnue';
  preuve.dataset.pointsV2E099Sources = detail.sources || '';
  ecrire(preuve,
    `Confiance : ${detail.confiance || 'non annotée'} · `
    + `${detail.sources || 'aucune source renseignée'} · `
    + `Familles : ${detail.familles.length ? detail.familles.join(', ') : 'non annotées'}. `
    + 'Ces éléments restent lisibles en noir et blanc : aucune information n’est confiée à la seule couleur.');
  sPreuve.appendChild(preuve);
  sPreuve.appendChild(faire('p', 'points-v2-e099-plain',
    'Règle de lecture : une source absente sans justification n’est pas une preuve ; la confiance est transcrite telle quelle et jamais surclassée par une mise en forme.'));

  /* E099-10 : accès — sommaire interne, repli sans style et métrique d'unicité. */
  const sommaire = ensureNode(faire, SOMMAIRE_ID, 'nav', 'points-v2-e099-sommaire', panneau);
  sommaire.replaceChildren();
  sommaire.setAttribute('aria-label', 'Sommaire de l’alternative textuelle de la matrice');
  const listeSommaire = faire('ul', 'points-v2-e099-liste');
  SECTIONS.forEach(([cle, chantier, intitule]) => {
    const item = faire('li', 'points-v2-e099-lien');
    const lien = faire('a', '', intitule);
    lien.setAttribute('href', `#${PREFIXE}${cle}`);
    lien.setAttribute('aria-label', `${chantier} — ${intitule}`);
    item.appendChild(lien);
    listeSommaire.appendChild(item);
  });
  sommaire.appendChild(listeSommaire);

  const sAcces = ouvrirSection('acces', 'E099-10', SECTIONS[9][2],
    'Cette dernière section garantit l’accès à l’ensemble : navigation interne, consigne de repli et inventaire des données portées par le texte.');
  sAcces.appendChild(faire('p', 'points-v2-e099-plain',
    'Repli sans CSS : ordre de lecture, lexique, ères, domaines, cases, vides, filtres, point courant, confiance et sources sont tous écrits dans les paragraphes et listes ci-dessus. '
    + 'Aucune information n’est confiée à une couleur, un pseudo-élément, une animation ou une position : désactiver les styles ne retire aucun fait.'));
  const metrique = ensureNode(faire, METRIQUE_ID, 'p', 'points-v2-e099-metric', sAcces);
  metrique.dataset.pointsV2E099Installs = String(installations);
  metrique.dataset.pointsV2E099Reduced = reduced ? '1' : '0';
  metrique.dataset.pointsV2E099Plain = '1';
  metrique.dataset.pointsV2E099Feuille = CSS_ID;
  metrique.dataset.pointsV2E099Cases = String(nombreCases);
  metrique.dataset.pointsV2E099Pleines = String(nombrePleines);
  metrique.dataset.pointsV2E099Vides = String(nombreVides);
  ecrire(metrique,
    `Installations : ${installations} · ères transcrites : ${nombreEres} · domaines : ${nombreDomaines} · `
    + `cases : ${nombreCases} (${nombrePleines} remplies, ${nombreVides} vides) · `
    + `mouvement réduit : ${reduced ? 'oui' : 'non'} · feuille CSS unique : ${CSS_ID}.`);

  const titre = ensureNode(faire, TITRE_ID, 'h2', 'points-v2-e099-title', panneau);
  ecrire(titre, 'Alternative textuelle complète de la matrice');
  const lede = faire('p', 'points-v2-e099-lede',
    'Tout ce que la grille montre par la forme est écrit ici en texte ordonné. Cette alternative reste lisible et complète même si aucune feuille de style n’est appliquée.');
  panneau.replaceChildren(titre, lede, sommaire, ...sections);
}

register('E099', ctx => {
  try {
    if (!ctx || ctx.viewId !== 'pointsv2') return;
    install(ctx);
  } catch {
    return;
  }
});
