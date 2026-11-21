import { register } from './registry.js';

/* Lentille CHRONOLOGIE E064 - Liens profonds, ancres d'événements et partage
 * de repère.
 *
 * Dix chantiers appliqués à chaque rendu par `runEnhancements` :
 *   E064-01 ancres des cartes de repère ;
 *   E064-02 ancres des points ;
 *   E064-03 panneau de liens profonds et mesures dérivées du DOM ;
 *   E064-04 résolution d'un lien profond entrant (hash) ;
 *   E064-05 révélation d'un repère masqué par un filtre ;
 *   E064-06 parcours des ères pour retrouver une ancre ;
 *   E064-07 partage : URL, presse-papiers et repli manuel ;
 *   E064-08 région live unique pour les annonces ;
 *   E064-09 focus, défilement et mouvement réduit ;
 *   E064-10 idempotence, gardes d'existence et non-collision.
 *
 * Contrat respecté : un seul fichier possédé, CSS injecté une seule fois via
 * ctx.css('chronology-e064', ...), identifiants tous préfixés `e064-`, aucun
 * appel réseau, aucune source d'aléa, aucune boucle d'animation propre, aucun
 * fichier partagé modifié, aucun sélecteur de test altéré. Toutes les chaînes
 * visibles sont en français. Les lentilles voisines qui lisent déjà le hash
 * (E020, E038, E040) ou le presse-papiers (E018, E038) ne sont ni modifiées ni
 * doublées : ce module ajoute ses propres ancres `e064-` et n'écrit jamais
 * window.location.hash.
 *
 * Lectures utilisées : src/views/chronology.js, src/views/chronology/registry.js,
 * src/views/chronology/index.js, styles.css.
 */

const CSS_ID = 'chronology-e064';
const SCOPE = 'chronology-e064';

const PANEL_ID = 'e064-panel';
const TITLE_ID = 'e064-title';
const CURRENT_ID = 'e064-current';
const STATUS_ID = 'e064-status';
const REVEAL_ID = 'e064-reveal';
const NEXT_ID = 'e064-next-era';
const FOLLOW_ID = 'e064-follow';
const SHARE_ID = 'e064-share';
const HINT_ID = 'e064-share-hint';
const URL_ID = 'e064-url';
const COPY_ID = 'e064-copy';

const TARGET_CLASS = 'e064-target';

/* Survit aux reconstructions du DOM operees par la coque : aucun noeud DOM
 * n'est memorise ici, seulement des primitives et des gardes de liaison. */
let hashBound = false;
let follow = true;
let lastHandledHash = '';
let eraAttempts = 0;

/* Feuille unique, portée par la classe posée sur .chronology-layout. */
const CSS = `
.chronology-e064 #atlas-chrono-events > li[data-event-id]{position:relative}
.chronology-e064 [id^="event-"],.chronology-e064 [id^="point-"]{scroll-margin-block:56px}
.chronology-e064 .e064-panel{
  margin:0 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);color:var(--muted);font-size:9px;line-height:1.5;
}
.chronology-e064 .e064-panel h2{margin:0 0 5px;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
.chronology-e064 .e064-line{margin:0 0 4px;color:var(--ink-soft);font-variant-numeric:tabular-nums}
.chronology-e064 .e064-status{margin:0 0 6px;color:var(--gold-bright)}
.chronology-e064 .e064-btn{
  min-height:36px;margin:3px 5px 0 0;padding:5px 11px;border:1px solid var(--line);border-radius:8px;
  background:transparent;color:var(--ink-soft);font:inherit;font-size:9px;cursor:pointer;
  transition:border-color .18s linear,color .18s linear,background-color .18s linear;
}
.chronology-e064 .e064-btn:hover{border-color:var(--gold);color:var(--gold-bright)}
.chronology-e064 .e064-btn:focus-visible,
.chronology-e064 .e064-event-anchor:focus-visible,
.chronology-e064 .e064-point-anchor:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-e064 .e064-btn[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.1);color:var(--gold-bright)}
.chronology-e064 .e064-btn[hidden]{display:none}
.chronology-e064 .e064-event-anchor{
  position:absolute;top:5px;right:6px;z-index:2;
  display:inline-flex;align-items:center;justify-content:center;
  width:24px;height:24px;border:1px solid var(--line);border-radius:6px;
  background:rgba(11,15,21,.88);color:var(--muted);
  font-size:11px;line-height:1;text-decoration:none;
}
.chronology-e064 .e064-event-anchor:hover{color:var(--gold-bright);border-color:var(--gold)}
.chronology-e064 .e064-point-anchor{
  display:inline-flex;align-items:center;justify-content:center;
  width:24px;height:24px;margin-right:6px;border:1px solid var(--line);border-radius:6px;
  color:var(--muted);font-size:11px;line-height:1;text-decoration:none;
}
.chronology-e064 .e064-point-anchor:hover{color:var(--gold-bright);border-color:var(--gold)}
.chronology-e064 .${TARGET_CLASS}{outline:2px dashed var(--gold);outline-offset:2px;border-radius:8px}
.chronology-e064 .e064-share{
  margin:16px 0 0;padding:9px 10px;border:1px solid var(--line);border-radius:8px;
  background:rgba(255,255,255,.02);
}
.chronology-e064 .e064-share-label{margin:0 0 4px;color:var(--gold);font-size:9px}
.chronology-e064 .e064-hint{margin:0 0 6px;color:var(--muted);font-size:9px;line-height:1.4}
.chronology-e064 .e064-url{
  width:100%;min-height:36px;margin:0 0 5px;padding:6px 8px;
  border:1px solid var(--line);border-radius:8px;
  background:var(--surface-2);color:var(--ink-soft);font:inherit;font-size:9px;
}
.chronology-e064 .e064-copy{margin:0}
.chronology-e064 [data-e064-reduced="1"] .e064-btn{transition:none}
@media (max-width:620px){
  .chronology-e064 .e064-panel{padding:7px 8px}
  .chronology-e064 .e064-share{padding:7px 8px}
  .chronology-e064 .e064-btn{margin:3px 4px 0 0}
}
@media (prefers-reduced-motion:reduce){
  .chronology-e064 .e064-btn{transition:none}
}`;

function setText(node, text) {
  if (node && node.textContent !== text) node.textContent = text;
}

function byId(id) {
  return document.getElementById(id);
}

function setHidden(id, hidden) {
  const node = byId(id);
  if (node) node.hidden = Boolean(hidden);
}

/* La coque reconstruisant tout le DOM, une référence mémorisée devient
 * rapidement périmée : on retouche toujours le layout courant du document. */
function liveLayout() {
  if (typeof document.querySelector !== 'function') return null;
  return document.querySelector('.chronology-layout[data-view="chronology"]');
}

function currentHash() {
  if (typeof window === 'undefined' || !window.location) return '';
  return String(window.location.hash || '');
}

function decodeFragment(raw) {
  const hash = String(raw || '').replace(/^#/, '');
  if (!hash) return '';
  try { return decodeURIComponent(hash); }
  catch (error) { return hash; }
}

/* Deux formes reconnues, alignées sur les identifiants rendus par la vue :
 * #event-<id> (chronology.js:378) et #point-<id>-<rang> (chronology.js:475). */
function parseHash(raw) {
  const id = decodeFragment(raw);
  if (!id) return null;
  const point = id.match(/^point-(.+)-(\d+)$/);
  if (point) {
    return { id, eventId: point[1], position: Number(point[2]), kind: 'point' };
  }
  const event = id.match(/^event-(.+)$/);
  if (event) return { id, eventId: event[1], kind: 'event' };
  return null;
}

function currentEventId(layout) {
  const card = layout.querySelector('.event-card[aria-current="true"]');
  if (card && card.getAttribute('data-event-id')) return card.getAttribute('data-event-id');
  const point = layout.querySelector('#atlas-chrono-aside .point[id^="point-"]');
  if (point) {
    const match = point.id.match(/^point-(.+)-\d+$/);
    if (match) return match[1];
  }
  return '';
}

function buildUrl(fragment) {
  if (typeof window === 'undefined' || !window.location) return '';
  const loc = window.location;
  const base = String(loc.protocol || '') + '//' + String(loc.host || '')
    + String(loc.pathname || '') + String(loc.search || '');
  return base + '#' + encodeURIComponent(String(fragment).replace(/^#/, ''));
}

function copyToClipboard(text) {
  try {
    const clipboard = (typeof navigator !== 'undefined') ? navigator.clipboard : null;
    if (clipboard && typeof clipboard.writeText === 'function') {
      const result = clipboard.writeText(text);
      if (result && typeof result.then === 'function') {
        result.then(
          () => setText(byId(STATUS_ID), 'Lien copié dans le presse-papiers.'),
          () => {
            const done = legacyCopy(text);
            setText(byId(STATUS_ID), done
              ? 'Lien copié dans le presse-papiers.'
              : 'Copie automatique indisponible : le lien est sélectionné, copiez-le manuellement.');
            if (!done) {
              const field = byId(URL_ID);
              if (field) { try { field.focus(); field.select(); } catch (error) { /* repli visuel */ } }
            }
          }
        );
      }
      return true;
    }
  } catch (error) {
    /* Repli silencieux : aucun journal de débogage n'est émis. */
  }
  return legacyCopy(text);
}

function legacyCopy(text) {
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = Boolean(document.execCommand && document.execCommand('copy'));
    document.body.removeChild(area);
    return ok;
  } catch (error) {
    return false;
  }
}

function afterUpdate(callback) {
  if (typeof queueMicrotask === 'function') queueMicrotask(callback);
  else Promise.resolve().then(callback);
}

/* E064-01 : une ancre explicite par carte, sans toucher à l'identifiant
 * `event-<id>` posé par la vue (chronology.js:378) ni au bouton .event-card. */
function decorateEvents(ctx, layout) {
  const items = layout.querySelectorAll('#atlas-chrono-events > li[data-event-id]');
  Array.prototype.forEach.call(items, (item) => {
    const id = item.getAttribute('data-event-id');
    const anchorId = 'e064-a-event-' + id;
    if (byId(anchorId)) return;
    const card = item.querySelector('.event-card');
    const strong = card ? card.querySelector('strong') : null;
    const title = strong ? strong.textContent : id;
    const link = ctx.el('a', 'e064-event-anchor', '#');
    link.id = anchorId;
    link.setAttribute('href', '#' + encodeURIComponent('event-' + id));
    link.setAttribute('aria-label', 'Lien profond vers le repère ' + title);
    link.title = 'Lien vers ' + title;
    item.appendChild(link);
  });
}

/* E064-02 : une ancre par point, cible `#point-<id>-<rang>`. */
function decoratePoints(ctx, layout) {
  const points = layout.querySelectorAll('#atlas-chrono-aside .point[id^="point-"]');
  Array.prototype.forEach.call(points, (point) => {
    const anchorId = 'e064-a-' + point.id;
    if (byId(anchorId)) return;
    const head = point.querySelector('.point-head') || point;
    const link = ctx.el('a', 'e064-point-anchor', '#');
    link.id = anchorId;
    link.setAttribute('href', '#' + encodeURIComponent(point.id));
    link.setAttribute('aria-label', 'Lien profond vers ce point : ' + point.id);
    link.title = 'Lien vers ce point';
    head.insertBefore(link, head.firstChild);
  });
}

/* E064-03 + E064-08 : panneau de mesures et région live unique. */
function buildPanel(ctx, main) {
  if (byId(PANEL_ID)) return;
  const panel = ctx.el('section', 'e064-panel');
  panel.id = PANEL_ID;
  const heading = ctx.el('h2', '', 'Liens profonds et partage');
  heading.id = TITLE_ID;
  panel.setAttribute('aria-labelledby', TITLE_ID);
  const current = ctx.el('p', 'e064-line');
  current.id = CURRENT_ID;
  const status = ctx.el('p', 'e064-status');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  const reveal = ctx.el('button', 'e064-btn', 'Révéler le repère partagé');
  reveal.id = REVEAL_ID;
  reveal.type = 'button';
  const next = ctx.el('button', 'e064-btn', 'Ère suivante');
  next.id = NEXT_ID;
  next.type = 'button';
  const followBtn = ctx.el('button', 'e064-btn', 'Suivre les liens profonds');
  followBtn.id = FOLLOW_ID;
  followBtn.type = 'button';
  followBtn.setAttribute('aria-pressed', 'true');
  followBtn.setAttribute('aria-controls', PANEL_ID);
  panel.append(heading, current, status, reveal, next, followBtn);
  const anchor = main.querySelector('#atlas-chrono-status');
  if (anchor && anchor.nextSibling) main.insertBefore(panel, anchor.nextSibling);
  else main.prepend(panel);

  reveal.addEventListener('click', () => revealAction());
  next.addEventListener('click', () => nextEraAction());
  followBtn.addEventListener('click', () => {
    follow = !follow;
    followBtn.setAttribute('aria-pressed', follow ? 'true' : 'false');
    const layoutNow = liveLayout();
    if (layoutNow) attemptTarget(layoutNow, layoutNow.getAttribute('data-e064-reduced') === '1', true);
    setText(byId(STATUS_ID), follow
      ? 'Suivi des liens profonds activé.'
      : 'Suivi des liens profonds désactivé.');
  });
}

function syncReadouts(layout) {
  const events = layout.querySelectorAll('#atlas-chrono-events > li[data-event-id]').length;
  const points = layout.querySelectorAll('#atlas-chrono-aside .point[id^="point-"]').length;
  const id = currentEventId(layout);
  setText(byId(CURRENT_ID), 'Ancres disponibles : ' + events + ' repère(s), '
    + points + ' point(s). ' + (id ? 'Repère courant : #event-' + id + '.' : 'Aucun repère courant.'));
  const followBtn = byId(FOLLOW_ID);
  if (followBtn) followBtn.setAttribute('aria-pressed', follow ? 'true' : 'false');
}

/* E064-07 : bloc de partage, URL lue seule et bouton de copie avec repli. */
function buildShare(ctx, aside) {
  if (!aside) return;
  if (!byId(SHARE_ID)) {
    const box = ctx.el('div', 'e064-share');
    box.id = SHARE_ID;
    const label = ctx.el('p', 'e064-share-label');
    label.appendChild(ctx.el('strong', '', 'Partager ce repère'));
    const hint = ctx.el('p', 'e064-hint');
    hint.id = HINT_ID;
    const input = ctx.el('input', 'e064-url');
    input.id = URL_ID;
    input.type = 'text';
    input.readOnly = true;
    input.setAttribute('aria-label', 'Adresse du lien profond vers ce repère');
    const copy = ctx.el('button', 'e064-btn e064-copy', 'Copier le lien du repère');
    copy.id = COPY_ID;
    copy.type = 'button';
    box.append(label, hint, input, copy);
    aside.appendChild(box);
    input.addEventListener('focus', () => {
      try { input.select(); } catch (error) { /* selection facultative */ }
    });
    copy.addEventListener('click', () => {
      const value = input.value;
      if (!value) {
        setText(byId(STATUS_ID), 'Aucun lien à partager : aucun repère sélectionné.');
        return;
      }
      const ok = copyToClipboard(value);
      setText(byId(STATUS_ID), ok
        ? 'Lien copié dans le presse-papiers.'
        : 'Copie automatique indisponible : le lien est sélectionné, copiez-le manuellement.');
      if (!ok) {
        try { input.focus(); input.select(); } catch (error) { /* repli visuel */ }
      }
    });
  }
  const id = currentEventId(liveLayout() || ctx.layout);
  const fragment = id ? '#event-' + id : '';
  const url = fragment ? buildUrl(fragment) : '';
  const input = byId(URL_ID);
  if (input && input.value !== url) input.value = url;
  setText(byId(HINT_ID), id
    ? 'Repère ' + id + ' · ancre ' + fragment + '.'
    : 'Aucun repère sélectionné : aucun lien à partager.');
}

function findTarget(layout, spec) {
  if (!spec) return null;
  const node = byId(spec.id);
  if (!node || !layout.contains(node)) return null;
  return node;
}

function clearHighlight(layout) {
  const previous = layout.querySelector('.' + TARGET_CLASS);
  if (previous) previous.classList.remove(TARGET_CLASS);
}

/* E064-09 : focus sans vol intempestif et défilement respectueux du mouvement
 * réduit (ctx.reducedMotion est lu à chaque rendu, jamais via matchMedia ici). */
function focusTarget(node, reduced) {
  let focusable = node;
  if (!node.matches || !node.matches('a,button,input,[tabindex]')) {
    focusable = node.querySelector('.e064-event-anchor, .e064-point-anchor, .event-card') || node;
  }
  if (focusable && typeof focusable.focus === 'function') {
    try { focusable.focus({ preventScroll: true }); }
    catch (error) { focusable.focus(); }
  }
  if (typeof node.scrollIntoView === 'function') {
    const behavior = reduced ? 'auto' : 'smooth';
    try { node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior }); }
    catch (error) { node.scrollIntoView(); }
  }
}

/* E064-04 : résolution d'une ancre entrante. Le saut n'est rejoue que sur un
 * hash nouveau ou sur une action explicite, afin de ne pas voler le focus
 * pendant la saisie dans le champ de recherche. */
function attemptTarget(layout, reduced, forced) {
  const raw = currentHash();
  const spec = parseHash(raw);
  if (!raw || !spec) {
    clearHighlight(layout);
    setHidden(REVEAL_ID, true);
    setHidden(NEXT_ID, true);
    if (raw) setText(byId(STATUS_ID), 'Adresse sans ancre de repère reconnue.');
    return;
  }
  if (!follow) {
    setHidden(REVEAL_ID, true);
    setHidden(NEXT_ID, true);
    return;
  }
  const node = findTarget(layout, spec);
  if (node) {
    clearHighlight(layout);
    node.classList.add(TARGET_CLASS);
    if (forced || raw !== lastHandledHash) {
      lastHandledHash = raw;
      eraAttempts = 0;
      setHidden(REVEAL_ID, true);
      setHidden(NEXT_ID, true);
      focusTarget(node, reduced);
      const strong = node.querySelector('.event-card strong');
      const label = strong ? strong.textContent : spec.id;
      setText(byId(STATUS_ID), 'Repère partagé atteint : ' + label + '.');
    }
    return;
  }
  setHidden(REVEAL_ID, false);
  setHidden(NEXT_ID, false);
  if (forced || raw !== lastHandledHash) {
    setText(byId(STATUS_ID), 'Repère partagé ' + spec.eventId
      + ' non visible dans l’ère ou le filtre courant. Utilisez « Révéler le repère partagé ».');
  }
}

/* E064-05 : le filtre local vit hors du store (chronology.js:16, :320-325) ;
 * on le neutralise en pilotant les contrôles existants, sans import du store. */
function revealAction() {
  const search = byId('atlas-chrono-search');
  if (search && search.value) {
    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  }
  const layoutNow = liveLayout();
  if (!layoutNow) return;
  const pressed = layoutNow.querySelectorAll('#atlas-chrono-tools .atlas-chrono-tag[aria-pressed="true"]');
  Array.prototype.forEach.call(pressed, (tag) => tag.click());
  afterUpdate(() => {
    const current = liveLayout();
    if (!current) return;
    attemptTarget(current, current.getAttribute('data-e064-reduced') === '1', true);
  });
}

/* E064-06 : une pression = une ère. Le compteur borne la recherche et évite
 * une boucle de rendu, contrairement à un enchaînement automatique. */
function nextEraAction() {
  const layoutNow = liveLayout();
  if (!layoutNow) return;
  const bands = Array.prototype.slice.call(
    layoutNow.querySelectorAll('#atlas-chrono-eras .era-band')
  );
  if (!bands.length) return;
  let current = -1;
  for (let i = 0; i < bands.length; i += 1) {
    if (bands[i].getAttribute('aria-current') === 'true') { current = i; break; }
  }
  const next = bands[(current + 1) % bands.length];
  eraAttempts += 1;
  next.click();
  afterUpdate(() => {
    const currentLayout = liveLayout();
    if (!currentLayout) return;
    const reduced = currentLayout.getAttribute('data-e064-reduced') === '1';
    attemptTarget(currentLayout, reduced, true);
    const spec = parseHash(currentHash());
    if (spec && findTarget(currentLayout, spec)) return;
    if (eraAttempts >= bands.length) {
      setHidden(NEXT_ID, true);
      setText(byId(STATUS_ID), 'Aucun repère portant l’identifiant ' + (spec ? spec.eventId : '')
        + ' n’a été trouvé après ' + eraAttempts + ' ères.');
    } else {
      setText(byId(STATUS_ID), 'Ère ' + (eraAttempts + 1) + ' parcourue : repère partagé non encore visible.');
    }
  });
}

/* E064-10 : un seul abonnement global, posé sous garde, et aucun état de nœud
 * mémorisé. Les autres greffons gardent leurs propres écouteurs hashchange. */
function bindHash() {
  if (hashBound || typeof window === 'undefined') return;
  hashBound = true;
  window.addEventListener('hashchange', () => {
    lastHandledHash = '';
    eraAttempts = 0;
    afterUpdate(() => {
      const current = liveLayout();
      if (!current) return;
      attemptTarget(current, current.getAttribute('data-e064-reduced') === '1', false);
    });
  });
}

register('E064', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function' || typeof ctx.css !== 'function') return;
  const layout = (ctx.layout && ctx.layout.dataset && ctx.layout.dataset.view === 'chronology')
    ? ctx.layout : liveLayout();
  if (!layout || typeof layout.querySelector !== 'function') return;
  const main = layout.querySelector('#atlas-chrono-main');
  if (!main) return;

  ctx.css(CSS_ID, CSS);
  layout.classList.add(SCOPE);
  layout.dataset.e064 = '1';
  const reduced = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
  if (reduced) layout.setAttribute('data-e064-reduced', '1');
  else layout.removeAttribute('data-e064-reduced');

  buildPanel(ctx, main);
  decorateEvents(ctx, layout);
  decoratePoints(ctx, layout);
  buildShare(ctx, layout.querySelector('#atlas-chrono-aside'));
  syncReadouts(layout);
  bindHash();
  attemptTarget(layout, reduced, false);
});
