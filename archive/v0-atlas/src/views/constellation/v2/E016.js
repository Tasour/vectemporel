import { register } from './registry.js';

/* Lentille V2 E016 — Gestion de l'état des planètes de la vue Constellation.
   Seconde passe : dix chantiers inédits, tous implémentés, sans réseau ni
   source aléatoire, sans minuteur ni boucle d'animation propre. */

/* Mémoire inter-rendus : le shell reconstruit tout le DOM à chaque passe. */
let clesPrecedentes = null;
let journal = [];
let sequence = 0;
let derniereSource = 'inconnu';

register('E016', ctx => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelectorAll !== 'function') return;

  const safe = fn => { try { return fn(); } catch { return null; } };
  const entier = v => { const n = parseFloat(v); return Number.isFinite(n) ? Math.round(n) : 0; };
  const nombre = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const lire = (node, attr) => (node && typeof node.getAttribute === 'function')
    ? (node.getAttribute(attr) || '') : '';
  const poser = (node, attr, valeur) => {
    if (node && typeof node.setAttribute === 'function') node.setAttribute(attr, String(valeur));
  };
  const faire = typeof ctx.el === 'function'
    ? (tag, cls, txt) => ctx.el(tag, cls, txt)
    : (tag, cls, txt) => {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (txt !== undefined) n.textContent = txt;
        return n;
      };

  css('constellation-v2-e016', `
.v2e016-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout .const-planet:focus{outline:none}
.constellation-layout .const-planet:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.constellation-layout .const-planet[data-v2e016-roving="entree"]{box-shadow:0 0 0 2px rgba(230,185,111,.28)}
.v2e016-progress{display:block;margin:6px 0 0;height:6px;border:1px solid var(--line);border-radius:4px;background:rgba(255,255,255,.04);overflow:hidden}
.v2e016-progress>span{display:block;height:100%;width:0;background:var(--gold)}
#v2e016-compass{margin:8px 0 0;color:var(--gold);font-size:9px;line-height:1.5}
.v2e016-toggle{min-height:36px;padding:0 10px;margin:6px 6px 0 0;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--gold-bright);font-size:9px;cursor:pointer}
.v2e016-toggle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.v2e016-details{margin:6px 0 0;padding:6px 8px;border-left:2px solid var(--gold);color:var(--ink-soft);font-size:9px;line-height:1.5}
.v2e016-details[hidden]{display:none}
@media (prefers-reduced-motion: reduce){.v2e016-progress>span{transition:none}}
`);

  const planetes = Array.from(layout.querySelectorAll('.const-planet'));
  const couche = layout.querySelector('.const-layer-planets');
  const legende = layout.querySelector('.constellation-caption') || layout;
  poser(layout, 'data-v2e016-planets', String(planetes.length));

  let indexActif = planetes.findIndex(p => p.classList && p.classList.contains('is-active'));
  if (indexActif < 0) indexActif = planetes.findIndex(p => lire(p, 'aria-current') === 'true');

  /* E016-01 — Audit d'activation : dénombre les repères actifs et qualifie l'anomalie. */
  safe(() => {
    let actifs = 0;
    planetes.forEach(p => {
      const estActif = !!(p.classList && p.classList.contains('is-active'))
        || lire(p, 'aria-current') === 'true';
      if (estActif) actifs += 1;
      poser(p, 'data-v2e016-active', estActif ? '1' : '0');
    });
    const anomalie = actifs === 0 ? 'aucune' : (actifs > 1 ? 'multiple' : 'unique');
    poser(layout, 'data-v2e016-active-count', String(actifs));
    poser(layout, 'data-v2e016-active-anomaly', anomalie);
  });

  /* E016-02 — Détection de clés d'identification dupliquées entre planètes. */
  safe(() => {
    const compte = new Map();
    planetes.forEach(p => {
      const cle = lire(p, 'data-const-key') || lire(p, 'data-e016-key');
      if (cle) compte.set(cle, (compte.get(cle) || 0) + 1);
    });
    let doublons = 0;
    planetes.forEach(p => {
      const cle = lire(p, 'data-const-key') || lire(p, 'data-e016-key');
      const dup = !!cle && (compte.get(cle) || 0) > 1;
      poser(p, 'data-v2e016-dup', dup ? '1' : '0');
      if (dup) doublons += 1;
    });
    poser(layout, 'data-v2e016-dup-keys', String(doublons));
  });

  /* E016-03 — Diff d'appartenance entre deux rendus : clés ajoutées et retirées. */
  safe(() => {
    const cles = planetes.map((p, i) => lire(p, 'data-const-key')
      || lire(p, 'data-e016-key') || `planet:${i}`);
    const present = new Set(cles);
    const ajouts = clesPrecedentes === null ? [] : cles.filter(c => !clesPrecedentes.has(c));
    const retraits = clesPrecedentes === null ? [] : Array.from(clesPrecedentes).filter(c => !present.has(c));
    poser(layout, 'data-v2e016-added', ajouts.join(','));
    poser(layout, 'data-v2e016-removed', retraits.join(','));
    poser(layout, 'data-v2e016-added-count', String(ajouts.length));
    poser(layout, 'data-v2e016-removed-count', String(retraits.length));
    clesPrecedentes = present;
  });

  /* E016-04 — Voisinage circulaire du repère actif : prédécesseur et successeur. */
  safe(() => {
    if (indexActif < 0 || !planetes.length) return;
    const n = planetes.length;
    const prec = (indexActif - 1 + n) % n;
    const suiv = (indexActif + 1) % n;
    const cle = i => lire(planetes[i], 'data-const-key')
      || lire(planetes[i], 'data-e016-key') || `planet:${i}`;
    poser(planetes[indexActif], 'data-v2e016-neighbors', `${cle(prec)}|${cle(suiv)}`);
    poser(layout, 'data-v2e016-prev-key', cle(prec));
    poser(layout, 'data-v2e016-next-key', cle(suiv));
  });

  /* E016-05 — Repère de progression ordinal, textuel et lu par une barre ARIA. */
  safe(() => {
    const n = planetes.length;
    const rang = indexActif >= 0 ? indexActif + 1 : 0;
    const pct = n ? Math.round((rang / n) * 100) : 0;
    const libelle = `Repère actif : ${rang} sur ${n} (${pct} %)`;
    poser(layout, 'data-v2e016-progress', String(pct));
    poser(layout, 'data-v2e016-progress-label', libelle);
    let barre = layout.querySelector('#v2e016-progress');
    if (!barre) {
      barre = faire('span', 'v2e016-progress');
      barre.id = 'v2e016-progress';
      barre.appendChild(faire('span', ''));
      legende.appendChild(barre);
    }
    const remplissage = barre.firstElementChild;
    if (remplissage && remplissage.style) remplissage.style.width = `${pct}%`;
    barre.setAttribute('role', 'progressbar');
    barre.setAttribute('aria-valuemin', '0');
    barre.setAttribute('aria-valuemax', '100');
    barre.setAttribute('aria-valuenow', String(pct));
    barre.setAttribute('aria-valuetext', libelle);
  });

  /* E016-06 — Roving tabindex sur les planètes et mémorisation du repère focalisé. */
  safe(() => {
    planetes.forEach((p, i) => {
      if (typeof p.tabIndex !== 'number') return;
      p.tabIndex = i === indexActif ? 0 : -1;
      poser(p, 'data-v2e016-roving', i === indexActif ? 'entree' : 'interne');
    });
    if (!couche || typeof couche.addEventListener !== 'function') return;
    couche.addEventListener('focusin', evt => {
      const cible = evt && evt.target;
      const p = cible && cible.nodeType === 1 && typeof cible.closest === 'function'
        ? cible.closest('.const-planet') : null;
      if (!p || !couche.contains(p)) return;
      planetes.forEach(q => { if (q.removeAttribute) q.removeAttribute('data-v2e016-focused'); });
      poser(p, 'data-v2e016-focused', '1');
      poser(layout, 'data-v2e016-focus-key',
        lire(p, 'data-const-key') || lire(p, 'data-e016-key') || '');
    });
  });

  /* E016-07 — Traçabilité de la source du changement d'état (clic ou clavier). */
  safe(() => {
    if (!couche || typeof couche.addEventListener !== 'function') return;
    const origine = evt => {
      const cible = evt && evt.target;
      return cible && cible.nodeType === 1 && typeof cible.closest === 'function'
        ? cible.closest('.const-planet') : null;
    };
    couche.addEventListener('click', evt => {
      const p = origine(evt);
      if (!p || !couche.contains(p)) return;
      derniereSource = 'clic';
      poser(layout, 'data-v2e016-source', derniereSource);
      poser(p, 'data-v2e016-origin', 'clic');
    }, true);
    couche.addEventListener('keydown', evt => {
      if (!evt || !evt.key || (evt.key !== 'Enter' && evt.key !== ' ' && evt.key !== 'Spacebar')) return;
      const p = origine(evt);
      if (!p || !couche.contains(p)) return;
      derniereSource = 'clavier';
      poser(layout, 'data-v2e016-source', derniereSource);
      poser(p, 'data-v2e016-origin', 'clavier');
    }, true);
    poser(layout, 'data-v2e016-source', derniereSource);
  });

  /* E016-08 — Cartographie de dispersion : centroïde et distance de chaque planète. */
  safe(() => {
    if (!planetes.length) return;
    const points = planetes.map(p => ({
      p,
      x: nombre(p.style && p.style.getPropertyValue ? p.style.getPropertyValue('--x') : 0),
      y: nombre(p.style && p.style.getPropertyValue ? p.style.getPropertyValue('--y') : 0),
    }));
    const cx = points.reduce((s, o) => s + o.x, 0) / points.length;
    const cy = points.reduce((s, o) => s + o.y, 0) / points.length;
    let max = -1, min = Infinity, iMax = -1, iMin = -1;
    points.forEach((o, i) => {
      const d = Math.round(Math.sqrt((o.x - cx) ** 2 + (o.y - cy) ** 2));
      poser(o.p, 'data-v2e016-distance', String(d));
      if (d > max) { max = d; iMax = i; }
      if (d < min) { min = d; iMin = i; }
    });
    poser(layout, 'data-v2e016-centroid', `${Math.round(cx)},${Math.round(cy)}`);
    poser(layout, 'data-v2e016-spread', String(max));
    if (iMax >= 0) poser(planetes[iMax], 'data-v2e016-extreme', 'eloigne');
    if (iMin >= 0) poser(planetes[iMin], 'data-v2e016-extreme', 'proche');
  });

  /* E016-09 — Contrôle d'intégrité à trois voies, en lecture seule. */
  safe(() => {
    const incoherents = [];
    planetes.forEach((p, i) => {
      const classe = !!(p.classList && p.classList.contains('is-active'));
      const courant = lire(p, 'aria-current') === 'true';
      const coche = lire(p, 'aria-checked') === 'true';
      const instantane = lire(p, 'data-v2e016-active') === '1';
      const ok = classe === courant && classe === coche && classe === instantane;
      poser(p, 'data-v2e016-integrity', ok ? 'ok' : 'incoherent');
      if (!ok) incoherents.push(String(i + 1));
    });
    const verdict = incoherents.length ? 'incoherent' : 'ok';
    poser(layout, 'data-v2e016-integrity', verdict);
    poser(layout, 'data-v2e016-integrity-detail', incoherents.join(','));
  });

  /* E016-10 — Boussole d'état : journal borné et panneau live à bascule. */
  safe(() => {
    sequence += 1;
    const taille = clesPrecedentes ? clesPrecedentes.size : planetes.length;
    const integrite = lire(layout, 'data-v2e016-integrity') || 'inconnu';
    journal.push({ seq: sequence, signature: `${taille}:${indexActif}:${integrite}`, source: derniereSource });
    if (journal.length > 6) journal = journal.slice(-6);
    poser(layout, 'data-v2e016-journal',
      journal.map(e => `${e.seq}#${e.signature}@${e.source}`).join('|'));
    poser(layout, 'data-v2e016-journal-size', String(journal.length));

    if (!faire) return;
    let compass = layout.querySelector('#v2e016-compass');
    if (!compass) {
      compass = faire('p', 'v2e016-compass');
      compass.id = 'v2e016-compass';
      compass.setAttribute('role', 'status');
      compass.setAttribute('aria-live', 'polite');
      compass.setAttribute('aria-atomic', 'true');
      legende.appendChild(compass);
    }
    const anomalie = lire(layout, 'data-v2e016-active-anomaly') || 'inconnue';
    const pct = lire(layout, 'data-v2e016-progress') || '0';
    compass.textContent = `Boussole des planètes : activation ${anomalie}, intégrité ${integrite}, `
      + `progression ${pct} %, dernière source ${derniereSource}, `
      + `${journal.length} observation(s) conservée(s).`;

    let toggle = layout.querySelector('#v2e016-toggle');
    let details = layout.querySelector('#v2e016-details');
    if (!toggle) {
      toggle = faire('button', 'v2e016-toggle', 'Détails de l’état des planètes');
      toggle.id = 'v2e016-toggle';
      toggle.type = 'button';
      toggle.setAttribute('aria-controls', 'v2e016-details');
      toggle.setAttribute('aria-pressed', 'false');
      legende.appendChild(toggle);
    }
    if (!details) {
      details = faire('div', 'v2e016-details');
      details.id = 'v2e016-details';
      details.hidden = true;
      legende.appendChild(details);
    }
    details.textContent = `Journal (du plus ancien au plus récent) : `
      + `${journal.map(e => `${e.seq} — ${e.signature} — source ${e.source}`).join(' ; ')}.`;
    toggle.onclick = () => {
      if (!layout.isConnected) return;
      const ouvert = toggle.getAttribute('aria-pressed') !== 'true';
      toggle.setAttribute('aria-pressed', ouvert ? 'true' : 'false');
      details.hidden = !ouvert;
    };
  });
});
