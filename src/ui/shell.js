/* Coque unique : barre, situation, fil, scène, pied. */
import {
  state, goView, toggleHelp, toggleDetail,
  currentCountry, currentEra, currentEvent,
} from '../domain/store.js';
/* M4 : le catalogue public de app.js est la source unique des libellés, de l'ordre,
 * des niveaux et des raccourcis. Import circulaire ESM maîtrisé : VIEW_TAXONOMY
 * n'est jamais lu au niveau module, seulement dans des fonctions appelées
 * après mount(), invoqué par app.js:124 une fois ses constantes initialisées. */
import {
  TAXONOMY_VERSION, VIEW_TAXONOMY, viewInfo, shortcuts, position,
} from '../app.js';
import { renderGlobe } from '../views/globe.js';
import { renderChronology } from '../views/chronology.js';
import { renderRecit } from '../views/recit.js';
import { renderGeography } from '../views/geography.js';
import { renderConstellation } from '../views/constellation.js';
import { renderPoints } from '../views/points.js';

const CSS_ID = 'atlas-coque-css';
const inertedNodes = new Set();
// M3 : CSS auto-porté complémentaire, injecté après le bloc historique.
const M3_CSS_ID = 'nav-m3';
const TAB_HELP_ID = 'atlas-tab-help';

let root = null;
let liveRegion = null;
let lastLive = null;
let lastModal = null;   // 'help' | 'detail' | null
let detailTrigger = null;
let modalTriggerSig = null;   // M3-07 : signature du contrôle qui a ouvert la modale.

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function formatYear(year) {
  return year < 0 ? `${Math.abs(year)} av. J.-C.` : String(year);
}

// M4 : raccourcis d'accès au catalogue, sans table locale de libellés.
function rootView() {
  return VIEW_TAXONOMY[0];
}
function labelFor(id) {
  return viewInfo(id)?.label || id;
}

// ATLAS-COQUE-08 : CSS auto-porté, injecté une seule fois, sans éditer styles.css.
function ensureCss() {
  if (document.getElementById(CSS_ID)) return;
  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = `
    .atlas-skip { position: absolute; left: -9999px; top: 0; z-index: 60; padding: 8px 12px; border: 1px solid var(--gold); border-radius: 8px; background: #0b0f15; color: var(--gold-bright); font-size: 11px; }
    .atlas-skip:focus { left: 8px; top: 6px; }
    .shell-tab { min-height: 36px; min-width: 0; }
    .shell-tabs { min-width: 0; flex: 1 1 auto; }
    .shell-icon { width: 36px; height: 36px; flex: none; }
    .shell-brand { flex: none; }
    .crumb { min-height: 24px; padding: 6px 8px; }
    .shell-tab[aria-current="page"] { color: var(--gold-bright); border-color: var(--line-strong); background: rgba(230,185,111,.1); }
    .shell-tab:focus-visible, .shell-icon:focus-visible, .crumb:focus-visible, .atlas-close:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 3px; }
    .atlas-close { min-height: 36px; padding: 0 12px; border: 1px solid var(--line-strong); border-radius: 8px; background: rgba(230,185,111,.08); color: var(--gold-bright); font-size: 10px; cursor: pointer; }
    .atlas-close:hover { border-color: var(--gold-bright); }
    .atlas-dialog-head { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-bottom: 8px; }
    .sr-only { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
    @media (max-width: 620px) {
      .shell-brand { min-width: 0; }
      .shell-brand strong { font-size: 9px; }
      .shell-tabs { gap: 1px; min-width: 0; }
      .shell-tab { min-height: 36px; min-width: 0; padding: 0 2px; font-size: 8px; flex: 1 1 0; overflow: hidden; letter-spacing: -.02em; }
      .shell-tab .tab-num { display: none; }
      .shell-tab { font-size: 8px; }
      .tab-num { display: none; }
      .shell-icon { width: 36px; height: 36px; flex: none; }
      .help-sheet, .detail-sheet { padding: 18px 16px; }
    }
    @media (prefers-reduced-motion: reduce) { .atlas-skip, .atlas-close { transition: none; } }
  `;
  document.head.appendChild(style);
}

// M3-02 / M3-09 : style injecté sous un identifiant dédié, après styles.css et #atlas-coque-css.
function ensureM3Css() {
  if (document.getElementById(M3_CSS_ID)) return;
  const style = document.createElement('style');
  style.id = M3_CSS_ID;
  style.textContent = `
    .atlas-situation {
      display: flex; align-items: center; flex: none; min-height: 26px;
      padding: 4px 20px; border-bottom: 1px solid var(--line);
      background: #0a0e13; color: var(--gold-bright);
      font-size: 10px; letter-spacing: .03em;
    }
    .atlas-situation .situation-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .shell-trail { flex-wrap: nowrap; overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-width: thin; }
    .shell-trail .crumb { display: inline-flex; align-items: center; flex: none; min-height: 36px; }
    .shell-trail .rank { flex: none; white-space: nowrap; }
    .shell-icon.atlas-back { display: inline-flex; align-items: center; justify-content: center; gap: 2px; width: auto; min-width: 40px; padding: 0 6px; font-size: 16px; }
    .atlas-back::after { content: ' Retour'; color: var(--gold-bright); font-size: 8px; letter-spacing: .04em; }
    .atlas-back[disabled] { opacity: .35; cursor: default; }
    .atlas-help-freeze { padding: 8px 10px; border-left: 2px solid var(--blue); background: rgba(127,156,255,.06); }
    .atlas-help-context {
      margin: 0 0 14px; padding: 8px 10px;
      border-left: 2px solid var(--gold); background: rgba(230,185,111,.06);
      color: var(--gold-bright); font-size: 10px;
    }
    @media (max-width: 620px) {
      .atlas-situation { padding: 4px 10px; font-size: 9px; }
      .shell-trail { padding: 4px 10px; gap: 3px; }
      .shell-icon { width: 40px; height: 40px; }
      .shell-footer span:first-child { display: inline; }
    }
    @media (prefers-reduced-motion: reduce) { .shell-trail { scroll-behavior: auto; } }
  `;
  document.head.appendChild(style);
}

// ATLAS-COQUE-03 : région live persistante, hors de #app donc jamais recréée.
function ensureLive() {
  if (liveRegion) return;
  liveRegion = el('div', 'sr-only');
  liveRegion.id = 'atlas-status-live';
  liveRegion.setAttribute('role', 'status');
  liveRegion.setAttribute('aria-live', 'polite');
  liveRegion.setAttribute('aria-atomic', 'true');
  document.body.appendChild(liveRegion);
}

// M3-01 / M3-02 / M3-06 / M3-10 ; M4 : position() est la source sémantique.
function pathParts(pos = position()) {
  const parts = [rootView().label];
  if (pos.countryName) {
    parts.push(pos.countryName);
    if (pos.eraName) parts.push(pos.eraName);
    if (pos.eventTitle) parts.push(pos.eventTitle);
  }
  const label = pos.label || labelFor(pos.view);
  if (label !== parts[parts.length - 1]) parts.push(label);
  return parts;
}

function situationText() {
  const pos = position();
  const path = pathParts(pos);
  if (pos.view === rootView().id) return `${path.join(' › ')} · vue d’ensemble`;
  if (!pos.countryName) return `${path.join(' › ')} · aucun pays sélectionné`;
  return path.join(' › ');
}

// M3-04 : une seule cible de retour, dérivée de l'état.
function backTarget() {
  if (state.helpOpen) return 'help';
  if (state.detailOpen) return 'detail';
  return state.view === rootView().id ? null : 'globe';
}

function backLabel() {
  const target = backTarget();
  if (target === 'help') return 'Retour : fermer l’aide';
  if (target === 'detail') return 'Retour : fermer le détail';
  if (target === 'globe') return `Retour : revenir au ${rootView().label}`;
  return `Retour indisponible : vous êtes au ${rootView().label}`;
}

function announcement() {
  const pos = position();
  const where = situationText();
  if (state.helpOpen) return `Aide ouverte. Vous êtes ici : ${where}. Échap ou Retour pour fermer.`;
  if (state.detailOpen && pos.eventTitle) return `Détail ouvert : ${pos.eventTitle}. Vous êtes ici : ${where}. Échap ou Retour pour fermer.`;
  if (pos.view === 'recit' && pos.eventTitle) {
    const point = currentEvent()?.points[pos.pointIndex] || currentEvent()?.points[0];
    const total = currentEvent()?.points.length || 0;
    return `Vous êtes ici : ${where}. Point ${pos.pointIndex + 1} sur ${total}. ${point?.text || pos.eventTitle}`;
  }
  if (!pos.countryName) return `Vous êtes ici : ${where}.`;
  return `Vous êtes ici : ${where}. Repère ${pos.eventIndex + 1} sur ${pos.eventCount}.`;
}

function updateLive() {
  const text = announcement();
  if (text === lastLive) return;
  lastLive = text;
  // Déduplication inter-modules : le routeur clavier écrit dans la même fenêtre.
  if (document.documentElement.dataset.lastAnnounce === text) return;
  document.documentElement.dataset.lastAnnounce = text;
  if (liveRegion) liveRegion.textContent = text;
}

/* V2-06 : au plus deux régions live subsistent après le rendu des lentilles.
 * Les régions redondantes restent dans le DOM (le JS peut continuer à y écrire)
 * mais perdent leur sémantique d'annonce. */
let enforcingLive = false;
let liveObserver = null;

function enforceLiveBudget() {
  if (enforcingLive) return;
  enforcingLive = true;
  const keep = new Set(['atlas-status-live', 'nav-t2-live']);
  document.querySelectorAll('[aria-live],[role="status"]').forEach((node) => {
    if (keep.has(node.id)) return;
    node.removeAttribute('aria-live');
    node.removeAttribute('role');
    node.setAttribute('data-live-legacy', '1');
  });
  enforcingLive = false;
}

/* Les lentilles chargées en différé créent leurs régions après le rendu. */
function watchLiveBudget() {
  if (liveObserver || typeof MutationObserver === 'undefined') return;
  liveObserver = new MutationObserver(() => enforceLiveBudget());
  liveObserver.observe(document.body, { childList: true, subtree: true });
}

function captureFocusKey() {
  const active = document.activeElement;
  return active instanceof Element ? (active.getAttribute('data-fk') || null) : null;
}

// M3-07 : texte stable, en ignorant les icônes aria-hidden (ex. lecture ▶/❚❚).
function stableText(node) {
  let text = '';
  for (const child of node.childNodes) {
    if (child.nodeType === 3) text += child.nodeValue;
    else if (child instanceof Element && child.getAttribute('aria-hidden') !== 'true'
      && !child.classList.contains('sr-only')) text += stableText(child);
  }
  return text.trim().slice(0, 80);
}

// M3-07 : signature stable d'un contrôle de vue (les vues ne portent pas toutes data-fk).
function focusSignature(node) {
  if (!(node instanceof Element)) return null;
  const parent = node.parentElement;
  const label = node.getAttribute('aria-label') || '';
  const index = parent
    ? Array.from(parent.children).filter((sibling) => sibling.tagName === node.tagName
      && (sibling.getAttribute('aria-label') || '') === label).indexOf(node)
    : 0;
  return {
    tag: node.tagName,
    role: node.getAttribute('role') || '',
    label,
    current: node.getAttribute('aria-current') || '',
    text: stableText(node),
    index,
  };
}

function focusCandidates() {
  if (!root) return [];
  const stage = root.querySelector('#atlas-stage');
  const nodes = Array.from(root.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
  return stage ? [stage, ...nodes] : nodes;
}

function findBySignature(signature) {
  if (!signature) return null;
  return focusCandidates().find((node) => {
    const candidate = focusSignature(node);
    return candidate.tag === signature.tag && candidate.role === signature.role
      && candidate.label === signature.label && candidate.current === signature.current
      && candidate.text === signature.text && candidate.index === signature.index;
  }) || null;
}

function findByKey(key) {
  if (!key || !root) return null;
  const node = root.querySelector(`[data-fk="${key}"]`);
  return node instanceof HTMLElement && !node.disabled ? node : null;
}

function focusStage() {
  root.querySelector('#atlas-stage')?.focus({ preventScroll: true });
}

// ATLAS-COQUE-02 / M3-07 : restauration après innerHTML, sans vol de focus en auto-lecture.
function manageFocus(captured, reason) {
  const key = captured.key;
  const signature = captured.sig;
  const modalNow = state.helpOpen ? 'help' : state.detailOpen ? 'detail' : null;
  const passive = reason === 'play' || reason === 'autoplay';
  const initial = reason === undefined;
  // Un clic pays (reason 'country') mène au titre du repère de la chronologie.
  // L'annonce reste portée par la seule région live de la coque (updateLive) :
  // aucun message supplémentaire n'est écrit ici, et le contenu existant est conservé.
  const countryTitle = reason === 'country' ? findByKey('country-title') : null;
  if (modalNow) {
    if (modalNow !== lastModal) {
      detailTrigger = key;
      modalTriggerSig = signature;
    }
    const close = findByKey(`${modalNow}-close`);
    if (close) close.focus({ preventScroll: true });
    else root.querySelector('.help-overlay, .detail-overlay')?.focus?.({ preventScroll: true });
  } else if (countryTitle) {
    // Le titre du repère est la cible dédiée ; sinon la chaîne historique est reprise telle quelle.
    countryTitle.focus({ preventScroll: true });
  } else if (lastModal) {
    const triggerKey = lastModal === 'help' ? 'help-toggle' : detailTrigger;
    const target = (modalTriggerSig && findBySignature(modalTriggerSig)) || findByKey(triggerKey);
    if (target) target.focus({ preventScroll: true });
    else if (!passive) focusStage();
    modalTriggerSig = null;
    detailTrigger = null;
  } else if (passive) {
    const target = (signature && findBySignature(signature)) || findByKey(key);
    if (target) target.focus({ preventScroll: true });
  } else if (key) {
    const target = findByKey(key) || (signature && findBySignature(signature));
    if (target) target.focus({ preventScroll: true });
    else focusStage();
  } else if (signature && signature.tag !== 'BODY' && !initial) {
    const target = findBySignature(signature);
    if (target) target.focus({ preventScroll: true });
    else focusStage();
  }
  lastModal = modalNow;
}

// ATLAS-COQUE-04 : piège de Tab local, le routeur global ne gère pas Tab.
function trapTab(overlay) {
  overlay.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusables = Array.from(overlay.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'));
    if (!focusables.length) {
      event.preventDefault();
      overlay.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

// ATLAS-COQUE-04 / M3-08 : dialogue décrit, fermable par bouton, fond et Échap.
function makeDialog(overlay, sheet, titleId, closeKey, closeLabel, describedId) {
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', titleId);
  if (describedId) overlay.setAttribute('aria-describedby', describedId);
  overlay.tabIndex = -1;
  const head = el('div', 'atlas-dialog-head');
  const close = el('button', 'atlas-close', closeLabel);
  close.type = 'button';
  close.dataset.fk = closeKey;
  const closeAction = closeKey === 'help-close' ? toggleHelp : toggleDetail;
  close.addEventListener('click', closeAction);
  head.appendChild(close);
  sheet.insertBefore(head, sheet.firstChild);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeAction();
  });
  trapTab(overlay);
}

function renderBar(parent) {
  const bar = el('header', 'shell-bar');
  const skip = el('a', 'atlas-skip', 'Aller au contenu');
  skip.href = '#atlas-stage';
  bar.appendChild(skip);

  const brand = el('div', 'shell-brand');
  brand.append(el('strong', '', 'Vectemporel'), el('span', '', 'Atlas · données locales'));

  const tabs = el('nav', 'shell-tabs');
  tabs.setAttribute('aria-label', 'Vues de l’atlas');
  tabs.setAttribute('data-taxonomy', TAXONOMY_VERSION);
  const digits = VIEW_TAXONOMY.map((view) => view.digit);
  const letters = VIEW_TAXONOMY.map((view) => view.letter);
  // M4 : l'aide des onglets est générée depuis le catalogue (libellés, niveaux, rôles, touches).
  const details = VIEW_TAXONOMY.map((view) => `${view.digit} ${view.label} : ${view.role}`).join(' ; ');
  const tabHelp = el('p', 'sr-only', `Ordre macro vers micro : ${details}. Touches ${digits[0]} à ${digits[digits.length - 1]} ou ${letters.join(', ')} pour changer de vue.`);
  tabHelp.id = TAB_HELP_ID;
  tabs.appendChild(tabHelp);
  tabs.setAttribute('aria-describedby', TAB_HELP_ID);
  VIEW_TAXONOMY.forEach((view) => {
    const { id, label, digit, level, role } = view;
    const button = el('button', `shell-tab${state.view === id ? ' is-active' : ''}`);
    button.type = 'button';
    // M3-03 / M4 : nom accessible = niveau et rôle issus du catalogue, libellé visible stable.
    button.setAttribute('aria-label', `niveau ${level} sur ${VIEW_TAXONOMY.length} · ${label} · ${role}`);
    button.append(el('span', 'tab-num', `${digit} · `), el('span', 'tab-label', label));
    button.dataset.fk = `tab-${id}`;
    button.setAttribute('aria-keyshortcuts', digit);
    if (state.view === id) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', () => goView(id));
    tabs.appendChild(button);
  });

  const right = el('div', 'shell-actions');
  // M3-04 : commande de retour unique de la coque, même effet qu'Échap.
  const back = el('button', 'shell-icon atlas-back', '↩');
  back.type = 'button';
  back.dataset.fk = 'back';
  back.setAttribute('aria-label', backLabel());
  back.setAttribute('aria-keyshortcuts', 'Escape');
  back.setAttribute('aria-disabled', String(!backTarget()));
  back.disabled = !backTarget();
  back.title = backLabel();
  back.addEventListener('click', () => {
    const target = backTarget();
    if (target === 'help') toggleHelp();
    else if (target === 'detail') toggleDetail();
    else if (target === 'globe') goView(rootView().id);
  });
  right.appendChild(back);

  const help = el('button', 'shell-icon', '?');
  help.type = 'button';
  help.dataset.fk = 'help-toggle';
  help.setAttribute('aria-label', 'Aide clavier');
  help.setAttribute('aria-expanded', String(state.helpOpen));
  help.setAttribute('aria-controls', 'atlas-help');
  // M3-08 : le bouton annonce qu'il ouvre un dialogue.
  help.setAttribute('aria-haspopup', 'dialog');
  help.setAttribute('aria-keyshortcuts', 'Shift+Slash');
  help.addEventListener('click', () => toggleHelp());
  right.appendChild(help);
  bar.append(brand, tabs, right);
  parent.appendChild(bar);
  return bar;
}

// M3-02 : bandeau de situation permanent, textuel, partagé avec le fil et le live.
function renderSituation(parent) {
  const node = el('div', 'atlas-situation');
  node.dataset.fk = 'situation';
  node.append(el('span', 'sr-only', 'Vous êtes ici : '), el('span', 'situation-text', situationText()));
  parent.appendChild(node);
  return node;
}

// M3-01 : fil d'Ariane macro→micro, jalon courant non focusable.
function renderTrail(parent) {
  const trail = el('nav', 'shell-trail');
  trail.setAttribute('aria-label', 'Fil d’Ariane');
  const parts = pathParts();
  parts.forEach((label, index) => {
    if (index) {
      const sep = el('span', 'sep', ' › ');
      sep.setAttribute('aria-hidden', 'true');
      trail.appendChild(sep);
    }
    const last = index === parts.length - 1;
    const node = last ? el('span', 'crumb is-current') : el('button', 'crumb');
    node.textContent = label;
    if (last) {
      node.setAttribute('aria-current', 'page');
    } else {
      node.type = 'button';
      node.dataset.fk = `crumb-${index}`;
      node.addEventListener('click', () => goView(index === 0 ? rootView().id : VIEW_TAXONOMY[1].id));
    }
    trail.appendChild(node);
  });
  const country = state.view === rootView().id ? null : currentCountry();
  const event = country ? currentEvent() : null;
  if (country && event) {
    trail.appendChild(el('span', 'rank', `${state.eventIndex + 1} / ${country.events.length} · ${formatYear(event.year)}`));
  }
  parent.appendChild(trail);
  return trail;
}

// M3-05 : aide contextualisée, alignée sur shortcuts() et sur le retour unique.
function renderHelp(parent) {
  if (!state.helpOpen) return false;
  const overlay = el('div', 'help-overlay');
  const sheet = el('div', 'help-sheet');
  sheet.id = 'atlas-help';
  const title = el('h2', '', `Aide · ${labelFor(state.view)}`);
  title.id = 'atlas-help-title';
  sheet.appendChild(title);
  const context = el('p', 'atlas-help-context', `Vous êtes ici : ${situationText()}.`);
  context.id = 'atlas-help-context';
  sheet.appendChild(context);
  const grid = el('div', 'help-grid');
  // T2-03 / M4 : la grille reflète la map unique du routeur ; repli sur shortcuts()
  // si le contrat public n'est pas (encore) publié.
  const routerKeys = window.VECTEMPOREL_KEYS;
  const mapRows = typeof routerKeys?.helpMap === 'function'
    ? routerKeys.helpMap().map(({ key, label, view }) => ({
      key,
      label: `${label}${view === state.view ? ' · vue courante' : view ? ` · vue ${labelFor(view)}` : ''}`,
    }))
    : shortcuts().map(({ key, action, scope }) => ({ key, label: `${action} · ${scope}` }));
  mapRows.forEach(({ key, label }) => {
    const row = el('div', 'help-row');
    row.append(el('kbd', '', key), el('span', '', label));
    grid.appendChild(row);
  });
  sheet.appendChild(grid);
  sheet.appendChild(el('p', '', `Rôle de cette vue : ${viewInfo(state.view)?.role || ''}`));
  // T2-09 : le gel des modales est explicité dans l'aide, pas seulement technique.
  sheet.appendChild(el('p', 'atlas-help-freeze', 'Modale ouverte (aide ou détail) : le reste de l’interface est gelé — ni clic ni Tab ne l’atteignent, et la lecture automatique est suspendue. Échap, le bouton Fermer ou un clic hors de la feuille permettent de sortir.'));
  sheet.appendChild(el('p', '', 'Le bouton Retour de la barre et Échap ont le même effet. Les boutons « ← Chronologie » des vues restent des raccourcis locaux.'));
  sheet.appendChild(el('p', '', 'Aucun lien externe, aucune requête réseau : tous les points proviennent des audits locaux. Les degrés de certitude sont affichés dans le détail.'));
  makeDialog(overlay, sheet, 'atlas-help-title', 'help-close', 'Fermer l’aide (Échap)', 'atlas-help-context');
  overlay.appendChild(sheet);
  parent.appendChild(overlay);
  return true;
}

function renderDetail(parent) {
  if (!state.detailOpen) return false;
  const country = currentCountry();
  const event = currentEvent();
  if (!event) return false;
  const overlay = el('div', 'help-overlay detail-overlay');
  const sheet = el('div', 'detail-sheet');
  const title = el('h2', '', event.title);
  title.id = 'atlas-detail-title';
  sheet.appendChild(title);
  sheet.appendChild(el('p', 'detail-year', `${formatYear(event.year)} · ${currentEra()?.name || ''}`));
  const audit = country?.audit;
  const signed = Boolean(audit?.signoff?.signed_by?.length);
  sheet.appendChild(el('p', 'detail-audit-state', signed
    ? `Audit signé${audit.signoff.date ? ` le ${audit.signoff.date}` : ''} · points extraits`
    : `Audit non signé${audit?.blocked ? ' · blocage documenté' : ''} · points extraits, non validés`));
  event.points.forEach((point) => {
    const row = el('div', 'detail-point');
    row.append(el('span', `point-kind is-${point.kind}`, point.kind), el('span', 'confidence', point.confidence));
    row.appendChild(el('p', '', point.text));
    if (point.sources.length) row.appendChild(el('small', '', `sources : ${point.sources.join(', ')}`));
    sheet.appendChild(row);
  });
  const actors = event.actors.map((actor) => actor.label).join(' · ');
  const places = event.places.map((place) => place.label).join(' · ');
  if (actors) sheet.appendChild(el('p', 'detail-meta', `Figures : ${actors}`));
  if (places) sheet.appendChild(el('p', 'detail-meta', `Lieux : ${places}`));
  if (country?.sources.length) {
    sheet.appendChild(el('p', 'detail-meta', `Registre local : ${country.sources.length} références documentées (titres affichés sans lien), dont ${country.sources.filter((source) => source.doi).length} DOI.`));
  }
  makeDialog(overlay, sheet, 'atlas-detail-title', 'detail-close', 'Fermer le détail (Échap)');
  overlay.appendChild(sheet);
  parent.appendChild(overlay);
  return true;
}

// ATLAS-COQUE-07 / M3-06 / M4 : pied dérivé de position(), sans table locale.
function footerText() {
  const pos = position();
  const label = pos.label || labelFor(pos.view);
  const progress = pos.countryName && pos.eventTitle
    ? ` · repère ${pos.eventIndex + 1}/${pos.eventCount}` : '';
  const left = `Vous êtes ici · ${label}${progress}`;
  const viewCount = window.VATLAS?.taxonomy?.length || 6;
  let right;
  if (pos.view === rootView().id) right = `1–${viewCount} vues · Échap retour · ? aide`;
  else if (state.playing) right = 'lecture en cours · Espace pour arrêter · ? aide';
  else right = `← → repère · ↑ ↓ période · 1–${viewCount} vues · Échap retour · ? aide`;
  return [left, right];
}

// M3-07 : render reçoit désormais (state, reason) depuis subscribe(app.js:125).
export function render(_state, reason) {
  if (!root) return;
  const activeBefore = document.activeElement;
  const captured = { key: captureFocusKey(), sig: focusSignature(activeBefore) };
  root.innerHTML = '';
  const bar = renderBar(root);
  const situation = renderSituation(root);
  const trail = renderTrail(root);
  const stage = el('main', 'shell-stage');
  stage.id = 'atlas-stage';
  stage.tabIndex = -1;
  stage.setAttribute('aria-label', `Contenu : ${labelFor(state.view)}`);
  root.appendChild(stage);
  if (state.view === rootView().id) renderGlobe(stage);
  else if (!state.countryId) {
    stage.appendChild(el('div', 'empty-stage', `Choisissez un pays sur le ${rootView().label}.`));
  } else if (state.view === 'chronology') renderChronology(stage);
  else if (state.view === 'recit') renderRecit(stage);
  else if (state.view === 'geography') renderGeography(stage);
  else if (state.view === 'constellation') renderConstellation(stage);
  else if (state.view === 'points') renderPoints(stage);
  // M3-01 : un id de vue inconnu ne doit jamais rendre une autre vue à sa place.
  else stage.appendChild(el('div', 'empty-stage', `Vue « ${labelFor(state.view)} » indisponible.`));
  const footer = el('footer', 'shell-footer');
  footer.setAttribute('aria-label', 'Situation et raccourcis');
  const [left, right] = footerText();
  footer.append(el('span', '', left), el('span', '', right));
  root.appendChild(footer);

  // Une modale n'existe que si renderHelp/renderDetail en a réellement inséré une.
  for (const node of inertedNodes) node.inert = false;
  inertedNodes.clear();
  const helpInserted = renderHelp(root);
  const detailInserted = renderDetail(root);
  enforceLiveBudget();
  // Certaines lentilles créent leur région live dans un callback différé.
  setTimeout(enforceLiveBudget, 0);
  if (helpInserted || detailInserted) {
    const dialogs = new Set([...root.querySelectorAll('[role="dialog"]')]);
    const live = new Set([...document.querySelectorAll('[role="status"],[aria-live]')]);
    for (const node of [bar, situation, trail, stage, footer, ...document.body.children]) {
      if (node === root || dialogs.has(node) || live.has(node)) continue;
      node.inert = true;
      inertedNodes.add(node);
    }
  }
  manageFocus(captured, reason);
  updateLive();
}

export function mount(element) {
  root = element;
  ensureCss();
  ensureM3Css();
  ensureLive();
  watchLiveBudget();
  render();
  // ATLAS-COQUE-10 / M3-04 / M3-10 / M4 : crochets de test additifs.
  window.VATLAS_A11Y = {
    getLive: () => liveRegion?.textContent || '',
    focusKey: () => captureFocusKey(),
    modal: () => (state.helpOpen ? 'help' : state.detailOpen ? 'detail' : null),
    situation: () => situationText(),
    back: () => backTarget(),
    taxonomy: () => TAXONOMY_VERSION,
  };
}
