import { register } from './registry.js';

/* Lentille M16 — « Page suivante affichée dans le contour » (domaine B : drapeau & révélation).
 *
 * Preuve source : globe-reveal.js affiche, dans #globe-reveal .gr-page (décoratif,
 * aria-hidden, fixé au body), un titre figé « Chronologie » (l.186) et une ligne
 * `${country.name} · ${country.eras.length} ères · ${country.events.length} repères` (l.187).
 * Or selectCountry() ouvre toujours la vue 'chronology' (store.js:277), dont le h1
 * réel est `Chronologie · ${country.name}` (chronology.js:226), avec pour premier
 * repère country.events[0] (eventIndex remis à 0), son année et ses points
 * (chronology.js:429, 461). Cette lentille réaligne la page de transition sur ces
 * données réelles, sans éditer globe-reveal.js ni les sélecteurs de test.
 *
 * État module : un seul observer et un seul pays courant partagés par tous les
 * rendus, car la coque reconstruit le stage à chaque changement de vue alors que
 * l'overlay, lui, reste sur document.body.
 */

const OVERLAY_ID = 'globe-reveal'; // ID existant : jamais recréé, toujours gardé
const PAGE_SELECTOR = '.gr-page';
const MARKER_CLASS = 'm16-page-title';
const CSS_ID = 'monde-m16';

const CSS = `
#globe-reveal .gr-page .m16-page-title{font-size:clamp(16px,3vw,24px)}
#globe-reveal .gr-page .m16-page-detail{font-variant-numeric:tabular-nums}
#globe-reveal .gr-page .m16-page-preview,
#globe-reveal .gr-page .m16-page-points{max-width:40ch;line-height:1.35;font-size:clamp(10px,1.4vw,13px);opacity:.9}
`;

let api = null;
let pageNode = null;
let observer = null;
let currentCountry = null;
let wrappedController = null;

/* M16-02 : accord en français, sans chiffre ni libellé inventé. */
function plural(count, one, many) {
  const value = Number.isFinite(count) ? count : 0;
  return `${value} ${value === 1 ? one : many}`;
}

/* M16-05 : même format d'année que la vue d'arrivée (chronology.js:25-27). */
function formatYear(year) {
  const value = Number(year);
  if (!Number.isFinite(value)) return '';
  return value < 0 ? `${Math.abs(value)} av. J.-C.` : String(value);
}

function findPage() {
  const overlay = document.getElementById(OVERLAY_ID); // garde d'existence
  return overlay ? overlay.querySelector(PAGE_SELECTOR) : null;
}

/* M16-03 : le nom et les libellés viennent du DATASET transmis par la coque,
 * jamais d'une chaîne figée ni d'une source externe. */
function resolveCountry() {
  if (!currentCountry) return null;
  const list = api && api.countries;
  if (Array.isArray(list)) {
    const match = list.find((item) => item
      && (item.code === currentCountry.code || item.id === currentCountry.id));
    if (match) return match;
  }
  return currentCountry;
}

function buildNodes(country) {
  const eras = Array.isArray(country.eras) ? country.eras.length : 0;
  const events = Array.isArray(country.events) ? country.events.length : 0;
  const make = (className, text) => {
    if (api && typeof api.el === 'function') return api.el('span', className, text);
    const node = document.createElement('span');
    node.className = className;
    node.textContent = text;
    return node;
  };

  const title = (api && typeof api.el === 'function')
    ? api.el('strong', MARKER_CLASS, `Chronologie · ${country.name}`)
    : make(MARKER_CLASS, `Chronologie · ${country.name}`);

  const nodes = [
    title, // M16-01 : titre identique au h1 de la vue d'arrivée
    // M16-02/-04/-07 : pluriels corrects, ères et repères réels, nom non répété
    make('m16-page-detail',
      `${plural(eras, 'ère', 'ères')} · ${plural(events, 'repère', 'repères')}`),
  ];

  const first = events ? country.events[0] : null;
  if (first && first.title) {
    const year = formatYear(first.year);
    // M16-05 : aperçu du premier repère, celui affiché à l'ouverture
    nodes.push(make('m16-page-preview',
      `Premier repère : ${first.title}${year ? ` (${year})` : ''}`));
    // M16-06 : nombre de points du repère, comme dans la fiche d'arrivée
    if (Array.isArray(first.points)) {
      nodes.push(make('m16-page-points',
        `Points du repère : ${plural(first.points.length, 'point', 'points')}`));
    }
  }
  return nodes;
}

function augment() {
  /* M16-08 : en mouvement réduit, reveal() n'affiche pas la page ; on n'écrit rien
   * et on ne lance aucune animation. */
  if (api && typeof api.reducedMotion === 'function' && api.reducedMotion()) return;
  const overlay = document.getElementById(OVERLAY_ID);
  const page = findPage();
  if (!overlay || !page) return;
  /* M16-09 : surface décorative — on n'intervient que pendant la phase 'reveal'.
   * Aucun role, aucune région live, aucun appel à say() : le contenu sémantique
   * reste celui de la vue d'arrivée. */
  if (!overlay.classList.contains('is-revealing')) return;
  /* Garde anti-boucle : notre replaceChildren redéclenche l'observer. */
  if (page.querySelector(`.${MARKER_CLASS}`)) return;
  const country = resolveCountry();
  if (!country || !country.name) return;
  page.setAttribute('aria-hidden', 'true');
  page.replaceChildren(...buildNodes(country));
}

function ensureObserver() {
  const page = findPage();
  if (!page) return;
  if (page === pageNode && observer) return;
  if (observer && typeof observer.disconnect === 'function') observer.disconnect();
  pageNode = page;
  if (typeof MutationObserver === 'function') {
    /* show() (globe-reveal.js:184-191) vide puis remplit .gr-page et bascule
     * is-revealing dans la même tâche : le callback voit l'état final. */
    observer = new MutationObserver(() => augment());
    observer.observe(page, { childList: true });
  } else {
    observer = null; // repli déterministe ci-dessous
  }
}

register('M16', (ctx) => {
  api = ctx;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  const controller = ctx.reveal;
  /* M16-10 : une seule greffe par contrôleur, observer unique, zéro réseau,
   * zéro Math.random, aucun console.* et aucun sélecteur de test modifié. */
  if (!controller || typeof controller.reveal !== 'function' || controller === wrappedController) return;
  const originalReveal = controller.reveal;
  wrappedController = controller;
  controller.reveal = function revealWithPage(country, done) {
    currentCountry = country || null;
    ensureObserver();
    const result = originalReveal.call(controller, country, done);
    if (!observer) {
      // Repli sans MutationObserver : deux passages couvrent le décodage du masque.
      requestAnimationFrame(() => augment());
      setTimeout(() => augment(), 240);
    }
    return result;
  };
});
