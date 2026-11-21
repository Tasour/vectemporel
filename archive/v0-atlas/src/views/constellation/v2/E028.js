import { register } from './registry.js';

/* Lentille V2 E028 — contrat d'observabilité E2E des lunes de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e028 (aucune collision avec la passe 1). */
register('E028', ctx => {
  /* Garde d'entrée : sans layout rendu, la lentille ne touche à aucun DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (layout.nodeType !== 1 || typeof layout.querySelectorAll !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;

  const couche = layout.querySelector('.const-layer-moons');
  const moons = Array.from(layout.querySelectorAll('.const-moon'));

  /* Utilitaires locaux : lecture d'attribut, création d'élément et
     normalisation accents/casse pour des comparaisons deterministes. */
  const attr = (node, name) => (node && typeof node.getAttribute === 'function'
    ? (node.getAttribute(name) || '') : '');
  const creer = (tag, cls, text) => {
    if (typeof ctx.el === 'function') return ctx.el(tag, cls, text);
    const noeud = document.createElement(tag);
    if (cls) noeud.className = cls;
    if (text !== undefined) noeud.textContent = text;
    return noeud;
  };
  const normaliser = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  /* Guichet de contrat, commun aux chantiers 06 et 07 : un seul panneau par
     rendu, remplacé sans duplication, ancré dans la légende de la vue. */
  const precedent = layout.querySelector('#v2e028-guichet');
  if (precedent && precedent.parentNode) precedent.parentNode.removeChild(precedent);
  const guichet = creer('section', 'v2e028-guichet');
  guichet.id = 'v2e028-guichet';
  guichet.setAttribute('aria-labelledby', 'v2e028-titre');
  const titre = creer('h3', 'v2e028-titre', 'Contrat d’observabilité des lunes · V2');
  titre.id = 'v2e028-titre';
  guichet.appendChild(titre);
  const jauge = creer('div', 'v2e028-jauge');
  jauge.setAttribute('role', 'meter');
  jauge.setAttribute('aria-label', 'Complétude de l’instrumentation des lunes');
  jauge.setAttribute('aria-valuemin', '0');
  jauge.setAttribute('aria-valuemax', '100');
  guichet.appendChild(jauge);
  const statut = creer('p', 'v2e028-statut');
  statut.setAttribute('role', 'status');
  statut.setAttribute('aria-live', 'polite');
  statut.setAttribute('aria-atomic', 'true');
  guichet.appendChild(statut);
  guichet.appendChild(creer('p', 'v2e028-aide',
    `Requête d’état : dispatchEvent(new CustomEvent('v2e028:state-query', { bubbles: true })) sur la couche des lunes.`));
  const ancre = layout.querySelector('.constellation-caption') || couche || layout;
  ancre.appendChild(guichet);

  /* E028-01 — Audit du nom accessible : un nom stable est dérivé pour chaque
     lune (aria-label, sinon title, sinon data-label), normalisé sans accent,
     puis publié sur la lune et compté sur le layout. */
  const noms = moons.map(lune => normaliser(
    attr(lune, 'aria-label') || attr(lune, 'title') || attr(lune, 'data-label')));
  const nommes = noms.filter(Boolean).length;
  moons.forEach((lune, index) => {
    if (noms[index]) lune.dataset.v2e028Nom = noms[index];
  });
  layout.dataset.v2e028Noms = `${nommes}/${moons.length}`;

  /* E028-02 — Unicité des identifiants de test posés par la passe 1 : un
     harnais ne doit jamais cibler deux lunes avec le même data-testid. */
  const testids = moons.map(lune => attr(lune, 'data-testid'));
  const uniqTest = new Set(testids.filter(Boolean)).size;
  const testidsOK = testids.length > 0 && testids.every(Boolean) && uniqTest === testids.length;
  layout.dataset.v2e028Testids = testidsOK ? 'uniques' : 'a-revoir';

  /* E028-03 — Vecteur d'état compact : courant, couverture et dernier focus
     forment un jeton deterministe, distinct de la signature de contenu de
     la passe 1. Il est recalculé à chaque mutation instrumentée. */
  const etatJeton = () => {
    const courant = moons.findIndex(l => attr(l, 'aria-current') === 'true');
    const couvert = moons.filter(l => attr(l, 'data-e028-covered') === '1').length;
    const dernier = layout.dataset.v2e028DernierFocus || '-';
    return `courant:${courant < 0 ? '-' : courant}|couvert:${couvert}/${moons.length}|focus:${dernier}`;
  };
  layout.dataset.v2e028Etat = etatJeton();

  /* E028-04 — Sémantique ARIA de la couche : le groupe est nommé et décrit
     sans écraser l'identifiant posé par la passe 1 ni le contenu rendu. */
  if (couche) {
    couche.setAttribute('role', 'group');
    couche.setAttribute('aria-roledescription', 'groupe de lunes vérifiées');
    couche.setAttribute('aria-label',
      `${moons.length} lune${moons.length > 1 ? 's' : ''} vérifiable${moons.length > 1 ? 's' : ''}`);
    layout.dataset.v2e028Semantique = 'groupe';
  }

  /* E028-05 — Ancrage du dernier focus : la clé de la dernière lune atteinte
     est mémorisée, sans minuteur, pour rejouer un scénario pas à pas. */
  const marquerFocus = lune => {
    if (!lune) return;
    layout.dataset.v2e028DernierFocus = attr(lune, 'data-const-key') || '-';
    moons.forEach(l => l.classList.remove('v2e028-ancre'));
    lune.classList.add('v2e028-ancre');
    layout.dataset.v2e028Etat = etatJeton();
  };
  if (couche) {
    couche.addEventListener('focusin', event => {
      const cible = event && event.target;
      if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return;
      const lune = cible.closest('.const-moon');
      if (lune && couche.contains(lune)) marquerFocus(lune);
    });
  }

  /* E028-06 — Jauge de complétude : proportion de lunes dotées d'un nom
     accessible, d'un identifiant de test et d'un rang, exprimée en texte et
     en valeurs ARIA (jamais la seule couleur ne porte l'information). */
  const complet = moons.filter(lune => !!normaliser(
    attr(lune, 'aria-label') || attr(lune, 'title') || attr(lune, 'data-label'))
    && !!attr(lune, 'data-testid') && !!attr(lune, 'data-e028-ordre')).length;
  const pourcent = moons.length ? Math.round(complet * 100 / moons.length) : 0;
  jauge.setAttribute('aria-valuenow', String(pourcent));
  jauge.setAttribute('aria-valuetext',
    `${complet} lune(s) complètement instrumentée(s) sur ${moons.length}`);
  jauge.dataset.v2e028Valeur = String(pourcent);
  jauge.textContent = `Complétude ${pourcent} % — ${complet}/${moons.length}`;
  layout.dataset.v2e028Completude = `${pourcent}%`;

  /* E028-07 — Pont de requête d'état : un CustomEvent natif, distinct du pont
     de commande de la passe 1, renvoie le vecteur d'état dans la région de
     statut. Aucun minuteur, aucun réseau : le harnais garde la main. */
  if (couche) {
    couche.addEventListener('v2e028:state-query', () => {
      statut.textContent = `État V2 — ${etatJeton()}.`;
    });
    layout.dataset.v2e028Requete = '1';
  }

  /* E028-08 — Compteur de génération de rendu : incrémenté à chaque
     application de la lentille, mémorisé sous une clé window préfixée et
     publié sur le layout. Valeur deterministe : une par nombre de rendus. */
  const GEN_KEY = '__v2e028_gen';
  let generation = 0;
  if (typeof window !== 'undefined') {
    const lu = window[GEN_KEY];
    generation = (typeof lu === 'number' && Number.isFinite(lu)) ? lu + 1 : 1;
    window[GEN_KEY] = generation;
  }
  layout.dataset.v2e028Generation = String(generation);

  /* E028-09 — Empreinte de structure de la couche : nombre d'enfants, nombre
     de lunes et somme des longueurs de classes, résumés en une chaîne stable
     qui ne dépend d'aucune coordonnée ni d'aucun tirage. */
  const enfants = couche && couche.children ? couche.children.length : 0;
  const sommeClasses = moons.reduce((total, lune) =>
    total + String(lune.className || '').length, 0);
  layout.dataset.v2e028Structure = `${enfants}:${moons.length}:${sommeClasses}`;

  /* E028-10 — Contrôle de cohérence des rangs et synthèse : les rangs
     data-e028-ordre doivent être contigus de 0 à N-1 ; le verdict, le
     vecteur d'état et le résumé sont publiés en français. La préférence de
     mouvement réduit est relevée sans sonde propre. */
  const rangs = moons.map(lune => Number(attr(lune, 'data-e028-ordre')));
  const rangsOK = rangs.length > 0 && rangs.every((valeur, index) => valeur === index);
  layout.dataset.v2e028Rangs = rangsOK ? 'contigus' : 'incoherents';
  const verdict = testidsOK && nommes === moons.length && rangsOK
    ? 'contractuel' : 'incomplet';
  layout.dataset.v2e028Verdict = verdict;
  layout.classList.add('v2e028');
  layout.dataset.v2e028Etat = etatJeton();

  let reduit = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { reduit = !!ctx.reducedMotion(); } catch (erreur) { reduit = false; }
  }
  layout.dataset.v2e028Mouvement = reduit ? 'reduit' : 'complet';
  if (reduit) layout.classList.add('v2e028-sobre');
  else layout.classList.remove('v2e028-sobre');

  statut.textContent = `V2 · ${moons.length} lune(s) · noms ${layout.dataset.v2e028Noms} · `
    + `testids ${layout.dataset.v2e028Testids} · complétude ${pourcent} % · `
    + `rangs ${layout.dataset.v2e028Rangs} · génération ${generation} · `
    + `structure ${layout.dataset.v2e028Structure} · ${verdict}.`;

  css('constellation-v2-e028', `
.v2e028-guichet{
  margin:12px 0 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;
  background:var(--surface-2);color:var(--muted);font-family:inherit;
  font-size:9px;line-height:1.55;contain:layout style;
}
.v2e028-guichet .v2e028-titre{
  margin:0 0 6px;color:var(--gold);font-family:var(--serif);
  font-size:12px;font-weight:450;
}
.v2e028-guichet .v2e028-jauge{
  margin:0 0 6px;padding:3px 6px;border:1px solid var(--violet);border-radius:6px;
  color:var(--violet);font-variant-numeric:tabular-nums;
}
.v2e028-guichet .v2e028-statut{margin:0 0 4px;color:var(--ink-soft);}
.v2e028-guichet .v2e028-aide{margin:6px 0 0;color:var(--muted);font-size:8px;overflow-wrap:anywhere;}
.v2e028-guichet :focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;}
.constellation-layout .const-moon.v2e028-ancre{
  outline:2px dashed var(--gold);outline-offset:2px;
}
.v2e028-sobre .const-moon,.v2e028-sobre .v2e028-guichet{transition:none;}
@media (prefers-reduced-motion:reduce){
  .v2e028-guichet,.v2e028-guichet *{transition:none!important;animation:none!important;}
}
`);
});
