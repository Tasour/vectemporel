import { register } from './registry.js';

/* Lentille V2 E026 — pilotage avancé de l'état des lunes de la vue Constellation.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau ni source
   aléatoire. Préfixe exclusif v2e026 : aucune collision avec la passe 1. */
register('E026', ctx => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  css('constellation-v2-e026', `
.v2e026-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#v2e026-panel{position:absolute;top:44px;right:8px;z-index:7;display:flex;flex-wrap:wrap;align-items:center;gap:5px;max-width:300px;padding:6px;border:1px solid var(--line,#3a4150);border-radius:8px;background:rgba(7,11,18,.9)}
.v2e026-btn{min-width:36px;min-height:36px;padding:0 8px;border:1px solid var(--line,#3a4150);border-radius:7px;background:var(--surface-2,#141a24);color:var(--ink-soft,#cfd8e6);font-size:10px;cursor:pointer}
.v2e026-btn:focus-visible{outline:2px solid #e6b96f;outline-offset:2px}
.v2e026-btn[disabled]{opacity:.45;cursor:not-allowed}
#v2e026-lock[aria-pressed="true"]{border-style:dashed;text-decoration:underline}
#v2e026-readout,#v2e026-journal{max-width:270px;color:#cbd5e1;font:10px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
#v2e026-journal{color:#9fb0c4}
.constellation-layout .const-moon.v2e026-lock{border-style:dashed;outline:2px dashed rgba(230,185,111,.75);outline-offset:2px}
@media (max-width:620px){#v2e026-panel{max-width:200px;top:40px;right:6px}#v2e026-readout,#v2e026-journal{max-width:170px;font-size:9px}}
@media (prefers-reduced-motion:reduce){.v2e026-btn,.constellation-layout .const-moon{transition:none!important}}
`);

  const doc = layout.ownerDocument || document;
  const faire = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, cls, texte) => {
        const n = doc.createElement(tag);
        if (cls) n.className = cls;
        if (texte !== undefined) n.textContent = texte;
        return n;
      };

  function assurer(id, tag, cls, texte, parent) {
    let n = typeof doc.getElementById === 'function' ? doc.getElementById(id) : null;
    if (!n) { n = faire(tag, cls, texte); n.id = id; }
    if (n.parentNode !== parent) parent.appendChild(n);
    return n;
  }

  const couche = layout.querySelector('.const-layer-moons') || layout;
  const lunes = Array.from(layout.querySelectorAll('.const-moon'));
  const total = lunes.length;
  if (!total) { layout.dataset.v2e026Total = '0'; return; }

  const libelles = lunes.map(lune => lune.getAttribute('aria-label')
    || (lune.textContent || '').trim() || 'Lune');
  const CLE = 'v2e026-etat';
  const LIMITE_JOURNAL = 12;

  const stockage = (() => {
    try { return typeof sessionStorage === 'undefined' ? null : sessionStorage; }
    catch { return null; }
  })();

  function copier(e) {
    return {
      selected: e.selected,
      visited: e.visited.slice(),
      parcours: e.parcours.slice(),
      lock: e.lock.slice(),
      version: e.version
    };
  }

  function bornerTableaux(e) {
    while (e.visited.length < total) e.visited.push(false);
    e.visited.length = total;
    while (e.lock.length < total) e.lock.push(false);
    e.lock.length = total;
    e.parcours = e.parcours.filter(i => Number.isInteger(i) && i >= 0 && i < total);
  }

  /* E026-06 — Empreinte deterministe du contenu, sans horloge ni alea. */
  function empreinte(e) {
    const chaine = `${e.selected}|${e.visited.map(v => v ? '1' : '0').join('')}|${e.parcours.join(',')}|${e.lock.map(v => v ? '1' : '0').join('')}`;
    let h = 2166136261;
    for (let i = 0; i < chaine.length; i += 1) {
      h ^= chaine.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  /* E026-02 — Validation complete du schema avant toute adoption d'etat. */
  function estValideEtat(e) {
    if (!e || !Number.isInteger(e.selected) || e.selected < 0 || e.selected >= total) return false;
    if (!Array.isArray(e.visited) || !Array.isArray(e.lock) || !Array.isArray(e.parcours)) return false;
    if (e.visited.length !== total || e.lock.length !== total) return false;
    if (!e.visited.every(v => typeof v === 'boolean')) return false;
    if (!e.lock.every(v => typeof v === 'boolean')) return false;
    return e.parcours.every(i => Number.isInteger(i) && i >= 0 && i < total);
  }

  /* E026-01 — Reducteur pur : actions typees, aucune mutation directe du DOM. */
  function reduire(e, action) {
    const type = action && action.type;
    const cible = action && action.cible;
    const copie = copier(e);
    if (!Number.isInteger(cible) || cible < 0 || cible >= total) return copie;
    if (type === 'selectionner') {
      if (copie.lock[cible]) return copie;
      if (!copie.visited[cible]) copie.parcours.push(cible);
      copie.visited[cible] = true;
      copie.selected = cible;
    } else if (type === 'marquer') {
      if (copie.lock[cible]) return copie;
      if (!copie.visited[cible]) copie.parcours.push(cible);
      copie.visited[cible] = true;
    } else if (type === 'demarquer') {
      if (copie.lock[cible]) return copie;
      copie.visited[cible] = false;
    } else if (type === 'verrouiller') {
      copie.lock[cible] = !copie.lock[cible];
    } else {
      return copie;
    }
    copie.version += 1;
    return copie;
  }

  /* E026-03 — Invariant : la lune selectionnee est toujours marquee visitee. */
  function coherence() {
    return etat.visited[etat.selected] === true;
  }

  /* E026-09 — Migration tolerancee de trois schamas de session successifs. */
  function lireMigration() {
    if (!stockage) return null;
    let brute;
    try { brute = stockage.getItem(CLE); } catch { return null; }
    if (!brute) return null;
    let donnees;
    try { donnees = JSON.parse(brute); } catch { return null; }
    let brut = null;
    if (Array.isArray(donnees)) {
      brut = { selected: donnees[0], visited: donnees.slice(), parcours: donnees.slice(), lock: [] };
    } else if (donnees && typeof donnees === 'object') {
      if (Number.isInteger(donnees.selection) && Array.isArray(donnees.visitees)) {
        brut = {
          selected: donnees.selection,
          visited: donnees.visitees.slice(),
          parcours: Array.isArray(donnees.parcours) ? donnees.parcours.slice() : [],
          lock: Array.isArray(donnees.lock) ? donnees.lock.slice() : []
        };
      } else if (Number.isInteger(donnees.selected) && Array.isArray(donnees.visited)) {
        brut = {
          selected: donnees.selected,
          visited: donnees.visited.slice(),
          parcours: Array.isArray(donnees.parcours) ? donnees.parcours.slice() : [],
          lock: Array.isArray(donnees.lock) ? donnees.lock.slice() : []
        };
      }
    }
    if (!brut) return null;
    bornerTableaux(brut);
    brut.selected = Math.max(0, Math.min(total - 1, brut.selected));
    brut.version = 0;
    if (!estValideEtat(brut)) return null;
    if (!brut.visited[brut.selected]) brut.visited[brut.selected] = true;
    if (brut.parcours.indexOf(brut.selected) < 0) brut.parcours.push(brut.selected);
    return brut;
  }

  /* Etat initial releve dans le balisage, puis eventuellement migre. */
  const etat = { selected: 0, visited: [], parcours: [], lock: [], version: 0 };
  let courant = -1;
  lunes.forEach((lune, i) => {
    if (courant < 0 && (lune.getAttribute('aria-current') === 'true' || lune.classList.contains('is-active'))) courant = i;
  });
  etat.selected = courant >= 0 ? courant : 0;
  etat.visited = lunes.map(() => false);
  etat.visited[etat.selected] = true;
  etat.parcours = [etat.selected];
  etat.lock = lunes.map(() => false);
  const repris = lireMigration();
  if (repris) {
    etat.selected = repris.selected;
    etat.visited = repris.visited;
    etat.parcours = repris.parcours;
    etat.lock = repris.lock;
  }
  layout.dataset.v2e026Migre = repris ? '1' : '0';
  layout.dataset.v2e026Total = String(total);

  const depart = copier(etat);
  let journal = [];
  let script = [];
  let renduPrecedent = [];
  let panneau = null;
  let boutonLock = null;
  let boutonReplay = null;
  let readout = null;
  let journalNode = null;
  let live = null;

  const ancre = layout.querySelector('.constellation-field') || layout;
  panneau = assurer('v2e026-panel', 'div', 'v2e026-panel', null, ancre);
  panneau.setAttribute('role', 'group');
  panneau.setAttribute('aria-label', 'Pilotage avancé de l’état des lunes');
  boutonLock = assurer('v2e026-lock', 'button', 'v2e026-btn', 'Verrouiller la lune', panneau);
  boutonLock.type = 'button';
  boutonReplay = assurer('v2e026-replay', 'button', 'v2e026-btn', 'Rejouer le parcours', panneau);
  boutonReplay.type = 'button';
  readout = assurer('v2e026-readout', 'p', 'v2e026-readout', '', panneau);
  journalNode = assurer('v2e026-journal', 'p', 'v2e026-journal', 'Aucune mutation', panneau);
  live = assurer('v2e026-live', 'p', 'v2e026-sr', '', layout);
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');

  function annoncer(texte) {
    if (live) live.textContent = texte;
  }

  /* E026-08 — Refus explicite d'une lune verrouillee, jamais une mutation muette. */
  function refuser(motif) {
    layout.dataset.v2e026Refus = motif;
    annoncer(motif === 'verrouillee'
      ? 'Lune verrouillée : mutation refusée.'
      : 'Action refusée : état inchangé.');
    if (readout) readout.textContent = `Refus : ${motif}.`;
  }

  /* E026-05 — Journal circulaire borne, source et cible de chaque mutation. */
  function journaliser(source, type, cible) {
    journal.push({
      v: etat.version,
      source: String(source || ''),
      type: String(type || ''),
      cible: Number.isInteger(cible) ? cible : -1
    });
    if (journal.length > LIMITE_JOURNAL) journal.shift();
    if (journalNode) {
      journalNode.textContent = journal.slice(-3).map(entree =>
        `v${entree.v} · ${entree.source} · lune ${entree.cible + 1}`).join(' | ') || 'Aucune mutation';
    }
    layout.dataset.v2e026Journal = String(journal.length);
  }

  /* E026-07 — Sequence ordonnee des premieres visites et rang de la lune courante. */
  function parcoursTexte() {
    return etat.parcours.length ? etat.parcours.map(i => String(i + 1)).join('→') : '—';
  }

  /* E026-04 — Rendu incremental : seules les lunes dont la signature change. */
  function rendre() {
    let touches = 0;
    lunes.forEach((lune, i) => {
      const signature = `${etat.selected === i ? 's' : '-'}${etat.visited[i] ? 'v' : '-'}${etat.lock[i] ? 'l' : '-'}`;
      if (renduPrecedent[i] === signature) return;
      renduPrecedent[i] = signature;
      touches += 1;
      lune.classList.toggle('v2e026-active', etat.selected === i);
      lune.classList.toggle('v2e026-lock', etat.lock[i]);
      lune.dataset.v2e026Visited = etat.visited[i] ? '1' : '0';
      lune.dataset.v2e026Lock = etat.lock[i] ? '1' : '0';
      lune.dataset.v2e026Version = String(etat.version);
      lune.dataset.v2e026Rang = String(etat.parcours.indexOf(i) + 1);
      if (etat.selected === i) lune.setAttribute('aria-current', 'true');
      else if (lune.getAttribute('aria-current') === 'true') lune.removeAttribute('aria-current');
      lune.setAttribute('aria-label', libelles[i]
        + (etat.visited[i] ? ' — visitée' : '')
        + (etat.lock[i] ? ' — verrouillée' : ''));
    });
    layout.dataset.v2e026Selected = String(etat.selected);
    layout.dataset.v2e026Version = String(etat.version);
    layout.dataset.v2e026Empreinte = empreinte(etat);
    layout.dataset.v2e026Touches = String(touches);
    layout.dataset.v2e026Parcours = etat.parcours.join(',');
    layout.dataset.v2e026Dernier = String(etat.parcours[etat.parcours.length - 1]);
    layout.dataset.v2e026Rang = String(etat.parcours.indexOf(etat.selected) + 1);
    layout.dataset.v2e026Coherence = coherence() ? '1' : '0';
    if (boutonLock) {
      boutonLock.setAttribute('aria-pressed', etat.lock[etat.selected] ? 'true' : 'false');
      boutonLock.textContent = etat.lock[etat.selected]
        ? 'Déverrouiller la lune' : 'Verrouiller la lune';
    }
    if (boutonReplay) boutonReplay.disabled = script.length === 0;
    if (readout) {
      readout.textContent = `Lune ${etat.selected + 1}/${total} · ${etat.parcours.length} visite(s) · rang ${etat.parcours.indexOf(etat.selected) + 1} · parcours ${parcoursTexte()} · empreinte ${empreinte(etat)} · ${touches} nœud(s) actualisé(s)`;
    }
  }

  function sauvegarder() {
    if (!stockage) return;
    try {
      stockage.setItem(CLE, JSON.stringify({
        selected: etat.selected,
        visited: etat.visited,
        parcours: etat.parcours,
        lock: etat.lock
      }));
    } catch { /* stockage indisponible : l'état reste uniquement en mémoire. */ }
  }

  function appliquer(action, source) {
    const suivant = reduire(etat, action);
    if (suivant.version === etat.version) {
      refuser(action && etat.lock[action.cible] ? 'verrouillee' : 'action-inconnue');
      return false;
    }
    if (!estValideEtat(suivant)) { refuser('schema-invalide'); return false; }
    etat.selected = suivant.selected;
    etat.visited = suivant.visited;
    etat.parcours = suivant.parcours;
    etat.lock = suivant.lock;
    etat.version = suivant.version;
    layout.dataset.v2e026Refus = 'aucun';
    script.push({ type: action.type, cible: action.cible });
    journaliser(source || action.type, action.type, action.cible);
    rendre();
    annoncer(`Lune ${etat.selected + 1} sur ${total} retenue, version ${etat.version}.`);
    sauvegarder();
    return true;
  }

  /* E026-10 — Rejeu deterministe du script d'actions depuis l'instantane initial. */
  function rejouer() {
    if (!script.length) { refuser('rejeu-vide'); return; }
    const actions = script.slice();
    etat.selected = depart.selected;
    etat.visited = depart.visited.slice();
    etat.parcours = depart.parcours.slice();
    etat.lock = depart.lock.slice();
    etat.version = depart.version;
    for (const action of actions) {
      const suivant = reduire(etat, action);
      if (!estValideEtat(suivant)) continue;
      etat.selected = suivant.selected;
      etat.visited = suivant.visited;
      etat.parcours = suivant.parcours;
      etat.lock = suivant.lock;
      etat.version = suivant.version;
    }
    journaliser('rejeu', 'rejeu', etat.selected);
    rendre();
    annoncer(`Parcours rejoué : ${actions.length} action(s), version ${etat.version}.`);
    layout.dataset.v2e026Rejeu = String(actions.length);
    sauvegarder();
  }

  couche.addEventListener('click', (event) => {
    const cible = event && event.target;
    if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return;
    const lune = cible.closest('.const-moon');
    if (!lune || !couche.contains(lune)) return;
    const i = lunes.indexOf(lune);
    if (i < 0) return;
    if (etat.lock[i]) { refuser('verrouillee'); return; }
    appliquer({ type: 'selectionner', cible: i }, 'clic-lune');
  }, true);

  if (boutonLock.dataset.v2e026Bound !== '1') {
    boutonLock.dataset.v2e026Bound = '1';
    boutonLock.addEventListener('click', () => {
      appliquer({ type: 'verrouiller', cible: etat.selected }, 'verrou');
    });
  }
  if (boutonReplay.dataset.v2e026Bound !== '1') {
    boutonReplay.dataset.v2e026Bound = '1';
    boutonReplay.addEventListener('click', rejouer);
  }

  layout.dataset.v2e026Reduced = (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) ? '1' : '0';
  rendre();
  journaliser('initialisation', 'initialiser', etat.selected);
  sauvegarder();
});
