import { register } from './registry.js';

/* Lentille E055 — Sémantique & données : « disputé » jamais résolu par un silence.
 *
 * Rapport : UNIFIED_AUDIT/POINTS/views/E055.md — chantiers E055-01 à E055-10.
 * Fichier possédé : ce module uniquement. La vue (src/views/points.js), le
 * registre, le store et styles.css ne sont ni édités ni doublés.
 *
 * Fondement : POINT_METHODOLOGY.md §3.6 « Le disputé reste disputé : on ne
 * résout pas une controverse par un silence » et §3.7 « Les silences sont des
 * données ». Le dataset réel porte deux orthographes du même degré (« disputé »
 * et « disputed ») et des points dont le texte dit « reste disputé » alors que
 * la pastille affiche « vérifié ». E055 ne corrige pas ces données : il rend le
 * désaccord visible quand il existe, au lieu de le laisser disparaître.
 *
 * Contrat exploité : viewId, layout (repli stage), css, el, reducedMotion.
 * Aucun import de données, aucun écouteur, aucun timer, aucune rAF, aucun
 * réseau, aucun aléa, aucun console.*, aucun innerHTML.
 *
 * Invariants : une seule feuille CSS, un seul bloc de controverse par détail,
 * réutilisé par identifiant ; aucun nœud rendu par points.js n'est modifié hors
 * d'un seul aria-describedby complété sans écraser les valeurs existantes.
 */

const CSS_ID = 'points-e055';
const NOTE_ID = 'points-e055-note';
const TITLE_ID = 'points-e055-title';
const FLAG_ID = 'points-e055-flag';
const WHY_ID = 'points-e055-why';
const SOURCE_ID = 'points-e055-source';
const SUMMARY_ID = 'points-e055-summary';
const CONF_ID = 'points-e055-confidence';

/* E055-01 — Lexique : norme NFD pour comparer « disputé », « disputée » et
 * « disputed ». Ignorer la variante anglaise reviendrait à silencier 29 points
 * du dataset réel (dataset.js : « disputed »). Le mot dans le texte ou la
 * justification est aussi un signal : un désaccord mentionné reste un désaccord
 * même si la pastille dit « vérifié ». */
const DISPUTED_FORMS = new Set(['dispute', 'disputee', 'disputed']);
const DISPUTE_WORD = /\bdisput\w*/i;
const LINK_SEP = ' ';

function norm(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isDisputedForm(raw) {
  return DISPUTED_FORMS.has(norm(raw));
}

function mentionsDispute(text) {
  return DISPUTE_WORD.test(String(text || ''));
}

function textOf(node) {
  return node ? String(node.textContent || '').trim() : '';
}

function withDot(text) {
  const value = String(text || '').trim();
  return value && !/[.!?]$/.test(value) ? `${value}.` : value;
}

/* E055-08 — Le périmètre est lu dans le kicker réel de points.js
 * (« N point(s) dans ce périmètre »), jamais codé en dur. */
function perimeterCount(kicker) {
  const match = /^(\d+)\s+point/i.exec(String(kicker || '').trim());
  return match ? Number(match[1]) : null;
}

function first(detail, selector) {
  return detail && typeof detail.querySelector === 'function'
    ? detail.querySelector(selector) : null;
}

/* E055-02 — Lecture non destructive du détail. Aucun nœud n'est déplacé,
 * retiré ou réécrit : on ne fait qu'observer ce que points.js a rendu. */
function readDetail(detail) {
  const conf = first(detail, '.points-meta .confidence') || first(detail, '.confidence');
  const source = first(detail, '.points-sources');
  const why = first(detail, '.points-justification');
  const kicker = first(detail, '.view-kicker');
  return {
    conf,
    raw: textOf(conf),
    title: textOf(first(detail, '.points-point-title')),
    text: textOf(first(detail, '.points-point-text')),
    why: textOf(why),
    sources: textOf(source),
    hasSources: Boolean(source && source.isConnected),
    empty: !first(detail, '.points-point-title'),
    perimeter: perimeterCount(textOf(kicker)),
  };
}

/* E055-03 / E055-04 — Deux portes d'entrée dans le même désaccord :
 * - 'explicite' : la pastille dit « disputé / disputed » ;
 * - 'silencieux' : le dossier mentionne la controverse mais la pastille affiche
 *   une autre certitude (cas réel : texte « reste disputé » + « vérifié ») ;
 * - 'aucun' : aucun signal, on ne prétend alors rien. */
function classify(info) {
  if (info.empty) return { state: 'aucun', flag: '', why: '' };
  const explicit = isDisputedForm(info.raw);
  const mention = mentionsDispute(`${info.text} ${info.why}`);
  if (explicit) {
    return {
      state: 'dispute-explicite',
      flag: `Désaccord non tranché — ce point reste disputé (certitude affichée : « ${info.raw || 'disputé'} »).`,
      why: info.why,
    };
  }
  if (mention) {
    return {
      state: 'dispute-silencieux',
      flag: `Le dossier mentionne un désaccord alors que la certitude affichée est « ${info.raw || 'absente'} » : le disputé n'est pas résolu par ce silence.`,
      why: info.why,
    };
  }
  return { state: 'aucun', flag: '', why: '' };
}

/* E055-05 — Compléter aria-describedby sans écraser une valeur d'autrui, et
 * retirer uniquement notre jeton à la fermeture du bloc. */
function linkConfidence(conf, on) {
  if (!conf) return;
  if (!conf.id) conf.id = CONF_ID;
  const current = String(conf.getAttribute('aria-describedby') || '');
  const tokens = current.split(/\s+/).filter(Boolean).filter((token) => token !== NOTE_ID);
  if (on) tokens.push(NOTE_ID);
  if (tokens.length) conf.setAttribute('aria-describedby', tokens.join(LINK_SEP));
  else conf.removeAttribute('aria-describedby');
}

/* E055-09 — Signature déterministe, sans aléa : deux points identiques ne
 * comptent qu'une fois dans le registre des désaccords observés. */
function signatureOf(info, verdict) {
  return [info.title, info.raw, verdict.state, info.why.slice(0, 80)].join('\u241f');
}

const observed = new Set();
let lastSignature = '';

/* E055-10 — Réutilisation par identifiant : un seul bloc, réinséré au même
 * endroit (avant .points-nav) à chaque rendu, sans création de doublon. */
function place(ctx, id, tag, className, parent) {
  let node = document.getElementById(id);
  if (node && node.parentElement && node.parentElement !== parent) node.remove();
  if (!node || !node.isConnected) {
    node = ctx.el(tag, className);
    node.id = id;
  }
  return node;
}

function put(node, name, value) {
  if (node && typeof node.setAttribute === 'function') node.setAttribute(name, value);
}

/* E055-05 / E055-06 / E055-07 / E055-08 — Le bloc est bâti une fois, puis
 * seulement ses paragraphes sont remplacés (jamais innerHTML). La justification
 * d'origine reste affichée telle quelle dans le détail : on ne la cite qu'en
 * complément, comme dossier du désaccord. */
function writeNote(ctx, note, info, verdict, silences) {
  let title = document.getElementById(TITLE_ID);
  let flag = document.getElementById(FLAG_ID);
  let why = document.getElementById(WHY_ID);
  let source = document.getElementById(SOURCE_ID);
  let summary = document.getElementById(SUMMARY_ID);

  if (!title || !flag || !why || !source || !summary) {
    note.replaceChildren();
    title = ctx.el('h4', 'points-e055-title', 'Dossier de controverse');
    title.id = TITLE_ID;
    flag = ctx.el('p', 'points-e055-flag');
    flag.id = FLAG_ID;
    why = ctx.el('p', 'points-e055-why');
    why.id = WHY_ID;
    source = ctx.el('p', 'points-e055-source');
    source.id = SOURCE_ID;
    summary = ctx.el('p', 'points-e055-summary');
    summary.id = SUMMARY_ID;
    note.append(title, flag, why, source, summary);
    lastSignature = '';
  }

  const icon = ctx.el('span', 'points-e055-icon', '\u2696');
  icon.setAttribute('aria-hidden', 'true');
  flag.replaceChildren(icon, document.createTextNode(` ${withDot(verdict.flag)}`));

  why.textContent = verdict.why
    ? `Dossier de la controverse : ${verdict.why}`
    : 'Aucune justification enregistrée : le désaccord est signalé sans dossier écrit.';
  put(why, 'data-points-e055-justification', verdict.why ? 'présente' : 'absente');

  /* E055-07 — L'absence de source est écrite, pas laissée comme vide. Aucun ID
   * d'omission n'est inventé : E056 reste maître de cette attribution. */
  source.hidden = info.hasSources;
  source.textContent = info.hasSources
    ? ''
    : 'Aucune source enregistrée pour ce point : ce silence ne tranche pas le désaccord.';

  const perimeter = info.perimeter === null ? 'non lu' : String(info.perimeter);
  summary.textContent = `Périmètre : ${perimeter} point(s) · ${silences} cellule(s) vide(s) dans la matrice · ${observed.size} désaccord(s) distinct(s) observé(s).`;
}

/* Feuille unique, sans ressource externe, sans animation et sans information
 * portée par la seule couleur : bordure, icône ⚖ et mot « disputé » suffisent. */
const CSS = `
#${NOTE_ID} {
  margin: 12px 0 0; padding: 10px 12px;
  border: 1px solid var(--line-strong, #5b5b5b);
  border-left: 3px solid var(--gold, #e6b96f); border-radius: 8px;
  background: rgba(230, 185, 111, .06);
  color: var(--ink-soft, #d8d8d8); font-size: 11px; line-height: 1.5;
}
#${NOTE_ID}[hidden] { display: none; }
#${NOTE_ID} h4 {
  margin: 0 0 6px; font-family: var(--serif, serif);
  font-size: 13px; color: var(--gold-bright, #e9c98f);
}
#${NOTE_ID} p { margin: 0 0 6px; }
#${NOTE_ID} p:last-child { margin-bottom: 0; }
#${NOTE_ID} .points-e055-flag { font-weight: 600; letter-spacing: .02em; }
#${NOTE_ID} .points-e055-icon { margin-right: 6px; font-size: 14px; }
#${NOTE_ID} .points-e055-why {
  border-left: 2px solid var(--line-strong, #5b5b5b); padding-left: 8px;
  color: var(--muted, #9a9a9a); font-style: italic;
}
#${NOTE_ID} .points-e055-source { color: var(--gold, #e6b96f); }
#${NOTE_ID} .points-e055-summary {
  color: var(--muted-2, #7d7d7d); font-size: 10px; font-variant-numeric: tabular-nums;
}
#${CONF_ID} { text-decoration: underline dotted; text-underline-offset: 2px; }
#${CONF_ID}:focus-visible { outline: 2px solid var(--gold-bright, #e9c98f); outline-offset: 2px; }
@media (max-width: 620px) {
  #${NOTE_ID} { padding: 8px 10px; font-size: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  #${NOTE_ID}, #${NOTE_ID} *, #${CONF_ID} { transition: none; animation: none; }
}
@media (forced-colors: active) {
  #${NOTE_ID} { border-color: CanvasText; color: CanvasText; }
  #${NOTE_ID} .points-e055-why { border-left-color: CanvasText; }
}
`;

register('E055', (ctx) => {
  if (!ctx || !ctx.viewId || ctx.viewId !== 'points') return;
  const layout = ctx.layout || ctx.stage;
  if (!layout || typeof layout.querySelector !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;

  const detail = layout.querySelector('.points-detail');
  if (!detail || typeof detail.appendChild !== 'function') return;

  ctx.css(CSS_ID, CSS);

  const info = readDetail(detail);
  const verdict = classify(info);
  const silences = layout.querySelectorAll('.points-cell:not(.has-points)').length;
  const signature = signatureOf(info, verdict);
  if (verdict.state !== 'aucun' && signature !== lastSignature) observed.add(signature);

  const note = place(ctx, NOTE_ID, 'section', 'points-e055-note', detail);
  put(note, 'role', 'note');
  put(note, 'aria-labelledby', TITLE_ID);

  if (verdict.state === 'aucun') {
    note.hidden = true;
    note.replaceChildren();
    linkConfidence(info.conf, false);
    lastSignature = '';
  } else {
    if (signature !== lastSignature) {
      writeNote(ctx, note, info, verdict, silences);
      lastSignature = signature;
    }
    note.hidden = false;
    linkConfidence(info.conf, true);
  }

  const nav = detail.querySelector('.points-nav');
  if (nav && note.nextSibling !== nav) detail.insertBefore(note, nav);
  else if (!nav && note.parentElement !== detail) detail.appendChild(note);

  /* E055-09 — Miroirs d'état auditables, tous préfixés points-e055-. */
  put(detail, 'data-points-e055-state', verdict.state);
  put(detail, 'data-points-e055-raw', info.raw);
  put(detail, 'data-points-e055-silences', String(silences));
  put(detail, 'data-points-e055-signature', signature);
  put(detail, 'data-points-e055-observed', String(observed.size));
  put(layout, 'data-points-e055-css', CSS_ID);
  try {
    put(layout, 'data-points-e055-motion',
      typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? 'reduce' : 'normal');
  } catch {
    put(layout, 'data-points-e055-motion', 'normal');
  }
  put(detail, 'data-points-e055-active', verdict.state === 'aucun' ? '0' : '1');
});
