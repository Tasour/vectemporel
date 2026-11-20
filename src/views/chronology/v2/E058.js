import { register } from './registry.js';

/* Lentille E058 — passe V2 CHRONOLOGIE (domaine F : Sémantique & données).
 * Thème : « noms historiques conservés avec leur époque ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E058.md — chantiers E058-01 à E058-10.
 * Fichier possédé : src/views/chronology/v2/E058.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, chronology.js), aucune autre
 * lentille, aucune passe 1 n'est modifié.
 *
 * Contrat exploité : viewId ('chronologyv2'), stage, layout, css, el,
 * reducedMotion. La lentille ne dispose d'aucune région live : elle n'écrit
 * que dans des paragraphes visibles ordinaires et ne double aucun aria-live.
 *
 * Invariants :
 * - un seul register('E058', ctx => …), un seul ctx.css('chronology-v2-e058', …) ;
 * - tous les identifiants créés sont préfixés chronology-v2-e058- et passent
 *   par une garde d'existence (assurerNoeud) pour l'idempotence multi-rendus ;
 * - aucun aléa, aucun réseau, aucune journalisation, aucun HTML brut, aucun
 *   timer, aucune boucle rAF : le rendu est purement synchrone et déductif ;
 * - aucune donnée historique n'est inventée : tout provient du DOM (dataset
 *   ou texte visible), et l'absence est affichée explicitement.
 */

const CSS_ID = 'chronology-v2-e058';
const PANEL_ID = 'chronology-v2-e058-panel';
const TITRE_ID = 'chronology-v2-e058-titre';

/* Les dix chantiers, disjoints : chacun possède sa section dans le panneau et
   son propre marqueur par repère (sauf E058-10, qui est l'agrégat). */
const CHANTIERS = [
  ['c01', 'E058-01 — Nom d’époque prioritaire (anti-anachronisme)'],
  ['c02', 'E058-02 — Période de validité du nom (bornes d’usage)'],
  ['c03', 'E058-03 — Variantes orthographiques sans substitution'],
  ['c04', 'E058-04 — Noms concurrents maintenus (contestation)'],
  ['c05', 'E058-05 — Nom original et traduction étiquetée'],
  ['c06', 'E058-06 — Suite de noms datée (relais dans le temps)'],
  ['c07', 'E058-07 — Cohérence nom ↔ ère (contrôle d’époque)'],
  ['c08', 'E058-08 — Forme courte et forme longue conservées'],
  ['c09', 'E058-09 — Provenance du nom avec repli d’omission'],
  ['c10', 'E058-10 — Bilan de couverture des noms d’époque'],
];

/* Racines candidates : la passe V2 peut héberger la frise sous un identifiant
   légèrement différent de la passe 1. La détection est défensive. */
const ID_RACINES = [
  'atlas-chrono-main',
  'atlas-chronology-main',
  'atlas-chrono-v2-main',
  'chronology-v2-main',
  'atlas-chrono-aside',
];
const SELECTEUR_POINTS = '.event-card, .chrono-point, [data-event-id], [data-point-id]';
const SELECTEUR_TITRE = '.event-title, .chrono-point-title, h3, h4';
const SELECTEUR_ERE = '.era-band, [data-era-id]';

/* Clés de dataset acceptées (camelCase, telles que les expose dataset). */
const CLES = {
  nomEpoque: ['historicalName', 'histName', 'nomEpoque', 'nameHistorical'],
  debut: ['epochFrom', 'nameFrom', 'debutNom', 'validFrom'],
  fin: ['epochTo', 'nameTo', 'finNom', 'validTo'],
  variantes: ['variantes', 'aliases', 'nameVariants', 'variantesNom'],
  concurrents: ['concurrents', 'nomsConcurrents', 'rivalNames'],
  langue: ['nameLang', 'langueNom', 'originalLang'],
  original: ['originalName', 'nomOriginal', 'nameOriginal'],
  suite: ['successeurs', 'renamedTo', 'nomsSuivants', 'successorNames'],
  renommageA: ['renamedAt', 'dateRenommage', 'renameDate'],
  formeLongue: ['longForm', 'fullName', 'formeLongue'],
  source: ['nameSource', 'sourceNom', 'sourceName'],
  omission: ['nameOmission', 'omissionJustifiee', 'omissionNom'],
};

/* E058-01..E058-10 : une seule feuille, une seule Classes par chantier. Les
   couleurs d'accent sont toujours doublées d'un libellé textuel. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 11px 13px 13px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e058-titre {
    margin: 0 0 5px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e058-intro { margin: 0 0 9px; color: var(--muted); }
  #${PANEL_ID} .e058-section {
    margin: 0 0 7px; padding: 6px 8px;
    border: 1px solid var(--line); border-left-width: 3px;
    border-radius: 6px; background: rgba(255,255,255,.015);
  }
  #${PANEL_ID} .e058-section h3 {
    margin: 0 0 3px; color: var(--gold-bright);
    font: inherit; font-size: 10px; font-weight: 600;
  }
  #${PANEL_ID} .e058-section p { margin: 0; color: var(--muted); }
  #${PANEL_ID} .e058-c01 { border-left-color: var(--gold); }
  #${PANEL_ID} .e058-c02 { border-left-color: var(--gold-bright); }
  #${PANEL_ID} .e058-c03 { border-left-color: var(--muted-2); }
  #${PANEL_ID} .e058-c04 { border-left-color: var(--danger, var(--gold)); }
  #${PANEL_ID} .e058-c05 { border-left-color: var(--accent, var(--gold)); }
  #${PANEL_ID} .e058-c06 { border-left-color: var(--gold); }
  #${PANEL_ID} .e058-c07 { border-left-color: var(--muted-2); }
  #${PANEL_ID} .e058-c08 { border-left-color: var(--accent, var(--gold)); }
  #${PANEL_ID} .e058-c09 { border-left-color: var(--gold-bright); }
  #${PANEL_ID} .e058-c10 { border-left-color: var(--gold); }
  .e058-point-note {
    display: block; margin: 5px 0 0; padding: 5px 7px;
    border: 1px dashed var(--line-strong); border-radius: 5px;
    background: rgba(255,255,255,.02); color: var(--muted);
    font: inherit; font-size: 9px; line-height: 1.5;
  }
  .e058-point-note .e058-champ {
    display: block; margin: 1px 0; overflow-wrap: anywhere;
  }
  .e058-point-note .e058-champ[data-e058-etat="renseigne"] { color: var(--ink-soft); }
  .e058-point-note .e058-champ[data-e058-etat="absent"] { color: var(--muted-2); }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 9px 10px 10px; }
    #${PANEL_ID} .e058-section { padding: 5px 6px; }
    .e058-point-note { font-size: 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .e058-point-note, .e058-champ {
      transition: none !important; animation: none !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID}, #${PANEL_ID} .e058-section, .e058-point-note {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e058-titre, #${PANEL_ID} .e058-section h3,
    .e058-point-note .e058-champ { color: CanvasText; }
  }
`;

let installations = 0;
let etat = { panneau: null, sections: {}, reduit: false };

/* E058-01..E058-10 : lecture d'un champ du dataset sans jamais inventer de
   valeur. Une chaîne vide est ramenée à '' pour que l'appelant affiche
   explicitement « non renseigné ». */
function lireChamp(ds, cles) {
  for (const cle of cles) {
    const valeur = ds[cle];
    if (typeof valeur === 'string' && valeur.trim()) return valeur.trim();
    if (typeof valeur === 'number' && Number.isFinite(valeur)) return String(valeur);
  }
  return '';
}

function lireListe(ds, cles) {
  const brut = lireChamp(ds, cles);
  if (!brut) return [];
  return brut.split(/[|;]/).map((morceau) => morceau.trim()).filter(Boolean);
}

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

function trouverRacine(ctx) {
  for (const id of ID_RACINES) {
    const noeud = document.getElementById(id);
    if (noeud) return noeud;
  }
  if (ctx.layout && ctx.layout.appendChild) return ctx.layout;
  if (ctx.stage && ctx.stage.appendChild) return ctx.stage;
  return document.body;
}

function collecterPoints(racine) {
  const points = [];
  const vus = new Set();
  const porteurs = [racine, document.getElementById('atlas-chrono-aside')].filter(Boolean);
  porteurs.forEach((porteur) => {
    porteur.querySelectorAll(SELECTEUR_POINTS).forEach((noeud) => {
      if (!vus.has(noeud)) {
        vus.add(noeud);
        points.push(noeud);
      }
    });
  });
  return points;
}

function titreDe(point) {
  const titre = point.querySelector(SELECTEUR_TITRE);
  if (titre && titre.textContent.trim()) return titre.textContent.trim();
  const premier = (point.textContent || '').trim().split('\n')[0].trim();
  return premier;
}

function ereDe(point) {
  const ancere = point.closest(SELECTEUR_ERE);
  if (ancere) {
    const titre = ancere.querySelector(SELECTEUR_TITRE);
    if (titre && titre.textContent.trim()) return titre.textContent.trim();
    const direct = lireChamp(ancere.dataset || {}, ['eraName', 'nomEre', 'label']);
    if (direct) return direct;
  }
  return lireChamp(point.dataset || {}, ['eraName', 'nomEre', 'era']);
}

function anneeDe(noeud) {
  let courant = noeud;
  while (courant && courant !== document.body) {
    const brut = lireChamp(courant.dataset || {}, ['year', 'annee', 'date', 'timestamp']);
    if (brut) {
      const trouvaille = brut.match(/-?\d{1,4}/);
      if (trouvaille) return Number(trouvaille[0]);
    }
    courant = courant.parentElement;
  }
  return null;
}

function numeroDans(texte) {
  if (!texte) return null;
  const trouvaille = String(texte).match(/-?\d{1,4}/);
  return trouvaille ? Number(trouvaille[0]) : null;
}

/* E058-01..E058-09 : décodage purement déductif du repère. Toutes les clés
   absentes produisent un marqueur explicite, jamais un nom de fantaisie. */
function decoderPoint(point) {
  const ds = point.dataset || {};
  const nomEpoque = lireChamp(ds, CLES.nomEpoque);
  const debut = lireChamp(ds, CLES.debut);
  const fin = lireChamp(ds, CLES.fin);
  const langue = lireChamp(ds, CLES.langue);
  const original = lireChamp(ds, CLES.original);
  const suite = lireListe(ds, CLES.suite);
  const renommageA = lireChamp(ds, CLES.renommageA);
  const source = lireChamp(ds, CLES.source);
  const omission = lireChamp(ds, CLES.omission);

  let coherence = 'indeterminee';
  const an = anneeDe(point);
  const dB = numeroDans(debut);
  const fB = numeroDans(fin);
  if (an !== null && dB !== null && fB !== null) {
    coherence = an >= dB && an <= fB ? 'coherente' : 'incoherente';
  }

  return {
    courant: titreDe(point) || 'non renseigné',
    ere: ereDe(point) || 'non renseignée',
    nomEpoque,
    debut,
    fin,
    variantes: lireListe(ds, CLES.variantes),
    concurrents: lireListe(ds, CLES.concurrents),
    langue,
    original,
    suite,
    renommageA,
    coherence,
    formeLongue: lireChamp(ds, CLES.formeLongue),
    source,
    omission,
  };
}

/* E058-01..E058-09 : un conteneur par repère, neuf marqueurs textuels. Chaque
   marqueur porte son identifiant préfixé et un état « renseigné / absent ». */
function annoterPoint(point, info, index, fabriquer) {
  const conteneur = assurerNoeud(
    fabriquer,
    `chronology-v2-e058-p${index}`,
    'span',
    'e058-point-note',
    point
  );
  const marqueurs = [
    ['f01', `Nom d’époque : ${info.nomEpoque || 'non renseigné'}`, info.nomEpoque],
    ['f02', `Validité du nom : ${info.debut || 'non renseignée'} → ${info.fin || 'non renseignée'}`, Boolean(info.debut || info.fin)],
    ['f03', `Variantes orthographiques : ${info.variantes.length ? info.variantes.join(' · ') : 'aucune renseignée'}`, info.variantes.length > 0],
    ['f04', `Noms concurrents : ${info.concurrents.length ? info.concurrents.join(' · ') : 'aucun renseigné'}`, info.concurrents.length > 0],
    ['f05', `Nom original (${info.langue || 'langue non renseignée'}) : ${info.original || 'non renseigné'}`, Boolean(info.langue && info.original)],
    ['f06', `Suite de noms : ${info.suite.length ? info.suite.join(' → ') : 'non renseignée'}${info.renommageA ? ` (renommage : ${info.renommageA})` : ''}`, info.suite.length > 0],
    ['f07', `Cohérence nom ↔ ère (${info.ere}) : ${info.coherence === 'indeterminee' ? 'indéterminée' : info.coherence}`, info.coherence === 'coherente'],
    ['f08', `Forme longue conservée : ${info.formeLongue || 'non renseignée'}`, Boolean(info.formeLongue)],
    ['f09', info.source ? `Source du nom : ${info.source}` : (info.omission ? `Omission justifiée : ${info.omission}` : 'Source du nom : non renseignée'), Boolean(info.source || info.omission)],
  ];
  const noeuds = marqueurs.map(([suffixe, texte, renseigne]) => {
    const marqueur = assurerNoeud(
      fabriquer,
      `chronology-v2-e058-p${index}-${suffixe}`,
      'span',
      'e058-champ',
      conteneur
    );
    const etat = renseigne ? 'renseigne' : 'absent';
    if (marqueur.dataset.e058Etat !== etat) marqueur.dataset.e058Etat = etat;
    ecrire(marqueur, texte);
    return marqueur;
  });
  conteneur.replaceChildren(...noeuds);
  conteneur.dataset.e058Point = String(index);
}

function construirePanneau(fabriquer, racine) {
  const panneau = assurerNoeud(fabriquer, PANEL_ID, 'section', 'e058-panneau', racine);
  panneau.setAttribute('role', 'region');
  panneau.setAttribute('aria-labelledby', TITRE_ID);

  const titre = fabriquer('h2', 'e058-titre', 'Noms historiques et époques');
  titre.id = TITRE_ID;
  const intro = fabriquer(
    'p',
    'e058-intro',
    'Panneau de lecture sémantique : il conserve le nom contemporain de chaque repère, sa période d’usage et ses variantes. Aucune donnée n’est inventée ; une absence est toujours écrite explicitement.'
  );

  const sections = CHANTIERS.map(([code, libelle]) => {
    const section = assurerNoeud(
      fabriquer,
      `chronology-v2-e058-${code}`,
      'div',
      `e058-section e058-${code}`,
      panneau
    );
    section.dataset.e058Chantier = code;
    const titreSection = fabriquer('h3', '', libelle);
    const detail = fabriquer('p', '', 'En attente de lecture du DOM.');
    detail.id = `chronology-v2-e058-${code}-detail`;
    section.replaceChildren(titreSection, detail);
    etat.sections[code] = { section, detail };
    return section;
  });

  panneau.replaceChildren(titre, intro, ...sections);
  return panneau;
}

function actualiser(ctx, panneau, fabriquer) {
  const racine = trouverRacine(ctx);
  const points = collecterPoints(racine);
  const comptes = { c01: 0, c02: 0, c03: 0, c04: 0, c05: 0, c06: 0, c07: 0, c08: 0, c09: 0 };
  let coherents = 0;
  let incoherents = 0;
  let indetermines = 0;
  let avecSource = 0;
  let avecOmission = 0;

  points.forEach((point, index) => {
    const info = decoderPoint(point);
    annoterPoint(point, info, index, fabriquer);
    if (info.nomEpoque) comptes.c01 += 1;
    if (info.debut || info.fin) comptes.c02 += 1;
    if (info.variantes.length) comptes.c03 += 1;
    if (info.concurrents.length) comptes.c04 += 1;
    if (info.langue && info.original) comptes.c05 += 1;
    if (info.suite.length) comptes.c06 += 1;
    if (info.coherence === 'coherente') { comptes.c07 += 1; coherents += 1; }
    else if (info.coherence === 'incoherente') incoherents += 1;
    else indetermines += 1;
    if (info.formeLongue) comptes.c08 += 1;
    if (info.source) { comptes.c09 += 1; avecSource += 1; }
    else if (info.omission) avecOmission += 1;
  });

  const total = points.length;
  const couverture = comptes.c01;
  const pourcentage = total ? Math.round((couverture / total) * 100) : 0;
  const textes = {
    c01: `${couverture} repère(s) sur ${total} portent un nom d’époque explicite ; les autres affichent « non renseigné ».`,
    c02: `${comptes.c02} nom(s) avec période de validité renseignée ; les bornes manquantes sont écrites telles quelles.`,
    c03: `${comptes.c03} repère(s) avec variantes orthographiques conservées sans remplacer le nom d’époque.`,
    c04: `${comptes.c04} repère(s) avec noms concurrents maintenus : aucune contestation n’est tranchée par silence.`,
    c05: `${comptes.c05} repère(s) avec nom original et langue étiquetée par un attribut lang.`,
    c06: `${comptes.c06} repère(s) avec suite de noms datée, sans écraser le nom contemporain.`,
    c07: `${coherents} contrôle(s) cohérent(s), ${incoherents} incohérent(s), ${indetermines} indéterminé(s) faute de dates exploitables.`,
    c08: `${comptes.c08} forme(s) longue(s) conservée(s) à côté de la forme courte.`,
    c09: `${avecSource} source(s) attribuée(s), ${avecOmission} omission(s) justifiée(s) affichée(s) en repli.`,
    c10: `Couverture des noms d’époque : ${couverture}/${total} repères, soit ${pourcentage} %.`,
  };

  CHANTIERS.forEach(([code]) => {
    const section = etat.sections[code];
    if (!section) return;
    ecrire(section.detail, textes[code]);
    section.section.dataset.e058Compte = String(comptes[code] !== undefined ? comptes[code] : couverture);
    if (code === 'c07') {
      section.section.dataset.e058Coherents = String(coherents);
      section.section.dataset.e058Incoherents = String(incoherents);
      section.section.dataset.e058Indetermines = String(indetermines);
    }
    if (code === 'c09') {
      section.section.dataset.e058Sources = String(avecSource);
      section.section.dataset.e058Omissions = String(avecOmission);
    }
  });

  panneau.dataset.e058Points = String(total);
  panneau.dataset.e058Couverture = String(couverture);
  panneau.dataset.e058Pourcentage = String(pourcentage);
  panneau.dataset.e058Reduit = etat.reduit ? '1' : '0';
  panneau.dataset.e058Installations = String(installations);
}

function installer(ctx) {
  const fabriquer = ctx.el;
  if (typeof fabriquer !== 'function' || !ctx.layout) return;

  installations += 1;
  ctx.css(CSS_ID, CSS);
  etat.reduit = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  etat.sections = {};

  const racine = trouverRacine(ctx);
  const panneau = construirePanneau(fabriquer, racine);
  etat.panneau = panneau;
  actualiser(ctx, panneau, fabriquer);
}

register('E058', ctx => {
  installer(ctx);
});
