import { register } from './registry.js';

/*
 * Lentille E065 — adaptabilité responsive des métriques chiffrées de la vue
 * Constellation. Dix chantiers numérotés de 01 à 10, tous dans ce module :
 * aucun fichier partagé n'est modifié, aucune requête réseau, aucun tirage au
 * sort, aucun journal d'exécution et aucune boucle d'animation propre.
 */

const SELECTEUR = '.constellation-layout';

/* Un seul écouteur de redimensionnement, réappliqué sur la passe courante. */
let ecouteurPose = false;
let api = null;

function nombre(valeur, repli) {
  const n = parseFloat(valeur);
  return Number.isFinite(n) ? n : repli;
}

function borne(valeur, min, max) {
  return Math.max(min, Math.min(max, valeur));
}

function entier(valeur, repli) {
  const n = nombre(valeur, repli);
  return Number.isFinite(n) ? Math.round(n) : repli;
}

/* Signature FNV-1a : déterministe, sans graine aléatoire. */
function signature(texte) {
  let h = 0x811c9dc5;
  for (let i = 0; i < texte.length; i += 1) {
    h ^= texte.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function largeurUtile(layout) {
  let largeur = 0;
  try {
    if (typeof layout.getBoundingClientRect === 'function') {
      largeur = layout.getBoundingClientRect().width;
    }
  } catch {
    largeur = 0;
  }
  if (!Number.isFinite(largeur) || largeur <= 0) {
    largeur = typeof window !== 'undefined' && Number.isFinite(window.innerWidth)
      ? window.innerWidth
      : 1000;
  }
  return Math.max(0, Math.round(largeur));
}

function modeDe(largeur) {
  if (largeur < 620) return 'etroit';
  if (largeur < 1000) return 'moyen';
  if (largeur < 1500) return 'large';
  return 'tres-large';
}

/* Réutilise un nœud déjà posé, sinon le crée via le contrat ctx.el. */
function preparer(parent, id, tag, classe, texte) {
  const existant = parent.querySelector('#' + id);
  if (existant) return existant;
  let noeud = null;
  if (api && typeof api.el === 'function') {
    noeud = api.el(tag, classe, texte);
  } else {
    const doc = parent.ownerDocument || (typeof document !== 'undefined' ? document : null);
    if (doc && typeof doc.createElement === 'function') {
      noeud = doc.createElement(tag);
      if (classe) noeud.className = classe;
      if (texte !== undefined) noeud.textContent = texte;
    }
  }
  if (!noeud) return null;
  noeud.id = id;
  parent.appendChild(noeud);
  return noeud;
}

/* Chaque chantier est isolé : une métrique absente ne bloque pas les autres. */
function protege(chantier) {
  try {
    chantier();
  } catch {
    /* Chantier neutralisé, rendu nominal poursuivi. */
  }
}

function appliquer(layout) {
  const caption = layout.querySelector('.constellation-caption') || layout;
  const etat = layout.querySelector('.constellation-state');
  const champ = layout.querySelector('.constellation-field');
  const soleils = Array.prototype.slice.call(layout.querySelectorAll('.const-sun'));
  const planetes = Array.prototype.slice.call(layout.querySelectorAll('.const-planet'));
  const lunes = Array.prototype.slice.call(layout.querySelectorAll('.const-moon'));
  const traits = Array.prototype.slice.call(layout.querySelectorAll('.constellation-edges line'));
  const largeur = largeurUtile(layout);
  const mode = modeDe(largeur);

  /* E065-01 — Largeur utile mesurée et classe de mode déduite des seuils 620/1000/1500. */
  protege(() => {
    layout.setAttribute('data-e065', 'on');
    layout.setAttribute('data-e065-width', String(largeur));
    layout.setAttribute('data-e065-mode', mode);
    layout.style.setProperty('--e065-width', largeur + 'px');
  });

  /* E065-02 — Densité chiffrée en pastille, abrégée sur champ étroit. */
  protege(() => {
    const counts = [soleils.length, planetes.length, lunes.length, traits.length];
    layout.setAttribute('data-e065-counts', 'eres=' + counts[0] + ';reperes=' + counts[1]
      + ';points=' + counts[2] + ';traits=' + counts[3]);
    const texte = mode === 'etroit'
      ? counts.join('·')
      : counts[0] + ' ères · ' + counts[1] + ' repères · ' + counts[2] + ' points · ' + counts[3] + ' traits';
    const pastille = preparer(caption, 'e065-densite', 'span', 'e065-metric', texte);
    if (pastille) {
      pastille.textContent = texte;
      pastille.setAttribute('aria-label', 'Densité chiffrée : ' + texte);
    }
  });

  /* E065-03 — Progression « point x / y » lue dans l'état et jauge native. */
  protege(() => {
    const source = etat && etat.textContent ? etat.textContent : '';
    const found = /Point\s*:\s*(\d+)\s*\/\s*(\d+)/.exec(source);
    const rang = entier(found && found[1], 0);
    const total = entier(found && found[2], 0);
    const ratio = total > 0 ? borne(rang / total, 0, 1) : 0;
    layout.setAttribute('data-e065-point', rang + '/' + total);
    layout.style.setProperty('--e065-progress', ratio.toFixed(3));
    const barre = preparer(caption, 'e065-progress', 'progress', 'e065-barre', '');
    if (barre) {
      barre.max = total > 0 ? total : 1;
      barre.value = borne(rang, 0, total > 0 ? total : 1);
      barre.setAttribute('aria-label', 'Progression des points vérifiés');
      barre.setAttribute('aria-valuetext', 'Point ' + rang + ' sur ' + total);
    }
    const libelle = preparer(caption, 'e065-progression', 'span', 'e065-metric', '');
    if (libelle) libelle.textContent = mode === 'etroit' ? rang + '/' + total : 'Point ' + rang + ' / ' + total;
  });

  /* E065-04 — Taille des chiffres pilotée par la largeur, en tabulaire. */
  protege(() => {
    const taille = Math.round(borne(largeur / 120, 8, 10) * 10) / 10;
    layout.style.setProperty('--e065-chiffre', taille + 'px');
    layout.setAttribute('data-e065-chiffre', String(taille));
    if (etat) etat.setAttribute('data-e065-tabulaire', 'on');
  });

  /* E065-05 — Taille de nœud réduite quand les repères se densifient. */
  protege(() => {
    const brut = champ && champ.style ? champ.style.getPropertyValue('--const-node-size') : '';
    const base = entier(brut, 28);
    const cible = mode === 'etroit' ? Math.min(base, 20)
      : mode === 'moyen' ? Math.min(base, 24)
        : base;
    layout.style.setProperty('--e065-node', cible + 'px');
    layout.setAttribute('data-e065-node', cible + 'px');
    layout.setAttribute('data-e065-node-base', base + 'px');
  });

  /* E065-06 — Portée mesurée des planètes et contraste des traits. */
  protege(() => {
    const rayons = planetes.map((planete) => Math.hypot(
      nombre(planete.style && planete.style.getPropertyValue('--x'), 50) - 50,
      nombre(planete.style && planete.style.getPropertyValue('--y'), 50) - 50
    ));
    const portee = rayons.length ? Math.max.apply(null, rayons) : 0;
    const opacite = mode === 'etroit' ? 0.9 : mode === 'moyen' ? 0.8 : 0.65;
    layout.style.setProperty('--e065-edge-opacity', String(opacite));
    layout.setAttribute('data-e065-span', portee.toFixed(1));
    layout.setAttribute('data-e065-edges', String(traits.length));
  });

  /* E065-07 — Année du repère : forme longue ou forme courte selon le mode. */
  protege(() => {
    const source = etat && etat.textContent ? etat.textContent : '';
    const found = /\((-?\d+)\)/.exec(source);
    let texte;
    if (!found) {
      layout.setAttribute('data-e065-year', '');
      layout.setAttribute('data-e065-year-short', '');
      texte = 'Année : —';
    } else {
      const annee = entier(found[1], 0);
      const court = String(annee);
      const long = annee < 0 ? Math.abs(annee) + ' av. J.-C.' : annee + ' apr. J.-C.';
      layout.setAttribute('data-e065-year', long);
      layout.setAttribute('data-e065-year-short', court);
      texte = mode === 'etroit' ? 'an ' + court : 'Année : ' + long;
    }
    const pastille = preparer(caption, 'e065-annee', 'span', 'e065-metric', texte);
    if (pastille) pastille.textContent = texte;
  });

  /* E065-08 — Confiance moyenne des points en jauge à largeur fluide. */
  protege(() => {
    let somme = 0;
    let compte = 0;
    lunes.forEach((lune) => {
      const source = (lune.getAttribute('aria-label') || '') + ' ' + (lune.getAttribute('title') || '');
      const found = /confiance\s+(\d+(?:\.\d+)?)/i.exec(source);
      if (!found) return;
      somme += nombre(found[1], 0);
      compte += 1;
    });
    const brute = compte ? somme / compte : 0;
    const norme = brute > 1 ? borne(brute / 100, 0, 1) : borne(brute, 0, 1);
    layout.style.setProperty('--e065-confidence', norme.toFixed(3));
    layout.setAttribute('data-e065-confidence', norme.toFixed(2));
    layout.setAttribute('data-e065-confidence-n', String(compte));
    const texte = mode === 'etroit'
      ? 'Conf. ' + norme.toFixed(2)
      : 'Confiance moyenne ' + norme.toFixed(2);
    const pastille = preparer(caption, 'e065-confiance', 'span', 'e065-metric', texte);
    if (pastille) pastille.textContent = texte;
    const jauge = preparer(caption, 'e065-jauge', 'span', 'e065-jauge', '');
    if (jauge) {
      jauge.setAttribute('aria-hidden', 'true');
      if (!jauge.firstChild && api && typeof api.el === 'function') {
        jauge.appendChild(api.el('i', 'e065-jauge-rempli'));
      }
    }
  });

  /* E065-09 — Sources locales comptées avec accord et libellé court. */
  protege(() => {
    let total = 0;
    let avecSource = 0;
    lunes.forEach((lune) => {
      const titre = lune.getAttribute('title') || '';
      const etiquette = lune.getAttribute('data-label') || '';
      const found = /(\d+)\s+source/i.exec(titre) || /(\d+)\s*src/i.exec(etiquette);
      if (!found) return;
      total += entier(found[1], 0);
      avecSource += 1;
    });
    layout.setAttribute('data-e065-sources', String(total));
    layout.setAttribute('data-e065-sources-points', String(avecSource));
    const texte = mode === 'etroit'
      ? 'Src ' + total
      : total + ' source' + (total > 1 ? 's' : '') + ' locale' + (total > 1 ? 's' : '')
        + ' sur ' + lunes.length + ' point(s)';
    const pastille = preparer(caption, 'e065-sources', 'span', 'e065-metric', texte);
    if (pastille) pastille.textContent = texte;
  });

  /* E065-10 — Synthèse auditable, empreinte stable et mouvement réduit. */
  protege(() => {
    const reduce = !!(api && api.reducedMotion && api.reducedMotion());
    layout.setAttribute('data-e065-motion', reduce ? 'reduce' : 'full');
    const resume = [
      'mode=' + mode,
      'largeur=' + largeur + 'px',
      'densite=' + soleils.length + '/' + planetes.length + '/' + lunes.length + '/' + traits.length,
      'point=' + (layout.getAttribute('data-e065-point') || '—'),
      'confiance=' + (layout.getAttribute('data-e065-confidence') || '—'),
      'sources=' + (layout.getAttribute('data-e065-sources') || '—'),
      'mouvement=' + (reduce ? 'reduit' : 'complet')
    ].join('; ');
    const stamp = signature(resume);
    layout.setAttribute('data-e065-stamp', stamp);
    const panneau = preparer(layout, 'e065-metrics', 'section', 'e065-metrics', '');
    if (!panneau) return;
    panneau.setAttribute('role', 'group');
    panneau.setAttribute('aria-label', 'Synthèse responsive des métriques chiffrées');
    const ligne = preparer(panneau, 'e065-synthese', 'p', 'e065-synthese', '');
    if (ligne) ligne.textContent = 'Constellation · ' + resume + ' · empreinte ' + stamp;
  });
}

const CSS = `
/* Ancrage des métriques sur la largeur mesurée. */
.constellation-layout[data-e065] { --e065-chiffre: 9px; --e065-node: 28px; --e065-edge-opacity: .65; --e065-confidence: 0; }
/* Densité chiffrée sur une seule ligne. */
.constellation-layout[data-e065] .constellation-caption { gap: 6px 12px; }
.e065-metric { color: var(--muted); font-size: var(--e065-chiffre, 9px); font-variant-numeric: tabular-nums; }
/* Progression à largeur fluide. */
progress#e065-progress { width: clamp(64px, 16vw, 180px); height: 6px; accent-color: var(--gold); vertical-align: middle; }
/* Chiffres tabulaires pilotés par la largeur. */
.constellation-layout[data-e065] .constellation-state { font-size: var(--e065-chiffre, 9px); font-variant-numeric: tabular-nums; }
/* Taille de nœud adaptée à la densité. */
.constellation-layout[data-e065] .const-planet { width: var(--e065-node, 28px); height: var(--e065-node, 28px); }
/* Traits plus visibles sur champ étroit. */
.constellation-layout[data-e065] .constellation-edges line { stroke-opacity: var(--e065-edge-opacity, .65); }
/* Jauge de confiance à largeur variable. */
.e065-jauge { display: inline-block; width: clamp(48px, 11vw, 110px); height: 5px; border-radius: 3px; background: rgba(255,255,255,.09); overflow: hidden; vertical-align: middle; }
.e065-jauge-rempli { display: block; height: 100%; width: calc(var(--e065-confidence, 0) * 100%); background: var(--violet); }
/* Panneau de synthèse. */
#e065-metrics { flex: 1 1 100%; max-width: 100%; margin-top: 6px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 6px; background: rgba(255,255,255,.02); }
#e065-synthese { margin: 0; color: var(--muted); font-size: var(--e065-chiffre, 9px); line-height: 1.5; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.constellation-layout[data-e065-mode="etroit"] #e065-densite,
.constellation-layout[data-e065-mode="etroit"] #e065-annee,
.constellation-layout[data-e065-mode="etroit"] #e065-sources,
.constellation-layout[data-e065-mode="etroit"] #e065-confiance { font-size: 8px; }
.constellation-layout[data-e065-mode="etroit"] #e065-metrics { padding: 4px 6px; }
.constellation-layout[data-e065-motion="reduce"] [id^="e065-"],
.constellation-layout[data-e065-motion="reduce"] .e065-metric { transition: none !important; }
@media (prefers-reduced-motion: reduce) {
  [id^="e065-"], .e065-metric { transition: none !important; }
}
`;

register('E065', (ctx) => {
  /* Garde d'entrée : ctx.layout vérifié avant tout ajout au DOM. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelector !== 'function') return;
  api = {
    el: typeof ctx.el === 'function' ? ctx.el : null,
    reducedMotion: typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion : null,
  };
  /* Feuille unique, injectée une seule fois. */
  ctx.css('constellation-e065', CSS);

  try {
    appliquer(ctx.layout);
  } catch {
    /* Rendu nominal préservé : la lentille reste tolérante. */
  }

  if (!ecouteurPose && typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    ecouteurPose = true;
    window.addEventListener('resize', () => {
      try {
        const vivant = typeof document !== 'undefined'
          ? document.querySelector(SELECTEUR + '[data-e065]')
          : null;
        if (vivant && api) appliquer(vivant);
      } catch {
        /* Mise à jour ignorée sans effet sur la vue. */
      }
    }, { passive: true });
  }
});
