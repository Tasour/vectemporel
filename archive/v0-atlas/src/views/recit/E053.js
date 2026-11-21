import { register } from './registry.js';

/* Lentille E053 — Recherche et filtrage. 10 chantiers E053-01 … E053-10.
   Complétée par l'orchestrateur après blocages répétés du sous-agent dédié. */

const P = 'recit-e053';
const ID = 'E053';

function garder(nom, faire) {
  try { faire(); } catch (_) { /* chantier neutralisé : le rendu reste intact */ }
}
function creerSiAbsent(parent, selecteur, fabriquer) {
  if (!parent) return null;
  let noeud = parent.querySelector(selecteur);
  if (!noeud) { noeud = fabriquer(); parent.appendChild(noeud); }
  return noeud;
}
function balise(tag, classe, texte) {
  const noeud = document.createElement(tag);
  if (classe) noeud.className = classe;
  if (texte !== undefined) noeud.textContent = texte;
  return noeud;
}

register(ID, (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  if (!layout) return;

  css(P, `
    .${P} .recit-body{position:relative}
    .${P}-barre{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 12px;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.03)}
    .${P}-barre label{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
    .${P}-barre input,${''}.${P}-barre select{min-height:36px;padding:6px 8px;border:1px solid var(--line-strong);border-radius:6px;background:var(--sunken,#0c1016);color:var(--ink);font:inherit;font-size:12px}
    .${P}-barre input{flex:1 1 160px;min-width:120px}
    .${P}-barre button{min-height:36px;padding:6px 10px;border:1px solid var(--line-strong);border-radius:6px;background:transparent;color:var(--ink);font:inherit;font-size:11px;cursor:pointer}
    .${P}-barre :focus-visible{outline:2px solid var(--gold-bright,#e6b96f);outline-offset:2px}
    .${P}-statut{margin:0 0 8px;font-size:10px;color:var(--muted-2)}
    .${P}-item[data-${P}-estompe="oui"]{opacity:.28;text-decoration:line-through;text-decoration-color:var(--muted-2)}
    .${P}-item{transition:opacity .18s ease}
    .${P}-reduit .${P}-item{transition:none}
    @media (max-width:620px){.${P}-barre{display:grid;grid-template-columns:1fr 1fr}.${P}-barre label{grid-column:1 / -1}}
  `);

  const corps = layout.querySelector('.recit-body') || layout;
  const fil = layout.querySelector('.recit-thread-list, .c3a-thread, .recit-thread');
  const items = fil ? Array.from(fil.querySelectorAll('.recit-thread-item')) : [];
  const reduit = typeof reducedMotion === 'function' && reducedMotion();

  garder('01-portee', () => {
    layout.classList.add(P);
    layout.setAttribute('data-053', 'on');
  });

  garder('02-mesure', () => {
    layout.setAttribute('data-053-items', String(items.length));
  });

  garder('03-marquage', () => {
    items.forEach((item, index) => {
      item.classList.add(P + '-item');
      if (!item.hasAttribute('data-053-index')) item.setAttribute('data-053-index', String(index));
    });
  });

  garder('04-champ', () => {
    const barre = creerSiAbsent(corps, '.' + P + '-barre', () => balise('div', P + '-barre'));
    if (!barre || barre.querySelector('.' + P + '-search')) return;
    const etiquette = balise('label', P + '-label', 'Rechercher dans le fil');
    etiquette.htmlFor = '053-search';
    const champ = balise('input', P + '-search');
    champ.type = 'search';
    champ.id = '053-search';
    champ.setAttribute('aria-controls', fil ? (fil.id || (fil.id = '053-fil')) : '053-fil');
    champ.placeholder = 'Mot du point';
    barre.appendChild(etiquette);
    barre.appendChild(champ);
  });

  garder('05-filtre-type', () => {
    const barre = corps.querySelector('.' + P + '-barre');
    if (!barre || barre.querySelector('.' + P + '-kind')) return;
    const etiquette = balise('label', P + '-label', 'Nature');
    etiquette.htmlFor = '053-kind';
    const liste = balise('select', P + '-kind');
    liste.id = '053-kind';
    const kinds = ['récit', 'figure', 'lieu', 'audit'];
    ['Toutes'].concat(kinds.filter((k) => items.some((it) => (it.getAttribute('data-kind') || '').indexOf(k) >= 0)))
      .forEach((valeur) => {
        const option = balise('option', '', valeur);
        option.value = valeur === 'Toutes' ? '' : valeur;
        liste.appendChild(option);
      });
    barre.appendChild(etiquette);
    barre.appendChild(liste);
  });

  garder('06-filtre-certitude', () => {
    const barre = corps.querySelector('.' + P + '-barre');
    if (!barre || barre.querySelector('.' + P + '-conf')) return;
    const etiquette = balise('label', P + '-label', 'Certitude');
    etiquette.htmlFor = '053-conf';
    const liste = balise('select', P + '-conf');
    liste.id = '053-conf';
    ['Toutes', 'vérifié', 'certain', 'probable', 'contesté', 'disputed'].forEach((valeur) => {
      const option = balise('option', '', valeur === 'disputed' ? 'contesté (disputed)' : valeur);
      option.value = valeur === 'Toutes' ? '' : (valeur === 'disputed' ? 'contesté' : valeur);
      liste.appendChild(option);
    });
    barre.appendChild(etiquette);
    barre.appendChild(liste);
  });

  garder('07-raz', () => {
    const barre = corps.querySelector('.' + P + '-barre');
    if (!barre || barre.querySelector('.' + P + '-raz')) return;
    const bouton = balise('button', P + '-raz', 'Réinitialiser');
    bouton.type = 'button';
    bouton.disabled = true;
    barre.appendChild(bouton);
    const statut = creerSiAbsent(corps, '.' + P + '-statut', () => {
      const p = balise('p', P + '-statut');
      p.setAttribute('role', 'status');
      p.setAttribute('aria-live', 'polite');
      return p;
    });
    if (statut) statut.textContent = items.length + ' point(s) dans le fil de ce repère.';

    const appliquer = () => {
      const recherche = (corps.querySelector('.' + P + '-search') || {}).value || '';
      const nature = (corps.querySelector('.' + P + '-kind') || {}).value || '';
      const certitude = (corps.querySelector('.' + P + '-conf') || {}).value || '';
      const norm = (s) => String(s || '').toLocaleLowerCase('fr');
      let visibles = 0;
      items.forEach((item) => {
        const texte = norm(item.textContent);
        const okTexte = !recherche || texte.indexOf(norm(recherche)) >= 0;
        const okNature = !nature || norm(item.getAttribute('data-kind')).indexOf(norm(nature)) >= 0;
        const okCert = !certitude || norm(item.getAttribute('data-confidence')).indexOf(norm(certitude)) >= 0;
        const ok = okTexte && okNature && okCert;
        item.setAttribute('data-053-estompe', ok ? 'non' : 'oui');
        if (ok) visibles += 1;
      });
      if (statut) statut.textContent = visibles + ' point(s) affiché(s) sur ' + items.length + '.';
      bouton.disabled = !(recherche || nature || certitude);
    };

    ['search', 'kind', 'conf'].forEach((cle) => {
      const noeud = corps.querySelector('.' + P + '-' + cle);
      if (noeud) noeud.addEventListener('input', appliquer);
    });
    bouton.addEventListener('click', () => {
      ['search', 'kind', 'conf'].forEach((cle) => {
        const noeud = corps.querySelector('.' + P + '-' + cle);
        if (noeud) noeud.value = '';
      });
      appliquer();
      const champ = corps.querySelector('.' + P + '-search');
      if (champ) champ.focus({ preventScroll: reduit });
    });
  });

  garder('08-annonce', () => {
    const statut = corps.querySelector('.' + P + '-statut');
    if (statut && !statut.hasAttribute('data-053-annonce')) {
      statut.setAttribute('data-053-annonce', 'un');
    }
  });

  garder('09-focus', () => {
    const barre = corps.querySelector('.' + P + '-barre');
    if (barre && !barre.hasAttribute('role')) barre.setAttribute('role', 'group');
    if (barre && !barre.getAttribute('aria-label')) barre.setAttribute('aria-label', 'Recherche et filtres du fil');
  });

  garder('10-mouvement', () => {
    if (reduit) layout.classList.add(P + '-reduit');
  });
});
