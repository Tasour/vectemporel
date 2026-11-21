import { register } from './registry.js';

/* Lentille E084 — Structure sémantique appliquée au chemin de connexion de la
   vue Constellation. Le chemin est la chaîne ère → repère → point, matérialisée
   par les segments du SVG .constellation-edges et par les boutons porteurs de
   data-const-key / aria-current. Dix chantiers concrets et variés (E084-01 …
   E084-10). Une seule feuille de style, injectée par un appel unique à ctx.css
   en fin de fonction, un seul enregistrement, identifiants DOM préfixés e084-.
   Zéro journalisation, zéro
   réseau, zéro aléa, zéro minuteur, aucune boucle d'animation propre, aucune
   règle distante. Greffon tolérant : ctx.layout vérifié avant tout ajout au DOM,
   toute anomalie locale neutralisée sans exception. */

/* Lecture défensive d'un libellé : aria-label, data-label, title, texte visible,
   puis repli explicite. Aucune information n'est inventée. */
function libelle(noeud) {
  if (!noeud || typeof noeud.getAttribute !== 'function') return 'sans libellé';
  const aria = noeud.getAttribute('aria-label');
  if (aria && aria.trim()) return aria.trim();
  const donnees = noeud.dataset && noeud.dataset.label ? String(noeud.dataset.label).trim() : '';
  if (donnees) return donnees;
  const titre = noeud.getAttribute('title');
  if (titre && titre.trim()) return titre.trim();
  const texte = typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
  return texte || 'sans libellé';
}

/* Classification des segments du SVG en relations sémantiques lisibles. */
function segmentsDuChemin(layout) {
  if (!layout || typeof layout.querySelectorAll !== 'function') return [];
  return Array.from(layout.querySelectorAll('.constellation-edges line')).map((ligne) => {
    const classes = ligne && ligne.classList ? ligne.classList : null;
    const estLune = !!(classes && classes.contains('is-moon'));
    const estActif = !!(classes && classes.contains('is-path'));
    const nombre = (attribut) => {
      const brut = ligne && typeof ligne.getAttribute === 'function' ? ligne.getAttribute(attribut) : null;
      const valeur = Number.parseFloat(brut);
      return Number.isFinite(valeur) ? valeur : 0;
    };
    return {
      ligne,
      estLune,
      estActif,
      relation: estLune ? 'repère → point' : 'ère → repère',
      x1: nombre('x1'), y1: nombre('y1'), x2: nombre('x2'), y2: nombre('y2'),
    };
  });
}

/* Étapes actives de la chaîne, dans l'ordre ère, repère, point. */
function etapesActives(layout) {
  if (!layout || typeof layout.querySelector !== 'function') return [];
  const paires = [
    ['.const-sun[aria-current="true"]', 'ère'],
    ['.const-planet[aria-current="true"]', 'repère'],
    ['.const-moon[aria-current="true"]', 'point'],
  ];
  const resultat = [];
  paires.forEach(([selecteur, role]) => {
    let noeud = null;
    try { noeud = layout.querySelector(selecteur); } catch { noeud = null; }
    if (!noeud) return;
    const cle = noeud.dataset && noeud.dataset.constKey ? String(noeud.dataset.constKey) : '—';
    resultat.push({ noeud, role, cle, libelle: libelle(noeud) });
  });
  return resultat;
}

/* Longueur euclidienne dans le viewBox 0 0 100 100 : calcul déterministe. */
function mesurer(segments) {
  let total = 0;
  let plusLong = null;
  segments.forEach((seg) => {
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    seg.longueur = distance;
    total += distance;
    if (!plusLong || distance > plusLong.longueur) plusLong = seg;
  });
  return { total, moyenne: segments.length ? total / segments.length : 0, plusLong };
}

/* Empreinte déterministe de la chaîne courante, sans aucun aléa. */
function signature(segments, etapes) {
  const actifs = segments.filter((seg) => seg.estActif).length;
  const clefs = etapes.map((etape) => etape.cle).join('>') || 'vide';
  return `${segments.length}-${actifs}-${clefs}`;
}

/* Description narrative du chemin, écrite en français lisible. */
function composerDescription(segments, etapes, mesures) {
  if (!segments.length || !etapes.length) {
    return 'Aucun chemin de connexion à décrire dans cette constellation.';
  }
  const chaine = etapes.map((etape) => `${etape.role} « ${etape.libelle} »`).join(' → ');
  const actifs = segments.filter((seg) => seg.estActif).length;
  const relation = segments.some((seg) => seg.estLune) ? 'jusqu’au point vérifié' : 'jusqu’au repère';
  return `Chemin actif : ${chaine}. ${segments.length} segment${segments.length > 1 ? 's' : ''} relient ces étapes ${relation}, dont ${actifs} sur le tracé sélectionné ; longueur cumulée ${mesures.total.toFixed(1)} unités du repère.`;
}

/* Remplissage de la liste ordonnée qui structure la chaîne. */
function remplirListe(liste, etapes, el) {
  if (!liste || typeof liste.appendChild !== 'function') return;
  liste.textContent = '';
  if (!etapes.length) {
    liste.appendChild(el('li', 'e084-vide', 'Aucune étape active : le chemin est vide.'));
    return;
  }
  etapes.forEach((etape, index) => {
    const item = el('li', 'e084-etape');
    item.setAttribute('data-e084-role', etape.role);
    item.appendChild(el('span', 'e084-rang', String(index + 1).padStart(2, '0')));
    item.appendChild(el('span', 'e084-role', etape.role));
    item.appendChild(el('span', 'e084-cle', etape.cle));
    item.appendChild(el('span', 'e084-libelle', etape.libelle));
    liste.appendChild(item);
  });
}

register('E084', (ctx) => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.el !== 'function') return;
  const layout = ctx.layout;
  const el = ctx.el;
  const css = typeof ctx.css === 'function' ? ctx.css : null;

  try {
    if (typeof ctx.viewId === 'string' && ctx.viewId !== 'constellation') return;

    let reduit = false;
    try { reduit = !!(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion()); }
    catch { reduit = false; }

    /* E084-09 — Idempotence : retrait des nœuds e084-* d'un rendu antérieur
       avant toute création, puis empreinte déterministe du chemin courant. */
    Array.from(layout.querySelectorAll('[id^="e084-"]')).forEach((noeud) => {
      if (noeud && typeof noeud.remove === 'function') noeud.remove();
    });
    const segmentsInitiaux = segmentsDuChemin(layout);
    const etapesInitiales = etapesActives(layout);
    layout.dataset.e084Signature = signature(segmentsInitiaux, etapesInitiales);

    /* Lecture unique : une seule passe alimente tous les chantiers. */
    const segments = segmentsInitiaux;
    const etapes = etapesInitiales;
    const mesures = mesurer(segments);

    /* Conteneur du panneau sémantique, réutilisé par les chantiers suivants. */
    const panneau = el('section', 'e084-panel');
    panneau.id = 'e084-panel';
    panneau.setAttribute('aria-labelledby', 'e084-titre');

    /* E084-01 — Inventaire et classification du tracé : chaque ligne du SVG
       reçoit sa relation et son état sous forme d'attributs explicites. */
    segments.forEach((seg) => {
      if (!seg.ligne || typeof seg.ligne.setAttribute !== 'function') return;
      seg.ligne.setAttribute('data-e084-relation', seg.relation);
      seg.ligne.setAttribute('data-e084-etat', seg.estActif ? 'actif' : 'passif');
    });
    layout.dataset.e084Segments = String(segments.length);
    layout.dataset.e084Actifs = String(segments.filter((seg) => seg.estActif).length);
    layout.dataset.e084Lunes = String(segments.filter((seg) => seg.estLune).length);

    /* E084-02 — Chaîne active structurée en liste ordonnée ère → repère → point. */
    const liste = el('ol', 'e084-chaine');
    liste.id = 'e084-chaine';
    remplirListe(liste, etapes, el);
    panneau.appendChild(liste);

    /* E084-03 — Rôles sémantiques explicites sur les nœuds de la chaîne : le
       rôle est porté par un attribut, jamais déduit de la couleur seule. */
    etapes.forEach((etape) => {
      if (!etape.noeud || typeof etape.noeud.setAttribute !== 'function') return;
      etape.noeud.setAttribute('data-e084-role', etape.role);
      etape.noeud.setAttribute('data-e084-chaine', 'active');
      etape.noeud.setAttribute('data-e084-cle', etape.cle);
    });
    layout.dataset.e084Roles = etapes.map((etape) => etape.role).join('>') || 'aucun';

    /* E084-04 — Description narrative visible et vocalisée du chemin. */
    const description = el('p', 'e084-readout e084-description', composerDescription(segments, etapes, mesures));
    description.id = 'e084-description';
    description.setAttribute('role', 'status');
    description.setAttribute('aria-live', 'polite');
    description.setAttribute('aria-atomic', 'true');
    panneau.appendChild(description);

    /* E084-05 — Liaison sémantique au champ : la description est ajoutée à
       aria-describedby sans écraser les identifiants déjà présents. */
    const field = layout.querySelector('.constellation-field');
    if (field && typeof field.getAttribute === 'function' && typeof field.setAttribute === 'function') {
      const deja = field.getAttribute('aria-describedby') || '';
      if (!/(^|\s)e084-description(\s|$)/.test(deja)) {
        field.setAttribute('aria-describedby', `${deja} e084-description`.trim());
      }
    }

    /* E084-06 — Mesure déterministe de la géométrie du tracé : longueur
       cumulée, moyenne et segment le plus long, publiés en attributs. */
    const geometrie = el('p', 'e084-readout e084-geometrie');
    geometrie.id = 'e084-geometrie';
    geometrie.textContent = `Longueur du chemin : ${mesures.total.toFixed(2)} unités · moyenne ${mesures.moyenne.toFixed(2)} · segments ${segments.length}.`;
    panneau.appendChild(geometrie);
    layout.dataset.e084Longueur = mesures.total.toFixed(2);
    layout.dataset.e084Moyenne = mesures.moyenne.toFixed(2);
    if (mesures.plusLong && mesures.plusLong.ligne && typeof mesures.plusLong.ligne.setAttribute === 'function') {
      mesures.plusLong.ligne.setAttribute('data-e084-plus-long', 'oui');
    }

    /* E084-08 — État vide contrôlé : un tracé sans segment ni étape active
       reçoit un verdict explicite et un message de repli non ambigu. */
    const vide = !segments.length || !etapes.length;
    layout.dataset.e084Etat = vide ? 'vide' : 'complet';
    const verdict = el('p', 'e084-readout e084-verdict');
    verdict.id = 'e084-verdict';
    verdict.textContent = vide
      ? 'Verdict : chemin incomplet — aucune chaîne ère → repère → point exploitable.'
      : 'Verdict : chemin complet — ère, repère et point sont reliés.';
    panneau.appendChild(verdict);

    /* E084-07 — Mise à jour live de la chaîne lors d'un changement d'étape :
       un seul écouteur délégué sur le champ recalcule texte, liste et empreinte. */
    function actualiser() {
      if (!layout.isConnected) return;
      const segs = segmentsDuChemin(layout);
      const pas = etapesActives(layout);
      const mes = mesurer(segs);
      description.textContent = composerDescription(segs, pas, mes);
      remplirListe(liste, pas, el);
      geometrie.textContent = `Longueur du chemin : ${mes.total.toFixed(2)} unités · moyenne ${mes.moyenne.toFixed(2)} · segments ${segs.length}.`;
      layout.dataset.e084Signature = signature(segs, pas);
    }
    if (field && typeof field.addEventListener === 'function' && typeof field.contains === 'function') {
      field.addEventListener('click', (event) => {
        const cible = event && event.target && typeof event.target.closest === 'function'
          ? event.target.closest('[data-const-key]') : null;
        if (!cible || !field.contains(cible)) return;
        actualiser();
      });
    }

    /* E084-10 — Panneau structuré, feuille unique et mouvement réduit. */
    const titre = el('h3', 'e084-titre', 'Chemin de connexion — structure sémantique');
    titre.id = 'e084-titre';
    if (typeof panneau.insertBefore === 'function') panneau.insertBefore(titre, panneau.firstChild);
    layout.dataset.e084Motion = reduit ? 'reduced' : 'full';
    if (reduit && layout.classList) layout.classList.add('e084-still');
    const caption = layout.querySelector('.constellation-caption');
    if (caption && typeof caption.parentNode === 'object' && typeof layout.insertBefore === 'function') {
      layout.insertBefore(panneau, caption);
    } else if (typeof layout.appendChild === 'function') {
      layout.appendChild(panneau);
    }
    if (css) {
      css('constellation-e084', `
        .e084-panel { margin-top: 14px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 8px; background: rgba(255,255,255,.02); color: var(--ink-soft); font-size: 9px; line-height: 1.55; }
        .e084-titre { margin: 0 0 6px; font-family: var(--serif); font-size: 12px; font-weight: 500; color: var(--gold-bright); }
        .e084-chaine { margin: 0 0 8px; padding-left: 20px; list-style: decimal-leading-zero; }
        .e084-etape { display: grid; grid-template-columns: 3ch 9ch 10ch minmax(0, 1fr); gap: 2px 8px; padding: 2px 0; border-bottom: 1px dotted var(--line); }
        .e084-rang { color: var(--gold); font-variant-numeric: tabular-nums; }
        .e084-role { color: var(--violet); text-transform: uppercase; letter-spacing: .04em; }
        .e084-cle { color: var(--muted-2); font-family: var(--mono, monospace); }
        .e084-libelle { color: var(--ink); }
        .e084-vide { color: var(--muted); font-style: italic; }
        .e084-readout { margin: 0 0 5px; color: var(--muted); font-variant-numeric: tabular-nums; }
        .e084-verdict { color: var(--ink-soft); }
        .constellation-layout [data-e084-chaine="active"] { outline: 1px dashed var(--gold-bright); outline-offset: 2px; }
        .constellation-edges [data-e084-etat="actif"] { stroke-width: 1.6; }
        .e084-still .e084-panel, .e084-still .e084-panel * { transition: none !important; animation: none !important; }
        @media (prefers-reduced-motion: reduce) {
          .e084-panel, .e084-panel * { transition: none !important; animation: none !important; }
        }
        @media (max-width: 620px) {
          .e084-etape { grid-template-columns: 3ch minmax(0, 1fr); }
        }
      `);
    }
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
