import { register } from './registry.js';

/* V2 lentille E027 — « Contraste et perception : mesure et diagnostic augmentés ».
   Dix chantiers V2 neufs (E027-01 … E027-10), distincts de ceux de la passe 1 :
   celle-ci ajoutait une bascule de contraste, une jauge de certitude, un codage
   multimodal du fil, des fonds opaques au média, une progression sémantisée, la
   hiérarchie des commandes, la légende, les filtres, le badge de traçabilité et
   un diagnostic par comptage. Ici, on MESURE le contraste WCAG réel depuis les
   couleurs calculées du DOM, on expose la hiérarchie typographique et on ajoute
   trois refinements perceptifs ciblés. Aucun chiffre n'est inventé : toute
   valeur affichée est dérivée du DOM courant (couleurs, tailles, textes, classes).
   Un seul enregistrement register pour l'identifiant E027, une seule feuille
   de style immatriculée recit-v2-e027.
   Préfixes : classes recit-v2-e027-, ids v2-e027- (jamais e027- de la passe 1).
   Zéro console, zéro réseau, zéro aléa, aucun fichier partagé modifié.
   Enrichissement non destructif : sans ce module, la vue reste intégralement
   lisible et utilisable. */

const CSS = `
/* E027-01 — Ratio de contraste WCAG du titre, calculé puis affiché sous le titre. */
.recit-layout[data-v2-e027="on"] .recit-v2-e027-readout{margin:3px 0;color:var(--ink-soft);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.recit-layout[data-v2-e027="on"] .recit-v2-e027-titre{padding-left:8px;border-left:2px solid var(--gold)}

/* E027-02 — Ratio de contraste de la pastille de certitude, lu sur la pastille réelle. */
.recit-layout[data-v2-e027="on"] .recit-v2-e027-conf{padding-left:8px;border-left:2px solid var(--gold-bright)}

/* E027-03 — Textes secondaires : le moins contrasté est nommé et chiffré. */
.recit-layout[data-v2-e027="on"] .recit-v2-e027-secondaire{padding-left:8px;border-left:2px solid var(--muted)}

/* E027-04 — Bilan de conformité AA/AAA sur un échantillon du DOM calculé. */
.recit-layout[data-v2-e027="on"] .recit-v2-e027-bilan-aa{padding-left:8px;border-left:2px solid var(--ink-soft)}

/* E027-05 — Hiérarchie typographique mesurée (tailles calculées en px). */
.recit-layout[data-v2-e027="on"] .recit-v2-e027-hierarchie{padding-left:8px;border-left:2px solid var(--blue)}

/* E027-06 — Voile de lisibilité : dégradé en bas du média, aucun texte réécrit. */
.recit-layout[data-v2-e027="on"] .recit-media.recit-v2-e027-scrim::after{content:"";position:absolute;left:0;right:0;bottom:0;height:46%;background:linear-gradient(to top,rgba(0,0,0,.82),rgba(0,0,0,0));pointer-events:none}
.recit-layout[data-v2-e027="on"] .recit-media.recit-v2-e027-scrim .media-caption,
.recit-layout[data-v2-e027="on"] .recit-media.recit-v2-e027-scrim .recit-media-credit{position:absolute;z-index:1}
.recit-layout[data-v2-e027="on"] .recit-v2-e027-voile{padding-left:8px;border-left:2px solid var(--line-strong)}

/* E027-07 — Contraste du statut et lisibilité des étiquettes de groupe. */
.recit-layout[data-v2-e027="on"] .recit-v2-e027-statut{padding-left:8px;border-left:2px solid var(--gold)}
.recit-layout[data-v2-e027="on"] .c3a-tools .c3a-group-label{color:var(--ink-soft);font-weight:600}

/* E027-08 — Repère perceptif du point courant (anneau interne, pas de glyphe). */
.recit-layout[data-v2-e027="on"] .recit-thread-item.is-current.recit-v2-e027-courant{box-shadow:inset 0 0 0 2px var(--gold-bright);background-color:rgba(230,185,111,.18);color:var(--gold-bright);font-weight:700}
.recit-layout[data-v2-e027="on"] .recit-v2-e027-position{padding-left:8px;border-left:2px solid var(--gold-bright)}

/* E027-09 — Légende : plancher de taille et couleur durablement lisibles. */
.recit-layout[data-v2-e027="on"] .recit-legend.recit-v2-e027-legende{color:var(--ink-soft)}
.recit-layout[data-v2-e027="on"] .recit-legend.recit-v2-e027-legende p{font-size:10px;line-height:1.7}
.recit-layout[data-v2-e027="on"] .recit-v2-e027-legende-readout{padding-left:8px;border-left:2px solid var(--muted)}

/* E027-10 — Tableau de bord perceptif repliable, récapitulatif des mesures. */
.recit-layout[data-v2-e027="on"] .recit-v2-e027-bilan{margin-top:14px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:9px}
.recit-layout[data-v2-e027="on"] .recit-v2-e027-bilan-resume{display:flex;align-items:center;min-height:36px;color:var(--gold-bright);font-weight:600;cursor:pointer}
.recit-layout[data-v2-e027="on"] .recit-v2-e027-bilan-resume:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-layout[data-v2-e027="on"] .recit-v2-e027-bilan-ligne{margin:4px 0;line-height:1.5;font-variant-numeric:tabular-nums}
`;

/* État conservé entre deux reconstructions du DOM (la coque recrée le layout). */
const prefs = { bilanOuvert: false };

/* ------------------------------------------------------------------------- *
 * Utilitaires de garde : jamais d'exception, jamais de casse du rendu.
 * ------------------------------------------------------------------------- */
function un(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function texte(node) {
  return node ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

/* Dépose ou réutilise un paragraphe visible, juste après une ancre stable. */
function placeApres(id, classe, ancre, contenu, fabrique) {
  if (!ancre || !ancre.parentNode || typeof document === 'undefined'
      || typeof fabrique !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) {
    noeud = fabrique('p', `recit-v2-e027-readout ${classe}`);
    noeud.id = id;
  }
  noeud.textContent = contenu;
  const parent = ancre.parentNode;
  if (noeud.parentNode !== parent || noeud.previousSibling !== ancre) {
    parent.insertBefore(noeud, ancre.nextSibling);
  }
  return noeud;
}

/* ------------------------------------------------------------------------- *
 * Mesure WCAG : couleurs calculées, composition des fonds, luminance, ratio.
 * ------------------------------------------------------------------------- */
function parseCouleur(valeur) {
  if (!valeur) return null;
  const trouvailles = String(valeur).match(
    /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/i
  );
  if (!trouvailles) return null;
  const alpha = trouvailles[4] === undefined ? 1 : parseFloat(trouvailles[4]);
  if (!isFinite(alpha)) return null;
  return {
    r: parseFloat(trouvailles[1]),
    g: parseFloat(trouvailles[2]),
    b: parseFloat(trouvailles[3]),
    a: Math.max(0, Math.min(1, alpha)),
  };
}

function compose(avant, arriere) {
  const a = avant.a;
  return {
    r: avant.r * a + arriere.r * (1 - a),
    g: avant.g * a + arriere.g * (1 - a),
    b: avant.b * a + arriere.b * (1 - a),
    a: 1,
  };
}

function luminance(couleur) {
  const canal = (brut) => {
    const v = Math.max(0, Math.min(255, brut)) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(couleur.r) + 0.7152 * canal(couleur.g) + 0.0722 * canal(couleur.b);
}

/* Fond effectif : on empile les backgrounds translucides jusqu'à un opaque. */
function fondEffectif(noeud) {
  const couches = [];
  let courant = noeud;
  while (couches.length < 12 && courant && courant.nodeType === 1) {
    let couleur = null;
    try { couleur = parseCouleur(window.getComputedStyle(courant).backgroundColor); }
    catch { couleur = null; }
    if (couleur && couleur.a > 0) {
      couches.push(couleur);
      if (couleur.a >= 1) break;
    }
    courant = courant.parentElement;
  }
  /* Repli : --bg du design system local (#070a0e), jamais une valeur inventée
     pour un texte : sert uniquement de fond de composition par défaut. */
  let fond = { r: 7, g: 10, b: 14, a: 1 };
  for (let i = couches.length - 1; i >= 0; i -= 1) fond = compose(couches[i], fond);
  return fond;
}

function mesurerRatio(noeud) {
  if (!noeud || typeof window === 'undefined'
      || typeof window.getComputedStyle !== 'function') return null;
  try {
    const style = window.getComputedStyle(noeud);
    const lettrage = parseCouleur(style.color);
    if (!lettrage || lettrage.a <= 0) return null;
    const fond = fondEffectif(noeud);
    const clair = Math.max(luminance(lettrage), luminance(fond));
    const sombre = Math.min(luminance(lettrage), luminance(fond));
    const ratio = (clair + 0.05) / (sombre + 0.05);
    if (!isFinite(ratio) || ratio <= 0) return null;
    return { ratio, verdict: ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : 'sous AA' };
  } catch {
    return null;
  }
}

function taillePx(noeud) {
  if (!noeud || typeof window === 'undefined'
      || typeof window.getComputedStyle !== 'function') return null;
  try {
    const valeur = parseFloat(window.getComputedStyle(noeud).fontSize);
    return isFinite(valeur) ? Math.round(valeur) : null;
  } catch {
    return null;
  }
}

function formatRatio(mesure) {
  if (!mesure) return 'non mesurable';
  return `${mesure.ratio.toFixed(2).replace('.', ',')}:1 · ${mesure.verdict}`;
}

function formatTaille(valeur) {
  return valeur === null || valeur === undefined ? '—' : String(valeur);
}

/* ------------------------------------------------------------------------- *
 * Instantané : toutes les valeurs sont lues une fois par rendu, sur le DOM.
 * ------------------------------------------------------------------------- */
function instantane(layout, reduced) {
  const noeuds = {
    corps: un(layout, '.recit-body'),
    titre: un(layout, '.recit-title'),
    conf: un(layout, '.recit-conf'),
    meta: un(layout, '.recit-meta'),
    timing: un(layout, '.recit-timing'),
    kicker: un(layout, '.view-kicker'),
    threadTitre: un(layout, '.recit-thread-title'),
    status: un(layout, '#c3a-status') || un(layout, '.c3a-status'),
    legende: un(layout, '.recit-legend p'),
    courant: un(layout, '.recit-thread-item.is-current')
      || un(layout, '.recit-thread-item[aria-current="step"]'),
    media: un(layout, '.recit-media'),
    outils: un(layout, '.c3a-tools'),
    thread: un(layout, '.recit-thread'),
    legendeBloc: un(layout, '.recit-legend'),
  };

  const ratio = {};
  ['titre', 'conf', 'meta', 'timing', 'kicker', 'threadTitre', 'status', 'legende', 'courant']
    .forEach((cle) => { ratio[cle] = mesurerRatio(noeuds[cle]); });

  const tailles = {};
  ['titre', 'kicker', 'meta', 'timing', 'legende']
    .forEach((cle) => { tailles[cle] = taillePx(noeuds[cle]); });

  const secondaires = [
    ['meta', 'métadonnées'],
    ['timing', 'durée de lecture'],
    ['kicker', 'repère d’étape'],
    ['threadTitre', 'titre du fil'],
    ['status', 'statut'],
  ];
  let pire = null;
  secondaires.forEach(([cle, libelle]) => {
    const mesure = ratio[cle];
    if (mesure && (!pire || mesure.ratio < pire.ratio)) {
      pire = { ratio: mesure.ratio, verdict: mesure.verdict, libelle };
    }
  });

  const echantillon = ['titre', 'conf', 'meta', 'timing', 'kicker', 'status', 'legende', 'courant'];
  const mesures = echantillon.map((cle) => ratio[cle]).filter(Boolean);
  const aa = mesures.filter((mesure) => mesure.ratio >= 4.5).length;
  const aaa = mesures.filter((mesure) => mesure.ratio >= 7).length;

  const statutBrut = texte(noeuds.status);
  const statutCourt = statutBrut.split('·')[0].trim();

  return {
    noeuds, ratio, tailles, pire, aa, aaa, total: mesures.length,
    statutCourt, reduced,
  };
}

/* ------------------------------------------------------------------------- *
 * Tableau de bord récapitulatif (chantier 10), replié par défaut.
 * ------------------------------------------------------------------------- */
function addBilan(el, layout, snap) {
  let details = un(layout, '#v2-e027-bilan');
  if (!details) {
    const corps = snap.noeuds.corps;
    if (!corps || typeof corps.appendChild !== 'function') return null;
    details = el('details', 'recit-v2-e027-bilan');
    details.id = 'v2-e027-bilan';
    const resume = el('summary', 'recit-v2-e027-bilan-resume', '');
    resume.id = 'v2-e027-bilan-resume';
    details.appendChild(resume);
    const contenu = el('div', 'recit-v2-e027-bilan-corps');
    contenu.id = 'v2-e027-bilan-corps';
    details.appendChild(contenu);
    corps.appendChild(details);
    details.addEventListener('toggle', () => { prefs.bilanOuvert = details.open; });
  }
  const contenu = un(details, '#v2-e027-bilan-corps');
  const resume = un(details, '#v2-e027-bilan-resume');
  if (resume) {
    resume.textContent = `Perception · tableau de bord (${snap.total} mesures)`;
  }
  if (contenu) {
    while (contenu.firstChild) contenu.removeChild(contenu.firstChild);
    const lignes = [
      `Titre : ${formatRatio(snap.ratio.titre)}.`,
      `Pastille de certitude : ${formatRatio(snap.ratio.conf)}.`,
      `Texte secondaire le plus faible : ${snap.pire
        ? `${snap.pire.libelle} — ${formatRatio(snap.pire)}` : 'non mesurable'}.`,
      `Conformité : ${snap.aa}/${snap.total} textes au seuil AA, ${snap.aaa}/${snap.total} au seuil AAA.`,
      `Typographie : titre ${formatTaille(snap.tailles.titre)} px, légende ${formatTaille(snap.tailles.legende)} px.`,
      `Voile du média : ${snap.noeuds.media && snap.noeuds.media.classList
        && snap.noeuds.media.classList.contains('recit-v2-e027-scrim') ? 'appliqué' : 'non applicable'}.`,
      `Mouvement système : ${snap.reduced ? 'réduit' : 'complet'} (préférence respectée).`,
    ];
    lignes.forEach((ligne) => {
      contenu.appendChild(el('p', 'recit-v2-e027-bilan-ligne', ligne));
    });
  }
  details.open = prefs.bilanOuvert;
  return details;
}

/* ------------------------------------------------------------------------- *
 * Point d'entrée unique : toutes les mesures et tous les nœuds sont dérivés
 * du DOM courant ; chaque ajout est gardé et idempotent.
 * ------------------------------------------------------------------------- */
register('E027', (ctx) => {
  try {
    const { layout, css, el, reducedMotion } = ctx || {};
    if (!layout || typeof layout.querySelector !== 'function') return;
    if (typeof document === 'undefined') return;
    if (typeof css !== 'function' || typeof el !== 'function') return;

    css('recit-v2-e027', CSS); /* un seul appel, toutes les règles du module. */

    const reduced = typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : false;
    layout.setAttribute('data-v2-e027', 'on');
    const snap = instantane(layout, reduced);
    if (!snap.noeuds.corps) return;

    /* Chantier 01 — contraste calculé du titre, affiché sous le titre. */
    if (snap.noeuds.titre) {
      placeApres('v2-e027-ratio-titre', 'recit-v2-e027-titre', snap.noeuds.titre,
        `Contraste du titre — ${formatRatio(snap.ratio.titre)} (seuil AA 4,5:1).`, el);
    }

    /* Chantier 02 — contraste calculé de la pastille de certitude réelle. */
    if (snap.noeuds.conf) {
      placeApres('v2-e027-ratio-conf', 'recit-v2-e027-conf', snap.noeuds.meta || snap.noeuds.conf,
        `Contraste de la pastille de certitude — ${formatRatio(snap.ratio.conf)}.`, el);
    }

    /* Chantier 03 — texte secondaire le moins contrasté, nommé et chiffré. */
    if (snap.noeuds.timing) {
      const pireTexte = snap.pire
        ? `${snap.pire.libelle} — ${formatRatio(snap.pire)}`
        : 'non mesurable';
      placeApres('v2-e027-ratio-secondaire', 'recit-v2-e027-secondaire', snap.noeuds.timing,
        `Texte secondaire le plus faible : ${pireTexte}.`, el);
    }

    /* Chantier 04 — bilan AA/AAA sur l'échantillon calculé du DOM. */
    if (snap.noeuds.status) {
      placeApres('v2-e027-bilan-aa', 'recit-v2-e027-bilan-aa', snap.noeuds.status,
        `Bilan de contraste : ${snap.aa}/${snap.total} textes au seuil AA, ${snap.aaa}/${snap.total} au seuil AAA.`, el);
    }

    /* Chantier 05 — hiérarchie typographique mesurée en pixels calculés. */
    if (snap.noeuds.kicker) {
      const parties = [
        `titre ${formatTaille(snap.tailles.titre)} px`,
        `repère ${formatTaille(snap.tailles.kicker)} px`,
        `métadonnée ${formatTaille(snap.tailles.meta)} px`,
        `légende ${formatTaille(snap.tailles.legende)} px`,
      ];
      placeApres('v2-e027-hierarchie', 'recit-v2-e027-hierarchie', snap.noeuds.kicker,
        `Tailles calculées : ${parties.join(' · ')}.`, el);
    }

    /* Chantier 06 — voile dégradé appliqué au média, textes d'origine intacts. */
    if (snap.noeuds.media) {
      ajouteClasse(snap.noeuds.media, 'recit-v2-e027-scrim');
      if (snap.noeuds.outils) {
        placeApres('v2-e027-voile', 'recit-v2-e027-voile', snap.noeuds.outils,
          `Voile de lisibilité : ${snap.noeuds.media.classList.contains('recit-v2-e027-scrim')
            ? 'appliqué' : 'non applicable'} — dégradé en bas du média, légende et crédit intacts.`, el);
      }
    }

    /* Chantier 07 — contraste du statut, étiquettes de groupe renforcées. */
    if (snap.noeuds.status) {
      placeApres('v2-e027-statut', 'recit-v2-e027-statut', snap.noeuds.status,
        `Statut — ${formatRatio(snap.ratio.status)}. Lecture : « ${snap.statutCourt || 'non lisible'} »`, el);
    }

    /* Chantier 08 — anneau de repère sur le point courant + contraste mesuré. */
    if (snap.noeuds.courant) {
      ajouteClasse(snap.noeuds.courant, 'recit-v2-e027-courant');
      if (snap.noeuds.thread) {
        const libelle = texte(snap.noeuds.courant).slice(0, 60);
        placeApres('v2-e027-position', 'recit-v2-e027-position', snap.noeuds.thread,
          `Point courant — ${formatRatio(snap.ratio.courant)}. Libellé : « ${libelle || 'non lisible'} »`, el);
      }
    }

    /* Chantier 09 — plancher de taille et contraste de la légende. */
    if (snap.noeuds.legendeBloc && snap.noeuds.legende) {
      ajouteClasse(snap.noeuds.legendeBloc, 'recit-v2-e027-legende');
      placeApres('v2-e027-legende', 'recit-v2-e027-legende-readout', snap.noeuds.legendeBloc,
        `Légende — ${formatTaille(snap.tailles.legende)} px, ${formatRatio(snap.ratio.legende)}.`, el);
    }

    /* Chantier 10 — tableau de bord perceptif replié en fin de corps. */
    addBilan(el, layout, snap);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
