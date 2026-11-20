import { register } from './registry.js';

/* V2 lentille E094 — Orientation et aide à la navigation clavier (complément
   de la passe 1 « Navigation clavier »). Dix chantiers V2 neufs et distincts :
   E094-01 à E094-10. La passe 1 traite déjà [ ], PageUp/PageDown, la barre
   ARIA, Échap, `/`, n, p, la consigne dans la légende, le focus visible des
   cibles d'origine et l'arrêt de la lecture ; la V2 apporte un lien
   d'évitement, une aide commutable, cinq raccourcis mnémotechniques, un
   bandeau d'état textuel, des `aria-keyshortcuts` complétés et le confort
   mouvement réduit de ses propres éléments. Tout est non destructif : sans ce
   module, la vue reste intégralement lisible et navigable.
   Préfixes : classes recit-v2-e094-, ids DOM v2-e094- (jamais les ids e094-
   de la passe 1, qui tourne sur le même DOM). Zéro réseau, zéro console,
   zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E094-01 — Lien d'évitement « Aller au point courant » : masqué hors focus. */
.recit-v2-e094-skip{
  position:fixed;top:-52px;left:12px;z-index:60;
  display:inline-flex;align-items:center;min-height:36px;padding:0 12px;
  border:1px solid var(--gold,#e6b96f);border-radius:8px;
  background:var(--panel,#10151b);color:var(--gold-bright,#f5e9d0);
  font:inherit;font-size:10px;text-decoration:none;
}
.recit-v2-e094-skip:focus{top:12px}

/* E094-02 — Aide clavier : bouton d'appel et panneau rétractable. */
.recit-v2-e094-help-toggle{
  min-height:36px;margin:8px 0 4px;padding:4px 12px;
  border:1px solid var(--line-strong,rgba(255,255,255,.2));border-radius:8px;
  background:transparent;color:var(--gold-bright,#f5e9d0);
  font:inherit;font-size:10px;cursor:pointer;
}
.recit-v2-e094-help{
  margin:0 0 8px;padding:8px 10px;
  border:1px solid var(--line,rgba(255,255,255,.12));border-radius:8px;
  background:rgba(255,255,255,.03);color:var(--muted,#a9a9a9);
  font-size:10px;line-height:1.6;
}
.recit-v2-e094-help[hidden]{display:none}
.recit-v2-e094-help-intro{margin:0 0 4px}
.recit-v2-e094-help-list{margin:0;padding-left:18px}
.recit-v2-e094-help-list li{margin:2px 0}

/* E094-03 — Raccourci f : aucun style dédié, comportement en JS. */
/* E094-04 — Raccourci t : aucun style dédié, comportement en JS. */
/* E094-05 — Raccourci h : aucun style dédié, comportement en JS. */
/* E094-06 — Raccourci 0 : aucun style dédié, comportement en JS. */
/* E094-07 — Raccourci e : aucun style dédié, comportement en JS. */

/* E094-08 — Bandeau d'état textuel des raccourcis V2. */
.recit-v2-e094-status{
  min-height:12px;margin:4px 0 6px;color:var(--muted,#a9a9a9);
  font-size:9px;line-height:1.4;font-variant-numeric:tabular-nums;
}

/* E094-09 — aria-keyshortcuts complétés : attributs, aucun style. */

/* E094-10 — Focus visible et mouvement réduit des seules cibles V2. */
.recit-v2-e094-skip:focus-visible,
.recit-v2-e094-help-toggle:focus-visible{
  outline:2px solid var(--gold-bright,#f5e9d0);outline-offset:3px;
  box-shadow:0 0 0 4px rgba(230,185,111,.18);
}
.recit-v2-e094-help-list{transition:opacity .18s linear}
[data-v2-e094-motion="reduce"] .recit-v2-e094-help-list{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e094-help-list{transition:none}}
@media (max-width:620px){
  .recit-v2-e094-help-toggle{min-height:40px}
  .recit-v2-e094-help-list li{font-size:9px}
}
`;

/* ---------- Utilitaires défensifs ---------- */

function securise(action) {
  try { if (typeof action === 'function') action(); }
  catch { /* une lentille défaillante ne doit jamais casser le rendu */ }
}

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function attributSiAbsent(noeud, nom, valeur) {
  if (noeud && noeud.nodeType === 1 && typeof noeud.hasAttribute === 'function'
      && !noeud.hasAttribute(nom)) noeud.setAttribute(nom, valeur);
}

function estEditable(noeud) {
  if (!noeud || noeud.nodeType !== 1 || typeof noeud.closest !== 'function') return false;
  return Boolean(noeud.closest('input, textarea, select, [contenteditable="true"]'));
}

function poseFocus(noeud) {
  if (!noeud || typeof noeud.focus !== 'function') return false;
  try { noeud.focus({ preventScroll: true }); return true; }
  catch {
    try { noeud.focus(); return true; }
    catch { return false; }
  }
}

/* Réutilise un nœud déjà inséré (unicité de l'id) et le replace juste après
   son ancre, sans toucher aux autres enfants du parent. */
function placeApres(id, fabrique, parent, ancre) {
  if (!parent || typeof parent.insertBefore !== 'function') return null;
  let noeud = document.getElementById(id);
  if (!noeud) noeud = fabrique();
  if (!noeud) return null;
  const cible = ancre && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

/* Écrit dans le bandeau visible, jamais dans une région sr-only. */
function dit(message) {
  const noeud = document.getElementById('v2-e094-status');
  if (noeud) noeud.textContent = message;
}

/* E094-02 — Bascule du panneau d'aide, sans aria-pressed (état porté par
   aria-expanded et par la présence de l'attribut hidden). */
function basculeAide() {
  const bouton = document.getElementById('v2-e094-help-toggle');
  const panneau = document.getElementById('v2-e094-help');
  if (!bouton || !panneau) return false;
  const ouvre = Boolean(panneau.hidden);
  panneau.hidden = !ouvre;
  bouton.setAttribute('aria-expanded', String(ouvre));
  dit(ouvre ? 'Aide clavier ouverte.' : 'Aide clavier fermée.');
  return true;
}

/* ---------- E094-03 à E094-07 + E094-02 : raccourcis clavier ---------- */

function installeRaccourcis(root) {
  securise(() => {
    if (!root || typeof root.addEventListener !== 'function') return;
    if (root.dataset && root.dataset.v2E094Bound === '1') return;
    if (root.dataset) root.dataset.v2E094Bound = '1';

    root.addEventListener('keydown', (evenement) => {
      if (!evenement || evenement.defaultPrevented) return;
      if (evenement.ctrlKey || evenement.metaKey || evenement.altKey) return;
      if (estEditable(evenement.target)) return;

      const cle = String(evenement.key || '');
      const basse = cle.toLowerCase();

      /* E094-02 — '?' ouvre ou ferme l'aide clavier. */
      if (cle === '?') {
        if (basculeAide()) evenement.preventDefault();
        return;
      }

      /* E094-03 — 'f' place le focus sur le premier filtre du repère. */
      if (basse === 'f') {
        const filtre = q(root, '#c3a-tools .c3a-filter');
        if (!filtre) return;
        evenement.preventDefault();
        poseFocus(filtre);
        dit('Focus sur les filtres du repère.');
        return;
      }

      /* E094-04 — 't' place le focus sur l'item courant du fil ; le nombre
         d'items annoncé est compté dans le DOM réel. */
      if (basse === 't') {
        const items = Array.prototype.slice.call(
          root.querySelectorAll ? root.querySelectorAll('#c3a-thread .recit-thread-item') : []
        );
        if (!items.length) return;
        const courant = items.filter((item) => item.classList && item.classList.contains('is-current'))[0] || items[0];
        evenement.preventDefault();
        poseFocus(courant);
        const position = items.indexOf(courant) + 1;
        dit(`Fil : ${items.length} points · focus sur le point ${position}.`);
        return;
      }

      /* E094-05 — 'h' place le focus sur le résumé de traçabilité. */
      if (basse === 'h') {
        const resume = q(root, '.recit-trace summary');
        if (!resume) return;
        evenement.preventDefault();
        poseFocus(resume);
        dit('Focus sur la traçabilité du point.');
        return;
      }

      /* E094-06 — '0' délègue au bouton « Recommencer » (premier point). */
      if (cle === '0') {
        const bouton = q(root, '[data-fk="c3a-restart"]');
        if (!bouton || bouton.disabled === true) return;
        evenement.preventDefault();
        securise(() => bouton.click());
        return;
      }

      /* E094-07 — 'e' délègue au bouton « Repère suivant ». */
      if (basse === 'e') {
        const bouton = q(root, '[data-fk="c3a-next-event"]');
        if (!bouton || bouton.disabled === true) return;
        evenement.preventDefault();
        securise(() => bouton.click());
        return;
      }
    });
  });
}

/* ---------- Point d'entrée unique ---------- */

register('E094', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e094', CSS); /* un seul appel, toutes les règles du module. */

    const corps = q(layout, '.recit-body');
    if (!corps) return;
    const legende = q(corps, '.recit-legend');
    const statutBase = q(corps, '#c3a-status');

    /* E094-01 — Lien d'évitement vers le titre du point (déjà focusable). */
    securise(() => {
      let lien = document.getElementById('v2-e094-skip');
      if (!lien) {
        lien = el('a', 'recit-v2-e094-skip', 'Aller au point courant');
        lien.id = 'v2-e094-skip';
        lien.setAttribute('href', '#recit-point-title');
      }
      if (lien.parentNode !== layout || layout.firstChild !== lien) {
        layout.insertBefore(lien, layout.firstChild);
      }
    });

    /* E094-02 — Bouton + panneau d'aide, insérés après la légende. */
    securise(() => {
      let bouton = document.getElementById('v2-e094-help-toggle');
      if (!bouton) {
        bouton = el('button', 'recit-v2-e094-help-toggle', 'Aide clavier (?)');
        bouton.id = 'v2-e094-help-toggle';
        bouton.type = 'button';
        bouton.setAttribute('aria-controls', 'v2-e094-help');
        bouton.setAttribute('aria-expanded', 'false');
      }
      let panneau = document.getElementById('v2-e094-help');
      if (!panneau) {
        panneau = el('div', 'recit-v2-e094-help');
        panneau.id = 'v2-e094-help';
        panneau.hidden = true;
        panneau.appendChild(el('p', 'recit-v2-e094-help-intro', 'Raccourcis actifs dans cette vue :'));
        const liste = el('ul', 'recit-v2-e094-help-list');
        liste.id = 'v2-e094-help-list';
        [
          '? — ouvrir ou fermer cette aide clavier.',
          'f — placer le focus sur le premier filtre du repère.',
          't — placer le focus sur le point courant du fil.',
          'h — placer le focus sur la traçabilité du point.',
          '0 — revenir au premier point du repère.',
          'e — passer au repère suivant.',
          '[ et ] — sauter entre les régions du récit.',
          'Page précédente / Page suivante — parcourir le fil.',
          '/ — recherche ; n et p — point suivant ou précédent ; Échap — quitter la recherche.',
        ].forEach((ligne) => liste.appendChild(el('li', '', ligne)));
        panneau.appendChild(liste);
      }
      placeApres('v2-e094-help-toggle', () => bouton, corps, legende);
      placeApres('v2-e094-help', () => panneau, corps, bouton);

      /* Le routeur global intercepte Espace/Entrée en capture : on arrête la
         propagation sur notre bouton pour préserver son activation native. */
      securise(() => {
        bouton.addEventListener('keydown', (evenement) => {
          if (!evenement) return;
          const cleCle = String(evenement.key || '');
          if (cleCle === ' ' || cleCle === 'Spacebar' || cleCle === 'Enter') {
            evenement.stopPropagation();
          }
        });
        bouton.addEventListener('click', () => { basculeAide(); });
      });
    });

    /* E094-08 — Bandeau visible de retour textuel, après #c3a-status. */
    securise(() => {
      placeApres('v2-e094-status', () => {
        const paragraphe = el('p', 'recit-v2-e094-status');
        paragraphe.id = 'v2-e094-status';
        paragraphe.setAttribute('role', 'status');
        paragraphe.setAttribute('aria-live', 'polite');
        return paragraphe;
      }, corps, statutBase);
    });

    /* E094-09 — Complète aria-keyshortcuts sans écraser ceux de la coque. */
    securise(() => {
      const paires = [
        ['[data-fk="c3a-restart"]', '0'],
        ['[data-fk="c3a-next-event"]', 'e'],
      ];
      paires.forEach((paire) => {
        const bouton = q(corps, paire[0]);
        attributSiAbsent(bouton, 'aria-keyshortcuts', paire[1]);
      });
    });

    /* E094-10 — Mouvement réduit, lu une fois par rendu. */
    securise(() => {
      const reduit = Boolean(typeof reducedMotion === 'function' && reducedMotion());
      layout.setAttribute('data-v2-e094-motion', reduit ? 'reduce' : 'normal');
    });

    /* Structure d'abord, gestionnaires ensuite : les cibles existent avant
       que les raccourcis ne puissent être actionnés. */
    ajouteClasse(layout, 'recit-v2-e094-layout');
    installeRaccourcis(layout);
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
