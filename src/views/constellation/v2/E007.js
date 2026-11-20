import { register } from './registry.js';

/* Lentille V2 E007 — diagnostic textuel avancé des soleils (ères) de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau, sans source aléatoire et sans minuteur ni boucle d'animation propre.
   Préfixe exclusif : v2e007 (aucune collision avec les identifiants de la passe 1).
   Le module est passif : il lit le DOM déjà construit par constellation.js et
   en dérive un diagnostic textuel indexable, sans réécrire le rendu. */

const CSS_ID = 'constellation-v2-e007';
const PANEL_ID = 'v2e007-panel';
const LIVE_ID = 'v2e007-live';

/* Références déterministes, explicites et vérifiables. */
const SEUIL_CONTRASTE = 4.5; // WCAG 1.4.3 : ratio minimal pour un texte courant
const TEXTE_REFERENCE = '#f4d69e'; // or clair utilisé par la vue pour les libellés actifs

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = { empreintePrecedente: null, rendus: 0 };

/* Greffon tolérant : un chantier défaillant n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journalisation */ }
}

function soleilsDu(layout) {
  return Array.from(layout.querySelectorAll('.const-sun'));
}

function texteDe(soleil) {
  return (soleil.dataset.label || soleil.title || soleil.getAttribute('aria-label') || '').trim();
}

function decimale(valeur) {
  return Number.isFinite(valeur) ? valeur.toFixed(2).replace('.', ',') : '—';
}

/* Coordonnées lues depuis les variables CSS en pourcentage écrites par la vue. */
function positionDe(soleil) {
  const x = parseFloat(soleil.style.getPropertyValue('--x'));
  const y = parseFloat(soleil.style.getPropertyValue('--y'));
  return { x, y };
}

/* Angle polaire d'un soleil autour du centre (50 %, 50 %) de la constellation. */
function angleDe(soleil) {
  const point = positionDe(soleil);
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return NaN;
  return (Math.atan2(point.y - 50, point.x - 50) * 180 / Math.PI + 360) % 360;
}

/* Lecture d'un millésime tel que formatYear() l'écrit dans constellation.js. */
function formaterAnnee(annee) {
  if (!Number.isFinite(annee)) return '—';
  return annee < 0 ? `${Math.abs(annee)} av. J.-C.` : String(annee);
}

function parseAnnee(token) {
  const net = String(token || '').trim();
  const avant = /^(\d+)\s+av\.\s*J\.-C\.$/i.exec(net);
  if (avant) return -Number(avant[1]);
  if (/^-?\d+$/.test(net)) return Number(net);
  return NaN;
}

/* Extrait « début – fin » de data-label, sans jamais inventer de millésime.
   Le tiret separator est le tiret cadratin ou demi-cadratin, jamais l'hyphen
   present dans « J.-C. ». */
function bornesDe(soleil) {
  const morceaux = texteDe(soleil).split('·');
  const plage = (morceaux.length > 1 ? morceaux[morceaux.length - 1] : '').trim();
  const bornes = plage.split(/[\u2013\u2014]/).map(parseAnnee);
  if (bornes.length === 2 && bornes.every(Number.isFinite)) {
    return { debut: bornes[0], fin: bornes[1] };
  }
  return null;
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

/* Ratio de contraste WCAG entre la couleur d'ère et le texte de reference. */
function contrasteDe(couleurEra) {
  const lumEra = luminanceDe(couleurEra);
  const lumTexte = luminanceDe(TEXTE_REFERENCE);
  if (lumEra === null || lumTexte === null) return null;
  const clair = Math.max(lumEra, lumTexte);
  const sombre = Math.min(lumEra, lumTexte);
  return (clair + 0.05) / (sombre + 0.05);
}

/* Empreinte FNV-1a deterministe du couple cle/libelle/position des soleils. */
function empreinteDe(soleils) {
  const chaine = soleils.map((soleil, index) => [
    index, soleil.dataset.constKey || '', texteDe(soleil),
    soleil.style.getPropertyValue('--x'), soleil.style.getPropertyValue('--y'),
  ].join(':')).join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < chaine.length; i += 1) {
    h ^= chaine.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/* Panneau unique, cree une seule fois, avec un vrai tableau indexable. */
function panneauDans(layout, el) {
  const existant = layout.querySelector('#' + PANEL_ID);
  if (existant) return existant;

  const panneau = el('section', 'v2e007-panel');
  panneau.id = PANEL_ID;
  panneau.setAttribute('aria-labelledby', 'v2e007-titre');

  const titre = el('h2', 'v2e007-titre', 'Diagnostic textuel avancé des soleils');
  titre.id = 'v2e007-titre';
  panneau.appendChild(titre);

  const table = el('table', 'v2e007-table');
  table.id = 'v2e007-table';
  table.appendChild(el('caption', '', 'Inventaire des ères représentées par les soleils'));
  const tete = el('thead');
  const ligneTete = el('tr');
  ['Rang', 'Clé', 'Libellé', 'Position'].forEach((intitule) => {
    const cellule = el('th', '', intitule);
    cellule.setAttribute('scope', 'col');
    ligneTete.appendChild(cellule);
  });
  tete.appendChild(ligneTete);
  table.appendChild(tete);
  const corps = el('tbody');
  corps.id = 'v2e007-corps';
  table.appendChild(corps);
  panneau.appendChild(table);

  ['v2e007-chrones', 'v2e007-gaps', 'v2e007-meta', 'v2e007-ordre',
   'v2e007-repartition', 'v2e007-unicite', 'v2e007-accessible',
   'v2e007-contraste'].forEach((identifiant) => {
    const ligne = el('p', 'v2e007-ligne', '');
    ligne.id = identifiant;
    panneau.appendChild(ligne);
  });

  const live = el('p', 'v2e007-ligne v2e007-live', '');
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
      .constellation-layout[data-v2e007="on"] #${PANEL_ID} {
        margin: 12px 0 4px; padding: 8px 10px;
        border: 1px solid var(--line); border-radius: 8px;
        background: rgba(255,255,255,.02); color: var(--ink-soft);
        font-family: var(--sans, inherit);
      }
      #v2e007-titre {
        margin: 0 0 5px; font-size: 10px; font-weight: 600;
        letter-spacing: .1em; text-transform: uppercase; color: var(--gold);
      }
      #v2e007-panel .v2e007-ligne {
        margin: 3px 0; font-size: 9px; line-height: 1.45;
        color: var(--muted-2); font-variant-numeric: tabular-nums;
      }
      #v2e007-table { border-collapse: collapse; width: 100%; margin: 4px 0; font-size: 9px; }
      #v2e007-table caption { text-align: left; margin-bottom: 2px; color: var(--gold); font-size: 9px; }
      #v2e007-table th, #v2e007-table td {
        border: 1px solid var(--line); padding: 2px 4px; text-align: left;
        line-height: 1.35; color: var(--muted-2);
      }
      #v2e007-table th { font-weight: 600; color: var(--gold-bright); }
      #v2e007-live { color: var(--gold-bright); }
      .constellation-layout.v2e007-reduit #${PANEL_ID} * {
        transition: none !important; animation: none !important;
      }
      @media (max-width: 620px) {
        #v2e007-titre { font-size: 9px; }
        #v2e007-panel .v2e007-ligne, #v2e007-table { font-size: 8px; }
      }
      @media (prefers-reduced-motion: reduce) {
        #${PANEL_ID} * { transition: none !important; animation: none !important; }
      }
    `);

    panneauDans(layout, el); // idempotent : un seul panneau, même après re-rendus
    layout.dataset.v2e007 = 'on';

    /* V2E007-01 — Tableau semantique des soleils, remplace la simple liste. */
    sansEchec(() => {
      const corps = layout.querySelector('#v2e007-corps');
      if (!corps) return;
      while (corps.firstChild) corps.removeChild(corps.firstChild);
      soleils.forEach((soleil, index) => {
        const point = positionDe(soleil);
        const position = Number.isFinite(point.x) && Number.isFinite(point.y)
          ? `${decimale(point.x)} ; ${decimale(point.y)}` : '—';
        const valeurs = [String(index + 1), soleil.dataset.constKey || '—',
          texteDe(soleil) || '—', position];
        const ligne = el('tr', '');
        ligne.dataset.v2e007Rang = String(index + 1);
        valeurs.forEach((valeur) => ligne.appendChild(el('td', '', valeur)));
        corps.appendChild(ligne);
      });
      layout.dataset.v2e007Lignes = String(corps.children.length);
    });

    /* V2E007-02 — Bornes et durées des ères lues dans data-label. */
    sansEchec(() => {
      const bornes = soleils.map(bornesDe);
      const invalides = [];
      const durees = [];
      bornes.forEach((plage, index) => {
        if (!plage) { invalides.push(String(index + 1)); return; }
        const duree = plage.fin - plage.debut;
        soleils[index].dataset.v2e007Duree = String(duree);
        durees.push(`${formaterAnnee(plage.debut)}→${formaterAnnee(plage.fin)} : ${duree} an${Math.abs(duree) > 1 ? 's' : ''}`);
      });
      const valides = bornes.length - invalides.length;
      layout.dataset.v2e007Bornes = `${valides}/${soleils.length}`;
      const sortie = layout.querySelector('#v2e007-chrones');
      if (sortie) {
        sortie.textContent = `Bornes chronologiques : ${valides}/${soleils.length} plages lisibles`
          + (durees.length ? ` · ${durees.join(' · ')}` : '')
          + (invalides.length ? ` · plage absente : ère${invalides.length > 1 ? 's' : ''} ${invalides.join(', ')}` : '') + '.';
      }
    });

    /* V2E007-03 — Trouées et chevauchements entre ères consécutives. */
    sansEchec(() => {
      const bornes = soleils.map(bornesDe);
      const constats = [];
      let trouees = 0;
      let chevauchements = 0;
      for (let i = 0; i + 1 < bornes.length; i += 1) {
        if (!bornes[i] || !bornes[i + 1]) continue;
        const ecart = bornes[i + 1].debut - bornes[i].fin;
        if (ecart > 0) {
          trouees += 1;
          constats.push(`trouée de ${ecart} an${ecart > 1 ? 's' : ''} après l'ère ${i + 1}`);
        } else if (ecart < 0) {
          chevauchements += 1;
          constats.push(`chevauchement de ${-ecart} an${-ecart > 1 ? 's' : ''} entre les ères ${i + 1} et ${i + 2}`);
        } else {
          constats.push(`continuité entre les ères ${i + 1} et ${i + 2}`);
        }
      }
      layout.dataset.v2e007Trouees = String(trouees);
      layout.dataset.v2e007Chevauchements = String(chevauchements);
      const sortie = layout.querySelector('#v2e007-gaps');
      if (sortie) {
        sortie.textContent = constats.length
          ? `Continuité du temps : ${constats.join(' · ')}.`
          : 'Continuité du temps : plages insuffisantes pour comparer deux ères.';
      }
    });

    /* V2E007-04 — Exhaustivité des métadonnées de position et de couleur. */
    sansEchec(() => {
      let positions = 0;
      let couleurs = 0;
      const incomplets = [];
      soleils.forEach((soleil, index) => {
        const point = positionDe(soleil);
        const era = soleil.style.getPropertyValue('--era').trim();
        if (Number.isFinite(point.x) && Number.isFinite(point.y)) positions += 1;
        if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(era)) couleurs += 1;
        if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || !era) incomplets.push(String(index + 1));
      });
      layout.dataset.v2e007Positions = `${positions}/${soleils.length}`;
      layout.dataset.v2e007Couleurs = `${couleurs}/${soleils.length}`;
      const sortie = layout.querySelector('#v2e007-meta');
      if (sortie) {
        sortie.textContent = `Métadonnées : ${positions}/${soleils.length} positions valides, ${couleurs}/${soleils.length} couleurs d'ère valides`
          + (incomplets.length ? ` · soleils incomplets : ${incomplets.join(', ')}` : ' · jeu complet') + '.';
      }
    });

    /* V2E007-05 — Ordre visuel (angle croissant) contre ordre du DOM. */
    sansEchec(() => {
      const visuel = soleils.map((soleil, index) => ({ index, angle: angleDe(soleil) }))
        .filter((entree) => Number.isFinite(entree.angle))
        .sort((a, b) => a.angle - b.angle);
      const desaccords = visuel.filter((entree, rang) => entree.index !== rang).length;
      const sequence = visuel.map((entree) => entree.index + 1).join(', ');
      layout.dataset.v2e007Desaccords = String(desaccords);
      const sortie = layout.querySelector('#v2e007-ordre');
      if (sortie) {
        sortie.textContent = visuel.length
          ? `Ordre visuel (angle croissant) : ${sequence || '—'} · rangs décalés par rapport au DOM : ${desaccords}.`
          : 'Ordre visuel : angles indisponibles, comparaison impossible.';
      }
    });

    /* V2E007-06 — Régularité de la répartition circulaire des soleils. */
    sansEchec(() => {
      const angles = soleils.map(angleDe).filter(Number.isFinite).sort((a, b) => a - b);
      const total = angles.length;
      const sortie = layout.querySelector('#v2e007-repartition');
      if (total < 2 || !sortie) {
        if (sortie) sortie.textContent = 'Répartition circulaire : moins de deux soleils exploitables.';
        return;
      }
      const pasTheorique = 360 / total;
      let minimum = Infinity;
      let maximum = 0;
      for (let i = 0; i < total; i += 1) {
        const ecart = (angles[(i + 1) % total] - angles[i] + 360) % 360;
        if (ecart < minimum) minimum = ecart;
        if (ecart > maximum) maximum = ecart;
      }
      const irrégularité = maximum - minimum;
      layout.dataset.v2e007Pas = decimale(pasTheorique);
      layout.dataset.v2e007Irregularite = decimale(irrégularité);
      sortie.textContent = `Répartition circulaire : pas théorique ${decimale(pasTheorique)}° · écarts observés ${decimale(minimum)}° à ${decimale(maximum)}° · irrégularité ${decimale(irrégularité)}°.`;
    });

    /* V2E007-07 — Unicité des clés et des libellés de soleils. */
    sansEchec(() => {
      const clefs = soleils.map((soleil) => (soleil.dataset.constKey || '').trim()).filter(Boolean);
      const libelles = soleils.map(texteDe).filter(Boolean);
      const doublons = (liste) => liste.filter((valeur, index) => liste.indexOf(valeur) !== index);
      const clefsDup = doublons(clefs);
      const libellesDup = doublons(libelles);
      layout.dataset.v2e007ClesDupliquees = String(clefsDup.length);
      layout.dataset.v2e007LibellesDupliques = String(libellesDup.length);
      const sortie = layout.querySelector('#v2e007-unicite');
      if (sortie) {
        sortie.textContent = `Unicité : ${clefs.length} clés et ${libelles.length} libellés non vides`
          + ` · clés répétées : ${clefsDup.length}${clefsDup.length ? ` (${clefsDup.join(', ')})` : ''}`
          + ` · libellés répétés : ${libellesDup.length}${libellesDup.length ? ` (${libellesDup.join(' / ')})` : ''}.`;
      }
    });

    /* V2E007-08 — Cohérence du libellé accessible avec l'état actif. */
    sansEchec(() => {
      const incoherents = [];
      let decrits = 0;
      soleils.forEach((soleil, index) => {
        const accessible = (soleil.getAttribute('aria-label') || '').trim();
        const actif = soleil.classList.contains('is-active');
        const annonceActif = accessible.indexOf('ère sélectionnée') !== -1;
        if (accessible) decrits += 1;
        if (!accessible || annonceActif !== actif) incoherents.push(String(index + 1));
      });
      layout.dataset.v2e007AriaIncoherents = String(incoherents.length);
      const sortie = layout.querySelector('#v2e007-accessible');
      if (sortie) {
        sortie.textContent = `Libellés accessibles : ${decrits}/${soleils.length} présents`
          + (incoherents.length
            ? ` · mention « ère sélectionnée » incohérente avec is-active : ère${incoherents.length > 1 ? 's' : ''} ${incoherents.join(', ')}`
            : " · mention d'activation cohérente avec l'ère active") + '.';
      }
    });

    /* V2E007-09 — Ratio de contraste WCAG de l'or clair sur chaque ère. */
    sansEchec(() => {
      const ratios = [];
      const faibles = [];
      soleils.forEach((soleil, index) => {
        const ratio = contrasteDe(soleil.style.getPropertyValue('--era'));
        if (ratio === null) return;
        soleil.dataset.v2e007Contraste = decimale(ratio);
        ratios.push(ratio);
        if (ratio < SEUIL_CONTRASTE) faibles.push(`ère ${index + 1} (${decimale(ratio)}:1)`);
      });
      const minimum = ratios.length ? Math.min.apply(null, ratios) : NaN;
      layout.dataset.v2e007ContrasteMin = Number.isFinite(minimum) ? decimale(minimum) : 'indetermine';
      const sortie = layout.querySelector('#v2e007-contraste');
      if (sortie) {
        sortie.textContent = ratios.length
          ? `Contraste de l'or clair sur les couleurs d'ère : minimum ${decimale(minimum)}:1, seuil ${decimale(SEUIL_CONTRASTE)}:1`
            + (faibles.length ? ` · sous le seuil : ${faibles.join(', ')}` : ' · toutes les ères au-dessus du seuil') + '.'
          : "Contraste : couleurs d'ère non calculables.";
      }
    });

    /* V2E007-10 — Empreinte déterministe, suivi de changement et mode sobre. */
    sansEchec(() => {
      const empreinte = empreinteDe(soleils);
      etat.rendus += 1;
      const modifie = etat.empreintePrecedente !== null && etat.empreintePrecedente !== empreinte;
      etat.empreintePrecedente = empreinte;
      layout.dataset.v2e007Empreinte = empreinte;
      layout.dataset.v2e007Rendus = String(etat.rendus);
      const reduit = typeof ctx.reducedMotion === 'function' ? ctx.reducedMotion() : false;
      layout.dataset.v2e007Mouvement = reduit ? 'reduit' : 'normal';
      if (reduit) layout.classList.add('v2e007-reduit');
      else layout.classList.remove('v2e007-reduit');
      const region = layout.querySelector('#' + LIVE_ID);
      if (region) {
        region.textContent = `Diagnostic n° ${etat.rendus} · empreinte ${empreinte} · `
          + (modifie ? 'soleils modifiés depuis le rendu précédent'
            : etat.rendus === 1 ? 'premier diagnostic' : 'soleils inchangés')
          + ` · mouvement ${reduit ? 'réduit' : 'normal'}.`;
      }
    });
  } catch { /* greffon tolérant : aucune exception ne remonte au registre */ }
});
