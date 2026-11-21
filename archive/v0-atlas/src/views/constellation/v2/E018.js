import { register } from './registry.js';

/* Lentille V2 E018 — instrumentation E2E des planètes, seconde passe.
   Dix chantiers inédits, tous déterministes et locaux au rendu courant :
   aucun appel réseau, aucune source aléatoire, aucune sortie de débogage,
   aucun minuteur ni boucle d'animation propre. Préfixe exclusif : v2e018. */
register('E018', ctx => {
  /* Garde d'entrée : sans layout exploitable, la lentille ne touche à rien. */
  if (!ctx || !ctx.layout || typeof ctx.layout.appendChild !== 'function'
      || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;
  const doc = layout.ownerDocument || document;

  /* Feuille unique de la lentille, installée une seule fois par cssOnce. */
  css('constellation-v2-e018', `
.v2e018-panel{margin-top:12px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02);font-size:9px;color:var(--muted)}
.v2e018-title{margin:0 0 6px;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--gold)}
.v2e018-line{margin:2px 0;font-variant-numeric:tabular-nums;line-height:1.5}
.v2e018-list{margin:4px 0 6px;padding-left:16px;line-height:1.5}
.v2e018-list li{font-variant-numeric:tabular-nums}
.v2e018-ok::before{content:'OK · ';color:var(--gold);font-weight:700}
.v2e018-ko::before{content:'À VOIR · ';color:var(--violet);font-weight:700}
.const-planet[data-v2e018-focused="true"]{outline:2px dashed var(--gold-bright);outline-offset:2px}
.v2e018-reset{min-height:36px;padding:0 12px;margin-top:8px;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;cursor:pointer}
.v2e018-reset:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px}
.v2e018-still *{transition:none!important}
@media (prefers-reduced-motion: reduce){.v2e018-panel *{transition:none!important}}
`);

  /* Aides locales, tolérantes à un document ou un contexte incomplet. */
  const fabriquer = (tag, cls, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, cls, text);
    const n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const cleDe = (noeud, i) => String((noeud && noeud.dataset && noeud.dataset.constKey)
    || `planet:${i + 1}`);
  const nettoyer = (valeur) => String(valeur).replace(/^planet:/, '').replace(/[^0-9a-zA-Z_-]/g, '-');
  const plusProche = (noeud, classe) => {
    let courant = noeud;
    while (courant && typeof courant === 'object') {
      if (courant.classList && typeof courant.classList.contains === 'function'
          && courant.classList.contains(classe)) return courant;
      courant = courant.parentNode;
    }
    return null;
  };
  const positionDe = (noeud) => {
    try {
      const brutX = noeud.style && noeud.style.getPropertyValue
        ? noeud.style.getPropertyValue('--x') : '';
      const brutY = noeud.style && noeud.style.getPropertyValue
        ? noeud.style.getPropertyValue('--y') : '';
      return { x: parseFloat(brutX), y: parseFloat(brutY), brut: `${brutX}|${brutY}` };
    } catch (_) { return { x: NaN, y: NaN, brut: 'n/a' }; }
  };
  const empreinte = (texte) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < texte.length; i += 1) {
      h ^= texte.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
  };
  const mouvementReduit = () => {
    try { return typeof ctx.reducedMotion === 'function' && !!ctx.reducedMotion(); }
    catch (_) { return false; }
  };

  const field = layout.querySelector('.constellation-field');
  const planets = Array.prototype.slice.call(layout.querySelectorAll('.const-planet'));

  /* Panneau V2 — racine visuelle unique, distincte de la passe 1. */
  const ancien = doc.getElementById('v2e018-panel');
  if (ancien && layout.contains(ancien) && ancien.parentNode) ancien.parentNode.removeChild(ancien);
  const panneau = fabriquer('section', 'v2e018-panel');
  panneau.id = 'v2e018-panel';
  panneau.setAttribute('aria-label', 'Instrumentation E2E avancée des planètes');
  panneau.appendChild(fabriquer('h3', 'v2e018-title', 'Instrumentation E2E · seconde passe'));
  layout.appendChild(panneau);

  /* E018-01 — Registre d'identité stable entre rendus, sans horloge ni aléa. */
  const REG = '__v2e018_registry';
  if (typeof window !== 'undefined' && !window[REG]) window[REG] = { suite: 0, vus: {} };
  const registre = (typeof window !== 'undefined' && window[REG]) || { suite: 0, vus: {} };
  planets.forEach((planet, i) => {
    const cle = cleDe(planet, i);
    if (!Object.prototype.hasOwnProperty.call(registre.vus, cle)) {
      registre.suite += 1;
      registre.vus[cle] = { ordre: registre.suite, vues: 0 };
    }
    registre.vus[cle].vues += 1;
    planet.setAttribute('data-v2e018-id', `${nettoyer(cle)}:${registre.vus[cle].ordre}`);
    planet.setAttribute('data-v2e018-vues', String(registre.vus[cle].vues));
  });
  panneau.setAttribute('data-v2e018-identites', String(registre.suite));
  const ligneIdentite = fabriquer('p', 'v2e018-line', `Identités suivies : ${registre.suite}`);
  ligneIdentite.id = 'v2e018-identity';
  panneau.appendChild(ligneIdentite);

  /* E018-02 — Empreinte FNV-1a déterministe de l'ensemble des clés triées. */
  const clesTriees = planets.map((planet, i) => cleDe(planet, i)).sort();
  const signature = empreinte(clesTriees.join('|'));
  panneau.setAttribute('data-v2e018-signature', signature);
  const ligneSignature = fabriquer('p', 'v2e018-line', `Empreinte de population : ${signature}`);
  ligneSignature.id = 'v2e018-signature';
  panneau.appendChild(ligneSignature);

  /* E018-03 — Comparaison des positions entre deux rendus consécutifs. */
  const POS = '__v2e018_positions';
  const precedentes = (typeof window !== 'undefined' && window[POS]) || {};
  const courantes = {};
  let derivees = 0;
  planets.forEach((planet, i) => {
    const cle = cleDe(planet, i);
    const pos = positionDe(planet);
    courantes[cle] = pos.brut;
    if (Number.isFinite(pos.x) && Number.isFinite(pos.y)
        && Object.prototype.hasOwnProperty.call(precedentes, cle)
        && precedentes[cle] !== pos.brut) derivees += 1;
    planet.setAttribute('data-v2e018-pos', pos.brut);
  });
  if (typeof window !== 'undefined') window[POS] = courantes;
  panneau.setAttribute('data-v2e018-drift', String(derivees));
  const ligneDerive = fabriquer('p', 'v2e018-line',
    `Positions ayant dérivé depuis le rendu précédent : ${derivees}`);
  ligneDerive.id = 'v2e018-drift';
  panneau.appendChild(ligneDerive);

  /* E018-04 — Audit d'accessibilité des boutons planètes, en texte et en attribut. */
  const listeA11y = fabriquer('ul', 'v2e018-list');
  listeA11y.id = 'v2e018-a11y';
  let a11yOk = 0;
  planets.forEach((planet, i) => {
    const libelle = planet.getAttribute('aria-label') || '';
    const nom = planet.getAttribute('data-label') || '';
    const estBouton = !!planet.tagName && String(planet.tagName).toLowerCase() === 'button';
    const tabOk = typeof planet.tabIndex !== 'number' || planet.tabIndex >= 0;
    const ok = estBouton && libelle.trim().length > 0 && nom.trim().length > 0 && tabOk;
    if (ok) a11yOk += 1;
    const item = fabriquer('li', ok ? 'v2e018-ok' : 'v2e018-ko',
      `${cleDe(planet, i)} : libellé, nom et portée clavier ${ok ? 'conformes' : 'à vérifier'}`);
    item.setAttribute('data-v2e018-a11y', ok ? 'ok' : 'a-voir');
    listeA11y.appendChild(item);
  });
  panneau.setAttribute('data-v2e018-a11y-score', `${a11yOk}/${planets.length}`);
  panneau.appendChild(listeA11y);

  /* E018-05 — Trace du dernier focus clavier posé sur une planète. */
  const ligneFocus = fabriquer('p', 'v2e018-line', 'Dernier focus observé : aucun.');
  ligneFocus.id = 'v2e018-focus';
  panneau.appendChild(ligneFocus);
  const couchePlanetes = field && field.querySelector('.const-layer-planets');
  const cibleFocus = couchePlanetes || field;
  if (cibleFocus && typeof cibleFocus.addEventListener === 'function') {
    cibleFocus.addEventListener('focusin', (event) => {
      try {
        const cible = plusProche(event && event.target, 'const-planet');
        if (!cible || !layout.contains(cible)) return;
        planets.forEach((planet) => planet.removeAttribute('data-v2e018-focused'));
        cible.setAttribute('data-v2e018-focused', 'true');
        const cle = cleDe(cible, planets.indexOf(cible));
        panneau.setAttribute('data-v2e018-lastfocus', nettoyer(cle));
        ligneFocus.textContent = `Dernier focus observé : ${cle}.`;
      } catch (_) { /* Suivi de focus tolérant. */ }
    });
  }

  /* E018-06 — Écart angulaire minimal : grandeur dérivée des positions. */
  const angles = [];
  planets.forEach((planet) => {
    const pos = positionDe(planet);
    if (Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      angles.push(Math.atan2(pos.y - 50, pos.x - 50));
    }
  });
  angles.sort((a, b) => a - b);
  let ecartMin = null;
  for (let i = 1; i < angles.length; i += 1) {
    const ecart = angles[i] - angles[i - 1];
    if (ecartMin === null || ecart < ecartMin) ecartMin = ecart;
  }
  if (angles.length > 1) {
    const fermeture = (angles[0] + 2 * Math.PI) - angles[angles.length - 1];
    if (fermeture < ecartMin) ecartMin = fermeture;
  }
  const degres = ecartMin === null ? 'n/a' : (ecartMin * 180 / Math.PI).toFixed(1);
  panneau.setAttribute('data-v2e018-mingap', String(degres));
  const ligneDisp = fabriquer('p', 'v2e018-line',
    `Écart angulaire minimal entre repères : ${degres}°`);
  ligneDisp.id = 'v2e018-dispersion';
  panneau.appendChild(ligneDisp);

  /* E018-07 — Étiquette décomposée en année et sujet, sans réécrire le libellé. */
  const listeEtiquettes = fabriquer('ul', 'v2e018-list');
  listeEtiquettes.id = 'v2e018-labels';
  planets.forEach((planet, i) => {
    const brut = (planet.getAttribute('data-label') || '').trim();
    const parties = brut.split('·');
    const annee = (parties[0] || '').trim();
    const sujet = (parties.slice(1).join('·') || '').trim();
    planet.setAttribute('data-v2e018-year', nettoyer(annee));
    planet.setAttribute('data-v2e018-topic', nettoyer(sujet).slice(0, 40));
    listeEtiquettes.appendChild(fabriquer('li', '',
      `${nettoyer(cleDe(planet, i))} → ${annee || 'sans année'} · ${sujet || 'sans sujet'}`));
  });
  panneau.appendChild(listeEtiquettes);

  /* E018-08 — Détecteur de collisions de clés et de sélecteurs de test. */
  const vus = {};
  const collisions = [];
  planets.forEach((planet, i) => {
    const jetons = [cleDe(planet, i)];
    const testid = planet.getAttribute('data-testid') || '';
    if (testid) jetons.push(`testid:${testid}`);
    jetons.forEach((jeton) => {
      if (Object.prototype.hasOwnProperty.call(vus, jeton)) collisions.push(jeton);
      else vus[jeton] = true;
    });
  });
  panneau.setAttribute('data-v2e018-collisions', String(collisions.length));
  const ligneCollision = fabriquer('p', 'v2e018-line', collisions.length
    ? `Collisions détectées : ${collisions.map(nettoyer).join(', ')}`
    : 'Aucune collision de clés ou de sélecteurs.');
  ligneCollision.id = 'v2e018-collisions';
  panneau.appendChild(ligneCollision);

  /* E018-09 — Bouton de remise à zéro de l'instrumentation V2 (≥ 36 px). */
  const ligneReset = fabriquer('p', 'v2e018-line', 'Prête.');
  ligneReset.id = 'v2e018-reset-state';
  panneau.appendChild(ligneReset);
  const bouton = fabriquer('button', 'v2e018-reset', 'Réinitialiser l’instrumentation V2');
  bouton.type = 'button';
  bouton.id = 'v2e018-reset';
  bouton.setAttribute('aria-label', 'Réinitialiser les marqueurs de l’instrumentation V2');
  bouton.addEventListener('click', () => {
    try {
      planets.forEach((planet) => {
        ['data-v2e018-id', 'data-v2e018-vues', 'data-v2e018-pos',
          'data-v2e018-year', 'data-v2e018-topic', 'data-v2e018-focused']
          .forEach((attr) => planet.removeAttribute(attr));
      });
      if (typeof window !== 'undefined') window[POS] = {};
      const resets = Number(panneau.getAttribute('data-v2e018-resets')) || 0;
      panneau.setAttribute('data-v2e018-resets', String(resets + 1));
      ligneReset.textContent = 'Instrumentation V2 réinitialisée : marqueurs effacés.';
    } catch (_) { ligneReset.textContent = 'Réinitialisation indisponible sur ce rendu.'; }
  });
  panneau.appendChild(bouton);

  /* E018-10 — Garde-fous V2 : mouvement réduit, préfixe exclusif, tolérance. */
  if (mouvementReduit()) panneau.classList.add('v2e018-still');
  else panneau.classList.remove('v2e018-still');
  panneau.setAttribute('data-v2e018-instrument', 'constellation-planets-v2');
  panneau.setAttribute('data-v2e018-planets', String(planets.length));
});
