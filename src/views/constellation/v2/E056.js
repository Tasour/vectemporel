import { register } from './registry.js';

/* Lentille V2 E056 — état du focus et de la tabulation de la vue Constellation.
   Seconde passe : dix chantiers inédits, tous implémentés, déterministes,
   sans réseau, sans source aléatoire et sans minuteur. Préfixe v2e056. */
register('E056', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  if (typeof ctx.css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function'
      || typeof layout.setAttribute !== 'function'
      || !layout.dataset || typeof layout.dataset !== 'object') return;

  /* Une seule feuille de style, installée une fois par le registre. */
  ctx.css('constellation-v2-e056', `
.v2e056-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e056-back{min-height:40px;padding:0 12px;margin:8px 0 0;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:9px;cursor:pointer}
.v2e056-back:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.v2e056-back[disabled]{opacity:.5;cursor:default}
.constellation-layout button[data-v2e056-courant="true"]{outline:2px solid var(--gold-bright);outline-offset:3px;z-index:6}
.v2e056-mirror{margin:6px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.v2e056-journal{margin:4px 0 0;padding-left:18px;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.v2e056-journal li{margin:1px 0}
.constellation-layout button[data-v2e056-limite="debut"]::after{content:" ◀ début";font-size:8px;color:var(--gold-bright)}
.constellation-layout button[data-v2e056-limite="fin"]::after{content:" fin ▶";font-size:8px;color:var(--gold-bright)}
@media (prefers-reduced-motion: reduce){.v2e056-back{transition:none!important}}
`);

  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.querySelectorAll !== 'function'
      || typeof field.addEventListener !== 'function'
      || typeof field.contains !== 'function') return;

  const make = typeof ctx.el === 'function' ? ctx.el : (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const collect = () => Array.from(field.querySelectorAll('button[data-const-key]'));
  const keyOf = node => (node && node.dataset ? node.dataset.constKey || '' : '');
  const familyOf = (node) => {
    const classes = node && node.classList ? node.classList : null;
    if (classes && classes.contains('const-sun')) return 'ère';
    if (classes && classes.contains('const-planet')) return 'repère';
    if (classes && classes.contains('const-moon')) return 'point';
    return 'arrêt';
  };

  /* État local : aucune mutation n'est faite en dehors des chantiers ci-dessous. */
  const state = {
    phase: 'hors-scene',
    actif: '',
    seq: 0,
    empreinte: '—',
    visites: Object.create(null),
    trail: [],
    oscillation: 'indéterminé',
    fil: '—',
    ancrage: '',
    fantome: 'non',
    limites: '—',
  };
  const journal = [];
  let lastFocused = null;
  let currentMarked = null;
  let journalList = null;
  let mirror = null;
  let live = null;
  let anchorButton = null;

  function visitesCompact() {
    return Object.keys(state.visites).sort()
      .map(key => `${key}:${state.visites[key]}`).join(';') || 'aucune';
  }

  function signature() {
    return [state.phase, state.actif, state.trail.join('>'), state.oscillation,
      state.fil, state.ancrage, visitesCompact()].join('|');
  }

  function empreinteDe(texte) {
    let h = 2166136261;
    for (let i = 0; i < texte.length; i += 1) {
      h ^= texte.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  function publier() {
    const d = layout.dataset;
    d.v2e056Phase = state.phase;
    d.v2e056Actif = state.actif || 'aucun';
    d.v2e056Seq = String(state.seq);
    d.v2e056Empreinte = state.empreinte;
    d.v2e056Visites = visitesCompact();
    d.v2e056Oscillation = state.oscillation;
    d.v2e056Fil = state.fil;
    d.v2e056Ancrage = state.ancrage || 'aucun';
    d.v2e056Fantome = state.fantome;
    d.v2e056Limites = state.limites;
    d.v2e056Journal = journal.length ? journal.join(' | ') : 'vide';
    if (anchorButton) anchorButton.disabled = !state.ancrage;
    if (mirror) {
      mirror.textContent = `Focus V2 — séquence ${state.seq} · empreinte ${state.empreinte} · ${state.phase} · fil ${state.fil} · oscillation ${state.oscillation} · visites ${visitesCompact()} · ancrage ${state.ancrage || 'aucun'} · fantôme ${state.fantome} · tabulation ${state.limites}`;
    }
    if (journalList) {
      while (journalList.firstChild) journalList.removeChild(journalList.firstChild);
      journal.forEach((entry, index) => {
        const item = document.createElement('li');
        item.textContent = `${index + 1}. ${entry}`;
        journalList.appendChild(item);
      });
    }
  }

  function annoncer(texte) {
    if (live) live.textContent = texte;
  }

  /* E056-01 — Horloge logique : chaque événement reçoit un rang monotone. */
  function battre() {
    state.seq += 1;
    return state.seq;
  }
  battre();

  /* E056-02 — Empreinte déterministe de l'état de focus. */
  function calculerEmpreinte() {
    state.empreinte = empreinteDe(signature());
  }
  calculerEmpreinte();

  /* E056-03 — Fréquentation : chaque arrêt compte ses propres visites. */
  function noterVisite(key) {
    if (!key) return;
    state.visites[key] = (state.visites[key] || 0) + 1;
  }

  /* E056-04 — Oscillation : cycle A→B→A→B sur les quatre derniers arrêts. */
  function pousserTrail(key) {
    if (!key) return;
    if (state.trail[state.trail.length - 1] === key) return;
    state.trail.push(key);
    if (state.trail.length > 6) state.trail.shift();
  }

  function detecterOscillation() {
    if (state.trail.length < 4) return 'indéterminé';
    const t = state.trail.slice(-4);
    if (t[0] === t[2] && t[1] === t[3] && t[0] !== t[1]) return 'oscillation';
    if (t[3] === t[2]) return 'stationnaire';
    return 'progression';
  }

  /* E056-05 — Fil d'Ariane hiérarchique ère › repère › point. */
  const ancresFamille = Object.create(null);
  const ordreFamilles = ['ère', 'repère', 'point'];

  function majFil(famille, key) {
    ancresFamille[famille] = key;
    state.fil = ordreFamilles
      .filter(f => ancresFamille[f])
      .map(f => `${f}:${ancresFamille[f]}`)
      .join(' › ') || '—';
  }

  /* E056-06 — Ancrage d'entrée et commande de retour à cet ancrage. */
  function majAncrage(key, entree) {
    if (entree && key && !state.ancrage) state.ancrage = key;
  }
  if (field.parentNode && typeof field.parentNode.insertBefore === 'function'
      && !layout.querySelector('#v2e056-anchor')) {
    anchorButton = make('button', 'v2e056-back', '↩ Revenir à l’ancrage');
    anchorButton.id = 'v2e056-anchor';
    anchorButton.type = 'button';
    if (!field.id) field.id = 'v2e056-scene';
    anchorButton.setAttribute('aria-controls', field.id);
    anchorButton.addEventListener('click', () => {
      const cible = collect().find(node => keyOf(node) === state.ancrage);
      if (cible && typeof cible.focus === 'function') cible.focus({ preventScroll: true });
    });
    field.parentNode.insertBefore(anchorButton, field);
  }

  /* E056-07 — Réconciliation de l'attribut aria-current sur l'arrêt focalisé. */
  function marquerCourant(node) {
    if (currentMarked && currentMarked !== node
        && currentMarked.getAttribute('data-v2e056-courant') === 'true') {
      currentMarked.removeAttribute('aria-current');
      currentMarked.removeAttribute('data-v2e056-courant');
    }
    if (!node || typeof node.setAttribute !== 'function') return;
    node.setAttribute('data-v2e056-courant', 'true');
    node.setAttribute('aria-current', 'location');
    currentMarked = node;
  }

  /* E056-08 — Journal d'événements borné, textuel et indexable. */
  function ajouterJournal(type, key) {
    const rang = battre();
    journal.push(`${rang}:${type}:${key || 'aucun'}`);
    if (journal.length > 6) journal.shift();
  }
  const caption = layout.querySelector('.constellation-caption');
  journalList = document.createElement('ol');
  journalList.id = 'v2e056-journal';
  journalList.className = 'v2e056-journal';
  journalList.setAttribute('aria-label', 'Journal des événements de focus');
  if (caption && typeof caption.appendChild === 'function') caption.appendChild(journalList);
  else layout.appendChild(journalList);

  /* E056-09 — Détection d'une cible fantôme (nœud quitté puis détaché). */
  function verifierFantome(node) {
    if (lastFocused && lastFocused !== node && !field.contains(lastFocused)) {
      state.fantome = 'oui';
      return true;
    }
    state.fantome = 'non';
    return false;
  }

  /* E056-10 — Limites de tabulation explicites : début et fin de la scène. */
  function majLimites() {
    const stops = collect().filter(node => {
      const ti = node.tabIndex;
      return typeof ti !== 'number' || ti >= 0;
    });
    stops.forEach(node => node.removeAttribute('data-v2e056-limite'));
    if (!stops.length) {
      state.limites = 'aucun arrêt';
      return;
    }
    const premier = stops[0];
    const dernier = stops[stops.length - 1];
    premier.setAttribute('data-v2e056-limite', 'debut');
    dernier.setAttribute('data-v2e056-limite', 'fin');
    state.limites = `${keyOf(premier)} … ${keyOf(dernier)} (${stops.length})`;
  }
  majLimites();

  /* Câblage — régions de sortie et écouteurs délégués, sans minuteur propre. */
  live = make('p', 'v2e056-sr', '');
  live.id = 'v2e056-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  layout.appendChild(live);

  mirror = make('p', 'v2e056-mirror', '');
  mirror.id = 'v2e056-mirror';
  if (caption && typeof caption.appendChild === 'function') caption.appendChild(mirror);
  else layout.appendChild(mirror);

  const resoudre = (target) => {
    if (!target || target.nodeType !== 1 || typeof target.closest !== 'function') return null;
    const node = target.closest('button[data-const-key]');
    return node && field.contains(node) ? node : null;
  };

  field.addEventListener('focusin', (event) => {
    const node = resoudre(event && event.target);
    if (!node) return;
    const key = keyOf(node);
    const entree = state.phase !== 'dans-scene';
    const fantome = verifierFantome(node);
    const oscillPrecedente = state.oscillation;

    state.phase = 'dans-scene';
    state.actif = key;
    ajouterJournal('focus', key);
    noterVisite(key);
    pousserTrail(key);
    state.oscillation = detecterOscillation();
    majFil(familyOf(node), key);
    majAncrage(key, entree);
    marquerCourant(node);
    majLimites();
    calculerEmpreinte();
    lastFocused = node;
    publier();

    if (fantome) {
      annoncer(`Cible fantôme détectée — retour sur ${familyOf(node)} ${key}.`);
    } else if (state.oscillation === 'oscillation' && state.oscillation !== oscillPrecedente) {
      annoncer(`Oscillation du focus entre deux arrêts — ${state.fil}.`);
    } else {
      annoncer(`${familyOf(node)} ${key} — séquence ${state.seq}, visite ${state.visites[key]}.`);
    }
  });

  field.addEventListener('focusout', (event) => {
    const suivant = event && event.relatedTarget;
    if (suivant && field.contains(suivant)) return;
    state.phase = 'hors-scene';
    ajouterJournal('sortie', state.actif);
    calculerEmpreinte();
    publier();
  });

  layout.addEventListener('keydown', (event) => {
    if (!event || event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) return;
    ajouterJournal('tab', state.actif);
    calculerEmpreinte();
    publier();
  }, true);

  calculerEmpreinte();
  publier();
});
