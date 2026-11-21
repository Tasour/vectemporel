import { register } from './registry.js';

/* Lentille E087 — Contraste et perception (vue Récit).
 *
 * Dix chantiers indépendants E087-01 … E087-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/RECIT/views/E087.md. Lectures seules : src/views/recit.js,
 * src/views/recit/registry.js, src/views/recit/index.js.
 *
 * Greffon strictement non destructif : aucune suppression de nœud, aucun texte
 * existant réécrit, aucun appel réseau, aucun aléa, aucune sortie de débogage.
 * Toutes les classes introduites sont préfixées recit-e087-, le seul identifiant
 * DOM créé est e087-contrast-btn (unique), et l'unique feuille de style porte
 * l'identifiant recit-e087. Sans ce module, la vue reste intégralement lisible.
 * La coque reconstruisant #app à chaque rendu, l'état de la bascule survit aux
 * reconstructions (variable de module) et les gardes empêchent tout doublon.
 */

const CSS = `
/* E087-01 — Encre et lisibilité du texte courant. */
.recit-layout.recit-e087-ink .recit-title{color:var(--ink);text-shadow:0 1px 2px rgba(0,0,0,.55)}
.recit-layout.recit-e087-ink .recit-context{color:var(--ink-soft);text-shadow:0 1px 1px rgba(0,0,0,.35)}

/* E087-02 — Certitudes : forme et matière, jamais la seule couleur. */
.recit-layout.recit-e087-conf .recit-conf{border-width:0 0 0 3px;border-left-style:solid;font-weight:600;color:var(--ink);background:rgba(255,255,255,.04)}
.recit-layout.recit-e087-conf .recit-conf[data-e087-conf="vérifié"]{border-left-color:#7fd1a6}
.recit-layout.recit-e087-conf .recit-conf[data-e087-conf="certain"]{border-left-color:var(--gold)}
.recit-layout.recit-e087-conf .recit-conf[data-e087-conf="probable"]{border-left-style:dashed;border-left-color:var(--gold-bright)}
.recit-layout.recit-e087-conf .recit-conf[data-e087-conf="disputed"]{border-left-style:double;border-left-color:#e08a8a}
.recit-layout.recit-e087-conf .recit-thread-item[data-confidence="probable"]{border-style:dashed}
.recit-layout.recit-e087-conf .recit-thread-item[data-confidence="disputed"]{border-style:double}

/* E087-03 — Point courant saillant dans le fil (forme + épaisseur). */
.recit-layout.recit-e087-current .recit-thread-item.is-current{color:#fff;font-weight:700;border-width:1px 1px 1px 4px;border-left-color:var(--gold-bright);box-shadow:inset 0 0 0 1px rgba(230,185,111,.35);background:rgba(230,185,111,.16)}

/* E087-04 — Commandes désactivées lisibles et distinctes. */
.recit-layout.recit-e087-disabled .recit-actions button:disabled{opacity:.6;border-style:dashed;color:var(--muted);background:transparent;cursor:not-allowed}

/* E087-05 — Hiérarchie de perception kicker / titre / métadonnées. */
.recit-layout.recit-e087-hierarchy .view-kicker{color:var(--gold-bright);font-weight:700;letter-spacing:.1em;font-variant-numeric:tabular-nums}
.recit-layout.recit-e087-hierarchy .recit-meta{color:var(--ink-soft)}
.recit-layout.recit-e087-hierarchy .recit-conf{font-variant-numeric:tabular-nums}

/* E087-06 — Petits textes : plancher de taille et contraste. */
.recit-layout.recit-e087-small .recit-legend,
.recit-layout.recit-e087-small .recit-legend p,
.recit-layout.recit-e087-small .recit-trace,
.recit-layout.recit-e087-small .recit-trace p,
.recit-layout.recit-e087-small .recit-sources{font-size:11px;color:var(--ink-soft);line-height:1.6}
.recit-layout.recit-e087-small .thread-kind{font-size:10px;color:var(--muted);font-weight:600}
.recit-layout.recit-e087-small .recit-timing{font-size:10px;color:var(--muted)}

/* E087-07 — Progression contrastée et texturée (motif, pas seule couleur). */
.recit-layout.recit-e087-progress .recit-progress{height:6px;background:rgba(255,255,255,.14);border:1px solid var(--line-strong)}
.recit-layout.recit-e087-progress .recit-progress>span{min-width:6px;box-shadow:0 0 0 1px rgba(0,0,0,.35);background-image:repeating-linear-gradient(135deg,rgba(255,255,255,.24) 0 4px,transparent 4px 8px)}

/* E087-08 — Focus clavier à double anneau, visible sur tout fond. */
.recit-layout.recit-e087-focus .recit-actions button:focus-visible,
.recit-layout.recit-e087-focus .recit-thread-item:focus-visible,
.recit-layout.recit-e087-focus .recit-trace summary:focus-visible,
.recit-layout.recit-e087-focus .c3a-search:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px;box-shadow:0 0 0 5px rgba(7,10,14,.95),0 0 0 6px rgba(230,185,111,.5)}

/* E087-09 — Légendes sur le média : fond opaque quel que soit le cliché. */
.recit-layout.recit-e087-media .media-caption,
.recit-layout.recit-e087-media .recit-media-credit{color:#fff;background:rgba(7,10,14,.82);padding:4px 8px;border-radius:6px;border:1px solid var(--line-strong);font-size:10px;text-shadow:0 1px 2px #000}
.recit-layout.recit-e087-media .media-empty{color:var(--ink-soft);font-weight:600}

/* E087-10 — Contraste renforcé : bascule et préférence système. */
.recit-e087-ctl{min-height:36px;padding:0 12px;border:1px solid var(--line-strong);border-radius:8px;background:rgba(255,255,255,.04);color:var(--ink-soft);font-size:10px;cursor:pointer;transition:border-color .18s linear,color .18s linear,background-color .18s linear}
.recit-e087-ctl[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.14)}
.recit-e087-ctl[data-e087-motion="reduce"]{transition:none}
.recit-e087-ctl:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-layout.recit-e087-boost .recit-title,
.recit-layout.recit-e087-boost .recit-context,
.recit-layout.recit-e087-boost .recit-meta,
.recit-layout.recit-e087-boost .recit-timing,
.recit-layout.recit-e087-boost .recit-legend,
.recit-layout.recit-e087-boost .recit-legend p,
.recit-layout.recit-e087-boost .recit-trace,
.recit-layout.recit-e087-boost .recit-sources,
.recit-layout.recit-e087-boost .recit-thread-item:not(.is-current){color:#fff}
.recit-layout.recit-e087-boost .recit-actions button,
.recit-layout.recit-e087-boost .recit-thread-item,
.recit-layout.recit-e087-boost .c3a-search{border-color:rgba(255,255,255,.55)}
@media (prefers-contrast:more){
  .recit-title,.recit-context,.recit-meta,.recit-timing,.recit-legend,.recit-legend p,
  .recit-trace,.recit-sources{color:#fff}
  .recit-actions button,.recit-thread-item,.c3a-search{border-color:rgba(255,255,255,.6)}
}
@media (prefers-reduced-motion:reduce){.recit-e087-ctl{transition:none}}
`;

/* L'état de la bascule survit aux reconstructions du DOM opérées par la coque,
   exactement comme les autres lentilles à bascule de cette vue. */
let boostActif = false;

const CLASSES = [
  'recit-e087-ink',
  'recit-e087-conf',
  'recit-e087-current',
  'recit-e087-disabled',
  'recit-e087-hierarchy',
  'recit-e087-small',
  'recit-e087-progress',
  'recit-e087-focus',
  'recit-e087-media',
];

function q(root, selecteur) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selecteur)
    : null;
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) {
    noeud.classList.add(nom);
  }
}

/* Déduit la clé de certitude du libellé réel du composant (texte + symbole). */
function cleConfiance(texte) {
  const valeur = String(texte || '');
  if (valeur.indexOf('Vérifié') !== -1) return 'vérifié';
  if (valeur.indexOf('Certain') !== -1) return 'certain';
  if (valeur.indexOf('Probable') !== -1) return 'probable';
  if (valeur.indexOf('Contesté') !== -1 || valeur.indexOf('disputed') !== -1) return 'disputed';
  return '';
}

function synchroniseBouton(bouton, reducedMotion) {
  if (!bouton || typeof bouton.setAttribute !== 'function') return;
  const libelle = boostActif
    ? 'Contraste renforcé : désactiver'
    : 'Contraste renforcé : activer';
  bouton.textContent = libelle;
  bouton.setAttribute('aria-label', libelle);
  bouton.setAttribute('aria-pressed', boostActif ? 'true' : 'false');
  let reduit = false;
  try { reduit = !!(reducedMotion && typeof reducedMotion === 'function' && reducedMotion()); }
  catch { reduit = false; }
  bouton.setAttribute('data-e087-motion', reduit ? 'reduce' : 'normal');
}

register('E087', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  void stage; /* la racine utile est layout, fournie par la coque. */
  try {
    if (typeof document === 'undefined' || !layout
        || typeof layout.querySelector !== 'function') return;

    css('recit-e087', CSS); /* un seul appel, toutes les règles du module. */

    const corps = q(layout, '.recit-body');

    /* E087-01 … E087-09 — un marqueur de classe par chantier sur le cadre. */
    CLASSES.forEach((nom) => ajouteClasse(layout, nom));

    /* E087-02 — le composant de certitude reçoit sa clé, sans toucher au texte. */
    const pastille = q(layout, '.recit-conf');
    if (pastille && typeof pastille.setAttribute === 'function') {
      const cle = cleConfiance(pastille.textContent);
      if (cle) pastille.setAttribute('data-e087-conf', cle);
    }

    /* E087-07 — la progression devient perceptible aux technologies d'assistance. */
    const progression = q(corps, '.recit-progress');
    if (progression && typeof progression.setAttribute === 'function') {
      const remplissage = progression.firstElementChild;
      let pourcent = 0;
      if (remplissage && remplissage.style && remplissage.style.width) {
        const valeurs = parseInt(String(remplissage.style.width).replace('%', '').trim(), 10);
        if (!Number.isNaN(valeurs)) pourcent = Math.min(100, Math.max(0, valeurs));
      }
      progression.setAttribute('role', 'progressbar');
      progression.setAttribute('aria-valuemin', '0');
      progression.setAttribute('aria-valuemax', '100');
      progression.setAttribute('aria-valuenow', String(pourcent));
      progression.setAttribute('aria-label', `Progression de la lecture : ${pourcent} %`);
    }

    /* E087-10 — bascule « contraste renforcé », ajoutée sans rien retirer. */
    const actions = q(layout, '.recit-actions');
    if (actions && typeof actions.appendChild === 'function' && typeof el === 'function') {
      let bouton = document.getElementById('e087-contrast-btn');
      if (!bouton || bouton.parentElement !== actions) {
        bouton = el('button', 'recit-e087-ctl');
        bouton.id = 'e087-contrast-btn';
        bouton.type = 'button';
        actions.appendChild(bouton);
      }
      synchroniseBouton(bouton, reducedMotion);
      if (bouton.getAttribute('data-e087-bound') !== '1') {
        bouton.setAttribute('data-e087-bound', '1');
        bouton.addEventListener('click', () => {
          boostActif = !boostActif;
          const cadre = document.querySelector('.recit-layout');
          if (cadre && cadre.classList) {
            if (boostActif) cadre.classList.add('recit-e087-boost');
            else cadre.classList.remove('recit-e087-boost');
          }
          synchroniseBouton(document.getElementById('e087-contrast-btn'), reducedMotion);
        });
      }
    }
    if (boostActif) ajouteClasse(layout, 'recit-e087-boost');
    else if (layout.classList && typeof layout.classList.remove === 'function') {
      layout.classList.remove('recit-e087-boost');
    }

    /* Marqueur de fin d'application, unique et sans effet sur le rendu. */
    if (typeof layout.setAttribute === 'function'
        && typeof layout.hasAttribute === 'function'
        && !layout.hasAttribute('data-e087-pret')) {
      layout.setAttribute('data-e087-pret', '1');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
