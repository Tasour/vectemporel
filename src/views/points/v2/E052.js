import { register } from './registry.js';

/* Lentille V2 E052 — aucune date codée en dur (domaine F : sémantique & données).
 *
 * Dix chantiers neufs et non chevauchants, E052-01 à E052-10, tous vérifiables
 * dans le DOM ou dans la feuille injectée. La passe 1 (src/views/points/E052.js)
 * traite déjà l'ancre lue dans la fiche, le formatage du signe, les ères de la
 * matrice, l'ère courante, les compteurs du titre et du kicker, les replis, le
 * statut unique, la lecture sémantique et l'idempotence. La V2 ouvre donc dix
 * REGISTRES distincts : recensement des porteuses, provenance par nœud, forme
 * brute → lisible, ordre visible des ères, échelle des millésimes, horodatage
 * machine, années orphelines, cohérence des compteurs, empreinte déterministe
 * et recalcul à chaque rendu.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E052.md
 * Fichier possédé : src/views/points/v2/E052.js uniquement. Lectures seules :
 * src/views/points/E052.js et UNIFIED_AUDIT/POINTS/views/E052.md (passe 1),
 * src/views/points.js (DOM rendu), v2/registry.js (contrat ctx). La passe 1,
 * la vue, les autres lentilles, les registres et le CSS global ne sont ni
 * édités ni doublés.
 *
 * Contrat : module ESM, un seul register('E052', (ctx) => { … }), une seule
 * feuille ctx.css('points-v2-e052', …), ctx = { viewId:'pointsv2', stage,
 * layout } enrichi de css / el / reducedMotion (v2/registry.js:28-37).
 *
 * Invariants :
 * - tous les IDs préfixés 'points-v2-e052-' avec garde d'existence ;
 * - tout sélecteur CSS commence par '.points-v2-e052' ;
 * - zéro millésime littéral : chaque nombre est lu dans le DOM rendu ;
 * - zéro journalisation, zéro réseau, zéro aléa, zéro minuteur, zéro rAF,
 *   zéro écouteur ; zéro réinterprétation de balisage (ctx.el uniquement) ;
 * - français partout (commentaires, libellés, valeurs de dataset).
 */

const CSS_ID = 'points-v2-e052';

/* E052-10 : quatorze IDs stables, préfixés et réutilisés entre rendus. */
const IDS = {
  panel: 'points-v2-e052-panel',
  title: 'points-v2-e052-title',
  lede: 'points-v2-e052-lede',
  inventory: 'points-v2-e052-inventory',
  provenance: 'points-v2-e052-provenance',
  format: 'points-v2-e052-format',
  order: 'points-v2-e052-order',
  scale: 'points-v2-e052-scale',
  machine: 'points-v2-e052-machine',
  orphans: 'points-v2-e052-orphans',
  coherence: 'points-v2-e052-coherence',
  signature: 'points-v2-e052-signature',
  freshness: 'points-v2-e052-freshness',
  metric: 'points-v2-e052-metric',
};

/* E052-09 : graine de hachage déterministe (jamais aléatoire). Seule constante
 * numérique du module : un diviseur de hachage, non une année. */
const GRAINE_HASH = 5381;

let rendus = 0;
let signaturePrecedente = null;

/* E052-01, E052-10 : une seule feuille. Chaque sélecteur commence par
 * .points-v2-e052 : aucun effet hors de cette lentille. Le panneau est un bloc
 * en flux normal en fin de .points-layout : il ne recouvre ni la matrice ni le
 * détail et n'ajoute aucun arrêt de tabulation. Aucune animation propre. */
const CSS = `
  .points-v2-e052 {
    font: inherit; font-size: 10px; line-height: 1.5;
    color: var(--ink-soft, #d8d8d8); overflow-wrap: anywhere;
    font-variant-numeric: tabular-nums;
  }
  .points-v2-e052-panel {
    margin: 14px 0 0; padding: 11px 13px 12px;
    border: 1px solid var(--line, #5b5b5b); border-left: 3px solid var(--gold, #e6b96f);
    border-radius: 10px; background: rgba(8,11,16,.55);
  }
  .points-v2-e052-title {
    margin: 0 0 6px; color: var(--gold-bright, #e9c98f);
    font-family: var(--serif, serif); font-size: 14px; font-weight: bold;
    letter-spacing: 0; text-transform: none;
  }
  .points-v2-e052-lede { margin: 0 0 9px; color: var(--muted, #9a9a9a); }
  .points-v2-e052-sous-titre {
    margin: 9px 0 4px; color: var(--gold-bright, #e9c98f);
    font-family: var(--serif, serif); font-size: 11px; font-weight: bold;
    letter-spacing: 0; text-transform: none;
  }
  .points-v2-e052 p { margin: 0 0 5px; }
  .points-v2-e052 ul, .points-v2-e052 ol { margin: 0 0 5px; padding-left: 18px; }
  .points-v2-e052 li { margin: 0 0 2px; }
  .points-v2-e052-valeur { color: var(--ink, #eeeeee); }
  .points-v2-e052-note { color: var(--muted-2, #8a8a8a); font-size: 9px; }
  .points-v2-e052-metrique { margin: 8px 0 0; color: var(--gold-bright, #e9c98f); }
  .points-v2-e052 time { color: var(--gold-bright, #e9c98f); }
  .points-v2-e052[data-e052-orphelins="1"] .points-v2-e052-orphelins {
    color: var(--gold-bright, #e9c98f); font-weight: bold;
  }
  .points-v2-e052[data-e052-coherence="non"] .points-v2-e052-coherence {
    color: var(--gold-bright, #e9c98f); font-weight: bold;
  }
  .points-v2-e052[data-e052-reduit="1"],
  .points-v2-e052[data-e052-reduit="1"] * { transition: none !important; animation: none !important; }
  @media (prefers-reduced-motion: reduce) {
    .points-v2-e052, .points-v2-e052 * { transition: none !important; animation: none !important; }
  }
  @media (forced-colors: active) {
    .points-v2-e052-panel { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    .points-v2-e052-title, .points-v2-e052-sous-titre, .points-v2-e052-metrique,
    .points-v2-e052-valeur, .points-v2-e052 time { color: CanvasText; }
  }
  @media (max-width: 620px) {
    .points-v2-e052-panel { padding: 8px 9px 9px; }
    .points-v2-e052 ul, .points-v2-e052 ol { padding-left: 15px; }
  }
`;

/* --- lecture défensive du DOM rendu ------------------------------------- */

function un(root, selecteur) {
  try { return (root && root.querySelector) ? root.querySelector(selecteur) : null; }
  catch { return null; }
}

function tous(root, selecteur) {
  try { return (root && root.querySelectorAll) ? Array.from(root.querySelectorAll(selecteur)) : []; }
  catch { return []; }
}

function txt(noeud) {
  return noeud ? String(noeud.textContent || '').trim() : '';
}

/* Écriture dédupliquée : deux rendus sans changement ne touchent pas au texte. */
function ecrire(noeud, texte) {
  if (noeud && noeud.textContent !== texte) noeud.textContent = texte;
}

function setData(noeud, cle, valeur) {
  if (noeud && noeud.dataset && noeud.dataset[cle] !== valeur) noeud.dataset[cle] = valeur;
}

/* E052-10 : garde d'existence. Un nœud retrouvé dans un ancien parent détaché
 * est déplacé, jamais cloné : un seul panneau, quels que soient les re-rendus. */
function assurerNoeud(faire, id, balise, classe, parent) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = faire(balise, classe);
    noeud.id = id;
  } else if (classe && noeud.classList && !noeud.classList.contains(classe)) {
    noeud.classList.add(classe);
  }
  if (noeud.parentElement !== parent) parent.appendChild(noeud);
  return noeud;
}

/* E052-03, -05, -06 : extraction des millésimes d'une ancre qui peut être une
 * année simple, une année négative ou un intervalle (« brut/brut », « brut-brut »).
 * Le signe '−' n'est tenu pour négatif qu'en tête d'une composante, jamais
 * comme séparateur d'intervalle : aucune borne n'est supposée. */
function anneesDe(brut) {
  const s = String(brut == null ? '' : brut).trim();
  if (!s) return [];
  const resultat = [];
  s.split(/[\/–—]/).forEach((part) => {
    const p = part.trim();
    const modele = /^(-?\d{1,4})(?:\s*-\s*(\d{1,4}))?$/.exec(p);
    if (modele) {
      resultat.push(Number(modele[1]));
      if (modele[2] !== undefined) resultat.push(Number(modele[2]));
      return;
    }
    const negatif = /^-/.test(p);
    const nombres = (p.match(/\d{1,4}/g) || []).map(Number);
    if (negatif && nombres.length) nombres[0] = -nombres[0];
    nombres.forEach((n) => resultat.push(n));
  });
  return resultat.filter(Number.isFinite);
}

/* E052-03 : convention de lecture dérivée du seul signe de la valeur lue. */
function formatAnnee(n) {
  if (n < 0) return `${Math.abs(n)} av. J.-C.`;
  if (n === 0) return '0 (référence)';
  return `${n} apr. J.-C.`;
}

/* E052-06 : année astronomique ISO 8601 pour l'attribut datetime des <time>. */
function isoAnnee(n) {
  const etendue = n < 0 ? n + 1 : n;
  if (etendue < 0) return `-${String(Math.abs(etendue)).padStart(4, '0')}`;
  return String(etendue).padStart(4, '0');
}

/* E052-07 : collecte des nœuds texte, avec repli si TreeWalker est indisponible. */
function textes(noeud) {
  const resultat = [];
  if (!noeud) return resultat;
  if (typeof document.createTreeWalker === 'function' && typeof NodeFilter !== 'undefined') {
    try {
      const marcheur = document.createTreeWalker(noeud, NodeFilter.SHOW_TEXT);
      let courant;
      while ((courant = marcheur.nextNode())) resultat.push(courant);
      return resultat;
    } catch { /* repli récursif ci-dessous */ }
  }
  const visite = (n) => {
    if (!n) return;
    if (n.nodeType === 3) resultat.push(n);
    else if (n.childNodes) Array.from(n.childNodes).forEach(visite);
  };
  visite(noeud);
  return resultat;
}

/* Lecture unique, à chaque rendu : aucune valeur n'est mise en cache. */
function lire(layout) {
  const detail = un(layout, '.points-detail');
  const titre = txt(un(layout, '.points-title'));
  const kickerMatrice = txt(un(layout, '.points-matrix .view-kicker'));
  const kickerDetail = txt(un(detail, '.view-kicker'));
  const spans = tous(detail, '.points-meta > span');
  const brut = spans.length > 2 ? txt(spans[2]) : '';
  const ereCourante = txt(un(layout, '.points-grid-row.is-active .points-era'));
  const eres = tous(layout, '.points-grid-row:not(.is-head) .points-era').map(txt).filter(Boolean);
  const cellules = tous(layout, '.points-cell.has-points');
  const cellulesActives = tous(layout, '.points-grid-row.is-active .points-cell.has-points');
  const nbTitre = /(\d+)/.exec(titre);
  const nbDetail = /(\d+)/.exec(kickerDetail);
  return {
    detail, titre, kickerMatrice, kickerDetail, spans, brut, ereCourante, eres, cellules,
    nbTitre: nbTitre ? Number(nbTitre[1]) : null,
    nbDetail: nbDetail ? Number(nbDetail[1]) : null,
    annees: anneesDe(brut),
    sommeCellules: cellules.reduce((acc, c) => acc + (Number(txt(c)) || 0), 0),
    sommeCellulesActives: cellulesActives.reduce((acc, c) => acc + (Number(txt(c)) || 0), 0),
  };
}

function sousTitre(faire, texte) {
  return faire('p', 'points-v2-e052-sous-titre', texte);
}

/* E052-01 — inventaire des porteuses de date et de nombre, par sélecteur. */
function chantierInventaire(faire, section, donnees) {
  const anneesDetail = donnees.annees.length;
  const compteurs = [donnees.nbTitre, donnees.nbDetail].filter((n) => n !== null).length;
  const cellules = donnees.cellules.length;
  const lignes = [
    `Titre .points-title — total de points : ${donnees.nbTitre === null ? 'non fourni' : donnees.nbTitre}`,
    `Kicker .points-detail .view-kicker — périmètre : ${donnees.nbDetail === null ? 'non fourni' : donnees.nbDetail}`,
    `Champ .points-meta (3e span) — millésime(s) lisible(s) : ${anneesDetail}`,
    `Matrice .points-cell.has-points — cases porteuses d'un compte : ${cellules}`,
    `Ères .points-era — libellés dans la matrice : ${donnees.eres.length}`,
  ];
  const liste = faire('ul');
  lignes.forEach((texte) => liste.appendChild(faire('li', 'points-v2-e052-valeur', texte)));
  section.replaceChildren(liste);
  section.dataset.e052Porteuses = String(anneesDetail + compteurs + cellules);
  section.dataset.e052Annees = String(anneesDetail);
  return section.dataset.e052Porteuses;
}

/* E052-02 — provenance déclarée : chaque nœud est étiqueté du sélecteur dont
 * il tire sa valeur. Aucune valeur n'est affirmée sans source. */
function chantierProvenance(faire, section, donnees) {
  if (donnees.spans.length > 2) donnees.spans[2].dataset.e052Source = '.points-meta > span:nth-child(3)';
  const titre = un(donnees.detail.closest('.points-layout') || document, '.points-title');
  if (titre) titre.dataset.e052Source = '.points-title';
  const kicker = un(donnees.detail, '.view-kicker');
  if (kicker) kicker.dataset.e052Source = '.points-detail .view-kicker';
  donnees.cellules.forEach((cellule) => { cellule.dataset.e052Source = '.points-cell.has-points'; });
  const liste = faire('ul');
  [
    'Millésime : 3e span de .points-meta → champ time du point.',
    'Total : nombre dans .points-title → longueur du jeu de points.',
    'Périmètre : nombre dans .view-kicker du détail → points filtrés.',
    'Compte de case : texte de .points-cell.has-points → points par ère et domaine.',
  ].forEach((texte) => liste.appendChild(faire('li', 'points-v2-e052-note', texte)));
  const total = donnees.annees.length + (donnees.nbTitre === null ? 0 : 1)
    + (donnees.nbDetail === null ? 0 : 1) + donnees.cellules.length;
  liste.appendChild(faire('li', 'points-v2-e052-valeur', `${total} nœud(s) étiqueté(s) data-e052-source.`));
  section.replaceChildren(liste);
  section.dataset.e052Etiquetes = String(total);
  return total;
}

/* E052-03 — forme brute → forme lisible, calculée du seul signe de la valeur. */
function chantierFormat(faire, section, donnees) {
  const liste = faire('ul');
  const span = donnees.spans.length > 2 ? donnees.spans[2] : null;
  if (span) {
    span.dataset.e052Brut = donnees.brut || 'absent';
    span.dataset.e052Forme = donnees.annees.map(formatAnnee).join(' → ') || 'non fourni';
  }
  if (donnees.annees.length) {
    donnees.annees.slice(0, 8).forEach((n) => {
      liste.appendChild(faire('li', 'points-v2-e052-valeur',
        `${n} → « ${formatAnnee(n)} » (signe : ${n < 0 ? 'négatif' : n === 0 ? 'nul' : 'positif'}).`));
    });
  } else {
    liste.appendChild(faire('li', 'points-v2-e052-note',
      'Aucun millésime lisible : aucune forme à produire, donc aucune date à inventer.'));
  }
  section.replaceChildren(liste);
  section.dataset.e052Formates = String(Math.min(donnees.annees.length, 8));
  return Number(section.dataset.e052Formates);
}

/* E052-04 — ordre d'affichage des ères, relu dans la matrice, jamais figé. */
function chantierOrdre(faire, section, donnees) {
  const liste = faire('ol');
  donnees.eres.forEach((nom, index) => {
    const element = faire('li', 'points-v2-e052-valeur',
      `${index + 1}. ${nom}${nom === donnees.ereCourante ? ' — ère affichée' : ''}`);
    element.dataset.e052Position = String(index + 1);
    liste.appendChild(element);
  });
  if (!donnees.eres.length) {
    liste.appendChild(faire('li', 'points-v2-e052-note',
      'Aucune ère dans la matrice : la séquence reste vide plutôt que présomptive.'));
  }
  section.replaceChildren(liste);
  section.dataset.e052Ordonnees = String(donnees.eres.length);
  return donnees.eres.length;
}

/* E052-05 — échelle des millésimes : amplitude calculée par soustraction des
 * valeurs lues, jamais une borne historique écrite dans le module. */
function chantierEchelle(faire, section, donnees) {
  let resultat;
  if (donnees.annees.length) {
    const min = Math.min.apply(null, donnees.annees);
    const max = Math.max.apply(null, donnees.annees);
    resultat = `${formatAnnee(min)} → ${formatAnnee(max)} · amplitude ${max - min} an(s).`;
    if (donnees.annees.length > 1) {
      resultat += ` Écart entre bornes consécutives : ${donnees.annees.slice(1)
        .map((n, i) => n - donnees.annees[i]).join(', ')} an(s).`;
    }
  } else {
    resultat = 'Aucun millésime lu : l’échelle reste vide plutôt que bornée par une valeur supposée.';
  }
  const paragraphe = faire('p', 'points-v2-e052-valeur', resultat);
  section.replaceChildren(paragraphe);
  section.dataset.e052Amplitude = donnees.annees.length
    ? String(Math.max.apply(null, donnees.annees) - Math.min.apply(null, donnees.annees)) : 'absente';
  return section.dataset.e052Amplitude;
}

/* E052-06 — horodatage machine <time datetime> dérivé de l'ancre lue. */
function chantierMachine(faire, section, donnees) {
  const liste = faire('ul');
  const span = donnees.spans.length > 2 ? donnees.spans[2] : null;
  let ajoutes = 0;
  if (span && donnees.annees.length) {
    donnees.annees.forEach((n) => {
      let time = span.querySelector('.e052-time');
      if (!time) {
        time = faire('time', 'e052-time');
        span.appendChild(time);
      }
      time.dateTime = isoAnnee(n);
      time.dataset.e052Source = '.points-meta > span:nth-child(3)';
      ecrire(time, formatAnnee(n));
      ajoutes += 1;
      liste.appendChild(faire('li', 'points-v2-e052-valeur',
        `datetime="${time.dateTime}" → « ${formatAnnee(n)} » (année astronomique ISO 8601).`));
    });
  } else {
    liste.appendChild(faire('li', 'points-v2-e052-note',
      'Aucune ancre numérique : aucun datetime n’est fabriqué.'));
  }
  section.replaceChildren(liste);
  section.dataset.e052Times = String(ajoutes);
  return ajoutes;
}

/* E052-07 — années orphelines : un millésime visible sans source dans le DOM
 * est signalé, jamais complété. Périmètre : le texte du détail. */
function chantierOrphelins(faire, section, donnees) {
  const sources = new Set(donnees.annees.map(String));
  const orphelins = [];
  textes(donnees.detail).forEach((noeud) => {
    const texte = noeud.nodeValue || '';
    const motif = /\b\d{4}\b/g;
    let correspondance;
    while ((correspondance = motif.exec(texte))) {
      if (!sources.has(correspondance[0]) && orphelins.indexOf(correspondance[0]) === -1) {
        orphelins.push(correspondance[0]);
      }
    }
  });
  section.classList.add('points-v2-e052-orphelins');
  const paragraphe = faire('p', 'points-v2-e052-valeur', orphelins.length
    ? `${orphelins.length} millésime(s) sans source détecté(s) : ${orphelins.join(', ')}. Signalés, non corrigés.`
    : 'Aucune année orpheline : chaque millésime visible remonte à l’ancre lue. Aucune date n’a été supposée.');
  section.replaceChildren(paragraphe);
  section.dataset.e052Orphelins = orphelins.length ? '1' : '0';
  section.dataset.e052NbOrphelins = String(orphelins.length);
  return orphelins.length;
}

/* E052-08 — cohérence des compteurs rendus : le total du titre est comparé à
 * la somme des cases de la matrice, le périmètre du détail à la somme des cases
 * de l'ère affichée. Tout est lu ; rien n'est corrigé. */
function chantierCoherence(faire, section, donnees) {
  const liste = faire('ul');
  const incoherences = [];
  const paires = [
    ['total du titre', donnees.nbTitre, donnees.sommeCellules],
    ['périmètre du détail', donnees.nbDetail, donnees.sommeCellulesActives],
  ];
  paires.forEach(([nom, annonce, calcule]) => {
    if (annonce === null) {
      liste.appendChild(faire('li', 'points-v2-e052-note', `${nom} : valeur non fournie, aucun jugement porté.`));
      return;
    }
    const ok = annonce === calcule;
    liste.appendChild(faire('li', 'points-v2-e052-valeur',
      `${nom} : ${annonce} annoncé(s), ${calcule} calculé(s) depuis les cases → ${ok ? 'cohérent' : 'incohérent'}.`));
    if (!ok) incoherences.push(nom);
  });
  liste.appendChild(faire('li', 'points-v2-e052-note',
    'Les bornes d’ère ne sont pas rendues dans cette vue : aucune appartenance d’ancre à une ère n’est affirmée.'));
  section.replaceChildren(liste);
  section.dataset.e052Coherent = incoherences.length ? 'non' : 'oui';
  section.dataset.e052Incoherents = String(incoherences.length);
  return incoherences.length;
}

/* E052-09 — empreinte déterministe des valeurs lues : hachage sans aléa ni
 * horloge, qui varie si et seulement si une donnée du DOM change. */
function empreinteDonnees(donnees) {
  const brut = [
    ...donnees.annees.map(String),
    String(donnees.nbTitre),
    String(donnees.nbDetail),
    ...donnees.eres,
    ...donnees.cellules.map(txt),
  ].join('|');
  let hash = GRAINE_HASH;
  for (let index = 0; index < brut.length; index += 1) {
    hash = ((hash << 5) + hash + brut.charCodeAt(index)) | 0;
  }
  return `${brut.length}-${(hash >>> 0).toString(16)}`;
}

function chantierSignature(faire, section, empreinte, donnees) {
  const paragraphe = faire('p', 'points-v2-e052-valeur',
    `Empreinte des valeurs lues : ${empreinte}. Elle dérive des millésimes, compteurs, ères et cases du DOM, et varie avec eux.`);
  section.replaceChildren(paragraphe);
  section.dataset.e052Signature = empreinte;
  return empreinte;
}

/* E052-10 — fraîcheur inter-rendus : l'empreinte est relue puis comparée à la
 * précédente ; les compteurs module ne créent aucun nœud et sont réécrits. */
function chantierFraicheur(faire, section, empreinte) {
  rendus += 1;
  const change = signaturePrecedente !== null && signaturePrecedente !== empreinte;
  const stable = signaturePrecedente === null || !change;
  signaturePrecedente = empreinte;
  const paragraphe = faire('p', 'points-v2-e052-valeur',
    `Valeurs relues ${rendus} fois depuis le DOM ; empreinte ${change ? 'modifiée' : 'inchangée'} entre rendus (${empreinte}).`);
  section.replaceChildren(paragraphe);
  section.dataset.e052Rendus = String(rendus);
  section.dataset.e052Change = change ? '1' : '0';
  section.dataset.e052Stable = stable ? '1' : '0';
  return change;
}

function install(ctx) {
  const faire = typeof ctx.el === 'function'
    ? ctx.el
    : (balise, classe, texte) => {
      const noeud = document.createElement(balise);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
      return noeud;
    };
  if (!ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'pointsv2') return;

  const donnees = lire(ctx.layout);
  const empreinte = empreinteDonnees(donnees);

  ctx.css(CSS_ID, CSS);

  const panel = assurerNoeud(faire, IDS.panel, 'section', 'points-v2-e052 points-v2-e052-panel', ctx.layout);
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', IDS.title);
  panel.dataset.e052Passe = 'v2';

  const titre = faire('h2', 'points-v2-e052-title', 'Aucune date codée en dur — vue Points');
  titre.id = IDS.title;
  const lede = faire('p', 'points-v2-e052-lede',
    'Chaque nombre affiché ici est lu dans le DOM rendu par la vue Points ou calculé depuis lui. Aucun millésime n’est écrit en dur : quand la donnée manque, le panneau le dit au lieu de la supposer.');

  const sections = {};
  const titres = {
    inventory: 'E052-01 · Porteuses de date recensées',
    provenance: 'E052-02 · Provenance déclarée de chaque valeur',
    format: 'E052-03 · Forme brute → forme lisible',
    order: 'E052-04 · Ordre des ères lu dans la matrice',
    scale: 'E052-05 · Échelle des millésimes calculée',
    machine: 'E052-06 · Horodatages machine dérivés',
    orphans: 'E052-07 · Années orphelines signalées',
    coherence: 'E052-08 · Cohérence des compteurs rendus',
    signature: 'E052-09 · Empreinte déterministe des valeurs',
    freshness: 'E052-10 · Recalcul à chaque rendu',
  };
  Object.keys(titres).forEach((cle) => {
    const sousTitreNoeud = sousTitre(faire, titres[cle]);
    const section = assurerNoeud(faire, IDS[cle], 'div', `points-v2-e052-bloc points-v2-e052-${cle}`, panel);
    sections[cle] = { titre: sousTitreNoeud, section };
  });

  const total = chantierInventaire(faire, sections.inventory.section, donnees);
  const etiquetes = chantierProvenance(faire, sections.provenance.section, donnees);
  const formates = chantierFormat(faire, sections.format.section, donnees);
  const ordre = chantierOrdre(faire, sections.order.section, donnees);
  const amplitude = chantierEchelle(faire, sections.scale.section, donnees);
  const times = chantierMachine(faire, sections.machine.section, donnees);
  const orphelins = chantierOrphelins(faire, sections.orphans.section, donnees);
  const incoherents = chantierCoherence(faire, sections.coherence.section, donnees);
  const signature = chantierSignature(faire, sections.signature.section, empreinte, donnees);
  const change = chantierFraicheur(faire, sections.freshness.section, empreinte);

  const metric = assurerNoeud(faire, IDS.metric, 'p', 'points-v2-e052-metrique', panel);
  ecrire(metric, `Bilan : ${total} porteuse(s) · ${etiquetes} source(s) déclarée(s) · ${formates} forme(s) · ${ordre} ère(s) · amplitude ${amplitude} · ${times} <time> · ${orphelins} orpheline(s) · ${incoherents} incohérence(s) · empreinte ${signature}.`);

  const enfants = [titre, lede];
  Object.keys(titres).forEach((cle) => {
    enfants.push(sections[cle].titre, sections[cle].section);
  });
  enfants.push(metric);
  panel.replaceChildren(...enfants);

  setData(panel, 'e052Total', String(total));
  setData(panel, 'e052Etiquetes', String(etiquetes));
  setData(panel, 'e052Formates', String(formates));
  setData(panel, 'e052Ordonnees', String(ordre));
  setData(panel, 'e052Times', String(times));
  setData(panel, 'e052Orphelins', orphelins ? '1' : '0');
  setData(panel, 'e052Coherence', incoherents ? 'non' : 'oui');
  setData(panel, 'e052Signature', signature);
  setData(panel, 'e052Change', String(change));
  const reduit = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  setData(panel, 'e052Reduit', reduit ? '1' : '0');
}

register('E052', (ctx) => {
  try {
    install(ctx);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
