import { register } from './registry.js';

/* Lentille E088 — Performance et sobriété de la vue Récit.
 *
 * Dix chantiers E088-01 … E088-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/RECIT/views/E088.md. Lectures seules : src/views/recit.js,
 * src/views/recit/registry.js, src/views/recit/index.js, styles.css.
 *
 * E088 cible des leviers laissés libres par E008 : confinement du média,
 * stabilité du défilement, rendu différé du fil long, sobriété typographique,
 * anti-reflow mobile, chiffres tabulaires, indicateur de budget visible,
 * traversée DOM unique et passe idempotente. Elle n'ajoute ni écouteur, ni
 * timer, ni observateur, ni boucle rAF, ni mesure géométrique, ni aléa, ni
 * appel réseau, ni journalisation. Un seul nœud est créé, portant l'id unique
 * et préfixé `e088-budget` ; toutes les classes introduites sont préfixées
 * `recit-e088-`. Sans ce module, la vue reste intégralement lisible.
 */

const CSS = `
/* E088-01 — confinement de la colonne média : ses changements d'image ou de
   légende ne invalident pas la mise en page du texte. */
.recit-layout .recit-e088-media {
  contain: layout style paint;
}

/* E088-02 — gouttière de barre de défilement réservée : évite le décalage
   horizontal du texte quand le contenu passe sous le seuil de défilement
   d'une étape à l'autre. */
.recit-layout .recit-e088-scroll {
  scrollbar-gutter: stable;
}

/* E088-03 — défilement contenu à la colonne : pas de chaînage vers la coque,
   donc moins de travail de composition sur mobile. */
.recit-layout .recit-e088-scroll {
  overscroll-behavior: contain;
}

/* E088-04 — fil très long : le rendu des items hors écran est différé, avec
   une hauteur réservée pour ne pas faire sauter la mise en page. */
.recit-layout .recit-thread-list.recit-e088-fil-differe > li {
  content-visibility: auto;
  contain-intrinsic-size: auto 30px;
}

/* E088-05 — sobriété typographique : aucune synthèse de gras ou d'italique,
   et un rendu de texte privilégiant la vitesse sur les longs paragraphes. */
.recit-e088-typo .recit-thread-item,
.recit-e088-typo .c3a-status,
.recit-e088-budget {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-synthesis: none;
}
.recit-e088-typo .recit-context,
.recit-e088-typo .recit-legend {
  text-rendering: optimizeSpeed;
}

/* E088-06 — anti-reflow mobile : interdiction du gonflement automatique des
   caractères qui forcerait une nouvelle mise en page. */
.recit-layout.recit-e088-anti-reflow {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

/* E088-07 — chiffres tabulaires : largeur fixe pour les compteurs, afin
   qu'un changement de nombre ne déplace pas ses voisins. */
.recit-e088-chiffres .view-kicker,
.recit-e088-chiffres .recit-timing,
.recit-e088-chiffres .c3a-status,
.recit-e088-budget {
  font-variant-numeric: tabular-nums;
}

/* E088-08 — indicateur de budget : bloc de lecture sobre, sans ombre ni
   filtre coûteux, avec un seul habillage statique. */
.recit-e088-budget {
  margin: 12px 0 0;
  padding: 6px 9px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, .02);
  color: var(--muted-2);
  font-size: 9px;
  line-height: 1.5;
}

/* E088-10 — aucune animation n'est introduite : rien à neutraliser, même en
   mouvement réduit. Garde purement déclarative, sans !important. */
`;

const MIROIR = 'data-e088-sobriete';
const SEUIL_FIL_DIFFERE = 60;

/* Ajout de classe non destructif, avec gardes d'existence. */
function classe(noeud, nom) {
  if (!noeud || !noeud.classList || typeof noeud.classList.add !== 'function') return;
  if (typeof noeud.classList.contains === 'function' && noeud.classList.contains(nom)) return;
  noeud.classList.add(nom);
}

/* E088-09 — une seule traversée de l'arbre pour toutes les métriques.
   Les décomptes sont dérivés pendant le parcours, sans sélecteurs
   supplémentaires et sans mesure géométrique. */
function compteUnique(root) {
  const mesures = { elements: 0, boutons: 0, fil: 0 };
  if (!root || typeof root.querySelectorAll !== 'function') return mesures;
  try {
    const tous = root.querySelectorAll('*');
    for (let i = 0; i < tous.length; i += 1) {
      const noeud = tous[i];
      mesures.elements += 1;
      if (noeud.tagName === 'BUTTON') mesures.boutons += 1;
      if (noeud.classList && typeof noeud.classList.contains === 'function'
          && noeud.classList.contains('recit-thread-item')) {
        mesures.fil += 1;
      }
    }
  } catch {
    /* Repli silencieux : une métrique manquante ne doit jamais casser le rendu. */
  }
  return mesures;
}

/* E088-08 — indicateur de budget visible. Un seul par rendu, id préfixé et
   unique, texte indexable, aucune région live supplémentaire. */
function indicateurBudget(corps, mesures, fabriquer) {
  if (!corps || typeof corps.appendChild !== 'function') return false;
  const present = (typeof document !== 'undefined' && document.getElementById('e088-budget'))
    || (typeof corps.querySelector === 'function' && corps.querySelector('#e088-budget'));
  if (present) return false;
  if (typeof fabriquer !== 'function') return false;
  const paragraphe = fabriquer(
    'p',
    'recit-e088-budget',
    `Empreinte de la vue : ${mesures.elements} éléments, ${mesures.boutons} commandes, ${mesures.fil} points dans le fil.`
  );
  if (!paragraphe) return false;
  try {
    paragraphe.id = 'e088-budget';
    corps.appendChild(paragraphe);
    return true;
  } catch {
    return false;
  }
}

register('E088', (ctx) => {
  if (!ctx) return;
  const { stage, layout, css, el, reducedMotion } = ctx;
  /* E088 n'introduit aucune animation : le prédicat de mouvement est sans objet. */
  void reducedMotion;
  if (typeof css === 'function') css('recit-e088', CSS);

  const root = layout || stage;
  if (!root || typeof root.querySelector !== 'function') return;

  const cible = typeof root.setAttribute === 'function' ? root : null;
  if (!cible || (typeof cible.hasAttribute === 'function' && cible.hasAttribute(MIROIR))) return;

  /* E088-10 — une seule passe par rendu, un seul marqueur, aucun écouteur. */
  classe(cible, 'recit-e088');
  classe(cible, 'recit-e088-typo');
  classe(cible, 'recit-e088-anti-reflow');
  classe(cible, 'recit-e088-chiffres');

  /* E088-01, E088-02, E088-03 — ciblage des deux colonnes. */
  classe(root.querySelector('.recit-media'), 'recit-e088-media');
  const corps = root.querySelector('.recit-body') || root;
  classe(corps, 'recit-e088-scroll');

  const mesures = compteUnique(root);

  /* E088-04 — seuil strictement supérieur : rien ne change sur un fil court. */
  const liste = root.querySelector('.recit-thread-list');
  const differe = mesures.fil > SEUIL_FIL_DIFFERE;
  if (differe) classe(liste, 'recit-e088-fil-differe');

  const budget = indicateurBudget(corps, mesures, el);

  try {
    cible.setAttribute(
      MIROIR,
      `dom:${mesures.elements} btn:${mesures.boutons} fil:${mesures.fil} differe:${differe ? 1 : 0} budget:${budget ? 1 : 0} passe:1`
    );
  } catch {
    /* Le miroir est purement informatif : son échec n'affecte pas le rendu. */
  }
});
