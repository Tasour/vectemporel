import { register } from './registry.js';

/* Lentille E026 — gestion de l'état appliquée aux lunes de la vue Constellation.
 * Dix chantiers concrets : store dérivé du balisage, canal de mutation unique,
 * historique annuler/rétablir/réinitialiser, bus d'abonnements, persistance de
 * session, transactions groupées, sélecteurs mémoïsés, garde d'invariants,
 * horloge logique de version et réconciliation des mutations externes.
 * Module autonome et tolérant : aucun appel réseau, aucune source d'aléa,
 * aucun appel de débogage, aucun minuteur ni boucle d'animation propre,
 * aucun fichier partagé modifié.
 */

const STYLE_ID = 'constellation-e026';
const CLE_SESSION = 'e026-etat';
const PANEL_ID = 'e026-panel';
const UNDO_ID = 'e026-undo';
const REDO_ID = 'e026-redo';
const RESET_ID = 'e026-reset';
const NEXT_ID = 'e026-next';
const BATCH_ID = 'e026-batch';
const SYNC_ID = 'e026-sync';
const READOUT_ID = 'e026-readout';
const VERSION_ID = 'e026-version';
const LIMITE_HISTORIQUE = 20;

const CSS = `
/* E026-01 — identifiant d'état stable posé sur chaque lune. */
.constellation-layout .const-moon[data-e026-id]{cursor:pointer}
/* E026-02 — la lune sélectionnée est marquée par l'état, pas par la seule couleur. */
.constellation-layout .const-moon.e026-active{border-color:#e6b96f;box-shadow:0 0 0 3px rgba(230,185,111,.32)}
/* E026-03 — commandes d'historique, cibles d'au moins 36 px. */
#e026-panel{position:absolute;top:8px;right:8px;z-index:6;display:flex;flex-wrap:wrap;align-items:center;gap:5px;max-width:280px;padding:6px;border:1px solid rgba(230,185,111,.35);border-radius:8px;background:rgba(7,11,18,.9)}
.e026-btn{min-width:36px;min-height:36px;padding:0 8px;border:1px solid var(--line,#3a4150);border-radius:7px;background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);font-size:10px;cursor:pointer}
.e026-btn:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
.e026-btn[disabled]{opacity:.4;cursor:not-allowed}
.e026-btn[aria-disabled="true"]{opacity:.45}
/* E026-05 — badge visible de reprise d'une session précédente. */
.constellation-layout[data-e026-restaur="1"] #e026-version::after{content:" · reprise";color:#e6b96f}
/* E026-06 — l'état de transaction est visible sur le panneau. */
#e026-panel[data-e026-transaction="1"]{border-color:#e6b96f;box-shadow:0 0 0 2px rgba(230,185,111,.18)}
/* E026-07 — grandeur dérivée, lisible et annoncée. */
#e026-readout{max-width:250px;color:#cbd5e1;font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
/* E026-09 — version logique du store. */
#e026-version{color:#f5e6c4;font:10px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap}
/* E026-10 — bascule de réconciliation, aria-pressed comme état indépendant. */
#e026-sync[aria-pressed="true"]{border-color:#e6b96f;background:rgba(230,185,111,.18);color:#f5e6c4}
@media (max-width:620px){#e026-panel{max-width:195px;top:6px;right:6px}#e026-readout{max-width:165px;font-size:9px}}
@media (prefers-reduced-motion:reduce){.constellation-layout .const-moon.e026-active{transition:none}}
`;

function clamp(value, low, high) {
  if (!Number.isFinite(value)) return low;
  if (high < low) return low;
  return Math.max(low, Math.min(high, value));
}

function copier(etat) {
  return { selected: etat.selected, visited: etat.visited.slice(), version: etat.version };
}

function pousser(pile, snapshot) {
  pile.push(snapshot);
  if (pile.length > LIMITE_HISTORIQUE) pile.shift();
}

register('E026', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;

  try {
    const layout = ctx.layout;
    const doc = layout.ownerDocument;
    if (!doc || typeof doc.createElement !== 'function') return;
    const make = typeof ctx.el === 'function'
      ? ctx.el
      : (tag, cls, text) => {
          const n = doc.createElement(tag);
          if (cls) n.className = cls;
          if (text !== undefined) n.textContent = text;
          return n;
        };
    if (typeof ctx.css === 'function') ctx.css(STYLE_ID, CSS);

    const ancre = layout.querySelector('.constellation-field') || layout;
    const caption = layout.querySelector('.constellation-caption') || layout;
    const layer = layout.querySelector('.const-layer-moons') || layout;
    const moons = Array.from(layout.querySelectorAll('.const-moon'));
    const total = moons.length;

    /* Stockage de session isolé : indisponible ou saturé, on reste en mémoire. */
    const stockage = (() => {
      try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; }
      catch { return null; }
    })();

    /* E026-01 — le store est dérivé du balisage réel, jamais codé en dur. */
    function lireBalisage() {
      let courant = -1;
      const visites = moons.map((moon, i) => {
        const marque = moon.getAttribute('aria-current') === 'true' || moon.classList.contains('is-active');
        if (marque && courant < 0) courant = i;
        return marque;
      });
      return { selected: courant >= 0 ? courant : 0, visited: visites, version: 0 };
    }

    /* E026-05 — lecture tolérante de l'état enregistré, validée contre le DOM. */
    function lireSession() {
      if (!stockage) return null;
      try {
        const brute = stockage.getItem(CLE_SESSION);
        if (!brute) return null;
        const donnees = JSON.parse(brute);
        if (!donnees || !Array.isArray(donnees.visited) || !Number.isInteger(donnees.selected)) return null;
        return { selected: donnees.selected, visited: donnees.visited, version: 0 };
      } catch { return null; }
    }

    const balisage = lireBalisage();
    const repris = lireSession();
    const state = repris
      ? { selected: clamp(repris.selected, 0, Math.max(0, total - 1)), visited: repris.visited.slice(0, total), version: 0 }
      : balisage;
    while (state.visited.length < total) state.visited.push(false);

    const instantaneInitial = copier(state);
    const historique = { past: [], future: [] };
    const abonnes = [];
    let lot = 0;
    let dernierCache = 'calcul';
    let cacheSelecteurs = { cle: '', valeur: null };
    let observer = null;
    let panel = null;
    let undo = null;
    let redo = null;
    let reset = null;
    let next = null;
    let batch = null;
    let sync = null;
    let readout = null;
    let versionNode = null;

    /* E026-01 — cardinality et identifiants stables exposés sur le layout. */
    layout.dataset.e026Total = String(total);
    layout.dataset.e026Restaur = repris ? '1' : '0';
    moons.forEach((moon, i) => { moon.dataset.e026Id = String(i); });

    /* E026-05 — écriture de l'état après chaque mutation réussie. */
    function persist() {
      if (!stockage) return;
      try {
        stockage.setItem(CLE_SESSION, JSON.stringify({ selected: state.selected, visited: state.visited }));
      } catch { /* stockage saturé ou interdit : l'état reste en mémoire. */ }
    }

    /* E026-08 — garde d'invariants sur l'index avant toute mutation. */
    function valide(index) {
      return Number.isInteger(index) && index >= 0 && index < total;
    }

    /* E026-04 — bus d'abonnements et événement de changement sur le layout. */
    function notifier(source) {
      const detail = { source, selected: state.selected, visited: state.visited.slice(), version: state.version };
      abonnes.forEach((abonne) => {
        try { abonne(detail); } catch { /* un abonné défaillant n'isole pas les autres. */ }
      });
      layout.dataset.e026Dernier = source;
      if (typeof CustomEvent === 'function') {
        try { layout.dispatchEvent(new CustomEvent('e026:change', { detail, bubbles: true })); }
        catch { /* l'événement est un bonus, jamais une condition de réussite. */ }
      }
    }

    function abonner(fn) {
      if (typeof fn === 'function') abonnes.push(fn);
      return abonnes.length;
    }

    /* E026-07 — sélecteurs dérivés mémoïsés, invalidés par la version du store. */
    function selecteurs() {
      const cle = `${state.version}|${state.visited.join('')}|${state.selected}`;
      dernierCache = cacheSelecteurs.cle === cle ? 'hit' : 'miss';
      if (dernierCache === 'hit') return cacheSelecteurs.valeur;
      const visites = state.visited.reduce((n, marque) => n + (marque ? 1 : 0), 0);
      const pourcent = total ? Math.round((visites * 100) / total) : 0;
      const findex = state.visited.findIndex((marque) => !marque);
      const valeur = { visites, pourcent, prochaine: findex < 0 ? total : findex };
      cacheSelecteurs = { cle, valeur };
      return valeur;
    }

    /* E026-03 — état des boutons d'historique recalculé à chaque rendu. */
    function majCommandes() {
      if (undo) undo.disabled = historique.past.length === 0;
      if (redo) redo.disabled = historique.future.length === 0;
      if (reset) reset.disabled = state.version <= 1;
      if (next) {
        const borne = state.selected >= Math.max(0, total - 1);
        next.setAttribute('aria-disabled', borne ? 'true' : 'false');
      }
      if (panel) panel.dataset.e026Transaction = lot > 0 ? '1' : '0';
    }

    /* E026-02 — rendu unique : aucun mutateur ne touche le DOM directement. */
    function render() {
      const derive = selecteurs();
      moons.forEach((moon, i) => {
        const actif = i === state.selected;
        moon.dataset.e026Version = String(state.version);
        moon.dataset.e026Visited = state.visited[i] ? '1' : '0';
        moon.classList.toggle('e026-active', actif);
        if (actif) moon.setAttribute('aria-current', 'true');
        else if (moon.getAttribute('aria-current') === 'true') moon.removeAttribute('aria-current');
      });
      layout.dataset.e026Selected = String(state.selected);
      layout.dataset.e026Version = String(state.version);
      layout.dataset.e026Progress = String(derive.pourcent);
      if (versionNode) versionNode.textContent = `v${state.version}`;
      if (readout) {
        readout.textContent = `${derive.visites}/${total} lunes visitées · ${derive.pourcent} % · prochaine ${derive.prochaine + 1}/${total}`;
        readout.dataset.e026Cache = dernierCache;
      }
      majCommandes();
    }

    /* E026-02 — canal de mutation unique : version, historique, rendu, bus, persistance. */
    function commit(patch, options) {
      const opt = options || {};
      const avant = copier(state);
      if (patch && typeof patch.selected === 'number' && valide(patch.selected)) state.selected = patch.selected;
      if (patch && Array.isArray(patch.visited)) {
        state.visited = patch.visited.slice(0, total);
        while (state.visited.length < total) state.visited.push(false);
      }
      state.version += 1;
      if (opt.record !== false) {
        pousser(historique.past, avant);
        historique.future.length = 0;
      }
      render();
      if (opt.silent !== true) notifier(opt.source || 'changement');
      persist();
    }

    function appliquerSnapshot(snapshot, source) {
      state.selected = clamp(snapshot.selected, 0, Math.max(0, total - 1));
      state.visited = snapshot.visited.slice(0, total);
      while (state.visited.length < total) state.visited.push(false);
      commit({}, { record: false, source });
    }

    /* E026-08 — refus explicite d'un index hors limites, tracé sur le layout. */
    function select(index) {
      if (!valide(index)) {
        layout.dataset.e026Refus = 'hors-limites';
        notifier('refus');
        return false;
      }
      layout.dataset.e026Refus = 'aucun';
      commit({ selected: index }, { source: 'selection' });
      return true;
    }

    /* E026-06 — transaction : plusieurs mutations, une seule entrée d'historique. */
    function transaction(application, etiquette) {
      const avant = copier(state);
      lot += 1;
      layout.dataset.e026Transaction = '1';
      if (panel) panel.dataset.e026Transaction = '1';
      try { application(); }
      finally {
        lot -= 1;
        layout.dataset.e026Transaction = lot > 0 ? '1' : '0';
        if (panel) panel.dataset.e026Transaction = lot > 0 ? '1' : '0';
      }
      pousser(historique.past, avant);
      historique.future.length = 0;
      commit({}, { record: false, source: etiquette || 'transaction' });
    }

    /* E026-03 — annuler et rétablir déplacent un snapshot entre deux piles. */
    function annuler() {
      if (!historique.past.length) return;
      const cible = historique.past.pop();
      pousser(historique.future, copier(state));
      appliquerSnapshot(cible, 'annulation');
    }

    function retablir() {
      if (!historique.future.length) return;
      const cible = historique.future.pop();
      pousser(historique.past, copier(state));
      appliquerSnapshot(cible, 'retablissement');
    }

    /* E026-03 — panneau d'historique, avec réinitialisation vers l'instantané initial. */
    function assurer(id, tag, cls, text, parent) {
      let n = doc.getElementById(id);
      if (!n) { n = make(tag, cls, text); n.id = id; }
      if (n.parentNode !== parent) parent.appendChild(n);
      return n;
    }

    panel = assurer(PANEL_ID, 'div', 'e026-panel', null, ancre);
    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', 'Gestion de l’état des lunes');

    undo = assurer(UNDO_ID, 'button', 'e026-btn', 'Annuler', panel);
    redo = assurer(REDO_ID, 'button', 'e026-btn', 'Rétablir', panel);
    reset = assurer(RESET_ID, 'button', 'e026-btn', 'Réinitialiser', panel);
    [undo, redo, reset].forEach((b) => { b.type = 'button'; });

    /* E026-09 — témoin visible de l'horloge logique du store. */
    versionNode = assurer(VERSION_ID, 'span', 'e026-version', 'v0', panel);

    /* E026-07 — mesure dérivée annoncée, role=status et aria-live poli. */
    readout = assurer(READOUT_ID, 'p', 'e026-readout', '', caption);
    readout.setAttribute('role', 'status');
    readout.setAttribute('aria-live', 'polite');
    readout.setAttribute('aria-atomic', 'true');

    /* E026-08 — commande bornée : désactivée sémantiquement en fin de parcours. */
    next = assurer(NEXT_ID, 'button', 'e026-btn', 'Lune suivante', panel);
    next.type = 'button';

    /* E026-06 — marquage groupé de toutes les lunes en une transaction. */
    batch = assurer(BATCH_ID, 'button', 'e026-btn', 'Tout marquer', panel);
    batch.type = 'button';

    /* E026-10 — bascule indépendante de réconciliation des attributs externes. */
    sync = assurer(SYNC_ID, 'button', 'e026-btn', 'Sync', panel);
    sync.type = 'button';

    /* E026-02 — un clic sur une lune est une mutation comme toute autre. */
    layer.addEventListener('click', (event) => {
      const cible = event.target;
      if (!(cible instanceof Element)) return;
      const moon = cible.closest('.const-moon');
      if (!moon || !layer.contains(moon)) return;
      const i = Number(moon.dataset.e026Id);
      if (!valide(i)) return;
      const suite = state.visited.slice();
      suite[i] = true;
      commit({ selected: i, visited: suite }, { source: 'clic-lune' });
    }, true);

    /* E026-03 — les trois commandes d'historique passent par le store. */
    if (undo.dataset.e026Bound !== '1') {
      undo.dataset.e026Bound = '1';
      undo.addEventListener('click', annuler);
    }
    if (redo.dataset.e026Bound !== '1') {
      redo.dataset.e026Bound = '1';
      redo.addEventListener('click', retablir);
    }
    if (reset.dataset.e026Bound !== '1') {
      reset.dataset.e026Bound = '1';
      reset.addEventListener('click', () => {
        transaction(() => appliquerSnapshot(instantaneInitial, 'raz'), 'reinitialisation');
      });
    }

    /* E026-06 — le lot global ne produit qu'une seule notification et un seul undo. */
    if (batch.dataset.e026Bound !== '1') {
      batch.dataset.e026Bound = '1';
      batch.addEventListener('click', () => {
        transaction(() => {
          commit({ visited: moons.map(() => true) }, { record: false, silent: true });
        }, 'lot-global');
      });
    }

    /* E026-08 — la commande suivante refuse elle-même de franchir la borne. */
    if (next.dataset.e026Bound !== '1') {
      next.dataset.e026Bound = '1';
      next.addEventListener('click', () => {
        if (state.selected >= Math.max(0, total - 1)) {
          layout.dataset.e026Refus = 'borne-atteinte';
          notifier('refus');
          return;
        }
        select(state.selected + 1);
      });
    }

    /* E026-10 — un MutationObserver réconcilie les aria-current posés ailleurs. */
    if (typeof MutationObserver === 'function' && total) {
      observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName !== 'aria-current') continue;
          const cible = mutation.target;
          if (!(cible instanceof Element) || !cible.classList.contains('const-moon')) continue;
          const i = Number(cible.dataset.e026Id);
          if (!valide(i)) continue;
          if (cible.getAttribute('aria-current') === 'true') {
            if (state.selected !== i) { select(i); break; }
          } else if (state.selected === i) {
            const autre = moons.findIndex((m, k) => k !== i && m.getAttribute('aria-current') === 'true');
            if (autre >= 0) { select(autre); break; }
          }
        }
      });
      observer.observe(layer, { attributes: true, attributeFilter: ['aria-current'], subtree: true });
      layout.dataset.e026Sync = '1';
    } else {
      layout.dataset.e026Sync = '0';
    }

    /* E026-10 — la bascule active ou suspend la réconciliation, sans minuteur. */
    sync.setAttribute('aria-pressed', layout.dataset.e026Sync === '1' ? 'true' : 'false');
    if (sync.dataset.e026Bound !== '1') {
      sync.dataset.e026Bound = '1';
      sync.addEventListener('click', () => {
        const actif = sync.getAttribute('aria-pressed') !== 'true';
        sync.setAttribute('aria-pressed', actif ? 'true' : 'false');
        layout.dataset.e026Sync = actif ? '1' : '0';
        if (observer) {
          if (actif) observer.observe(layer, { attributes: true, attributeFilter: ['aria-current'], subtree: true });
          else observer.disconnect();
        }
        notifier('synchronisation');
      });
    }

    /* E026-04 — un abonné interne comptabilise les changements successifs. */
    abonner((detail) => {
      layout.dataset.e026Evenements = String((Number(layout.dataset.e026Evenements) || 0) + 1);
      if (versionNode) versionNode.textContent = `v${detail.version}`;
    });
    layout.dataset.e026Abonnes = String(abonnes.length);

    /* E026-09 — l'horloge logique et la préférence de mouvement sont des métadonnées. */
    layout.dataset.e026Reduced = (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) ? '1' : '0';

    render();
    notifier('initialisation');
    persist();
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
