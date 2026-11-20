import { register } from './registry.js';

/* Lentille V2 E029 — robustesse et garde-fous appliqués aux lunes de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau, sans source aléatoire et sans minuteur ni boucle d'animation propre.
   Préfixe exclusif : v2e029 (aucune collision avec la passe 1 e029-…).
   Le module est passif : il lit le DOM déjà construit par constellation.js et
   en dérive des garde-fous observables, sans réécrire le rendu. */

const CSS_ID = 'constellation-v2-e029';
const PANEL_ID = 'v2e029-panel';
const LIVE_ID = 'v2e029-live';

/* Références déterministes, explicites et vérifiables. */
const SEUIL_CIBLE = 36; // px : cible tactile minimale recommandée (WCAG 2.5.5)
const SEUIL_LIBELLE = 64; // caractères : au-delà, l'étiquette est tronquée
const SEUIL_ANGLE = 30; // degrés : secteur angulaire trop serré entre deux lunes

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = { empreintePrecedente: null, rendus: 0 };

/* Greffon tolérant : un chantier défaillant n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journalisation */ }
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

/* Coordonnées lues depuis les variables CSS en pourcentage écrites par la vue. */
function positionDe(lune) {
  const x = parseFloat(lune.style.getPropertyValue('--x'));
  const y = parseFloat(lune.style.getPropertyValue('--y'));
  return { x, y };
}

/* Mesure réelle de la boîte de la lune, sans écriture ni reflux forcé. */
function mesureDe(lune) {
  if (!lune || typeof lune.getBoundingClientRect !== 'function') {
    return { largeur: NaN, hauteur: NaN, gauche: NaN, haut: NaN };
  }
  const rect = lune.getBoundingClientRect();
  return { largeur: rect.width, hauteur: rect.height, gauche: rect.left, haut: rect.top };
}

/* Angle polaire d'une lune autour du centre (50 %, 50 %) de la constellation. */
function angleDe(lune) {
  const point = positionDe(lune);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return NaN;
  return (Math.atan2(point.y - 50, point.x - 50) * 180 / Math.PI + 360) % 360;
}

/* Empreinte FNV-1a déterministe des dimensions inédites surveillées ici. */
function empreinteDe(lunes) {
  const chaine = lunes.map((lune, index) => [
    index, lune.id || '', lune.dataset.v2e029Cible || '',
    lune.getAttribute('tabindex') || '', lune.dataset.v2e029AriaIncoherent || '',
    lune.dataset.v2e029Angle || '', lune.dataset.v2e029Debord || '',
    lune.dataset.v2e029Perimetre || '', lune.dataset.v2e029LibLongueur || '',
    libelleDe(lune),
  ].join(':')).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/* Panneau unique, créé une seule fois, avec un vrai tableau indexable. */
function panneauDans(layout, el) {
  const existant = layout.querySelector('#' + PANEL_ID);
  if (existant) return existant;

  const panneau = el('section', 'v2e029-panel');
  panneau.id = PANEL_ID;
  panneau.setAttribute('aria-labelledby', 'v2e029-titre');

  const titre = el('h2', 'v2e029-titre', 'Garde-fous avancés des lunes');
  titre.id = 'v2e029-titre';
  panneau.appendChild(titre);

  const table = el('table', 'v2e029-table');
  table.id = 'v2e029-table';
  table.appendChild(el('caption', '', 'Inventaire des lunes et de leurs cibles mesurées'));
  const tete = el('thead');
  const ligneTete = el('tr');
  ['Rang', 'Clé', 'Libellé', 'Cible (px)'].forEach((intitule) => {
    const cellule = el('th', '', intitule);
    cellule.setAttribute('scope', 'col');
    ligneTete.appendChild(cellule);
  });
  tete.appendChild(ligneTete);
  table.appendChild(tete);
  const corps = el('tbody');
  corps.id = 'v2e029-corps';
  table.appendChild(corps);
  panneau.appendChild(table);

  ['v2e029-cibles', 'v2e029-tab', 'v2e029-ids', 'v2e029-aria', 'v2e029-angle',
    'v2e029-debord', 'v2e029-aretes', 'v2e029-libelles', 'v2e029-perimetre',
    'v2e029-releve'].forEach((identifiant) => {
    const ligne = el('p', 'v2e029-ligne', '');
    ligne.id = identifiant;
    panneau.appendChild(ligne);
  });

  const live = el('p', 'v2e029-ligne v2e029-live', '');
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

register('E029', (ctx) => {
  /* Garde de contexte : aucun ajout DOM sans layout exploitable. */
  const layout = ctx && ctx.layout;
  if (!layout || typeof layout.querySelector !== 'function') return;
  const css = typeof ctx.css === 'function' ? ctx.css : null;
  const el = typeof ctx.el === 'function' ? ctx.el : null;
  if (!css || !el) return;

  const lunes = lunesDu(layout);
  if (!lunes.length) return; // vue vide ou repère sans point : rien à garder

  /* Feuille unique, injectée une seule fois pour toute la vue. */
  css(CSS_ID, `
    .constellation-layout[data-v2e029="on"] #${PANEL_ID} {
      margin: 12px 0 4px; padding: 8px 10px;
      border: 1px solid var(--line); border-radius: 8px;
      background: rgba(255,255,255,.02); color: var(--ink-soft);
      font-family: var(--sans, inherit);
    }
    #v2e029-titre {
      margin: 0 0 5px; font-size: 10px; font-weight: 600;
      letter-spacing: .1em; text-transform: uppercase; color: var(--gold);
    }
    #${PANEL_ID} .v2e029-ligne {
      margin: 3px 0; font-size: 9px; line-height: 1.45;
      color: var(--muted-2); font-variant-numeric: tabular-nums;
    }
    #${PANEL_ID} table.v2e029-table { border-collapse: collapse; width: 100%; margin: 4px 0; font-size: 9px; }
    #${PANEL_ID} table.v2e029-table caption { text-align: left; margin-bottom: 2px; color: var(--gold); font-size: 9px; }
    #${PANEL_ID} table.v2e029-table th, #${PANEL_ID} table.v2e029-table td {
      border: 1px solid var(--line); padding: 2px 4px; text-align: left;
      line-height: 1.35; color: var(--muted-2);
    }
    #${PANEL_ID} table.v2e029-table th { font-weight: 600; color: var(--gold-bright); }
    #${LIVE_ID} { color: var(--gold-bright); }
    /* E029-01 : cible tactile trop petite — contour pointillé, jamais la couleur seule. */
    .constellation-layout[data-v2e029="on"] .const-moon[data-v2e029-cible-petite="1"] {
      outline: 2px dotted var(--gold); outline-offset: 2px;
    }
    /* E029-04 : état ARIA incohérent — anneau interne violet. */
    .constellation-layout[data-v2e029="on"] .const-moon[data-v2e029-aria-incoherent="1"] {
      box-shadow: inset 0 0 0 3px var(--violet);
    }
    /* E029-06 : débordement réel — bordure double, distincte des autres marqueurs. */
    .constellation-layout[data-v2e029="on"] .const-moon[data-v2e029-debord="1"] {
      border-width: 2px; border-style: double;
    }
    /* E029-08 : libellé trop long — troncature contrôlée sans débordement. */
    .constellation-layout[data-v2e029="on"] .const-moon[data-v2e029-lib-long="1"]::after {
      max-width: 56px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    /* Mouvement réduit : aucune transition ni animation résiduelle. */
    .constellation-layout.v2e029-reduit #${PANEL_ID} *,
    .constellation-layout.v2e029-reduit .const-moon {
      transition: none !important; animation: none !important;
    }
    @media (max-width: 620px) {
      #v2e029-titre { font-size: 9px; }
      #${PANEL_ID} .v2e029-ligne, #${PANEL_ID} table.v2e029-table { font-size: 8px; }
    }
    @media (prefers-reduced-motion: reduce) {
      #${PANEL_ID} *, .constellation-layout .const-moon {
        transition: none !important; animation: none !important;
      }
    }
  `);

  panneauDans(layout, el); // idempotent : un seul panneau, même après re-rendus
  layout.dataset.v2e029 = 'on';

  /* E029-01 — Inventaire tabulaire et baromètre de taille des cibles tactiles. */
  sansEchec(() => {
    const corps = layout.querySelector('#v2e029-corps');
    if (corps) {
      while (corps.firstChild) corps.removeChild(corps.firstChild);
      lunes.forEach((lune, index) => {
        const mesure = mesureDe(lune);
        const cible = mesure.largeur > 0 && mesure.hauteur > 0
          ? Math.min(mesure.largeur, mesure.hauteur) : NaN;
        const ligne = el('tr', '');
        ligne.dataset.v2e029Rang = String(index + 1);
        [String(index + 1), lune.dataset.constKey || '—', libelleDe(lune) || '—',
          Number.isFinite(cible) ? decimale(cible) : '—'].forEach((valeur) => {
          ligne.appendChild(el('td', '', valeur));
        });
        corps.appendChild(ligne);
      });
      layout.dataset.v2e029Lignes = String(corps.children.length);
    }
    const petites = [];
    let minimum = Infinity;
    let maximum = 0;
    lunes.forEach((lune, index) => {
      const mesure = mesureDe(lune);
      const cible = mesure.largeur > 0 && mesure.hauteur > 0
        ? Math.min(mesure.largeur, mesure.hauteur) : NaN;
      lune.dataset.v2e029Cible = Number.isFinite(cible) ? decimale(cible) : 'indetermine';
      const tropPetite = Number.isFinite(cible) && cible < SEUIL_CIBLE;
      lune.dataset.v2e029CiblePetite = tropPetite ? '1' : '0';
      if (Number.isFinite(cible)) {
        minimum = Math.min(minimum, cible);
        maximum = Math.max(maximum, cible);
      }
      if (!Number.isFinite(cible) || tropPetite) petites.push(String(index + 1));
    });
    layout.dataset.v2e029CiblesPetites = String(petites.length);
    layout.dataset.v2e029CibleMin = Number.isFinite(minimum) ? decimale(minimum) : 'indetermine';
    const sortie = layout.querySelector('#v2e029-cibles');
    if (sortie) {
      sortie.textContent = `Cibles tactiles : ${petites.length}/${lunes.length} sous ${SEUIL_CIBLE} px`
        + (petites.length ? ` (lune${petites.length > 1 ? 's' : ''} ${petites.join(', ')})` : '')
        + ` · dimension minimale ${decimale(minimum)} px, maximale ${decimale(maximum)} px.`;
    }
  });

  /* E029-02 — Diagnostic du tabindex : valeurs invalides et ordre positif. */
  sansEchec(() => {
    const positifs = [];
    const negatifs = [];
    const invalides = [];
    lunes.forEach((lune, index) => {
      const brut = lune.getAttribute('tabindex');
      if (brut === null || brut === '') return; // ordre naturel du bouton
      const valeur = Number(brut);
      if (!Number.isInteger(valeur)) invalides.push(String(index + 1));
      else if (valeur > 0) positifs.push(String(index + 1));
      else if (valeur < 0) negatifs.push(String(index + 1));
    });
    layout.dataset.v2e029TabPositifs = String(positifs.length);
    layout.dataset.v2e029TabNegatifs = String(negatifs.length);
    layout.dataset.v2e029TabInvalides = String(invalides.length);
    const sortie = layout.querySelector('#v2e029-tab');
    if (sortie) {
      sortie.textContent = `Tabulation : ${positifs.length} tabindex positif${positifs.length > 1 ? 's' : ''}`
        + ` (anti-motif), ${negatifs.length} hors parcours`
        + (invalides.length
          ? `, ${invalides.length} valeur${invalides.length > 1 ? 's' : ''} invalide${invalides.length > 1 ? 's' : ''} : lune ${invalides.join(', ')}`
          : ', valeurs valides') + '.';
    }
  });

  /* E029-03 — Unicité des identifiants DOM des lunes. */
  sansEchec(() => {
    const vus = {};
    const doublons = [];
    const absents = [];
    lunes.forEach((lune, index) => {
      const identifiant = (lune.id || '').trim();
      if (!identifiant) { absents.push(String(index + 1)); return; }
      if (Object.prototype.hasOwnProperty.call(vus, identifiant)) doublons.push(identifiant);
      else vus[identifiant] = index + 1;
    });
    layout.dataset.v2e029IdAbsents = String(absents.length);
    layout.dataset.v2e029IdDoublons = String(doublons.length);
    const sortie = layout.querySelector('#v2e029-ids');
    if (sortie) {
      sortie.textContent = `Identifiants DOM : ${absents.length} absent${absents.length > 1 ? 's' : ''}`
        + ` (lune${absents.length > 1 ? 's' : ''} ${absents.join(', ') || 'aucune'}),`
        + ` ${doublons.length} doublon${doublons.length > 1 ? 's' : ''}`
        + (doublons.length ? ` (${doublons.join(', ')})` : '') + '.';
    }
  });

  /* E029-04 — Cohérence des états ARIA par rapport à l'état actif. */
  sansEchec(() => {
    const incoherents = [];
    lunes.forEach((lune, index) => {
      const actif = lune.classList.contains('is-active');
      const masque = lune.getAttribute('aria-hidden') === 'true';
      const desactive = lune.getAttribute('aria-disabled') === 'true' || lune.disabled === true;
      const presse = lune.getAttribute('aria-pressed');
      const points = [];
      if (actif && (masque || desactive)) points.push('actif masqué ou désactivé');
      if (presse !== null && presse !== 'true' && presse !== 'false') points.push('aria-pressed invalide');
      if (masque && (lune.tabIndex === 0 || lune.getAttribute('tabindex') === '0')) {
        points.push('masqué mais focalisable');
      }
      lune.dataset.v2e029AriaIncoherent = points.length ? '1' : '0';
      if (points.length) incoherents.push(`${index + 1} : ${points.join(' / ')}`);
    });
    layout.dataset.v2e029AriaIncoherents = String(incoherents.length);
    const sortie = layout.querySelector('#v2e029-aria');
    if (sortie) {
      sortie.textContent = `États ARIA : ${incoherents.length}/${lunes.length} incohérence${incoherents.length > 1 ? 's' : ''}`
        + (incoherents.length ? ` (${incoherents.join(' · ')})` : ' · masquage, activation et pressions cohérents') + '.';
    }
  });

  /* E029-05 — Garde de répartition angulaire autour du centre du champ. */
  sansEchec(() => {
    const angles = lunes.map((lune) => {
      const angle = angleDe(lune);
      lune.dataset.v2e029Angle = Number.isFinite(angle) ? decimale(angle) : 'indetermine';
      return angle;
    }).filter(Number.isFinite).sort((a, b) => a - b);
    const sortie = layout.querySelector('#v2e029-angle');
    if (angles.length < 2) {
      layout.dataset.v2e029AngleMin = 'indetermine';
      if (sortie) sortie.textContent = 'Répartition angulaire : moins de deux lunes exploitables.';
      return;
    }
    const pas = 360 / angles.length;
    let minimum = Infinity;
    let maximum = 0;
    for (let i = 0; i < angles.length; i += 1) {
      const ecart = (angles[(i + 1) % angles.length] - angles[i] + 360) % 360;
      if (ecart < minimum) minimum = ecart;
      if (ecart > maximum) maximum = ecart;
    }
    const serre = minimum < SEUIL_ANGLE;
    layout.dataset.v2e029AngleMin = decimale(minimum);
    layout.dataset.v2e029AngleMax = decimale(maximum);
    layout.dataset.v2e029AngleSerre = serre ? '1' : '0';
    if (sortie) {
      sortie.textContent = `Répartition angulaire : pas théorique ${decimale(pas)}° · écarts ${decimale(minimum)}° à ${decimale(maximum)}° ·`
        + ` ${serre ? 'secteur trop serré signalé' : `secteurs au-dessus de ${SEUIL_ANGLE}°`}.`;
    }
  });

  /* E029-06 — Détecteur de débordement réel du champ (mesure en pixels). */
  sansEchec(() => {
    const champ = layout.querySelector('.constellation-field');
    const limites = champ && typeof champ.getBoundingClientRect === 'function'
      ? champ.getBoundingClientRect() : null;
    const debordements = [];
    if (limites && limites.width > 0 && limites.height > 0) {
      lunes.forEach((lune, index) => {
        const mesure = mesureDe(lune);
        if (!(mesure.largeur > 0 && mesure.hauteur > 0)) {
          lune.dataset.v2e029Debord = 'indetermine';
          return;
        }
        const centreX = mesure.gauche + mesure.largeur / 2;
        const centreY = mesure.haut + mesure.hauteur / 2;
        const dedans = centreX >= limites.left && centreX <= limites.right
          && centreY >= limites.top && centreY <= limites.bottom;
        lune.dataset.v2e029Debord = dedans ? '0' : '1';
        if (!dedans) debordements.push(String(index + 1));
      });
    }
    layout.dataset.v2e029Debordements = String(debordements.length);
    const sortie = layout.querySelector('#v2e029-debord');
    if (sortie) {
      sortie.textContent = limites
        ? `Débordement du champ : ${debordements.length}/${lunes.length} lune${debordements.length > 1 ? 's' : ''} hors cadre réel`
          + (debordements.length ? ` (${debordements.join(', ')})` : ' · toutes dans le cadre') + '.'
        : 'Débordement : cadre du champ non mesurable dans ce contexte.';
    }
  });

  /* E029-07 — Appariement des arêtes lunaires avec les lunes mesurées. */
  sansEchec(() => {
    const aretes = layout.querySelector('.constellation-edges');
    const lignes = aretes && typeof aretes.querySelectorAll === 'function'
      ? Array.from(aretes.querySelectorAll('line.is-moon')) : [];
    const positions = lunes.map(positionDe)
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    const appariee = (ligne) => {
      const x2 = parseFloat(ligne.getAttribute('x2'));
      const y2 = parseFloat(ligne.getAttribute('y2'));
      if (!Number.isFinite(x2) || !Number.isFinite(y2)) return false;
      return positions.some((point) => Math.abs(point.x - x2) <= 0.05 && Math.abs(point.y - y2) <= 0.05);
    };
    const ok = lignes.filter(appariee).length;
    const orphelines = lignes.length - ok;
    layout.dataset.v2e029EdgesLune = String(lignes.length);
    layout.dataset.v2e029EdgesOrphelines = String(orphelines);
    const sortie = layout.querySelector('#v2e029-aretes');
    if (sortie) {
      sortie.textContent = `Arêtes lunaires : ${ok}/${lignes.length} appariées à une lune`
        + (orphelines ? ` · ${orphelines} sans correspondance` : ' · graphe synchronisé')
        + (lignes.length !== lunes.length ? ` · ${lignes.length} arêtes pour ${lunes.length} lunes` : '') + '.';
    }
  });

  /* E029-08 — Contrôle de la longueur des libellés et troncature garde-fou. */
  sansEchec(() => {
    const longs = [];
    let maximum = 0;
    lunes.forEach((lune, index) => {
      const longueur = libelleDe(lune).length;
      maximum = Math.max(maximum, longueur);
      lune.dataset.v2e029LibLongueur = String(longueur);
      const tropLong = longueur > SEUIL_LIBELLE;
      lune.dataset.v2e029LibLong = tropLong ? '1' : '0';
      if (tropLong) longs.push(`${index + 1} (${longueur})`);
    });
    layout.dataset.v2e029LibLongs = String(longs.length);
    layout.dataset.v2e029LibMax = String(maximum);
    const sortie = layout.querySelector('#v2e029-libelles');
    if (sortie) {
      sortie.textContent = `Libellés : ${longs.length}/${lunes.length} au-delà de ${SEUIL_LIBELLE} caractères`
        + (longs.length ? ` (${longs.join(', ')})` : ' · aucun débordement')
        + ` · longueur maximale ${maximum} caractères.`;
    }
  });

  /* E029-09 — Garde de périmètre : toutes les lunes dans leur couche dédiée. */
  sansEchec(() => {
    const couche = layout.querySelector('.const-layer-moons');
    const egares = [];
    lunes.forEach((lune, index) => {
      const dans = !!(couche && typeof couche.contains === 'function' && couche.contains(lune));
      lune.dataset.v2e029Perimetre = dans ? '1' : '0';
      if (!dans) egares.push(String(index + 1));
    });
    layout.dataset.v2e029HorsPerimetre = String(egares.length);
    const sortie = layout.querySelector('#v2e029-perimetre');
    if (sortie) {
      sortie.textContent = `Périmètre : ${lunes.length - egares.length}/${lunes.length} lunes dans la couche dédiée`
        + (egares.length ? ` · hors couche : ${egares.join(', ')}` : ' · aucune lune égarée') + '.';
    }
  });

  /* E029-10 — Empreinte de robustesse V2, relevé consolidé et mouvement réduit. */
  sansEchec(() => {
    const empreinte = empreinteDe(lunes);
    etat.rendus += 1;
    const modifie = etat.empreintePrecedente !== null && etat.empreintePrecedente !== empreinte;
    etat.empreintePrecedente = empreinte;
    layout.dataset.v2e029Empreinte = empreinte;
    layout.dataset.v2e029Rendus = String(etat.rendus);
    layout.dataset.v2e029Modifie = modifie ? '1' : '0';
    const reduit = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
    layout.dataset.v2e029Mouvement = reduit ? 'reduit' : 'normal';
    if (reduit) layout.classList.add('v2e029-reduit');
    else layout.classList.remove('v2e029-reduit');
    const panneaux = typeof document !== 'undefined'
      ? document.querySelectorAll('#' + PANEL_ID).length : 0;
    layout.dataset.v2e029Idempotence = String(panneaux);
    const releve = layout.querySelector('#v2e029-releve');
    if (releve) {
      releve.textContent = `Relevé consolidé : ${lunes.length} lunes · `
        + `${layout.dataset.v2e029CiblesPetites} cibles sous le seuil · `
        + `${layout.dataset.v2e029TabPositifs} tabindex positifs · `
        + `${layout.dataset.v2e029IdDoublons} identifiants doublonnés · `
        + `${layout.dataset.v2e029AriaIncoherents} états ARIA incohérents · `
        + `${layout.dataset.v2e029AngleSerre} secteur serré · `
        + `${layout.dataset.v2e029Debordements} débordements · `
        + `${layout.dataset.v2e029EdgesOrphelines} arêtes orphelines · `
        + `${layout.dataset.v2e029LibLongs} libellés longs · `
        + `${layout.dataset.v2e029HorsPerimetre} lunes hors périmètre · empreinte ${empreinte}.`;
    }
    const region = layout.querySelector('#' + LIVE_ID);
    if (region) {
      region.textContent = `Relevé de robustesse n° ${etat.rendus} · empreinte ${empreinte} · `
        + (modifie ? 'garde-fous modifiés depuis le relevé précédent'
          : etat.rendus === 1 ? 'premier relevé' : 'garde-fous inchangés')
        + ` · mouvement ${reduit ? 'réduit' : 'normal'} · panneaux ${panneaux} (attendu 1).`;
    }
  });
});
