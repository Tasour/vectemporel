import { register } from './registry.js';

/* V2 lentille E064 — Navigation clavier (complément de la passe 1).
   Thème repris de la passe 1, mais dix chantiers V2 neufs et distincts :
   badges de touches visibles, liens d'évitement, raccourcis « n », Début/Fin,
   Échap local dans la barre d'outils, témoin de touche, accessibilité des
   contrôles ajoutés, mouvement réduit et garde de sécurité partagée.
   La passe 1 (E064-01 … E064-10) couvrait l'aide intégrée, J/K,
   PageDown/PageUp, « / », « f », Échap dans le fil, « d », les repères de
   focus, aria-keyshortcuts et « 0 ». Rien ici ne recouvre ces chantiers.
   Préfixes : classes recit-v2-e064-, ids DOM v2-e064- (jamais les ids e064-
   de la passe 1 qui tourne sur le même DOM). Non destructif : sans ce module
   la vue reste intégralement lisible et utilisable. Zéro réseau/console/aléa. */

const CSS = `
/* E064-01 — Badges de touches visibles, dérivés de aria-keyshortcuts réels. */
.recit-v2-e064-badge{display:inline-block;min-width:16px;margin-left:6px;padding:0 4px;border:1px solid var(--line-strong,rgba(255,255,255,.25));border-radius:4px;color:var(--gold-bright,#f5e9d0);font-size:8px;line-height:14px;text-align:center;font-variant-numeric:tabular-nums;vertical-align:middle}
.recit-v2-e064-badge[aria-hidden="true"]{pointer-events:none}

/* E064-02 — Lien d'évitement « Aller au fil du repère ». */
.recit-v2-e064-skips{display:flex;flex-wrap:wrap;gap:4px;margin:0 0 10px}
.recit-v2-e064-skip{display:inline-flex;align-items:center;min-height:36px;padding:0 10px;border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;color:var(--gold-bright,#f5e9d0);font-size:10px;text-decoration:none}
.recit-v2-e064-skip:hover{text-decoration:underline}

/* E064-03 — Lien d'évitement « Revenir au titre du point ». */
.recit-v2-e064-skip:focus-visible{outline:3px double var(--gold-bright,#f5e9d0);outline-offset:2px}
@supports not selector(:focus-visible){.recit-v2-e064-skip:focus{outline:3px double var(--gold-bright,#f5e9d0);outline-offset:2px}}

/* E064-07 — Témoin visible de la dernière commande clavier V2. */
.recit-v2-e064-temo{margin:4px 0 8px;color:var(--muted-2,#9aa4b2);font-size:9px;line-height:1.5}

/* E064-08 — Accessibilité des contrôles ajoutés (cibles, focus, décoratif). */
.recit-v2-e064-temo.recit-v2-e064-flash{animation:recit-v2-e064-pulse .32s ease-out}
@keyframes recit-v2-e064-pulse{0%{opacity:.35}100%{opacity:1}}

/* E064-09 — Confort : mouvement réduit des éléments V2. */
.recit-v2-e064-temo{transition:opacity .18s linear}
.recit-layout[data-v2-e064-motion="reduce"] .recit-v2-e064-temo{transition:none;animation:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e064-temo{transition:none;animation:none}}

/* E064-10 — Garde partagée : un seul écouteur, aucune règle visuelle de plus. */
`;

let ecouteurInstalle = false;

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function estEditable(noeud) {
  if (!noeud || noeud.nodeType !== 1) return false;
  if (noeud.isContentEditable) return true;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(noeud.tagName);
}

function estDans(layout, noeud) {
  return Boolean(noeud && noeud.closest && layout && noeud.closest('.recit-layout'));
}

function focaliser(noeud, sansDefilement) {
  if (!noeud || typeof noeud.focus !== 'function') return;
  try { noeud.focus({ preventScroll: Boolean(sansDefilement) }); }
  catch { try { noeud.focus(); } catch { /* neutralisé */ } }
}

function controle(layout, fk) {
  if (!layout || typeof layout.querySelector !== 'function') return null;
  return layout.querySelector(`[data-fk="${fk}"]`);
}

function titre(layout) {
  if (!layout || typeof layout.querySelector !== 'function') return null;
  return layout.querySelector('#recit-point-title') || layout.querySelector('.recit-title');
}

function activer(bouton) {
  if (!bouton || bouton.disabled || typeof bouton.click !== 'function') return;
  try { bouton.click(); } catch { /* neutralisé */ }
}

function libelleTouche(token) {
  const table = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓',
    Space: 'Espace', Enter: '↵', Escape: 'Échap', Home: 'Début', End: 'Fin',
    PageDown: 'Page↓', PageUp: 'Page↑', Digit4: '4',
  };
  return table[token] || token;
}

function identifiantBadge(fk) {
  return `v2-e064-badge-${String(fk).replace(/[^a-z0-9_-]/gi, '-')}`;
}

/* E064-01 — les badges reprennent exactement les jetons aria-keyshortcuts
   déjà portés par les commandes (ceux de la passe 1 inclus). Aucune touche
   n'est inventée. Le nœud est réutilisé par id après chaque reconstruction. */
function poserBadges(layout, el) {
  if (!layout || typeof layout.querySelectorAll !== 'function') return;
  const porteurs = layout.querySelectorAll('[aria-keyshortcuts]');
  Array.prototype.forEach.call(porteurs, (noeud) => {
    const jetons = (noeud.getAttribute('aria-keyshortcuts') || '').split(/\s+/).filter(Boolean);
    if (!jetons.length) return;
    const fk = noeud.getAttribute('data-fk') || noeud.tagName.toLowerCase();
    const id = identifiantBadge(fk);
    if (document.getElementById(id)) return; /* idempotent */
    const badge = el('span', 'recit-v2-e064-badge', jetons.map(libelleTouche).join(' '));
    badge.id = id;
    /* E064-08 — simple doublon visuel d'une touche déjà annoncée : décoratif. */
    badge.setAttribute('aria-hidden', 'true');
    if (noeud.tagName === 'INPUT' || noeud.tagName === 'TEXTAREA') {
      if (noeud.parentNode) noeud.parentNode.insertBefore(badge, noeud.nextSibling);
    } else {
      noeud.appendChild(badge);
    }
  });
}

/* E064-07 — paragraphe visible (aucune région live supplémentaire n'est créée :
   le récit annonce déjà le point via #atlas-recit-live et #c3a-status). */
function direTemo(texte) {
  const noeud = document.getElementById('v2-e064-temo');
  if (!noeud) return;
  noeud.textContent = texte;
  /* E064-09 — relance déterministe de l'animation, sans aléa ni horodatage. */
  noeud.classList.remove('recit-v2-e064-flash');
  void noeud.offsetWidth;
  ajouteClasse(noeud, 'recit-v2-e064-flash');
}

function poserTemo(corps, el) {
  if (!corps || typeof corps.insertBefore !== 'function') return;
  let noeud = document.getElementById('v2-e064-temo');
  if (!noeud) {
    noeud = el('p', 'recit-v2-e064-temo',
      'Raccourcis V2 disponibles : n (repère suivant), Début/Fin depuis le titre, Échap dans les filtres.');
    noeud.id = 'v2-e064-temo';
  }
  let ancre = corps.querySelector('.c3a-status');
  if (!ancre) ancre = corps.querySelector('#c3a-tools');
  const cible = ancre && ancre.parentNode === corps ? ancre.nextSibling : null;
  if (noeud.parentNode !== corps || (cible && noeud.nextSibling !== cible)) {
    corps.insertBefore(noeud, cible);
  }
}

/* E064-02 et E064-03 — deux liens d'évitement placés en tête du corps :
   ils déplacent le focus, jamais le contenu, et restent utilisables sans JS
   grâce à leur href. La cible du fil est lue dans le DOM réel au clic. */
function poserLiensEvitement(corps, el) {
  if (!corps || typeof corps.insertBefore !== 'function') return;
  let barre = document.getElementById('v2-e064-skips');
  if (!barre) {
    barre = el('div', 'recit-v2-e064-skips');
    barre.id = 'v2-e064-skips';

    const fil = el('a', 'recit-v2-e064-skip', 'Aller au fil du repère');
    fil.id = 'v2-e064-skip-thread';
    fil.href = '#c3a-thread';
    fil.addEventListener('click', (event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      const layout = fil.closest('.recit-layout');
      if (!layout || typeof layout.querySelector !== 'function') return;
      const item = layout.querySelector('#c3a-thread [aria-current="step"]')
        || layout.querySelector('#c3a-thread .c3a-thread-item');
      if (!item) return;
      focaliser(item, false);
      direTemo('Lien d’évitement : fil du repère.');
    });

    const retour = el('a', 'recit-v2-e064-skip', 'Revenir au titre du point');
    retour.id = 'v2-e064-skip-title';
    retour.href = '#recit-point-title';
    retour.addEventListener('click', (event) => {
      if (event.defaultPrevented) return;
      event.preventDefault();
      const layout = retour.closest('.recit-layout');
      focaliser(titre(layout), false);
      direTemo('Lien d’évitement : titre du point.');
    });

    barre.appendChild(fil);
    barre.appendChild(retour);
  }
  if (barre.parentNode !== corps || barre !== corps.firstChild) {
    corps.insertBefore(barre, corps.firstChild);
  }
}

/* E064-10 — garde partagée par tous les raccourcis V2 : un seul écouteur,
   jamais de modificateur, jamais hors de la vue, jamais dans un champ.
   event.defaultPrevented protège les gestionnaires locaux déjà passés. */
function peutAgir(event, layout, cible) {
  if (!event || event.defaultPrevented) return false;
  if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return false;
  if (!estDans(layout, cible) || estEditable(cible)) return false;
  return typeof event.key === 'string' && event.key.length > 0;
}

/* E064-04, E064-05, E064-06 et E064-10 — écouteur unique, armé une seule fois
   en capture sur window : la capture précède le routeur global (document) et
   les gestionnaires locaux installés par la vue. */
function installerEcouteur() {
  if (ecouteurInstalle || typeof window === 'undefined') return;
  ecouteurInstalle = true;
  window.addEventListener('keydown', (event) => {
    try {
      const layout = document.querySelector('.recit-layout');
      if (!layout || typeof layout.querySelector !== 'function') return;
      const cible = event.target;
      const touche = typeof event.key === 'string' ? event.key : '';
      if (!touche || event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;

      /* E064-06 — Échap local dans la barre d'outils (recherche et filtres).
         Le routeur global ramènerait au monde ; ici on reste dans le récit.
         La recherche est volontairement exclue de peutAgir() pour ce cas. */
      if (touche === 'Escape') {
        if (!estDans(layout, cible) || !cible.closest) return;
        const outils = cible.closest('#c3a-tools, .c3a-tools');
        if (!outils) return;
        event.preventDefault();
        event.stopPropagation();
        try { if (estEditable(cible) && typeof cible.blur === 'function') cible.blur(); }
        catch { /* neutralisé */ }
        focaliser(titre(layout), false);
        direTemo('Échap : retour au titre du point.');
        return;
      }

      if (!peutAgir(event, layout, cible)) return;
      const bas = touche.toLowerCase();
      const actif = document.activeElement;

      /* E064-04 — « n » : repère suivant, via la commande réelle. */
      if (bas === 'n') {
        const bouton = controle(layout, 'c3a-next-event');
        if (!bouton || bouton.disabled) return;
        event.preventDefault();
        event.stopPropagation();
        activer(bouton);
        direTemo('Commande clavier : repère suivant (n).');
        return;
      }

      /* E064-05 — Début/Fin depuis le titre seulement : premiers et dernier
         points affichés. Ailleurs, Home/End gardent leur rôle d'origine. */
      if (touche === 'Home' || touche === 'End') {
        const t = titre(layout);
        const surTitre = t && (actif === t
          || (actif && actif.classList && actif.classList.contains('recit-title')));
        if (!surTitre) return;
        let cibleFinale = null;
        if (touche === 'Home') {
          cibleFinale = controle(layout, 'c3a-restart');
        } else {
          const items = layout.querySelectorAll('#c3a-thread .c3a-thread-item');
          if (!items.length) return;
          cibleFinale = items[items.length - 1];
        }
        if (!cibleFinale || cibleFinale.disabled) return;
        event.preventDefault();
        event.stopPropagation();
        activer(cibleFinale);
        direTemo(touche === 'Home'
          ? 'Commande clavier : premier point (Début).'
          : 'Commande clavier : dernier point affiché (Fin).');
        return;
      }
    } catch { /* neutralisé : aucun raccourci V2 ne casse la vue */ }
  }, true);
}

register('E064', (ctx) => {
  const { layout, stage, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined') return;
    const racine = layout || stage;
    if (!racine || typeof racine.querySelector !== 'function') return;

    css('recit-v2-e064', CSS); /* un seul appel, toutes les règles du module. */

    /* E064-09 — préférence lue une fois par rendu, attribut propre à la V2. */
    let mouvement = false;
    try { mouvement = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { mouvement = false; }
    racine.setAttribute('data-v2-e064-motion', mouvement ? 'reduce' : 'normal');

    poserBadges(racine, el); /* E064-01 */
    const corps = racine.querySelector('.recit-body');
    if (corps) {
      poserLiensEvitement(corps, el); /* E064-02 / E064-03 */
      poserTemo(corps, el); /* E064-07 */
    }
    installerEcouteur(); /* E064-04 / E064-05 / E064-06 / E064-10 */
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
