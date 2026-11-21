import { register } from './registry.js';

/* V2 lentille E039 — Transitions et mouvement (complément de la passe 1).
   Thème repris de la passe 1, mais dix chantiers V2 neufs et distincts :
    01 cadence de lecture chiffrée (dérivée du DOM) ;
    02 sens de parcours et flèche animée ;
    03 recentrage du fil sur le point courant ;
    04 entrée échelonnée des commandes ;
    05 respiration de la pastille de certitude ;
    06 glissement du repère d'étape ;
    07 soulignement animé du titre courant ;
    08 arrivée échelonnée de la légende ;
    09 transition douce du bloc de sources ;
    10 mouvement réduit V2 (neutralisation ciblée).
   Un seul appel register et un seul appel css regroupant toutes les règles.
   Classes préfixées recit-v2-e039-, ids DOM préfixés
   v2-e039- (jamais les ids e039- de la passe 1 qui tourne sur le même DOM).
   Lecture unique de reducedMotion(), gardes d'existence, try/catch global,
   nœuds réutilisés par id (idempotent). Zéro réseau, zéro console, zéro aléa.
   Enrichissement non destructif : sans ce module la vue reste lisible. */

/* Liste unique des éléments animés par cette lentille V2 : sert à générer les
   deux blocs de neutralisation du chantier 10, sans toucher aux autres
   lentilles (ni à celles de la passe 1). */
const CIBLES = [
  '.recit-actions button',
  '.recit-conf',
  '.view-kicker',
  '#recit-point-title',
  '.recit-legend p',
  '.recit-sources',
  '.recit-v2-e039-fleche',
  '.recit-v2-e039-readout',
];

const REDUIT_ATTRIBUT = CIBLES.map((c) => `.recit-v2-e039[data-v2-e039-motion="reduce"] ${c}`).join(',\n  ');
const REDUIT_MEDIA = CIBLES.map((c) => `.recit-v2-e039 ${c}`).join(',\n  ');

const CSS = `
/* E039-01 — Cadence de lecture chiffrée : paragraphe de synthèse lisible. */
.recit-v2-e039-readout{margin:3px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums;transition:opacity .2s linear}

/* E039-02 — Sens de parcours et flèche animée (le mouvement, pas la seule couleur). */
.recit-v2-e039-sens .recit-v2-e039-fleche{display:inline-block;color:var(--gold-bright,#e6b96f);animation:recit-v2-e039-fleche 480ms ease both}
@keyframes recit-v2-e039-fleche{from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:none}}
.recit-v2-e039-sens[data-sens="retour"] .recit-v2-e039-fleche{animation-name:recit-v2-e039-fleche-retour}
@keyframes recit-v2-e039-fleche-retour{from{opacity:0;transform:translateX(5px)}to{opacity:1;transform:none}}

/* E039-03 — Recentrage du fil sur le point courant (marge de défilement). */
.recit-v2-e039 .recit-thread-item.is-current{scroll-margin-block:8px}

/* E039-04 — Entrée échelonnée des commandes. */
.recit-v2-e039 .recit-actions button{animation:recit-v2-e039-cmd 420ms cubic-bezier(.2,.7,.3,1) both}
.recit-v2-e039 .recit-actions button:nth-child(2){animation-delay:60ms}
.recit-v2-e039 .recit-actions button:nth-child(3){animation-delay:120ms}
.recit-v2-e039 .recit-actions button:nth-child(4){animation-delay:180ms}
.recit-v2-e039 .recit-actions button:nth-child(5){animation-delay:240ms}
.recit-v2-e039 .recit-actions button:nth-child(6){animation-delay:300ms}
@keyframes recit-v2-e039-cmd{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* E039-05 — Respiration de la pastille de certitude. */
.recit-v2-e039 .recit-conf{animation:recit-v2-e039-conf 520ms ease-out both}
@keyframes recit-v2-e039-conf{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}

/* E039-06 — Glissement du repère d'étape. */
.recit-v2-e039 .view-kicker{animation:recit-v2-e039-kicker 440ms ease-out both}
@keyframes recit-v2-e039-kicker{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}

/* E039-07 — Soulignement animé du titre courant (trait qui se dessine). */
.recit-v2-e039 #recit-point-title{background-image:linear-gradient(var(--gold-bright,#e6b96f),var(--gold-bright,#e6b96f));background-repeat:no-repeat;background-position:0 100%;background-size:0% 2px;animation:recit-v2-e039-soulignement 620ms ease-out both}
@keyframes recit-v2-e039-soulignement{from{background-size:0% 2px}to{background-size:100% 2px}}

/* E039-08 — Arrivée échelonnée de la légende. */
.recit-v2-e039 .recit-legend p{animation:recit-v2-e039-legende 480ms ease-out both}
.recit-v2-e039 .recit-legend p:nth-child(2){animation-delay:80ms}
.recit-v2-e039 .recit-legend p:nth-child(3){animation-delay:160ms}
.recit-v2-e039 .recit-legend p:nth-child(4){animation-delay:240ms}
@keyframes recit-v2-e039-legende{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}

/* E039-09 — Transition douce du bloc de sources. */
.recit-v2-e039 .recit-sources{animation:recit-v2-e039-sources 560ms ease-out both}
@keyframes recit-v2-e039-sources{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}

/* E039-10 — Mouvement réduit V2 : neutralise uniquement les huit cibles de
   cette lentille, sans toucher aux transitions des autres modules. */
  ${REDUIT_ATTRIBUT}{animation:none!important;transition:none!important;scroll-behavior:auto!important}
.recit-v2-e039[data-v2-e039-motion="reduce"] #recit-point-title{background-size:100% 2px}
@media (prefers-reduced-motion:reduce){
  ${REDUIT_MEDIA}{animation:none!important;transition:none!important;scroll-behavior:auto!important}
  .recit-v2-e039 #recit-point-title{background-size:100% 2px}
}
`;

/* Dernier numéro d'étape vu, conservé entre deux rendus (le module n'est pas
   rechargé quand la coque reconstruit le DOM). Sert aux chantiers 02 et 03. */
let dernierIndex = null;

register('E039', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e039', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');

    /* Ajoute une classe sans jamais écraser les autres classes du nœud. */
    const ajouteClasse = (noeud, nom) => {
      if (noeud && noeud.classList && typeof noeud.classList.contains === 'function'
          && !noeud.classList.contains(nom)) noeud.classList.add(nom);
    };

    /* Dépose (ou réutilise) un paragraphe visible, à un emplacement stable. */
    const placeParagraphe = (id, classe, parent, ancre, texte) => {
      if (!parent || typeof parent.insertBefore !== 'function') return null;
      let noeud = document.getElementById(id);
      if (!noeud) {
        noeud = el('p', `recit-v2-e039-readout ${classe}`);
        noeud.id = id;
      }
      noeud.textContent = texte;
      const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
      if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
        parent.insertBefore(noeud, cible);
      }
      return noeud;
    };

    /* Ancre posée sur la layout : tous les sélecteurs CSS en dépendent. */
    ajouteClasse(layout, 'recit-v2-e039');

    /* E039-10 — une seule lecture de la préférence par rendu, dans un try/catch.
       L'attribut est propre à la V2 (data-v2-e039-motion), distinct de
       data-e039-motion de la passe 1. */
    let reduit = false;
    try {
      reduit = !!(reducedMotion && typeof reducedMotion === 'function' && reducedMotion());
    } catch {
      reduit = false;
    }
    layout.setAttribute('data-v2-e039-motion', reduit ? 'reduce' : 'normal');

    if (!corps || typeof corps.querySelector !== 'function') return;

    const kicker = corps.querySelector('.view-kicker');
    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const contexte = document.getElementById('recit-context') || corps.querySelector('.recit-context');
    const timing = corps.querySelector('.recit-timing');
    const thread = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');

    /* Numéro d'étape lu dans le kicker réel « Étape X / Y ». */
    let index = null;
    let total = null;
    if (kicker) {
      const trouve = (kicker.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
      if (trouve) {
        index = parseInt(trouve[1], 10);
        total = parseInt(trouve[2], 10);
      }
    }
    const precedent = dernierIndex;

    /* E039-01 — cadence de lecture : mots comptés dans le texte réel et
       secondes lues dans .recit-timing. Aucune valeur n'est inventée. */
    if (timing && titre) {
      const trouve = (timing.textContent || '').match(/≈\s*(\d+)\s*s/);
      if (trouve) {
        const secondes = parseInt(trouve[1], 10);
        const texteBrut = ((titre.textContent || '') + ' ' + (contexte ? (contexte.textContent || '') : '')).trim();
        const mots = texteBrut ? texteBrut.split(/\s+/).filter(Boolean).length : 0;
        if (secondes > 0 && mots > 0) {
          const cadence = Math.round((mots * 60) / secondes);
          placeParagraphe('v2-e039-cadence', 'recit-v2-e039-cadence', corps, timing,
            `Cadence de lecture : ≈ ${cadence} mots/min (${mots} mots en ${secondes} s).`);
        }
      }
    }

    /* E039-02 — sens de parcours déduit de la comparaison avec l'étape
       précédente ; la flèche est décorative (aria-hidden), le chiffre est
       dans le texte visible. */
    if (index !== null) {
      let sens = 'Départ';
      let fleche = '•';
      let code = 'depart';
      if (precedent !== null) {
        if (index > precedent) { sens = 'Suite'; fleche = '→'; code = 'suite'; }
        else if (index < precedent) { sens = 'Retour'; fleche = '←'; code = 'retour'; }
        else { sens = 'Point inchangé'; fleche = '•'; code = 'inchange'; }
      }
      const ancre = kicker || titre || corps.firstChild;
      const paragraphe = placeParagraphe('v2-e039-sens', 'recit-v2-e039-sens', corps, ancre,
        `Parcours : ${sens} · étape ${index}${total !== null ? ' / ' + total : ''}.`);
      if (paragraphe) {
        const ornement = document.createElement('span');
        ornement.className = 'recit-v2-e039-fleche';
        ornement.setAttribute('aria-hidden', 'true');
        ornement.textContent = fleche + ' ';
        paragraphe.insertBefore(ornement, paragraphe.firstChild);
        paragraphe.setAttribute('data-sens', code);
      }
    }

    /* E039-03 — recentrage du fil sur l'item courant, seulement quand
       l'étape change (ou au premier rendu). Purement positionnel : aucun
       état du store n'est modifié. */
    if (thread && index !== null && typeof thread.querySelector === 'function') {
      const courant = thread.querySelector('.recit-thread-item.is-current');
      if (courant && (precedent === null || index !== precedent)
          && typeof courant.scrollIntoView === 'function') {
        try {
          courant.scrollIntoView({
            block: 'nearest',
            inline: 'nearest',
            behavior: reduit ? 'auto' : 'smooth',
          });
        } catch {
          /* Commande facilitatrice : un échec ne casse jamais le rendu. */
        }
      }
    }

    dernierIndex = index;

    /* E039-04 à E039-09 : la feuille de style posée plus haut pilote ces six
       chantiers via l'ancre .recit-v2-e039 ; les nœuds ciblés (commandes,
       pastille de certitude, kicker, titre, légende, sources) ne sont ni
       retirés ni réécrits. */

  } catch {
    /* Lentille facilitatrice : neutralisée sans jamais interrompre le rendu. */
  }
});
