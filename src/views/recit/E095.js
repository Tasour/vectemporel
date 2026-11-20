import { register } from './registry.js';

/* Lentille E095 — Accessibilité ARIA et lecteurs d'écran. 10 chantiers E095-01 … E095-10.
   Complétée par l'orchestrateur après blocages répétés du sous-agent dédié. */

const P = 'recit-e095';
const ID = 'E095';

function garder(nom, faire) {
  try { faire(); } catch (_) { /* chantier neutralisé */ }
}
function ajouterToken(noeud, attribut, token) {
  if (!noeud) return;
  const valeurs = (noeud.getAttribute(attribut) || '').split(/\s+/).filter(Boolean);
  if (valeurs.indexOf(token) < 0) {
    valeurs.push(token);
    noeud.setAttribute(attribut, valeurs.join(' '));
  }
}
function creerSiAbsent(parent, selecteur, fabriquer) {
  if (!parent) return null;
  let noeud = parent.querySelector(selecteur);
  if (!noeud) { noeud = fabriquer(); parent.appendChild(noeud); }
  return noeud;
}
function sr(parent, id, texte) {
  const noeud = creerSiAbsent(parent, '#' + id, () => document.createElement('p'));
  noeud.id = id;
  noeud.className = P + '-sr';
  noeud.textContent = texte;
  return noeud;
}

register(ID, (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (!layout) return;

  css(P, `
    .${P}-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
    .${P} .recit-body :focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px}
    .${P}-reduit *{transition:none!important;animation:none!important}
  `);

  const corps = layout.querySelector('.recit-body') || layout;
  layout.classList.add(P);
  layout.setAttribute('data-095', 'on');
  const reduit = typeof reducedMotion === 'function' && reducedMotion();
  if (reduit) layout.classList.add(P + '-reduit');

  garder('01-region', () => {
    if (!corps.hasAttribute('role')) corps.setAttribute('role', 'region');
    if (!corps.getAttribute('aria-label')) corps.setAttribute('aria-label', 'Récit guidé');
  });

  garder('02-progression', () => {
    const barre = layout.querySelector('.recit-progress');
    if (!barre) return;
    if (!barre.hasAttribute('role')) barre.setAttribute('role', 'progressbar');
    const kicker = layout.querySelector('.recit-kicker, .recit-meta');
    const texte = kicker ? kicker.textContent : '';
    const nombres = texte.match(/\d+/g) || [];
    const ici = nombres.length ? Number(nombres[0]) : 1;
    const total = nombres.length > 1 ? Number(nombres[1]) : itemsCount(layout);
    if (!barre.hasAttribute('aria-valuemin')) barre.setAttribute('aria-valuemin', '1');
    if (!barre.hasAttribute('aria-valuemax')) barre.setAttribute('aria-valuemax', String(total || 1));
    if (!barre.hasAttribute('aria-valuenow')) barre.setAttribute('aria-valuenow', String(ici || 1));
    if (!barre.hasAttribute('aria-valuetext')) barre.setAttribute('aria-valuetext', 'Étape ' + (ici || 1) + ' sur ' + (total || 1));
  });

  garder('03-certitude', () => {
    const pastille = layout.querySelector('.recit-conf');
    if (!pastille) return;
    if (!pastille.hasAttribute('role')) pastille.setAttribute('role', 'img');
    if (!pastille.getAttribute('aria-label')) {
      pastille.setAttribute('aria-label', 'Degré de certitude : ' + pastille.textContent.trim());
    }
  });

  garder('04-titre', () => {
    const titre = layout.querySelector('#recit-point-title');
    if (!titre) return;
    const id = '095-position';
    const note = sr(corps, id, 'Position dans le repère : ' + (layout.querySelector('.recit-kicker, .recit-meta') || { textContent: '' }).textContent.trim());
    if (note) ajouterToken(titre, 'aria-describedby', id);
  });

  garder('05-fil', () => {
    const liste = layout.querySelector('.recit-thread-list, .c3a-thread, .recit-thread');
    if (!liste) return;
    if (!liste.hasAttribute('role')) liste.setAttribute('role', 'list');
    Array.from(liste.querySelectorAll('.recit-thread-item')).forEach((item) => {
      if (!item.hasAttribute('role')) item.setAttribute('role', 'listitem');
    });
  });

  garder('06-commandes', () => {
    const actions = layout.querySelector('.recit-actions');
    if (!actions) return;
    if (!actions.hasAttribute('role')) actions.setAttribute('role', 'group');
    if (!actions.getAttribute('aria-label')) actions.setAttribute('aria-label', 'Commandes du récit');
  });

  garder('07-tracabilite', () => {
    const details = layout.querySelector('.recit-trace');
    if (!details) return;
    const resume = details.querySelector('summary');
    const bloc = details.querySelector('p, ul, ol');
    if (resume && bloc && !resume.hasAttribute('aria-controls')) {
      if (!bloc.id) bloc.id = '095-trace-contenu';
      resume.setAttribute('aria-controls', bloc.id);
      if (!bloc.hasAttribute('role')) bloc.setAttribute('role', 'note');
    }
  });

  garder('08-aide', () => {
    const champ = layout.querySelector('input[type="search"], .c3a-search input');
    if (!champ) return;
    const id = '095-aide-recherche';
    sr(corps, id, 'Recherche dans le fil : Échap efface la saisie, Entrée valide.');
    ajouterToken(champ, 'aria-describedby', id);
  });

  garder('09-statut', () => {
    const statut = creerSiAbsent(corps, '.' + P + '-statut', () => {
      const p = document.createElement('p');
      p.className = P + '-statut ' + P + '-sr';
      p.setAttribute('role', 'status');
      p.setAttribute('aria-live', 'polite');
      p.setAttribute('aria-atomic', 'true');
      return p;
    });
    if (statut && !statut.textContent) statut.textContent = 'Fil du repère : ' + itemsCount(layout) + ' point(s).';
  });

  garder('10-focus', () => {
    const titre = layout.querySelector('#recit-point-title');
    if (titre && !titre.hasAttribute('tabindex')) titre.setAttribute('tabindex', '-1');
    if (reduit) layout.classList.add(P + '-reduit');
  });
});

function itemsCount(layout) {
  if (!layout) return 0;
  return layout.querySelectorAll('.recit-thread-item').length;
}
