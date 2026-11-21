import { register } from './registry.js';

/* V2 lentille E065 — Accessibilité et technologies d'assistance (complément de
   la passe 1). La passe 1 traite déjà la progression ARIA, la barre d'outils,
   la langue, la pastille de certitude, le lien d'évitement vers le point, la
   légende, le timing, la description de l'image, la consigne de recherche et
   le statut de lecture. La V2 propose donc dix chantiers neufs et distincts :
   région d'illustration nommée, évitement vers les filtres, consigne clavier
   du fil, repère courant explicité, doublons d'annonce des types, cibles
   tactiles, focus renforcé, statut de filtrage atomique, aides lisibles,
   contraste forcé et mouvement réduit. Tous non destructifs : sans ce module,
   la vue reste intégralement lisible et utilisable. Préfixes : classes
   recit-v2-e065-, ids DOM v2-e065- (jamais les ids e065- de la passe 1, qui
   tourne sur le même DOM). Zéro réseau, zéro console, zéro aléa, aucun
   fichier partagé modifié. Détail : UNIFIED_AUDIT/RECIT/V2/views/E065.md. */

const CSS = `
/* E065-02 — Lien d'évitement vers les filtres, décalé sous celui de la passe 1. */
.recit-v2-e065-skip{position:fixed;left:8px;top:-90px;z-index:61;padding:9px 13px;border:1px solid var(--gold);border-radius:8px;background:rgba(12,12,12,.96);color:var(--gold-bright);font:600 13px/1.2 var(--sans);text-decoration:none;transition:top .16s linear}
.recit-v2-e065-skip:focus-visible{top:48px;outline:2px solid var(--gold-bright);outline-offset:2px}

/* E065-06 — Cibles tactiles conformes pour les filtres et le fil. */
.recit-v2-e065-cibles .c3a-filter{min-height:36px}
.recit-v2-e065-cibles .c3a-reset{min-height:36px}
.recit-v2-e065-cibles .recit-thread-item{min-height:36px}
.recit-v2-e065-cibles .recit-trace summary{min-height:36px}

/* E065-07 — Focus visible renforcé sur les contrôles secondaires. */
.recit-v2-e065-focus .c3a-filter:focus-visible,
.recit-v2-e065-focus .c3a-reset:focus-visible,
.recit-v2-e065-focus .recit-thread-item:focus-visible,
.recit-v2-e065-focus .recit-trace summary:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px}

/* E065-09 — Plancher de taille pour les aides et textes secondaires. */
.recit-v2-e065-aides .recit-legend,
.recit-v2-e065-aides .recit-timing,
.recit-v2-e065-aides .c3a-group-label,
.recit-v2-e065-aides .media-caption,
.recit-v2-e065-aides .recit-media-credit{font-size:10px;line-height:1.6;color:var(--muted)}

/* E065-10 — Mode contraste forcé et mouvement réduit respectés. */
.recit-layout[data-v2-e065-motion="reduce"] .recit-v2-e065-skip{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e065-skip{transition:none}}
@media (forced-colors:active){
  .recit-v2-e065-contraste .c3a-filter[aria-pressed="true"],
  .recit-v2-e065-contraste .recit-thread-item.is-current{outline:2px solid CanvasText;outline-offset:2px}
  .recit-v2-e065-contraste .recit-v2-e065-skip:focus-visible{outline-color:Highlight}
}
`;

/* Cache visuellement mais préserve le nœud dans l'arbre d'accessibilité. */
function sr(node) {
  if (node && node.classList && !node.classList.contains('sr-only')) node.classList.add('sr-only');
  return node;
}

/* Ajoute une classe sans écraser les autres classes du nœud. */
function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Pose un attribut uniquement s'il est absent : jamais d'écrasement. */
function attrSiAbsent(noeud, nom, valeur) {
  if (!noeud || typeof noeud.getAttribute !== 'function' || typeof noeud.setAttribute !== 'function') return;
  try {
    if (!noeud.hasAttribute(nom)) noeud.setAttribute(nom, valeur);
  } catch { /* attribut facultatif */ }
}

/* Ajoute un jeton à un attribut de liste (ex. aria-describedby) sans écraser
   les jetons déjà présents. */
function ajouteJeton(noeud, nom, jeton) {
  if (!noeud || typeof noeud.getAttribute !== 'function' || typeof noeud.setAttribute !== 'function') return;
  try {
    const courant = (noeud.getAttribute(nom) || '').trim();
    const tokens = courant ? courant.split(/\s+/).filter(Boolean) : [];
    if (tokens.indexOf(jeton) === -1) {
      tokens.push(jeton);
      noeud.setAttribute(nom, tokens.join(' '));
    }
  } catch { /* attribut facultatif */ }
}

/* Cherche un nœud, en renvoyant null plutôt que de lever. */
function qs(noeud, selecteur) {
  if (!noeud || typeof noeud.querySelector !== 'function') return null;
  try { return noeud.querySelector(selecteur); } catch { return null; }
}

/* Récupère ou crée un nœud identifié, de façon idempotente et non destructive. */
function getOrCreate(doc, parent, id, tag, classe, texte, fabriquer) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = null;
  try { noeud = doc.getElementById(id); } catch { return null; }
  if (noeud && noeud.parentNode !== parent) return null; /* unicité de l'id préservée */
  if (!noeud) {
    if (typeof fabriquer !== 'function') return null;
    noeud = fabriquer(tag, classe, texte);
    if (!noeud) return null;
    try { noeud.id = id; } catch { return null; }
    try { parent.insertBefore(noeud, parent.firstChild); } catch { return null; }
  }
  return noeud;
}

/* Tronque un texte pour un libellé d'interface, sans jamais inventer de donnée. */
function clip(texte, max) {
  const valeur = String(texte || '').trim();
  return valeur.length > max ? `${valeur.slice(0, max - 1).trimEnd()}…` : valeur;
}

register('E065', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    if (typeof css === 'function') css('recit-v2-e065', CSS); /* un seul appel, tout le CSS du module */

    const doc = layout.ownerDocument || document;
    const fabriquer = (tag, classe, texte) => (typeof el === 'function' ? el(tag, classe, texte) : null);
    const corps = qs(layout, '.recit-body');
    if (!corps) return;

    /* E065-01 — Région d'illustration nommée, libellé dérivé de l'alt ou de la
       légende réellement présents dans le DOM. */
    const media = qs(layout, '.recit-media');
    if (media) {
      const image = qs(media, 'img');
      const legende = qs(media, '.media-caption');
      const source = (image && image.getAttribute('alt'))
        ? String(image.getAttribute('alt'))
        : (legende ? String(legende.textContent || '') : '');
      const libelle = source.trim()
        ? `Illustration du repère : ${clip(source, 90)}.`
        : 'Illustration du repère.';
      attrSiAbsent(media, 'role', 'region');
      attrSiAbsent(media, 'aria-label', libelle);
    }

    /* Lien d'évitement vers les filtres (chantier CSS E065-02), distinct de celui de la passe 1
       (qui vise le point courant) et décalé sous lui quand les deux sont
       focalisés. Ancre strictement locale. */
    const recherche = doc.getElementById('c3a-search') || qs(corps, '.c3a-search');
    if (recherche && !doc.getElementById('v2-e065-skip-filters')) {
      const lien = getOrCreate(doc, corps, 'v2-e065-skip-filters', 'a',
        'recit-v2-e065-skip', 'Aller aux filtres du repère', fabriquer);
      if (lien) {
        attrSiAbsent(lien, 'href', '#c3a-search');
        attrSiAbsent(lien, 'aria-label', 'Aller directement aux filtres du repère');
      }
    }

    /* E065-03 — Consigne clavier du fil, annoncée via aria-describedby sur la
       liste. Le nombre de points est relevé sur les vrais boutons du fil. */
    const liste = doc.getElementById('c3a-thread') || qs(corps, '.recit-thread-list');
    const nav = qs(corps, '.recit-thread') || (liste ? liste.parentNode : null);
    const boutons = liste ? Array.prototype.slice.call(liste.querySelectorAll('.recit-thread-item')) : [];
    if (liste && nav) {
      const consigne = getOrCreate(doc, nav, 'v2-e065-thread-hint', 'span', 'sr-only',
        `Fil de ${boutons.length} point(s) affiché(s) : les flèches haut et bas parcourent les points, Début et Fin vont aux extrémités, Entrée sélectionne le point.`,
        fabriquer);
      if (consigne) {
        sr(consigne);
        ajouteJeton(liste, 'aria-describedby', 'v2-e065-thread-hint');
      }
    }

    /* E065-04 — Repère courant explicité sans toucher aux aria-label existants :
       aria-current posé s'il manque, et description masquée reliée au bouton. */
    if (boutons.length && nav) {
      const courant = boutons.filter((b) => b.classList && b.classList.contains('is-current'))[0];
      if (courant) {
        attrSiAbsent(courant, 'aria-current', 'step');
        const indice = getOrCreate(doc, nav, 'v2-e065-current-hint', 'span', 'sr-only',
          'Point en cours de lecture dans le fil.', fabriquer);
        if (indice) {
          sr(indice);
          ajouteJeton(courant, 'aria-describedby', 'v2-e065-current-hint');
        }
      }
    }

    /* E065-05 — Doublons d'annonce supprimés : le type est déjà énoncé dans
       l'aria-label du bouton, l'étiquette visuelle devient décorative. */
    if (liste) {
      const etiquettes = liste.querySelectorAll('.thread-kind');
      Array.prototype.forEach.call(etiquettes, (etiquette) => {
        attrSiAbsent(etiquette, 'aria-hidden', 'true');
      });
    }

    /* Cibles tactiles portées à 36 px minimum (chantier CSS E065-06 ; filtres, réinitialisation,
       items du fil, résumé de traçabilité). */
    ajouteClasse(layout, 'recit-v2-e065-cibles');

    /* Focus visible renforcé sur les contrôles secondaires (chantier CSS E065-07). */
    ajouteClasse(layout, 'recit-v2-e065-focus');

    /* E065-08 — Statut de filtrage atomique : on ajoute les attributs manquants
       sans écraser le role="status" ni l'aria-live déjà posés par la vue. */
    const statut = doc.getElementById('c3a-status') || qs(corps, '.c3a-status');
    if (statut) {
      attrSiAbsent(statut, 'role', 'status');
      attrSiAbsent(statut, 'aria-live', 'polite');
      attrSiAbsent(statut, 'aria-atomic', 'true');
      attrSiAbsent(statut, 'aria-relevant', 'text');
    }

    /* Aides lisibles : plancher de 10 px et teinte plus contrastée (chantier CSS E065-09). */
    ajouteClasse(layout, 'recit-v2-e065-aides');

    /* Contraste forcé et mouvement réduit (chantier CSS E065-10), lus une fois par rendu. */
    ajouteClasse(layout, 'recit-v2-e065-contraste');
    /* Attribut privé à cette lentille : on peut le rafraîchir à chaque rendu. */
    try {
      layout.setAttribute('data-v2-e065-motion',
        (typeof reducedMotion === 'function' && reducedMotion()) ? 'reduce' : 'normal');
    } catch { /* décor uniquement */ }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
