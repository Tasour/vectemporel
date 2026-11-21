import { register } from './registry.js';

/* Lentille V2 E006 — gestion de l'état appliquée aux soleils (ères) de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sous
   le préfixe exclusif v2e006 (aucun identifiant partagé avec la passe 1).
   Zéro réseau, zéro source aléatoire, zéro
   minuteur ni boucle d'animation propre, aucune journalisation d'erreur. */

/* État local du module : déterministe, conservé entre les rendus successifs. */
let lastSignature = null;   // signature active vue par l'horloge logique
let seenKeys = null;        // clés du rendu précédent, pour le diff d'état
let previousActive = null;  // drapeaux actifs du rendu précédent, pour le diff
let tick = 0;               // horloge logique monotone (compteur de Lamport local)
let lastHealth = null;      // dernier état de santé, pour l'alerte par front
let observerHooked = false; // garde d'enregistrement de l'observateur d'attributs
const cache = new Map();          // mémoïsation bornée (file FIFO)
const CACHE_MAX = 32;
const scopeStates = new Map();    // état rangé par identifiant de vue
const STATUS_ID = 'v2e006-status';

const CSS = `
.constellation-layout #${STATUS_ID}{
  margin:8px 0 0;padding:5px 8px;border:1px solid var(--line);border-radius:6px;
  color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;
}
.constellation-layout [data-v2e006-diff],
.constellation-layout [data-v2e006-tick]{font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion: reduce){
  .constellation-layout #${STATUS_ID}{transition:none}
}`;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch (erreur) { /* silence voulu : aucune écriture dans la console */ }
}

/* Réduction Unicode déterministe : minuscules et accents retirés (NFD). */
function canonique(valeur) {
  return String(valeur == null ? '' : valeur)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/* Clé canonique d'un libellé : suite de segments alphanumériques séparés par « - ». */
function slug(valeur) {
  return canonique(valeur).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/* Coordonnée bornée à [0,100] ; une valeur invalide reste NaN et est ignorée. */
function borne(valeur) {
  const nombre = parseFloat(valeur);
  return Number.isFinite(nombre) ? Math.min(100, Math.max(0, nombre)) : NaN;
}

/* Lecture unique des soleils : type normalisé, aucune mutation de la vue. */
function readSuns(layout) {
  const noeuds = layout.querySelectorAll('.const-sun');
  return Array.prototype.map.call(noeuds, (noeud, index) => {
    const libelle = noeud.getAttribute('aria-label') || noeud.dataset.label
      || noeud.textContent || '';
    return {
      noeud,
      index,
      cle: noeud.dataset.constKey || `soleil:${index}`,
      libelle: String(libelle).trim(),
      x: borne(noeud.style.getPropertyValue('--x')),
      y: borne(noeud.style.getPropertyValue('--y')),
      actif: noeud.classList.contains('is-active')
        || noeud.getAttribute('aria-current') === 'true',
    };
  });
}

register('E006', ctx => {
  /* Garde d'entrée : aucun ajout DOM sans layout exploitable ni feuille CSS. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function' || typeof ctx.layout.querySelectorAll !== 'function') return;
  const layout = ctx.layout;
  const viewId = typeof ctx.viewId === 'string' && ctx.viewId ? ctx.viewId : 'constellationv2';

  safe(() => css('constellation-v2-e006', CSS));

  const soleils = readSuns(layout);
  const actifs = soleils.filter(soleil => soleil.actif);
  const cleActive = actifs.length === 1 ? actifs[0].cle : null;
  const signature = `${soleils.length}|${cleActive === null ? '-' : cleActive}`;

  /* E006-01 — Horloge logique de mutation : compteur monotone incrémenté
     uniquement quand la signature active change, sans horloge murale. */
  safe(() => {
    if (lastSignature !== null && lastSignature !== signature) tick += 1;
    lastSignature = signature;
    layout.dataset.v2e006Tick = String(tick);
  });

  /* E006-02 — Diff d'état : clés ajoutées, retirées et drapeaux actifs
     basculés depuis le rendu précédent, sous forme compacte. */
  safe(() => {
    const courantes = new Set(soleils.map(soleil => soleil.cle));
    const drapeaux = new Map(soleils.map(soleil => [soleil.cle, soleil.actif]));
    let ajoutees = 0;
    let retirees = 0;
    let basculees = 0;
    if (seenKeys !== null) {
      courantes.forEach(cle => { if (!seenKeys.has(cle)) ajoutees += 1; });
      seenKeys.forEach(cle => { if (!courantes.has(cle)) retirees += 1; });
    }
    if (previousActive !== null) {
      drapeaux.forEach((actif, cle) => {
        if (previousActive.has(cle) && previousActive.get(cle) !== actif) basculees += 1;
      });
    }
    seenKeys = courantes;
    previousActive = drapeaux;
    layout.dataset.v2e006Diff = `a:${ajoutees},r:${retirees},f:${basculees}`;
  });

  /* E006-03 — Validation d'invariants : clés uniques, coordonnées finies,
     libellés non vides et unicité du soleil actif, notés sur quatre. */
  let sante = 0;
  safe(() => {
    const clesUniques = new Set(soleils.map(soleil => soleil.cle)).size === soleils.length;
    const coordonneesFines = soleils.every(soleil =>
      Number.isFinite(soleil.x) && Number.isFinite(soleil.y));
    const libellesPleins = soleils.every(soleil => soleil.libelle.length > 0);
    const actifUnique = actifs.length <= 1;
    sante = [clesUniques, coordonneesFines, libellesPleins, actifUnique]
      .filter(Boolean).length;
    layout.dataset.v2e006Valid = String(sante);
    layout.dataset.v2e006Invariants =
      `u:${clesUniques ? 1 : 0},c:${coordonneesFines ? 1 : 0},` +
      `l:${libellesPleins ? 1 : 0},a:${actifUnique ? 1 : 0}`;
  });

  /* E006-04 — Normalisation typée : chaque soleil reçoit une clé canonique
     et des coordonnées arrondies, sans altérer les styles posés par la vue. */
  safe(() => {
    const cles = [];
    soleils.forEach(soleil => {
      const identifiant = slug(soleil.libelle || soleil.cle) || soleil.cle;
      soleil.noeud.dataset.v2e006Slug = identifiant;
      if (Number.isFinite(soleil.x)) {
        soleil.noeud.dataset.v2e006X = String(Math.round(soleil.x));
      }
      if (Number.isFinite(soleil.y)) {
        soleil.noeud.dataset.v2e006Y = String(Math.round(soleil.y));
      }
      cles.push(identifiant);
    });
    layout.dataset.v2e006Schema = cles.join('|') || 'vide';
  });

  /* E006-05 — Mémoïsation de sélecteurs : résultat dérivé mis en cache par
     signature, avec une file FIFO bornée (aucune croissance non liée). */
  safe(() => {
    const present = cache.has(signature);
    if (!present) {
      cache.set(signature, `${cleActive || 'aucun'}@${soleils.length}`);
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
    }
    layout.dataset.v2e006Cache = present ? 'hit' : 'miss';
    layout.dataset.v2e006CacheSize = String(cache.size);
  });

  /* E006-06 — Isolation par vue : l'état V2 est rangé par viewId pour qu'une
     autre vue partageant le module ne réutilise pas la signature courante. */
  safe(() => {
    const precedente = scopeStates.get(viewId);
    scopeStates.set(viewId, signature);
    layout.dataset.v2e006Scope = viewId;
    layout.dataset.v2e006ScopeChanged = precedente === undefined
      ? 'initial' : precedente === signature ? 'stable' : 'modifie';
  });

  /* E006-07 — Instantané immuable : gel (Object.freeze) de l'état courant,
     publié sous une clé de fenêtre dédiée, sans setter ni mutation future. */
  safe(() => {
    if (typeof window === 'undefined') return;
    window.__v2e006_snapshot = Object.freeze({
      vue: viewId,
      signature,
      tick,
      soleils: Object.freeze(soleils.map(soleil => Object.freeze({
        cle: soleil.cle,
        rang: soleil.index,
        actif: soleil.actif,
        slug: soleil.noeud.dataset.v2e006Slug || '',
      }))),
    });
    layout.dataset.v2e006Frozen = '1';
  });

  /* E006-08 — Observateur d'attributs (MutationObserver) : compte les
     changements de classe et de clé sur la couche des soleils, en lecture
     seule. Aucune écriture sur les nœuds observés : pas de boucle de retour. */
  safe(() => {
    if (typeof window === 'undefined' || typeof window.MutationObserver !== 'function') return;
    const couche = layout.querySelector('.const-layer-suns') || layout;
    if (!observerHooked) {
      observerHooked = true;
      const compteur = { n: 0 };
      window.__v2e006_mutations = compteur;
      const observateur = new window.MutationObserver(enregistrements => {
        compteur.n += enregistrements.length;
      });
      observateur.observe(couche, {
        attributes: true,
        attributeFilter: ['class', 'data-const-key'],
        subtree: true,
      });
    }
    const compteur = window.__v2e006_mutations || { n: 0 };
    layout.dataset.v2e006Mutations = String(compteur.n);
  });

  /* E006-09 — Réconciliation d'ordre : compare l'ordre DOM des soleils à
     l'ordre canonique (slug croissant) et signale l'écart sans réordonner. */
  safe(() => {
    const ordre = soleils.map(soleil => soleil.noeud.dataset.v2e006Slug || soleil.cle);
    const trie = ordre.slice().sort();
    const aligne = ordre.every((cle, index) => cle === trie[index]);
    layout.dataset.v2e006Order = aligne ? 'canonique' : 'ecart';
    layout.dataset.v2e006OrderKeys = ordre.join('|') || 'vide';
  });

  /* E006-10 — Alerte de dérive : région live n'écrivant que lorsque la santé
     d'état change (déclenchement par front), à la différence du relevé continu
     de la passe 1. */
  let statut = null;
  safe(() => {
    statut = layout.querySelector(`#${STATUS_ID}`);
    if (!statut) {
      statut = typeof ctx.el === 'function'
        ? ctx.el('p', 'v2e006-status')
        : document.createElement('p');
      statut.id = STATUS_ID;
      statut.setAttribute('role', 'status');
      statut.setAttribute('aria-live', 'polite');
      statut.setAttribute('aria-atomic', 'true');
      layout.appendChild(statut);
    }
    const marque = `${sante}|${layout.dataset.v2e006Diff}|${layout.dataset.v2e006Order}`;
    if (marque !== lastHealth) {
      if (lastHealth !== null) {
        statut.textContent = sante < 4
          ? `État des ères dégradé : ${sante} invariant(s) valide(s) sur 4.`
          : `État des ères stable : ${layout.dataset.v2e006Diff}, ordre ${layout.dataset.v2e006Order}.`;
      }
      lastHealth = marque;
    }
  });
});
