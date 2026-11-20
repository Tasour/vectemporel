import { register } from './registry.js';

/* Lentille V2 E056 — omission de source explicite (identifiant d'omission).
 * Seconde passe de la vue Chronologie, domaine F « Sémantique & données ».
 *
 * Rapport : UNIFIED_AUDIT/CHRONOLOGIE/V2/views/E056.md — chantiers E056-01 à E056-10.
 * Fichier possédé : src/views/chronology/v2/E056.js uniquement. Aucun fichier
 * partagé n'est modifié (registry.js, index.js, styles.css et chronology.js sont
 * laissés intacts, ainsi que la passe 1).
 *
 * Contexte fourni par runEnhancementsV2 (chronology.js:541) :
 *   ctx = { viewId: 'chronologyv2', stage, layout, css, el, reducedMotion }.
 * La vue rend les sources des points dans <ul class="point-sources">
 * (chronology.js:490-501) et pose data-point-id sur chaque <li class="point">
 * (chronology.js:474-480). Un point sans liste de sources est donc une omission
 * de source : la lentille la rend explicite avec un identifiant déterministe,
 * sans inventer de donnée ni modifier le magasin.
 *
 * Invariants : un seul register('E056', install), un seul
 * ctx.css('chronology-v2-e056', …), aucun réseau, aucun aléa, aucun timer,
 * aucune boucle rAF, aucun innerHTML, aucun console.*. Tous les identifiants
 * DOM créés sont préfixés chronology-v2-e056- et protégés par garde d'existence.
 */

const CSS_ID = 'chronology-v2-e056';
const PANEL_ID = 'chronology-v2-e056-panel';
const TITLE_ID = 'chronology-v2-e056-title';
const REGISTER_ID = 'chronology-v2-e056-register';
const LIST_ID = 'chronology-v2-e056-register-list';
const READOUT_ID = 'chronology-v2-e056-readout';
const METRIC_ID = 'chronology-v2-e056-metric';
const ANCHOR_PREFIX = 'chronology-v2-e056-anchor-';
const SRC_MARK = 'chronology-v2-e056-flag';
const CARD_MARK = 'chronology-v2-e056-event-flag';

/* E056-03, E056-07 et E056-09 : feuille unique. Aucun état n'est porté par la
   seule couleur : le drapeau assemble un identifiant textuel, un motif en
   pointillés/hachures et un libellé. Repli mouvement réduit et forced-colors. */
const CSS = `
  #${PANEL_ID} {
    margin: 18px 0 4px; padding: 11px 13px 12px;
    border: 1px solid var(--line); border-left: 3px dashed var(--gold);
    border-radius: 10px; background: rgba(255,255,255,.02);
    color: var(--ink-soft); font: inherit; font-size: 10px; line-height: 1.5;
    font-variant-numeric: tabular-nums; overflow-wrap: anywhere;
  }
  #${PANEL_ID} .chronology-v2-e056-title {
    margin: 0 0 6px; color: var(--gold-bright);
    font-family: var(--serif); font-size: 14px; font-weight: 600;
    letter-spacing: 0; text-transform: none;
  }
  #${PANEL_ID} .chronology-v2-e056-lede { margin: 0 0 8px; color: var(--muted); }
  .${SRC_MARK} {
    display: block; margin-top: 5px; padding: 2px 6px;
    border: 1px dashed var(--gold); border-radius: 4px;
    background-image: repeating-linear-gradient(135deg, rgba(230,185,111,.12) 0 3px, transparent 3px 6px);
    color: var(--gold-bright); font-size: 9px; line-height: 1.4;
  }
  .chronology-v2-e056-anchor { display: inline-block; width: 0; height: 0; }
  .chronology-v2-e056-id { font-weight: 700; letter-spacing: .02em; }
  .chronology-v2-e056-label { font-weight: 400; }
  .chronology-v2-e056-link {
    margin-left: 6px; color: var(--gold-bright); text-decoration: underline;
    text-underline-offset: 2px;
  }
  .chronology-v2-e056-link:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  .${CARD_MARK} {
    display: block; margin-top: 3px; color: var(--gold-bright);
    font-size: 8px; font-weight: 600; white-space: nowrap;
  }
  .${CARD_MARK}::before { content: '◌ '; }
  #${REGISTER_ID} { margin: 8px 0 0; padding-top: 8px; border-top: 1px solid var(--line); }
  #${REGISTER_ID} .chronology-v2-e056-register-title {
    margin: 0 0 4px; color: var(--ink); font-family: var(--serif);
    font-size: 12px; font-weight: 450;
  }
  #${LIST_ID} {
    margin: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: 3px 10px; font-size: 9px; line-height: 1.45;
  }
  #${LIST_ID} dt { margin: 0; color: var(--gold-bright); font-variant-numeric: tabular-nums; }
  #${LIST_ID} dd { margin: 0; color: var(--ink-soft); }
  #${READOUT_ID}, #${METRIC_ID} {
    min-height: 13px; margin: 8px 0 0; color: var(--muted);
    font-size: 9px; line-height: 1.5; font-variant-numeric: tabular-nums;
  }
  #${METRIC_ID} { color: var(--muted-2); }
  @media (max-width: 620px) {
    #${PANEL_ID} { padding: 8px 9px; }
    #${LIST_ID} { grid-template-columns: minmax(0, 1fr); gap: 2px; }
    #${LIST_ID} dd { margin-bottom: 5px; }
    .${SRC_MARK} { font-size: 8px; }
  }
  @media (prefers-reduced-motion: reduce) {
    #${PANEL_ID}, #${PANEL_ID} *, .${SRC_MARK}, .${CARD_MARK} { transition: none !important; }
  }
  @media (forced-colors: active) {
    #${PANEL_ID} { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
    #${PANEL_ID} .chronology-v2-e056-title, #${PANEL_ID} .chronology-v2-e056-lede,
    .${SRC_MARK}, .${CARD_MARK}, #${LIST_ID} dt, #${LIST_ID} dd { color: CanvasText; }
    .${SRC_MARK} { border-style: dashed; border-color: CanvasText; background-image: none; forced-color-adjust: none; }
  }
`;

let renderCount = 0;

/* E056-10 : une seule écriture dédupliquée, comme dans la passe 1 (E049.js:125-127). */
function write(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

/* E056-10 : garde d'existence générique. Un nœud déjà posé dans le layout
   courant est réutilisé et déplacé, jamais cloné ; la coque reconstruisant #app,
   un nœud de la rendu précédent est détaché et n'est pas retrouvé par getElementById. */
function ensureNode(make, id, tagName, className, parent) {
  if (!parent) return null;
  let node = document.getElementById(id);
  if (!node) {
    node = make(tagName, className);
    node.id = id;
  }
  if (node.parentElement !== parent) parent.appendChild(node);
  return node;
}

/* E056-02 et E056-05 : l'identifiant d'omission dérive de data-point-id
   (chronology.js:476-479) ou, à défaut, du rang dans la liste. Aucun aléa,
   aucune date codée en dur. La qualification lit uniquement des attributs
   explicites : en l'absence de marqueur, l'omission est dite non qualifiée. */
function describeOmission(point, index) {
  const rawPointId = (point.dataset.pointId || `rang-${index + 1}`).trim();
  const pointId = rawPointId.replace(/[^A-Za-z0-9_-]/g, '-');
  const omissionId = `OM-E056-${pointId}`;
  const anchorId = `${ANCHOR_PREFIX}${index + 1}`;
  const raw = [point.dataset.omissionReason, point.dataset.sourceOmission, point.dataset.omission]
    .filter(Boolean).join(' ').toLowerCase();
  const justified = /justifi|délibér|intention|prévu|assumé/.test(raw);
  const reason = justified ? 'omission justifiée' : 'omission non qualifiée';
  return { point, pointId, omissionId, anchorId, justified, reason };
}

function buildPanel(make, host) {
  const panel = ensureNode(make, PANEL_ID, 'section', 'chronology-v2-e056-panel', host);
  if (!panel) return;
  if (panel.dataset.chronologyV2E056Built !== '1') {
    panel.dataset.chronologyV2E056Built = '1';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', TITLE_ID);

    const title = make('h2', 'chronology-v2-e056-title', 'Omissions de source — identifiants');
    title.id = TITLE_ID;
    const lede = make('p', 'chronology-v2-e056-lede',
      'Un point sans source documentée n’est pas un silence : il reçoit un identifiant d’omission explicite, relisible dans le registre ci-dessous.');
    const register = make('div', 'chronology-v2-e056-register');
    register.id = REGISTER_ID;
    const registerTitle = make('h3', 'chronology-v2-e056-register-title', 'Registre des omissions du repère affiché');
    const list = make('dl', 'chronology-v2-e056-register-list');
    list.id = LIST_ID;
    register.append(registerTitle, list);

    const readout = make('p', 'chronology-v2-e056-readout');
    readout.id = READOUT_ID;
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    const metric = make('p', 'chronology-v2-e056-metric');
    metric.id = METRIC_ID;
    panel.replaceChildren(title, lede, register, readout, metric);
  }
}

/* E056-06 : le repère courant est identifié par la carte aria-current
   (chronology.js:386-391) ; les identifiants d'omission y sont reportés. */
function findActiveEvent(host) {
  const card = host.querySelector('.event-card[aria-current="true"]');
  if (!card) return { card: null, item: null, id: '', label: '' };
  const id = card.dataset.eventId || '';
  const item = id ? host.querySelector(`li[data-event-id="${id}"]`) : null;
  const label = (card.querySelector('strong')?.textContent || '').trim();
  return { card, item, id, label };
}

function install(ctx) {
  if (!ctx || !ctx.layout || typeof ctx.el !== 'function') return;
  const make = ctx.el;
  const host = ctx.layout;
  const reduced = typeof ctx.reducedMotion === 'function' ? Boolean(ctx.reducedMotion()) : false;
  renderCount += 1;

  ctx.css(CSS_ID, CSS);
  buildPanel(make, host);

  /* E056-01 : détection en lecture seule des points sans <ul class="point-sources">
     (chronology.js:490-501). Les points pourvus de sources sont ignorés. */
  const points = Array.from(host.querySelectorAll('li.point'));
  const records = [];
  points.forEach((point, index) => {
    if (point.querySelector('ul.point-sources')) return;
    records.push(describeOmission(point, index));
  });

  /* E056-03, E056-04, E056-05 et E056-08 : un drapeau textuel par omission,
     un ancrage local, des attributs miroirs sur le point. La garde sur la classe
     empêche tout doublon si apply() est rejoué sur le même rendu. */
  records.forEach((record) => {
    const { point } = record;
    if (!point.querySelector(`.${SRC_MARK}`)) {
      const flag = make('span', SRC_MARK);
      const anchor = make('span', 'chronology-v2-e056-anchor');
      anchor.id = record.anchorId;
      const link = make('a', 'chronology-v2-e056-link', '(registre)');
      link.setAttribute('href', `#${REGISTER_ID}`);
      flag.append(
        anchor,
        make('strong', 'chronology-v2-e056-id', record.omissionId),
        make('span', 'chronology-v2-e056-label', ` — source omise · ${record.reason}`),
        link
      );
      point.appendChild(flag);
    }
    point.dataset.chronologyV2E056Id = record.omissionId;
    point.dataset.chronologyV2E056Reason = record.reason;
    point.dataset.chronologyV2E056Anchor = record.anchorId;
    point.dataset.chronologyV2E056Flag = '1';
  });

  const active = findActiveEvent(host);
  const ids = records.map((record) => record.omissionId);
  const justified = records.filter((record) => record.justified).length;

  /* E056-06 : agrégat reporté sur la carte active et sur son <li> dans la frise. */
  if (active.card) {
    active.card.dataset.chronologyV2E056Ids = ids.join(' ');
    if (!active.card.querySelector(`.${CARD_MARK}`)) {
      const text = ids.length ? `${ids.length} omission(s) de source` : 'Sources complètes';
      active.card.appendChild(make('span', CARD_MARK, text));
    }
  }
  if (active.item) active.item.dataset.chronologyV2E056Ids = ids.join(' ');

  /* E056-07 et E056-08 : registre indexable, une entrée par identifiant, avec
     retour ancré vers le point d'origine. replaceChildren évite l'accumulation. */
  const list = document.getElementById(LIST_ID);
  if (list) {
    const rows = [];
    if (!records.length) {
      rows.push(
        make('dt', '', 'Aucune omission'),
        make('dd', '', 'Tous les points du repère affiché portent au moins une source documentée.')
      );
    } else {
      records.forEach((record) => {
        const term = make('dt', '', `${record.omissionId} — ${record.pointId}`);
        const definition = make('dd', '',
          `${record.reason} ; repère : ${active.label || 'non identifié'} ; point : ${record.pointId}.`);
        const back = make('a', 'chronology-v2-e056-link', 'Retour au point');
        back.setAttribute('href', `#${record.anchorId}`);
        definition.appendChild(back);
        rows.push(term, definition);
      });
    }
    list.replaceChildren(...rows);
  }

  /* E056-09 : une seule région live, une phrase dédupliquée, dérivée du DOM. */
  write(document.getElementById(READOUT_ID),
    `Omissions de source — repère « ${active.label || 'inconnu'} » : ${records.length} point(s) sans source documentée`
      + `${ids.length ? ` (${ids.join(', ')})` : ''} ; justifiées : ${justified} ; non qualifiées : ${records.length - justified}.`);

  /* E056-01 et E056-09 : mémoire auditable et mesure d'ensemble, sans couleur. */
  const rate = points.length ? Math.round((records.length / points.length) * 100) : 0;
  write(document.getElementById(METRIC_ID),
    `Points examinés : ${points.length} · omissions : ${records.length} · part du repère : ${rate} %`
      + ` · mouvement réduit : ${reduced ? 'oui' : 'non'} · installations : ${renderCount}.`);

  host.dataset.chronologyV2E056 = '1';
  host.dataset.chronologyV2E056Omissions = String(records.length);
  host.dataset.chronologyV2E056Ids = ids.join(' ');
  host.dataset.chronologyV2E056Justified = String(justified);
  host.dataset.chronologyV2E056Reduced = reduced ? '1' : '0';
}

register('E056', install);
