import { register } from './registry.js';

/* Lentille E093 — passe V2, domaine J (Pédagogie & narration).
 * Thème : « les huit familles de points en carte illustrative ».
 *
 * Dix chantiers V2 NEUFS et distincts de la passe 1. Celle-ci installe déjà une
 * « carte illustrative » (8 familles, question, exemple, présence dérivée du
 * filtre, bascule locale, signature anti-écriture). La V2 n'ajoute ni seconde
 * carte ni second bouton : elle installe un **tableau de bord de synthèse**
 * qui LIT l'état réel du DOM produit par renderPoints() (points.js:17-129) et
 * par la passe 1, sans reconstruire la matrice, les filtres ni le détail.
 *
 *  E093-01 panneau de synthèse unique, non destructif, idempotent ;
 *  E093-02 glossaire normatif en <dl>, défini à la première occurrence ;
 *  E093-03 inventaire des 8 familles à double codage (glyphe + forme + texte) ;
 *  E093-04 couverture de la matrice entièrement dérivée du DOM ;
 *  E093-05 récapitulatif des filtres actifs lus dans les <select> ;
 *  E093-06 familles cumulées sur le point affiché, lues dans le détail ;
 *  E093-07 profil du point affiché (domaine, échelle, temps, confiance) ;
 *  E093-08 défi falsifiable en 5 temps, aligné sur la leçon ;
 *  E093-09 alternative textuelle complète, lisible sans CSS ;
 *  E093-10 mouvement réduit, impression, responsive et garde multi-rendus.
 *
 * Fichier possédé : src/views/points/v2/E093.js uniquement. La passe 1
 * (src/views/points/E093.js), la vue (points.js), les registres, styles.css et
 * les autres lentilles ne sont ni édités ni doublés.
 *
 * Contrat exploité : ctx.viewId, ctx.stage, ctx.layout, ctx.css, ctx.el,
 * ctx.reducedMotion. La vue est rendue avec viewId === 'pointsv2' ; 'points'
 * est aussi accepté par robustesse. Invariants : un seul register('E093', …),
 * un seul ctx.css('points-v2-e093', …), toutes les règles préfixées
 * .points-v2-e093, tous les ids préfixés points-v2-e093-, aucune injection de
 * balisage brut, zéro console, zéro réseau, zéro aléa, zéro timer, zéro rAF, zéro écouteur
 * global. Aucune donnée historique n'est inventée : seuls les comptages sont
 * dérivés du DOM et les exemples sont explicitement qualifiés d'illustratifs.
 */

const CSS_ID = 'points-v2-e093';
const PANEL_ID = 'points-v2-e093-panel';
const TITLE_ID = 'points-v2-e093-title';
const GLOSSARY_ID = 'points-v2-e093-glossary';
const COVERAGE_ID = 'points-v2-e093-coverage';
const FILTERS_ID = 'points-v2-e093-filters';
const FAMILIES_ID = 'points-v2-e093-families';
const PROFILE_ID = 'points-v2-e093-profile';
const CHALLENGE_ID = 'points-v2-e093-challenge';
const ALT_ID = 'points-v2-e093-alt';
const ALT_BODY_ID = 'points-v2-e093-alt-body';
const MOTION_ATTR = 'data-points-v2-e093-motion';

/* E093-01 / -02 / -03 / -09 / -10 : une seule feuille, intégralement préfixée
 * par .points-v2-e093 (classe portée par le panneau). Aucun sélecteur nu,
 * aucune fuite hors de la vue Points, aucun canvas ni image distante. */
const CSS = `
  .points-v2-e093 {
    margin: 10px 0 14px; padding: 10px 12px 12px;
    border: 1px solid var(--line-strong); border-left: 3px solid var(--gold);
    border-radius: 8px; background: rgba(230, 185, 111, .04);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
    transition: opacity .18s linear;
  }
  .points-v2-e093:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  .points-v2-e093 .points-v2-e093-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
  }
  .points-v2-e093 .points-v2-e093-lede { margin: 0 0 8px; color: var(--muted); }
  .points-v2-e093 .points-v2-e093-glossary {
    margin: 0 0 8px; padding: 8px 10px;
    border: 1px solid var(--line); border-radius: 6px;
  }
  .points-v2-e093 .points-v2-e093-term { color: var(--gold-bright); font-weight: 700; }
  .points-v2-e093 .points-v2-e093-def { margin: 2px 0 4px; color: var(--muted); }
  .points-v2-e093 .points-v2-e093-coverage,
  .points-v2-e093 .points-v2-e093-filters,
  .points-v2-e093 .points-v2-e093-profile { margin: 4px 0; color: var(--ink-soft); }
  .points-v2-e093 .points-v2-e093-section-title {
    margin: 8px 0 4px; color: var(--gold-bright); font-size: 10px;
    letter-spacing: .04em; text-transform: uppercase;
  }
  .points-v2-e093 .points-v2-e093-families {
    list-style: none; margin: 0 0 8px; padding: 0;
    display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px;
  }
  .points-v2-e093 .points-v2-e093-family {
    padding: 8px; border: 1px solid var(--line); border-radius: 6px;
    background: rgba(8, 11, 16, .45);
  }
  .points-v2-e093 .points-v2-e093-card-head { display: flex; align-items: center; gap: 8px; }
  .points-v2-e093 .points-v2-e093-glyph {
    flex: 0 0 26px; width: 26px; height: 26px;
    display: inline-flex; align-items: center; justify-content: center;
    border: 2px solid var(--gold); border-radius: 4px;
    color: var(--gold-bright); font-size: 14px; line-height: 1;
  }
  /* E093-03 : la forme diffère par le style et l'arrondi de bordure, jamais par la couleur. */
  .points-v2-e093 .points-v2-e093-family[data-v2e093-forme="losange"] .points-v2-e093-glyph { border-radius: 2px; }
  .points-v2-e093 .points-v2-e093-family[data-v2e093-forme="fleche"] .points-v2-e093-glyph { border-radius: 2px 12px 2px 12px; }
  .points-v2-e093 .points-v2-e093-family[data-v2e093-forme="rond"] .points-v2-e093-glyph { border-radius: 50%; }
  .points-v2-e093 .points-v2-e093-family[data-v2e093-forme="grille"] .points-v2-e093-glyph { border-style: double; border-radius: 2px; }
  .points-v2-e093 .points-v2-e093-family[data-v2e093-forme="triangle"] .points-v2-e093-glyph { border-radius: 50% 50% 0 0; }
  .points-v2-e093 .points-v2-e093-family[data-v2e093-forme="hexagone"] .points-v2-e093-glyph { border-style: double; border-radius: 6px; }
  .points-v2-e093 .points-v2-e093-family[data-v2e093-forme="parchemin"] .points-v2-e093-glyph { border-style: dashed; border-radius: 0; }
  .points-v2-e093 .points-v2-e093-family[data-v2e093-forme="etoile"] .points-v2-e093-glyph { border-style: dotted; border-radius: 50%; }
  .points-v2-e093 .points-v2-e093-name { color: var(--ink); font-size: 12px; }
  .points-v2-e093 .points-v2-e093-form,
  .points-v2-e093 .points-v2-e093-example { margin: 5px 0 0; color: var(--muted-2); }
  .points-v2-e093 .points-v2-e093-badge {
    margin: 5px 0 0; padding-top: 4px; border-top: 1px solid var(--line);
    color: var(--ink-soft);
  }
  .points-v2-e093 .points-v2-e093-steps { margin: 4px 0; padding-left: 20px; color: var(--muted); }
  .points-v2-e093 .points-v2-e093-step { margin: 3px 0; }
  .points-v2-e093 .points-v2-e093-alt { margin-top: 8px; }
  .points-v2-e093 .points-v2-e093-alt-summary { cursor: pointer; color: var(--gold-bright); padding: 4px 0; }
  .points-v2-e093 .points-v2-e093-alt-summary:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  .points-v2-e093 .points-v2-e093-alt-item { margin: 4px 0; color: var(--muted); }
  @media (max-width: 620px) {
    .points-v2-e093 .points-v2-e093-families { grid-template-columns: 1fr; }
    .points-v2-e093 .points-v2-e093-glyph { flex-basis: 22px; width: 22px; height: 22px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e093 { transition: none; }
  }
  [${MOTION_ATTR}="reduce"] .points-v2-e093 { transition: none; }
  @media (forced-colors: active) {
    .points-v2-e093,
    .points-v2-e093 .points-v2-e093-glossary,
    .points-v2-e093 .points-v2-e093-family {
      border: 1px solid CanvasText; background: Canvas; color: CanvasText;
      forced-color-adjust: auto;
    }
    .points-v2-e093 .points-v2-e093-title,
    .points-v2-e093 .points-v2-e093-term,
    .points-v2-e093 .points-v2-e093-glyph,
    .points-v2-e093 .points-v2-e093-section-title,
    .points-v2-e093 .points-v2-e093-alt-summary { color: CanvasText; }
  }
  @media print {
    .points-v2-e093 { border: 1px solid #000; background: #fff; color: #000; }
    .points-v2-e093 .points-v2-e093-alt > div { display: block !important; }
  }
`;

/* E093-03 / E093-06 / E093-07 / E093-09 : les huit familles canoniques du
 * tableau §2 de POINT_METHODOLOGY.md. `aliases` couvre le slug de vocabulaire
 * et le libellé tel qu'il apparaît dans le détail. Aucune date n'est codée en
 * dur : la date est un champ du point, jamais son contenu. */
const FAMILIES = [
  { key: 'evenement', label: 'Événement', glyph: '◆', forme: 'losange',
    aliases: ['evenement'], exemple: 'Un fait daté et localisé, par exemple une prise de Bastille.' },
  { key: 'processus', label: 'Processus', glyph: '➤', forme: 'fleche',
    aliases: ['processus'], exemple: 'Une industrialisation étalée sur plusieurs décennies.' },
  { key: 'acteur', label: 'Acteur', glyph: '●', forme: 'rond',
    aliases: ['acteur'], exemple: 'Une personne ou un groupe qui agit, par exemple Olympe de Gouges.' },
  { key: 'groupe', label: 'Groupe social', glyph: '▦', forme: 'grille',
    aliases: ['groupe', 'groupesocial'], exemple: 'Paysans, ouvrières, minorité, diaspora.' },
  { key: 'lieu', label: 'Lieu', glyph: '▲', forme: 'triangle',
    aliases: ['lieu'], exemple: 'Alésia, Paris, Le Caire, Kyoto : un espace nommé.' },
  { key: 'institution', label: 'Institution', glyph: '⬢', forme: 'hexagone',
    aliases: ['institution'], exemple: 'Parlement, Église, armée, compagnie.' },
  { key: 'normatif', label: 'Repère normatif', glyph: '▤', forme: 'parchemin',
    aliases: ['normatif', 'reperenormatif'], exemple: 'Édit, loi, traité, constitution.' },
  { key: 'memoire', label: 'Mémoire', glyph: '★', forme: 'etoile',
    aliases: ['memoire'], exemple: 'Statue, commémoration, contestation.' },
];

/* E093-02 : définitions données à la première occurrence des termes. */
const GLOSSARY = [
  ['Famille de points', 'Regroupement de repères qui partagent la même nature : événement, processus, acteur, groupe social, lieu, institution, repère normatif ou mémoire.'],
  ['Point', 'Repère validé portant un sujet, un texte, une échelle, un temps, une confiance et une ou plusieurs familles.'],
  ['Cumulabilité', 'Un même point peut porter plusieurs familles : ce sont des questions posées au passé, non des étiquettes exclusives.'],
  ['Date (champ)', 'La date est un attribut du point, jamais son contenu : une année seule ne constitue pas un point.'],
];

/* E093-08 : défi en 5 temps, aligné sur la leçon de la passe 1. */
const STEPS = [
  'Prédiction : avant de toucher au filtre « famille », annoncez combien de familles porte le point affiché.',
  'Réglage : changez le filtre « famille » de la vue pour isoler une seule famille.',
  'Résultat attendu : la ligne « familles sur le point affiché » ne doit pas changer ; seul le périmètre se réduit.',
  'Falsification : si ce compte varie alors que le point affiché est identique, l’information dépend du filtre et non du point — le constat est faux.',
  'Débrief : relisez la fiche : une famille est une question posée au passé, jamais une étiquette exclusive, et la date en est un champ.',
];

/* Chaque clé de correspondance est normalisée une seule fois. */
FAMILIES.forEach((famille) => {
  famille.match = [famille.key, famille.label].concat(famille.aliases).map(norm);
});

/* ---------- Utilitaires défensifs ---------- */

function securise(action) {
  try { if (typeof action === 'function') action(); }
  catch { /* chantier neutralisé : le rendu de la vue reste intact */ }
}

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function tous(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function txt(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
}

function norm(valeur) {
  return String(valeur == null ? '' : valeur)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function entete(regex, source) {
  const trouvaille = String(source || '').match(regex);
  return trouvaille && trouvaille[1] ? trouvaille[1].trim() : '';
}

function ecrit(panel, id, valeurTexte) {
  const noeud = panel.querySelector('#' + id);
  if (noeud && noeud.textContent !== valeurTexte) noeud.textContent = valeurTexte;
}

/* Réutilise un panneau déjà inséré (unicité de l'id) et le place juste après
 * son ancre, sans toucher aux autres enfants du parent. */
function placeApres(panel, parent, ancre) {
  if (!parent || typeof parent.insertBefore !== 'function') return;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (panel.parentNode !== parent || (cible && panel.nextSibling !== cible)) {
    parent.insertBefore(panel, cible);
  }
}

/* E093-05 : le <select> est déjà rendu par points.js:62-85 ; on le repère par
 * son aria-label, jamais par un id de la passe 1. */
function selectParLabel(layout, mot) {
  const cibles = tous(layout, '.points-filters select');
  for (const select of cibles) {
    if (norm(select.getAttribute('aria-label')).indexOf(norm(mot)) >= 0) return select;
  }
  return null;
}

function valeurActive(select) {
  if (!select) return '';
  let valeur = '';
  try { valeur = String(select.value || ''); } catch { return ''; }
  if (!valeur || valeur === '*' || valeur === 'all') return '';
  let libelle = '';
  if (select.options) {
    Array.prototype.forEach.call(select.options, (option) => {
      if (String(option.value) === valeur && !libelle) libelle = txt(option);
    });
  }
  return libelle || valeur;
}

/* E093-06 : clés de famille présentes dans le corpus, lues dans les options du
 * filtre ; l'option « toutes » est écartée par la normalisation. */
function clesCorpus(select) {
  const resultat = new Set();
  if (!select || !select.options) return resultat;
  Array.prototype.forEach.call(select.options, (option) => {
    const cle = norm(option.value);
    if (cle) resultat.add(cle);
  });
  return resultat;
}

/* E093-06 : les familles du point affiché sont cherchées dans les <span> nus
 * du détail (points.js:109-110) puis appariées aux familles canoniques. */
function famillesDuPoint(layout) {
  const resultat = new Set();
  const spans = tous(layout, '.points-detail > span');
  spans.forEach((span) => {
    const cle = norm(txt(span));
    if (!cle) return;
    FAMILIES.forEach((famille) => {
      if (famille.match.indexOf(cle) >= 0) resultat.add(famille.key);
    });
  });
  return resultat;
}

function listeFamilles(cles) {
  return FAMILIES.filter((famille) => cles.has(famille.key))
    .map((famille) => famille.label).join(', ');
}

function libelleConfiance(valeur) {
  const cle = norm(valeur);
  if (!cle) return 'non qualifiée';
  if (/verifi|confirme|certain|eleve|haut|fort/.test(cle)) return 'vérifiée';
  if (/contest|faible|dout|bas|incertain/.test(cle)) return 'contestée';
  return 'à qualifier';
}

function domaines(layout) {
  const tete = q(layout, '.points-grid-row.is-head');
  return tete ? tous(tete, 'span').slice(1).map(txt).filter(Boolean) : [];
}

/* ---------- Construction statique (une seule fois par panneau) ---------- */

function construitPanneau(ctx) {
  const el = ctx.el;
  const panel = el('section', 'points-v2-e093');
  panel.id = PANEL_ID;
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);
  panel.tabIndex = -1;

  const titre = el('h3', 'points-v2-e093-title',
    'Tableau de bord pédagogique — les familles de points (V2)');
  titre.id = TITLE_ID;
  panel.appendChild(titre);

  panel.appendChild(el('p', 'points-v2-e093-lede',
    'Ce tableau complète la carte de la passe 1. Il lit l’état réel de la vue : couverture de la matrice, filtres actifs, profil du point affiché et familles cumulées. Aucun chiffre n’est codé en dur : tout est recalculé depuis le DOM. Les exemples sont illustratifs, pas des points validés de ce pays.'));

  /* E093-02 : glossaire en <dl>, dans le DOM statique. */
  const glossaire = el('dl', 'points-v2-e093-glossary');
  glossaire.id = GLOSSARY_ID;
  GLOSSARY.forEach(([terme, definition]) => {
    glossaire.append(el('dt', 'points-v2-e093-term', terme),
      el('dd', 'points-v2-e093-def', definition));
  });
  panel.appendChild(glossaire);

  const couverture = el('p', 'points-v2-e093-coverage');
  couverture.id = COVERAGE_ID;
  panel.appendChild(couverture);

  const filtres = el('p', 'points-v2-e093-filters');
  filtres.id = FILTERS_ID;
  panel.appendChild(filtres);

  /* E093-03 : inventaire à double codage — glyphe (aria-hidden) + forme en
   * texte + nom + badge textuel. Aucune information portée par la couleur. */
  panel.appendChild(el('p', 'points-v2-e093-section-title',
    'Familles — glyphe, forme et texte (jamais la couleur seule) :'));
  const liste = el('ul', 'points-v2-e093-families');
  liste.id = FAMILIES_ID;
  FAMILIES.forEach((famille) => {
    const item = el('li', 'points-v2-e093-family');
    item.dataset.key = famille.key;
    item.dataset.v2e093Forme = famille.forme;
    const tete = el('div', 'points-v2-e093-card-head');
    const glyphe = el('span', 'points-v2-e093-glyph', famille.glyph);
    glyphe.setAttribute('aria-hidden', 'true');
    tete.append(glyphe, el('strong', 'points-v2-e093-name', famille.label));
    item.appendChild(tete);
    item.appendChild(el('p', 'points-v2-e093-form', `Forme : ${famille.forme}.`));
    item.appendChild(el('p', 'points-v2-e093-example',
      `Exemple illustratif : ${famille.exemple}`));
    item.appendChild(el('p', 'points-v2-e093-badge', '—'));
    liste.appendChild(item);
  });
  panel.appendChild(liste);

  const profil = el('p', 'points-v2-e093-profile');
  profil.id = PROFILE_ID;
  panel.appendChild(profil);

  /* E093-08 : défi en 5 temps, écrit en toutes lettres dans le DOM. */
  const defi = el('div', 'points-v2-e093-challenge');
  defi.id = CHALLENGE_ID;
  defi.appendChild(el('p', 'points-v2-e093-section-title', 'À vous de jouer — défi en 5 temps'));
  const etapes = el('ol', 'points-v2-e093-steps');
  STEPS.forEach((texte) => etapes.appendChild(el('li', 'points-v2-e093-step', texte)));
  defi.appendChild(etapes);
  panel.appendChild(defi);

  /* E093-09 : alternative textuelle native, lisible sans CSS et au clavier. */
  const alt = el('details', 'points-v2-e093-alt');
  alt.id = ALT_ID;
  const resume = el('summary', 'points-v2-e093-alt-summary',
    'Lire le tableau en texte (sans mise en forme)');
  const corps = el('div', 'points-v2-e093-alt-body');
  corps.id = ALT_BODY_ID;
  alt.append(resume, corps);
  panel.appendChild(alt);

  return panel;
}

/* ---------- Recalcul complet, dérivé du DOM courant ---------- */

function actualiser(layout, panel) {
  securise(() => {
    /* E093-04 : couverture lue dans la matrice, sans chiffre codé en dur. */
    const nbPoints = entete(/^(\d+)/, txt(q(layout, '.points-title'))) || '0';
    const eras = tous(layout, '.points-era').length;
    const domainList = domaines(layout);
    const cells = tous(layout, '.points-cell.has-points').length;
    const perimetre = entete(/^(\d+)/, txt(q(layout, '.points-detail .view-kicker')));
    ecrit(panel, COVERAGE_ID,
      `Couverture lue dans la matrice : ${nbPoints} point(s) isolé(s) · ${eras} ère(s) · ` +
      `${domainList.length} domaine(s) · ${cells} case(s) renseignée(s)` +
      (perimetre ? ` · ${perimetre} point(s) dans le périmètre courant.` : '.'));

    /* E093-05 : filtres actifs lus dans les contrôles existants. */
    const selectDomaine = selectParLabel(layout, 'domaine');
    const selectFamille = selectParLabel(layout, 'famille');
    const actifDomaine = valeurActive(selectDomaine);
    const actifFamille = valeurActive(selectFamille);
    ecrit(panel, FILTERS_ID,
      `Filtres actifs : domaine ${actifDomaine ? `« ${actifDomaine} »` : 'non vérifiable'} · ` +
      `famille ${actifFamille ? `« ${actifFamille} »` : 'non vérifiable'}.`);

    /* E093-06 : familles du point affiché et du corpus, sans invention. */
    const duPoint = famillesDuPoint(layout);
    const duCorpus = clesCorpus(selectFamille);
    FAMILIES.forEach((famille) => {
      const item = panel.querySelector(`.points-v2-e093-family[data-key="${famille.key}"]`);
      if (!item) return;
      const badge = item.querySelector('.points-v2-e093-badge');
      const surPoint = duPoint.has(famille.key);
      const etat = surPoint ? 'oui' : 'non';
      if (item.dataset.v2e093SurPoint !== etat) item.dataset.v2e093SurPoint = etat;
      const texteBadge = surPoint
        ? `✓ Sur le point affiché${duCorpus.has(famille.key) ? ' · présente dans le corpus' : ''}.`
        : `✗ Absente du point affiché${duCorpus.size && !duCorpus.has(famille.key) ? ' · absente du corpus' : ''}.`;
      if (badge && badge.textContent !== texteBadge) badge.textContent = texteBadge;
    });

    /* E093-07 : profil du point affiché, lu dans .points-meta (points.js:101-108). */
    const metaSpans = tous(q(layout, '.points-meta'), 'span');
    const noeudConfiance = q(layout, '.points-meta .confidence');
    const domainePoint = txt(metaSpans[0]) || 'non renseigné';
    const echelle = txt(metaSpans[1]) || 'non renseignée';
    const temps = txt(metaSpans[2]) || 'non renseigné';
    const confiance = txt(noeudConfiance) || 'non renseignée';
    ecrit(panel, PROFILE_ID,
      `Profil du point affiché : domaine ${domainePoint} · échelle ${echelle} · temps ${temps} · ` +
      `confiance ${confiance} (${libelleConfiance(confiance)}) · ${duPoint.size} famille(s) cumulée(s) : ` +
      `${listeFamilles(duPoint) || 'aucune'}.`);

    /* E093-09 : l'alternative textuelle reprend les mêmes fait et chiffres. */
    const corps = panel.querySelector('#' + ALT_BODY_ID);
    if (corps) {
      const paragraphes = [
        `Couverture : ${nbPoints} point(s), ${eras} ère(s), ${domainList.length} domaine(s) : ${domainList.join(', ') || 'aucun'}.`,
        `Filtres : domaine ${actifDomaine || 'non vérifiable'} ; famille ${actifFamille || 'non vérifiable'}.`,
        `Familles sur le point affiché (${duPoint.size}) : ${listeFamilles(duPoint) || 'aucune'}.`,
        `Profil : domaine ${domainePoint}, échelle ${echelle}, temps ${temps}, confiance ${confiance}. ${STEPS[0]} ${STEPS[3]}`,
        FAMILIES.map((famille) =>
          `${famille.label} (forme ${famille.forme}) : ${duPoint.has(famille.key) ? 'présente' : 'absente'} sur le point affiché. Exemple : ${famille.exemple}`
        ).join(' '),
      ].map((texte) => el('p', 'points-v2-e093-alt-item', texte));
      corps.replaceChildren(...paragraphes);
    }
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E093', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const viewId = typeof ctx.viewId === 'string' ? ctx.viewId : '';
    if (viewId && viewId !== 'points' && viewId !== 'pointsv2') return;
    const layout = ctx.layout;
    if (!layout || typeof layout.querySelector !== 'function') return;
    if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

    /* E093-01 / -10 : un seul CSS, un seul panneau, garde d'existence. */
    ctx.css(CSS_ID, CSS);
    const matrix = layout.querySelector('.points-matrix') || layout;

    let panel = document.getElementById(PANEL_ID);
    if (panel && !layout.contains(panel)) panel.remove();
    if (!panel) panel = construitPanneau(ctx);

    /* Insertion non destructive : après la carte de la passe 1, sinon après le
     * titre de la matrice, sinon en fin de matrice. */
    const ancre = layout.querySelector('#points-e093-map')
      || layout.querySelector('.points-title')
      || layout.querySelector('.points-grid');
    placeApres(panel, matrix, ancre);

    /* E093-10 : mouvement réduit lu une fois par rendu, signalé en attribut. */
    securise(() => {
      const reduit = Boolean(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion());
      layout.setAttribute(MOTION_ATTR, reduit ? 'reduce' : 'normal');
    });

    actualiser(layout, panel);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
