import { register } from './registry.js';

/* Lentille M17 — Nom et légende du pays (domaine B : drapeau & révélation).
 * Un seul fichier possédé. Tout est greffé via le contexte : CSS injecté une
 * seule fois, un nœud de légende à ID unique, des rappels de survol qui
 * réinterrogent le DOM courant (les rappels du registre survivent aux rendus).
 * Aucune donnée inventée : nom, code, couleur et chiffres viennent du pays reçu.
 * Aucun panneau supplémentaire : la légende reste le seul nœud visible. */

const CSS_ID = 'monde-m17';
const LEGEND_ID = 'm17-legend';

/* M17-02, 05, 07, 09 : une seule feuille, injectée par ctx.css (cssOnce).
   M17-05 ne renomme aucun sélecteur de test : il ne fait que rééquilibrer la
   hiérarchie visuelle du nom dans la ligne du bouton.
   Les règles mobiles utilisent `#id.classe` (spécificité 1-1-0) pour rester
   stables quel que soit l'ordre d'injection des autres lentilles (M29). */
const CSS = `
  #${LEGEND_ID}{
    position:absolute;right:16px;bottom:125px;z-index:6;
    max-width:min(300px,42%);padding:10px 13px;pointer-events:none;
    border:1px solid var(--line-strong);border-left:3px solid var(--line-strong);
    border-radius:10px;background:rgba(8,11,16,.94);color:var(--ink);
    box-shadow:0 8px 24px rgba(0,0,0,.35);font:inherit;line-height:1.35;
    min-width:0;overflow-wrap:anywhere;
  }
  #${LEGEND_ID}[data-state="active"]{border-left-color:var(--m17-accent,var(--gold))}
  #${LEGEND_ID} .m17-kicker{
    margin:0 0 4px;color:var(--gold);font-size:max(9px,.62rem);
    font-weight:600;letter-spacing:.12em;text-transform:uppercase;
  }
  #${LEGEND_ID} .m17-line{
    display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 7px;margin:0;
  }
  #${LEGEND_ID} .m17-name{
    min-width:0;margin:0;color:var(--ink);font-family:var(--serif);
    font-size:clamp(16px,calc(1.05rem + .35vw),21px);font-weight:600;
    line-height:1.15;letter-spacing:-.01em;text-transform:none;
    overflow-wrap:anywhere;
  }
  #${LEGEND_ID} .m17-code{
    display:inline-block;padding:2px 6px;
    border:1px solid var(--line-strong);border-radius:5px;
    background:rgba(230,185,111,.08);color:var(--gold-bright);
    font-family:var(--sans);font-size:max(10px,.68rem);font-weight:600;
    line-height:1.2;letter-spacing:.08em;white-space:nowrap;
  }
  #${LEGEND_ID} .m17-code[hidden]{display:none}
  #${LEGEND_ID} .m17-detail{
    margin:6px 0 0;color:var(--muted);font-size:max(11px,.75rem);
    font-variant-numeric:tabular-nums;line-height:1.4;
  }
  #${LEGEND_ID} .m17-num{color:var(--ink);font-weight:700}
  #globe-reveal .gr-caption{text-transform:none;letter-spacing:.02em}
  .globe-list .globe-country-name{font-size:16px;font-weight:700;letter-spacing:-.01em}
  .globe-list .globe-country-num{opacity:.75}
  @media (max-width:700px){
    /* Même quadrant que M29 : en bas à gauche, au-dessus des commandes. */
    #${LEGEND_ID}.m17-legend{
      left:8px;right:auto;bottom:64px;
      max-width:min(200px,54vw);padding:8px 10px;
    }
  }
  @media (max-width:420px){
    /* Zoom 200 % sur 390 px : la largeur CSS tombe sous 420 px, on garde
       une mesure lisible au lieu du 54vw devenu trop étroit. */
    #${LEGEND_ID}.m17-legend{max-width:min(200px,calc(100vw - 16px))}
  }
  @media (prefers-reduced-motion:reduce){
    #${LEGEND_ID}{box-shadow:none}
  }
  @media (forced-colors:active){
    #${LEGEND_ID}.m17-legend,
    #${LEGEND_ID}.m17-legend[data-state="active"]{
      border:1px solid CanvasText;background:Canvas;color:CanvasText;
    }
    #${LEGEND_ID} .m17-num,
    #${LEGEND_ID} .m17-code{color:CanvasText}
  }
`;

function count(list) {
  return Array.isArray(list) ? list.length : 0;
}

/* Chiffres en texte ordinaire : « 9 ères · 57 repères » reste la valeur
   textContent attendue, mais les nombres passent en premier plan (M17-03). */
function setDetail(node, country) {
  if (!country) {
    node.textContent = 'Survolez le globe ou choisissez un pays dans la liste.';
    return;
  }
  const eras = document.createElement('span');
  const erasNum = document.createElement('b');
  erasNum.className = 'm17-num';
  erasNum.textContent = String(count(country.eras));
  eras.append(erasNum, document.createTextNode(' ères'));

  const events = document.createElement('span');
  const eventsNum = document.createElement('b');
  eventsNum.className = 'm17-num';
  eventsNum.textContent = String(count(country.events));
  events.append(eventsNum, document.createTextNode(' repères'));

  node.textContent = '';
  node.append(eras, document.createTextNode(' · '), events);
}

/* Écrit la légende courante. Le nœud est retrouvé à chaque appel : un rappel
   enregistré lors d'un rendu précédent ne doit jamais écrire dans un nœud
   détaché (M17-10). */
function setLegend(country) {
  const node = document.getElementById(LEGEND_ID);
  if (!node) return;
  const nameNode = node.querySelector('.m17-name');
  const detailNode = node.querySelector('.m17-detail');
  const codeNode = node.querySelector('.m17-code');
  if (!nameNode || !detailNode || !codeNode) return;

  if (!country) {
    node.dataset.state = 'idle';
    node.style.removeProperty('--m17-accent');
    nameNode.textContent = 'Aucun pays survolé';
    codeNode.textContent = '';
    codeNode.hidden = true;
    codeNode.removeAttribute('title');
    setDetail(detailNode, null);
    return;
  }

  node.dataset.state = 'active';
  /* Liseré couleur du drapeau : repère visuel, jamais seule source d'info. */
  if (typeof country.color === 'string' && /^#[0-9a-f]{3,8}$/i.test(country.color)) {
    node.style.setProperty('--m17-accent', country.color);
  } else {
    node.style.removeProperty('--m17-accent');
  }
  nameNode.textContent = country.name; /* M17-02 : graphie exacte du dataset */
  const code = country.code || '';
  if (code) {
    codeNode.textContent = code; /* M17-06 : identifiant stable, données du pays */
    codeNode.title = 'Code ISO du pays';
    codeNode.hidden = false;
  } else {
    codeNode.textContent = '';
    codeNode.removeAttribute('title');
    codeNode.hidden = true;
  }
  setDetail(detailNode, country);
}

function buildLegend(ctx) {
  const node = ctx.el('div', 'm17-legend');
  node.id = LEGEND_ID;
  node.setAttribute('role', 'group');
  node.setAttribute('aria-label', 'Légende du drapeau');

  const kicker = ctx.el('p', 'm17-kicker', 'Drapeau · pays survolé');
  const line = ctx.el('p', 'm17-line');
  const name = ctx.el('span', 'm17-name', 'Aucun pays survolé');
  const code = ctx.el('span', 'm17-code', '');
  code.hidden = true;
  line.append(name, code);
  const detail = ctx.el('p', 'm17-detail', 'Survolez le globe ou choisissez un pays dans la liste.');
  node.append(kicker, line, detail);
  node.dataset.state = 'idle';
  return node;
}

register('M17', (ctx) => {
  if (!ctx || !ctx.scene) return;
  ctx.css(CSS_ID, CSS);

  /* M17-01/04/08 : une seule légende par rendu, garde d'existence sur l'ID. */
  if (!document.getElementById(LEGEND_ID)) {
    ctx.scene.appendChild(buildLegend(ctx));
  }
  setLegend(ctx.selected || null);

  /* M17-01/03 : le nom et son contexte chiffré suivent le survol, y compris
     celui piloté au clavier (highlight() notifie déjà onHover). */
  ctx.onHover(({ country } = {}) => { setLegend(country || null); });
  ctx.onLeave(() => { setLegend(ctx.selected || null); });
});
