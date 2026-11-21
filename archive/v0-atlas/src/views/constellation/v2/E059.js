import { register } from './registry.js';

/* Lentille V2 E059 — garde-fous complémentaires du focus et de la tabulation
   dans la vue Constellation. Seconde passe : dix chantiers inédits, tous
   implémentés, déterministes et tolérants à un DOM incomplet. Préfixe exclusif
   v2e059 : aucune collision avec la passe 1. Zéro réseau, zéro aléa, zéro
   minuteur ni boucle d'animation propre. */

const SELECTEUR = '.const-sun[data-const-key], .const-planet[data-const-key], .const-moon[data-const-key]';
const COUCHES = [
  ['soleils', '.const-layer-suns'],
  ['repères', '.const-layer-planets'],
  ['points', '.const-layer-moons'],
];
const LIMITE_REJEU = 4;

/* Mémoire inter-rendus : clé et couche du dernier nœud réellement focalisé. */
let memoireFocus = null;
/* File de rejeu bornée des demandes de focus différées par une région inert. */
const fileRejeu = [];
/* Dernière cible à laquelle un focus programmé a déjà été donné. */
let derniereCibleVisee = null;

function estElement(node) {
  return Boolean(node) && node.nodeType === 1;
}

/* Style calculé : rejette visibility:hidden/collapse, display:none, opacité
   nulle et clip-path entièrement rentré, au-delà de la seule géométrie. */
function estMasqueParStyle(node) {
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return false;
  try {
    const style = window.getComputedStyle(node);
    if (!style) return false;
    if (style.visibility === 'hidden' || style.visibility === 'collapse') return true;
    if (style.display === 'none') return true;
    const opacite = parseFloat(style.opacity);
    if (Number.isFinite(opacite) && opacite <= 0) return true;
    const clip = String(style.clipPath || '');
    if (/inset\(\s*50%/u.test(clip) || /circle\(\s*0(?:px|%)?/u.test(clip)) return true;
  } catch (erreur) {
    return false;
  }
  return false;
}

/* Disponibilité renforcée, recalculée à chaque appel : connectivité, attributs
   d'occultation, inert, style calculé, puis empreinte d'au moins 1 px. */
function estDisponible(node) {
  if (!estElement(node) || !node.isConnected) return false;
  if (typeof node.hasAttribute !== 'function' || node.hasAttribute('hidden')) return false;
  if (typeof node.getAttribute === 'function' && node.getAttribute('aria-hidden') === 'true') return false;
  if (typeof node.closest === 'function' && node.closest('[inert]')) return false;
  if (estMasqueParStyle(node)) return false;
  if (typeof node.getBoundingClientRect !== 'function') return false;
  const rect = node.getBoundingClientRect();
  return Boolean(rect) && rect.width >= 1 && rect.height >= 1;
}

const CSS = `
/* V2E059-03 / V2E059-09 — badge de rang et indice non coloré au focus. */
.constellation-field [data-v2e059-rang]::after{
  content:attr(data-v2e059-rang);
  position:absolute;left:50%;top:-15px;transform:translateX(-50%);
  font:600 8px/1 inherit;color:var(--gold-bright,#f4d69e);
  white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .12s ease;
}
.constellation-field [data-v2e059-focus="1"]::after{
  opacity:1;border-bottom:2px dashed currentColor;padding-bottom:1px;
}
.constellation-field [data-v2e059-focus="1"]{
  outline:4px double var(--gold-bright,#f4d69e);outline-offset:3px;
}
/* V2E059-07 — cible différée : aucun anneau trompeur tant que l'inertie dure. */
.constellation-field [data-v2e059-report="1"]{
  outline:none!important;box-shadow:none!important;
}
.constellation-field [data-v2e059-report="1"]::after{opacity:0}
@media (forced-colors: active){
  .constellation-field [data-v2e059-focus="1"],
  .constellation-field [data-v2e059-focus="1"]::after{
    outline:4px double Highlight;outline-offset:3px;border-color:Highlight;color:Highlight;
  }
}
.v2e059-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-field[data-v2e059-motion="0"] [data-v2e059-rang]::after{transition:none}
@media (prefers-reduced-motion: reduce){
  .constellation-field [data-v2e059-rang]::after{transition:none!important}
}
`;

register('E059', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelector !== 'function') return;
  const field = layout.querySelector('.constellation-field');
  if (!field) return;

  const fabriquer = typeof ctx.el === 'function'
    ? ctx.el
    : (tag, classe, texte) => {
        const node = document.createElement(tag);
        if (classe) node.className = classe;
        if (texte !== undefined) node.textContent = texte;
        return node;
      };

  /* Feuille unique de la lentille, installée une seule fois par le registre. */
  css('constellation-v2-e059', CSS);

  const noeuds = Array.prototype.slice.call(field.querySelectorAll(SELECTEUR));
  if (!noeuds.length) return;

  const groupes = COUCHES.map(([nom, selecteur]) => ({
    nom,
    selecteur,
    membres: noeuds.filter(node => typeof node.closest === 'function' && node.closest(selecteur)),
  })).filter(groupe => groupe.membres.length);

  const ciblesVisibles = () => noeuds.filter(estDisponible);
  const estInerte = node => Boolean(node && typeof node.closest === 'function' && node.closest('[inert]'))
    || Boolean(ctx.stage && ctx.stage.inert);

  /* E059-05 — Région d'avertissements, distincte de l'annonce de focus de la
     passe 1 : elle explique les déplacements refusés ou différés. */
  let alerte = layout.querySelector('#v2e059-alerte');
  if (!alerte) {
    alerte = fabriquer('p', 'v2e059-sr', '');
    alerte.id = 'v2e059-alerte';
    alerte.setAttribute('role', 'status');
    alerte.setAttribute('aria-live', 'polite');
    alerte.setAttribute('aria-atomic', 'true');
    layout.appendChild(alerte);
  }
  const avertir = texte => {
    if (alerte && texte && alerte.textContent !== texte) alerte.textContent = texte;
  };

  /* E059-06 — Déduplication : on ne rapproche le focus que si la cible n'est
     pas déjà active, ce qui évite les boucles de focus réentrant. Les refus
     pour inertie alimentent la file du chantier 07 (voir plus bas). */
  const viser = (node, origine) => {
    if (!estElement(node)) return null;
    if (estInerte(node)) {
      const cle = node.dataset.constKey || '';
      if (cle && fileRejeu.indexOf(cle) === -1 && fileRejeu.length < LIMITE_REJEU) fileRejeu.push(cle);
      if (node.dataset) node.dataset.v2e059Report = '1';
      avertir('Déplacement différé : la constellation est temporairement inactive.');
      return null;
    }
    if (!estDisponible(node)) {
      avertir('Déplacement refusé : cette cible n’est pas visible.');
      return null;
    }
    if (node.dataset) delete node.dataset.v2e059Report;
    if (derniereCibleVisee === node && document.activeElement === node) return node;
    try {
      node.focus({ preventScroll: true });
      derniereCibleVisee = node;
      return node;
    } catch (erreur) {
      try {
        node.focus();
        derniereCibleVisee = node;
        return node;
      } catch (autre) {
        avertir('Déplacement impossible : cible non focalisable.');
        return null;
      }
    }
  };

  /* E059-07 — Rejeu différé : consomme la demande la plus récente dès que le
     focus revient dans un champ actif, une seule fois par interaction. */
  const consommerFile = () => {
    if (!fileRejeu.length) return;
    if (estInerte(field)) return;
    const cle = fileRejeu[fileRejeu.length - 1];
    const cible = noeuds.find(node => node.dataset.constKey === cle);
    fileRejeu.pop();
    if (!cible || cible === document.activeElement) return;
    viser(cible, 'rejeu');
  };

  /* E059-10 — Veille de cohérence : une couche non vide doit porter exactement
     un nœud is-active et un seul aria-current, sur le même nœud. */
  const verifierCoherence = () => {
    let incoherent = false;
    groupes.forEach(groupe => {
      const actifs = groupe.membres.filter(node => node.classList.contains('is-active'));
      const courants = groupe.membres.filter(node => node.getAttribute('aria-current') === 'true');
      if (actifs.length !== 1 || courants.length !== 1 || actifs[0] !== courants[0]) incoherent = true;
    });
    if (incoherent) {
      field.dataset.v2e059Incoherence = '1';
      avertir('Contrôle : l’état de sélection d’une couche est incohérent.');
    } else {
      delete field.dataset.v2e059Incoherence;
    }
  };

  /* E059-01 — Noms accessibles de secours : les nœuds sans aria-label, sans
     aria-labelledby et sans texte reçoivent un libellé tiré de leurs données. */
  noeuds.forEach(node => {
    const nom = (node.getAttribute('aria-label') || '').trim()
      || (node.getAttribute('aria-labelledby') || '').trim()
      || (node.textContent || '').trim();
    if (nom) return;
    const source = (node.dataset.label || node.title || node.dataset.constKey || '').trim();
    if (!source) return;
    node.setAttribute('aria-label', `Élément de constellation : ${source}`);
    node.dataset.v2e059Nom = 'reconstruit';
  });

  /* E059-02 — Aide V2 non destructive : décompte des couches et règles de
     garde-fou, reliée au champ sans écraser son aria-describedby d'origine. */
  let aide = layout.querySelector('#v2e059-aide');
  if (!aide) {
    aide = fabriquer('p', 'v2e059-sr',
      'Garde-fous V2 : trois couches — ères, repères et points vérifiés. Le focus suit la sélection ; les déplacements refusés sont annoncés. Tab ne rencontre qu’un représentant par couche.');
    aide.id = 'v2e059-aide';
    layout.appendChild(aide);
  }
  const decrits = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  if (decrits.indexOf(aide.id) === -1) {
    decrits.push(aide.id);
    field.setAttribute('aria-describedby', decrits.join(' '));
  }
  groupes.forEach(groupe => {
    const couche = field.querySelector(groupe.selecteur);
    if (!couche) return;
    couche.dataset.v2e059Couche = groupe.nom;
    if (!couche.getAttribute('aria-roledescription')) {
      couche.setAttribute('aria-roledescription', 'couche de la constellation');
    }
  });

  /* E059-03 — Rang local par couche, exposé aux lecteurs d'écran et affiché
     au focus sous forme de badge, sans dépendre de la couleur. */
  groupes.forEach(groupe => {
    groupe.membres.forEach((node, index) => {
      node.dataset.v2e059Rang = `${index + 1}/${groupe.membres.length}`;
      node.setAttribute('aria-posinset', String(index + 1));
      node.setAttribute('aria-setsize', String(groupe.membres.length));
    });
  });

  /* E059-04 — Garde-fou de disponibilité : la visée n'accepte que les cibles
     dont le style calculé et l'empreinte confirment la visibilité réelle. */
  const estCible = node => estDisponible(node);
  field.dataset.v2e059Cibles = String(ciblesVisibles().filter(estCible).length);

  /* E059-09 — Marquage de focus propre à la lentille : double contour et
     hachures en CSS, état dupliqué en attribut pour tout contrôle externe. */
  if (field.dataset.v2e059FocusBound !== '1') {
    field.dataset.v2e059FocusBound = '1';
    field.addEventListener('focusin', evenement => {
      const cible = evenement && evenement.target;
      if (!estElement(cible) || typeof cible.closest !== 'function') return;
      const node = cible.closest(SELECTEUR);
      if (!node || !field.contains(node)) return;

      noeuds.forEach(n => {
        if (n === node) n.dataset.v2e059Focus = '1';
        else delete n.dataset.v2e059Focus;
      });
      const groupe = groupes.find(g => g.membres.indexOf(node) >= 0);
      memoireFocus = { cle: node.dataset.constKey || '', couche: groupe ? groupe.nom : '' };
      verifierCoherence();
      consommerFile();
    });
  }

  /* E059-08 — Restauration à repli : même clé, puis représentant de la couche
     mémorisée, puis première cible disponible ; jamais de vol de focus. */
  if (memoireFocus && memoireFocus.cle) {
    const actif = document.activeElement;
    const orphelin = !actif || actif === document.body || actif === document.documentElement;
    if (orphelin && !estInerte(actif)) {
      let cible = noeuds.find(node => node.dataset.constKey === memoireFocus.cle && estCible(node));
      let repli = false;
      if (!cible) {
        const groupe = groupes.find(g => g.nom === memoireFocus.couche);
        cible = (groupe && groupe.membres.find(node => node.classList.contains('is-active') && estCible(node)))
          || (groupe && groupe.membres.find(estCible))
          || ciblesVisibles()[0];
        repli = Boolean(cible);
      }
      if (cible && viser(cible, 'restauration') && repli) cible.dataset.v2e059Repli = '1';
    }
  }

  /* Repli mouvement réduit : la transition du badge est neutralisée en CSS. */
  field.dataset.v2e059Motion = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion() ? '0' : '1';
});
