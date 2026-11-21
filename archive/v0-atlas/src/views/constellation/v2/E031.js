import { register } from './registry.js';

/* Lentille V2 E031 — exploration clavier avancée des arêtes du graphe de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous déterministes,
   sans réseau, sans aléa, sans minuteur, sans boucle d'animation ni journal.
   Frontière : aucune géométrie recalculée, aucun stroke réécrit, aucun fichier
   partagé modifié — seulement des contrôles, des attributs et de la sémantique. */

const CSS_ID = 'constellation-v2-e031';
const EXPLORER_ID = 'v2e031-explorer';
const TOOLBAR_ID = 'v2e031-toolbar';
const GROUPE_RAYON_ID = 'v2e031-groupe-rayons';
const GROUPE_ATTACHE_ID = 'v2e031-groupe-attaches';
const SELECT_ID = 'v2e031-select';
const PREV_ID = 'v2e031-precedent';
const NEXT_ID = 'v2e031-suivant';
const FILTRE_RAYON_ID = 'v2e031-filtre-rayons';
const FILTRE_ATTACHE_ID = 'v2e031-filtre-attaches';
const TRI_ID = 'v2e031-tri';
const RESET_ID = 'v2e031-reset';
const SUMMARY_ID = 'v2e031-resume';
const FILTRE_LIVE_ID = 'v2e031-filtre-live';
const MEMOIRE_KEY = '__v2e031_dernier';

/* Feuille unique, intégralement préfixée `v2e031-` : aucune URL, aucune police
   distante, aucune règle générique. Mouvement réduit et couleurs forcés couverts. */
const CSS = `
.v2e031-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
#${EXPLORER_ID}{margin-top:6px;padding:6px;border-top:1px solid var(--line)}
.v2e031-groupe{margin:5px 0;padding:5px;border-left:2px solid var(--line)}
.v2e031-groupe[hidden],button.v2e031-edge[hidden]{display:none!important}
.v2e031-titre-groupe{margin:0 0 4px;color:var(--muted);font-size:10px;line-height:1.3}
button.v2e031-edge{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:36px;min-height:36px;margin:2px;padding:0 6px;
  border:1px solid var(--line);border-radius:8px;background:var(--surface-2);
  color:var(--muted);font-size:10px;font-variant-numeric:tabular-nums;cursor:pointer;
}
button.v2e031-edge:focus{outline:none}
button.v2e031-edge:focus-visible,button.v2e031-edge[data-v2e031-focus="1"]{
  outline:2px solid var(--gold-bright);outline-offset:2px;
  box-shadow:0 0 0 4px rgba(230,185,111,.22);color:var(--gold-bright);
}
button.v2e031-edge[data-v2e031-roving="entree"]{border-color:var(--violet);color:var(--violet)}
#${TOOLBAR_ID}{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}
.v2e031-champ{display:inline-flex;align-items:center;gap:6px;color:var(--muted);font-size:10px}
.v2e031-champ label{color:var(--muted)}
.v2e031-controle{
  display:inline-flex;align-items:center;justify-content:center;
  min-width:44px;min-height:44px;padding:0 10px;
  border:1px solid var(--line);border-radius:8px;background:var(--surface-2);
  color:var(--gold-bright);font-size:11px;cursor:pointer;
}
.v2e031-controle:focus{outline:none}
.v2e031-controle:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.v2e031-controle[aria-pressed="true"]::after{content:" ✓";font-weight:700}
.v2e031-controle:disabled{opacity:.5;cursor:not-allowed}
#${SELECT_ID}{min-height:44px;padding:0 8px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:11px}
#${SELECT_ID}:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#${SUMMARY_ID}{margin:6px 0 0;color:var(--muted);font-size:10px;line-height:1.4;font-variant-numeric:tabular-nums}
@media (prefers-reduced-motion:reduce){.v2e031-controle,button.v2e031-edge{transition:none}}
@media (forced-colors:active){
  button.v2e031-edge:focus-visible,button.v2e031-edge[data-v2e031-focus="1"],
  .v2e031-controle:focus-visible,#${SELECT_ID}:focus-visible{outline-color:Highlight;box-shadow:none}
  button.v2e031-edge[data-v2e031-roving="entree"]{border-color:CanvasText;color:CanvasText}
  .v2e031-controle[aria-pressed="true"]::after{content:" (actif)"}
}
@media (max-width:620px){
  #${TOOLBAR_ID}{gap:4px}
  button.v2e031-edge{min-width:36px;min-height:36px;padding:0 5px}
}
`;

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(fn) {
  try { fn(); } catch { /* silence voulu : aucune journalisation */ }
}

/* Lecturetolérante d'un attribut numérique du SVG, sans écriture. */
function nombre(ligne, attribut) {
  const brut = typeof ligne.getAttribute === 'function' ? ligne.getAttribute(attribut) : '';
  const valeur = Number.parseFloat(brut);
  return Number.isFinite(valeur) ? Math.round(valeur * 100) / 100 : 0;
}

/* Clé de tri déterministe : coordonnées arrondies, jamais d'aléa. */
function cle(ligne) {
  return [nombre(ligne, 'y1'), nombre(ligne, 'x1'), nombre(ligne, 'y2'), nombre(ligne, 'x2')];
}

/* Nature d'une arête, déduite de la classe réelle posée par la vue. */
function nature(ligne) {
  const classes = ligne && typeof ligne.classList === 'object' ? ligne.classList : null;
  return classes && classes.contains('is-moon') ? 'attache' : 'rayon';
}

function pluriel(n, singulier, plurielMot) { return n === 1 ? singulier : plurielMot; }

function estMasque(noeud) { return !!noeud && noeud.hasAttribute && noeud.hasAttribute('hidden'); }

register('E031', ctx => {
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (typeof layout.querySelectorAll !== 'function') return;

  const doc = layout.ownerDocument || document;
  const make = (tag, cls, text) => typeof ctx.el === 'function'
    ? ctx.el(tag, cls, text) : doc.createElement(tag);

  /* Lecture unique des arêtes, dans l'ordre de création du SVG de la vue. */
  const svg = safe(() => layout.querySelector('svg.constellation-edges')) || null;
  const lignes = svg && typeof svg.querySelectorAll === 'function'
    ? Array.from(svg.querySelectorAll('line.const-edge')) : [];
  if (!lignes.length) return;
  const total = lignes.length;
  const natures = lignes.map(nature);

  safe(() => css(CSS_ID, CSS));

  const filtre = { rayon: true, attache: true };
  let ordre = 'creation';
  let roving = 0;

  let explorer = safe(() => layout.querySelector(`#${EXPLORER_ID}`)) || null;
  if (!explorer) {
    explorer = make('div', 'v2e031-explorer');
    explorer.id = EXPLORER_ID;
    const champ = safe(() => layout.querySelector('.constellation-field')) || null;
    if (champ && champ.parentNode) champ.parentNode.insertBefore(explorer, champ.nextSibling);
    else layout.appendChild(explorer);
  }
  explorer.setAttribute('role', 'group');
  explorer.setAttribute('aria-label', `Explorateur avancé des ${total} arêtes du graphe`);
  explorer.dataset.v2e031Total = String(total);

  let toolbar = safe(() => layout.querySelector(`#${TOOLBAR_ID}`)) || null;
  if (!toolbar) {
    toolbar = make('div', 'v2e031-toolbar');
    toolbar.id = TOOLBAR_ID;
    const ancre = safe(() => layout.querySelector('.constellation-caption')) || layout;
    ancre.insertBefore(toolbar, ancre.firstChild);
  }
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', 'Commandes de l’explorateur d’arêtes');

  function assureGroupe(id, libelle) {
    let groupe = safe(() => explorer.querySelector(`#${id}`)) || null;
    if (!groupe) {
      groupe = make('div', 'v2e031-groupe');
      groupe.id = id;
      groupe.appendChild(make('p', 'v2e031-titre-groupe', libelle));
      explorer.appendChild(groupe);
    }
    groupe.setAttribute('role', 'group');
    groupe.setAttribute('aria-label', libelle);
    return groupe;
  }

  /* E031-01 — Sous-groupes par nature : rayons planétaires et attaches
     lunaires sont séparés dans l'explorateur, chacun avec son propre rôle. */
  const groupes = {
    rayon: assureGroupe(GROUPE_RAYON_ID, 'Rayons — traits entre une planète et son repère'),
    attache: assureGroupe(GROUPE_ATTACHE_ID, 'Attaches — traits entre une lune et un point vérifié'),
  };

  let proxies = Array.from(explorer.querySelectorAll('button.v2e031-edge'));
  if (proxies.length !== total) {
    proxies.forEach(noeud => { if (noeud.parentNode) noeud.parentNode.removeChild(noeud); });
    proxies = lignes.map((ligne, index) => {
      const bouton = make('button', 'v2e031-edge', String(index + 1));
      bouton.type = 'button';
      bouton.id = `v2e031-edge-${index}`;
      return bouton;
    });
  }
  proxies.forEach((bouton, index) => {
    bouton.dataset.v2e031Index = String(index);
    bouton.setAttribute('aria-label', `Arête ${index + 1} sur ${total} : ${natures[index] === 'attache' ? 'attache lunaire' : 'rayon planétaire'}.`);
    const groupe = groupes[natures[index]];
    if (bouton.parentNode !== groupe) groupe.appendChild(bouton);
    lignes[index].dataset.v2e031Liaison = bouton.id;
  });

  function visibles() {
    return Array.from(explorer.querySelectorAll('button.v2e031-edge:not([hidden])'));
  }
  function indicesVisibles() {
    return visibles().map(noeud => Number(noeud.dataset.v2e031Index))
      .filter(index => Number.isInteger(index) && index >= 0 && index < total);
  }
  function setRoving(index) {
    if (index < 0 || index >= total) return;
    roving = index;
    proxies.forEach((bouton, i) => {
      bouton.tabIndex = (i === roving && !estMasque(bouton)) ? 0 : -1;
      if (i === roving) bouton.dataset.v2e031Roving = 'entree';
      else bouton.removeAttribute('data-v2e031-roving');
      if (lignes[i] && lignes[i].setAttribute) lignes[i].dataset.v2e031Courant = i === roving ? '1' : '0';
    });
    layout.dataset.v2e031Roving = String(roving);
    safe(() => { if (typeof window !== 'undefined') window[MEMOIRE_KEY] = roving; });
  }
  function focusIndex(index) {
    if (index < 0 || index >= total) return;
    const bouton = proxies[index];
    if (!bouton || estMasque(bouton)) return;
    setRoving(index);
    safe(() => bouton.focus({ preventScroll: true }));
  }

  function appliquerFiltres() {
    proxies.forEach((bouton, i) => {
      if (filtre[natures[i]]) bouton.removeAttribute('hidden');
      else bouton.setAttribute('hidden', '');
    });
    Object.keys(groupes).forEach(natureGroupe => {
      const groupe = groupes[natureGroupe];
      if (filtre[natureGroupe]) groupe.removeAttribute('hidden');
      else groupe.setAttribute('hidden', '');
      groupe.dataset.v2e031Filtre = filtre[natureGroupe] ? 'visible' : 'masque';
    });
    const restants = indicesVisibles();
    if (restants.length && restants.indexOf(roving) < 0) {
      setRoving(restants[0]);
    } else {
      setRoving(roving);
    }
  }

  function appliquerOrdre() {
    Object.keys(groupes).forEach(natureGroupe => {
      const groupe = groupes[natureGroupe];
      let membres = proxies.filter((bouton, i) => natures[i] === natureGroupe);
      if (ordre === 'geometrique') {
        membres = membres.slice().sort((a, b) => {
          const ia = Number(a.dataset.v2e031Index);
          const ib = Number(b.dataset.v2e031Index);
          const ka = cle(lignes[ia]);
          const kb = cle(lignes[ib]);
          for (let i = 0; i < ka.length; i += 1) {
            if (ka[i] !== kb[i]) return ka[i] - kb[i];
          }
          return ia - ib;
        });
      }
      membres.forEach(bouton => groupe.appendChild(bouton));
      groupe.dataset.v2e031Ordre = ordre;
    });
  }

  let resume = safe(() => layout.querySelector(`#${SUMMARY_ID}`)) || null;
  if (!resume) {
    resume = make('p', 'v2e031-resume', '');
    resume.id = SUMMARY_ID;
    toolbar.appendChild(resume);
  }
  function majResume(index) {
    const texte = natures[index] === 'attache' ? 'Attache lunaire' : 'Rayon planétaire';
    resume.textContent = `${texte} — arête ${index + 1} sur ${total} · ordre ${ordre}`;
  }

  let filtreLive = safe(() => layout.querySelector(`#${FILTRE_LIVE_ID}`)) || null;
  if (!filtreLive) {
    filtreLive = make('p', 'v2e031-sr', '');
    filtreLive.id = FILTRE_LIVE_ID;
    filtreLive.setAttribute('role', 'status');
    filtreLive.setAttribute('aria-live', 'polite');
    filtreLive.setAttribute('aria-atomic', 'true');
    layout.appendChild(filtreLive);
  }
  function annoncerFiltre(intro) {
    const restants = indicesVisibles();
    const nr = restants.filter(i => natures[i] === 'rayon').length;
    const na = restants.filter(i => natures[i] === 'attache').length;
    const debut = intro ? `${intro} — ` : '';
    filtreLive.textContent = `${debut}${nr} ${pluriel(nr, 'rayon affiché', 'rayons affichés')}, ${na} ${pluriel(na, 'attache affichée', 'attaches affichées')}.`;
  }

  /* E031-02 — Saut de nature : PageUp/PageDown et crochets passent du
     premier rayon à la première attache visible, et réciproquement. */
  safe(() => {
    explorer.addEventListener('keydown', (event) => {
      if (!event || (event.key !== 'PageUp' && event.key !== 'PageDown'
          && event.key !== '[' && event.key !== ']')) return;
      const cible = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('button.v2e031-edge') : null;
      if (!cible || !explorer.contains(cible) || estMasque(cible)) return;
      const courant = natures[roving];
      const autre = courant === 'rayon' ? 'attache' : 'rayon';
      const dest = indicesVisibles().find(i => natures[i] === autre);
      if (dest === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      focusIndex(dest);
    }, true);
  });

  /* E031-03 — Bascules indépendantes de filtrage : deux boutons aria-pressed
     montrent ou masquent une nature entière, avec annonce live dédiée. */
  const boutonsFiltre = [
    { id: FILTRE_RAYON_ID, cle: 'rayon', texte: 'Rayons', absence: 'Aucun rayon dans cette constellation' },
    { id: FILTRE_ATTACHE_ID, cle: 'attache', texte: 'Attaches', absence: 'Aucune attache dans cette constellation' },
  ];
  function majBascules() {
    boutonsFiltre.forEach(spec => {
      const bouton = safe(() => layout.querySelector(`#${spec.id}`)) || null;
      if (!bouton) return;
      bouton.setAttribute('aria-pressed', filtre[spec.cle] ? 'true' : 'false');
      bouton.dataset.v2e031Filtre = filtre[spec.cle] ? 'visible' : 'masque';
    });
  }
  boutonsFiltre.forEach(spec => {
    let bouton = safe(() => layout.querySelector(`#${spec.id}`)) || null;
    if (!bouton) {
      bouton = make('button', 'v2e031-controle', spec.texte);
      bouton.type = 'button';
      bouton.id = spec.id;
      toolbar.appendChild(bouton);
    }
    bouton.setAttribute('aria-label', `${spec.texte} : afficher ou masquer cette nature d’arête`);
    constPresent = natures.some(n => n === spec.cle);
    bouton.disabled = !constPresent;
    if (!constPresent) bouton.title = spec.absence;
    bouton.addEventListener('click', () => {
      if (!constPresent) return;
      filtre[spec.cle] = !filtre[spec.cle];
      majBascules();
      appliquerFiltres();
      annoncerFiltre(`${spec.texte} ${filtre[spec.cle] ? 'affichés' : 'masqués'}`);
      majResume(roving);
    });
  });
  majBascules();

  /* E031-04 — Sélecteur numérique : un choix par arête, 1 sur N, avec sa
     nature, pour un saut direct complémentaire de Début/Fin. */
  let select = safe(() => layout.querySelector(`#${SELECT_ID}`)) || null;
  if (!select) {
    const champ = make('span', 'v2e031-champ');
    champ.appendChild(make('label', '', 'Aller à l’arête'));
    select = make('select', '');
    select.id = SELECT_ID;
    champ.lastChild.setAttribute('for', SELECT_ID);
    champ.appendChild(select);
    toolbar.insertBefore(champ, toolbar.firstChild);
  }
  while (select.firstChild) select.removeChild(select.firstChild);
  lignes.forEach((ligne, index) => {
    const option = make('option', undefined,
      `Arête ${index + 1} sur ${total} — ${natures[index] === 'attache' ? 'attache lunaire' : 'rayon planétaire'}`);
    option.value = String(index);
    select.appendChild(option);
  });
  select.setAttribute('aria-label', 'Choisir une arête par son numéro');
  select.addEventListener('change', () => {
    const index = Number(select.value);
    if (!Number.isInteger(index) || index < 0 || index >= total) return;
    if (!filtre[natures[index]]) {
      filtre[natures[index]] = true;
      majBascules();
      appliquerFiltres();
      annoncerFiltre('Nature réaffichée');
    }
    focusIndex(index);
    majResume(index);
  });

  /* E031-05 — Ordre géométrique déterministe : la bascule réordonne les
     proxies par coordonnées arrondies (y puis x), sans toucher au SVG. */
  let tri = safe(() => layout.querySelector(`#${TRI_ID}`)) || null;
  if (!tri) {
    tri = make('button', 'v2e031-controle', 'Trier par position');
    tri.type = 'button';
    tri.id = TRI_ID;
    toolbar.appendChild(tri);
  }
  tri.setAttribute('aria-label', 'Basculer entre l’ordre de création et l’ordre géométrique des arêtes');
  tri.addEventListener('click', () => {
    ordre = ordre === 'creation' ? 'geometrique' : 'creation';
    tri.setAttribute('aria-pressed', ordre === 'geometrique' ? 'true' : 'false');
    tri.dataset.v2e031Ordre = ordre;
    appliquerOrdre();
    focusIndex(roving);
    majResume(roving);
  });

  /* E031-06 — Mémoire de position entre rendus : l'index visité est relu
     depuis une clé window dédiée, bornée et écrite à chaque déplacement. */
  safe(() => {
    if (typeof window !== 'undefined' && Number.isInteger(window[MEMOIRE_KEY])) {
      const memorise = window[MEMOIRE_KEY];
      roving = memorise >= 0 && memorise < total ? memorise : 0;
    }
  });
  safe(() => {
    explorer.addEventListener('focusin', (event) => {
      const bouton = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('button.v2e031-edge') : null;
      if (!bouton || !explorer.contains(bouton)) return;
      const index = Number(bouton.dataset.v2e031Index);
      if (!Number.isInteger(index)) return;
      proxies.forEach(noeud => noeud.removeAttribute('data-v2e031-focus'));
      bouton.dataset.v2e031Focus = '1';
      setRoving(index);
      majResume(index);
      if (select) select.value = String(index);
    });
  });

  /* E031-07 — Échap rend la main au sélecteur, point d'entrée stable des
     commandes, sans détruire le focus courant si le contrôle est absent. */
  safe(() => {
    explorer.addEventListener('keydown', (event) => {
      if (!event || event.key !== 'Escape') return;
      const cible = event.target && typeof event.target.closest === 'function'
        ? event.target.closest('button.v2e031-edge') : null;
      if (!cible || !explorer.contains(cible)) return;
      const entree = select || safe(() => layout.querySelector(`#${FILTRE_RAYON_ID}`)) || null;
      if (!entree || typeof entree.focus !== 'function') return;
      event.preventDefault();
      event.stopPropagation();
      entree.focus({ preventScroll: true });
    }, true);
  });

  /* E031-08 — Boutons visuels précédent/suivant : cibles de 44 px partageant
     exactement la même file d'arêtes visibles que le clavier. */
  function voisin(delta) {
    const restants = indicesVisibles();
    if (!restants.length) return;
    const position = restants.indexOf(roving);
    const base = position < 0 ? 0 : position;
    const suivante = ((base + delta) % restants.length + restants.length) % restants.length;
    focusIndex(restants[suivante]);
  }
  [
    { id: PREV_ID, texte: '‹', label: 'Arête précédente', pas: -1 },
    { id: NEXT_ID, texte: '›', label: 'Arête suivante', pas: 1 },
  ].forEach(spec => {
    let bouton = safe(() => layout.querySelector(`#${spec.id}`)) || null;
    if (!bouton) {
      bouton = make('button', 'v2e031-controle', spec.texte);
      bouton.type = 'button';
      bouton.id = spec.id;
      toolbar.appendChild(bouton);
    }
    bouton.setAttribute('aria-label', spec.label);
    bouton.addEventListener('click', () => voisin(spec.pas));
  });

  /* E031-09 — Résumé textuel permanent : nature, position et ordre courant,
     complément non vocal du compteur et de la région live de la passe 1. */
  safe(() => {
    majResume(roving);
    resume.dataset.v2e031Resume = 'actif';
    explorer.setAttribute('aria-describedby', SUMMARY_ID);
  });

  /* E031-10 — Réinitialisation complète, raccourcis déclarés et état prêt :
     un seul bouton restaure filtres, ordre et position, et trace l'état. */
  let reset = safe(() => layout.querySelector(`#${RESET_ID}`)) || null;
  if (!reset) {
    reset = make('button', 'v2e031-controle', 'Réinitialiser');
    reset.type = 'button';
    reset.id = RESET_ID;
    toolbar.appendChild(reset);
  }
  reset.setAttribute('aria-label', 'Réinitialiser les filtres, l’ordre et la position de l’explorateur');
  reset.addEventListener('click', () => {
    filtre.rayon = true;
    filtre.attache = true;
    ordre = 'creation';
    tri.setAttribute('aria-pressed', 'false');
    tri.dataset.v2e031Ordre = 'creation';
    majBascules();
    appliquerOrdre();
    appliquerFiltres();
    setRoving(0);
    focusIndex(0);
    majResume(0);
    if (select) select.value = '0';
    filtreLive.textContent = 'Explorateur réinitialisé : toutes les arêtes affichées, ordre de création.';
    layout.dataset.v2e031Ready = '1';
  });
  proxies.forEach(bouton => {
    bouton.setAttribute('aria-keyshortcuts', 'PageUp PageDown BracketLeft BracketRight Escape');
  });

  /* Amorçage unique, après que tous les contrôles existent. */
  appliquerOrdre();
  appliquerFiltres();
  setRoving(roving);
  majResume(roving);
  if (select) select.value = String(roving);
  layout.dataset.v2e031Ready = '1';
  layout.dataset.v2e031Memoire = String(roving);
});
