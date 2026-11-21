import { register } from './registry.js';

/* Lentille E100 — passe V2, domaine J (Pédagogie & narration).
 * Thème : « synthèse pédagogique de la vue Chronologie ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E100.md — chantiers E100-01 à E100-10.
 * Fichier possédé : src/views/chronology/v2/E100.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css, src/views/chronology.js,
 * passe 1 et autres lentilles laissés intacts).
 *
 * Contrat exploité : viewId 'chronologyv2', stage, layout, css, el, reducedMotion.
 * Une seule feuille CSS : ctx.css('chronology-v2-e100', CSS). Tous les IDs DOM
 * sont préfixés chronology-v2-e100- et protégés par une garde d'existence.
 *
 * Les dix chantiers sont disjoints et complémentaires :
 *   E100-01 l'essentiel en quatre points ; E100-02 chaîne ère → repère → point → source ;
 *   E100-03 tableau récapitulatif des ères ; E100-04 objectifs d'apprentissage ;
 *   E100-05 question de synthèse et réponse guidée ; E100-06 bilan des statuts ;
 *   E100-07 échelles local → global ; E100-08 fil rouge entre les vues ;
 *   E100-09 limites de la synthèse ; E100-10 mémo de révision imprimable.
 *
 * Invariants :
 * - exactement un register('E100', ctx => { … }) et une seule feuille CSS ;
 * - aucun mouvement propre, aucune boucle d'animation, aucun minuteur, aucun
 *   aléa, aucun appel réseau, aucune journalisation, aucun HTML brut ;
 * - aucune région live supplémentaire, aucun détournement de touche, aucun vol
 *   de focus, aucune mutation hors du panneau possédé ;
 * - chaque chiffre affiché dérive du DOM courant, jamais d'une constante inventée.
 */

const CSS_ID = 'chronology-v2-e100';
const PANEL_ID = 'chronology-v2-e100-synthese';
const TITLE_ID = 'chronology-v2-e100-titre';
const LEDER_ID = 'chronology-v2-e100-intro';
const PARTS_ID = 'chronology-v2-e100-parties';
const BILAN_ID = 'chronology-v2-e100-bilan';
const HOST_ID = 'atlas-chrono-main';

/* Un ID par chantier, tous préfixés, tous uniques. */
const ESSENTIEL_ID = 'chronology-v2-e100-essentiel';
const CHAINE_ID = 'chronology-v2-e100-chaine';
const ERES_ID = 'chronology-v2-e100-eres';
const OBJECTIFS_ID = 'chronology-v2-e100-objectifs';
const QUESTION_ID = 'chronology-v2-e100-question';
const CONFIANCE_ID = 'chronology-v2-e100-confiances';
const ECHELLE_ID = 'chronology-v2-e100-echelles';
const FIL_ROUGE_ID = 'chronology-v2-e100-fil-rouge';
const LIMITES_ID = 'chronology-v2-e100-limites';
const MEMO_ID = 'chronology-v2-e100-memo';
const MEMO_BOUTON_ID = 'chronology-v2-e100-memo-bouton';
const MEMO_CORPS_ID = 'chronology-v2-e100-memo-corps';

/* Feuille unique. Le panneau est un bloc en flux normal en fin de colonne :
 * il n'ajoute aucun arrêt de tabulation, ne masque ni la frise ni la fiche,
 * n'écrit dans aucune région live et n'intercepte aucune touche du routeur. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 0; padding: 12px 14px 14px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 11px; line-height: 1.55;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .e100-h-main {
    margin: 0 0 4px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 15px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e100-intro { margin: 0 0 10px; color: var(--muted); }
  #${PANEL_ID} .e100-parts { display: grid; gap: 0; }
  #${PANEL_ID} .e100-part { margin: 0; padding: 8px 0; border-top: 1px solid var(--line); }
  #${PANEL_ID} .e100-h {
    margin: 0 0 5px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 13px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .e100-note { margin: 0 0 6px; color: var(--muted-2); font-size: 10px; }
  #${PANEL_ID} .e100-takeaways { margin: 0; padding-left: 20px; }
  #${PANEL_ID} .e100-takeaway { margin: 0 0 3px; }
  #${PANEL_ID} .e100-chain { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e100-node {
    position: relative; flex: 1 1 130px; min-width: 0;
    padding: 6px 8px; border: 1px solid var(--line-strong); border-radius: 6px;
  }
  #${PANEL_ID} .e100-node:not(:last-child)::after {
    content: '\\2192'; position: absolute; right: -8px; top: 50%;
    color: var(--gold); transform: translateY(-50%);
  }
  #${PANEL_ID} .e100-node-num { margin-right: 5px; color: var(--gold-bright); font-weight: 600; }
  #${PANEL_ID} .e100-node small { display: block; margin-top: 2px; color: var(--muted); }
  #${PANEL_ID} .e100-table { width: 100%; border-collapse: collapse; margin: 0; font-size: 10px; }
  #${PANEL_ID} .e100-table caption { padding-bottom: 4px; color: var(--muted); text-align: left; }
  #${PANEL_ID} .e100-table th,
  #${PANEL_ID} .e100-table td { padding: 3px 5px; border: 1px solid var(--line); text-align: left; vertical-align: top; }
  #${PANEL_ID} .e100-table th { color: var(--gold-bright); font-weight: 600; }
  #${PANEL_ID} .e100-objectifs { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e100-obj { margin: 0 0 5px; padding: 5px 7px; border-left: 2px solid var(--gold); }
  #${PANEL_ID} .e100-obj strong { color: var(--gold-bright); }
  #${PANEL_ID} .e100-obj p { margin: 2px 0 0; }
  #${PANEL_ID} .e100-q { margin: 0 0 4px; color: var(--gold-bright); font-weight: 600; }
  #${PANEL_ID} .e100-a { margin: 0; }
  #${PANEL_ID} .e100-confiance { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e100-conf-row {
    display: flex; flex-wrap: wrap; gap: 2px 8px; justify-content: space-between;
    padding: 3px 0; border-top: 1px solid var(--line);
  }
  #${PANEL_ID} .e100-conf-label::before { content: '\\25A1 '; color: var(--muted); }
  #${PANEL_ID} .e100-conf-row[data-e100-statut="etabli"] .e100-conf-label::before { content: '\\25CF '; }
  #${PANEL_ID} .e100-conf-row[data-e100-statut="dispute"] .e100-conf-label::before { content: '\\25B2 '; }
  #${PANEL_ID} .e100-conf-row[data-e100-statut="silence"] .e100-conf-label::before { content: '\\2014 '; }
  #${PANEL_ID} .e100-conf-n { color: var(--gold-bright); }
  #${PANEL_ID} .e100-ladder { margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e100-rung {
    display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: baseline;
    padding: 4px 0 4px 10px; border-left: 2px solid var(--line-strong);
  }
  #${PANEL_ID} .e100-rung:nth-child(2) { border-left-color: var(--gold); }
  #${PANEL_ID} .e100-rung:nth-child(3) { border-left-color: var(--gold-bright); }
  #${PANEL_ID} .e100-rung-name { flex: 0 0 68px; color: var(--gold-bright); font-weight: 600; }
  #${PANEL_ID} .e100-rung p { flex: 1 1 auto; margin: 0; }
  #${PANEL_ID} .e100-views { display: flex; flex-wrap: wrap; gap: 4px; margin: 0; padding: 0; list-style: none; }
  #${PANEL_ID} .e100-view { padding: 2px 6px; border: 1px solid var(--line-strong); border-radius: 4px; }
  #${PANEL_ID} .e100-view.e100-current { border-color: var(--gold); color: var(--gold-bright); font-weight: 600; }
  #${PANEL_ID} .e100-limits { margin: 0; padding-left: 18px; }
  #${PANEL_ID} .e100-limits li { margin: 0 0 3px; }
  #${PANEL_ID} .e100-memo-btn {
    min-height: 36px; min-width: 36px; margin: 2px 0 6px; padding: 6px 10px;
    border: 1px solid var(--line-strong); border-radius: 6px;
    background: transparent; color: var(--gold-bright);
    font: inherit; font-size: 10px; cursor: pointer;
  }
  #${PANEL_ID} .e100-memo-body {
    display: none; padding: 6px 8px;
    border: 1px dashed var(--line-strong); border-radius: 6px;
  }
  #${PANEL_ID} .e100-memo[data-e100-memo-open="1"] .e100-memo-body { display: block; }
  #${PANEL_ID} .e100-memo-body p { margin: 0 0 4px; }
  #${PANEL_ID} :focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  #${PANEL_ID} .e100-bilan {
    margin: 10px 0 0; padding-top: 7px;
    border-top: 1px solid var(--line); color: var(--muted-2); font-size: 10px;
  }
  @media (max-width: 620px) {
    #${PANEL_ID} .e100-node { flex-basis: 100%; }
    #${PANEL_ID} .e100-node::after { display: none; }
    #${PANEL_ID} .e100-rung-name { flex-basis: 100%; }
    #${PANEL_ID} .e100-table { font-size: 9px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} * {
      animation: none !important; transition: none !important; scroll-behavior: auto !important;
    }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} {
      border: 1px solid CanvasText; border-left: 3px solid CanvasText;
      background: Canvas; color: CanvasText;
    }
    #${PANEL_ID} .e100-h-main,
    #${PANEL_ID} .e100-h,
    #${PANEL_ID} .e100-q,
    #${PANEL_ID} .e100-conf-label,
    #${PANEL_ID} .e100-rung-name,
    #${PANEL_ID} .e100-view.e100-current,
    #${PANEL_ID} .e100-memo-btn { color: CanvasText; }
    #${PANEL_ID} .e100-memo-btn { border: 1px solid CanvasText; }
  }
  @media print {
    #${PANEL_ID} { border-color: #000; background: #fff; color: #000; }
    #${PANEL_ID} .e100-memo-btn { display: none; }
    #${PANEL_ID} .e100-memo-body { display: block; }
  }
`;

/* Libellés narratifs : ils décrivent la synthèse, ils ne réimplémentent aucune
 * règle métier et n'inventent aucun fait historique. */
const CHAIN = [
  ['Ère', 'Le cadre de temps qui porte les repères.'],
  ['Repère', 'L’événement situé sur l’axe.'],
  ['Point', 'L’unité de connaissance attachée au repère.'],
  ['Source', 'La trace qui rend le point vérifiable.'],
];

const OBJECTIFS = [
  ['Situer', 'Repérer une ère puis un repère sur l’axe : la frise porte cette lecture.'],
  ['Comprendre', 'Relier un repère à son point et à sa source : la fiche porte cette lecture.'],
  ['Distinguer', 'Séparer établi, disputé et silence : les filtres et les badges portent cette lecture.'],
];

const ECHELLES = [
  ['Local', 'Un repère, une date, une source : l’échelle de l’événement.'],
  ['Régional', 'Un ensemble de repères dans une même ère : l’échelle du pays.'],
  ['Global', 'La suite des ères sur l’axe : l’échelle de la vue entière.'],
];

const VUES = [
  ['Monde', 'porte la vue d’ensemble'],
  ['Constellation', 'porte les relations'],
  ['Géographie', 'porte l’espace'],
  ['Points', 'porte l’unité de fait'],
  ['Récit', 'porte la narration'],
  ['Chronologie', 'porte le temps — vue courante'],
];

const LIMITES = [
  'La frise montre une suite, pas une causalité : elle ne dit pas pourquoi un repère suit l’autre.',
  'Un statut disputé reste disputé : la synthèse ne tranche pas à la place des sources.',
  'Ce qui sort du périmètre du catalogue n’apparaît pas : un silence de la frise n’est pas une preuve d’absence.',
];

let installs = 0;

/* Garde d'existence : un nœud déjà présent est réutilisé et déplacé dans le
 * parent courant. La coque reconstruisant le stage, un nœud de la rendu
 * précédent est détaché et n'est donc pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function nodes(selector, root) {
  try { return Array.from((root || document).querySelectorAll(selector)); }
  catch { return []; }
}

function label(node) {
  return ((node && node.textContent) || '').replace(/\s+/g, ' ').trim();
}

/* Les seuls chiffres affichés sont mesurés dans le DOM vivant. */
function measure() {
  const eras = nodes('.era-band, [data-era]');
  const events = nodes('.event-card, [data-event], [data-event-id]');
  const sources = nodes('[data-source], a[href^="http"], a[href^="https"]');
  return { eras, events, sources };
}

/* E100-06 : agrégation des statuts de confiance portés par le DOM. Aucun
 * marqueur trouvé ⇒ l'interface affiche « non renseigné », jamais un zéro
 * qui ferait croire à une absence de données vérifiée. */
function countConfidence() {
  const marked = nodes('[data-confidence], [data-confiance], [data-statut], [data-status], [data-trust]');
  const result = { etabli: 0, dispute: 0, silence: 0, marked: marked.length };
  marked.forEach((node) => {
    const raw = (
      node.getAttribute('data-confidence') || node.getAttribute('data-confiance') ||
      node.getAttribute('data-statut') || node.getAttribute('data-status') ||
      node.getAttribute('data-trust') || ''
    ).toLowerCase();
    if (/etabli|confirm|certain|fiable|high|verifie/.test(raw)) result.etabli += 1;
    else if (/disput|contest|debatt|incertain|low/.test(raw)) result.dispute += 1;
    else if (/silence|omis|absent|manquant|missing|tacu/.test(raw)) result.silence += 1;
  });
  return result;
}

function makePart(make, parent, id, suffix, heading) {
  const node = ensureNode(make, id, 'section', `e100-part e100-${suffix}`, parent);
  node.replaceChildren(make('h3', 'e100-h', heading));
  return node;
}

function install(ctx) {
  const make = ctx.el;
  if (typeof make !== 'function' || !ctx.layout) return;

  installs += 1;
  ctx.css(CSS_ID, CSS);

  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  const data = measure();
  const conf = countConfidence();
  const nbEres = data.eras.length;
  const nbRepères = data.events.length;
  const nbSources = data.sources.length;

  const host = document.getElementById(HOST_ID) || ctx.layout;
  const panel = ensureNode(make, PANEL_ID, 'section', 'e100-synthese', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', TITLE_ID);

  const title = make('h2', 'e100-h-main', 'Synthèse pédagogique de la Chronologie');
  title.id = TITLE_ID;
  const intro = make('p', 'e100-intro', 'Cette synthèse ne remplace ni la frise ni la fiche : elle en rappelle la logique et donne les repères pour la lire, la vérifier et en connaître les limites.');
  intro.id = LEDER_ID;

  const parts = make('div', 'e100-parts');
  parts.id = PARTS_ID;

  /* E100-01 — L'essentiel en quatre points. */
  const essentiel = makePart(make, parts, ESSENTIEL_ID, 'essentiel', '1. L’essentiel en quatre points');
  const takeaways = [
    `La Chronologie lit le temps comme un axe : ${nbEres} ère(s) et ${nbRepères} repère(s) détectés dans le DOM courant.`,
    'Une ère est un contenant, un repère est un événement daté, un point en est l’unité de sens.',
    `Un repère peut renvoyer à une source : ${nbSources} lien(s) ou marqueur(s) de source relevés.`,
    'Lire la frise, c’est distinguer ce qui est établi, ce qui est disputé et ce qui est tu.',
  ];
  const takeList = make('ol', 'e100-takeaways');
  takeaways.forEach((text) => takeList.appendChild(make('li', 'e100-takeaway', text)));
  essentiel.append(make('p', 'e100-note', 'Quatre phrases à retenir, calculées sur l’état présent de la vue.'), takeList);

  /* E100-02 — Chaîne conceptuelle ère → repère → point → source. */
  const chaine = makePart(make, parts, CHAINE_ID, 'chaine', '2. La chaîne ère → repère → point → source');
  const chain = make('ol', 'e100-chain');
  CHAIN.forEach(([name, desc], index) => {
    const node = make('li', 'e100-node');
    node.append(
      make('span', 'e100-node-num', String(index + 1)),
      make('span', 'e100-node-label', name),
      make('small', '', desc)
    );
    chain.appendChild(node);
  });
  chaine.append(make('p', 'e100-note', 'Du cadre le plus large à la preuve la plus fine : chaque maillon rend le suivant intelligible.'), chain);

  /* E100-03 — Tableau récapitulatif des ères. */
  const eres = makePart(make, parts, ERES_ID, 'eres', '3. Tableau récapitulatif des ères');
  const table = make('table', 'e100-table');
  const head = make('thead');
  const headRow = make('tr');
  ['Ordre', 'Ère', 'Repères associés'].forEach((text) => {
    const th = make('th', '', text);
    th.scope = 'col';
    headRow.appendChild(th);
  });
  head.appendChild(headRow);
  const body = make('tbody');
  if (data.eras.length === 0) {
    const row = make('tr');
    const cell = make('td', '', 'Aucune bande d’ère détectée dans le DOM.');
    cell.colSpan = 3;
    row.appendChild(cell);
    body.appendChild(row);
  } else {
    data.eras.forEach((era, index) => {
      const row = make('tr');
      const eraKey = era.getAttribute('data-era') || '';
      const attached = eraKey
        ? data.events.filter((event) => event.getAttribute('data-era') === eraKey).length
        : 0;
      row.append(
        make('td', '', String(index + 1)),
        make('td', '', label(era).slice(0, 60) || 'Ère sans étiquette'),
        make('td', '', attached ? String(attached) : 'non rattaché')
      );
      body.appendChild(row);
    });
  }
  table.append(make('caption', '', 'Ères relevées dans la frise, dans leur ordre de lecture'), head, body);
  eres.append(make('p', 'e100-note', 'Lecture du tableau : les libellés et les totaux sont lus sur les nœuds présents, sans donnée historique ajoutée.'), table);

  /* E100-04 — Carte des objectifs d'apprentissage. */
  const objectifs = makePart(make, parts, OBJECTIFS_ID, 'objectifs', '4. Ce que la vue vous apprend à faire');
  const objList = make('ul', 'e100-objectifs');
  OBJECTIFS.forEach(([name, desc]) => {
    const item = make('li', 'e100-obj');
    item.append(make('strong', '', name), make('p', '', desc));
    objList.appendChild(item);
  });
  objectifs.append(make('p', 'e100-note', 'Trois gestes, trois zones de la vue : la frise, la fiche, les filtres.'), objList);

  /* E100-05 — Question de synthèse et réponse guidée. */
  const question = makePart(make, parts, QUESTION_ID, 'question', '5. Question de synthèse');
  const answer = `On lit d’abord l’ère comme cadre, on y situe un repère (${nbRepères} relevés), puis on ouvre son point et l’on vérifie la source (${nbSources} marqueurs relevés). Si le statut est disputé, la synthèse le dit au lieu de le lisser.`;
  question.append(
    make('p', 'e100-q', 'Comment passe-t-on d’une ère à une affirmation vérifiable ?'),
    make('p', 'e100-a', answer)
  );

  /* E100-06 — Bilan agrégé des statuts de confiance. */
  const confiance = makePart(make, parts, CONFIANCE_ID, 'confiances', '6. Bilan des statuts de confiance');
  const confList = make('ul', 'e100-confiance');
  [
    ['etabli', 'Établi', conf.etabli],
    ['dispute', 'Disputé', conf.dispute],
    ['silence', 'Silence', conf.silence],
  ].forEach(([key, name, count]) => {
    const row = make('li', 'e100-conf-row');
    row.dataset.e100Statut = key;
    row.append(make('span', 'e100-conf-label', name), make('span', 'e100-conf-n', conf.marked ? String(count) : 'non renseigné'));
    confList.appendChild(row);
  });
  confiance.dataset.e100Etabli = String(conf.etabli);
  confiance.dataset.e100Dispute = String(conf.dispute);
  confiance.dataset.e100Silence = String(conf.silence);
  confiance.dataset.e100Marqueurs = String(conf.marked);
  confiance.append(
    make('p', 'e100-note', `Statuts agrégés depuis ${conf.marked} marqueur(s) présents dans le DOM ; les formes et les couleurs du texte portent la même information.`),
    confList
  );

  /* E100-07 — Échelles local → régional → global. */
  const echelle = makePart(make, parts, ECHELLE_ID, 'echelles', '7. Trois échelles de lecture');
  const ladder = make('ol', 'e100-ladder');
  ECHELLES.forEach(([name, desc]) => {
    const rung = make('li', 'e100-rung');
    rung.append(make('span', 'e100-rung-name', name), make('p', '', desc));
    ladder.appendChild(rung);
  });
  echelle.dataset.e100Scale = 'local-regional-global';
  echelle.append(make('p', 'e100-note', 'Changer d’échelle ne change pas les faits, seulement la question que l’on pose à la frise.'), ladder);

  /* E100-08 — Fil rouge entre les vues du catalogue. */
  const filRouge = makePart(make, parts, FIL_ROUGE_ID, 'fil-rouge', '8. Le fil rouge entre les vues');
  const viewList = make('ul', 'e100-views');
  VUES.forEach(([name, role]) => {
    const item = make('li', 'e100-view', `${name} — ${role}`);
    if (name === 'Chronologie') {
      item.classList.add('e100-current');
      item.setAttribute('aria-current', 'page');
    }
    viewList.appendChild(item);
  });
  filRouge.append(make('p', 'e100-note', 'La Chronologie ne résume pas les autres vues : elle leur fournit l’axe temps.'), viewList);

  /* E100-09 — Limites de la synthèse. */
  const limites = makePart(make, parts, LIMITES_ID, 'limites', '9. Ce que la synthèse ne peut pas dire');
  const limitList = make('ul', 'e100-limits');
  LIMITES.forEach((text) => limitList.appendChild(make('li', '', text)));
  limites.append(make('p', 'e100-note', 'Trois limites explicites pour éviter de prendre la frise pour une preuve de causalité.'), limitList);

  /* E100-10 — Mémo de révision imprimable, avec bascule locale indépendante. */
  const memo = makePart(make, parts, MEMO_ID, 'memo', '10. Mémo de révision (imprimable)');
  const memoButton = make('button', 'e100-memo-btn', 'Afficher le mémo condensé');
  memoButton.id = MEMO_BOUTON_ID;
  memoButton.type = 'button';
  memoButton.setAttribute('aria-pressed', 'false');
  memoButton.setAttribute('aria-controls', MEMO_CORPS_ID);
  const memoBody = make('div', 'e100-memo-body');
  memoBody.id = MEMO_CORPS_ID;
  memoBody.append(
    make('p', '', `En une phrase : la vue Chronologie organise ${nbEres} ère(s) et ${nbRepères} repère(s) sur un axe, relie chaque repère à un point et à sa source, et distingue établi, disputé et silence.`),
    make('p', '', 'Repères de lecture : l’essentiel (§1), la chaîne ère → repère → point → source (§2), le tableau des ères (§3), les objectifs (§4), la question de synthèse (§5), les statuts (§6), les échelles (§7), le fil rouge (§8), les limites (§9).')
  );
  if (!memoButton.dataset.e100Bound) {
    memoButton.addEventListener('click', () => {
      const open = memo.dataset.e100MemoOpen !== '1';
      memo.dataset.e100MemoOpen = open ? '1' : '0';
      memoButton.setAttribute('aria-pressed', open ? 'true' : 'false');
      memoButton.textContent = open ? 'Masquer le mémo condensé' : 'Afficher le mémo condensé';
    });
    memoButton.dataset.e100Bound = '1';
  }
  memo.append(
    make('p', 'e100-note', 'La bascule n’agit que sur ce mémo : aucun changement de vue, aucun déplacement de focus.'),
    memoButton,
    memoBody
  );

  parts.replaceChildren(
    essentiel, chaine, eres, objectifs, question,
    confiance, echelle, filRouge, limites, memo
  );

  const bilan = ensureNode(make, BILAN_ID, 'p', 'e100-bilan', panel);
  write(bilan, `Synthèse chargée ${installs} fois · ères : ${nbEres} · repères : ${nbRepères} · sources : ${nbSources} · marqueurs de confiance : ${conf.marked} · Mouvement réduit : ${reduced ? 'oui' : 'non'}. Tous ces nombres sont lus dans le DOM.`);
  panel.dataset.e100Eres = String(nbEres);
  panel.dataset.e100Reperes = String(nbRepères);
  panel.dataset.e100Sources = String(nbSources);
  panel.dataset.e100Renders = String(installs);
  panel.dataset.e100Reduced = reduced ? '1' : '0';

  panel.replaceChildren(title, intro, parts, bilan);
}

register('E100', ctx => {
  install(ctx);
});
