import { register } from './registry.js';

/*
 * Lentille E007 — Diagnostic textuel appliqué aux soleils de la vue Constellation.
 *
 * Contrat : enregistrement unique sous l'identifiant E007 avec un rappel ctx ;
 * ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() }. Le contexte est vérifié
 * avant tout ajout DOM ; la feuille unique est injectée une seule fois via
 * ctx.css('constellation-e007', …) ; tous les identifiants DOM sont préfixés
 * e007-. Aucun appel réseau, aucune source aléatoire, aucune sortie de
 * débogage, aucun minuteur ni boucle d'animation propre à ce greffon.
 *
 * Les soleils sont les boutons .const-sun rendus par constellation.js dans la
 * couche .const-layer-suns. Le diagnostic ne réécrit pas le rendu : il lit le
 * DOM déjà construit (data-label, aria-label, title, --x, --y, --era,
 * aria-current, is-active) et en expose une lecture textuelle indexable.
 */

const CSS_ID = 'constellation-e007';
const PANEL_ID = 'e007-panel';
const LIVE_ID = 'e007-live';
const SEUIL_ECART = 6; // points de pourcentage : sous ce seuil, deux soleils se chevauchent

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = {
  rendus: 0,
  dernierActif: null,
  focusTotal: 0,
  dernierFocus: null,
  focusBranche: false,
};

/* Greffon tolérant : un chantier défaillant n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journalisation */ }
}

function soleilsDu(layout) {
  return Array.from(layout.querySelectorAll('.const-sun'));
}

function libelleDe(soleil) {
  return (soleil.dataset.label || soleil.getAttribute('title') || soleil.getAttribute('aria-label') || '').trim();
}

function decimale(valeur) {
  return Number.isFinite(valeur) ? valeur.toFixed(2).replace('.', ',') : '—';
}

/* Position lue depuis les variables CSS en pourcentage écrites par constellation.js. */
function positionDe(soleil) {
  const x = parseFloat(soleil.style.getPropertyValue('--x'));
  const y = parseFloat(soleil.style.getPropertyValue('--y'));
  return { x: Number.isFinite(x) ? x : NaN, y: Number.isFinite(y) ? y : NaN };
}

/* Luminance relative sRGB (formule WCAG 1.4.3) d'une couleur hexadécimale. */
function luminanceDe(valeur) {
  const hex = String(valeur || '').trim();
  const trouve = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!trouve) return null;
  let corps = trouve[1];
  if (corps.length === 3) corps = corps.split('').map((c) => c + c).join('');
  const lineaire = (v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const r = lineaire(parseInt(corps.slice(0, 2), 16) / 255);
  const g = lineaire(parseInt(corps.slice(2, 4), 16) / 255);
  const b = lineaire(parseInt(corps.slice(4, 6), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function panneauDans(layout, el) {
  const existant = layout.querySelector('#' + PANEL_ID);
  if (existant) return existant;

  const panneau = el('section', 'e007-panel');
  panneau.id = PANEL_ID;
  panneau.setAttribute('aria-labelledby', 'e007-titre');

  const titre = el('h2', 'e007-titre', 'Diagnostic textuel des soleils');
  titre.id = 'e007-titre';
  panneau.appendChild(titre);

  const lignes = [
    ['e007-resume', 'e007-ligne'],
    ['e007-eres', 'e007-liste'],
    ['e007-actif', 'e007-ligne'],
    ['e007-ecart', 'e007-ligne'],
    ['e007-libelles', 'e007-ligne'],
    ['e007-luminance', 'e007-ligne'],
    ['e007-focus', 'e007-ligne'],
    ['e007-motion', 'e007-ligne'],
  ];
  const destinations = {};
  lignes.forEach(([id, classe]) => {
    const noeud = el(id === 'e007-eres' ? 'ul' : 'p', classe);
    noeud.id = id;
    destinations[id] = noeud;
    panneau.appendChild(noeud);
  });

  const live = el('p', 'e007-ligne e007-live');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  destinations[LIVE_ID] = live;
  panneau.appendChild(live);

  const champ = layout.querySelector('.constellation-field');
  if (champ && typeof layout.insertBefore === 'function') layout.insertBefore(panneau, champ);
  else layout.appendChild(panneau);
  return panneau;
}

/* Écouteur délégué unique, posé sur document pour survivre aux re-rendus. */
function brancheFocus() {
  if (etat.focusBranche || typeof document === 'undefined') return;
  etat.focusBranche = true;
  document.addEventListener('focusin', (evenement) => {
    const cible = evenement && evenement.target;
    if (!cible || !cible.classList || !cible.classList.contains('const-sun')) return;
    const layout = cible.closest ? cible.closest('.constellation-layout') : null;
    if (!layout || !layout.querySelector('#' + PANEL_ID)) return;
    etat.focusTotal += 1;
    etat.dernierFocus = (cible.dataset.constKey || libelleDe(cible) || '?').trim();
    const sortie = document.getElementById('e007-focus');
    if (sortie) {
      sortie.textContent = `Dernier soleil focalisé : ${etat.dernierFocus} · focalisations : ${etat.focusTotal}`;
    }
  });
}

register('E007', (ctx) => {
  try {
    /* Garde de contexte : aucun ajout DOM sans layout exploitable. */
    const layout = ctx && ctx.layout;
    if (!layout || typeof layout.querySelector !== 'function') return;
    const css = typeof ctx.css === 'function' ? ctx.css : null;
    const el = typeof ctx.el === 'function' ? ctx.el : null;
    if (!css || !el) return;

    const soleils = soleilsDu(layout);
    if (!soleils.length) return; // vue vide ou pays sans ère : rien à diagnostiquer

    /* Feuille unique, injectée une seule fois pour toute la vue. */
    css(CSS_ID, `
      .constellation-layout[data-e007="on"] #${PANEL_ID} {
        margin: 12px 0 4px; padding: 8px 10px;
        border: 1px solid var(--line); border-radius: 8px;
        background: rgba(255,255,255,.02);
        font-family: var(--sans, inherit); color: var(--ink-soft);
      }
      #e007-titre {
        margin: 0 0 5px; font-size: 10px; font-weight: 600;
        letter-spacing: .1em; text-transform: uppercase; color: var(--gold);
      }
      #e007-panel .e007-ligne {
        margin: 3px 0; font-size: 9px; line-height: 1.45;
        color: var(--muted-2); font-variant-numeric: tabular-nums;
      }
      #e007-eres { margin: 4px 0; padding-left: 16px; }
      #e007-eres li { margin: 2px 0; font-size: 9px; line-height: 1.4; color: var(--muted-2); }
      #e007-live { color: var(--gold-bright); }
      /* Chantier 05 — signalement visuel des soleils privés de libellé textuel. */
      .constellation-layout[data-e007="on"] .const-sun.e007-sans-libelle {
        outline: 2px dashed var(--gold); outline-offset: 3px;
      }
      /* Chantier 09 — contraste de l'anneau selon la luminance de la couleur d'ère. */
      .constellation-layout[data-e007="on"] .const-sun.e007-era-claire {
        box-shadow: inset 0 0 0 2px rgba(0,0,0,.55);
      }
      .constellation-layout[data-e007="on"] .const-sun.e007-era-sombre {
        box-shadow: inset 0 0 0 2px rgba(255,255,255,.65);
      }
      /* Chantier 06 — l'étiquette tronquée devient lisible au focus clavier. */
      .constellation-layout[data-e007-labels="on"] .const-sun:focus-visible::after {
        white-space: normal; max-width: 220px; overflow: visible;
        background: var(--surface-2); padding: 2px 4px; border-radius: 4px;
      }
      /* Chantier 10 — mouvement réduit, sans animation ni transition résiduelle. */
      .constellation-layout.e007-reduit .const-sun,
      .constellation-layout.e007-reduit #${PANEL_ID} * {
        transition: none !important; animation: none !important;
      }
      @media (max-width: 620px) {
        #e007-titre { font-size: 9px; }
        #e007-panel .e007-ligne, #e007-eres li { font-size: 8px; }
      }
    `);

    /* E007-01 — Recenseur de soleils : comptage dérivé du DOM et ancré en attribut. */
    sansEchec(() => {
      layout.dataset.e007 = 'on';
      layout.dataset.e007Soleils = String(soleils.length);
      const couche = layout.querySelector('.const-layer-suns');
      const residus = couche ? couche.querySelectorAll(':scope > *').length : soleils.length;
      const resume = document.getElementById('e007-resume');
      if (resume) {
        resume.textContent = `Soleils recensés : ${soleils.length} · nœuds dans la couche ères : ${residus}`;
      }
    });

    /* E007-02 — Intervalle de chaque ère : lecture textuelle de data-label. */
    sansEchec(() => {
      const liste = document.getElementById('e007-eres');
      if (!liste) return;
      while (liste.firstChild) liste.removeChild(liste.firstChild);
      soleils.forEach((soleil, index) => {
        const libelle = libelleDe(soleil) || 'libellé absent';
        const item = el('li', 'e007-ere', `Soleil ${index + 1} : ${libelle}`);
        liste.appendChild(item);
      });
    });

    /* E007-03 — Cohérence aria-current ↔ is-active portée par un seul soleil. */
    sansEchec(() => {
      const courants = soleils.filter((s) => s.getAttribute('aria-current') === 'true').length;
      const actifs = soleils.filter((s) => s.classList.contains('is-active')).length;
      const cohérent = courants === 1 && actifs === 1;
      const index = soleils.findIndex((s) => s.classList.contains('is-active'));
      layout.dataset.e007Actif = cohérent ? String(index + 1) : 'incoherent';
      const sortie = document.getElementById('e007-actif');
      if (sortie) {
        sortie.textContent = `Soleil actif : ${cohérent ? index + 1 : 'indéterminé'} · aria-current=${courants}, is-active=${actifs} · ${cohérent ? 'marqueurs cohérents' : 'marqueurs incohérents'}`;
      }
    });

    /* E007-04 — Écart géométrique minimal entre soleils, calculé depuis --x/--y. */
    sansEchec(() => {
      const points = soleils.map(positionDe).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      let minimum = Infinity;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minimum) minimum = distance;
        }
      }
      const value = Number.isFinite(minimum) ? minimum : null;
      layout.dataset.e007Ecart = value === null ? 'indetermine' : value.toFixed(2);
      const sortie = document.getElementById('e007-ecart');
      if (sortie) {
        sortie.textContent = value === null
          ? 'Écart minimal entre soleils : positions indisponibles'
          : `Écart minimal entre deux soleils : ${decimale(value)} pt · seuil de chevauchement ${decimale(SEUIL_ECART)} pt · ${value < SEUIL_ECART ? 'risque de chevauchement' : 'soleils distincts'}`;
      }
    });

    /* E007-05 — Soleils sans libellé : marquage de classe et inventaire textuel. */
    sansEchec(() => {
      const manquants = [];
      soleils.forEach((soleil, index) => {
        const complet = soleil.dataset.label && soleil.getAttribute('aria-label') && soleil.getAttribute('title');
        if (!complet) {
          soleil.classList.add('e007-sans-libelle');
          manquants.push(String(index + 1));
        } else {
          soleil.classList.remove('e007-sans-libelle');
        }
      });
      layout.dataset.e007LibellesManquants = String(manquants.length);
      const sortie = document.getElementById('e007-libelles');
      if (sortie) {
        sortie.textContent = manquants.length
          ? `Libellés incomplets : soleil${manquants.length > 1 ? 's' : ''} ${manquants.join(', ')} (contour en pointillés)`
          : 'Libellés : data-label, aria-label et title présents sur tous les soleils';
      }
    });

    /* E007-06 — Étiquette tronquée : attribut d'élargissement ciblé au focus. */
    sansEchec(() => {
      const tronques = soleils.filter((s) => libelleDe(s).length > 28).length;
      layout.dataset.e007Labels = tronques ? 'on' : 'off';
      layout.dataset.e007LabelsTronques = String(tronques);
      const sortie = document.getElementById('e007-libelles');
      if (sortie && tronques) {
        sortie.textContent += ` · ${tronques} étiquette${tronques > 1 ? 's' : ''} développée${tronques > 1 ? 's' : ''} au focus`;
      }
    });

    /* E007-07 — Suivi du focus clavier : écouteur délégué installé une seule fois. */
    sansEchec(() => {
      brancheFocus();
      const sortie = document.getElementById('e007-focus');
      if (sortie && etat.focusTotal === 0 && !sortie.textContent) {
        sortie.textContent = 'Focus clavier : aucun soleil parcouru pour l’instant';
      }
      const actif = soleils.find((s) => s.classList.contains('is-active'));
      layout.dataset.e007FocusCle = actif ? (actif.dataset.constKey || '') : '';
    });

    /* E007-08 — Miroir live du soleil actif : annonce seulement sur changement. */
    sansEchec(() => {
      const actif = soleils.find((s) => s.classList.contains('is-active'));
      const cle = actif ? (actif.dataset.constKey || libelleDe(actif)) : 'aucun';
      const region = document.getElementById(LIVE_ID);
      if (region && cle !== etat.dernierActif) {
        region.textContent = `Soleil actif : ${cle}${actif ? ' · ' + libelleDe(actif) : ''}`;
        etat.dernierActif = cle;
      }
    });

    /* E007-09 — Luminance de la couleur d'ère : calcul, attribut et classe CSS. */
    sansEchec(() => {
      const clairs = [];
      const sombres = [];
      const indetermines = [];
      soleils.forEach((soleil, index) => {
        const lueur = luminanceDe(soleil.style.getPropertyValue('--era'));
        if (lueur === null) {
          indetermines.push(String(index + 1));
          return;
        }
        const nature = lueur >= 0.5 ? 'claire' : 'sombre';
        soleil.dataset.e007Luminance = decimale(lueur);
        soleil.classList.add(nature === 'claire' ? 'e007-era-claire' : 'e007-era-sombre');
        soleil.classList.remove(nature === 'claire' ? 'e007-era-sombre' : 'e007-era-claire');
        (nature === 'claire' ? clairs : sombres).push(String(index + 1));
      });
      layout.dataset.e007EresClaires = String(clairs.length);
      layout.dataset.e007EresSombres = String(sombres.length);
      const sortie = document.getElementById('e007-luminance');
      if (sortie) {
        sortie.textContent = `Luminance des couleurs d'ère : ${clairs.length} claire${clairs.length > 1 ? 's' : ''}, ${sombres.length} sombre${sombres.length > 1 ? 's' : ''}`
          + (indetermines.length ? `, ${indetermines.length} non calculable${indetermines.length > 1 ? 's' : ''}` : '')
          + ' · anneau interne ajusté en conséquence';
      }
    });

    /* E007-10 — Mouvement réduit, idempotence et boucle de diagnostic fermée. */
    sansEchec(() => {
      etat.rendus += 1;
      const reduit = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
      layout.dataset.e007Motion = reduit ? 'reduit' : 'normal';
      layout.dataset.e007Rendus = String(etat.rendus);
      if (reduit) layout.classList.add('e007-reduit');
      else layout.classList.remove('e007-reduit');
      const panneaux = typeof document !== 'undefined'
        ? document.querySelectorAll('#' + PANEL_ID).length : 0;
      layout.dataset.e007Idempotence = String(panneaux);
      const sortie = document.getElementById('e007-motion');
      if (sortie) {
        sortie.textContent = `Mouvement réduit : ${reduit ? 'activé' : 'non'} · panneaux e007 : ${panneaux} (attendu 1) · diagnostic n° ${etat.rendus}`;
      }
    });
  } catch { /* greffon tolérant : aucune exception ne remonte au registre */ }
});
