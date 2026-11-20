import { register } from './registry.js';

/* V2 lentille E087 — Contraste et perception (complément de la passe 1).
   La passe 1 traite déjà : encre du titre, formes de certitude, point courant,
   boutons désactivés, hiérarchie kicker/titre/métadonnées, plancher de taille,
   progression texturée, double anneau de focus, légendes sur média et bascule
   « contraste renforcé ». La V2 propose dix chantiers neufs et distincts :
   lectures chiffrées dérivées du DOM réel (répartition des certitudes,
   couverture des sources) et perception renforcée des contrôles de filtrage,
   du cadre média, de la traçabilité et du survol, plus le mode contraste forcé.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e087-, ids DOM v2-e087- (jamais les ids e087- de
   la passe 1 qui tourne sur le même DOM). Zéro réseau, zéro console, zéro aléa. */

const CSS = `
/* E087-01 — Répartition des certitudes : paragraphe de lecture chiffrée. */
.recit-v2-e087-readout{margin:6px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-v2-e087-repartition{font-variant-numeric:tabular-nums}

/* E087-02 — Filtres actifs : forme et graisse, jamais la seule couleur. */
.recit-layout .recit-v2-e087-filtres .c3a-filter[aria-pressed="true"]{border-width:2px;font-weight:700;box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)}

/* E087-03 — Champ de recherche : fond et bordure à contraste renforcé. */
.recit-layout .recit-v2-e087-search .c3a-search{background:rgba(255,255,255,.08);border-color:var(--line-strong);color:#fff}
.recit-layout .recit-v2-e087-search .c3a-search::placeholder{color:var(--ink-soft)}

/* E087-04 — Statut de filtrage en pastille contrastée. */
.recit-layout .recit-v2-e087-statut .c3a-status{display:inline-block;padding:4px 8px;border:1px solid var(--line-strong);border-radius:6px;color:var(--ink);background:rgba(255,255,255,.05);font-weight:600}

/* E087-05 — État vide et réinitialisation : encadrés et contrastés. */
.recit-layout .recit-v2-e087-vide .c3a-empty{border-style:solid;border-color:var(--ink-soft);color:var(--ink)}
.recit-layout .recit-v2-e087-vide .c3a-reset{border-width:2px;font-weight:700;color:#fff}

/* E087-06 — Démarcation média / récit par un filet perceptible. */
.recit-layout .recit-v2-e087-demarcation .recit-media{border-right:1px solid var(--line-strong)}
@media (max-width:1000px){.recit-layout .recit-v2-e087-demarcation .recit-media{border-right:0;border-bottom:1px solid var(--line-strong)}}

/* E087-07 — Traçabilité : repère de disclosure renforcé. */
.recit-layout .recit-v2-e087-trace .recit-trace{border-top:1px solid var(--line-strong);padding-top:8px}
.recit-layout .recit-v2-e087-trace .recit-trace summary{font-weight:700;color:var(--ink)}
.recit-layout .recit-v2-e087-trace .recit-sources{color:var(--ink-soft);font-weight:600}

/* E087-08 — Survol des boutons d'action : contraste et soulignement. */
.recit-layout .recit-v2-e087-hover .recit-actions button:hover:not(:disabled){border-color:var(--gold);color:#fff;text-decoration:underline;text-underline-offset:3px}

/* E087-09 — Couverture des sources : paragraphe de lecture chiffrée. */
.recit-v2-e087-source{font-variant-numeric:tabular-nums}

/* E087-10 — Mode contraste forcé et mouvement réduit des lectures V2. */
@media (forced-colors:active){
  .recit-layout .c3a-filter[aria-pressed="true"],
  .recit-layout .c3a-search,
  .recit-layout .c3a-reset,
  .recit-layout .recit-actions button{border:1px solid CanvasText}
  .recit-layout .recit-v2-e087-readout{color:CanvasText}
}
.recit-layout[data-v2-e087-motion="reduce"] .recit-v2-e087-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e087-readout{transition:none}}
`;

/* Ajoute une classe sans jamais écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

/* Dépose (ou réutilise) un paragraphe visible, à un emplacement stable. */
function placeParagraphe(el, id, classe, parent, ancre, texte) {
  if (typeof document === 'undefined' || !parent
      || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud && typeof el === 'function') {
    noeud = el('p', `recit-v2-e087-readout ${classe}`);
    noeud.id = id;
  }
  if (!noeud) return null;
  noeud.textContent = texte;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Classes posées sur le cadre pour les chantiers purement CSS (02–08). */
const CLASSES_CSS = [
  'recit-v2-e087-filtres',
  'recit-v2-e087-search',
  'recit-v2-e087-statut',
  'recit-v2-e087-vide',
  'recit-v2-e087-demarcation',
  'recit-v2-e087-trace',
  'recit-v2-e087-hover',
];

register('E087', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout
        || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e087', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    CLASSES_CSS.forEach((nom) => ajouteClasse(layout, nom));

    /* E087-01 — répartition des certitudes lue sur les vrais items du fil. */
    const fil = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    const titreFil = corps.querySelector('.recit-thread-title');
    if (fil && titreFil) {
      const items = Array.from(fil.querySelectorAll('.recit-thread-item'));
      if (items.length) {
        const niveaux = [
          ['vérifié', 'vérifié'],
          ['certain', 'certain'],
          ['probable', 'probable'],
          ['disputed', 'contesté'],
        ];
        const parties = niveaux.map(([cle, libelle]) => {
          const compte = items.filter((item) => item.getAttribute
            && item.getAttribute('data-confidence') === cle).length;
          return `${compte} ${libelle}${compte > 1 ? 's' : ''}`;
        });
        placeParagraphe(el, 'v2-e087-repartition', 'recit-v2-e087-repartition',
          fil, titreFil, `Répartition des certitudes dans le fil : ${parties.join(' · ')}.`);
      }
    }

    /* E087-09 — couverture des sources lue sur la traçabilité réelle du point. */
    const trace = corps.querySelector('.recit-trace');
    const sources = corps.querySelector('.recit-sources');
    if (trace || sources) {
      let texte;
      if (trace) {
        const sommaire = trace.querySelector('summary');
        const trouve = ((sommaire && sommaire.textContent) || '').match(/(\d+)\s*référence/i);
        texte = trouve
          ? `Sources du point : ${trouve[1]} référence(s) locale(s) déclarée(s).`
          : 'Sources du point : références locales déclarées.';
      } else {
        texte = 'Sources du point : aucune référence locale attachée.';
      }
      placeParagraphe(el, 'v2-e087-sources', 'recit-v2-e087-source',
        corps, trace || sources, texte);
    }

    /* E087-10 — mouvement réduit, lu une fois par rendu, sans écraser d'attribut. */
    let reduit = false;
    try { reduit = !!(reducedMotion && typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduit = false; }
    layout.setAttribute('data-v2-e087-motion', reduit ? 'reduce' : 'normal');

    /* Marqueur de fin d'application, unique et sans effet sur le rendu. */
    if (typeof layout.hasAttribute === 'function'
        && !layout.hasAttribute('data-v2-e087-pret')) {
      layout.setAttribute('data-v2-e087-pret', '1');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
