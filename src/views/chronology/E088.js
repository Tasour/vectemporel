import { register } from './registry.js';

/* Lentille E088 — aide contextuelle, didacticiel et découverte des commandes.

   Dix chantiers, tous contenus dans ce module :
   E088-01 ancre d'aide · E088-02 panneau rétractable · E088-03 catalogue issu du DOM
   E088-04 raccourcis clavier · E088-05 glossaire · E088-06 infobulles
   E088-07 didacticiel guidé · E088-08 suggestions de recherche · E088-09 cue de découverte
   E088-10 idempotence, gardes d'existence et mouvement réduit.

   Aucune donnée inventée : le catalogue, les suggestions et les cibles du
   didacticiel sont lus dans le DOM que chronology.js vient de construire.
   Zéro journalisation, zéro réseau, zéro tirage aléatoire, zéro boucle
   d'animation propre, zéro écouteur de touche ajouté (le routeur clavier
   existant reste l'unique propriétaire des touches). */

const CSS_ID = 'chronology-e088';

/* État module : survit aux reconstructions complètes du stage (shell.js:137). */
let listenersAttached = false;
let helpOpen = false;
let helpSeen = false;
let tourActive = false;
let tourStep = 0;
let tourSeen = false;
let tipOwner = null;

const TOUR = [
  { selector: '#atlas-chrono-search', text: 'Étape 1 sur 4 — La recherche porte sur les repères et sur les points : saisissez un mot, une année ou un thème. La liste se filtre à chaque frappe (chronology.js:320-325).' },
  { selector: '.atlas-chrono-era-list .era-band', text: 'Étape 2 sur 4 — Une bande d’ère affiche une seule période à la fois ; les autres restent visibles pour le contexte (chronology.js:282-305).' },
  { selector: '#atlas-chrono-events .event-card', text: 'Étape 3 sur 4 — Choisissez un repère : sa fiche et ses points vérifiés s’affichent à droite (chronology.js:385-410).' },
  { selector: '.aside-actions', text: 'Étape 4 sur 4 — Les boutons précédent et suivant parcourent les repères sans revenir à la souris (chronology.js:507-526).' },
];

const TIPS = [
  { selector: '#atlas-chrono-search', text: 'Rechercher un repère, une année ou un thème. Le filtrage reste local à cette vue.' },
  { selector: '.atlas-chrono-era-list .era-band', text: 'Changer d’ère : les bandes gardent le contexte des autres périodes.' },
  { selector: '.atlas-chrono-tools .atlas-chrono-tag', text: 'Filtrer par thème : chaque clic bascule le filtre (aria-pressed).' },
  { selector: '#atlas-chrono-events .event-card', text: 'Ouvrir le repère et afficher ses points vérifiés dans la fiche.' },
  { selector: '#nav-c2a-back', text: 'Retour au monde : quitter la chronologie (raccourci Échap).' },
  { selector: '.atlas-chrono-tags .atlas-chrono-tag', text: 'Thème du repère courant : cliquer applique le même filtre global.' },
  { selector: '.aside-actions button', text: 'Repère précédent ou suivant : parcourir la liste sans quitter le clavier.' },
];

const CSS = `
@keyframes e088-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(.85)}}
.e088-help-toggle{
  position:relative;display:inline-flex;align-items:center;gap:6px;min-height:36px;
  padding:0 12px;border:1px solid var(--line);border-radius:999px;
  background:transparent;color:var(--gold-bright);font-size:10px;cursor:pointer;
}
.e088-help-toggle:hover{border-color:var(--gold)}
.e088-help-toggle[aria-expanded="true"]{border-color:var(--gold);background:rgba(230,185,111,.1)}
.e088-cue{
  padding:1px 5px;border:1px solid var(--gold);border-radius:999px;
  color:var(--gold);font-size:7px;letter-spacing:.08em;text-transform:uppercase;
  animation:e088-pulse 1.8s ease-in-out infinite;
}
.e088-panel{
  margin:10px 0 14px;padding:12px 14px;border:1px solid var(--line-strong);
  border-radius:10px;background:rgba(16,21,29,.96);
}
.e088-panel[hidden],.e088-tip[hidden],.e088-tour[hidden],.e088-suggest[hidden]{display:none!important}
.e088-panel-title{margin:0 0 6px;font-family:var(--serif);font-size:15px;font-weight:450;color:var(--gold-bright)}
.e088-panel-lede{margin:0 0 10px;color:var(--muted);font-size:10px;line-height:1.5}
.e088-sub{margin:12px 0 5px;color:var(--gold);font-size:8px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.e088-list{margin:0;padding-left:16px;color:var(--ink-soft);font-size:10px;line-height:1.6}
.e088-list li{margin:2px 0}
.e088-keys{display:grid;grid-template-columns:auto minmax(0,1fr);gap:4px 10px;margin:0;align-items:center}
.e088-key{margin:0}
.e088-key kbd{min-width:42px;padding:2px 6px;border:1px solid var(--line-strong);border-radius:5px;color:var(--gold-bright);font-family:var(--sans);font-size:9px;text-align:center}
.e088-key-desc{margin:0;color:var(--muted);font-size:10px}
.e088-glossary details{padding:4px 0;border-bottom:1px solid var(--line)}
.e088-glossary summary{cursor:pointer;color:var(--gold-bright);font-size:10px}
.e088-glossary p{margin:4px 0;color:var(--muted);font-size:10px;line-height:1.5}
.e088-start{min-height:36px;padding:0 12px;border:1px solid var(--gold);border-radius:8px;background:transparent;color:var(--gold-bright);font-size:10px;cursor:pointer}
.e088-start:hover{background:rgba(230,185,111,.1)}
.e088-tip{
  position:fixed;z-index:40;max-width:280px;padding:7px 10px;border:1px solid var(--line-strong);
  border-radius:8px;background:#0b0f15;color:var(--ink-soft);font-size:10px;line-height:1.45;
  pointer-events:none;box-shadow:0 6px 20px rgba(0,0,0,.5);
}
.e088-tour{
  position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:45;
  width:min(520px,calc(100vw - 24px));padding:12px 14px;border:1px solid var(--gold);
  border-radius:12px;background:#0b0f15;box-shadow:0 10px 34px rgba(0,0,0,.6);
}
.e088-tour-text{margin:0 0 10px;color:var(--ink-soft);font-size:11px;line-height:1.5}
.e088-tour-actions{display:flex;justify-content:flex-end;gap:8px}
.e088-tour-actions button{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink-soft);font-size:10px;cursor:pointer}
#e088-tour-next{border-color:var(--gold);color:var(--gold-bright)}
.e088-tour-target{outline:2px solid var(--gold-bright)!important;outline-offset:3px;box-shadow:0 0 0 6px rgba(230,185,111,.14)!important;border-radius:8px}
.e088-suggest{
  position:fixed;z-index:42;min-width:200px;max-width:320px;padding:6px;
  border:1px solid var(--line-strong);border-radius:8px;background:#0b0f15;
  box-shadow:0 8px 24px rgba(0,0,0,.5);
}
.e088-suggest-title{margin:2px 6px 5px;color:var(--muted-2);font-size:8px;letter-spacing:.1em;text-transform:uppercase}
.e088-suggest-empty{margin:2px 6px 5px;color:var(--muted-2);font-size:10px}
.e088-suggest-item{display:block;width:100%;min-height:30px;padding:4px 8px;border:0;border-radius:6px;background:transparent;color:var(--ink-soft);font-size:10px;text-align:left;cursor:pointer}
.e088-suggest-item:hover,.e088-suggest-item:focus-visible{background:rgba(230,185,111,.12);color:var(--gold-bright)}
@media (max-width:620px){
  .e088-tip{max-width:min(280px,calc(100vw - 24px))}
  .e088-tour{bottom:8px;padding:10px}
}
@media (prefers-reduced-motion:reduce){
  .e088-cue{animation:none!important}
  .e088-panel,.e088-tip,.e088-tour,.e088-suggest{transition:none!important}
}`;

function id(name) {
  return document.getElementById(name);
}

function mk(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function applyHelpState() {
  const panel = id('e088-help-panel');
  if (panel) panel.hidden = !helpOpen;
  const button = id('e088-help-toggle');
  if (button) button.setAttribute('aria-expanded', helpOpen ? 'true' : 'false');
}

function buildToggle(tools) {
  let button = id('e088-help-toggle');
  if (!button) {
    button = mk('button', 'e088-help-toggle', '? Aide et raccourcis');
    button.type = 'button';
    button.id = 'e088-help-toggle';
    button.setAttribute('aria-controls', 'e088-help-panel');
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      helpOpen = !helpOpen;
      helpSeen = true;
      const cue = id('e088-cue');
      if (cue) cue.hidden = true;
      applyHelpState();
    });
    tools.insertBefore(button, tools.firstChild);
  }
  if (!id('e088-cue')) {
    const cue = mk('span', 'e088-cue', 'Nouveau');
    cue.id = 'e088-cue';
    cue.setAttribute('aria-hidden', 'true');
    button.appendChild(cue);
  }
  id('e088-cue').hidden = helpSeen;
}

function buildPanel(main) {
  if (id('e088-help-panel')) return;
  const panel = mk('section', 'e088-panel');
  panel.id = 'e088-help-panel';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'e088-help-title');

  const title = mk('h2', 'e088-panel-title', 'Aide contextuelle — Chronologie');
  title.id = 'e088-help-title';
  panel.appendChild(title);
  panel.appendChild(mk('p', 'e088-panel-lede',
    'Cette aide décrit uniquement les commandes présentes à l’écran. Elle ne modifie ni le filtre ni l’état partagé.'));

  /* Catalogue dérivé du DOM réel : aucune commande imaginée. */
  panel.appendChild(mk('h3', 'e088-sub', 'Commandes de cette vue'));
  const search = id('atlas-chrono-search');
  const eras = document.querySelectorAll('.atlas-chrono-era-list .era-band').length;
  const tags = document.querySelectorAll('.atlas-chrono-tools .atlas-chrono-tag').length;
  const cards = document.querySelectorAll('#atlas-chrono-events .event-card').length;
  const points = document.querySelectorAll('.atlas-chrono-points .point').length;
  const commands = [
    ['Recherche', search
      ? `Champ « ${search.getAttribute('aria-label') || 'Rechercher'} » : filtre les repères et les points.`
      : 'Champ de recherche local de la vue.'],
    ['Ères', `${eras} bande(s) : choisir une période ; les autres restent visibles pour le contexte.`],
    ['Thèmes', `${tags} bouton(s) de filtre : chaque clic bascule l’état aria-pressed.`],
    ['Repères', `${cards} carte(s) cliquable(s) : ouvrir la fiche et ses points vérifiés.`],
    ['Points', `${points} point(s) documenté(s) pour le repère affiché.`],
    [' Retour', 'Le bouton « ← Retour au monde » quitte la chronologie.'],
  ];
  const list = mk('ul', 'e088-list');
  commands.forEach(([label, description]) => {
    const item = mk('li');
    item.appendChild(mk('strong', '', `${label} — `));
    item.appendChild(document.createTextNode(description));
    list.appendChild(item);
  });
  panel.appendChild(list);

  /* Raccourcis annoncés par la vue elle-même (chronology.js:231). */
  panel.appendChild(mk('h3', 'e088-sub', 'Raccourcis clavier'));
  const keys = mk('dl', 'e088-keys');
  [
    ['→', 'Repère suivant'],
    ['↑', 'Ère précédente'],
    ['↓', 'Ère suivante'],
    ['Entrée', 'Détail du repère'],
    ['?', 'Aide clavier globale'],
  ].forEach(([shortcut, meaning]) => {
    const dt = mk('dt', 'e088-key');
    dt.appendChild(mk('kbd', '', shortcut));
    keys.appendChild(dt);
    keys.appendChild(mk('dd', 'e088-key-desc', meaning));
  });
  panel.appendChild(keys);

  /* Glossaire des termes réellement employés dans l'interface. */
  panel.appendChild(mk('h3', 'e088-sub', 'Glossaire express'));
  const glossary = mk('div', 'e088-glossary');
  [
    ['Ère', 'Une période documentée du pays. Une seule ère est affichée à la fois ; les bandes conservent les autres.'],
    ['Repère', 'Un événement daté de l’ère courante. Cliquer sa carte affiche les points vérifiés.'],
    ['Point', 'Une affirmation sourcée attachée à un repère : son type et sa confiance sont indiqués.'],
    ['Thème', 'Une étiquette partagée par plusieurs repères ; elle sert de filtre (boutons aria-pressed).'],
    ['Source', 'La référence citée sous un point. Aucun appel réseau n’est nécessaire pour la consulter ici.'],
  ].forEach(([term, definition]) => {
    const details = mk('details');
    details.appendChild(mk('summary', '', term));
    details.appendChild(mk('p', '', definition));
    glossary.appendChild(details);
  });
  panel.appendChild(glossary);

  panel.appendChild(mk('h3', 'e088-sub', 'Premiers pas'));
  const start = mk('button', 'e088-start', tourSeen ? 'Revoir le didacticiel' : 'Lancer le didacticiel');
  start.type = 'button';
  start.id = 'e088-tour-start';
  start.addEventListener('click', startTour);
  panel.appendChild(start);

  panel.hidden = !helpOpen;
  const anchor = id('atlas-chrono-status');
  if (anchor) main.insertBefore(panel, anchor);
  else main.appendChild(panel);
}

function buildTip() {
  if (id('e088-tip')) return;
  const tip = mk('div', 'e088-tip');
  tip.id = 'e088-tip';
  tip.setAttribute('role', 'tooltip');
  tip.hidden = true;
  document.body.appendChild(tip);
}

function buildTour() {
  if (id('e088-tour')) return;
  const card = mk('div', 'e088-tour');
  card.id = 'e088-tour';
  card.setAttribute('role', 'group');
  card.setAttribute('aria-label', 'Didacticiel de la chronologie');
  card.hidden = true;
  const text = mk('p', 'e088-tour-text');
  text.id = 'e088-tour-text';
  card.appendChild(text);
  const actions = mk('div', 'e088-tour-actions');
  const skip = mk('button', '', 'Passer');
  skip.type = 'button';
  skip.id = 'e088-tour-skip';
  skip.addEventListener('click', endTour);
  const next = mk('button', '', 'Suivant');
  next.type = 'button';
  next.id = 'e088-tour-next';
  next.addEventListener('click', () => {
    tourStep += 1;
    showTourStep();
  });
  actions.append(skip, next);
  card.appendChild(actions);
  document.body.appendChild(card);
}

function buildSuggest() {
  if (id('e088-suggest')) return;
  const box = mk('div', 'e088-suggest');
  box.id = 'e088-suggest';
  box.hidden = true;
  document.body.appendChild(box);
}

function startTour() {
  tourActive = true;
  tourStep = 0;
  showTourStep();
}

function endTour() {
  tourActive = false;
  tourStep = 0;
  tourSeen = true;
  document.querySelectorAll('.e088-tour-target').forEach((node) => node.classList.remove('e088-tour-target'));
  const card = id('e088-tour');
  if (card) card.hidden = true;
  const start = id('e088-tour-start');
  if (start) start.textContent = 'Revoir le didacticiel';
}

function showTourStep() {
  const card = id('e088-tour');
  if (!tourActive || !card) return;
  if (tourStep >= TOUR.length) {
    endTour();
    return;
  }
  document.querySelectorAll('.e088-tour-target').forEach((node) => node.classList.remove('e088-tour-target'));
  const step = TOUR[tourStep];
  const target = document.querySelector(step.selector);
  if (!target) {
    tourStep += 1;
    showTourStep();
    return;
  }
  target.classList.add('e088-tour-target');
  const text = id('e088-tour-text');
  if (text) text.textContent = step.text;
  const next = id('e088-tour-next');
  if (next) next.textContent = tourStep === TOUR.length - 1 ? 'Terminer' : 'Suivant';
  card.hidden = false;
  try { target.focus({ preventScroll: true }); }
  catch { target.focus(); }
}

function findTip(node) {
  for (const entry of TIPS) {
    const control = node.closest(entry.selector);
    if (control) return { control, text: entry.text };
  }
  return null;
}

function showTip(control, text) {
  const tip = id('e088-tip');
  if (!tip) return;
  if (tipOwner && tipOwner !== control) clearTip();
  tipOwner = control;
  tip.textContent = text;
  tip.hidden = false;
  const rect = control.getBoundingClientRect();
  const width = Math.min(280, window.innerWidth - 24);
  let left = Math.round(rect.left);
  let top = Math.round(rect.bottom + 8);
  if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
  if (left < 12) left = 12;
  if (top + 90 > window.innerHeight) top = Math.max(12, Math.round(rect.top) - 90);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
  tip.style.maxWidth = `${width}px`;
  control.setAttribute('aria-describedby', 'e088-tip');
}

function clearTip() {
  const tip = id('e088-tip');
  if (tip) {
    tip.hidden = true;
    tip.textContent = '';
  }
  if (tipOwner && tipOwner.isConnected) tipOwner.removeAttribute('aria-describedby');
  tipOwner = null;
}

function hideSuggest() {
  const box = id('e088-suggest');
  if (box) box.hidden = true;
}

function showSuggestions(search) {
  const box = id('e088-suggest');
  if (!box || search.value.trim()) {
    hideSuggest();
    return;
  }
  const themes = [...document.querySelectorAll('.atlas-chrono-tools .atlas-chrono-tag')]
    .map((node) => node.textContent.trim())
    .filter(Boolean)
    .slice(0, 4);
  box.textContent = '';
  box.appendChild(mk('p', 'e088-suggest-title', 'Exemples de recherche'));
  if (!themes.length) {
    box.appendChild(mk('p', 'e088-suggest-empty', 'Aucun thème disponible pour ce pays.'));
  } else {
    themes.forEach((theme) => {
      const item = mk('button', 'e088-suggest-item', `Rechercher « ${theme} »`);
      item.type = 'button';
      item.dataset.e088Query = theme;
      box.appendChild(item);
    });
  }
  const rect = search.getBoundingClientRect();
  let left = Math.round(rect.left);
  if (left + 320 > window.innerWidth - 12) left = window.innerWidth - 332;
  if (left < 12) left = 12;
  box.style.left = `${left}px`;
  box.style.top = `${Math.round(rect.bottom + 6)}px`;
  box.hidden = false;
}

function onFocusIn(event) {
  const target = event.target;
  if (!target || target.nodeType !== 1) return;
  if (target.id === 'atlas-chrono-search') showSuggestions(target);
  const found = findTip(target);
  if (found) showTip(found.control, found.text);
}

function onMouseOver(event) {
  const target = event.target;
  if (!target || target.nodeType !== 1) return;
  const found = findTip(target);
  if (found) showTip(found.control, found.text);
}

function onFocusOut(event) {
  const target = event.target;
  if (target && target.id === 'atlas-chrono-search') {
    const related = event.relatedTarget;
    if (!related || !related.closest || !related.closest('#e088-suggest')) hideSuggest();
  }
  clearTip();
}

function onMouseOut(event) {
  const target = event.target;
  if (!target || target.nodeType !== 1) return;
  const found = findTip(target);
  if (!found) return;
  const related = event.relatedTarget;
  if (related && related.nodeType === 1 && found.control.contains(related)) return;
  if (tipOwner === found.control) clearTip();
}

function onMouseDown(event) {
  const item = event.target && event.target.closest ? event.target.closest('.e088-suggest-item') : null;
  if (!item) return;
  event.preventDefault();
  const search = id('atlas-chrono-search');
  if (search && item.dataset.e088Query) {
    search.value = item.dataset.e088Query;
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
  hideSuggest();
}

function attachListeners() {
  if (listenersAttached) return;
  listenersAttached = true;
  document.addEventListener('focusin', onFocusIn, true);
  document.addEventListener('focusout', onFocusOut, true);
  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('mousedown', onMouseDown, true);
}

register('E088', (ctx) => {
  ctx.css(CSS_ID, CSS);
  const root = ctx.layout || ctx.stage;
  const main = root ? root.querySelector('.chronology-main') : null;
  const tools = root ? root.querySelector('.atlas-chrono-tools') : null;
  if (!main || !tools) {
    clearTip();
    hideSuggest();
    const card = id('e088-tour');
    if (card) card.hidden = true;
    return;
  }

  buildToggle(tools);
  buildPanel(main);
  buildTip();
  buildTour();
  buildSuggest();
  applyHelpState();
  attachListeners();
  if (tourActive) showTourStep();
});
