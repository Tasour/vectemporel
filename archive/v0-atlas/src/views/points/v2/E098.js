import { register } from './registry.js';

/* Lentille E098 — passe 2 (V2) : atelier de traçabilité des silences (domaine J :
 * pédagogie & narration).
 *
 * Rapport : UNIFIED_AUDIT/POINTS/V2/views/E098.md — chantiers E098-01 à E098-10.
 * Fichier possédé : src/views/points/v2/E098.js uniquement. La passe 1
 * (src/views/points/E098.js), la vue (points.js), le store, les registres,
 * index.js et styles.css ne sont ni édités ni doublés.
 *
 * La passe 1 apprend à LIRE un silence ("repérer, nommer, documenter") et
 * distingue `vide justifié` / `vide non traité` dans un encart narratif. La V2
 * est STRICTEMENT COMPLÉMENTAIRE : elle ajoute un ATELIER D'AUDIT en lecture
 * seule qui RECENSE les silences de la matrice (registre par ère), mesure
 * l'écart à la couverture, porte un DIAGNOSTIC glyphe+mot de la fiche affichée
 * et propose un DÉFI DE FALSIFICATION — le tout sans réécrire une seule cellule
 * ni le détail, et sans reproduire l'encart, le glossaire ou le récapitulatif de
 * la passe 1.
 *
 * Contrat exploité : ctx = { viewId, stage, layout, css(id, règles),
 * el(balise, classe, texte), reducedMotion() }. Toute grandeur est dérivée du
 * DOM rendu par points.js : .points-matrix, .points-grid, .points-grid-row,
 * .points-era, .points-cell (.has-points), .points-filters, .points-detail
 * (.points-point-title, .points-justification, .points-sources,
 * .points-meta .confidence). Aucune date, aucun total, aucun chiffre historique
 * codé en dur ; les marqueurs textuels ne qualifient qu'un texte OBSERVÉ.
 *
 * Invariants :
 * - exactement un register('E098', ctx => { … }) ;
 * - exactement un ctx.css('points-v2-e098', …) ;
 * - tous les identifiants préfixés points-v2-e098-, toute règle CSS préfixée
 *   .points-v2-e098, attributs de données data-v2-e098-* (distincts de la passe 1) ;
 * - tout DOM bâti avec ctx.el / textContent, jamais innerHTML/outerHTML ;
 * - zéro sortie de débogage, zéro réseau, zéro aléa, zéro timer, zéro rAF,
 *   zéro écouteur global, aucune région live ajoutée ;
 * - chaque état porte un GLYPHE ET UN MOT, jamais la couleur seule.
 */

const CSS_ID = 'points-v2-e098';
const SCOPE = 'points-v2-e098';
const VIEW_IDS = ['pointsv2', 'points'];

const ATELIER_ID = 'points-v2-e098-atelier';
const TITRE_ID = 'points-v2-e098-titre';
const INTRO_ID = 'points-v2-e098-intro';
const GRILLE_ID = 'points-v2-e098-grille';
const REGISTRE_ID = 'points-v2-e098-registre';
const INDICE_ID = 'points-v2-e098-indice';
const DIAGNOSTIC_ID = 'points-v2-e098-diagnostic';
const ECART_ID = 'points-v2-e098-ecart';
const DEFI_ID = 'points-v2-e098-defi';
const BOUTON_ID = 'points-v2-e098-bouton';
const REPONSE_ID = 'points-v2-e098-reponse';
const NOTE_ID = 'points-v2-e098-note';

const REDUCED_ATTR = 'data-v2-e098-reduced';

/* Marqueurs réellement présents dans les fiches du corpus. Ils ne qualifient
 * qu'un texte observé, jamais une case invisible ni une hypothèse historique. */
const DOCUMENTE = /vide justifié|omission|OM-\s*\d+/i;
const NON_TRAITE = /vide non traité|non traité|à documenter/i;

/* E098-02 : chaque verdict associe un glyphe et un mot ; la couleur ne fait que
 * redoubler le signe, jamais le remplacer. */
const VERDICTS = {
  documente: { glyph: '✓', word: 'justifié — omission documentée' },
  nonTraite: { glyph: '✗', word: 'non traité — marqueur explicite' },
  inconnu: { glyph: '○', word: 'à documenter — aucun marqueur observé' },
};

/* Feuille unique, entièrement préfixée `.points-v2-e098`, classe posée sur
 * .points-layout : aucune règle ne peut fuir hors de la vue Points. L'atelier
 * reste lisible en niveaux de gris, en couleurs forcées et sur papier. La seule
 * transition est neutralisée sous mouvement réduit (JS + media query). */
const CSS = `
.points-v2-e098 .points-v2-e098-atelier {
  box-sizing: border-box;
  margin: 12px 0 4px; padding: 12px 14px;
  border: 1px solid var(--line-strong, #5b5b5b);
  border-left: 3px solid var(--gold, #e6b96f); border-radius: 10px;
  background: rgba(8, 11, 16, .6); color: var(--ink-soft, #d8d8d8);
  font-variant-numeric: tabular-nums; font-size: 11px; line-height: 1.55;
}
.points-v2-e098 .points-v2-e098-titre {
  margin: 0 0 6px; font-family: var(--serif, serif);
  font-size: 15px; color: var(--gold-bright, #e9c98f);
}
.points-v2-e098 .points-v2-e098-intro,
.points-v2-e098 .points-v2-e098-note {
  margin: 0 0 8px; font-size: 10px; line-height: 1.5; color: var(--muted-2, #9a9a9a);
}
.points-v2-e098 .points-v2-e098-label {
  margin: 10px 0 5px; color: var(--gold, #e6b96f);
  font-weight: 600; letter-spacing: .03em; font-size: 10px;
}
.points-v2-e098 .points-v2-e098-grille,
.points-v2-e098 .points-v2-e098-defi-ol { margin: 0 0 8px; padding-left: 20px; }
.points-v2-e098 .points-v2-e098-grille li,
.points-v2-e098 .points-v2-e098-defi-ol li { margin-bottom: 4px; overflow-wrap: anywhere; }
.points-v2-e098 .points-v2-e098-ligne {
  margin: 3px 0; font-size: 10px; line-height: 1.5;
  color: var(--muted, #9aa5b8); overflow-wrap: anywhere;
}
.points-v2-e098 .points-v2-e098-mesure { color: var(--gold-bright, #e9c98f); }
.points-v2-e098 .points-v2-e098-glyph {
  display: inline-block; min-width: 1.2em; font-weight: 700;
  color: var(--gold-bright, #e9c98f); transition: color .18s linear;
}
.points-v2-e098 .points-v2-e098-diagnostic.is-inconnu .points-v2-e098-glyph,
.points-v2-e098 .points-v2-e098-diagnostic.is-nonTraite .points-v2-e098-glyph {
  color: var(--muted-2, #9a9a9a);
}
.points-v2-e098 .points-v2-e098-bouton {
  min-height: 36px; padding: 4px 12px;
  border: 1px solid var(--line-strong, #5b5b5b); border-radius: 8px;
  background: rgba(230, 185, 111, .08); color: var(--gold-bright, #e9c98f);
  font: inherit; font-size: 10px; cursor: pointer;
}
.points-v2-e098 .points-v2-e098-bouton[aria-pressed="true"] {
  border-color: var(--gold, #e6b96f); background: rgba(230, 185, 111, .14);
}
.points-v2-e098 .points-v2-e098-bouton:focus-visible,
.points-v2-e098 .points-v2-e098-atelier:focus-visible {
  outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px;
}
.points-v2-e098 .points-v2-e098-reponse {
  margin: 8px 0 0; padding: 8px 10px;
  border-left: 2px solid var(--gold, #e6b96f); font-size: 10px;
  line-height: 1.5; overflow-wrap: anywhere;
}
.points-v2-e098 .points-v2-e098-reponse[hidden] { display: none; }
.points-v2-e098[${REDUCED_ATTR}="1"] .points-v2-e098-glyph { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .points-v2-e098 .points-v2-e098-glyph { transition: none; animation: none; }
}
@media (max-width: 620px) {
  .points-v2-e098 .points-v2-e098-atelier { padding: 10px; font-size: 12px; }
  .points-v2-e098 .points-v2-e098-intro,
  .points-v2-e098 .points-v2-e098-ligne,
  .points-v2-e098 .points-v2-e098-note { font-size: 11px; }
  .points-v2-e098 .points-v2-e098-bouton { width: 100%; }
}
@media (forced-colors: active) {
  .points-v2-e098 .points-v2-e098-atelier,
  .points-v2-e098 .points-v2-e098-reponse { border-color: CanvasText; color: CanvasText; }
  .points-v2-e098 .points-v2-e098-bouton { border: 2px solid ButtonText; color: ButtonText; }
  .points-v2-e098 .points-v2-e098-glyph { color: CanvasText; }
}
@media print {
  .points-v2-e098 .points-v2-e098-atelier { border-color: #666; background: transparent; }
}
`;

/* --- Utilitaires non destructifs et sans exception. --- */

function isElement(node) {
  return !!node && typeof node === 'object' && typeof node.querySelectorAll === 'function';
}

function query(root, selector) {
  return isElement(root) && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function queryAll(root, selector) {
  return isElement(root) && typeof root.querySelectorAll === 'function'
    ? Array.prototype.slice.call(root.querySelectorAll(selector)) : [];
}

function txt(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value.textContent === 'string') {
    return String(value.textContent).replace(/\s+/g, ' ').trim();
  }
  return '';
}

function setAttr(node, name, value) {
  if (isElement(node) && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

function getAttr(node, name) {
  return isElement(node) && typeof node.getAttribute === 'function' ? node.getAttribute(name) : null;
}

function removeNode(node) {
  if (node && typeof node.remove === 'function') node.remove();
}

function plural(count, one, many) {
  return count > 1 ? many : one;
}

function pourcentage(part, total) {
  if (!total) return '0,0 %';
  return `${((part * 100) / total).toFixed(1).replace('.', ',')} %`;
}

/* Empreinte FNV-1a : Math.imul est de l'arithmétique, aucun aléa, aucune
 * horloge. La même matrice produit toujours la même signature (E098-10). */
function empreinte(valeur) {
  let h = 2166136261;
  const chaine = String(valeur || '');
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 8);
}

/* E098-09 : garde anti-doublon. Tout nœud portant un id préfixé qui n'est pas
 * celui conservé est retiré du document. */
function nodesById(id) {
  if (typeof document === 'undefined' || typeof document.querySelectorAll !== 'function') return [];
  return Array.prototype.slice.call(document.querySelectorAll('[id="' + id + '"]'));
}

function enforceUnique(id, keep) {
  nodesById(id).forEach((node) => { if (node !== keep) removeNode(node); });
  return keep || nodesById(id)[0] || null;
}

/* E098-03 : le glyphe « · » est celui que points.js affiche pour zéro point.
 * L'ère et le domaine sont LUS dans le DOM, jamais inventés. */
function silenceLabel(era, domain) {
  return era && domain
    ? `une cellule « · » de l'ère ${era}, domaine ${domain}`
    : 'une cellule « · » de la matrice';
}

/* E098-06 : la passe 1 a pu envelopper la justification ; on privilégie le
 * verbatim exact .points-e026-quote-text quand il existe, sinon le textContent
 * du nœud de justification. Aucune écriture, aucune chaîne codée en dur. */
function justificationText(detail) {
  const ancre = query(detail, '.points-justification');
  if (!ancre) return '';
  const verbatim = query(ancre, '.points-e026-quote-text');
  return txt(verbatim || ancre);
}

function sourcesOf(detail) {
  return txt(query(detail, '.points-sources')).replace(/^sources\s*:\s*/i, '');
}

/* E098-06 : qualifier un TEXTE OBSERVÉ, pas une case invisible. */
function verdictOf(justification, sources) {
  const corpus = `${txt(justification)} ${txt(sources)}`;
  if (DOCUMENTE.test(corpus)) return { key: 'documente', ...VERDICTS.documente };
  if (NON_TRAITE.test(corpus)) return { key: 'nonTraite', ...VERDICTS.nonTraite };
  return { key: 'inconnu', ...VERDICTS.inconnu };
}

/* Lecture unique de toutes les grandeurs affichées. Les domaines sont lus dans
 * l'en-tête, les ères dans les lignes, les silences dans .points-cell sans
 * .has-points. Aucun total n'est codé en dur. */
function collecter(layout) {
  const matrice = query(layout, '.points-matrix');
  const grille = query(matrice, '.points-grid');
  const tete = query(grille, '.points-grid-row.is-head');
  const detail = query(layout, '.points-detail');

  const domaines = tete
    ? queryAll(tete, 'span').slice(1).map(txt)
    : [];

  const lignes = queryAll(grille, '.points-grid-row')
    .filter((r) => !r.classList.contains('is-head'));

  const cellules = queryAll(grille, '.points-cell');
  const remplies = cellules.filter((c) => c.classList.contains('has-points'));
  const vides = cellules.filter((c) => !c.classList.contains('has-points'));
  const total = cellules.length;
  const couverture = total ? Math.round((remplies.length / total) * 100) : 0;

  const parEre = lignes.map((ligne) => {
    const bouton = query(ligne, '.points-era');
    const nom = bouton ? txt(bouton) : '';
    const noeuds = queryAll(ligne, '.points-cell');
    const nbVides = noeuds.filter((c) => !c.classList.contains('has-points')).length;
    return { nom, cellules: noeuds.length, vides: nbVides };
  });
  const ereLaPlusSilencieuse = parEre.reduce(
    (best, e) => (e.vides > (best ? best.vides : -1) ? e : best), null);

  const premierVide = vides[0] || null;
  const index = premierVide ? cellules.indexOf(premierVide) : -1;
  const domaineExemple = index >= 0 ? (domaines[index] || '') : '';
  const ereExemple = premierVide
    ? txt(query(premierVide.parentElement, '.points-era')) : '';

  const justification = justificationText(detail);
  const sources = sourcesOf(detail);
  const confidence = txt(query(detail, '.points-meta .confidence'));
  const verdict = verdictOf(justification, sources);

  const cle = [
    domaines.join(','),
    parEre.map((e) => `${e.nom}:${e.vides}`).join(','),
    total,
  ].join('|');

  return {
    matrice, grille, detail,
    domaines, parEre, ereLaPlusSilencieuse,
    cellules, remplies, vides, total, couverture,
    ereExemple, domaineExemple, justification, sources, confidence, verdict,
    signature: empreinte(cle),
  };
}

/* Pose un paragraphe de synthèse visible, réutilisé par identifié. */
function ligne(atelier, ctx, id, classe, libelle, valeur) {
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = ctx.el('p', `points-v2-e098-ligne ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = '';
  noeud.appendChild(ctx.el('strong', 'points-v2-e098-mesure', `${libelle} : `));
  noeud.appendChild(document.createTextNode(valeur));
  atelier.appendChild(noeud);
  return noeud;
}

/* E098-01 / E098-02 : structure statique de l'atelier, bâtie une seule fois par
 * rendu avec ctx.el (jamais d'injection de balisage). Seuls les nœuds dynamiques
 * sont remplacés ensuite par les chantiers. */
function construireAtelier(ctx) {
  const atelier = ctx.el('section', 'points-v2-e098-atelier');
  atelier.id = ATELIER_ID;
  setAttr(atelier, 'role', 'region');
  setAttr(atelier, 'aria-labelledby', TITRE_ID);
  atelier.tabIndex = -1;

  const titre = ctx.el('h2', 'points-v2-e098-titre', 'Atelier de traçabilité des silences');
  titre.id = TITRE_ID;
  atelier.appendChild(titre);

  const intro = ctx.el('p', 'points-v2-e098-intro');
  intro.id = INTRO_ID;
  intro.textContent = 'Un silence est une donnée, jamais une preuve. Chaque verdict ci-dessous porte un signe et un mot : ✓ justifié, ✗ non traité, ○ à documenter. Aucune case n’est qualifiée par sa seule couleur, et l’absence de marqueur n’est pas la preuve d’un traitement.';
  atelier.appendChild(intro);

  const grille = ctx.el('ol', 'points-v2-e098-grille');
  grille.id = GRILLE_ID;
  atelier.appendChild(grille);

  const labelRegistre = ctx.el('p', 'points-v2-e098-label', 'Registre des silences par ère');
  const registre = ctx.el('div');
  registre.id = REGISTRE_ID;
  atelier.append(labelRegistre, registre);

  const labelMesures = ctx.el('p', 'points-v2-e098-label', 'Mesures de la matrice rendue');
  const indice = ctx.el('p', 'points-v2-e098-ligne');
  indice.id = INDICE_ID;
  const ecart = ctx.el('p', 'points-v2-e098-ligne');
  ecart.id = ECART_ID;
  atelier.append(labelMesures, indice, ecart);

  const labelDiag = ctx.el('p', 'points-v2-e098-label', 'Diagnostic de la fiche affichée');
  const diagnostic = ctx.el('p', 'points-v2-e098-ligne points-v2-e098-diagnostic');
  diagnostic.id = DIAGNOSTIC_ID;
  atelier.append(labelDiag, diagnostic);

  const labelDefi = ctx.el('p', 'points-v2-e098-label', 'À vous de jouer — le piège du marqueur absent');
  const defi = ctx.el('div', 'points-v2-e098-defi');
  defi.id = DEFI_ID;
  defi.appendChild(labelDefi);
  const defiOl = ctx.el('ol', 'points-v2-e098-defi-ol');
  defi.appendChild(defiOl);
  const bouton = ctx.el('button', 'points-v2-e098-bouton', 'Vérifier mon diagnostic');
  bouton.id = BOUTON_ID;
  bouton.type = 'button';
  setAttr(bouton, 'aria-controls', REPONSE_ID);
  setAttr(bouton, 'aria-pressed', 'false');
  const reponse = ctx.el('p', 'points-v2-e098-reponse');
  reponse.id = REPONSE_ID;
  setAttr(reponse, 'hidden', '');
  atelier.append(defi, bouton, reponse);

  const note = ctx.el('p', 'points-v2-e098-note');
  note.id = NOTE_ID;
  note.textContent = 'Règle de lecture : une absence examinée et documentée devient un vide justifié ; une absence sans documentation reste à traiter (POINT_METHODOLOGY.md §3.7, §4, §9). Cet atelier n’invente aucun ID d’omission : il ne fait que qualifier le texte réellement affiché.';
  atelier.appendChild(note);

  return atelier;
}

/* E098-03 : grille de décision en quatre embranchements — distincte des « trois
 * temps » de la passe 1. Le premier embranchement cite une cellule réelle. */
function ch03(grille, ctx, d) {
  grille.replaceChildren(
    ctx.el('li', '', `La cellule porte un point ? Alors ce n’est pas un silence : ${silenceLabel(d.ereExemple, d.domaineExemple)} est ici l’exemple de cellule vide observée.`),
    ctx.el('li', '', 'Pas de point, mais un ID d’omission (OM-*) ou une justification explicite dans la fiche ? Verdict ✓ justifié : l’absence a été examinée.'),
    ctx.el('li', '', 'Pas de point, et un marqueur « non traité / à documenter » ? Verdict ✗ non traité : l’absence est signalée comme restant à traiter.'),
    ctx.el('li', '', 'Pas de point et aucun marqueur lisible ? Verdict ○ à documenter : l’absence de marqueur n’est PAS une preuve de traitement.')
  );
}

/* E098-04 / E098-05 : registre par ère et indice de silence (ratio rapporté à la
 * référence du total des cellules). Tout est recompté depuis le DOM. */
function ch04(registre, ctx, d) {
  if (!d.parEre.length) {
    registre.replaceChildren(ctx.el('p', 'points-v2-e098-ligne', 'Aucune ère affichée dans cette matrice.'));
    return;
  }
  registre.replaceChildren(...d.parEre.map((e) => ctx.el(
    'p', 'points-v2-e098-ligne',
    `${e.nom || 'ère sans nom'} : ${e.vides} silence${plural(e.vides, '', 's')} sur ${e.cellules} cellule${plural(e.cellules, '', 's')} (${pourcentage(e.vides, e.cellules)}).`
  )));
}

function ch05(indice, d) {
  indice.textContent = `Silences : ${d.vides.length} case${plural(d.vides.length, '', 's')} vide${plural(d.vides.length, '', 's')} · Points : ${d.remplies.length} case${plural(d.remplies.length, '', 's')} renseignée${plural(d.remplies.length, '', 's')} · Indice de silence : ${pourcentage(d.vides.length, d.total)} du total (${d.total} cellules).`;
}

/* E098-07 : écart à la couverture cible (100 %), dérivé du seul comptage. */
function ch07(ecart, d) {
  ecart.textContent = `Couverture observée : ${d.couverture} % — il reste ${d.vides.length} case${plural(d.vides.length, '', 's')} à renseigner pour atteindre 100 %. Un vide justifié est recevable à 100 % de couverture, mais il n’ajoute aucun point.`;
}

/* E098-06 : diagnostic glyphe + mot de la fiche affichée. Distinct de l'exemple
 * travaillé de la passe 1 : c'est un verdict, pas une citation narrative. */
function ch06(ctx, diagnostic, d) {
  diagnostic.classList.remove('is-documente', 'is-nonTraite', 'is-inconnu');
  diagnostic.classList.add('is-' + d.verdict.key);
  diagnostic.append(
    ctx.el('span', 'points-v2-e098-glyph', d.verdict.glyph),
    document.createTextNode(
      ` Fiche « ${d.justification ? excerpt(d.justification, 80) : 'sans justification affichée'} » : ${d.verdict.word}.`
      + (d.confidence ? ` La certitude affichée (${d.confidence}) qualifie un point, jamais une case vide.` : '')
    )
  );
}

function excerpt(text, max) {
  const clean = txt(text);
  if (!clean) return '';
  if (clean.length <= max) return clean;
  const head = clean.slice(0, max);
  const cut = head.lastIndexOf(' ');
  return (cut > max / 2 ? head.slice(0, cut) : head) + '…';
}

/* E098-08 : défi de falsification en cinq temps, aligné sur l'ère la plus
 * silencieuse. Le bouton ne fait que basculer une réponse au CLIC : aucun timer,
 * aucune rAF, aucune région live ajoutée. L'écouteur est posé une seule fois. */
function ch08(ctx, atelier, d) {
  const defi = query(atelier, '#' + DEFI_ID);
  const bouton = query(atelier, '#' + BOUTON_ID);
  const reponse = query(atelier, '#' + REPONSE_ID);
  if (!defi || !bouton || !reponse) return;

  const ol = query(defi, '.points-v2-e098-defi-ol');
  const ere = d.ereLaPlusSilencieuse;
  if (ol) {
    ol.replaceChildren(
      ctx.el('li', '', 'Prédiction : quelle ère cache le plus de silences, et combien ?'),
      ctx.el('li', '', `Réglage : lisez le registre ci-dessus et repérez « ${ere ? ere.nom || 'ère sans nom' : 'aucune ère'} ».`),
      ctx.el('li', '', `Résultat attendu : ${ere ? `${ere.nom || 'ère sans nom'} porte ${ere.vides} silence${plural(ere.vides, '', 's')}` : 'aucune ère active repérée'}.`),
      ctx.el('li', '', 'Falsification : si votre compte diffère, recompute depuis le registre — un marqueur absent n’est pas un silence documenté.'),
      ctx.el('li', '', `Débrief : ce sous-total s’inscrit dans les ${d.vides.length} silences de la matrice (${d.couverture} % de couverture).`)
    );
  }

  reponse.textContent = `Lecture vérifiée : ère la plus silencieuse « ${ere ? ere.nom || 'sans nom' : 'aucune'} », ${ere ? ere.vides : 0} silence(s) ; fiche observée → ${d.verdict.word}. Un marqueur absent reste ○ à documenter, jamais ✓ justifié.`;

  if (!getAttr(bouton, 'data-v2-e098-listener')) {
    bouton.addEventListener('click', () => {
      const ouvert = !reponse.hasAttribute('hidden');
      if (ouvert) setAttr(reponse, 'hidden', '');
      else reponse.removeAttribute('hidden');
      setAttr(bouton, 'aria-pressed', String(!ouvert));
      setAttr(bouton, 'data-v2-e098-ouvert', String(!ouvert));
    });
    setAttr(bouton, 'data-v2-e098-listener', '1');
  }
}

/* E098-05 : relation ARIA additive — le describedby du détail est COMPLÉTÉ,
 * jamais écrasé, afin de préserver les relations de la passe 1 et des autres
 * lentilles. */
function augmentDescribedBy(detail, id) {
  const existants = (getAttr(detail, 'aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (existants.indexOf(id) !== -1) return;
  setAttr(detail, 'aria-describedby', existants.concat(id).join(' '));
}

/* E098-01 / E098-09 / E098-10 : unique point d'entrée, gardes structurelles,
 * feuille unique, portée unique, ids dédupliqués, repli silencieux. */
function apply(ctx) {
  if (!ctx || VIEW_IDS.indexOf(ctx.viewId) === -1) return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const layout = isElement(ctx.layout) ? ctx.layout
    : (isElement(ctx.stage) ? ctx.stage : null);
  if (!isElement(layout)) return;
  if (typeof document === 'undefined') return;

  const d = collecter(layout);
  if (!d.matrice) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);

  let reduit = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduit = !!ctx.reducedMotion(); }
    catch { reduit = false; }
  }
  if (reduit) setAttr(layout, REDUCED_ATTR, '1');
  else if (typeof layout.hasAttribute === 'function' && layout.hasAttribute(REDUCED_ATTR)) {
    layout.removeAttribute(REDUCED_ATTR);
  }

  /* E098-10 : réconciliation par id — on conserve l'atelier déjà monté dans la
   * matrice courante, on retire tout doublon d'un rendu antérieur. */
  const candidats = nodesById(ATELIER_ID);
  let atelier = null;
  for (const candidat of candidats) {
    if (d.matrice.contains(candidat) && candidat.parentElement === d.matrice) {
      atelier = candidat;
      break;
    }
  }
  candidats.forEach((node) => { if (node !== atelier) removeNode(node); });

  if (!isElement(atelier)) {
    atelier = construireAtelier(ctx);
    const filtres = query(d.matrice, '.points-filters');
    if (filtres && filtres.parentElement === d.matrice) d.matrice.insertBefore(atelier, filtres);
    else d.matrice.appendChild(atelier);
  }
  enforceUnique(TITRE_ID, query(atelier, '#' + TITRE_ID));

  ch03(query(atelier, '#' + GRILLE_ID), ctx, d);
  ch04(query(atelier, '#' + REGISTRE_ID), ctx, d);
  ch05(query(atelier, '#' + INDICE_ID), d);
  ch07(query(atelier, '#' + ECART_ID), d);
  ch06(ctx, query(atelier, '#' + DIAGNOSTIC_ID), d);
  ch08(ctx, atelier, d);

  /* E098-10 : miroirs d'état auditables, déterministes (aucune horloge, aucun
   * aléa), et relation ARIA non destructive. */
  setAttr(atelier, 'data-v2-e098', '1');
  setAttr(atelier, 'data-v2-e098-silences', String(d.vides.length));
  setAttr(atelier, 'data-v2-e098-couverture', String(d.couverture));
  setAttr(atelier, 'data-v2-e098-verdict', d.verdict.key);
  setAttr(atelier, 'data-v2-e098-signature', d.signature);
  if (d.detail) augmentDescribedBy(d.detail, ATELIER_ID);
}

register('E098', (ctx) => {
  try { apply(ctx); }
  catch { return; }
});
