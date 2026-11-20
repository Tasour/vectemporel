import { register } from './registry.js';

/*
 * Lentille E064 — Structure sémantique appliquée aux métriques chiffrées
 * de la vue Constellation.
 *
 * Contrat respecté : un seul register('E064', ctx => { … }),ctx = { viewId,
 * stage, layout, css(id, rules), el(tag, cls, text), reducedMotion() }. Le
 * contexte et ctx.layout sont vérifiés avant tout ajout au DOM ; une unique
 * feuille de style constellation-e064 est injectée via ctx.css ; tous les
 * identifiants DOM sont préfixés e064-. Aucun appel réseau, aucune source
 * aléatoire, aucune sortie de débogage, aucun minuteur ni boucle d'animation
 * propre. Les métriques sont recalculées depuis le DOM déjà rendu par
 * constellation.js : aucun fichier partagé n'est modifié.
 */

const CSS_ID = 'constellation-e064';
const PANNEAU_ID = 'e064-dashboard';
const TITRE_ID = 'e064-titre';
const TABLEAU_ID = 'e064-tableau';
const GLOSSAIRE_ID = 'e064-glossaire';
const CONFIANCE_ID = 'e064-confiances';
const CHRONO_ID = 'e064-chronologie';
const RANGS_ID = 'e064-rangs';
const PROGRESSION_ID = 'e064-progression';
const RECAP_ID = 'e064-recap';

const CSS = `
.e064-panel{margin-top:14px;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:rgba(255,255,255,.02)}
.e064-panel:focus-visible{outline:3px solid var(--gold-bright);outline-offset:2px}
.e064-titre{margin:0 0 8px;font-family:var(--serif);font-size:12px;font-weight:500;color:var(--gold-bright)}
.e064-tableau{width:100%;border-collapse:collapse;font-size:10px;font-variant-numeric:tabular-nums}
.e064-tableau caption{caption-side:top;margin:0 0 6px;color:var(--muted);font-size:9px;text-align:left}
.e064-tableau th,.e064-tableau td{padding:4px 8px;border-bottom:1px solid var(--line);text-align:left}
.e064-tableau thead th{color:var(--gold);font-size:9px;font-weight:600;letter-spacing:.06em}
.e064-tableau tbody th{color:var(--ink-soft);font-weight:400}
.e064-tableau td{color:var(--ink)}
.e064-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.e064-glossaire{margin:10px 0 0;font-size:9px;line-height:1.5}
.e064-glossaire dt{color:var(--gold);font-weight:600}
.e064-glossaire dd{margin:0 0 4px;color:var(--muted)}
.e064-liste{margin:8px 0 0;padding-left:18px;font-size:9px;line-height:1.6;color:var(--muted)}
.e064-liste li{margin-bottom:2px}
.e064-mesure{width:76px;height:8px;vertical-align:middle;margin:0 6px}
.e064-progression-ligne{margin:10px 0 0;font-size:9px;color:var(--ink-soft);font-variant-numeric:tabular-nums}
.e064-progression{width:96px;height:8px;vertical-align:middle;margin:0 8px}
.e064-recap{display:block;margin-top:10px;color:var(--ink-soft);font-size:10px;font-variant-numeric:tabular-nums}
.e064-panel.e064-calm *{transition:none!important}
@media (prefers-reduced-motion:reduce){.e064-panel *{transition:none!important}}
@media (max-width:620px){.e064-tableau th,.e064-tableau td{padding:3px 4px}.e064-liste{font-size:8px}}
`;

/* Niveaux de confiance : l'étiquette textuelle reste la source, le nombre ne
   sert qu'à alimenter l'attribut value du élément <meter>. */
const NIVEAUX_CONFIANCE = [
  ['vérifié', 4], ['certain', 4], ['probable', 3],
  ['disputé', 2], ['disputed', 2], ['non documenté', 1],
];

/* Greffon tolérant : un chantier défaillant est neutralisé sans journalisation. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse */ }
}

function libelleDe(noeud) {
  if (!noeud || !noeud.dataset) return '';
  return String(noeud.dataset.label || noeud.title ||
    noeud.getAttribute('aria-label') || '').trim();
}

/* Texte complet d'un nœud : data-label, title et aria-label sont concaténés,
   car la confiance et les sources ne figurent que dans les deux derniers. */
function texteComplet(noeud) {
  if (!noeud) return '';
  return [noeud.dataset && noeud.dataset.label, noeud.title, noeud.getAttribute('aria-label')]
    .filter(Boolean).join(' · ');
}

function entierDepuis(chaine, motif) {
  const trouve = motif.exec(String(chaine || ''));
  if (!trouve) return null;
  const valeur = parseInt(trouve[1], 10);
  return Number.isFinite(valeur) ? valeur : null;
}

function anneeDepuis(libelle) {
  const texte = String(libelle || '').trim();
  const avant = /(\d+)\s*av\.\s*J\.-C\./.exec(texte);
  if (avant) return -parseInt(avant[1], 10);
  const apres = /^-?\d{1,4}/.exec(texte);
  return apres ? parseInt(apres[0], 10) : null;
}

function datetimeDepuis(annee) {
  if (!Number.isFinite(annee)) return '';
  return annee < 0 ? '-' + String(Math.abs(annee)).padStart(4, '0')
    : String(annee).padStart(4, '0');
}

function confianceDepuis(libelle) {
  const texte = String(libelle || '');
  const extrait = /confiance\s+([^·]+)/.exec(texte);
  const mot = extrait ? extrait[1].trim().toLocaleLowerCase('fr') : '';
  const trouve = NIVEAUX_CONFIANCE.find(([cle]) => mot === cle || mot.startsWith(cle));
  return {
    mot: mot || 'non renseignée',
    niveau: trouve ? trouve[1] : 0,
  };
}

function diaphragme(nombre) {
  const valeur = typeof nombre === 'number' ? nombre
    : parseFloat(String(nombre).replace(',', '.'));
  return Number.isFinite(valeur) ? String(valeur).replace('.', ',') : '—';
}

register('E064', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM n'est tenté. */
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  if (typeof document === 'undefined') return;
  const css = ctx && ctx.css;
  if (typeof css !== 'function') return;

  /* Fabrique locale tolérante : ctx.el est utilisé dès qu'il est disponible. */
  const fabriquer = (tag, cls, texte) => typeof ctx.el === 'function'
    ? ctx.el(tag, cls, texte) : document.createElement(tag);

  /* Feuille unique de la lentille, injectée une seule fois. */
  css(CSS_ID, CSS);

  const soleils = Array.prototype.slice.call(layout.querySelectorAll('.const-sun'));
  const planetes = Array.prototype.slice.call(layout.querySelectorAll('.const-planet'));
  const lunes = Array.prototype.slice.call(layout.querySelectorAll('.const-moon'));
  const caption = layout.querySelector('.constellation-caption');

  /* E064-01 — Région sémantique unique : un <section role="region"> intitulé,
     focalisable, inséré avant la légende existante sans la réécrire. */
  let panneau = layout.querySelector('#' + PANNEAU_ID);
  sansEchec(() => {
    if (panneau) return;
    panneau = fabriquer('section', 'e064-panel');
    panneau.id = PANNEAU_ID;
    panneau.setAttribute('role', 'region');
    panneau.setAttribute('aria-labelledby', TITRE_ID);
    panneau.tabIndex = 0;
    const titre = fabriquer('h3', 'e064-titre', 'Métriques chiffrées de la constellation');
    titre.id = TITRE_ID;
    panneau.appendChild(titre);
    if (caption && caption.parentNode) caption.parentNode.insertBefore(panneau, caption);
    else layout.appendChild(panneau);
  });
  if (!panneau) return;

  /* E064-02 — Tableau de mesures : <caption>, <th scope="col"> et
     <th scope="row"> transforment la liste de chiffres en Relations lisibles. */
  sansEchec(() => {
    if (panneau.querySelector('#' + TABLEAU_ID)) return;
    const tableau = fabriquer('table', 'e064-tableau');
    tableau.id = TABLEAU_ID;
    const legende = fabriquer('caption', '', 'Mesures relevées dans la vue figée');
    tableau.appendChild(legende);
    const tete = fabriquer('thead');
    const ligneTete = fabriquer('tr');
    ['Mesure', 'Valeur'].forEach((texte) => {
      const th = fabriquer('th', '', texte);
      th.setAttribute('scope', 'col');
      ligneTete.appendChild(th);
    });
    tete.appendChild(ligneTete);
    tableau.appendChild(tete);
    const corps = fabriquer('tbody');
    const lignes = [
      ['eres', 'Ères du pays'],
      ['reperes', 'Repères de l’ère'],
      ['points', 'Points vérifiés affichés'],
      ['sources', 'Sources locales citées'],
      ['rayon', 'Rayon calculé'],
      ['angle', 'Pas angulaire'],
      ['selection', 'Sélection courante'],
    ];
    lignes.forEach(([cle, intitule]) => {
      const tr = fabriquer('tr');
      const th = fabriquer('th', '', intitule);
      th.setAttribute('scope', 'row');
      const td = fabriquer('td', 'e064-valeur', '—');
      td.setAttribute('data-e064-cle', cle);
      tr.appendChild(th);
      tr.appendChild(td);
      corps.appendChild(tr);
    });
    tableau.appendChild(corps);
    panneau.appendChild(tableau);
  });

  /* E064-03 — Valeurs machine : chaque mesure est enveloppée dans un <data>
     porteur d'un attribut value exact, distinct de l'affichage formaté. */
  const donnees = {};
  sansEchec(() => {
    panneau.querySelectorAll('td.e064-valeur').forEach((cellule) => {
      const cle = cellule.getAttribute('data-e064-cle') || '';
      if (cellule.querySelector('data')) return;
      const valeur = fabriquer('data', '', '—');
      valeur.id = 'e064-m-' + cle;
      valeur.setAttribute('value', '0');
      cellule.appendChild(valeur);
      donnees[cle] = valeur;
    });
  });

  /* E064-04 — Glossaire des grandeurs : une <dl> avec <dfn> à la première
     occurrence de chaque terme chiffré, pour éviter l'ellipse du tableau. */
  sansEchec(() => {
    if (panneau.querySelector('#' + GLOSSAIRE_ID)) return;
    const liste = fabriquer('dl', 'e064-glossaire');
    liste.id = GLOSSAIRE_ID;
    const termes = [
      ['Rayon calculé', 'Distance des repères au centre, en pourcentage du champ : 14 + 1,8 × nombre de repères, bornée entre 18 et 34.'],
      ['Pas angulaire', 'Incrément de 137,5 degrés entre deux repères consécutifs ; valeur fixe, sans lien avec la date.'],
      ['Confiance', 'Qualification textuelle d’un point vérifié, convertie en niveau de 0 à 4 pour la jauge sémantique.'],
      ['Rang', 'Position ordinale d’un repère dans l’ère active, indépendante de son année.'],
    ];
    termes.forEach(([terme, definition]) => {
      const dt = fabriquer('dt');
      const dfn = fabriquer('dfn', '', terme);
      dt.appendChild(dfn);
      liste.appendChild(dt);
      liste.appendChild(fabriquer('dd', '', definition));
    });
    panneau.appendChild(liste);
  });

  /* E064-05 — Jauges de confiance : une liste <ul> de <meter min max value>,
     chaque valeur numérique doublée de son libellé textuel d'origine. */
  sansEchec(() => {
    if (panneau.querySelector('#' + CONFIANCE_ID)) return;
    const liste = fabriquer('ul', 'e064-liste');
    liste.id = CONFIANCE_ID;
    liste.setAttribute('aria-label', 'Niveau de confiance des points vérifiés');
    if (!lunes.length) {
      liste.appendChild(fabriquer('li', '', 'Aucun point vérifié affiché : aucune confiance à mesurer.'));
    } else {
      lunes.forEach((lune, index) => {
        const confiance = confianceDepuis(texteComplet(lune));
        const item = fabriquer('li', '', 'Point ' + (index + 1) + ' — ' + confiance.mot + ' : ');
        const jauge = fabriquer('meter', 'e064-mesure', confiance.mot);
        jauge.id = 'e064-jauge-' + (index + 1);
        jauge.setAttribute('min', '0');
        jauge.setAttribute('max', '4');
        jauge.setAttribute('value', String(confiance.niveau));
        jauge.setAttribute('aria-valuetext', confiance.mot);
        item.appendChild(jauge);
        liste.appendChild(item);
      });
    }
    panneau.appendChild(liste);
  });

  /* E064-06 — Millésimes typés : chaque année extraite des étiquettes devient
     un <time datetime>, y compris les dates avant J.-C. converties en négatif. */
  sansEchec(() => {
    if (panneau.querySelector('#' + CHRONO_ID)) return;
    const liste = fabriquer('ul', 'e064-liste');
    liste.id = CHRONO_ID;
    liste.setAttribute('aria-label', 'Années des ères et des repères');
    const sources = soleils.map((noeud) => ['Ère', libelleDe(noeud)])
      .concat(planetes.map((noeud) => ['Repère', libelleDe(noeud)]));
    if (!sources.length) {
      liste.appendChild(fabriquer('li', '', 'Aucune année disponible.'));
    } else {
      sources.forEach(([genre, libelle]) => {
        const annee = anneeDepuis(libelle);
        const item = fabriquer('li');
        const temps = fabriquer('time', '', Number.isFinite(annee) ? String(annee) : 'année non précisée');
        temps.setAttribute('datetime', datetimeDepuis(annee));
        item.appendChild(temps);
        item.appendChild(document.createTextNode(' — ' + genre + ' : ' + libelle));
        liste.appendChild(item);
      });
    }
    panneau.appendChild(liste);
  });

  /* E064-07 — Classement ordonné : une <ol start="1"> dont chaque <li> porte
     un attribut value explicite égal au rang réel du repère dans l'ère. */
  sansEchec(() => {
    if (panneau.querySelector('#' + RANGS_ID)) return;
    const liste = fabriquer('ol', 'e064-liste');
    liste.id = RANGS_ID;
    liste.setAttribute('start', '1');
    liste.setAttribute('aria-label', 'Rang des repères de l’ère active');
    if (!planetes.length) {
      liste.appendChild(fabriquer('li', '', 'Aucun repère dans l’ère active.'));
    } else {
      planetes.forEach((planete, index) => {
        const item = fabriquer('li', '', libelleDe(planete));
        item.setAttribute('value', String(index + 1));
        liste.appendChild(item);
      });
    }
    panneau.appendChild(liste);
  });

  /* E064-08 — Progression binaire : un <progress max value> étiqueté, dont
     l'attribut aria-valuetext conserve le pourcentage en toutes lettres. */
  sansEchec(() => {
    if (panneau.querySelector('#' + PROGRESSION_ID)) return;
    const ligne = fabriquer('p', 'e064-progression-ligne');
    const etiquette = fabriquer('label', '', 'Points de confiance forte : ');
    etiquette.setAttribute('for', PROGRESSION_ID);
    const barre = fabriquer('progress', 'e064-progression', '0 / 0');
    barre.id = PROGRESSION_ID;
    barre.setAttribute('min', '0');
    barre.setAttribute('max', '4');
    barre.setAttribute('value', '0');
    barre.setAttribute('aria-valuetext', 'aucun point');
    ligne.appendChild(etiquette);
    ligne.appendChild(barre);
    ligne.appendChild(fabriquer('span', 'e064-taux', ' 0 %'));
    panneau.appendChild(ligne);
  });

  /* E064-09 — Recalcul sur interaction : un écouteur délégué, enregistré une
     seule fois par rendu, réécrit les <data> et le <output> après un clic sur
     un soleil, une planète ou une lune. Aucun minuteur, aucune animation. */
  sansEchec(() => {
    if (layout.getAttribute('data-e064-ecoute') === '1') return;
    layout.setAttribute('data-e064-ecoute', '1');
    const actualiser = () => {
      const nbEres = layout.querySelectorAll('.const-sun').length;
      const nbRepères = layout.querySelectorAll('.const-planet').length;
      const nbPoints = layout.querySelectorAll('.const-moon').length;
      const nbSources = lunes.reduce((total, lune) => {
        const found = entierDepuis(texteComplet(lune), /(\d+)\s+sources?\s+locales?/);
        return total + (found || 0);
      }, 0);
      const rayon = Math.max(18, Math.min(34, 14 + nbRepères * 1.8));
      const positionActive = (selecteur) => {
        const noeuds = Array.prototype.slice.call(layout.querySelectorAll(selecteur));
        const index = noeuds.findIndex((noeud) => noeud.classList.contains('is-active'));
        return index < 0 ? 0 : index + 1;
      };
      const selection = [positionActive('.const-sun'), positionActive('.const-planet'),
        positionActive('.const-moon')];
      const valeurs = {
        eres: { brut: String(nbEres), affiche: String(nbEres) },
        reperes: { brut: String(nbRepères), affiche: String(nbRepères) },
        points: { brut: String(nbPoints), affiche: String(nbPoints) },
        sources: { brut: String(nbSources), affiche: String(nbSources) },
        rayon: { brut: rayon.toFixed(2), affiche: diaphragme(rayon.toFixed(1)) + ' %' },
        angle: { brut: '137.5', affiche: '137,5 °' },
        selection: {
          brut: selection.join('-'),
          affiche: selection[0] + ' / ' + nbEres + ' · ' + selection[1] + ' / ' +
            nbRepères + ' · ' + selection[2] + ' / ' + nbPoints,
        },
      };
      Object.keys(valeurs).forEach((cle) => {
        const noeud = donnees[cle] || panneau.querySelector('#e064-m-' + cle);
        if (!noeud) return;
        noeud.setAttribute('value', valeurs[cle].brut);
        noeud.textContent = valeurs[cle].affiche;
      });
      const barre = panneau.querySelector('#' + PROGRESSION_ID);
      const taux = panneau.querySelector('.e064-taux');
      if (barre && taux) {
        const forts = lunes.filter((lune) => confianceDepuis(texteComplet(lune)).niveau >= 3).length;
        barre.setAttribute('value', String(forts));
        barre.textContent = forts + ' / ' + lunes.length;
        barre.setAttribute('aria-valuetext', forts + ' points sur ' + lunes.length +
          ', soit ' + (lunes.length ? Math.round(forts * 100 / lunes.length) : 0) + ' pour cent');
        taux.textContent = ' ' + (lunes.length ? Math.round(forts * 100 / lunes.length) : 0) + ' %';
      }
      const recap = panneau.querySelector('#' + RECAP_ID);
      if (recap) {
        recap.textContent = 'Synthèse : ' + nbEres + ' ères, ' + nbRepères + ' repères, ' +
          nbPoints + ' points et ' + nbSources + ' sources ; rayon ' +
          diaphragme(rayon.toFixed(1)) + ' %, sélection ' + valeurs.selection.affiche + '.';
      }
    };
    layout.addEventListener('click', (evenement) => {
      sansEchec(() => {
        const cible = evenement && evenement.target && evenement.target.nodeType === 1 &&
          typeof evenement.target.closest === 'function'
          ? evenement.target.closest('.const-sun, .const-planet, .const-moon') : null;
        if (!cible || !layout.contains(cible)) return;
        actualiser();
      });
    });
    actualiser();
  });

  /* E064-10 — Sortie récapitulative : un <output role="status"> vivant, des
     chiffres à largeur fixe en CSS et un mode sobre demandé au contexte. */
  sansEchec(() => {
    let recap = panneau.querySelector('#' + RECAP_ID);
    if (!recap) {
      recap = fabriquer('output', 'e064-recap', 'Synthèse en cours de calcul.');
      recap.id = RECAP_ID;
      recap.setAttribute('role', 'status');
      recap.setAttribute('aria-live', 'polite');
      recap.setAttribute('aria-atomic', 'true');
      panneau.appendChild(recap);
    }
    const sobre = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    if (sobre) panneau.classList.add('e064-calm');
    else panneau.classList.remove('e064-calm');
    recap.textContent = 'Synthèse : ' + soleils.length + ' ères, ' + planetes.length +
      ' repères, ' + lunes.length + ' points ; rayon ' +
      diaphragme(Math.max(18, Math.min(34, 14 + planetes.length * 1.8)).toFixed(1)) + ' %.';
  });
});
