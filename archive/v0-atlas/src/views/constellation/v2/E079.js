import { register } from './registry.js';

/* Lentille V2 E079 — robustesse et garde-fous du survol, seconde passe.
   Dix chantiers inédits, tous implémentés : ancrage d'étiquette, visibilité,
   nature du nœud, statut activé/aperçu, modificateurs, transit, primauté du
   clavier, jeton de génération, repli d'API et délégation. Zéro réseau,
   zéro source aléatoire, zéro minuteur ni boucle d'animation propre. */
register('E079', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;

  const layout = ctx.layout;
  const doc = layout.ownerDocument || document;
  const fenetre = doc.defaultView;

  /* Feuille unique de la lentille : liseré de survol, ancrages d'étiquette,
     état actif, repli cursoriel et régions d'annonce sobre. */
  css('constellation-v2-e079', `
.v2e079-status{display:block;margin:10px 0 0;min-height:36px;padding:8px 12px;border:1px dashed var(--gold);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;line-height:1.4}
.const-sun[data-v2e079-hover="1"],.const-planet[data-v2e079-hover="1"],.const-moon[data-v2e079-hover="1"]{outline:2px dashed var(--gold-bright);outline-offset:3px}
.const-sun[data-v2e079-hover="1"][data-v2e079-etat="actif"]::after,.const-planet[data-v2e079-hover="1"][data-v2e079-etat="actif"]::after{text-decoration:underline;text-underline-offset:2px;font-weight:600}
.const-sun[data-v2e079-zone="gauche"]::after,.const-planet[data-v2e079-zone="gauche"]::after,.const-moon[data-v2e079-zone="gauche"]::after{left:0;transform:none;text-align:left}
.const-sun[data-v2e079-zone="droite"]::after,.const-planet[data-v2e079-zone="droite"]::after,.const-moon[data-v2e079-zone="droite"]::after{left:100%;transform:translateX(-100%);text-align:right}
[data-v2e079-modificateur="oui"]{cursor:not-allowed}
@media (prefers-reduced-motion: reduce){.v2e079-status{border-style:solid}}
`);

  const champ = layout.querySelector('.constellation-field');
  if (!champ) return;
  const noeuds = Array.from(champ.querySelectorAll('button.const-sun, button.const-planet, button.const-moon'));
  if (!noeuds.length) return;

  /* E079-01 — Ancrage de l'étiquette : la zone vient de la position --x,
     donc aucune mesure ni boucle ; l'étiquette ne déborde plus du champ. */
  noeuds.forEach(noeud => {
    const brut = noeud.style && typeof noeud.style.getPropertyValue === 'function'
      ? noeud.style.getPropertyValue('--x') : '';
    const x = parseFloat(brut);
    const zone = Number.isFinite(x) && x < 25 ? 'gauche'
      : Number.isFinite(x) && x > 75 ? 'droite' : 'centre';
    noeud.setAttribute('data-v2e079-zone', zone);
  });

  /* E079-02 — Garde de visibilité : un nœud sans boîte de rendu est ignoré,
     ce qui évite de marquer un repère masqué ou encore hors flux. */
  noeuds.forEach(noeud => {
    const rendu = typeof noeud.getClientRects === 'function' && noeud.getClientRects().length > 0;
    noeud.setAttribute('data-v2e079-visible', rendu ? 'oui' : 'non');
  });

  /* E079-03 — Barrière de nature : l'état est rattaché au type de nœud,
     pour qu'un libellé d'ère ne puisse pas se coller sur une lune. */
  function natureDe(noeud) {
    if (!noeud || !noeud.classList) return '';
    if (noeud.classList.contains('const-sun')) return 'Ère';
    if (noeud.classList.contains('const-planet')) return 'Repère';
    if (noeud.classList.contains('const-moon')) return 'Point';
    return '';
  }
  noeuds.forEach(noeud => noeud.setAttribute('data-v2e079-nature', natureDe(noeud)));

  /* E079-04 — Statut activé ou aperçu : une seule région live, textuelle,
     et anti-bavardage par clé logique pour ne pas saturer le lecteur d'écran. */
  let statut = layout.querySelector('#v2e079-status');
  if (!statut) {
    statut = typeof ctx.el === 'function'
      ? ctx.el('p', 'v2e079-status', '')
      : doc.createElement('p');
    statut.id = 'v2e079-status';
    statut.setAttribute('role', 'status');
    statut.setAttribute('aria-live', 'polite');
    statut.setAttribute('aria-atomic', 'true');
    statut.textContent = 'Survol : aucun';
    layout.appendChild(statut);
  }
  function annoncer(noeud) {
    const cle = noeud.dataset.constKey || '';
    if (noeud.getAttribute('data-v2e079-hover') === '1'
        && champ.getAttribute('data-v2e079-dernier') === cle) return false;
    const actif = noeud.classList.contains('is-active');
    noeud.setAttribute('data-v2e079-etat', actif ? 'actif' : 'aperçu');
    const nature = natureDe(noeud) || 'Élément';
    const libelle = noeud.dataset.label || '';
    statut.textContent = actif
      ? `${nature} sélectionné : ${libelle}`
      : `${nature} aperçu : ${libelle}`;
    champ.setAttribute('data-v2e079-dernier', cle);
    return true;
  }

  /* E079-05 — Modificateurs : un survol avec Ctrl, Alt, Méta ou Maj n'est
     qu'un geste de commande, jamais un aperçu ; aucun état n'est écrit. */
  function estModifie(event) {
    return !!(event && (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey));
  }
  function marquerModificateur(noeud, oui) {
    noeuds.forEach(n => {
      if (n !== noeud) n.setAttribute('data-v2e079-modificateur', 'non');
    });
    noeud.setAttribute('data-v2e079-modificateur', oui ? 'oui' : 'non');
  }

  /* E079-06 — Transit entre voisins : si le pointeur passe directement d'un
     nœud à un autre du même champ, le statut ne retombe pas à « aucun ». */
  function noeudDepuis(cible) {
    if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return null;
    const trouve = cible.closest('button.const-sun, button.const-planet, button.const-moon');
    return trouve && champ.contains(trouve) ? trouve : null;
  }
  function estTransit(event, noeud) {
    const destination = noeudDepuis(event && event.relatedTarget);
    return !!(destination && destination !== noeud);
  }

  /* E079-07 — Primauté du clavier : le survol n'appelle jamais focus().
     Un nœud déjà focalisé garde ses repères clavier, sans doublon pointeur. */
  function cedeAuClavier(noeud) {
    const clavier = !!(doc.activeElement && doc.activeElement === noeud);
    champ.setAttribute('data-v2e079-focus', clavier ? 'clavier' : 'pointeur');
    return clavier;
  }

  /* E079-08 — Jeton de génération : chaque rendu incrémente un compteur
     partagé ; les écouteurs d'un champ périmé ignorent leurs événements. */
  const GEN_KEY = '__v2e079_gen';
  const generation = (fenetre && typeof fenetre[GEN_KEY] === 'number' ? fenetre[GEN_KEY] : 0) + 1;
  if (fenetre) fenetre[GEN_KEY] = generation;
  champ.setAttribute('data-v2e079-gen', String(generation));
  function estPerime() {
    return !!(fenetre && fenetre[GEN_KEY] !== generation);
  }

  /* E079-09 — Repli d'API : les événements de pointeur sont utilisés quand
     ils existent, sinon les événements souris, sans sonde ni minuteur. */
  const avecPointeur = !!(fenetre && 'onpointerover' in fenetre && typeof fenetre.PointerEvent === 'function');
  const entree = avecPointeur ? 'pointerover' : 'mouseover';
  const sortie = avecPointeur ? 'pointerout' : 'mouseout';
  champ.setAttribute('data-v2e079-api', avecPointeur ? 'pointeur' : 'souris');

  /* E079-10 — Délégation unique : deux écouteurs sur le champ couvrent tous
     les nœuds, y compris ceux ajoutés plus tard, et effacent l'état à sortie. */
  champ.setAttribute('data-v2e079-delegue', '1');
  function effacer() {
    noeuds.forEach(n => n.removeAttribute('data-v2e079-hover'));
    champ.removeAttribute('data-v2e079-actif');
    statut.textContent = 'Survol : aucun';
    champ.removeAttribute('data-v2e079-dernier');
  }
  champ.addEventListener(entree, event => {
    if (estPerime()) return;
    const noeud = noeudDepuis(event && event.target);
    if (!noeud || noeud.getAttribute('data-v2e079-visible') === 'non') return;
    if (estModifie(event)) {
      marquerModificateur(noeud, true);
      return;
    }
    marquerModificateur(noeud, false);
    if (cedeAuClavier(noeud)) return;
    if (!annoncer(noeud)) return;
    noeuds.forEach(n => n.removeAttribute('data-v2e079-hover'));
    noeud.setAttribute('data-v2e079-hover', '1');
    champ.setAttribute('data-v2e079-actif', '1');
  });
  champ.addEventListener(sortie, event => {
    if (estPerime()) return;
    const noeud = noeudDepuis(event && event.target);
    if (!noeud) return;
    if (estTransit(event, noeud)) {
      champ.setAttribute('data-v2e079-transit', '1');
      noeud.removeAttribute('data-v2e079-hover');
      return;
    }
    champ.removeAttribute('data-v2e079-transit');
    effacer();
  });
});
