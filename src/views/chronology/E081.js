import { register } from './registry.js';

/* Lentille E081 — mode lecture et mise en page pour impression.
 *
 * Dix chantiers (E081-01 à E081-10) implémentés ici, sans toucher à un seul
 * fichier partagé. La feuille est injectée une seule fois via ctx.css, tous
 * les nœuds sont préfixés `e081` et protégés par des gardes d'existence : la
 * coque reconstruit le stage à chaque rendu (chronology.js:539), donc les
 * nœuds sont recréés avec lui, sans doublon ni écouteur accumulé.
 *
 * Zéro console.*, zéro fetch/XHR, zéro Math.random, aucune boucle
 * requestAnimationFrame propre. Aucun texte historique n'est inventé : les
 * seules chaînes affichées sont des libellés d'interface et des textes déjà
 * présents dans le DOM (titre #atlas-chrono-title, statut #atlas-chrono-status).
 */

const CSS_ID = 'chronology-e081';
const BAR_ID = 'e081-bar';
const BTN_ID = 'e081-mode-btn';
const STATUS_ID = 'e081-status';
const NOTE_ID = 'e081-note';
const HEAD_ID = 'e081-print-head';
const LIVE_ID = 'e081-live';

/* Feuille unique. Deux portées distinctes : le mode lecture ne s'applique
   que lorsque `body` porte la classe `e081-reading`, tandis que l'impression
   s'applique toujours à `.chronology-layout` seule, sans dépendre du mode. */
const CSS = `
.e081-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.chronology-layout .e081-bar{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0 0 14px;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02)}
.chronology-layout .e081-btn{min-height:36px;padding:7px 14px;border:1px solid var(--line-strong);border-radius:7px;background:transparent;color:var(--gold-bright);font:inherit;font-size:11px;font-weight:600;cursor:pointer}
.chronology-layout .e081-btn:hover{border-color:var(--gold);background:rgba(230,185,111,.1)}
.chronology-layout .e081-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.chronology-layout .e081-status{margin:0;color:var(--ink-soft);font-size:10px;line-height:1.45;font-variant-numeric:tabular-nums}
.chronology-layout .e081-note{flex:1 1 100%;margin:0;color:var(--muted-2);font-size:9px;line-height:1.5}
.chronology-layout .e081-print-head{display:none}
/* E081-02 / E081-03 — lecture : une colonne, mesure de 60 à 75 caractères,
   serif, et retrait des seuls contrôles (le texte reste intact). */
.e081-reading .chronology-layout{display:block;height:auto}
.e081-reading .chronology-layout .chronology-main,
.e081-reading .chronology-layout .chronology-aside{max-width:68ch;margin:0 auto 22px;padding:18px 14px 24px;overflow:visible;border-left:0;border-top:1px solid var(--line);background:transparent}
.e081-reading .chronology-layout .chronology-main{font-family:var(--serif);font-size:15px;line-height:1.65;color:var(--ink-soft)}
.e081-reading .chronology-layout .chronology-main .view-lede,
.e081-reading .chronology-layout .chronology-main .atlas-chrono-hint{font-size:12px;line-height:1.6}
.e081-reading .chronology-layout #atlas-chrono-eras,
.e081-reading .chronology-layout #atlas-chrono-tools,
.e081-reading .chronology-layout .nav-c2-orientation,
.e081-reading .chronology-layout .atlas-chrono-tags,
.e081-reading .chronology-layout .aside-actions,
.e081-reading .chronology-layout .atlas-chrono-empty button{display:none!important}
.e081-reading .chronology-layout .e081-bar{position:sticky;top:0;z-index:2;background:var(--surface)}
@media (prefers-reduced-motion:reduce){
  .chronology-layout .e081-btn,
  .chronology-layout .e081-bar *{transition:none!important}
}
@media (max-width:620px){
  .chronology-layout .e081-bar{flex-direction:column;align-items:stretch}
  .chronology-layout .e081-btn{text-align:center}
}
/* E081-05 / E081-06 — pagination et numérotation des pages (repli si les
   margin boxes ne sont pas pris en charge : l'en-tête HTML imprimé). */
@page{size:A4;margin:16mm 14mm;@bottom-center{content:"Chronologie · " counter(page) " / " counter(pages);font-size:8pt;color:#555}}
@media print{
  .chronology-layout{display:block!important;height:auto!important;color:#000!important;background:#fff!important}
  .chronology-layout .chronology-main,
  .chronology-layout .chronology-aside{max-width:none!important;margin:0!important;padding:0!important;overflow:visible!important;border:0!important;background:#fff!important;color:#000!important;font-family:var(--serif)!important;font-size:11pt!important;line-height:1.5!important}
  .chronology-layout .chronology-aside{margin-top:8mm!important;border-top:1px solid #999!important;padding-top:6mm!important}
  .chronology-layout .chronology-main h1,
  .chronology-layout .chronology-main h2,
  .chronology-layout .chronology-main h3{color:#000!important;break-after:avoid;page-break-after:avoid}
  .chronology-layout .e081-print-head{display:block!important;margin:0 0 6mm;padding:0 0 3mm;border-bottom:1px solid #999}
  .chronology-layout .e081-print-title{margin:0;font-size:15pt!important;font-weight:600!important;color:#000!important}
  .chronology-layout .e081-print-meta{margin:2mm 0 0;font-size:8pt!important;color:#333!important;line-height:1.4}
  .chronology-layout .e081-bar,
  .chronology-layout #atlas-chrono-eras,
  .chronology-layout #atlas-chrono-tools,
  .chronology-layout .nav-c2-orientation,
  .chronology-layout .atlas-chrono-tags,
  .chronology-layout .aside-actions,
  .chronology-layout .atlas-chrono-empty button{display:none!important}
  .chronology-layout .event-card,
  .chronology-layout .atlas-chrono-events>li,
  .chronology-layout .point,
  .chronology-layout .era-band{break-inside:avoid!important;page-break-inside:avoid!important}
  .chronology-layout .atlas-chrono-events>li{break-after:page!important;page-break-after:always!important}
  .chronology-layout .atlas-chrono-events>li:last-child{break-after:auto!important;page-break-after:auto!important}
  .chronology-layout img{max-width:100%!important;height:auto!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .chronology-layout .point-sources,
  .chronology-layout .event-year,
  .chronology-layout .aside-kicker,
  .chronology-layout .aside-year{color:#333!important;font-size:8pt!important}
  .chronology-layout .confidence,
  .chronology-layout .point-kind,
  .chronology-layout .nav-c2-point-rank{color:#000!important}
  #${LIVE_ID}{display:none!important}
}
`;

/* Préférence conservée entre les rendus de la coque : aucun nœud DOM n'est
   mémorisé, seules des valeurs primitives survivent au innerHTML. */
const local = { reading: false };
let liveNode = null;
let keyHooked = false;

/* E081-04 — région live unique, hors du stage (comme #nav-c2a-live,
   chronology.js:121-138) pour survivre au innerHTML et rester annonçable. */
function ensureLive() {
  if (liveNode && liveNode.isConnected && liveNode.id === LIVE_ID) return liveNode;
  liveNode = document.getElementById(LIVE_ID);
  if (!liveNode) {
    liveNode = document.createElement('p');
    liveNode.id = LIVE_ID;
    liveNode.className = 'e081-sr';
    liveNode.setAttribute('role', 'status');
    liveNode.setAttribute('aria-live', 'polite');
    liveNode.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveNode);
  }
  return liveNode;
}

function announce(message) {
  const node = ensureLive();
  if (node) node.textContent = message;
}

function buildHead(ctx) {
  const head = ctx.el('div', 'e081-print-head');
  head.id = HEAD_ID;
  /* Textes laissés vides ici : ils sont remplis depuis le DOM existant par
     refreshContent(), afin de ne jamais inventer de contenu historique. */
  head.append(ctx.el('p', 'e081-print-title'), ctx.el('p', 'e081-print-meta'));
  return head;
}

function buildBar(ctx) {
  const bar = ctx.el('div', 'e081-bar');
  bar.id = BAR_ID;
  bar.setAttribute('role', 'group');
  bar.setAttribute('aria-label', 'Mode lecture et mise en page pour impression');

  const btn = ctx.el('button', 'e081-btn');
  btn.type = 'button';
  btn.id = BTN_ID;
  btn.dataset.fk = 'e081-mode';
  btn.setAttribute('aria-controls', 'atlas-chrono-main');
  btn.setAttribute('aria-keyshortcuts', 'l');
  btn.addEventListener('click', () => {
    local.reading = !local.reading;
    apply(ctx);
    announce(local.reading ? 'Mode lecture activé.' : 'Mode lecture désactivé.');
  });

  const status = ctx.el('p', 'e081-status');
  status.id = STATUS_ID;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const note = ctx.el('p', 'e081-note',
    'Le mode lecture élargit la mesure de lecture et masque les contrôles ; la mise en page d’impression reste active dans tous les cas.');
  note.id = NOTE_ID;

  bar.append(btn, status, note);
  return bar;
}

/* E081-09 — gardes d'existence : un seul de chaque ID, même si apply() est
   rejoué sur un DOM déjà enrichi. Les nœuds sont insérés en tête du layout. */
function ensureNodes(ctx) {
  const layout = ctx.layout;
  if (!layout || typeof layout.insertBefore !== 'function') return false;

  let head = document.getElementById(HEAD_ID);
  if (!head) {
    head = buildHead(ctx);
    layout.insertBefore(head, layout.firstChild);
  }

  let bar = document.getElementById(BAR_ID);
  if (!bar) {
    bar = buildBar(ctx);
    layout.insertBefore(bar, head && head.nextSibling ? head.nextSibling : layout.firstChild);
  }
  return true;
}

/* E081-06 — en-tête d'impression dérivé de textes déjà rendus. */
function refreshContent() {
  const head = document.getElementById(HEAD_ID);
  if (!head) return;
  const title = document.getElementById('atlas-chrono-title');
  const status = document.getElementById('atlas-chrono-status');
  const headTitle = head.querySelector('.e081-print-title');
  const headMeta = head.querySelector('.e081-print-meta');
  if (headTitle) headTitle.textContent = title ? title.textContent : 'Chronologie';
  if (headMeta) headMeta.textContent = status ? status.textContent : '';
}

/* E081-02 / E081-04 / E081-10 — resynchronisation complète à chaque rendu :
   classe de lecture, aria-pressed, libellé, statut, préférence de mouvement. */
function apply(ctx) {
  const bar = document.getElementById(BAR_ID);
  const btn = document.getElementById(BTN_ID);
  const status = document.getElementById(STATUS_ID);
  if (!bar || !btn || !status) return;

  const body = document.body;
  body.classList.toggle('e081-reading', local.reading);
  if (body.dataset) {
    body.dataset.e081Reading = local.reading ? '1' : '0';
    const reduced = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
    body.dataset.e081Reduced = reduced ? '1' : '0';
  }

  btn.setAttribute('aria-pressed', local.reading ? 'true' : 'false');
  btn.textContent = local.reading ? 'Quitter le mode lecture' : 'Activer le mode lecture';
  status.textContent = local.reading
    ? 'Mode lecture actif : mesure de lecture élargie, contrôles masqués, impression disponible.'
    : 'Mode lecture inactif : affichage standard de la chronologie.';
  refreshContent();
}

/* E081-08 — raccourci « l ». Un seul écouteur module-level, sans timer ni
   boucle ; les champs de saisie sont ignorés pour ne pas concurrencer le
   routeur clavier de la vue (chronology.js:231). */
function onKey(event) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key !== 'l' && event.key !== 'L') return;
  const target = event.target;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT'
    || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
  const btn = document.getElementById(BTN_ID);
  if (!btn) return;
  event.preventDefault();
  btn.click();
}

function bindKeys() {
  if (keyHooked || typeof document === 'undefined') return;
  document.addEventListener('keydown', onKey);
  keyHooked = true;
}

/* E081-10 — surface de lecture seule, additivité sans effet au rendu. */
function publishSnapshot() {
  if (typeof window === 'undefined' || window.VECTEMPOREL_E081) return;
  window.VECTEMPOREL_E081 = Object.freeze({
    snapshot: () => Object.freeze({
      reading: local.reading === true,
      panel: Boolean(document.getElementById(BAR_ID)),
      printHead: Boolean(document.getElementById(HEAD_ID)),
      live: Boolean(document.getElementById(LIVE_ID)),
      css: Boolean(document.getElementById(CSS_ID)),
      reduced: Boolean(document.body && document.body.dataset
        && document.body.dataset.e081Reduced === '1'),
    }),
  });
}

register('E081', (ctx) => {
  if (!ctx || typeof ctx.el !== 'function') return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  if (!ensureNodes(ctx)) return;
  apply(ctx);
  publishSnapshot();
  bindKeys();
  ensureLive();
});
