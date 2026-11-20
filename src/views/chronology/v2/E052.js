import { register } from './registry.js';

/* Lentille E052 — Passe V2 CHRONOLOGIE (domaine F : sémantique & données).
 *
 * Thème : « aucune date codée en dur ». Dix chantiers uniques et non
 * chevauchants, E052-01 à E052-10, tous observables dans le DOM ou dans la
 * feuille de style injectée.
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E052.md
 * Fichier possédé : src/views/chronology/v2/E052.js uniquement. Aucun fichier
 * partagé (registry.js, index.js, styles.css, src/views/chronology.js) n'est
 * modifié ; la passe 1, les autres lentilles et les autres passes ne sont ni
 * touchées ni doublées.
 *
 * Contrat exploité : viewId ('chronologyv2'), stage, layout, css, el,
 * reducedMotion. Le registre V2 ne fournit pas de say() : la lentille n'ajoute
 * AUCUNE région live, elle affiche son état en texte visible ordinaire.
 *
 * Invariants :
 * - un seul register('E052', …) ; une seule feuille ctx.css('chronology-v2-e052', …) ;
 * - tous les IDs préfixés 'chronology-v2-e052-' avec garde d'existence ;
 * - zéro millésime littéral : chaque année est lue dans un dataset du DOM
 *   (data-start, data-end, data-year) ou dérivée par calcul ;
 * - zéro console.*, fetch/XHR, Math.random, innerHTML, timer, rAF, écouteur ;
 * - français partout (commentaires, libellés, valeurs de dataset).
 *
 * Note d'autonomie : la vue V2 n'étant pas possédée, la découverte des
 * porteuses de date est multi-critères (dataset, classes, <time>). Lorsque le
 * DOM ne fournit aucune date, le panneau l'affiche explicitement au lieu d'en
 * inventer une : c'est précisément le sens du thème E052.
 */

const CSS_ID = 'chronology-v2-e052';
const MAIN_ID = 'atlas-chrono-main';
const ERAS_ID = 'atlas-chrono-eras';
const EVENTS_ID = 'atlas-chrono-events';
const TOOLS_ID = 'atlas-chrono-tools';

/* E052-10 : tous les IDs sont stables, préfixés et réutilisés entre rendus. */
const IDS = {
  panel: 'chronology-v2-e052-panel',
  title: 'chronology-v2-e052-title',
  lede: 'chronology-v2-e052-lede',
  inventory: 'chronology-v2-e052-inventory',
  provenance: 'chronology-v2-e052-provenance',
  format: 'chronology-v2-e052-format',
  order: 'chronology-v2-e052-order',
  durations: 'chronology-v2-e052-durations',
  machine: 'chronology-v2-e052-machine',
  orphans: 'chronology-v2-e052-orphans',
  coherence: 'chronology-v2-e052-coherence',
  signature: 'chronology-v2-e052-signature',
  freshness: 'chronology-v2-e052-freshness',
  metric: 'chronology-v2-e052-metric',
};

/* E052-09 : graine de hachage déterministe (jamais aléatoire). */
const GRAINE_HASH = 5381;

let rendus = 0;
let signaturePrecedente = null;

/* E052-01, -02, -10 : une seule feuille. Le panneau est un bloc en flux normal
   inséré avant les outils : il ne recouvre ni la frise ni la fiche et n'ajoute
   aucun arrêt de tabulation. Aucune animation propre n'est déclarée. */
const CSS = `
  #${IDS.panel} {
    margin: 12px 0 14px; padding: 10px 12px 11px;
    border: 1px solid var(--line); border-left: 3px solid var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${IDS.panel} .e052-titre {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 13px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${IDS.panel} .e052-lede { margin: 0 0 8px; color: var(--muted); }
  #${IDS.panel} .e052-sous-titre {
    margin: 9px 0 4px; color: var(--gold-bright); font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${IDS.panel} p { margin: 0 0 5px; }
  #${IDS.panel} ul, #${IDS.panel} ol { margin: 0 0 5px; padding-left: 18px; }
  #${IDS.panel} li { margin: 0 0 2px; }
  #${IDS.panel} .e052-valeur { color: var(--ink); }
  #${IDS.panel} .e052-note { color: var(--muted-2); font-size: 9px; }
  #${IDS.panel} .e052-metrique { margin: 8px 0 0; color: var(--gold-bright); }
  #${IDS.panel}[data-e052-orphelins="0"] .e052-orphelins { color: var(--muted); }
  #${IDS.panel}[data-e052-orphelins="1"] .e052-orphelins {
    color: var(--gold-bright); font-weight: 600;
  }
  #${IDS.panel}[data-e052-reduit="1"],
  #${IDS.panel}[data-e052-reduit="1"] * { transition: none !important; animation: none !important; }
  @media (prefers-reduced-motion: reduce) {
    #${IDS.panel}, #${IDS.panel} * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    #${IDS.panel} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${IDS.panel} .e052-titre, #${IDS.panel} .e052-sous-titre,
    #${IDS.panel} .e052-metrique, #${IDS.panel} .e052-orphelins { color: CanvasText; }
  }
  @media (max-width: 620px) {
    #${IDS.panel} { padding: 8px 9px 9px; }
    #${IDS.panel} ul, #${IDS.panel} ol { padding-left: 15px; }
  }
`;

/* E052-03 : formatage d'une année dérivé du seul signe de la valeur lue dans
   le DOM. Aucun millésime de référence n'apparaît dans cette fonction. */
function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

/* E052-06 : année astronomique ISO 8601 pour l'attribut datetime des <time>.
   L'année 1 av. J.-C. devient 0000 ; les bornes positives sont complétées. */
function isoYear(year) {
  const expanded = year < 0 ? year + 1 : year;
  if (expanded < 0) return `-${String(Math.abs(expanded)).padStart(4, '0')}`;
  return String(expanded).padStart(4, '0');
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent pas au texte. */
function ecrire(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E052-10 : garde d'existence. Un nœud retrouvé dans un ancien parent détaché
   est déplacé, jamais cloné : un seul panneau, quels que soient les re-rendus. */
function assurerNoeud(fabriquer, id, balise, classe, parent) {
  let node = document.getElementById(id);
  if (!node) {
    node = fabriquer(balise, classe);
    node.id = id;
  } else if (classe && !node.classList.contains(classe)) {
    node.classList.add(classe);
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E052-01, -02 : lecture unique des dates. Toutes les valeurs proviennent du
   dataset rendu par la vue ; aucune constante calendaire n'est introduite. */
function lireDates() {
  const erasRoot = document.getElementById(ERAS_ID);
  const eventsRoot = document.getElementById(EVENTS_ID);
  const eras = [];
  const events = [];

  if (erasRoot) {
    erasRoot.querySelectorAll('.era-band[data-start][data-end]').forEach((band) => {
      const start = Number(band.dataset.start);
      const end = Number(band.dataset.end);
      if (Number.isFinite(start) && Number.isFinite(end)) {
        eras.push({ node: band, id: band.dataset.eraId || band.id || '', start, end });
      }
    });
  }
  if (eventsRoot) {
    eventsRoot.querySelectorAll('li[data-year]').forEach((item) => {
      const year = Number(item.dataset.year);
      if (Number.isFinite(year)) {
        events.push({
          node: item,
          id: item.dataset.eventId || item.id || '',
          year,
          eraId: item.dataset.eraId || '',
          label: item.querySelector('.event-year'),
        });
      }
    });
  }
  return { eras, events };
}

/* E052-09 : empreinte déterministe de l'ensemble des dates lues. Elle change
   si — et seulement si — une donnée du DOM change. Aucun aléa, aucun horodatage. */
function empreinteDates(eras, events) {
  const brut = [
    ...eras.map((item) => `${item.id}:${item.start}:${item.end}`),
    ...events.map((item) => `${item.id}:${item.year}:${item.eraId}`),
  ].join('|');
  let hash = GRAINE_HASH;
  for (let index = 0; index < brut.length; index += 1) {
    hash = ((hash << 5) + hash + brut.charCodeAt(index)) | 0;
  }
  return `${brut.length}-${(hash >>> 0).toString(16)}`;
}

function sousTitre(fabriquer, texte) {
  return fabriquer('p', 'e052-sous-titre', texte);
}

/* E052-01 — inventaire des porteuses de date. */
function chantierInventaire(fabriquer, section, dates) {
  const avecAnneeLisible = dates.events.filter((item) => item.label).length;
  const avecDatetime = document.querySelectorAll(
    `#${EVENTS_ID} time[datetime], #${ERAS_ID} time[datetime]`
  ).length;
  const lignes = [
    `Ères — bornes data-start / data-end : ${dates.eras.length}`,
    `Repères — année data-year : ${dates.events.length}`,
    `Repères — année lisible .event-year : ${avecAnneeLisible}`,
    `Horodatages <time datetime> : ${avecDatetime}`,
  ];
  const liste = fabriquer('ul');
  lignes.forEach((texte) => liste.appendChild(fabriquer('li', 'e052-valeur', texte)));
  section.replaceChildren(liste);
  section.dataset.e052Porteuses = String(dates.eras.length + dates.events.length);
  section.dataset.e052Lisibles = String(avecAnneeLisible);
  section.dataset.e052Datetime = String(avecDatetime);
  return dates.eras.length + dates.events.length;
}

/* E052-02 — provenance déclarée : chaque nœud est étiqueté de l'attribut DOM
   dont il tire sa date. Aucune date n'est affirmée sans source. */
function chantierProvenance(fabriquer, section, dates) {
  dates.eras.forEach((item) => {
    item.node.dataset.e052Source = 'data-start|data-end';
  });
  dates.events.forEach((item) => {
    item.node.dataset.e052Source = 'data-year';
    if (item.label) item.label.dataset.e052Source = 'data-year';
  });
  const liste = fabriquer('ul');
  [
    'Ère : data-start → borne initiale ; data-end → borne finale (frise).',
    'Repère : data-year → année du repère (liste).',
    'Année lisible : texte .event-year dérivé de data-year.',
  ].forEach((texte) => liste.appendChild(fabriquer('li', 'e052-note', texte)));
  const total = dates.eras.length + dates.events.length;
  liste.appendChild(fabriquer('li', 'e052-valeur', `${total} nœud(s) étiqueté(s) data-e052-source.`));
  section.replaceChildren(liste);
  section.dataset.e052Etiquetes = String(total);
  return total;
}

/* E052-03 — formatage dérivé du signe : on annote chaque repère de sa valeur
   brute et de sa forme lisible, calculées l'une de l'autre, sans littéral. */
function chantierFormat(fabriquer, section, dates) {
  const liste = fabriquer('ul');
  dates.events.slice(0, 8).forEach((item) => {
    const forme = formatYear(item.year);
    item.node.dataset.e052Brut = String(item.year);
    item.node.dataset.e052Forme = forme;
    liste.appendChild(fabriquer('li', 'e052-valeur',
      `${item.id || 'repère'} : ${item.year} → « ${forme} » (signe : ${item.year < 0 ? 'négatif' : 'positif ou nul'}).`));
  });
  if (!dates.events.length) {
    liste.appendChild(fabriquer('li', 'e052-note', 'Aucun repère daté : aucune année à formater, donc aucune date à inventer.'));
  }
  section.replaceChildren(liste);
  section.dataset.e052Formates = String(Math.min(dates.events.length, 8));
  return section.dataset.e052Formates;
}

/* E052-04 — ordre chronologique dérivé des années du DOM, jamais figé dans une
   liste de constantes. Le rang affiché est recalculé à chaque rendu. */
function chantierOrdre(fabriquer, section, dates) {
  const tries = dates.events.slice().sort((a, b) => a.year - b.year);
  const liste = fabriquer('ol');
  tries.slice(0, 10).forEach((item, index) => {
    liste.appendChild(fabriquer('li', 'e052-valeur',
      `${index + 1}. ${item.id || 'repère'} — ${formatYear(item.year)}`));
  });
  if (!tries.length) {
    liste.appendChild(fabriquer('li', 'e052-note', 'Aucune donnée : l’ordre reste vide plutôt que présomptif.'));
  }
  section.replaceChildren(liste);
  section.dataset.e052Ordonnes = String(tries.length);
  return tries;
}

/* E052-05 — durées et écarts calculés depuis les bornes et années lues. */
function chantierDurees(fabriquer, section, dates, tries) {
  const liste = fabriquer('ul');
  dates.eras.forEach((item) => {
    const amplitude = item.end - item.start;
    item.node.dataset.e052Amplitude = String(amplitude);
    liste.appendChild(fabriquer('li', 'e052-valeur',
      `Ère ${item.id || 'sans nom'} : ${amplitude} an(s) (${formatYear(item.start)} → ${formatYear(item.end)}).`));
  });
  let ecarts = 0;
  for (let index = 1; index < tries.length; index += 1) {
    const ecart = tries[index].year - tries[index - 1].year;
    tries[index].node.dataset.e052EcartPrecedent = String(ecart);
    ecarts += 1;
  }
  liste.appendChild(fabriquer('li', 'e052-note',
    `${ecarts} écart(s) entre repères consécutifs calculés par soustraction des données.`));
  section.replaceChildren(liste);
  section.dataset.e052Amplitudes = String(dates.eras.length);
  section.dataset.e052Ecarts = String(ecarts);
}

/* E052-06 — horodatage machine <time datetime> dérivé de data-year. */
function chantierMachine(fabriquer, section, dates) {
  let ajoutes = 0;
  dates.events.forEach((item) => {
    let time = item.node.querySelector('.e052-time');
    if (!time) {
      time = fabriquer('time', 'e052-time');
      item.node.appendChild(time);
    }
    time.dateTime = isoYear(item.year);
    time.dataset.e052Source = 'data-year';
    ecrire(time, formatYear(item.year));
    ajoutes += 1;
  });
  const paragraphe = fabriquer('p', 'e052-valeur',
    `${ajoutes} repère(s) porteur(s) d'un <time datetime> calculé depuis le DOM (année astronomique ISO 8601 ; 1 av. J.-C. = 0000).`);
  section.replaceChildren(paragraphe);
  section.dataset.e052Times = String(ajoutes);
  return ajoutes;
}

/* E052-07 — années orphelines : un texte à quatre chiffres sans source de
   dataset est signalé « à vérifier », jamais complété par une date inventée. */
function chantierOrphelins(fabriquer, section, dates) {
  const sources = new Set([
    ...dates.events.map((item) => String(item.year)),
    ...dates.eras.flatMap((item) => [String(item.start), String(item.end)]),
  ]);
  const orphelins = [];
  const zone = document.getElementById(EVENTS_ID);
  if (zone) {
    zone.querySelectorAll('.event-year').forEach((node) => {
      const texte = (node.textContent || '').trim();
      const correspondance = /\b\d{4}\b/.exec(texte);
      const brut = correspondance ? String(Number(correspondance[0])) : '';
      if (brut && !sources.has(brut)) {
        node.dataset.e052Orphelin = '1';
        orphelins.push(texte);
      }
    });
  }
  section.classList.add('e052-orphelins');
  const paragraphe = fabriquer('p', 'e052-valeur', orphelins.length
    ? `${orphelins.length} année(s) sans source DOM détectée(s) : ${orphelins.join(', ')}. Elles sont signalées, non corrigées.`
    : 'Aucune année orpheline : chaque millésime visible remonte à un dataset. Aucune date n’a été supposée.');
  section.replaceChildren(paragraphe);
  section.dataset.e052Orphelins = orphelins.length ? '1' : '0';
  section.dataset.e052NbOrphelins = String(orphelins.length);
  return orphelins.length;
}

/* E052-08 — cohérence ère ↔ repère : l'appartenance est vérifiée en comparant
   data-year aux bornes data-start / data-end de l'ère du DOM. */
function chantierCoherence(fabriquer, section, dates) {
  let coherents = 0;
  let incoherents = 0;
  const liste = fabriquer('ul');
  dates.events.forEach((item) => {
    const era = dates.eras.find((candidate) => candidate.id === item.eraId);
    if (!era) {
      item.node.dataset.e052Coherence = 'sans-ere';
      incoherents += 1;
      return;
    }
    const dedans = item.year >= era.start && item.year <= era.end;
    item.node.dataset.e052Coherence = dedans ? 'oui' : 'non';
    if (dedans) coherents += 1;
    else {
      incoherents += 1;
      liste.appendChild(fabriquer('li', 'e052-valeur',
        `${item.id || 'repère'} : ${formatYear(item.year)} hors de ${formatYear(era.start)} → ${formatYear(era.end)}.`));
    }
  });
  liste.appendChild(fabriquer('li', 'e052-note',
    `${coherents} repère(s) cohérent(s), ${incoherents} incohérent(s) ou sans ère — jugement porté sur les seules données du DOM.`));
  section.replaceChildren(liste);
  section.dataset.e052Coherents = String(coherents);
  section.dataset.e052Incoherents = String(incoherents);
  return incoherents;
}

/* E052-09 — empreinte des dates : valeur de synthèse calculée, pas collée. */
function chantierSignature(fabriquer, section, empreinte, dates) {
  const paragraphe = fabriquer('p', 'e052-valeur',
    `Empreinte des dates : ${empreinte}. Elle dérive de ${dates.eras.length + dates.events.length} valeur(s) lue(s) et varie avec elles.`);
  section.replaceChildren(paragraphe);
  section.dataset.e052Signature = empreinte;
  return empreinte;
}

/* E052-10 — fraîcheur inter-rendus : les dates sont relues à chaque rendu,
   jamais mises en cache. On compare l'empreinte courante à la précédente. */
function chantierFraicheur(fabriquer, section, empreinte) {
  rendus += 1;
  const change = signaturePrecedente !== null && signaturePrecedente !== empreinte;
  const stable = signaturePrecedente === null || !change;
  signaturePrecedente = empreinte;
  const paragraphe = fabriquer('p', 'e052-valeur',
    `Dates recalculées ${rendus} fois depuis le DOM ; empreinte ${change ? 'modifiée' : 'inchangée'} entre rendus (${empreinte}).`);
  section.replaceChildren(paragraphe);
  section.dataset.e052Rendus = String(rendus);
  section.dataset.e052Change = change ? '1' : '0';
  section.dataset.e052Stable = stable ? '1' : '0';
  return change;
}

function install(ctx) {
  const fabriquer = typeof ctx.el === 'function' ? ctx.el : (balise, classe, texte) => {
    const node = document.createElement(balise);
    if (classe) node.className = classe;
    if (texte !== undefined) node.textContent = texte;
    return node;
  };
  if (!ctx.layout && !ctx.stage) return;
  if (ctx.viewId && ctx.viewId !== 'chronologyv2') return;

  const dates = lireDates();
  const empreinte = empreinteDates(dates.eras, dates.events);

  ctx.css(CSS_ID, CSS);

  const host = document.getElementById(MAIN_ID) || ctx.layout;
  const panel = assurerNoeud(fabriquer, IDS.panel, 'section', 'e052-panel', host);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', IDS.title);
  panel.dataset.e052Passe = 'v2';

  const titre = fabriquer('h2', 'e052-titre', 'Aucune date codée en dur');
  titre.id = IDS.title;
  const lede = fabriquer('p', 'e052-lede',
    'Chaque millésime affiché ici est lu dans le DOM ou calculé depuis lui. Aucune année n’est écrite en dur dans ce greffon : quand la donnée manque, le panneau le dit au lieu de la supposer.');

  const sections = {};
  const titres = {
    inventory: 'E052-01 · Porteuses de date recensées',
    provenance: 'E052-02 · Provenance déclarée de chaque date',
    format: 'E052-03 · Formatage dérivé du signe',
    order: 'E052-04 · Ordre chronologique dérivé',
    durations: 'E052-05 · Durées et écarts calculés',
    machine: 'E052-06 · Horodatages machine dérivés',
    orphans: 'E052-07 · Années orphelines signalées',
    coherence: 'E052-08 · Cohérence ère ↔ repère',
    signature: 'E052-09 · Empreinte des dates',
    freshness: 'E052-10 · Recalcul à chaque rendu',
  };
  Object.keys(titres).forEach((cle) => {
    const titreSection = sousTitre(fabriquer, titres[cle]);
    const section = assurerNoeud(fabriquer, IDS[cle], 'div', `e052-bloc e052-${cle}`, panel);
    sections[cle] = { titre: titreSection, section };
  });

  const total = chantierInventaire(fabriquer, sections.inventory.section, dates);
  const etiquetes = chantierProvenance(fabriquer, sections.provenance.section, dates);
  const formates = chantierFormat(fabriquer, sections.format.section, dates);
  const ordre = chantierOrdre(fabriquer, sections.order.section, dates);
  chantierDurees(fabriquer, sections.durations.section, dates, ordre);
  const times = chantierMachine(fabriquer, sections.machine.section, dates);
  const orphelins = chantierOrphelins(fabriquer, sections.orphans.section, dates);
  const incoherents = chantierCoherence(fabriquer, sections.coherence.section, dates);
  const signature = chantierSignature(fabriquer, sections.signature.section, empreinte, dates);
  const change = chantierFraicheur(fabriquer, sections.freshness.section, empreinte);

  const metric = assurerNoeud(fabriquer, IDS.metric, 'p', 'e052-metrique', panel);
  ecrire(metric, `Bilan : ${total} porteuse(s) · ${etiquetes} source(s) déclarée(s) · ${formates} forme(s) · ${times} <time> · ${orphelins} orpheline(s) · ${incoherents} incohérence(s) · empreinte ${signature}.`);

  const enfants = [titre, lede];
  Object.keys(titres).forEach((cle) => {
    enfants.push(sections[cle].titre, sections[cle].section);
  });
  enfants.push(metric);
  panel.replaceChildren(...enfants);

  panel.dataset.e052Total = String(total);
  panel.dataset.e052Etiquetes = String(etiquetes);
  panel.dataset.e052Formates = String(formates);
  panel.dataset.e052Times = String(times);
  panel.dataset.e052Orphelins = String(orphelins);
  panel.dataset.e052Incoherents = String(incoherents);
  panel.dataset.e052Signature = signature;
  panel.dataset.e052Change = String(change);
  const reduit = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  panel.dataset.e052Reduit = reduit ? '1' : '0';

  const tools = document.getElementById(TOOLS_ID);
  if (tools && tools.parentNode && panel.nextSibling !== tools) {
    tools.parentNode.insertBefore(panel, tools);
  }
}

register('E052', (ctx) => { install(ctx); });
