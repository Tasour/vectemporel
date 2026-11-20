import { register } from './registry.js';

/* V2 lentille E074 — Signalétique et cartographie clavier (vue Récit).
 *
 * La passe 1 d'E074 porte sur la robustesse de la navigation (contour de focus,
 * taille des cibles, bandeau d'indices, ancre vers les commandes, reprise du
 * focus, accès clavier aux sources et au corps, marqueur du point courant,
 * annonce de zone). Cette passe V2 propose DIX chantiers neufs et distincts,
 * tous centrés sur la LISIBILITÉ DES AFFORDANCES CLAVIER : badges de raccourci,
 * infobulles, carte des touches réellement déclarées, compteurs, parcours
 * numéroté, ancre vers le fil, touches du fil, marges de défilement, contraste
 * forcé et mouvement réduit.
 *
 * Greffon strictement additif et non destructif : une seule feuille de style
 * injectée une fois par le registre, aucun texte existant réécrit, aucun nœud
 * d'origine retiré, aucun gestionnaire existant modifié. Sans JavaScript, le
 * récit reste intégralement lisible et navigable.
 *
 * Conventions : classes préfixées recit-v2-e074-, ids DOM préfixés v2-e074- et
 * uniques (jamais un id e074- de la passe 1 qui tourne sur le MÊME DOM),
 * attributs data-v2-e074-* réservés à cette lentille. Zéro console, zéro réseau,
 * zéro aléa, aucun fichier partagé modifié. Chaque chantier est isolé : une
 * défaillance locale ne provoque jamais de throw et ne casse jamais le rendu.
 */

const CSS = `
/* E074-01 — badges de raccourci sur les commandes. */
.recit-v2-e074-racine .recit-actions button .recit-v2-e074-kbd{
  display:inline-block;min-width:16px;margin-left:6px;padding:1px 4px;
  border:1px solid var(--line-strong,#5c6470);border-radius:4px;
  background:rgba(255,255,255,.05);color:var(--gold-bright,#f5e9d0);
  font:inherit;font-size:8px;line-height:1.4;vertical-align:middle;
}
/* E074-02 — infobulles : pointeur d'aide sur les commandes portant un titre. */
.recit-v2-e074-racine .recit-actions button[title]{cursor:help}
/* E074-03 — carte des raccourcis réellement déclarés dans la vue. */
.recit-v2-e074-keys{margin:6px 0 0;color:var(--muted,#9aa4b2);font-size:9px;line-height:1.5}
/* E074-04 — compteur de commandes clavier. */
.recit-v2-e074-count{margin:6px 0 0;color:var(--muted,#9aa4b2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}
/* E074-05 — parcours clavier numéroté. */
.recit-v2-e074-taborder{margin:8px 0 0;padding-left:20px;color:var(--muted,#9aa4b2);font-size:9px;line-height:1.6}
.recit-v2-e074-taborder li{margin:2px 0}
/* E074-06 — lien d'évitement natif vers le fil du repère. */
.recit-v2-e074-skip{
  position:absolute;left:-9999px;top:6px;z-index:61;
  padding:8px 12px;border:1px solid var(--gold,#e6b96f);border-radius:8px;
  background:var(--surface-2,#2b2f35);color:var(--gold-bright,#f5e9d0);
  font-size:11px;text-decoration:none;
}
.recit-v2-e074-skip:focus{left:8px;top:8px}
/* E074-07 — repère de fil muni de ses touches déclarées. */
.recit-v2-e074-racine .recit-v2-e074-fil .recit-thread-title{letter-spacing:.1em}
/* E074-08 — marges de défilement des cibles d'ancre. */
.recit-v2-e074-racine #c3a-thread,
.recit-v2-e074-racine .recit-actions,
.recit-v2-e074-racine #recit-point-title{scroll-margin-block:10px}
/* E074-09 — contraste forcé des badges (distinct du contour de focus). */
@media (forced-colors:active){
  .recit-v2-e074-kbd{forced-color-adjust:none;border-color:Highlight;color:Highlight}
}
/* E074-10 — mouvement réduit des seules synthèses introduites ici. */
.recit-v2-e074-readout{transition:opacity .18s linear}
.recit-v2-e074-racine[data-v2-e074-motion="reduce"] .recit-v2-e074-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e074-readout{transition:none}}
@media (max-width:620px){
  .recit-v2-e074-keys,.recit-v2-e074-count,.recit-v2-e074-taborder{font-size:10px}
}
`;

/* Traduction des seules touches réellement présentes dans les attributs
   aria-keyshortcuts de la vue (recit.js) : aucune touche n'est inventée. */
const GLYPHES = {
  ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
  Space: 'Espace', Enter: 'Entrée', Escape: 'Échap',
  Home: 'Début', End: 'Fin', Tab: 'Tab',
};

function present(node) {
  return !!(node && node.nodeType === 1);
}

function marquer(node, classe) {
  if (present(node) && node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(classe)) node.classList.add(classe);
}

function attrSiAbsent(node, nom, valeur) {
  if (!present(node) || typeof node.hasAttribute !== 'function' || node.hasAttribute(nom)) return;
  try { node.setAttribute(nom, String(valeur)); } catch { /* attribut facultatif */ }
}

function touche(code) {
  const cle = String(code || '').trim();
  if (Object.prototype.hasOwnProperty.call(GLYPHES, cle)) return GLYPHES[cle];
  const chiffre = cle.match(/^Digit(\d)$/);
  return chiffre ? chiffre[1] : cle;
}

function codesDe(noeud) {
  if (!present(noeud) || typeof noeud.getAttribute !== 'function') return [];
  return String(noeud.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
}

function enfantDeClasse(parent, classe) {
  if (!present(parent) || !parent.children) return null;
  for (let i = 0; i < parent.children.length; i += 1) {
    const enfant = parent.children[i];
    if (present(enfant) && enfant.classList && enfant.classList.contains(classe)) return enfant;
  }
  return null;
}

function court(texte, max) {
  const valeur = String(texte || '').replace(/\s+/g, ' ').trim();
  return valeur.length > max ? `${valeur.slice(0, max - 1).trimEnd()}…` : valeur;
}

/* Dépose (ou réutilise) un nœud de synthèse possédé par cette lentille.
   Le nœud est toujours un élément visible inséré au même endroit, même après
   reconstruction du DOM par la coque : aucun doublon d'id n'est possible. */
function depot(el, id, classe, parent, ancre, tag, remplir) {
  if (typeof el !== 'function' || !present(parent) || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud || noeud.parentNode !== parent) {
    noeud = el(tag, classe);
    noeud.id = id;
  }
  try { remplir(noeud); } catch { /* synthèse facultative */ }
  const cible = present(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent) parent.insertBefore(noeud, cible);
  else if (cible ? noeud.nextSibling !== cible : noeud !== parent.lastChild) parent.insertBefore(noeud, cible);
  return noeud;
}

register('E074', (ctx) => {
  /* Isolateur global : aucune défaillance ne peut atteindre la coque. */
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { layout, css, el, reducedMotion } = ctx;
    if (!present(layout) || typeof layout.querySelector !== 'function') return;

    /* Une seule feuille, injectée une fois par le registre (cssOnce). */
    if (typeof css === 'function') css('recit-v2-e074', CSS);

    const corps = layout.querySelector('.recit-body');
    if (!present(corps)) return;
    marquer(layout, 'recit-v2-e074-racine');

    const actions = corps.querySelector('.recit-actions');
    const boutons = actions ? Array.prototype.slice.call(actions.querySelectorAll('button')) : [];
    const boutonsRacc = boutons.filter((bouton) => bouton.hasAttribute
      && bouton.hasAttribute('aria-keyshortcuts'));
    const legend = corps.querySelector('.recit-legend');

    /* E074-01 — un badge <kbd> par commande à raccourci ; le libellé de la
       touche est lu dans aria-keyshortcuts, le badge est purement décoratif. */
    boutonsRacc.forEach((bouton) => {
      const codes = codesDe(bouton);
      if (!codes.length) return;
      const glyc = touche(codes[0]);
      let kbd = enfantDeClasse(bouton, 'recit-v2-e074-kbd');
      if (!kbd && typeof el === 'function') {
        kbd = el('kbd', 'recit-v2-e074-kbd');
        kbd.setAttribute('aria-hidden', 'true');
        bouton.appendChild(kbd);
      }
      if (kbd && kbd.textContent !== glyc) kbd.textContent = glyc;
      marquer(bouton, 'recit-v2-e074-cmd');
    });

    /* E074-02 — l'infobulle n'est posée que si la coque n'a pas déjà mis de
       titre (ex. bouton de lecture) : aucun attribut existant n'est écrasé. */
    boutonsRacc.forEach((bouton) => {
      const codes = codesDe(bouton);
      if (!codes.length || bouton.hasAttribute('title')) return;
      bouton.setAttribute('title', `Raccourci clavier : ${codes.map(touche).join(' · ')}`);
    });

    /* E074-03 — carte des touches réellement déclarées, déduites des attributs
       aria-keyshortcuts présents dans le corps ; aucun chiffre inventé. */
    const tousCodes = [];
    Array.prototype.forEach.call(corps.querySelectorAll('[aria-keyshortcuts]'), (noeud) => {
      codesDe(noeud).forEach((code) => { if (tousCodes.indexOf(code) === -1) tousCodes.push(code); });
    });
    if (tousCodes.length && typeof el === 'function') {
      const texte = `Raccourcis déclarés : ${tousCodes.map((code) => `${touche(code)} (${code})`).join(' · ')} · ${tousCodes.length} au total.`;
      depot(el, 'v2-e074-keys', 'recit-v2-e074-readout recit-v2-e074-keys',
        corps, legend, 'p', (noeud) => {
          if (noeud.textContent !== texte) noeud.textContent = texte;
        });
    }

    /* E074-04 — compteurs lus sur les boutons réels des commandes. */
    if (actions && typeof el === 'function') {
      const disponibles = boutons.filter((bouton) => !bouton.disabled).length;
      const avecRaccourci = boutonsRacc.length;
      const texte = `Commandes du récit : ${boutons.length} boutons · ${avecRaccourci} avec raccourci · ${disponibles} disponibles.`;
      depot(el, 'v2-e074-count', 'recit-v2-e074-readout recit-v2-e074-count',
        corps, actions, 'p', (noeud) => {
          if (noeud.textContent !== texte) noeud.textContent = texte;
        });
    }

    /* E074-05 — liste ordonnée des contrôles utilisables au clavier, dans
       l'ordre du DOM ; les noms viennent des aria-label/title/textes réels.
       Les nœuds possédés par cette lentille sont exclus pour éviter toute
       auto-référence. Liste plafonnée à 40 entrées pour rester légère. */
    if (typeof el === 'function') {
      const selecteur = 'button:not([disabled]), input:not([disabled]), summary, a[href], [tabindex="0"]';
      const contrôles = Array.prototype.filter.call(corps.querySelectorAll(selecteur), (noeud) => {
        if (!present(noeud)) return false;
        return !(noeud.id && noeud.id.indexOf('v2-e074-') === 0);
      });
      const limite = 40;
      const visibles = contrôles.slice(0, limite);
      depot(el, 'v2-e074-taborder', 'recit-v2-e074-readout recit-v2-e074-taborder',
        corps, legend, 'ol', (noeud) => {
          while (noeud.firstChild) noeud.removeChild(noeud.firstChild);
          visibles.forEach((controle, i) => {
            const brut = controle.getAttribute && controle.getAttribute('aria-label')
              ? controle.getAttribute('aria-label')
              : (controle.title || controle.textContent);
            const nom = court(brut, 80) || 'Contrôle sans libellé';
            noeud.appendChild(el('li', '', `${i + 1}. ${nom}`));
          });
          if (contrôles.length > limite) {
            noeud.appendChild(el('li', '', `… et ${contrôles.length - limite} autres contrôles.`));
          }
        });
    }

    /* E074-06 — ancre native vers le fil : le lien ressemble au lien
       d'évitement de la passe 1 mais vise une cible distincte. Aucun
       gestionnaire de clic n'est ajouté. */
    const fil = corps.querySelector('#c3a-thread') || corps.querySelector('.recit-thread-list');
    if (fil && typeof el === 'function') {
      if (!fil.id) fil.id = 'v2-e074-fil-cible';
      attrSiAbsent(fil, 'tabindex', '-1');
      if (!document.getElementById('v2-e074-skip-thread')) {
        const lien = el('a', 'recit-v2-e074-skip', 'Aller au fil du repère');
        lien.id = 'v2-e074-skip-thread';
        lien.href = `#${fil.id}`;
        lien.setAttribute('aria-label', 'Aller au fil du récit');
        corps.insertBefore(lien, corps.firstChild);
      }
    }

    /* E074-07 — les touches du fil ne sont déclarées que si la légende réelle
       les mentionne (↑ ↓ Début/Fin) : aucune touche n'est supposée. */
    const navFil = corps.querySelector('nav.recit-thread')
      || (fil && present(fil.parentElement) && fil.parentElement.classList
        && fil.parentElement.classList.contains('recit-thread') ? fil.parentElement : null);
    if (navFil) {
      const legendeTexte = String((legend && legend.textContent) || '');
      if (/↑/.test(legendeTexte) && /↓/.test(legendeTexte)
          && /Début/.test(legendeTexte) && /Fin/.test(legendeTexte)) {
        attrSiAbsent(navFil, 'aria-keyshortcuts', 'ArrowUp ArrowDown Home End');
        marquer(navFil, 'recit-v2-e074-fil');
      }
    }

    /* E074-08 — marges de défilement des cibles d'ancre : règle CSS seule,
       afin qu'un saut au clavier ne masque pas la cible sous un en-tête. */
    /* E074-09 — contraste forcé des badges : règle @media CSS seule, distincte
       du contour de focus renforcé par la passe 1. */

    /* E074-10 — mouvement réduit, lu une fois par rendu ; l'attribut est propre
       à la V2 et ne remplace pas data-e074-motion de la passe 1. */
    let mouvement = 'normal';
    try {
      mouvement = reducedMotion && typeof reducedMotion === 'function' && reducedMotion()
        ? 'reduce' : 'normal';
    } catch { mouvement = 'normal'; }
    layout.setAttribute('data-v2-e074-motion', mouvement);
  } catch {
    /* Une lentille défaillante ne casse jamais le rendu de la vue. */
  }
});
