import { register } from './registry.js';

/* Lentille E031 — Accessibilité clavier appliquée aux arêtes du graphe de la vue
   Constellation. Les arêtes sont les <line class="const-edge"> du SVG
   `svg.constellation-edges` (aria-hidden="true", focusable="false") produit par
   constellation.js : elles ne sont donc ni focalisables ni vocalisables par le
   navigateur. E031 leur donne un explorateur clavier : un proxy bouton par
   arête, un seul arrêt de Tab, des flèches, Début/Fin, un lien d'évitement,
   une annonce live, un compteur, un anneau de focus, une cible de 24 px, un
   raccourci Alt+A et une aide visible. Dix chantiers déterministes, zéro
   réseau, zéro aléa, zéro minuteur, zéro rAF, zéro journalisation, aucun
   fichier partagé modifié (registry.js, index.js, constellation.js, styles.css). */

const CSS_ID = 'constellation-e031';
const EXPLORER_ID = 'e031-explorer';
const SKIP_ID = 'e031-skip';
const LIVE_ID = 'e031-live';
const COUNTER_ID = 'e031-counter';
const HINT_ID = 'e031-hint';
const SHORTCUT_KEY = '__e031_shortcut';

/* Feuille unique, préfixée `e031-` : aucune règle générique, aucune URL, aucune
   police distante. Le mouvement réduit et les couleurs forcées sont couverts. */
const CSS = `
.e031-skip{
  position:absolute;left:8px;top:-60px;z-index:20;padding:6px 10px;
  border:1px solid var(--gold);border-radius:6px;background:var(--surface-2);
  color:var(--gold-bright);font-size:11px;text-decoration:none;transition:top .15s ease;
}
.e031-skip:focus{top:8px}
#${EXPLORER_ID}{
  display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 0;padding:6px;
  border-top:1px solid var(--line);
}
button.e031-edge{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:24px;min-height:24px;padding:0 5px;border:1px solid var(--line);
  border-radius:6px;background:var(--surface-2);color:var(--muted);
  font-size:9px;font-variant-numeric:tabular-nums;cursor:pointer;
}
button.e031-edge:focus{outline:none}
button.e031-edge:focus-visible,button.e031-edge[data-e031-focused="1"]{
  outline:2px solid var(--gold-bright);outline-offset:2px;
  box-shadow:0 0 0 4px rgba(230,185,111,.22);color:var(--gold-bright);
}
button.e031-edge[tabindex="0"]{border-color:var(--violet);color:var(--violet)}
#${LIVE_ID}{
  position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;
}
#${COUNTER_ID}{
  display:inline-block;min-width:3.2em;padding:2px 6px;border:1px solid var(--violet);
  border-radius:10px;color:var(--violet);font-size:10px;
  font-variant-numeric:tabular-nums;text-align:center;
}
#${HINT_ID}{color:var(--muted);font-size:9px;line-height:1.4}
@media (prefers-reduced-motion:reduce){.e031-skip{transition:none}}
@media (forced-colors:active){
  button.e031-edge:focus-visible,button.e031-edge[data-e031-focused="1"]{
    outline-color:Highlight;box-shadow:none;
  }
  .e031-skip{border-color:CanvasText;color:CanvasText}
}
@media (max-width:620px){
  #${EXPLORER_ID}{gap:3px;padding:4px}
  button.e031-edge{min-width:24px;min-height:24px;padding:0 4px}
}
`;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch { /* silence voulu : aucune journalisation */ }
}

/* Lecture des coordonnées d'une arête, sans écriture ni recalcul de géométrie. */
function nombre(ligne, attribut) {
  const brut = typeof ligne.getAttribute === 'function' ? ligne.getAttribute(attribut) : '';
  const valeur = Number.parseFloat(brut);
  return Number.isFinite(valeur) ? valeur : 0;
}

/* Dérive du libellé depuis le balisage réel : type d'arête et extrémités.
   Aucune longueur ni orientation : ces diagnostics appartiennent à E037. */
function libelle(ligne, index, total) {
  const classes = ligne && typeof ligne.classList === 'object' ? ligne.classList : null;
  const active = classes && classes.contains('is-path');
  const lune = classes && classes.contains('is-moon');
  const type = lune
    ? (active ? 'attache active vers un point vérifié' : 'attache vers un point vérifié')
    : (active ? 'rayon actif vers un repère' : 'rayon vers un repère');
  const x1 = nombre(ligne, 'x1').toFixed(2);
  const y1 = nombre(ligne, 'y1').toFixed(2);
  const x2 = nombre(ligne, 'x2').toFixed(2);
  const y2 = nombre(ligne, 'y2').toFixed(2);
  return `Arête ${index + 1} sur ${total} : ${type}, de (${x1}, ${y1}) à (${x2}, ${y2}).`;
}

register('E031', (ctx) => {
  const { viewId, layout, css, el, reducedMotion } = ctx || {};

  /* Garde d'entrée : aucun ajout au DOM sans le layout courant de la vue. */
  if (!layout || typeof layout.querySelectorAll !== 'function' || typeof document === 'undefined') return;
  if (typeof viewId === 'string' && viewId !== 'constellation') return;

  const doc = layout.ownerDocument || document;
  const make = (tag, cls, text) => typeof el === 'function' ? el(tag, cls, text) : doc.createElement(tag);

  /* Lecture unique : les arêtes sont celles du SVG de la vue, dans leur ordre
     de création (rayons de planètes puis attaches de lunes). */
  const svg = safe(() => layout.querySelector('svg.constellation-edges')) || null;
  const lignes = svg && typeof svg.querySelectorAll === 'function'
    ? Array.from(svg.querySelectorAll('line.const-edge')) : [];
  if (!lignes.length) return;
  const total = lignes.length;

  /* Feuille de style unique, injectée une seule fois par cssOnce du registre. */
  safe(() => { if (typeof css === 'function') css(CSS_ID, CSS); });

  /* E031-01 — Explorateur clavier : un proxy bouton par arête, dans l'ordre du
     SVG, avec un rôle de groupe et un lien explicite proxy ↔ ligne d'origine. */
  let explorer = null;
  safe(() => { explorer = layout.querySelector(`#${EXPLORER_ID}`); });
  if (!explorer) {
    explorer = make('div', 'e031-explorer');
    explorer.id = EXPLORER_ID;
    const champ = safe(() => layout.querySelector('.constellation-field')) || null;
    if (champ && champ.parentNode) champ.parentNode.insertBefore(explorer, champ.nextSibling);
    else layout.appendChild(explorer);
  }
  explorer.setAttribute('role', 'group');
  explorer.setAttribute('aria-label', `Explorateur clavier des ${total} arêtes du graphe`);
  explorer.dataset.e031Total = String(total);

  let proxies = explorer.querySelectorAll('button.e031-edge');
  proxies = Array.from(proxies);
  if (proxies.length !== total) {
    while (explorer.firstChild) explorer.removeChild(explorer.firstChild);
    proxies = lignes.map((ligne, index) => {
      const bouton = make('button', 'e031-edge', String(index + 1));
      bouton.type = 'button';
      bouton.id = `e031-edge-${index}`;
      explorer.appendChild(bouton);
      return bouton;
    });
  }
  lignes.forEach((ligne, index) => {
    const bouton = proxies[index];
    bouton.dataset.e031Index = String(index);
    bouton.setAttribute('aria-label', libelle(ligne, index, total));
    ligne.dataset.e031Ordre = String(index);
    ligne.dataset.e031Proxy = bouton.id;
  });

  /* E031-02 — Roving tabindex : une seule arête entre dans l'ordre de Tab.
     L'index initial est déduit de l'arête active (classe is-path du SVG). */
  const depart = (() => {
    const actif = lignes.findIndex((ligne) =>
      typeof ligne.classList === 'object' && ligne.classList.contains('is-path'));
    return actif >= 0 ? actif : 0;
  })();
  let roving = depart;

  function setRoving(index) {
    if (!total) return;
    roving = ((index % total) + total) % total;
    proxies.forEach((bouton, i) => {
      bouton.tabIndex = i === roving ? 0 : -1;
      bouton.dataset.e031Roving = i === roving ? 'entree' : 'interne';
    });
    lignes.forEach((ligne, i) => {
      if (i === roving) ligne.dataset.e031Courant = '1';
      else ligne.removeAttribute('data-e031-courant');
    });
    layout.dataset.e031Roving = String(roving);
  }
  setRoving(roving);

  /* E031-03 — Flèches gauche/droite : parcours circulaire du focus. Le
     preventDefault précède l'arrêt de propagation : le routeur global
     (keyboard.js) abandonne la touche dès qu'elle est déjà consommée. */
  safe(() => {
    explorer.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      const cible = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('button.e031-edge') : null;
      if (!cible || !explorer.contains(cible)) return;
      const depuis = proxies.indexOf(cible);
      if (depuis < 0 || total < 2) return;
      const pas = event.key === 'ArrowRight' ? 1 : -1;
      const vers = (depuis + pas + total) % total;
      event.preventDefault();
      event.stopPropagation();
      setRoving(vers);
      proxies[vers].focus({ preventScroll: true });
    }, true);
  });

  /* E031-04 — Début/Fin : saut direct à la première ou à la dernière arête. */
  safe(() => {
    explorer.addEventListener('keydown', (event) => {
      if (event.key !== 'Home' && event.key !== 'End') return;
      const cible = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('button.e031-edge') : null;
      if (!cible || !explorer.contains(cible)) return;
      if (proxies.indexOf(cible) < 0) return;
      event.preventDefault();
      event.stopPropagation();
      const vers = event.key === 'Home' ? 0 : total - 1;
      setRoving(vers);
      proxies[vers].focus({ preventScroll: true });
    }, true);
  });

  /* E031-05 — Lien d'évitement « Aller aux arêtes », première tabulation de la
     vue, avec ancre posée sur l'explorateur et focus sur l'arête courante. */
  safe(() => {
    if (!layout.firstChild || layout.querySelector(`#${SKIP_ID}`)) return;
    const evasion = make('a', 'e031-skip', 'Aller aux arêtes du graphe');
    evasion.id = SKIP_ID;
    evasion.href = `#${EXPLORER_ID}`;
    evasion.setAttribute('aria-controls', EXPLORER_ID);
    evasion.addEventListener('click', (event) => {
      event.preventDefault();
      const cible = proxies[roving] || proxies[0];
      if (cible && typeof cible.focus === 'function') cible.focus({ preventScroll: true });
    });
    layout.insertBefore(evasion, layout.firstChild);
  });

  /* E031-06 — Région live : annonce vocalisée de l'arête focalisée, hors flux
     visuel, sans annonce au chargement ni journalisation. */
  safe(() => {
    let live = layout.querySelector(`#${LIVE_ID}`);
    if (!live) {
      live = make('p', 'e031-live', '');
      live.id = LIVE_ID;
      layout.appendChild(live);
    }
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    explorer.addEventListener('focusin', (event) => {
      const bouton = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('button.e031-edge') : null;
      if (!bouton || !explorer.contains(bouton)) return;
      const i = proxies.indexOf(bouton);
      if (i >= 0) live.textContent = libelle(lignes[i], i, total);
    });
  });

  /* E031-07 — Compteur de position « N / total » synchronisé au focus. */
  safe(() => {
    let pastille = layout.querySelector(`#${COUNTER_ID}`);
    if (!pastille) {
      pastille = make('span', 'e031-counter', '');
      pastille.id = COUNTER_ID;
      const ancre = safe(() => layout.querySelector('.constellation-caption')) || layout;
      ancre.insertBefore(pastille, ancre.firstChild);
    }
    const afficher = (i) => { pastille.textContent = `${i + 1} / ${total}`; };
    afficher(roving);
    explorer.addEventListener('focusin', (event) => {
      const bouton = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('button.e031-edge') : null;
      if (!bouton || !explorer.contains(bouton)) return;
      const i = proxies.indexOf(bouton);
      if (i >= 0) afficher(i);
    });
  });

  /* E031-08 — Marquage du proxy focalisé : l'anneau est dessiné en CSS
     (:focus-visible, avec repli couleurs forcées), l'attribut sert d'empreinte
     auditable sans écouteur par bouton. */
  safe(() => {
    explorer.addEventListener('focusin', (event) => {
      const bouton = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('button.e031-edge') : null;
      if (!bouton || !explorer.contains(bouton)) return;
      proxies.forEach((noeud) => noeud.removeAttribute('data-e031-focused'));
      bouton.dataset.e031Focused = '1';
    });
    explorer.addEventListener('focusout', (event) => {
      const bouton = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('button.e031-edge') : null;
      if (bouton) bouton.removeAttribute('data-e031-focused');
    });
  });

  /* E031-09 — Raccourci Alt+A : le routeur ignore les combinaisons avec Alt,
     donc le raccourci est libre. L'écouteur documentaire est unique : l'ancien
     est retiré avant réinstallation, et la garde isConnected évite d'agir pour
     une vue périmée. */
  safe(() => {
    if (!doc || typeof doc.addEventListener !== 'function') return;
    const precedent = doc[SHORTCUT_KEY];
    if (typeof precedent === 'function') doc.removeEventListener('keydown', precedent, true);
    const surRaccourci = (event) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key !== 'a' && event.key !== 'A') return;
      if (!layout.isConnected) return;
      const cible = proxies[roving] || proxies[0];
      if (!cible) return;
      event.preventDefault();
      setRoving(proxies.indexOf(cible));
      cible.focus({ preventScroll: true });
    };
    doc[SHORTCUT_KEY] = surRaccourci;
    doc.addEventListener('keydown', surRaccourci, true);
  });

  /* E031-10 — Aide visible, raccourcis déclarés et mode de mouvement tracé.
     Aucune information n'est portée par la seule couleur : le libellé de chaque
     proxy reste textuel et lisible sans CSS. */
  safe(() => {
    proxies.forEach((bouton) => {
      bouton.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight Home End Alt+A');
      bouton.setAttribute('aria-describedby', HINT_ID);
    });
    let aide = layout.querySelector(`#${HINT_ID}`);
    if (!aide) {
      aide = make('p', 'e031-hint', '');
      aide.id = HINT_ID;
      const ancre = safe(() => layout.querySelector('.constellation-caption')) || layout;
      ancre.appendChild(aide);
    }
    aide.textContent = 'Arêtes : ← → parcourir les traits, Début/Fin sauter, Alt+A focaliser l’arête courante. Le tracé lui-même reste décoratif.';
    let reduit = false;
    try { reduit = !!(typeof reducedMotion === 'function' && reducedMotion()); }
    catch { reduit = false; }
    layout.dataset.e031Motion = reduit ? 'reduced' : 'full';
    layout.dataset.e031Ready = '1';
  });
});
