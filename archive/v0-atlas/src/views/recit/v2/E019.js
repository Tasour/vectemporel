import { register } from './registry.js';

/* V2 lentille E019 — Chronométrie et fluidité de l'interface (vue Récit).
   Dix chantiers V2 NEUFS, distincts de ceux de la passe 1 (qui couvrait le
   couplage reduced-motion global, le fondu directionnel du point, la transition
   de la barre, l'indicateur de sens, le scrollIntoView du fil, le retour :active,
   le pivot de l'icône de lecture, le chevron de traçabilité, l'entrée de l'image
   et le témoin binaire). Ici : tempo dérivé de la lecture, cascade du fil,
   soulignage du point courant, reprise du statut de filtre, entrée de la puce de
   certitude, rail de jalons, réactivité des filtres, glissement des flèches,
   halo de recherche et témoin de cadence.
   Chaque chiffre est lu dans le DOM réel. Tout est additif et non destructif :
   sans ce module la vue reste intégralement lisible et navigable.
   Préfixes : classes recit-v2-e019-, ids DOM v2-e019-, propriété --v2-e019-*.
   Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E019-01 — Tempo de transition dérivé de la durée de lecture annoncée. */
.recit-layout .recit-v2-e019-corps{--v2-e019-t:calc(var(--v2-e019-tempo,1)*.3s)}

/* E019-02 — Cascade d'entrée des points du fil (décalage lu sur l'index DOM). */
.recit-layout .recit-v2-e019-fil-item{animation:recit-v2-e019-fil-in calc(var(--v2-e019-tempo,1)*.28s) ease-out both;animation-delay:calc(var(--v2-e019-i,0)*30ms)}
@keyframes recit-v2-e019-fil-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* E019-03 — Soulignage animé du point courant dans le fil. */
.recit-layout .recit-v2-e019-courant .recit-thread-item.is-current{position:relative}
.recit-layout .recit-v2-e019-courant .recit-thread-item.is-current::after{content:"";position:absolute;left:8px;right:8px;bottom:3px;height:2px;border-radius:2px;background:var(--gold-bright);transform:scaleX(0);transform-origin:left center;animation:recit-v2-e019-souligne calc(var(--v2-e019-tempo,1)*.45s) ease-out forwards}
@keyframes recit-v2-e019-souligne{to{transform:scaleX(1)}}

/* E019-04 — Reprise animée du statut de filtrage quand son texte change. */
.recit-layout .recit-v2-e019-statut-change{animation:recit-v2-e019-statut-in calc(var(--v2-e019-tempo,1)*.32s) ease-out 1}
@keyframes recit-v2-e019-statut-in{from{opacity:.35;transform:translateX(-4px)}to{opacity:1;transform:none}}

/* E019-05 — Entrée de la puce de certitude (même cible, autre geste que la passe 1). */
.recit-layout .recit-v2-e019-conf-anime{animation:recit-v2-e019-conf-in calc(var(--v2-e019-tempo,1)*.38s) ease-out 1}
@keyframes recit-v2-e019-conf-in{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:none}}

/* E019-06 — Rail de jalons segmenté ; le nombre de segments vient du kicker. */
.recit-v2-e019-jalons{display:flex;flex-wrap:wrap;align-items:center;gap:4px;margin:6px 0 2px;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e019-jalon{width:12px;height:3px;border-radius:2px;background:var(--line-strong);transition:background-color calc(var(--v2-e019-tempo,1)*.3s) ease}
.recit-v2-e019-jalon.est-actif{background:var(--gold)}
.recit-v2-e019-jalon.est-courant{animation:recit-v2-e019-jalon-pulse calc(var(--v2-e019-tempo,1)*.9s) ease-in-out 2 alternate}
@keyframes recit-v2-e019-jalon-pulse{from{opacity:.45;transform:scaleY(1)}to{opacity:1;transform:scaleY(1.8)}}

/* E019-07 — Réactivité des filtres actifs au survol (le :active est à la passe 1). */
.recit-layout .recit-v2-e019-filtres .c3a-filter{transition:transform calc(var(--v2-e019-tempo,1)*.18s) ease,box-shadow calc(var(--v2-e019-tempo,1)*.18s) ease}
.recit-layout .recit-v2-e019-filtres .c3a-filter[aria-pressed="true"]:hover{transform:translateY(-1px);box-shadow:0 2px 0 -1px var(--gold-bright)}

/* E019-08 — Glissement directionnel des flèches de commande au survol. */
.recit-layout .recit-v2-e019-nav .recit-actions button{transition:transform calc(var(--v2-e019-tempo,1)*.2s) ease}
.recit-layout .recit-v2-e019-nav .recit-actions button[aria-keyshortcuts="ArrowLeft"]:hover{transform:translateX(-3px)}
.recit-layout .recit-v2-e019-nav .recit-actions button[aria-keyshortcuts="ArrowRight"]:hover{transform:translateX(3px)}

/* E019-09 — Halo de focus du champ de recherche, croissant en douceur. */
.recit-layout .c3a-search{transition:box-shadow calc(var(--v2-e019-tempo,1)*.25s) ease,background-color calc(var(--v2-e019-tempo,1)*.25s) ease}
.recit-layout .c3a-search:focus{box-shadow:0 0 0 2px var(--gold-bright);background-color:rgba(230,185,111,.06)}

/* E019-10 — Témoin de cadence et coupe-circuit mouvement réduit (propre à la V2). */
.recit-v2-e019-cadence{margin:6px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-style:italic;font-variant-numeric:tabular-nums}
.recit-layout[data-v2-e019-motion="reduce"] .recit-v2-e019-fil-item,
.recit-layout[data-v2-e019-motion="reduce"] .recit-v2-e019-statut-change,
.recit-layout[data-v2-e019-motion="reduce"] .recit-v2-e019-conf-anime,
.recit-layout[data-v2-e019-motion="reduce"] .recit-v2-e019-jalon,
.recit-layout[data-v2-e019-motion="reduce"] .recit-v2-e019-courant .recit-thread-item.is-current::after,
.recit-layout[data-v2-e019-motion="reduce"] .recit-v2-e019-filtres .c3a-filter,
.recit-layout[data-v2-e019-motion="reduce"] .recit-actions button,
.recit-layout[data-v2-e019-motion="reduce"] .c3a-search{animation:none!important;transition:none!important;transform:none!important}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e019-fil-item,.recit-v2-e019-statut-change,.recit-v2-e019-conf-anime,
  .recit-v2-e019-jalon,.recit-v2-e019-courant .recit-thread-item.is-current::after,
  .recit-v2-e019-filtres .c3a-filter,.recit-actions button,.c3a-search{animation:none!important;transition:none!important;transform:none!important}
}
`;

/* Mémoire inter-rendus : le statut de filtrage est comparé au rendu précédent.
   La coque reconstruisant le DOM à chaque `set`, ce module survit, comme
   `c3aLocal` dans recit.js. */
let dernierStatut = null;

function cree(tag, classe, texte) {
  const noeud = document.createElement(tag);
  if (classe) noeud.className = classe;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
}

/* Ajoute un jeton de classe sans jamais écraser les classes existantes. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Dépose (ou réutilise) un nœud visible, en retirant d'éventuels doublons d'id.
   Le nœud est toujours imbriqué dans .recit-body : il échappe ainsi au marquage
   diagnostic de _diagnostics.js:72 qui cible seulement les enfants directs de
   body/stage/layout. */
function nodeUnique(id, tag, classe, parent, ancre) {
  const trouves = document.querySelectorAll(`[id="${id}"]`);
  for (let i = 1; i < trouves.length; i += 1) {
    if (trouves[i].parentNode) trouves[i].parentNode.removeChild(trouves[i]);
  }
  let noeud = trouves[0];
  if (!noeud) {
    noeud = cree(tag, classe);
    noeud.id = id;
    if (ancre && ancre.parentNode === parent) parent.insertBefore(noeud, ancre.nextSibling);
    else parent.appendChild(noeud);
  }
  return noeud;
}

/* Secondes réelles annoncées par « Lecture estimée : ≈ N s · … » (recit.js:293). */
function lireSecondes(timing) {
  if (!timing) return null;
  const trouve = /(≈|~)\s*(\d+)\s*s/i.exec(timing.textContent || '');
  return trouve ? parseInt(trove[2], 10) : null;
}

/* Position lue depuis « Étape i / n · kind » avec repli sur les items du fil. */
function lireEtapes(kicker, corps) {
  const trouve = kicker && /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(kicker.textContent || '');
  if (trouve) return { i: Math.max(0, Number(trouve[1])), n: Math.max(0, Number(trouve[2])) };
  const thread = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
  const n = thread ? thread.querySelectorAll('.recit-thread-item').length : 0;
  return { i: n ? 1 : 0, n };
}

register('E019', (ctx) => {
  try {
    const { layout, css, reducedMotion } = ctx;
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e019', CSS);
    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const timing = corps.querySelector('.recit-timing');
    const kicker = corps.querySelector('.view-kicker');
    const secondes = lireSecondes(timing);
    const etapes = lireEtapes(kicker, corps);
    const tempo = secondes === null
      ? 1
      : Math.max(0.85, Math.min(1.5, 1 + (secondes - 8) / 40));

    /* E019-01 — tempo publié sur la coque : toutes les durées CSS en découlent. */
    layout.style.setProperty('--v2-e019-tempo', tempo.toFixed(2));
    ajouteClasse(corps, 'recit-v2-e019-corps');

    /* E019-02 — décalage de cascade indexé sur la position réelle dans le fil. */
    const thread = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    if (thread) {
      const items = thread.querySelectorAll('.recit-thread-item');
      Array.prototype.forEach.call(items, (item, i) => {
        item.style.setProperty('--v2-e019-i', String(Math.min(i, 20)));
        ajouteClasse(item, 'recit-v2-e019-fil-item');
      });
    }

    /* E019-03 — le soulignage du point courant est porté par une classe de portée. */
    ajouteClasse(corps, 'recit-v2-e019-courant');

    /* E019-04 — rejeu de l'animation seulement quand le texte du statut change. */
    const statut = document.getElementById('c3a-status') || corps.querySelector('.c3a-status');
    if (statut) {
      const texte = statut.textContent || '';
      if (dernierStatut !== null && texte !== dernierStatut) {
        statut.classList.remove('recit-v2-e019-statut-change');
        void statut.offsetWidth; /* reflow local : rejoue l'animation, sans minuteur. */
        statut.classList.add('recit-v2-e019-statut-change');
      }
      dernierStatut = texte;
    }

    /* E019-05 — la puce de certitude est marquée sans toucher à son title. */
    ajouteClasse(corps.querySelector('.recit-conf'), 'recit-v2-e019-conf-anime');

    /* E019-06 — rail segmenté : N graduations, les i premières actives. */
    if (etapes.n > 0 && kicker) {
      const rail = nodeUnique('v2-e019-jalons', 'p', 'recit-v2-e019-jalons', corps, kicker);
      rail.textContent = '';
      const fragments = document.createDocumentFragment();
      const total = Math.min(etapes.n, 40);
      for (let j = 0; j < total; j += 1) {
        const classe = `recit-v2-e019-jalon${j < etapes.i ? ' est-actif' : ''}${j === etapes.i - 1 ? ' est-courant' : ''}`;
        const graduation = cree('span', classe);
        graduation.setAttribute('aria-hidden', 'true');
        fragments.appendChild(graduation);
      }
      fragments.appendChild(document.createTextNode(` Jalon ${etapes.i} / ${etapes.n}`));
      rail.appendChild(fragments);
    }

    /* E019-07 — portée de la réactivité des filtres (attribut aria-pressed existant). */
    ajouteClasse(corps, 'recit-v2-e019-filtres');

    /* E019-08 — portée du glissement des flèches (aria-keyshortcuts posé par la vue). */
    ajouteClasse(corps, 'recit-v2-e019-nav');

    /* E019-09 — le halo de recherche est purement CSS, ciblé sur .c3a-search :
       aucun attribut du champ n'est modifié (aria-label/aria-controls intacts). */

    /* E019-10 — état mouvement + témoin de cadence, tous deux dérivés du DOM. */
    let reduce = false;
    try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduce = false; }
    layout.dataset.v2E019Motion = reduce ? 'reduce' : 'full';

    const legend = corps.querySelector('.recit-legend') || corps;
    const cadence = nodeUnique('v2-e019-cadence', 'p', 'recit-v2-e019-cadence', legend);
    cadence.textContent = `Cadence V2 : transitions à ×${tempo.toFixed(2)}`
      + (secondes === null ? '' : ` pour ≈${secondes} s de lecture`)
      + ` · ${etapes.n} jalon${etapes.n > 1 ? 's' : ''} · 10 chantiers · `
      + `${reduce ? 'mouvement réduit (réglage système)' : 'mouvement animé (réglage système)'}.`;

    layout.dataset.v2E019Chantiers = '10';
    const ids = ['v2-e019-jalons', 'v2-e019-cadence'];
    const uniques = ids.every((id) => document.querySelectorAll(`[id="${id}"]`).length <= 1);
    layout.dataset.v2E019Unique = uniques ? '1' : '0';
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
