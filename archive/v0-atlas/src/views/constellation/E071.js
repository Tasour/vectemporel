import { register } from './registry.js';

/* Lentille E071 — accessibilité clavier appliquée au survol de la vue
   Constellation. Les dix chantiers (E071-01 … E071-10) sont réellement
   implémentés dans ce seul module et commentés un à un. Aucun appel réseau,
   aucune source aléatoire, aucune sortie console, aucun minuteur ni boucle
   d'animation propre, aucune URL distante ni @import. Le greffon est tolérant :
   un chantier défaillant est neutralisé sans jamais remonter d'exception au
   registre. Contrat : un seul appel register pour l'identifiant E071, de la
   forme register(id, ctx => { … }) avec
   ctx = { viewId, stage, layout, css(id, rules), el(tag, cls, text),
   reducedMotion() } ; ctx.layout est vérifié avant tout ajout au DOM. */

const CSS_ID = 'constellation-e071';
const PANEL_ID = 'e071-panel';
const LISTE_ID = 'e071-panel-liste';
const AUDIT_ID = 'e071-audit';
const LIVE_ID = 'e071-live';
const SKIP_ID = 'e071-skip';
const HELP_ID = 'e071-help';
const CLE_ECOUTE = '__e071_clavier_survol';

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = {
  rendus: 0,
  ecouteBranche: false,
  survols: 0,
  dernierSurvol: null,
};

/* Neutralisation silencieuse, sans journalisation ni sortie de débogage. */
function sansEchec(action) {
  try { action(); } catch { /* greffon tolérant : aucune exception remontée */ }
}

function noeudsDu(layout) {
  return Array.from(layout.querySelectorAll('.const-sun, .const-planet, .const-moon'));
}

function libelleDe(noeud) {
  return String(
    noeud.dataset.label || noeud.getAttribute('title') || noeud.getAttribute('aria-label') || ''
  ).trim();
}

function typeDe(noeud) {
  if (noeud.classList.contains('const-sun')) return 'soleil';
  if (noeud.classList.contains('const-planet')) return 'planète';
  if (noeud.classList.contains('const-moon')) return 'lune';
  return 'nœud';
}

function cleDu(noeud) {
  return noeud.dataset.constKey || libelleDe(noeud) || '?';
}

/* Position lue depuis les variables CSS en pourcentage écrites par la vue. */
function positionDe(noeud) {
  const x = parseFloat(noeud.style.getPropertyValue('--x'));
  const y = parseFloat(noeud.style.getPropertyValue('--y'));
  return { x: Number.isFinite(x) ? x : NaN, y: Number.isFinite(y) ? y : NaN };
}

/* Panneau d'aperçu unique, inséré avant le champ sans déplacer le récit. */
function panneauDans(layout, creer) {
  const existant = layout.querySelector('#' + PANEL_ID);
  if (existant) return existant;

  const panneau = creer('section', 'e071-panel');
  panneau.id = PANEL_ID;
  panneau.setAttribute('aria-labelledby', 'e071-titre');

  const titre = creer('h2', 'e071-titre', 'Aperçu clavier du survol');
  titre.id = 'e071-titre';
  panneau.appendChild(titre);

  const liste = creer('ul', 'e071-liste');
  liste.id = LISTE_ID;
  panneau.appendChild(liste);

  const audit = creer('p', 'e071-audit');
  audit.id = AUDIT_ID;
  panneau.appendChild(audit);

  const live = creer('p', 'e071-sr');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  panneau.appendChild(live);

  const champ = layout.querySelector('.constellation-field');
  if (champ && typeof layout.insertBefore === 'function') layout.insertBefore(panneau, champ);
  else layout.appendChild(panneau);
  return panneau;
}

/* Écouteur délégué unique : le focus clavier devient un « survol » pilotable. */
function brancheSurvolClavier() {
  if (etat.ecouteBranche || typeof document === 'undefined') return;
  if (typeof document.addEventListener !== 'function') return;
  etat.ecouteBranche = true;

  const surEntree = (evenement) => {
    const cible = evenement && evenement.target;
    if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return;
    const noeud = cible.closest('.const-sun, .const-planet, .const-moon');
    if (!noeud) return;
    const layoutLocal = typeof noeud.closest === 'function'
      ? noeud.closest('.constellation-layout') : null;
    if (!layoutLocal || !layoutLocal.querySelector('#' + PANEL_ID)) return;

    const tous = noeudsDu(layoutLocal);
    tous.forEach((autre) => autre.removeAttribute('data-e071-over'));
    noeud.setAttribute('data-e071-over', 'true');
    etat.survols += 1;
    etat.dernierSurvol = cleDu(noeud);

    const live = document.getElementById(LIVE_ID);
    if (live) {
      live.textContent = 'Survol clavier : ' + typeDe(noeud) + ' — '
        + libelleDe(noeud) + ' (' + etat.survols + ').';
    }
    const courant = layoutLocal.querySelector('#' + LISTE_ID + ' [aria-current="location"]');
    if (courant) courant.removeAttribute('aria-current');
    const item = layoutLocal.querySelector('#e071-item-' + (noeud.dataset.e071Index || ''));
    if (item) item.setAttribute('aria-current', 'location');
  };

  const surSortie = (evenement) => {
    const cible = evenement && evenement.target;
    if (!cible || cible.nodeType !== 1 || typeof cible.closest !== 'function') return;
    const noeud = cible.closest('.const-sun, .const-planet, .const-moon');
    if (noeud) noeud.removeAttribute('data-e071-over');
  };

  const precedent = typeof window !== 'undefined' ? window[CLE_ECOUTE] : null;
  if (Array.isArray(precedent)) {
    document.removeEventListener('focusin', precedent[0], true);
    document.removeEventListener('focusout', precedent[1], true);
  }
  document.addEventListener('focusin', surEntree, true);
  document.addEventListener('focusout', surSortie, true);
  if (typeof window !== 'undefined') window[CLE_ECOUTE] = [surEntree, surSortie];
}

register('E071', (ctx) => {
  try {
    /* Garde de contexte : aucun ajout au DOM sans layout exploitable. */
    const layout = ctx && ctx.layout;
    if (!layout || typeof layout.querySelector !== 'function') return;
    const css = typeof ctx.css === 'function' ? ctx.css : null;
    const creer = typeof ctx.el === 'function' ? ctx.el : null;
    if (!css || !creer) return;

    const noeuds = noeudsDu(layout);

    /* Feuille unique de la lentille, injectée une seule fois pour toute la vue. */
    css(CSS_ID, `
.e071-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}

/* E071-01 — le focus du bouton retour reprend exactement l'apparence du survol. */
.constellation-layout[data-e071="on"] .constellation-back:focus-visible{border-color:var(--gold);color:var(--gold-bright);outline:2px solid var(--gold-bright);outline-offset:2px}

/* E071-02 — étiquette des lunes : le survol et le focus clavier révèlent le même texte. */
.constellation-layout[data-e071="on"] .const-moon:hover::after,
.constellation-layout[data-e071="on"] .const-moon:focus-visible::after{opacity:1;white-space:normal;max-width:220px;overflow:visible;background:var(--surface-2);padding:2px 4px;border-radius:4px}

/* E071-04 — anneau de focus visible, non porté par la seule couleur. */
.constellation-layout[data-e071="on"] :is(.const-sun,.const-planet,.const-moon):focus-visible{outline:2px solid var(--gold-bright);outline-offset:3px;box-shadow:0 0 0 5px rgba(244,214,158,.18);z-index:6}

/* E071-05 — état de « survol clavier » : contour pointillé distinct du focus. */
.constellation-layout[data-e071="on"] [data-e071-over="true"]:not(:focus-visible){outline:2px dashed var(--violet);outline-offset:2px}

/* E071-06 — panneau d'aperçu indexable, posé hors du flux visuel. */
#e071-panel .e071-liste{margin:4px 0;padding-left:16px}
#e071-panel .e071-liste li{margin:2px 0;font-size:9px;line-height:1.4;color:var(--muted-2)}
#e071-panel .e071-liste li[aria-current="location"]{color:var(--gold-bright);font-weight:600;list-style:square}

/* E071-07 — raccourci d'évitement masqué jusqu'à son focus. */
.e071-skip{position:absolute;left:10px;top:-64px;z-index:9;min-height:36px;padding:0 12px;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;cursor:pointer}
.e071-skip:focus-visible{top:8px;outline:2px solid var(--gold-bright);outline-offset:2px}

/* E071-09 — témoin d'audit lisible en bas du panneau. */
#e071-audit{margin:6px 0 0;font-size:9px;line-height:1.5;color:var(--gold);font-variant-numeric:tabular-nums}

/* E071-10 — mode sobre : aucune transition ni halo animé. */
.constellation-layout.e071-calm :is(.const-sun,.const-planet,.const-moon,.constellation-back){transition:none!important}
.constellation-layout.e071-calm :is(.const-sun,.const-planet,.const-moon):focus-visible{box-shadow:none}
@media (prefers-reduced-motion: reduce){
  .constellation-layout :is(.const-sun,.const-planet,.const-moon,.constellation-back,.e071-skip){transition:none!important}
  .constellation-layout :is(.const-sun,.const-planet,.const-moon):focus-visible{box-shadow:none}
}
@media (max-width:620px){
  #e071-panel .e071-liste li,#e071-audit{font-size:8px}
}
`);

    /* E071-01 — Miroir de focus sur le bouton retour : le survol doré devient
       un état de focus visible, et l'interrupteur data-e071 pilote la feuille. */
    sansEchec(() => {
      layout.dataset.e071 = 'on';
      const retours = Array.from(layout.querySelectorAll('.constellation-back'));
      retours.forEach((bouton) => {
        bouton.dataset.e071Back = 'on';
        bouton.setAttribute('aria-keyshortcuts', 'Enter Space');
      });
      layout.dataset.e071Retours = String(retours.length);
    });

    /* E071-02 — Étiquette des lunes : chaque lune reçoit la marque qui rend sa
       légende disponible au survol comme au focus, et le compte est calculé. */
    sansEchec(() => {
      const lunes = Array.from(layout.querySelectorAll('.const-moon'));
      let pourvues = 0;
      lunes.forEach((lune) => {
        const libelle = libelleDe(lune);
        lune.dataset.e071Label = libelle ? 'on' : 'off';
        if (libelle) pourvues += 1;
      });
      layout.dataset.e071Lunes = String(lunes.length);
      layout.dataset.e071LunesEtiquetees = String(pourvues);
    });

    /* E071-03 — Région live dédiée : l'aperçu de survol est annoncé au focus,
       sans toucher au canal live partagé de la vue. */
    sansEchec(() => {
      panneauDans(layout, creer);
      const live = document.getElementById(LIVE_ID);
      if (live && !live.textContent) {
        live.textContent = 'Survol clavier prêt : utilisez Tab pour parcourir les nœuds.';
      }
      layout.dataset.e071Live = LIVE_ID;
    });

    /* E071-04 — Anneau de focus renforcé : chaque nœud est marqué et l'état est
       dupliqué en attribut pour un contrôle programmatique de la zone active. */
    sansEchec(() => {
      noeuds.forEach((noeud) => {
        noeud.dataset.e071Focus = 'pret';
      });
      layout.dataset.e071Noeuds = String(noeuds.length);
    });

    /* E071-05 — Délégation unique focusin/focusout : le focus devient un survol
       simulé (attribut data-e071-over) et met à jour l'annonce et l'aperçu. */
    sansEchec(() => {
      brancheSurvolClavier();
      layout.dataset.e071Branche = etat.ecouteBranche ? 'on' : 'off';
    });

    /* E071-06 — Panneau d'aperçu indexable : la liste restitue en texte les
       informations que les infobulles de survol portent normalement seules. */
    sansEchec(() => {
      const liste = layout.querySelector('#' + LISTE_ID);
      if (!liste) return;
      while (liste.firstChild) liste.removeChild(liste.firstChild);
      noeuds.forEach((noeud, index) => {
        const rang = String(index + 1);
        noeud.dataset.e071Index = rang;
        const item = creer('li', 'e071-item', typeDe(noeud) + ' ' + rang + ' : ' + libelleDe(noeud));
        item.id = 'e071-item-' + rang;
        liste.appendChild(item);
      });
      layout.dataset.e071Apercu = String(noeuds.length);
    });

    /* E071-07 — Raccourci d'évitement : un point d'entrée clavier mène au
       premier nœud, sans traverser l'en-tête, avec cible déclarée. */
    sansEchec(() => {
      const champ = layout.querySelector('.constellation-field');
      if (!champ || !champ.parentNode || layout.querySelector('#' + SKIP_ID)) return;
      const saut = creer('button', 'e071-skip', 'Aller au survol clavier');
      saut.id = SKIP_ID;
      saut.type = 'button';
      saut.setAttribute('aria-controls', champ.id || 'e071-champ');
      if (!champ.id) champ.id = 'e071-champ';
      saut.addEventListener('click', () => {
        const premier = noeuds[0] || layout.querySelector('.const-sun, .const-planet, .const-moon');
        if (premier) premier.focus({ preventScroll: true });
      });
      champ.parentNode.insertBefore(saut, champ);
    });

    /* E071-08 — Description clavier rattachée au champ, sans écraser la note
       existante : l'identifiant d'aide est ajouté de façon idempotente. */
    sansEchec(() => {
      const champ = layout.querySelector('.constellation-field');
      if (!champ) return;
      let aide = layout.querySelector('#' + HELP_ID);
      if (!aide) {
        aide = creer('p', 'e071-sr',
          'Tab : parcourir ères, repères et points. Le focus révèle la même étiquette que le survol et annonce l’aperçu. Entrée ou Espace : ouvrir le détail.');
        aide.id = HELP_ID;
        layout.appendChild(aide);
      }
      const presents = String(champ.getAttribute('aria-describedby') || '')
        .split(/\s+/).filter(Boolean);
      if (presents.indexOf(HELP_ID) < 0) {
        presents.push(HELP_ID);
        champ.setAttribute('aria-describedby', presents.join(' '));
      }
      layout.dataset.e071Aide = HELP_ID;
    });

    /* E071-09 — Raccourcis déclarés et mesure auditable : position et raccourcis
       par nœud, avec un écart minimal calculé depuis les variables CSS. */
    sansEchec(() => {
      const raccourcis = {
        soleil: 'Enter Space ArrowLeft ArrowRight ArrowUp ArrowDown Home End',
        planete: 'Enter Space ArrowLeft ArrowRight',
        lune: 'Enter Space',
      };
      let declares = 0;
      noeuds.forEach((noeud) => {
        const cle = typeDe(noeud) === 'planète' ? 'planete' : typeDe(noeud);
        noeud.setAttribute('aria-keyshortcuts', raccourcis[cle] || 'Enter Space');
        if (noeud.hasAttribute('aria-keyshortcuts')) declares += 1;
      });
      const points = noeuds.map(positionDe).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      let ecart = Infinity;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < ecart) ecart = distance;
        }
      }
      const mesure = Number.isFinite(ecart) ? ecart.toFixed(1).replace('.', ',') : '—';
      layout.dataset.e071Raccourcis = String(declares);
      layout.dataset.e071Ecart = Number.isFinite(ecart) ? ecart.toFixed(2) : 'indetermine';
      const sortie = layout.querySelector('#' + AUDIT_ID);
      if (sortie) {
        sortie.textContent = 'Nœuds pilotables au clavier : ' + declares + ' / ' + noeuds.length
          + ' · positions renseignées : ' + points.length
          + ' · écart minimal : ' + mesure + ' pt · survols clavier : ' + etat.survols + '.';
      }
    });

    /* E071-10 — Mouvement réduit : le mode sobre est demandé au contexte, sans
       sonde propre, avec un repli CSS et un compteur d'idempotence auditable. */
    sansEchec(() => {
      etat.rendus += 1;
      const reduit = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
      layout.dataset.e071Mouvement = reduit ? 'reduit' : 'normal';
      layout.dataset.e071Rendus = String(etat.rendus);
      if (reduit) layout.classList.add('e071-calm');
      else layout.classList.remove('e071-calm');
      const panneaux = typeof document !== 'undefined'
        ? document.querySelectorAll('#' + PANEL_ID).length : 0;
      layout.dataset.e071Idempotence = String(panneaux);
      const sortie = layout.querySelector('#' + AUDIT_ID);
      if (sortie) {
        sortie.textContent += ' Mouvement réduit : ' + (reduit ? 'oui' : 'non')
          + ' · panneaux e071 : ' + panneaux + ' (attendu 1).';
      }
    });
  } catch { /* greffon tolérant : aucune exception ne remonte au registre */ }
});
