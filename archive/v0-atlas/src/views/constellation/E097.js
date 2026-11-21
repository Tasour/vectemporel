import { register } from './registry.js';

/*
 * Lentille E097 — Diagnostic textuel appliqué au champ d'étoiles de la vue Constellation.
 *
 * Contrat : un seul register('E097', ctx => …), ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() }. Le contexte est vérifié
 * avant toute insertion DOM ; la feuille unique est injectée une seule fois via
 * ctx.css('constellation-e097', …) ; tous les identifiants DOM sont préfixés
 * e097-. Aucun appel réseau, aucune source aléatoire, aucune sortie de débogage,
 * aucun minuteur ni boucle d'animation propre à ce greffon.
 *
 * Le champ d'étoiles est .constellation-field : un SVG d'arêtes et trois couches
 * de nœuds (Ères, Repères, Points vérifiés). Le diagnostic ne réécrit pas le
 * rendu : il lit le DOM construit par constellation.js et en expose une lecture
 * textuelle indexable placée avant le champ.
 */

const CSS_ID = 'constellation-e097';
const PANEL_ID = 'e097-panel';

/* Bornes de polar() dans constellation.js : x ∈ [10, 90], y ∈ [12, 88]. */
const X_MIN = 10;
const X_MAX = 90;
const Y_MIN = 12;
const Y_MAX = 88;

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = {
  rendus: 0,
  ecouteBranche: false,
  dernierNoeud: null,
};

/* Greffon tolérant : un chantier défaillant n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journalisation */ }
}

function sortie(layout, id) {
  return typeof layout.querySelector === 'function'
    ? layout.querySelector('#' + id)
    : null;
}

function fichesDu(layout) {
  return Array.from(layout.querySelectorAll('.const-sun, .const-planet, .const-moon'));
}

function libelleDe(noeud) {
  return (noeud.dataset.label || noeud.getAttribute('aria-label') || noeud.getAttribute('title') || '').trim();
}

function decimale(valeur) {
  return Number.isFinite(valeur) ? valeur.toFixed(2).replace('.', ',') : '—';
}

/* Position lue depuis les variables CSS en pourcentage écrites par constellation.js. */
function positionDe(noeud) {
  const x = parseFloat(noeud.style.getPropertyValue('--x'));
  const y = parseFloat(noeud.style.getPropertyValue('--y'));
  return { x: Number.isFinite(x) ? x : NaN, y: Number.isFinite(y) ? y : NaN };
}

function panneauDans(layout, el) {
  const existant = layout.querySelector('#' + PANEL_ID);
  if (existant) return existant;

  const panneau = el('section', 'e097-panel');
  panneau.id = PANEL_ID;
  panneau.setAttribute('aria-labelledby', 'e097-titre');

  const titre = el('h2', 'e097-titre', 'Diagnostic textuel du champ d’étoiles');
  titre.id = 'e097-titre';
  panneau.appendChild(titre);

  const lignes = [
    ['e097-resume', 'p'],
    ['e097-couches', 'ul'],
    ['e097-aretes', 'p'],
    ['e097-bornes', 'p'],
    ['e097-cles', 'p'],
    ['e097-densite', 'p'],
    ['e097-survol', 'p'],
    ['e097-vide', 'p'],
    ['e097-synthese', 'p'],
  ];
  lignes.forEach(([id, balise]) => {
    const noeud = el(balise, balise === 'ul' ? 'e097-liste' : 'e097-ligne');
    noeud.id = id;
    panneau.appendChild(noeud);
  });

  const live = el('p', 'e097-ligne e097-live');
  live.id = 'e097-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  panneau.appendChild(live);

  const champ = layout.querySelector('.constellation-field');
  if (champ && typeof layout.insertBefore === 'function') layout.insertBefore(panneau, champ);
  else layout.appendChild(panneau);
  return panneau;
}

/* Écouteur délégué unique, posé sur document pour survivre aux re-rendus. */
function brancheSuivi() {
  if (etat.ecouteBranche || typeof document === 'undefined') return;
  etat.ecouteBranche = true;
  const surveiller = (evenement) => {
    const cible = evenement && evenement.target;
    if (!cible || !cible.classList) return;
    if (!cible.matches('.const-sun, .const-planet, .const-moon')) return;
    const layout = cible.closest ? cible.closest('.constellation-layout') : null;
    if (!layout || !layout.querySelector('#' + PANEL_ID)) return;
    const cle = (cible.dataset.constKey || libelleDe(cible) || 'nœud').trim();
    if (cle === etat.dernierNoeud) return;
    etat.dernierNoeud = cle;
    const nature = cible.classList.contains('const-sun') ? 'Ère'
      : cible.classList.contains('const-planet') ? 'Repère' : 'Point vérifié';
    const texte = `${nature} parcouru : ${cle}${libelleDe(cible) ? ' · ' + libelleDe(cible) : ''}`;
    const sortieTexte = sortie(layout, 'e097-survol');
    if (sortieTexte) sortieTexte.textContent = texte;
    const region = sortie(layout, 'e097-live');
    if (region) region.textContent = texte;
    layout.dataset.e097DernierNoeud = cle;
  };
  document.addEventListener('focusin', surveiller);
  document.addEventListener('pointerover', surveiller);
}

register('E097', (ctx) => {
  try {
    /* Garde de contexte : aucun ajout DOM sans layout exploitable. */
    const layout = ctx && ctx.layout;
    if (!layout || typeof layout.querySelector !== 'function') return;
    const css = typeof ctx.css === 'function' ? ctx.css : null;
    const fabriquer = typeof ctx.el === 'function' ? ctx.el : null;
    if (!css || !fabriquer) return;

    const champ = layout.querySelector('.constellation-field');
    if (!champ) return; // vue vide ou pays sans données : rien à diagnostiquer
    const couches = Array.from(layout.querySelectorAll('.const-layer'));
    const fiches = fichesDu(layout);
    const aretes = champ.querySelectorAll('.constellation-edges line');
    panneauDans(layout, fabriquer);

    /* Feuille unique, injectée une seule fois pour toute la vue. */
    css(CSS_ID, `
      .constellation-layout[data-e097="on"] #e097-panel {
        margin: 12px 0 4px; padding: 8px 10px;
        border: 1px solid var(--line); border-radius: 8px;
        background: rgba(255,255,255,.02);
        font-family: var(--sans, inherit); color: var(--ink-soft);
      }
      #e097-titre {
        margin: 0 0 5px; font-size: 10px; font-weight: 600;
        letter-spacing: .1em; text-transform: uppercase; color: var(--gold);
      }
      #e097-panel .e097-ligne {
        margin: 3px 0; font-size: 9px; line-height: 1.45;
        color: var(--muted-2); font-variant-numeric: tabular-nums;
      }
      #e097-liste { margin: 4px 0; padding-left: 16px; }
      #e097-liste li { margin: 2px 0; font-size: 9px; line-height: 1.4; color: var(--muted-2); }
      #e097-live { color: var(--gold-bright); }
      .constellation-layout[data-e097="on"] .const-layer.e097-groupe-sans-libelle,
      .constellation-layout[data-e097="on"] .constellation-field .e097-sans-cle {
        outline: 2px dashed var(--gold); outline-offset: 3px;
      }
      .constellation-layout.e097-reduit #e097-panel *,
      .constellation-layout.e097-reduit .const-layer { transition: none !important; animation: none !important; }
      @media (max-width: 620px) {
        #e097-titre { font-size: 9px; }
        #e097-panel .e097-ligne, #e097-liste li { font-size: 8px; }
      }
    `);

    /* E097-01 — Recensement des couches du champ, écrit en attributs et en liste. */
    sansEchec(() => {
      layout.dataset.e097 = 'on';
      layout.dataset.e097Couches = String(couches.length);
      const liste = sortie(layout, 'e097-couches');
      if (liste) {
        while (liste.firstChild) liste.removeChild(liste.firstChild);
        couches.forEach((couche, index) => {
          const libelle = couche.getAttribute('aria-label') || 'libellé absent';
          const n = couche.querySelectorAll('.const-sun, .const-planet, .const-moon').length;
          liste.appendChild(fabriquer('li', 'e097-couche',
            `Couche ${index + 1} : ${libelle} · ${n} nœud${n > 1 ? 's' : ''}`));
        });
      }
      const resume = sortie(layout, 'e097-resume');
      if (resume) {
        resume.textContent = `Champ d’étoiles : ${couches.length} couche${couches.length > 1 ? 's' : ''} recensée${couches.length > 1 ? 's' : ''} · ${fiches.length} nœud${fiches.length > 1 ? 's' : ''} au total`;
      }
    });

    /* E097-02 — Inventaire typé des nœuds : soleils, planètes, lunes. */
    sansEchec(() => {
      const soleils = layout.querySelectorAll('.const-sun').length;
      const planetes = layout.querySelectorAll('.const-planet').length;
      const lunes = layout.querySelectorAll('.const-moon').length;
      layout.dataset.e097Soleils = String(soleils);
      layout.dataset.e097Planetes = String(planetes);
      layout.dataset.e097Lunes = String(lunes);
      const resume = sortie(layout, 'e097-resume');
      if (resume) {
        resume.textContent += ` · ères ${soleils}, repères ${planetes}, points ${lunes}`;
      }
    });

    /* E097-03 — Audit des arêtes SVG : traitements et cohérence avec les repères. */
    sansEchec(() => {
      const chemins = champ.querySelectorAll('.constellation-edges line.is-path').length;
      const lunaires = champ.querySelectorAll('.constellation-edges line.is-moon').length;
      const total = aretes.length;
      const planetes = layout.querySelectorAll('.const-planet').length;
      const coherent = total >= planetes;
      layout.dataset.e097Aretes = String(total);
      layout.dataset.e097Chemins = String(chemins);
      layout.dataset.e097CoherenceAretes = coherent ? 'ok' : 'ecart';
      const svg = champ.querySelector('.constellation-edges');
      if (svg) svg.setAttribute('data-e097-aretes', String(total));
      const ligne = sortie(layout, 'e097-aretes');
      if (ligne) {
        ligne.textContent = `Arêtes : ${total} segment${total > 1 ? 's' : ''}, dont ${chemins} chemin${chemins > 1 ? 's' : ''} actif${chemins > 1 ? 's' : ''} et ${lunaires} liaison${lunaires > 1 ? 's' : ''} lunaire${lunaires > 1 ? 's' : ''} · ${planetes} repère${planetes > 1 ? 's' : ''} · ${coherent ? 'couverture suffisante' : 'couverture insuffisante'}`;
      }
    });

    /* E097-04 — Libellés de groupes : contrôle role/aria-label et marquage CSS. */
    sansEchec(() => {
      let manquants = 0;
      couches.forEach((couche) => {
        const valide = couche.getAttribute('role') === 'group'
          && (couche.getAttribute('aria-label') || '').trim().length > 0;
        if (valide) couche.classList.remove('e097-groupe-sans-libelle');
        else {
          couche.classList.add('e097-groupe-sans-libelle');
          manquants += 1;
        }
      });
      layout.dataset.e097GroupesSansLibelle = String(manquants);
      const liste = sortie(layout, 'e097-couches');
      if (liste && manquants) {
        const note = fabriquer('li', 'e097-couche',
          `${manquants} couche${manquants > 1 ? 's' : ''} sans libellé de groupe (contour en pointillés)`);
        liste.appendChild(note);
      }
    });

    /* E097-05 — Bornes géométriques : lecture de --x/--y et signal des débordements. */
    sansEchec(() => {
      let hors = 0;
      const indexes = [];
      fiches.forEach((noeud, index) => {
        const p = positionDe(noeud);
        const dehors = !Number.isFinite(p.x) || !Number.isFinite(p.y)
          || p.x < X_MIN || p.x > X_MAX || p.y < Y_MIN || p.y > Y_MAX;
        if (dehors) {
          hors += 1;
          indexes.push(String(index + 1));
          noeud.setAttribute('data-e097-hors-bornes', '1');
        } else {
          noeud.removeAttribute('data-e097-hors-bornes');
        }
      });
      layout.dataset.e097HorsBornes = String(hors);
      const ligne = sortie(layout, 'e097-bornes');
      if (ligne) {
        ligne.textContent = hors
          ? `Bornes du champ : x ${X_MIN}–${X_MAX} %, y ${Y_MIN}–${Y_MAX} % · ${hors} nœud${hors > 1 ? 's' : ''} hors limites (${indexes.join(', ')})`
          : `Bornes du champ : x ${X_MIN}–${X_MAX} %, y ${Y_MIN}–${Y_MAX} % · tous les nœuds sont dans les limites`;
      }
    });

    /* E097-06 — Clés de focus : détection des nœuds sans data-const-key. */
    sansEchec(() => {
      const sansCle = [];
      fiches.forEach((noeud, index) => {
        if ((noeud.dataset.constKey || '').trim()) {
          noeud.removeAttribute('data-e097-sans-cle');
        } else {
          noeud.setAttribute('data-e097-sans-cle', '1');
          sansCle.push(String(index + 1));
        }
      });
      layout.dataset.e097SansCle = String(sansCle.length);
      const ligne = sortie(layout, 'e097-cles');
      if (ligne) {
        ligne.textContent = sansCle.length
          ? `Clés de focus : ${sansCle.length} nœud${sansCle.length > 1 ? 's' : ''} sans data-const-key (${sansCle.join(', ')}) · mémorisation du focus impossible pour ces nœuds`
          : `Clés de focus : data-const-key présent sur ${fiches.length} nœud${fiches.length > 1 ? 's' : ''}`;
      }
    });

    /* E097-07 — Densité : rapport entre nœuds et surface mesurée du champ. */
    sansEchec(() => {
      let largeur = 0;
      let hauteur = 0;
      try {
        const rect = champ.getBoundingClientRect();
        largeur = Number.isFinite(rect.width) ? rect.width : 0;
        hauteur = Number.isFinite(rect.height) ? rect.height : 0;
      } catch { /* mesure indisponible : densité indéterminée */ }
      const milliers = Math.max(1, Math.round((largeur * hauteur) / 1000));
      const densite = fiches.length / milliers;
      const regime = densite >= 0.4 ? 'dense' : 'aéré';
      layout.dataset.e097Densite = decimale(densite);
      layout.dataset.e097Regime = regime;
      const ligne = sortie(layout, 'e097-densite');
      if (ligne) {
        ligne.textContent = largeur && hauteur
          ? `Densité : ${fiches.length} nœuds pour ${milliers} milliers de px², soit ${decimale(densite)} nœud/millier · champ ${regime} (seuil 0,4)`
          : 'Densité : surface du champ non mesurable';
      }
    });

    /* E097-08 — Suivi délégué du survol et du focus, avec region live dédiée. */
    sansEchec(() => {
      brancheSuivi();
      const ligne = sortie(layout, 'e097-survol');
      if (ligne && !ligne.textContent) {
        ligne.textContent = 'Parcours : aucun nœud survolé ni focalisé pour l’instant';
      }
      const region = sortie(layout, 'e097-live');
      if (region && etat.dernierNoeud) {
        region.textContent = `Dernier nœud parcouru : ${etat.dernierNoeud}`;
      }
    });

    /* E097-09 — État vide : cohérence entre message et contenu réel du champ. */
    sansEchec(() => {
      const vide = !!layout.querySelector('.constellation-empty');
      const incoherent = vide === (fiches.length > 0);
      layout.dataset.e097EtatVide = vide ? '1' : '0';
      layout.dataset.e097CoherenceVide = incoherent ? 'incoherent' : 'ok';
      if (vide) layout.classList.add('e097-vide');
      else layout.classList.remove('e097-vide');
      const ligne = sortie(layout, 'e097-vide');
      if (ligne) {
        ligne.textContent = vide
          ? `État vide : message d’absence affiché · ${fiches.length} nœud${fiches.length > 1 ? 's' : ''} pourtant recensé${fiches.length > 1 ? 's' : ''}`
          : `État vide : aucun message · ${fiches.length} nœud${fiches.length > 1 ? 's' : ''} présents dans le champ`;
      }
    });

    /* E097-10 — Synthèse, mouvement réduit et idempotence du diagnostic. */
    sansEchec(() => {
      etat.rendus += 1;
      const penalites = (Number(layout.dataset.e097CoherenceAretes !== 'ok') ? 1 : 0)
        + (Number(layout.dataset.e097GroupesSansLibelle || '0') > 0 ? 1 : 0)
        + (Number(layout.dataset.e097HorsBornes || '0') > 0 ? 1 : 0)
        + (Number(layout.dataset.e097SansCle || '0') > 0 ? 1 : 0)
        + (layout.dataset.e097CoherenceVide === 'incoherent' ? 1 : 0);
      const score = Math.max(0, 5 - penalites);
      const reduit = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
      layout.dataset.e097Score = String(score);
      layout.dataset.e097Motion = reduit ? 'reduit' : 'normal';
      layout.dataset.e097Rendus = String(etat.rendus);
      const panneaux = typeof document !== 'undefined'
        ? document.querySelectorAll('#' + PANEL_ID).length : 1;
      layout.dataset.e097Idempotence = String(panneaux);
      if (reduit) layout.classList.add('e097-reduit');
      else layout.classList.remove('e097-reduit');
      const ligne = sortie(layout, 'e097-synthese');
      if (ligne) {
        ligne.textContent = `Synthèse : ${score}/5 points de cohérence · mouvement réduit ${reduit ? 'activé' : 'non'} · panneaux ${panneaux} (attendu 1) · diagnostic n° ${etat.rendus}`;
      }
    });
  } catch { /* greffon tolérant : aucune exception ne remonte au registre */ }
});
