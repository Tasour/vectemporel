import { register } from './registry.js';

/* Lentille V2 E061 — accessibilité clavier des métriques chiffrées de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau, sans source aléatoire, sans minuteur ni boucle d'animation propre. */

const P = 'v2e061-';
const ID_PANEL = P + 'panel';
const ID_LIST = P + 'list';
const ID_TABLE_WRAP = P + 'table-wrap';
const ID_TBODY = P + 'tbody';
const ID_TH_VALUE = P + 'th-value';
const ID_LIVE = P + 'live';

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = {
  indexActif: 0,
  documentLie: false,
  filtre: 'toutes',
  tri: 'aucun',
};

/* Chaque chantier est isolé : une anomalie locale n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journalisation */ }
}

function decimale(valeur) {
  return (Math.round(valeur * 10) / 10).toFixed(1).replace('.', ',');
}

function pct(valeur, maximum) {
  return maximum > 0 ? Math.max(0, Math.min(100, Math.round((valeur / maximum) * 100))) : 0;
}

function maxJauge(figure) {
  return figure.categorie === 'qualite' ? 100 : Math.max(10, Math.ceil(figure.reference * 2));
}

/* Feuille unique. Chaque règle est rattachée à son chantier par un commentaire. */
const CSS = `
  #v2e061-panel{margin:12px 0 0;padding:10px 12px;border:1px solid var(--violet);border-radius:8px;background:var(--surface-2);color:var(--muted);font:inherit;font-size:10px;line-height:1.5}
  #v2e061-panel h2{margin:0 0 6px;color:var(--gold);font-size:11px;font-weight:600}
  #v2e061-live{margin:6px 0 0;color:var(--gold-bright);font-size:9px;min-height:1em}
  #v2e061-summary{margin:0 0 8px;color:var(--muted);font-size:9px}
  #v2e061-list{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none}
  .v2e061-figure{display:inline-flex;flex-direction:column;align-items:flex-start;gap:4px;min-width:104px;min-height:44px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--ink-soft);font:inherit;font-size:10px;cursor:pointer;font-variant-numeric:tabular-nums}
  .v2e061-figure:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;text-decoration:underline}
  .v2e061-rank{font-size:8px;color:var(--gold);text-decoration:underline}
  .v2e061-val{font-weight:600}
  /* v2e061-01 : jauge sémantique, barre remplie de façon déterministe. */
  .v2e061-meter{position:relative;display:block;width:100%;min-height:8px;border:1px solid var(--line);border-radius:4px;background:var(--surface-2);overflow:hidden}
  .v2e061-meter::before{content:"";position:absolute;left:0;top:0;bottom:0;width:var(--v2e061-fill,0%);background:var(--violet)}
  .v2e061-meter-txt{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
  /* v2e061-08 : mode texte, la valeur remplace la barre sans la seule couleur. */
  .v2e061-texte .v2e061-meter{min-height:0;border:0;background:transparent;overflow:visible}
  .v2e061-texte .v2e061-meter::before{display:none}
  .v2e061-texte .v2e061-meter-txt{position:static;width:auto;height:auto;clip:auto;color:var(--gold-bright);font-size:9px}
  #v2e061-table-wrap{margin:8px 0 0;overflow:auto;border:1px solid var(--line);border-radius:6px}
  #v2e061-table-wrap:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #v2e061-table{border-collapse:collapse;width:100%;font:inherit;font-size:9px}
  #v2e061-table caption{text-align:left;padding:6px;color:var(--gold);font-weight:600}
  #v2e061-table th,#v2e061-table td{border-top:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:middle}
  #v2e061-table th[scope="col"]{color:var(--muted-2);font-weight:600}
  #v2e061-table th[scope="col"][aria-sort]{text-decoration:underline}
  /* v2e061-04 : surbrillance croisée doublée par aria-current. */
  .v2e061-lnk{background:rgba(244,214,158,.12);outline:1px dashed var(--gold-bright);outline-offset:-1px}
  /* v2e061-09 : isolation visuelle de la métrique courante. */
  .v2e061-isolate .v2e061-figure:not([data-v2e061-isole="oui"]){opacity:.35}
  #v2e061-tools{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
  .v2e061-tool{min-height:36px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--ink-soft);font:inherit;font-size:10px;cursor:pointer}
  .v2e061-tool:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px;text-decoration:underline}
  .v2e061-tool[aria-pressed="true"]{border-style:dashed;font-weight:600}
  #v2e061-filter{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0}
  .v2e061-radio{min-height:36px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;background:transparent;color:var(--ink-soft);font:inherit;font-size:10px;cursor:pointer}
  .v2e061-radio[aria-checked="true"]{border-style:double;font-weight:600}
  .v2e061-radio:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
  #v2e061-panel [hidden]{display:none!important}
  .v2e061-still #v2e061-panel,.v2e061-still #v2e061-panel *{transition:none!important;animation:none!important}
  @media (prefers-reduced-motion:reduce){#v2e061-panel,#v2e061-panel *{transition:none!important;animation:none!important}}
  @media (max-width:620px){#v2e061-panel{padding:8px}}`;

register('E061', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const doc = layout.ownerDocument || document;

  const make = typeof ctx.el === 'function'
    ? (tag, cls, txt) => ctx.el(tag, cls, txt)
    : (tag, cls, txt) => {
        const n = doc.createElement(tag);
        if (cls) n.className = cls;
        if (txt !== undefined) n.textContent = txt;
        return n;
      };
  const dire = (message) => {
    const live = doc.getElementById(ID_LIVE);
    if (live) live.textContent = message;
  };

  /* Feuille unique, identifiant réservé à cette lentille. */
  css('constellation-v2-e061', CSS);

  /* Préparation — métriques dérivées du DOM rendu, sans nouvelle source. */
  const soleils = Array.from(layout.querySelectorAll('.const-sun'));
  const planetes = Array.from(layout.querySelectorAll('.const-planet'));
  const lunes = Array.from(layout.querySelectorAll('.const-moon'));
  const etatNoeud = layout.querySelector('.constellation-state');
  const texteEtat = etatNoeud && typeof etatNoeud.textContent === 'string'
    ? etatNoeud.textContent : '';
  const repere = /Point\s*:\s*(\d+)\s*\/\s*(\d+)/.exec(texteEtat);
  const pointCourant = repere ? Number(repere[1]) : 0;
  const pointTotal = repere ? Number(repere[2]) : 0;
  let sommeConfiance = 0;
  let nbConfiance = 0;
  lunes.forEach((lune) => {
    const source = (lune.getAttribute('title') || '') + ' '
      + (lune.getAttribute('aria-label') || '');
    const mesure = /confiance\s+(\d+)/i.exec(source);
    if (mesure) {
      sommeConfiance += Number(mesure[1]);
      nbConfiance += 1;
    }
  });
  const confiance = nbConfiance ? Math.round(sommeConfiance / nbConfiance) : 0;
  const referenceCompte = (soleils.length + planetes.length + lunes.length) / 3;
  const figures = [
    { cle: 'eres', titre: 'Ères', valeur: soleils.length, unite: '', reference: referenceCompte, categorie: 'compteurs' },
    { cle: 'reperes', titre: 'Repères', valeur: planetes.length, unite: '', reference: referenceCompte, categorie: 'compteurs' },
    { cle: 'points', titre: 'Points vérifiés', valeur: lunes.length, unite: '', reference: referenceCompte, categorie: 'compteurs' },
    { cle: 'confiance', titre: 'Confiance moyenne', valeur: confiance, unite: ' %', reference: 50, categorie: 'qualite' },
  ];
  if (etat.indexActif >= figures.length) etat.indexActif = 0;

  const tbodyRow = (index) => {
    const tb = doc.getElementById(ID_TBODY);
    return tb ? tb.querySelector('.v2e061-row[data-v2e061-index="' + index + '"]') : null;
  };

  const makeMeter = (figure) => {
    const maximum = maxJauge(figure);
    const meter = make('span', 'v2e061-meter');
    meter.setAttribute('role', 'meter');
    meter.setAttribute('aria-valuemin', '0');
    meter.setAttribute('aria-valuemax', String(maximum));
    meter.setAttribute('aria-valuenow', String(figure.valeur));
    meter.setAttribute('aria-valuetext',
      figure.titre + ' : ' + figure.valeur + figure.unite + ' sur ' + maximum);
    meter.dataset.v2e061Meter = figure.cle;
    meter.style.setProperty('--v2e061-fill', pct(figure.valeur, maximum) + '%');
    meter.appendChild(make('span', 'v2e061-meter-txt',
      figure.valeur + figure.unite + ' / ' + maximum));
    return meter;
  };

  /* Préparation — coque du panneau, recréée à chaque rendu (idempotence). */
  sansEchec(() => {
    const precedent = doc.getElementById(ID_PANEL);
    if (precedent && precedent.parentNode) precedent.parentNode.removeChild(precedent);
    const panneau = make('section', 'v2e061-panel');
    panneau.id = ID_PANEL;
    panneau.setAttribute('aria-labelledby', P + 'title');
    const titre = make('h2', 'v2e061-title', 'Métriques chiffrées · lecture clavier V2');
    titre.id = P + 'title';
    panneau.appendChild(titre);

    const liste = make('ul', 'v2e061-list');
    liste.id = ID_LIST;
    figures.forEach((figure, index) => {
      const item = make('li', 'v2e061-item');
      item.id = P + 'item-' + index;
      const bouton = make('button', 'v2e061-figure');
      bouton.type = 'button';
      bouton.dataset.v2e061Index = String(index);
      bouton.dataset.v2e061Link = figure.cle;
      bouton.setAttribute('aria-label', figure.titre + ' : ' + figure.valeur + figure.unite
        + ' · métrique ' + (index + 1) + ' sur ' + figures.length);
      bouton.appendChild(make('span', 'v2e061-rank', String(index + 1)));
      const valeur = make('span', 'v2e061-val', String(figure.valeur) + figure.unite);
      valeur.id = P + 'val-' + index;
      bouton.appendChild(valeur);
      item.appendChild(bouton);
      liste.appendChild(item);
    });
    panneau.appendChild(liste);

    const wrap = make('div', 'v2e061-table-wrap');
    wrap.id = ID_TABLE_WRAP;
    panneau.appendChild(wrap);

    const filtre = make('div', 'v2e061-filter');
    filtre.id = P + 'filter';
    panneau.appendChild(filtre);

    const outils = make('div', 'v2e061-tools');
    outils.id = P + 'tools';
    const specs = [
      { id: P + 'sort', label: 'Trier par valeur (croissant)', cle: 'tri' },
      { id: P + 'speak', label: 'Sélectionner la valeur (S)', cle: 'speak' },
      { id: P + 'gauge-mode', label: 'Afficher la valeur textuelle', cle: 'gauge' },
      { id: P + 'isolate', label: 'Isoler la métrique courante', cle: 'isolate' },
      { id: P + 'check', label: 'Vérifier la cohérence', cle: 'check' },
    ];
    specs.forEach((spec) => {
      const bouton = make('button', 'v2e061-tool', spec.label);
      bouton.type = 'button';
      bouton.id = spec.id;
      if (spec.cle === 'speak') bouton.setAttribute('aria-keyshortcuts', 'S');
      if (spec.cle === 'gauge' || spec.cle === 'isolate') {
        bouton.setAttribute('aria-pressed', 'false');
      }
      outils.appendChild(bouton);
    });
    panneau.appendChild(outils);

    const live = make('p', 'v2e061-live');
    live.id = ID_LIVE;
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    panneau.appendChild(live);

    const ancre = layout.querySelector('.constellation-caption') || layout;
    ancre.insertBefore(panneau, ancre.firstChild || null);

    liste.addEventListener('focusin', (event) => {
      const cible = event && event.target;
      const bouton = cible && typeof cible.closest === 'function'
        ? cible.closest('.v2e061-figure') : null;
      if (bouton && bouton.dataset.v2e061Index !== undefined) {
        etat.indexActif = Number(bouton.dataset.v2e061Index);
      }
    });

    layout.dataset.v2e061Figures = String(figures.length);
    layout.dataset.v2e061Point = pointCourant + '/' + pointTotal;
    if (typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()) {
      layout.classList.add('v2e061-still');
    } else {
      layout.classList.remove('v2e061-still');
    }
  });

  /* E061-01 — Jauges sémantiques : role="meter" avec bornes, valeur courante
   * et équivalent textuel, la barre visible étant remplie de façon déterministe. */
  sansEchec(() => {
    const liste = doc.getElementById(ID_LIST);
    if (!liste) return;
    Array.from(liste.querySelectorAll('.v2e061-figure')).forEach((bouton) => {
      const figure = figures[Number(bouton.dataset.v2e061Index)];
      if (figure) bouton.appendChild(makeMeter(figure));
    });
    layout.dataset.v2e061Meters = String(figures.length);
  });

  /* E061-02 — Tableau de données alternatif : légende, en-têtes de colonnes
   * et de lignes explicites, conteneur focalisable pour le défilement clavier. */
  sansEchec(() => {
    const wrap = doc.getElementById(ID_TABLE_WRAP);
    if (!wrap || doc.getElementById(P + 'table')) return;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Tableau des métriques chiffrées, défilement au clavier');
    wrap.tabIndex = 0;
    const table = make('table', 'v2e061-table');
    table.id = P + 'table';
    table.appendChild(make('caption', '', 'Métriques chiffrées de la constellation'));
    const thead = make('thead');
    const trh = make('tr');
    const colonnes = [
      { texte: 'Métrique', id: '' },
      { texte: 'Valeur', id: ID_TH_VALUE },
      { texte: 'Échelle', id: '' },
    ];
    colonnes.forEach((colonne) => {
      const th = make('th', '', colonne.texte);
      th.setAttribute('scope', 'col');
      if (colonne.id) th.id = colonne.id;
      trh.appendChild(th);
    });
    thead.appendChild(trh);
    table.appendChild(thead);
    const tbody = make('tbody', 'v2e061-tbody');
    tbody.id = ID_TBODY;
    figures.forEach((figure, index) => {
      const rangee = make('tr', 'v2e061-row');
      rangee.tabIndex = 0;
      rangee.dataset.v2e061Link = figure.cle;
      rangee.dataset.v2e061Index = String(index);
      rangee.setAttribute('aria-label', figure.titre + ' : ' + figure.valeur + figure.unite);
      const th = make('th', '', figure.titre);
      th.setAttribute('scope', 'row');
      rangee.appendChild(th);
      rangee.appendChild(make('td', 'v2e061-cell-value', String(figure.valeur) + figure.unite));
      const cellule = make('td');
      cellule.appendChild(makeMeter(figure));
      rangee.appendChild(cellule);
      tbody.appendChild(rangee);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    layout.dataset.v2e061TableRows = String(figures.length);
  });

  /* E061-03 — Tri par valeur : bascule croissant / décroissant, aria-sort sur
   * l'en-tête Valeur et réordonnancement reproductible des lignes du tableau. */
  sansEchec(() => {
    const tbody = doc.getElementById(ID_TBODY);
    const bouton = doc.getElementById(P + 'sort');
    if (!tbody || !bouton || bouton.dataset.v2e061Tri) return;
    bouton.dataset.v2e061Tri = '1';
    const th = doc.getElementById(ID_TH_VALUE);
    bouton.addEventListener('click', () => {
      try {
        etat.tri = (etat.tri === 'aucun' || etat.tri === 'desc') ? 'asc' : 'desc';
        if (th) th.setAttribute('aria-sort', etat.tri === 'asc' ? 'ascending' : 'descending');
        const ordre = figures.map((figure, index) => index);
        ordre.sort((a, b) => etat.tri === 'asc'
          ? figures[a].valeur - figures[b].valeur
          : figures[b].valeur - figures[a].valeur);
        ordre.forEach((index) => {
          const rangee = tbodyRow(index);
          if (rangee) tbody.appendChild(rangee);
        });
        bouton.textContent = etat.tri === 'asc'
          ? 'Trier par valeur (décroissant)' : 'Trier par valeur (croissant)';
        layout.dataset.v2e061Tri = etat.tri;
        dire('Tri des métriques : '
          + (etat.tri === 'asc' ? 'valeur croissante' : 'valeur décroissante') + '.');
      } catch { /* tri tolérant */ }
    });
  });

  /* E061-04 — Lien croisé figure / ligne : le focus sur l'une marque l'autre
   * avec aria-current et une bordure, jamais par la seule couleur. */
  sansEchec(() => {
    const liste = doc.getElementById(ID_LIST);
    const tbody = doc.getElementById(ID_TBODY);
    if (!liste || !tbody) return;
    const marquer = (cle, actif) => {
      [liste, tbody].forEach((conteneur) => {
        Array.from(conteneur.querySelectorAll('[data-v2e061-link]')).forEach((noeud) => {
          if (noeud.dataset.v2e061Link !== cle) return;
          if (actif) {
            noeud.setAttribute('aria-current', 'true');
            noeud.classList.add('v2e061-lnk');
          } else {
            noeud.removeAttribute('aria-current');
            noeud.classList.remove('v2e061-lnk');
          }
        });
      });
    };
    [liste, tbody].forEach((conteneur) => {
      conteneur.addEventListener('focusin', (event) => {
        const cible = event && event.target;
        const noeud = cible && typeof cible.closest === 'function'
          ? cible.closest('[data-v2e061-link]') : null;
        if (noeud && conteneur.contains(noeud)) marquer(noeud.dataset.v2e061Link, true);
      });
      conteneur.addEventListener('focusout', (event) => {
        const cible = event && event.target;
        const noeud = cible && typeof cible.closest === 'function'
          ? cible.closest('[data-v2e061-link]') : null;
        if (noeud) marquer(noeud.dataset.v2e061Link, false);
      });
    });
  });

  /* E061-05 — Filtre par catégorie : radiogroupe à choix unique, navigation
   * par flèches et masquage natif des éléments non retenus dans les deux vues. */
  sansEchec(() => {
    const conteneur = doc.getElementById(P + 'filter');
    if (!conteneur || conteneur.dataset.v2e061Filtre) return;
    conteneur.dataset.v2e061Filtre = '1';
    conteneur.setAttribute('role', 'radiogroup');
    conteneur.setAttribute('aria-label', 'Filtrer les métriques');
    const choix = [
      { cle: 'toutes', label: 'Toutes' },
      { cle: 'compteurs', label: 'Compteurs' },
      { cle: 'qualite', label: 'Qualité' },
    ];
    const radios = choix.map((option) => {
      const bouton = make('button', 'v2e061-radio', option.label);
      bouton.type = 'button';
      bouton.setAttribute('role', 'radio');
      bouton.setAttribute('aria-checked', option.cle === etat.filtre ? 'true' : 'false');
      bouton.dataset.v2e061Choix = option.cle;
      conteneur.appendChild(bouton);
      return bouton;
    });
    const appliquer = () => {
      figures.forEach((figure, index) => {
        const visible = etat.filtre === 'toutes' || figure.categorie === etat.filtre;
        const item = doc.getElementById(P + 'item-' + index);
        const rangee = tbodyRow(index);
        if (item) item.hidden = !visible;
        if (rangee) rangee.hidden = !visible;
      });
      layout.dataset.v2e061Filtre = etat.filtre;
    };
    const choisir = (index) => {
      etat.filtre = choix[index].cle;
      radios.forEach((bouton, rang) => {
        bouton.setAttribute('aria-checked', rang === index ? 'true' : 'false');
      });
      appliquer();
      dire('Filtre actif : ' + choix[index].label + '.');
    };
    radios.forEach((bouton, index) => {
      bouton.addEventListener('click', () => choisir(index));
      bouton.addEventListener('keydown', (event) => {
        if (!event) return;
        let cible = -1;
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          cible = (index + 1) % radios.length;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          cible = (index - 1 + radios.length) % radios.length;
        } else if (event.key === 'Home') {
          cible = 0;
        } else if (event.key === 'End') {
          cible = radios.length - 1;
        } else {
          return;
        }
        if (typeof event.preventDefault === 'function') event.preventDefault();
        radios[cible].focus();
        choisir(cible);
      });
    });
    appliquer();
  });

  /* E061-06 — Sélection de la valeur lisible : touche S et bouton dédié,
   * sélection de texte native, sans API presse-papiers asynchrone ni minuteur. */
  sansEchec(() => {
    const bouton = doc.getElementById(P + 'speak');
    if (!bouton || bouton.dataset.v2e061Speak) return;
    bouton.dataset.v2e061Speak = '1';
    const selectionner = () => {
      const rang = Math.min(etat.indexActif, figures.length - 1);
      const figure = figures[rang];
      if (!figure) return;
      const noeud = doc.getElementById(P + 'val-' + rang);
      if (noeud && typeof doc.createRange === 'function' && typeof doc.getSelection === 'function') {
        const plage = doc.createRange();
        plage.selectNodeContents(noeud);
        const selection = doc.getSelection();
        selection.removeAllRanges();
        selection.addRange(plage);
      }
      layout.dataset.v2e061Selection = figure.cle;
      dire('Valeur sélectionnée : ' + figure.titre + ' ' + figure.valeur
        + figure.unite + '. Prête à copier.');
    };
    bouton.addEventListener('click', () => { try { selectionner(); } catch { /* tolérant */ } });
    if (!etat.documentLie) {
      etat.documentLie = true;
      doc.addEventListener('keydown', (event) => {
        try {
          if (!event || event.ctrlKey || event.metaKey || event.altKey) return;
          if (event.key !== 's' && event.key !== 'S') return;
          const cible = event.target;
          if (cible && cible.tagName && /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) return;
          if (typeof event.preventDefault === 'function') event.preventDefault();
          selectionner();
        } catch { /* raccourci tolérant */ }
      });
    }
  });

  /* E061-07 — Résumé narratif linéaire : une phrase par métrique, pour une
   * lecture continue au lecteur d'écran sans reconstruire la structure. */
  sansEchec(() => {
    const panneau = doc.getElementById(ID_PANEL);
    if (!panneau || doc.getElementById(P + 'summary')) return;
    const resume = make('p', 'v2e061-summary');
    resume.id = P + 'summary';
    resume.setAttribute('role', 'note');
    resume.setAttribute('aria-label', 'Résumé des métriques chiffrées');
    resume.textContent = figures.map((figure) => figure.titre + ' : '
      + figure.valeur + figure.unite
      + (figure.categorie === 'compteurs'
        ? ' (compteur)'
        : ' (qualité, référence ' + decimale(figure.reference) + ' %)')).join(' · ') + '.';
    const titre = doc.getElementById(P + 'title');
    if (titre && titre.parentNode) titre.parentNode.insertBefore(resume, titre.nextSibling || null);
    else panneau.appendChild(resume);
  });

  /* E061-08 — Représentation des jauges : bascule barres / valeur textuelle,
   * état aria-pressed, l'information restant lisible dans les deux modes. */
  sansEchec(() => {
    const bouton = doc.getElementById(P + 'gauge-mode');
    const panneau = doc.getElementById(ID_PANEL);
    if (!bouton || !panneau || bouton.dataset.v2e061Jauge) return;
    bouton.dataset.v2e061Jauge = '1';
    bouton.addEventListener('click', () => {
      try {
        const texte = bouton.getAttribute('aria-pressed') !== 'true';
        bouton.setAttribute('aria-pressed', texte ? 'true' : 'false');
        panneau.classList.toggle('v2e061-texte', texte);
        bouton.textContent = texte ? 'Afficher les barres' : 'Afficher la valeur textuelle';
        layout.dataset.v2e061Jauge = texte ? 'texte' : 'barres';
        dire(texte ? 'Jauges affichées en texte.' : 'Jauges affichées en barres.');
      } catch { /* bascule tolérante */ }
    });
  });

  /* E061-09 — Isolation d'une métrique : bascule indépendante qui met en avant
   * la métrique courante et atténue les autres, avec annonce et aria-pressed. */
  sansEchec(() => {
    const bouton = doc.getElementById(P + 'isolate');
    const liste = doc.getElementById(ID_LIST);
    if (!bouton || !liste || bouton.dataset.v2e061Isolation) return;
    bouton.dataset.v2e061Isolation = '1';
    const actualiser = () => {
      if (bouton.getAttribute('aria-pressed') !== 'true') return;
      const rang = Math.min(etat.indexActif, figures.length - 1);
      Array.from(liste.querySelectorAll('.v2e061-figure')).forEach((figure) => {
        if (Number(figure.dataset.v2e061Index) === rang) figure.setAttribute('data-v2e061-isole', 'oui');
        else figure.removeAttribute('data-v2e061-isole');
      });
      layout.dataset.v2e061Isole = figures[rang] ? figures[rang].cle : '';
    };
    liste.addEventListener('focusin', actualiser);
    bouton.addEventListener('click', () => {
      try {
        const actif = bouton.getAttribute('aria-pressed') !== 'true';
        bouton.setAttribute('aria-pressed', actif ? 'true' : 'false');
        liste.classList.toggle('v2e061-isolate', actif);
        if (actif) {
          actualiser();
          const rang = Math.min(etat.indexActif, figures.length - 1);
          dire('Métrique isolée : ' + (figures[rang] ? figures[rang].titre : '') + '.');
        } else {
          Array.from(liste.querySelectorAll('.v2e061-figure')).forEach((figure) => {
            figure.removeAttribute('data-v2e061-isole');
          });
          layout.dataset.v2e061Isole = '';
          dire('Isolation désactivée.');
        }
      } catch { /* bascule tolérante */ }
    });
  });

  /* E061-10 — Vérification de cohérence : contrôle reproductible que chaque
   * valeur est dans ses bornes et que le total des compteurs est publié. */
  sansEchec(() => {
    const bouton = doc.getElementById(P + 'check');
    if (!bouton || bouton.dataset.v2e061Verif) return;
    bouton.dataset.v2e061Verif = '1';
    bouton.addEventListener('click', () => {
      try {
        const horsBornes = figures.filter((figure) => figure.valeur < 0
          || figure.valeur > maxJauge(figure));
        const total = figures.filter((figure) => figure.categorie === 'compteurs')
          .reduce((somme, figure) => somme + figure.valeur, 0);
        const ok = horsBornes.length === 0;
        layout.dataset.v2e061Coherence = ok ? 'ok' : 'anomalie';
        layout.dataset.v2e061Total = String(total);
        dire(ok
          ? 'Cohérence vérifiée : ' + figures.length + ' métriques dans leurs bornes, total des compteurs ' + total + '.'
          : 'Incohérence détectée sur ' + horsBornes.map((figure) => figure.titre).join(', ') + '.');
      } catch { /* vérification tolérante */ }
    });
  });
});
