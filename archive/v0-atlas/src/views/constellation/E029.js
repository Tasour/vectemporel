import { register } from './registry.js';

/*
 * Lentille E029 — Robustesse et garde-fous appliqués aux lunes de la vue Constellation.
 *
 * Contrat : register('E029', ctx => { … }) ; ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() }. Le contexte est vérifié
 * avant tout ajout DOM ; la feuille unique est injectée une seule fois via
 * ctx.css('constellation-e029', …) ; tous les identifiants DOM sont préfixés
 * e029-. Aucun appel réseau, aucune source aléatoire, aucune sortie console,
 * aucun minuteur ni boucle d'animation propre à ce greffon.
 *
 * Les lunes sont les boutons .const-moon rendus par constellation.js dans la
 * couche .const-layer-moons. La lentille ne réécrit pas le rendu : elle lit le
 * DOM déjà construit (data-const-key, data-label, title, aria-label, --x, --y,
 * aria-current, is-active) et pose des garde-fous observables et sans exception.
 */

const PANEL_ID = 'e029-panel';
const LIVE_ID = 'e029-live';
const SEUIL_CHEVAUCHEMENT = 4; // points de pourcentage : sous ce seuil, deux lunes se confondent
const CONFIANCE_FAIBLE = 0.5; // sous ce seuil, la confiance est signalée comme fragile
const BORDE = 2; // marge de sécurité en pourcentage aux bords du champ

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = {
  rendus: 0,
  clics: 0,
  dernierClic: null,
  clicBranche: false,
  empreintePrecedente: null,
};

/* Greffon tolérant : un chantier défaillant n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans console */ }
}

function lunesDu(layout) {
  return Array.from(layout.querySelectorAll('.const-moon'));
}

function libelleDe(lune) {
  return (lune.dataset.label || lune.getAttribute('title') || lune.getAttribute('aria-label') || '').trim();
}

function decimale(valeur) {
  return Number.isFinite(valeur) ? valeur.toFixed(2).replace('.', ',') : '—';
}

/* Position lue depuis les variables CSS en pourcentage écrites par constellation.js. */
function positionDe(lune) {
  const x = parseFloat(lune.style.getPropertyValue('--x'));
  const y = parseFloat(lune.style.getPropertyValue('--y'));
  return { x: Number.isFinite(x) ? x : NaN, y: Number.isFinite(y) ? y : NaN };
}

/* Confiance : lue depuis title / aria-label, où constellation.js écrit « confiance 0.8 ». */
function confianceDe(lune) {
  const source = (lune.getAttribute('aria-label') || '') + ' ' + (lune.getAttribute('title') || '');
  const trouve = /confiance\s+([0-9]+(?:[.,][0-9]+)?)/i.exec(source);
  if (!trouve) return NaN;
  return Number(trouve[1].replace(',', '.'));
}

/* Sources : « N sources locales » ou « aucune source associée » (constellation.js). */
function sourcesDe(lune) {
  const source = (lune.getAttribute('aria-label') || '') + ' ' + (lune.getAttribute('title') || '');
  const trouve = /(\d+)\s+source/i.exec(source);
  if (trouve) return Number(trouve[1]);
  return /aucune source/i.test(source) ? 0 : NaN;
}

/* Empreinte FNV-1a 32 bits : déterministe, aucune graine aléatoire. */
function empreinteDe(chaine) {
  let h = 0x811c9dc5;
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function panneauDans(layout, el) {
  const existant = layout.querySelector('#' + PANEL_ID);
  if (existant) return existant;

  const panneau = el('section', 'e029-panel');
  panneau.id = PANEL_ID;
  panneau.setAttribute('aria-labelledby', 'e029-titre');

  const titre = el('h2', 'e029-titre', 'Garde-fous des lunes');
  titre.id = 'e029-titre';
  panneau.appendChild(titre);

  const lignes = [
    ['e029-resume', 'e029-ligne'],
    ['e029-actif', 'e029-ligne'],
    ['e029-coords', 'e029-ligne'],
    ['e029-libelles', 'e029-ligne'],
    ['e029-confiance', 'e029-ligne'],
    ['e029-chevauchement', 'e029-ligne'],
    ['e029-sources', 'e029-ligne'],
    ['e029-clics', 'e029-ligne'],
  ];
  lignes.forEach(([id, classe]) => {
    const noeud = el('p', classe);
    noeud.id = id;
    panneau.appendChild(noeud);
  });

  const live = el('p', 'e029-ligne e029-live');
  live.id = LIVE_ID;
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  panneau.appendChild(live);

  const champ = layout.querySelector('.constellation-field');
  if (champ && typeof layout.insertBefore === 'function') layout.insertBefore(panneau, champ);
  else layout.appendChild(panneau);
  return panneau;
}

/* Écouteur délégué unique, posé sur document pour survivre aux re-rendus. */
function brancheClic() {
  if (etat.clicBranche || typeof document === 'undefined') return;
  etat.clicBranche = true;
  document.addEventListener('click', (evenement) => {
    const cible = evenement && evenement.target;
    if (!cible || !cible.classList || !cible.classList.contains('const-moon')) return;
    const layout = cible.closest ? cible.closest('.constellation-layout') : null;
    if (!layout || !layout.querySelector('#' + PANEL_ID)) return;
    etat.clics += 1;
    etat.dernierClic = (cible.dataset.constKey || libelleDe(cible) || '?').trim();
    cible.setAttribute('data-e029-clic', String(etat.clics));
    layout.dataset.e029Clics = String(etat.clics);
    layout.dataset.e029DernierClic = etat.dernierClic;
    const sortie = document.getElementById('e029-clics');
    if (sortie) {
      sortie.textContent = `Clics sur lunes : ${etat.clics} · dernier : ${etat.dernierClic}`;
    }
    const live = document.getElementById(LIVE_ID);
    if (live) {
      live.textContent = `Lune activée : ${etat.dernierClic} (clic n° ${etat.clics})`;
    }
  });
}

register('E029', (ctx) => {
  try {
    /* Garde de contexte : aucun ajout DOM sans layout exploitable. */
    const layout = ctx && ctx.layout;
    if (!layout || typeof layout.querySelector !== 'function') return;
    if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
    const el = ctx.el;

    const lunes = lunesDu(layout);
    if (!lunes.length) return; // vue vide ou repère sans point : rien à garder

    panneauDans(layout, el);

    /* Feuille unique, injectée une seule fois pour toute la vue. */
    /* E029-09 — Style des garde-fous : avertissements par forme, jamais par couleur seule. */
    ctx.css('constellation-e029', `
      .constellation-layout[data-e029="on"] #${PANEL_ID} {
        margin: 12px 0 4px; padding: 8px 10px;
        border: 1px solid var(--line); border-radius: 8px;
        background: rgba(255,255,255,.02);
        font-family: var(--sans, inherit); color: var(--ink-soft);
      }
      #e029-titre {
        margin: 0 0 5px; font-size: 10px; font-weight: 600;
        letter-spacing: .1em; text-transform: uppercase; color: var(--gold);
      }
      #${PANEL_ID} .e029-ligne {
        margin: 3px 0; font-size: 9px; line-height: 1.45;
        color: var(--muted-2); font-variant-numeric: tabular-nums;
      }
      #${LIVE_ID} { color: var(--gold-bright); }
      /* E029-02 : conflit d'unicité de la lune active. */
      .constellation-layout[data-e029="on"] .const-moon.e029-conflit {
        outline: 2px solid var(--gold); outline-offset: 2px;
      }
      /* E029-03 : coordonnées hors cadre ou non finies. */
      .constellation-layout[data-e029="on"] .const-moon.e029-hors-cadre {
        outline: 1px dashed var(--gold); outline-offset: 2px;
      }
      /* E029-04 : libellé incomplet. */
      .constellation-layout[data-e029="on"] .const-moon.e029-libelle-manquant {
        box-shadow: inset 0 0 0 2px var(--gold);
      }
      /* E029-05 : confiance fragile. */
      .constellation-layout[data-e029="on"] .const-moon.e029-confiance-faible {
        border-style: dashed;
      }
      /* E029-07 : lune sans source associée. */
      .constellation-layout[data-e029="on"] .const-moon.e029-sans-source {
        border-width: 2px;
      }
      /* E029-08 : lune cliquée, contour de confirmation. */
      .constellation-layout[data-e029="on"] .const-moon[data-e029-clic] {
        outline: 2px dotted var(--gold-bright); outline-offset: 3px;
      }
      /* Mouvement réduit : aucune transition ni animation résiduelle. */
      .constellation-layout.e029-reduit .const-moon,
      .constellation-layout.e029-reduit #${PANEL_ID} * {
        transition: none !important; animation: none !important;
      }
      @media (max-width: 620px) {
        #e029-titre { font-size: 9px; }
        #${PANEL_ID} .e029-ligne { font-size: 8px; }
      }
    `);

    /* E029-01 — Recenseur et garde de cardinalité : comptage et clés dupliquées. */
    sansEchec(() => {
      layout.dataset.e029 = 'on';
      layout.dataset.e029Lunes = String(lunes.length);
      const vues = {};
      const doublons = [];
      lunes.forEach((lune, index) => {
        const cle = (lune.dataset.constKey || `moon:${index}`).trim();
        if (Object.prototype.hasOwnProperty.call(vues, cle)) doublons.push(cle);
        else vues[cle] = index;
      });
      layout.dataset.e029Doublons = String(doublons.length);
      const sortie = document.getElementById('e029-resume');
      if (sortie) {
        sortie.textContent = `Lunes recensées : ${lunes.length} · clés dupliquées : ${doublons.length}`
          + (doublons.length ? ` (${doublons.join(', ')})` : '') + ' · garde de cardinalité active';
      }
    });

    /* E029-02 — Garde d'unicité de la lune active : is-active ↔ aria-current. */
    sansEchec(() => {
      const actifs = lunes.filter((lune) => lune.classList.contains('is-active'));
      const courants = lunes.filter((lune) => lune.getAttribute('aria-current') === 'true');
      const coherent = actifs.length === 1 && courants.length === 1 && actifs[0] === courants[0];
      lunes.forEach((lune) => lune.classList.remove('e029-conflit'));
      if (!coherent && (actifs.length > 1 || courants.length > 1)) {
        actifs.concat(courants).forEach((lune) => lune.classList.add('e029-conflit'));
      }
      layout.dataset.e029Actif = coherent
        ? String(lunes.indexOf(actifs[0]) + 1) : 'incoherent';
      const sortie = document.getElementById('e029-actif');
      if (sortie) {
        sortie.textContent = `Lune active : ${coherent ? lunes.indexOf(actifs[0]) + 1 : 'indéterminée'}`
          + ` · is-active=${actifs.length}, aria-current=${courants.length}`
          + ` · ${coherent ? 'marqueurs cohérents' : 'marqueurs incohérents signalés'}`;
      }
    });

    /* E029-03 — Validateur de coordonnées : bornage et signalement hors cadre. */
    sansEchec(() => {
      let horsCadre = 0;
      let invalides = 0;
      lunes.forEach((lune) => {
        const position = positionDe(lune);
        let x = position.x;
        let y = position.y;
        lune.classList.remove('e029-hors-cadre');
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          x = 50; y = 50; invalides += 1;
          lune.style.setProperty('--x', `${x}%`);
          lune.style.setProperty('--y', `${y}%`);
          lune.dataset.e029Pos = 'invalide';
        }
        if (x < BORDE || x > 100 - BORDE || y < BORDE || y > 100 - BORDE) {
          const bx = Math.min(100 - BORDE, Math.max(BORDE, x));
          const by = Math.min(100 - BORDE, Math.max(BORDE, y));
          lune.style.setProperty('--x', `${bx.toFixed(2)}%`);
          lune.style.setProperty('--y', `${by.toFixed(2)}%`);
          lune.classList.add('e029-hors-cadre');
          lune.dataset.e029Pos = 'bornee';
          horsCadre += 1;
        } else if (!lune.dataset.e029Pos) {
          lune.dataset.e029Pos = 'ok';
        }
      });
      layout.dataset.e029HorsCadre = String(horsCadre);
      layout.dataset.e029PosInvalides = String(invalides);
      const sortie = document.getElementById('e029-coords');
      if (sortie) {
        sortie.textContent = `Coordonnées : ${horsCadre} lune${horsCadre > 1 ? 's' : ''} bornée${horsCadre > 1 ? 's' : ''},`
          + ` ${invalides} position${invalides > 1 ? 's' : ''} invalide${invalides > 1 ? 's' : ''}`
          + ` · marge de sécurité ${BORDE} %`;
      }
    });

    /* E029-04 — Contrôle d'intégrité des libellés : data-label, title, aria-label. */
    sansEchec(() => {
      const manquants = [];
      lunes.forEach((lune, index) => {
        const complet = !!(lune.dataset.label && lune.getAttribute('title') && lune.getAttribute('aria-label'));
        lune.classList.toggle('e029-libelle-manquant', !complet);
        if (!complet) manquants.push(String(index + 1));
      });
      layout.dataset.e029LibellesManquants = String(manquants.length);
      const sortie = document.getElementById('e029-libelles');
      if (sortie) {
        sortie.textContent = manquants.length
          ? `Libellés incomplets : lune${manquants.length > 1 ? 's' : ''} ${manquants.join(', ')} (anneau interne)`
          : 'Libellés : data-label, title et aria-label présents sur toutes les lunes';
      }
    });

    /* E029-05 — Garde de confiance : seuil, marquage et amplitudes. */
    sansEchec(() => {
      let faibles = 0;
      let minimum = Infinity;
      let maximum = -Infinity;
      lunes.forEach((lune, index) => {
        const confiance = confianceDe(lune);
        lune.classList.remove('e029-confiance-faible');
        if (!Number.isFinite(confiance)) {
          lune.dataset.e029Confiance = 'indeterminee';
          return;
        }
        lune.dataset.e029Confiance = decimale(confiance);
        minimum = Math.min(minimum, confiance);
        maximum = Math.max(maximum, confiance);
        if (confiance < CONFIANCE_FAIBLE) {
          lune.classList.add('e029-confiance-faible');
          faibles += 1;
        }
      });
      layout.dataset.e029ConfianceFaible = String(faibles);
      const bornes = Number.isFinite(minimum) ? `${decimale(minimum)}–${decimale(maximum)}` : '—';
      const sortie = document.getElementById('e029-confiance');
      if (sortie) {
        sortie.textContent = `Confiance : ${faibles} lune${faibles > 1 ? 's' : ''} fragile${faibles > 1 ? 's' : ''}`
          + ` (bordure en pointillés) · amplitude ${bornes} · seuil ${decimale(CONFIANCE_FAIBLE)}`;
      }
    });

    /* E029-06 — Détecteur de chevauchement géométrique depuis --x/--y. */
    sansEchec(() => {
      const points = lunes.map(positionDe).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
      let minimum = Infinity;
      for (let i = 0; i < points.length; i += 1) {
        for (let j = i + 1; j < points.length; j += 1) {
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < minimum) minimum = distance;
        }
      }
      const valeur = Number.isFinite(minimum) ? minimum : null;
      layout.dataset.e029Ecart = valeur === null ? 'indetermine' : valeur.toFixed(2);
      const risque = valeur !== null && valeur < SEUIL_CHEVAUCHEMENT;
      layout.dataset.e029Chevauchement = risque ? '1' : '0';
      const sortie = document.getElementById('e029-chevauchement');
      if (sortie) {
        sortie.textContent = valeur === null
          ? 'Écart entre lunes : positions indisponibles'
          : `Écart minimal : ${decimale(valeur)} pt · seuil ${decimale(SEUIL_CHEVAUCHEMENT)} pt ·`
            + ` ${risque ? 'risque de chevauchement' : 'lunes distinctes'}`;
      }
    });

    /* E029-07 — Gardien de sources : décompte et marquage des lunes orphelines. */
    sansEchec(() => {
      let sansSource = 0;
      let total = 0;
      lunes.forEach((lune) => {
        const nombre = sourcesDe(lune);
        lune.classList.remove('e029-sans-source');
        if (!Number.isFinite(nombre) || nombre === 0) {
          lune.classList.add('e029-sans-source');
          sansSource += 1;
        } else {
          total += nombre;
        }
      });
      layout.dataset.e029SansSource = String(sansSource);
      layout.dataset.e029SourcesTotal = String(total);
      const sortie = document.getElementById('e029-sources');
      if (sortie) {
        sortie.textContent = `Sources : ${total} au total · ${sansSource} lune${sansSource > 1 ? 's' : ''} sans source`
          + ` (bordure épaissie) · garde anti-orphelin active`;
      }
    });

    /* E029-08 — Écouteur délégué de clic : compteur et miroir live. */
    sansEchec(() => {
      brancheClic();
      layout.dataset.e029Clics = String(etat.clics);
      const actif = lunes.find((lune) => lune.classList.contains('is-active'));
      layout.dataset.e029ClicActif = actif ? (actif.dataset.constKey || '') : '';
      const sortie = document.getElementById('e029-clics');
      if (sortie && etat.clics === 0 && !sortie.textContent) {
        sortie.textContent = `Clics sur lunes : 0 · dernier : aucun · actif : ${layout.dataset.e029ClicActif || 'aucun'}`;
      }
    });

    /* E029-10 — Empreinte de robustesse, mouvement réduit et relevé consolidé. */
    sansEchec(() => {
      etat.rendus += 1;
      const parties = lunes.map((lune, index) => [
        lune.dataset.constKey || `moon:${index}`,
        lune.classList.contains('is-active') ? '1' : '0',
        lune.dataset.e029Pos || '',
        lune.dataset.e029Confiance || '',
        libelleDe(lune),
      ].join('~'));
      const empreinte = empreinteDe(parties.join('|'));
      const stable = empreinte === etat.empreintePrecedente;
      etat.empreintePrecedente = empreinte;

      const reduit = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
      layout.classList.toggle('e029-reduit', reduit);
      layout.dataset.e029Motion = reduit ? 'reduit' : 'normal';
      layout.dataset.e029Empreinte = empreinte;
      layout.dataset.e029Stable = stable ? '1' : '0';
      layout.dataset.e029Rendus = String(etat.rendus);

      const panneaux = typeof document !== 'undefined'
        ? document.querySelectorAll('#' + PANEL_ID).length : 0;
      layout.dataset.e029Idempotence = String(panneaux);
      const live = document.getElementById(LIVE_ID);
      if (live && !live.textContent) {
        live.textContent = `Garde-fou n° ${etat.rendus} · mouvement ${reduit ? 'réduit' : 'normal'}`
          + ` · panneaux ${panneaux} (attendu 1) · empreinte ${empreinte}`;
      }
    });
  } catch { /* greffon tolérant : aucune exception ne remonte au registre */ }
});
