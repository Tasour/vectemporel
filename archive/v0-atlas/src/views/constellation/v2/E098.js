import { register } from './registry.js';

/* Lentille V2 E098 — contrat de test avancé et diagnostic du champ d'étoiles
   de la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, sans réseau, sans graine aléatoire et sans minuteur ni boucle
   d'animation propre. Préfixe exclusif : v2e098 (aucune collision avec la
   passe 1, qui utilisait e098-… et constellation-e098). */
register('E098', ctx => {
  /* Garde d'entrée : sans layout courant ni DOM, aucun ajout n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Feuille unique de la lentille : panneau repliable lisible, focus visible,
     cible d'au moins 36 px et repli « mouvement réduit ». Aucune information
     n'est portée par la seule couleur. */
  css('constellation-v2-e098', `
.v2e098-diag{margin:10px 0 0;border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:6px;background:rgba(255,255,255,.02);color:var(--muted);font-size:10px;line-height:1.6;font-variant-numeric:tabular-nums}
.v2e098-summary{display:flex;align-items:center;min-height:36px;padding:6px 12px;cursor:pointer;color:var(--gold-bright);font-weight:600;list-style:none}
.v2e098-summary::-webkit-details-marker{display:none}
.v2e098-summary::before{content:'▸ ';font-size:12px}
.v2e098-diag[open] .v2e098-summary::before{content:'▾ '}
.v2e098-summary:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px;border-radius:4px}
.v2e098-body{padding:0 12px 10px}
.v2e098-status{margin:0 0 6px}
.v2e098-json{display:block;max-height:120px;overflow:auto;white-space:pre-wrap;word-break:break-word;color:var(--muted)}
.v2e098-alerte{border-left-color:#d98b6b}
@media (prefers-reduced-motion: reduce){.v2e098-summary{transition:none}}
`);

  /* Le champ est la racine de toutes les mesures ; sa présence conditionne
     l'ensemble des chantiers (DOM incomplet toléré). */
  const field = layout.querySelector('.constellation-field');
  if (!field) return;

  const make = (tag, className, text) => {
    if (typeof ctx.el === 'function') {
      try { return ctx.el(tag, className, text); } catch { /* repli local ci-dessous */ }
    }
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const suns = Array.from(field.querySelectorAll('.const-sun'));
  const planets = Array.from(field.querySelectorAll('.const-planet'));
  const moons = Array.from(field.querySelectorAll('.const-moon'));
  const edges = Array.from(field.querySelectorAll('.constellation-edges line'));
  const nodes = suns.concat(planets, moons);
  const layers = [['soleil', suns], ['repere', planets], ['point', moons]];

  /* Lecture déterministe de la classe et de l'activation, sans couleur. */
  const kindOf = node => node.classList.contains('const-sun') ? 'ere'
    : node.classList.contains('const-planet') ? 'repere' : 'point';
  const isActive = node => node.classList.contains('is-active')
    || node.getAttribute('aria-current') === 'true';

  try {
  /* E098-01 — Estampille de contrat de version : le test sait quelle
       génération d'instrumentation est active avant toute assertion. */
    field.setAttribute('data-v2e098-schema', 'v2.0.0');
    field.setAttribute('data-v2e098-generation', 'seconde-passe');
    field.setAttribute('data-v2e098-layers',
      layers.map(([kind, list]) => `${kind}:${list.length}`).join('|'));

  /* E098-02 — Empreinte de structure logique (djb2 32 bits) : suite ordonnée
       des types et de l'activation, sans coordonnées. Algorithme et objet
       différents de l'empreinte géométrique FNV-1a de la passe 1. */
    const structureOf = list => {
      let acc = 5381;
      list.forEach((node) => {
        const chaine = kindOf(node) + (isActive(node) ? '1' : '0');
        for (let i = 0; i < chaine.length; i += 1) {
          acc = (((acc * 33) ^ chaine.charCodeAt(i)) >>> 0);
        }
      });
      return acc.toString(36).toUpperCase();
    };
    field.setAttribute('data-v2e098-structure', structureOf(nodes));

  /* E098-03 — Ancrage de focus exposé : la clé et le rang du dernier nœud
       focalisé sont publiés sur le champ pour vérifier la restauration du
       focus après un rendu complet. */
    let focusNode = null;
    const recallFocus = () => {
      const key = focusNode && typeof focusNode.getAttribute === 'function'
        ? (focusNode.getAttribute('data-const-key') || '') : '';
      const rank = focusNode ? nodes.indexOf(focusNode) + 1 : 0;
      field.setAttribute('data-v2e098-focus', key || 'aucun');
      field.setAttribute('data-v2e098-focus-rank', String(rank));
    };
    field.addEventListener('focusin', (event) => {
      const target = event && event.target;
      const node = target && target.nodeType === 1 && typeof target.closest === 'function'
        ? target.closest('[data-const-key]') : null;
      if (!node || !field.contains(node) || nodes.indexOf(node) < 0) return;
      focusNode = node;
      recallFocus();
    }, true);
    recallFocus();

  /* E098-04 — Garde d'unicité des clés DOM : deux nœuds partageant la même
       clé `data-const-key` sont signalés, car la restauration de focus devient
       alors ambiguë. */
    const seenKeys = new Set();
    let duplicates = 0;
    nodes.forEach((node) => {
      const key = node.getAttribute('data-const-key') || '';
      if (!key || seenKeys.has(key)) duplicates += 1;
      if (key) seenKeys.add(key);
      node.setAttribute('data-v2e098-key', key || 'sans-cle');
    });
    field.setAttribute('data-v2e098-keys', String(seenKeys.size));
    field.setAttribute('data-v2e098-keys-duplicate', String(duplicates));

  /* E098-05 — Score d'intégrité du rendu : cohérence entre couches, légende,
       état et nombre d'arêtes. Aucune mesure de mise en page coûteuse. */
    const note = layout.querySelector('.constellation-note');
    const stateNode = layout.querySelector('.constellation-state');
    const empty = field.querySelector('.constellation-empty');
    let integrity = 'ok';
    if (!note || !stateNode) integrity = 'degrade';
    if (nodes.length === 0 && !empty) integrity = 'degrade';
    if (edges.length > nodes.length * (nodes.length - 1) / 2) integrity = 'degrade';
    field.setAttribute('data-v2e098-integrite', integrity);
    field.setAttribute('data-v2e098-note', note ? 'presente' : 'absente');

  /* E098-06 — Snapshot JSON déterministe : la structure et l'activation sont
       sérialisées dans un fixture lisible, ordonné, reproductible d'un rendu à
       l'autre, sans dépendre du style calculé du navigateur. */
    const snapshot = nodes.map((node, index) => ({
      i: index + 1,
      k: kindOf(node).charAt(0),
      a: isActive(node) ? 1 : 0,
    }));
    field.setAttribute('data-v2e098-snapshot', JSON.stringify(snapshot));

  /* E098-07 — Budget de nœuds : garde de performance déclarative. Un dépassement
       du plafond devient une assertion lisible au lieu d'une régression silencieuse. */
    const budget = 64;
    field.setAttribute('data-v2e098-budget', String(budget));
    field.setAttribute('data-v2e098-budget-used', String(nodes.length));
    field.setAttribute('data-v2e098-budget-state',
      nodes.length <= budget ? 'ok' : 'depasse');

  /* E098-08 — Registre des régions live : dénombre les zones d'annonce déjà
       présentes et détecte les identifiants dupliqués qui brouilleraient les
       lecteurs d'écran. */
    const liveRegions = Array.from(layout.querySelectorAll('[role="status"],[aria-live]'));
    const seenIds = new Set();
    let liveDuplicates = 0;
    liveRegions.forEach((region) => {
      const id = region.id || 'sans-id';
      if (seenIds.has(id)) liveDuplicates += 1;
      seenIds.add(id);
    });
    field.setAttribute('data-v2e098-live', String(liveRegions.length));
    field.setAttribute('data-v2e098-live-duplicate', String(liveDuplicates));

  /* E098-09 — Contrat de libellé : la passe 1 vérifiait la présence d'une
       étiquette ; ici l'on vérifie son format selon la couche (Ère / Repère /
       Point), après normalisation des accents et de la casse. */
    let labelOk = 0;
    let labelBad = 0;
    nodes.forEach((node) => {
      const label = (node.getAttribute('aria-label') || node.title || '')
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const expected = kindOf(node);
      const ok = label.indexOf(expected) === 0;
      if (ok) labelOk += 1; else labelBad += 1;
      node.setAttribute('data-v2e098-label', ok ? 'ok' : 'atypique');
    });
    field.setAttribute('data-v2e098-label-ok', String(labelOk));
    field.setAttribute('data-v2e098-label-bad', String(labelBad));

  /* E098-10 — Panneau de diagnostic repliable : synthèse vivante, distincte
       du panneau statique de la passe 1. Le résumé est une cible native d'au
       moins 36 px, le détail montre le snapshot, et une région dédiée annonce
       chaque rafraîchissement sans minuteur ni sonde périodique. */
    if (!layout.querySelector('#v2e098-diag')) {
      const details = make('details', 'v2e098-diag', '');
      details.id = 'v2e098-diag';
      details.setAttribute('data-v2e098-tid', 'diagnostic');
      const summary = make('summary', 'v2e098-summary', 'Diagnostic V2 du champ d’étoiles');
      const body = make('div', 'v2e098-body', '');
      const status = make('p', 'v2e098-status', '');
      status.id = 'v2e098-status';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      const code = make('code', 'v2e098-json', '');
      body.appendChild(status);
      body.appendChild(code);
      details.appendChild(summary);
      details.appendChild(body);
      if (labelBad > 0 || duplicates > 0 || integrity !== 'ok') {
        details.classList.add('v2e098-alerte');
      }
      const ancre = layout.querySelector('.constellation-caption') || layout;
      ancre.appendChild(details);

      const refresh = () => {
        status.textContent = `Contrat ${field.getAttribute('data-v2e098-schema')}`
          + ` — structure ${field.getAttribute('data-v2e098-structure')}`
          + ` — nœuds ${nodes.length}/${field.getAttribute('data-v2e098-budget')}`
          + ` (${field.getAttribute('data-v2e098-budget-state')})`
          + ` — intégrité ${field.getAttribute('data-v2e098-integrite')}`
          + ` — clés dupliquées ${field.getAttribute('data-v2e098-keys-duplicate')}`
          + ` — libellés atypiques ${labelBad}`
          + ` — focus ${field.getAttribute('data-v2e098-focus')}`;
        code.textContent = field.getAttribute('data-v2e098-snapshot') || '[]';
      };
      refresh();
      field.addEventListener('click', refresh, true);
      field.addEventListener('focusin', refresh, true);
    }
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
