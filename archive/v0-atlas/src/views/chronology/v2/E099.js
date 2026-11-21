import { register } from './registry.js';

/* Lentille E099 — passe V2, domaine J (Pédagogie & narration).
 * Thème (themes.json, clé E099) : alternative textuelle complète sans CSS.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E099.md — chantiers E099-01 à E099-10.
 * Fichier possédé : src/views/chronology/v2/E099.js uniquement, avec son rapport.
 * Aucun fichier partagé n'est modifié : ni la passe 1, ni registry.js, index.js,
 * styles.css, src/views/chronology.js, ni une autre lentille V2.
 *
 * Contrat exploité : ctx = { viewId:'chronologyv2', stage, layout } ; helpers
 * ctx.css(id, règles), ctx.el(balise, classe, texte), ctx.reducedMotion().
 * Le registre V2 n'expose pas say() : la lentille n'ajoute aucune région live,
 * elle rend son état en texte visible ordinaire et dans des attributs de données.
 *
 * Invariants :
 * - un seul register('E099', ctx => { … }), un seul ctx.css('chronology-v2-e099', …) ;
 * - IDs tous préfixés chronology-v2-e099-, uniques, avec gardes d'existence ;
 * - zéro console.*, fetch/XHR, import distant, Math.random, innerHTML, timer, rAF,
 *   écouteur de touche, vol de focus ;
 * - toute l'information est portée par des nœuds texte : le CSS est purement
 *   présentationnel et ne porte aucune donnée (aucun pseudo-élément textuel).
 */

const CSS_ID = 'chronology-v2-e099';
const PREFIXE = 'chronology-v2-e099-';

const PANNEAU_ID = PREFIXE + 'panel';
const TITRE_ID = PREFIXE + 'title';
const SOMMAIRE_ID = PREFIXE + 'sommaire';
const METRIQUE_ID = PREFIXE + 'metrique';

/* Les dix sections, une par chantier : chacune a un nœud, un attribut de données
   et un texte qui lui appartiennent, sans recouvrir le chantier voisin. */
const SECTIONS = [
  ['ordre', 'E099-01', 'Lecture linéaire de la frise'],
  ['echelle', 'E099-02', 'Échelle de l’axe en texte'],
  ['eres', 'E099-03', 'Les ères : nom, bornes, durée'],
  ['reperes', 'E099-04', 'Les repères : titre et ancre'],
  ['preuves', 'E099-05', 'Confiance et source de chaque repère'],
  ['silences', 'E099-06', 'Silences et écarts transcrits'],
  ['legendes', 'E099-07', 'Légende textuelle des familles'],
  ['statuts', 'E099-08', 'Disputé et omission explicites'],
  ['perimetre', 'E099-09', 'Périmètre et état du filtre'],
  ['acces', 'E099-10', 'Accès, sommaire et repli sans style'],
];

/* E099-01, E099-02, E099-08, E099-10 : une seule feuille, injectée une fois.
   Le panneau est un bloc en flux normal, jamais une modale et jamais superposé :
   il n'ajoute aucun arrêt Tab parasite et ne masque ni la frise ni la fiche.
   Aucune règle ne porte d'information : couleurs, traits et espacements sont
   décoratifs ; le repli sans CSS est donc total, pas seulement partiel. */
const CSS = `
  #${PANNEAU_ID} {
    margin: 18px 0 0; padding: 12px 14px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${TITRE_ID} {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 16px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANNEAU_ID} .e099-lede { margin: 0 0 10px; color: var(--muted); }
  #${PANNEAU_ID} .e099-section { margin: 0 0 14px; }
  #${PANNEAU_ID} .e099-h {
    margin: 0 0 5px; color: var(--ink);
    font-family: var(--serif); font-size: 13px; font-weight: 600;
  }
  #${PANNEAU_ID} .e099-intro { margin: 0 0 6px; color: var(--muted); }
  #${PANNEAU_ID} .e099-liste { margin: 0 0 6px; padding-left: 20px; }
  #${PANNEAU_ID} .e099-liste li { margin: 0 0 4px; }
  #${PANNEAU_ID} .e099-rang { color: var(--gold-bright); font-weight: 600; }
  #${PANNEAU_ID} .e099-ancre,
  #${PANNEAU_ID} .e099-meta { color: var(--muted); }
  #${PANNEAU_ID} .e099-regle {
    height: 8px; margin: 0 0 6px;
    border: 1px solid var(--line-strong); border-radius: 4px;
    background: linear-gradient(90deg, var(--line-strong), var(--gold));
  }
  #${PANNEAU_ID} .e099-sommaire { margin: 0 0 12px; padding: 7px 9px; border: 1px solid var(--line); border-radius: 8px; }
  #${PANNEAU_ID} .e099-sommaire ul { margin: 0; padding-left: 18px; }
  #${PANNEAU_ID} .e099-sommaire a {
    display: inline-block; min-height: 24px; padding: 2px 4px;
    color: var(--gold-bright); text-decoration: underline;
  }
  #${PANNEAU_ID} .e099-sommaire a:hover { color: var(--ink); }
  #${PANNEAU_ID} .e099-plain { margin: 6px 0 0; color: var(--muted-2); }
  #${PANNEAU_ID} .e099-metric { margin: 6px 0 0; color: var(--muted-2); font-size: 9px; }
  #${PANNEAU_ID} :focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  @media (max-width: 620px) {
    #${PANNEAU_ID} { padding: 10px; }
    #${PANNEAU_ID} .e099-liste { padding-left: 16px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANNEAU_ID}, #${PANNEAU_ID} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${PANNEAU_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${TITRE_ID}, #${PANNEAU_ID} .e099-rang,
    #${PANNEAU_ID} .e099-sommaire a { color: CanvasText; }
    #${PANNEAU_ID} .e099-regle { border: 1px solid CanvasText; background: Canvas; }
  }
  @media print {
    #${PANNEAU_ID} { border: 1px solid #333; background: #fff; color: #000; }
    #${PANNEAU_ID} .e099-section { break-inside: avoid; }
    #${PANNEAU_ID} .e099-regle { display: none; }
  }
`;

let installations = 0;

/* E099-10 : garde d'existence pour toute ID préfixée. La coque reconstruisant
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

/* E099-01 à E099-09 : lecture du DOM vivant, jamais de date ni de compte codé
   en dur. Un Set évite de compter deux fois un nœud présent dans layout et stage. */
function collecter(ctx, selecteur) {
  const vus = new Set();
  racines(ctx).forEach((racine) => {
    racine.querySelectorAll(selecteur).forEach((noeud) => vus.add(noeud));
  });
  return Array.from(vus);
}

function lireAttribut(noeud, noms) {
  if (!noeud) return '';
  for (const nom of noms) {
    const valeur = noeud.getAttribute(nom);
    if (valeur && valeur.trim()) return valeur.trim();
  }
  return '';
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
  for (const selecteur of selecteurs) {
    const trouve = noeud.querySelector(selecteur);
    if (trouve) return texteDe(trouve, max);
  }
  return '';
}

function estVrai(valeur) {
  return valeur === '1' || valeur === 'true' || valeur === 'oui' || valeur === 'vrai';
}

function anneeDe(chaine) {
  const correspondance = /(-?\d{1,6})\s*(?:av\.?\s*J\.?-?C\.?|avant|BCE|BC)?/i.exec(chaine || '');
  if (!correspondance) return null;
  const valeur = Number(correspondance[1]);
  return Number.isFinite(valeur) ? valeur : null;
}

function lireEre(ere) {
  const nom = lireAttribut(ere, ['data-era-name', 'data-name', 'data-title'])
    || premierTexte(ere, ['h3', 'h4', '.era-title', '.era-label'], 48)
    || texteDe(ere, 48)
    || 'Ère sans nom';
  const debut = lireAttribut(ere, ['data-era-start', 'data-start', 'data-begin', 'data-from']);
  const fin = lireAttribut(ere, ['data-era-end', 'data-end', 'data-to']);
  const amplitude = lireAttribut(ere, ['data-era-amplitude', 'data-amplitude', 'data-duration', 'data-span']);
  const points = ere.querySelectorAll('.event-card, [data-event-id], [data-point-id]').length;
  return { nom, debut, fin, amplitude, points };
}

function lirePoint(point) {
  const titre = lireAttribut(point, ['data-title', 'data-point-title', 'data-event-title'])
    || premierTexte(point, ['.event-title', '.point-title', '.title', 'h3', 'h4'], 58)
    || texteDe(point, 58)
    || 'Repère sans titre';
  const ancre = lireAttribut(point, ['data-chrono-date', 'data-date', 'data-event-date', 'datetime'])
    || premierTexte(point, ['time', '.date', '.chrono-date'], 32);
  const confiance = lireAttribut(point, ['data-confidence'])
    || premierTexte(point, ['.confidence', '[data-confidence]'], 28);
  const source = lireAttribut(point, ['data-source', 'data-source-id'])
    || premierTexte(point, ['.source', '[data-source]'], 40);
  const omission = lireAttribut(point, ['data-omission', 'data-omission-id'])
    || premierTexte(point, ['.omission', '[data-omission]'], 40);
  const dispute = estVrai(lireAttribut(point, ['data-disputed', 'data-dispute', 'data-contested']));
  const famille = lireAttribut(point, ['data-kind', 'data-point-kind', 'data-type'])
    || premierTexte(point, ['.point-kind', '.kind', '[data-kind]'], 28);
  return { titre, ancre, confiance, source, omission, dispute, famille };
}

function install(ctx) {
  const faire = ctx.el;
  if (typeof faire !== 'function') return;

  installations += 1;
  ctx.css(CSS_ID, CSS);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const hotte = ctx.layout || ctx.stage || document.body;
  const panneau = ensureNode(faire, PANNEAU_ID, 'section', 'e099-panel', hotte);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITRE_ID);
  panneau.dataset.e099Renders = String(installations);
  panneau.dataset.e099Chantiers = '10';
  panneau.dataset.e099View = ctx.viewId || 'chronologyv2';
  panneau.dataset.e099Plain = '1';

  const sections = [];
  function ouvrirSection(cle, chantier, intitule, introduction) {
    const noeud = ensureNode(faire, PREFIXE + cle, 'section', 'e099-section', panneau);
    noeud.replaceChildren();
    const titreId = PREFIXE + 'titre-' + cle;
    const titre = ensureNode(faire, titreId, 'h3', 'e099-h', noeud);
    ecrire(titre, intitule);
    noeud.setAttribute('aria-labelledby', titreId);
    noeud.dataset.e099Chantier = chantier;
    if (introduction) noeud.appendChild(faire('p', 'e099-intro', introduction));
    sections.push(noeud);
    return noeud;
  }

  const donneesEres = collecter(ctx, '.era-band, [data-era-id]').map((noeud, index) => ({
    noeud, rang: index + 1, ...lireEre(noeud),
  }));
  const donneesPoints = collecter(ctx, '.event-card, [data-event-id], [data-point-id]').map((noeud, index) => ({
    noeud, rang: index + 1, ...lirePoint(noeud),
  }));

  /* E099-01 : colonne vertébrale — l'ordre de lecture est dans des <ol> imbriquées. */
  const sOrdre = ouvrirSection('ordre', 'E099-01', SECTIONS[0][2],
    'La frise devient une suite ordonnée : chaque ère, puis chaque repère, dans l’ordre du DOM. Sans style, cet ordre reste identique — c’est la charpente de l’alternative.');
  const arbre = faire('ol', 'e099-liste');
  arbre.dataset.e099Eres = String(donneesEres.length);
  arbre.dataset.e099Reperes = String(donneesPoints.length);
  donneesEres.forEach((ere) => {
    const item = faire('li', 'e099-noeud-ere');
    item.dataset.e099Ere = '1';
    item.dataset.e099Rang = String(ere.rang);
    item.append(faire('span', 'e099-rang', `Ère ${ere.rang}. `), faire('strong', '', ere.nom));
    const reperes = ere.noeud.querySelectorAll('.event-card, [data-event-id], [data-point-id]');
    if (reperes.length) {
      const sousListe = faire('ol', 'e099-liste');
      Array.from(reperes).forEach((repere, index) => {
        const sousItem = faire('li', 'e099-noeud-repere');
        sousItem.dataset.e099Repere = '1';
        sousItem.dataset.e099Rang = String(index + 1);
        const donnee = lirePoint(repere);
        sousItem.append(
          faire('span', 'e099-rang', `Repère ${index + 1}. `),
          faire('span', '', donnee.titre)
        );
        sousListe.appendChild(sousItem);
      });
      item.appendChild(sousListe);
    } else {
      item.appendChild(faire('p', 'e099-meta', 'Aucun repère rattaché à cette ère dans le DOM.'));
    }
    arbre.appendChild(item);
  });
  if (!donneesEres.length) {
    arbre.appendChild(faire('li', 'e099-meta', 'Aucune ère détectée : la frise est peut-être encore vide ou filtrée.'));
  }
  sOrdre.appendChild(arbre);

  /* E099-02 : l'échelle est à la fois un visuel étiqueté et une phrase lisible. */
  const sEchelle = ouvrirSection('echelle', 'E099-02', SECTIONS[1][2],
    'Une règle graphique ne parle pas d’elle-même : voici son équivalent verbal, avec amplitude, bornes et unité relevés dans la vue.');
  const axe = collecter(ctx, '[data-chrono-scale], [data-chrono-amplitude], #atlas-chrono-scale')[0] || null;
  const amplitude = lireAttribut(axe, ['data-chrono-amplitude', 'data-era-amplitude', 'data-amplitude']);
  const debutAxe = lireAttribut(axe, ['data-chrono-start', 'data-start']);
  const finAxe = lireAttribut(axe, ['data-chrono-end', 'data-end']);
  const unite = lireAttribut(axe, ['data-chrono-unit', 'data-unit'])
    || texteDe(document.querySelector('[data-chrono-unit-label]'), 24);
  const regle = faire('div', 'e099-regle');
  regle.setAttribute('role', 'img');
  regle.setAttribute('aria-label', `Règle de l’échelle : amplitude ${amplitude || 'non annotée'} ; bornes ${debutAxe || '?'} à ${finAxe || '?'} ; unité ${unite || 'non annotée'}.`);
  const phraseEchelle = faire('p', 'e099-meta');
  phraseEchelle.id = PREFIXE + 'echelle-texte';
  phraseEchelle.dataset.e099Amplitude = amplitude || 'inconnue';
  phraseEchelle.dataset.e099Unite = unite || 'inconnue';
  ecrire(phraseEchelle, amplitude || debutAxe || finAxe || unite
    ? `Échelle de la frise : amplitude ${amplitude || 'non annotée'} · bornes ${debutAxe || '?'} → ${finAxe || '?'} · unité ${unite || 'non annotée'}.`
    : 'Aucune annotation d’échelle dans le DOM : amplitude, bornes et unité sont à lire directement sur l’axe de la frise.');
  sEchelle.append(regle, phraseEchelle);

  /* E099-03 : chaque ère est nommée, bornée, datée et peuplée en texte. */
  const sEres = ouvrirSection('eres', 'E099-03', SECTIONS[2][2],
    'Les bandes d’ères sont des formes : sans style, seules ces phrases disent comment elles s’appellent, où elles commencent et combien de repères elles portent.');
  const listeEres = faire('ul', 'e099-liste');
  donneesEres.forEach((ere) => {
    const item = faire('li', 'e099-ere');
    item.dataset.e099EreMeta = '1';
    item.dataset.e099Debut = ere.debut || 'inconnu';
    item.dataset.e099Fin = ere.fin || 'inconnu';
    item.dataset.e099Duree = ere.amplitude || 'inconnue';
    item.dataset.e099Points = String(ere.points);
    item.append(
      faire('strong', '', `Ère ${ere.rang} — ${ere.nom}. `),
      faire('span', 'e099-meta', `Bornes : ${ere.debut || 'non annotées'} → ${ere.fin || 'non annotées'} · durée : ${ere.amplitude || 'non annotée'} · ${ere.points} repère${ere.points > 1 ? 's' : ''} rattaché${ere.points > 1 ? 's' : ''}.`)
    );
    listeEres.appendChild(item);
  });
  if (!donneesEres.length) listeEres.appendChild(faire('li', 'e099-meta', 'Aucune ère à transcrire dans le rendu courant.'));
  sEres.appendChild(listeEres);

  /* E099-04 : l'identité de chaque repère — titre et ancre — en une ligne. */
  const sRepere = ouvrirSection('reperes', 'E099-04', SECTIONS[3][2],
    'Un point posé sur l’axe ne dit rien sans son titre et sa date : voici l’un et l’autre, relevés sur les cartes présentes.');
  const listeRepere = faire('ul', 'e099-liste');
  donneesPoints.forEach((point) => {
    const item = faire('li', 'e099-repere');
    item.dataset.e099RepereMeta = '1';
    item.dataset.e099Ancre = point.ancre || 'inconnue';
    item.appendChild(faire('strong', 'e099-rang', `${point.rang}. `));
    item.appendChild(faire('strong', '', point.titre));
    if (point.ancre) {
      const temps = faire('time', 'e099-ancre', ` — ancre : ${point.ancre}`);
      temps.dataset.e099Ancre = point.ancre;
      item.appendChild(temps);
    } else {
      item.appendChild(faire('span', 'e099-ancre', ' — ancre à lire sur l’axe'));
    }
    listeRepere.appendChild(item);
  });
  if (!donneesPoints.length) listeRepere.appendChild(faire('li', 'e099-meta', 'Aucun repère visible : une alternative ne peut pas inventer un fait.'));
  sRepere.appendChild(listeRepere);

  /* E099-05 : la preuve — confiance et source ou omission — par repère. */
  const sPreuves = ouvrirSection('preuves', 'E099-05', SECTIONS[4][2],
    'La fiabilité d’un repère est une donnée, pas une couleur de badge : confidence et provenance sont écrites ici, avec l’omission quand elle est justifiée.');
  const listePreuves = faire('ul', 'e099-liste');
  donneesPoints.forEach((point) => {
    const item = faire('li', 'e099-preuve');
    item.dataset.e099Preuve = '1';
    item.dataset.e099Confiance = point.confiance || 'inconnue';
    item.dataset.e099Source = point.source || '';
    item.dataset.e099Omission = point.omission || '';
    const provenance = point.source
      ? `Source : ${point.source}`
      : point.omission
        ? `Omission justifiée : ${point.omission}`
        : 'aucune source renseignée';
    item.append(
      faire('strong', '', `${point.titre} — `),
      faire('span', 'e099-meta', `Confiance : ${point.confiance || 'non annotée'} ; ${provenance}.`)
    );
    listePreuves.appendChild(item);
  });
  if (!donneesPoints.length) listePreuves.appendChild(faire('li', 'e099-meta', 'Aucune preuve à transcrire tant qu’aucun repère n’est présent.'));
  sPreuves.appendChild(listePreuves);

  /* E099-06 : les écarts entre repères deviennent des lignes de texte. */
  const sSilences = ouvrirSection('silences', 'E099-06', SECTIONS[5][2],
    'Là où la frise laisse un vide, l’alternative mesure l’écart entre deux ancres consécutives : le blanc devient une information énoncée.');
  const ancres = donneesPoints
    .map((point) => ({ titre: point.titre, valeur: anneeDe(point.ancre) }))
    .filter((entree) => entree.valeur !== null);
  const ecarts = [];
  for (let i = 1; i < ancres.length; i += 1) {
    const ecart = Math.abs(ancres[i].valeur - ancres[i - 1].valeur);
    if (ecart > 0) ecarts.push({ avant: ancres[i - 1], apres: ancres[i], ecart });
  }
  const listeSilences = faire('ul', 'e099-liste');
  listeSilences.dataset.e099Silences = String(ecarts.length);
  ecarts.slice(0, 10).forEach((entree) => {
    const item = faire('li', 'e099-ecart');
    item.dataset.e099Ecart = String(entree.ecart);
    item.appendChild(faire('span', '', `Entre « ${entree.avant.titre} » et « ${entree.apres.titre} » : `));
    item.appendChild(faire('span', 'e099-meta', `écart de ${entree.ecart} unité${entree.ecart > 1 ? 's' : ''} d’après les ancres (${entree.avant.valeur} → ${entree.apres.valeur}).`));
    listeSilences.appendChild(item);
  });
  if (!ecarts.length) {
    listeSilences.appendChild(faire('li', 'e099-meta', 'Moins de deux ancres chiffrées exploitables : l’écart ne peut pas être calculé ici, mais un vide reste à interroger dans la source.'));
  } else if (ecarts.length > 10) {
    listeSilences.appendChild(faire('li', 'e099-meta', `${ecarts.length - 10} autres écarts ne sont pas développés dans cette alternative abrégée.`));
  }
  sSilences.appendChild(listeSilences);

  /* E099-07 : la légende est une liste de définitions, jamais une teinte. */
  const sLegendes = ouvrirSection('legendes', 'E099-07', SECTIONS[6][2],
    'Une légende visuelle s’efface avec les couleurs : chaque famille est donc définie par un mot et par un compte de repères.');
  const comptes = new Map();
  donneesPoints.forEach((point) => {
    if (point.famille) comptes.set(point.famille, (comptes.get(point.famille) || 0) + 1);
  });
  const noms = Array.from(comptes.keys()).sort((a, b) => a.localeCompare(b, 'fr'));
  const definitions = faire('dl', 'e099-legendes');
  definitions.dataset.e099Familles = String(noms.length);
  noms.forEach((famille) => {
    definitions.appendChild(faire('dt', 'e099-rang', famille));
    definitions.appendChild(faire('dd', 'e099-meta', `Famille relevée dans la frise : ${comptes.get(famille)} repère${comptes.get(famille) > 1 ? 's' : ''}. Aucune couleur n’est nécessaire pour l’identifier.`));
  });
  if (!noms.length) {
    definitions.appendChild(faire('dt', 'e099-rang', 'non annotée'));
    definitions.appendChild(faire('dd', 'e099-meta', 'Aucune famille annotée dans le DOM : la légende reste à compléter depuis la vue.'));
  }
  sLegendes.appendChild(definitions);

  /* E099-08 : statuts explicites — un désaccord n'est pas résolu par un silence. */
  const sStatuts = ouvrirSection('statuts', 'E099-08', SECTIONS[7][2],
    'Un point contesté ou une source omise doit être dit : l’alternative refuse de transformer une incertitude en évidence.');
  const disputees = donneesPoints.filter((point) => point.dispute).length;
  const omises = donneesPoints.filter((point) => point.omission).length;
  const phraseStatuts = faire('p', 'e099-statuts');
  phraseStatuts.dataset.e099Disputes = String(disputees);
  phraseStatuts.dataset.e099Omissions = String(omises);
  ecrire(phraseStatuts, `Repères disputés déclarés : ${disputees} · repères avec omission justifiée : ${omises}. `
    + (disputees
      ? 'Un statut disputé est annoncé tel quel : le désaccord n’est pas tranché par le silence de la frise.'
      : 'Aucun repère disputé n’est déclaré dans le DOM ; l’alternative n’en invente pas.'));
  sStatuts.appendChild(phraseStatuts);
  sStatuts.appendChild(faire('p', 'e099-plain',
    'Règle de lecture : une source absente sans justification n’est pas une preuve, et un désaccord non résolu reste un désaccord — les deux sont signalés, jamais effacés.'));

  /* E099-09 : l'état du périmètre est décrit en texte, sans région live ajoutée. */
  const sPerimetre = ouvrirSection('perimetre', 'E099-09', SECTIONS[8][2],
    'Ce que la vue montre dépend de la recherche et des puces actives : l’alternative enregistre cet état pour que le lecteur sache ce qu’il lit.');
  const champ = document.getElementById('atlas-chrono-search');
  const recherche = champ && champ.value ? champ.value.trim() : '';
  const actives = collecter(ctx, '[aria-pressed="true"], .filter-chip.is-active, [data-filter-active="1"]')
    .map((noeud) => texteDe(noeud, 28) || lireAttribut(noeud, ['aria-label', 'data-filter', 'data-type'], 28))
    .filter(Boolean);
  const phrasePerimetre = faire('p', 'e099-perimetre');
  phrasePerimetre.dataset.e099Recherche = recherche;
  phrasePerimetre.dataset.e099Filtres = actives.join('|');
  phrasePerimetre.dataset.e099Vus = String(donneesPoints.length);
  ecrire(phrasePerimetre, `Périmètre du rendu : ${donneesEres.length} ère${donneesEres.length > 1 ? 's' : ''} et ${donneesPoints.length} repère${donneesPoints.length > 1 ? 's' : ''} présents dans le DOM. `
    + `Recherche : ${recherche ? `« ${tronquer(recherche, 40)} »` : 'aucune'} · filtres actifs : ${actives.length ? actives.map((a) => `« ${a} »`).join(', ') : 'aucun'}. `
    + 'Cette description vaut pour le rendu courant et se met à jour avec lui.');
  sPerimetre.appendChild(phrasePerimetre);

  /* E099-10 : accès, sommaire interne, repli sans style et métrique d'unicité. */
  const sommaire = ensureNode(faire, SOMMAIRE_ID, 'nav', 'e099-sommaire', panneau);
  sommaire.replaceChildren();
  sommaire.setAttribute('aria-label', 'Sommaire de l’alternative textuelle de la frise');
  const listeSommaire = faire('ul', 'e099-liste');
  SECTIONS.forEach(([cle, chantier, intitule]) => {
    const item = faire('li', 'e099-lien');
    const lien = faire('a', '', intitule);
    lien.setAttribute('href', `#${PREFIXE}${cle}`);
    lien.setAttribute('aria-label', `${chantier} — ${intitule}`);
    item.appendChild(lien);
    listeSommaire.appendChild(item);
  });
  sommaire.appendChild(listeSommaire);

  const sAcces = ouvrirSection('acces', 'E099-10', SECTIONS[9][2],
    'Cette dernière section garantit l’accès à l’ensemble : navigation interne, consigne de repli et inventaire des données portées par le texte.');
  sAcces.appendChild(faire('p', 'e099-plain',
    'Repli sans CSS : ères, repères, dates, confiance, sources, familles, silences et état du filtre sont tous écrits dans les paragraphes et listes ci-dessus. '
    + 'Aucune information n’est confiée à une couleur, un pseudo-élément, une animation ou une position : désactiver les styles ne retire aucun fait.'));
  const metrique = ensureNode(faire, METRIQUE_ID, 'p', 'e099-metric', sAcces);
  metrique.dataset.e099Installs = String(installations);
  metrique.dataset.e099Reduced = reduced ? '1' : '0';
  metrique.dataset.e099Plain = '1';
  metrique.dataset.e099Feuille = CSS_ID;
  ecrire(metrique, alternatives(installations, donneesEres.length, donneesPoints.length, reduced));

  const titre = ensureNode(faire, TITRE_ID, 'h2', 'e099-titre', panneau);
  titre.textContent = 'Alternative textuelle complète de la frise';
  const lede = faire('p', 'e099-lede',
    'Tout ce que la frise montre par la forme est écrit ici en texte ordonné. Cette alternative reste lisible et complète même si aucune feuille de style n’est appliquée.');
  panneau.replaceChildren(titre, lede, sommaire, ...sections);
}

function alternatives(installations, eres, points, reduced) {
  return `Installations : ${installations} · ères transcrites : ${eres} · repères transcrits : ${points} · mouvement réduit : ${reduced ? 'oui' : 'non'} · feuille CSS unique : ${CSS_ID}.`;
}

register('E099', ctx => {
  install(ctx);
});
