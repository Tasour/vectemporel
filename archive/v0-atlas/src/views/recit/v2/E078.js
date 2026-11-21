import { register } from './registry.js';

/* V2 lentille E078 — Performance et sobriété (passe 2, vue Récit).
   Dix chantiers V2 neufs et distincts de ceux de la passe 1 (décodage asynchrone,
   content-visibility du fil et des annexes, contain:layout/style, empreinte DOM,
   mode sobre, mouvement réduit, cache borné, alerte de densité, bilan). Ici :
   confinement du défilement, illustration sans débordement, six lectures chiffrées
   dérivées du DOM réel (coût du fil, certitudes, types, filtres actifs, volume de
   texte, rétention), mouvement réduit V2 et bilan replié.
   Tous non destructifs : sans ce module, la vue reste intégralement lisible.
   Préfixes : classes recit-v2-e078-, ids DOM v2-e078- (jamais e078- de la passe 1).
   Zéro réseau, zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E078-01 — Confinement du défilement du corps. */
.recit-layout .recit-v2-e078-scroll{overscroll-behavior:contain}

/* E078-02 — Illustration sans débordement ni distorsion. */
.recit-v2-e078-media{overflow:hidden}
.recit-v2-e078-media img{display:block;max-width:100%;height:auto}

/* E078-03 / 04 / 05 / 06 / 07 / 09 — lectures chiffrées dérivées du DOM. */
.recit-v2-e078-readout{margin:4px 0 0;color:var(--muted-2);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E078-08 — Mouvement réduit V2 : aucune transition superflue. */
.recit-v2-e078-readout{transition:opacity .18s linear}
.recit-layout[data-v2-e078-motion="reduce"] .recit-v2-e078-readout,
.recit-layout.recit-v2-e078-sans-mouvement .recit-v2-e078-readout{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-v2-e078-readout{transition:none;animation:none}
}

/* E078-10 — Bilan de sobriété V2, replié par défaut. */
.recit-v2-e078-bilan{margin-top:8px;color:var(--muted-2);font-size:9px}
.recit-v2-e078-bilan summary{min-height:26px;display:flex;align-items:center;cursor:pointer}
.recit-v2-e078-bilan p{margin:4px 0;line-height:1.6}
.recit-v2-e078-bilan summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
`;

register('E078', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout
      || typeof layout.querySelector !== 'function' || typeof el !== 'function') return;

    /* Une seule feuille, injectée une seule fois par cssOnce. */
    if (typeof css === 'function') {
      try { css('recit-v2-e078', CSS); } catch (_) { /* rendu préservé */ }
    }

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const legende = corps.querySelector('.recit-legend');
    const fil = document.getElementById('c3a-thread');
    const search = document.getElementById('c3a-search');
    const media = layout.querySelector('.recit-media');

    const ajouteClasse = (noeud, nom) => {
      if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
        && !noeud.classList.contains(nom)) noeud.classList.add(nom);
    };
    const pose = (noeud, nom, valeur) => {
      if (noeud && typeof noeud.setAttribute === 'function') noeud.setAttribute(nom, valeur);
    };
    /* Dépose ou réutilise un paragraphe visible, sans doublon ni écrasement. */
    const place = (id, texte) => {
      if (!legende) return;
      let noeud = document.getElementById(id);
      if (!noeud) { noeud = el('p', 'recit-v2-e078-readout'); noeud.id = id; }
      noeud.textContent = texte;
      if (noeud.parentNode !== legende) legende.appendChild(noeud);
    };

    const items = fil ? Array.from(fil.querySelectorAll('.c3a-thread-item')) : [];

    /* --- E078-01 : confinement du défilement du corps. ------------------- */
    ajouteClasse(corps, 'recit-v2-e078-scroll');
    pose(corps, 'data-v2-e078-scroll', 'contain');

    /* --- E078-02 : illustration sans débordement. ------------------------ */
    if (media && media.querySelector('img')) {
      ajouteClasse(media, 'recit-v2-e078-media');
      pose(media, 'data-v2-e078-image', 'fit');
    }

    /* --- E078-03 : coût structurel du fil (nœuds par point). ------------- */
    if (fil && items.length) {
      const noeuds = fil.querySelectorAll('*').length;
      const ratio = Math.round(noeuds / items.length);
      place('v2-e078-coutfil',
        `Coût du fil : ${items.length} point(s) · ${noeuds} nœuds DOM · ≈ ${ratio} nœud(s) par point.`);
    }

    /* --- E078-04 : répartition des certitudes du fil affiché. ------------ */
    if (items.length) {
      const cert = { 'vérifié': 0, 'certain': 0, 'probable': 0, 'disputed': 0 };
      items.forEach((n) => {
        const v = n && typeof n.getAttribute === 'function' ? n.getAttribute('data-confidence') : null;
        if (v && Object.prototype.hasOwnProperty.call(cert, v)) cert[v] += 1;
      });
      place('v2-e078-cert',
        `Certitudes du fil : vérifié ${cert['vérifié']} · certain ${cert['certain']} · probable ${cert['probable']} · contesté ${cert['disputed']}.`);
    }

    /* --- E078-05 : répartition des types du fil affiché. ----------------- */
    if (items.length) {
      const types = { 'récit': 0, 'figure': 0, 'lieu': 0, 'audit': 0 };
      items.forEach((n) => {
        const v = n && typeof n.getAttribute === 'function' ? n.getAttribute('data-kind') : null;
        if (v && Object.prototype.hasOwnProperty.call(types, v)) types[v] += 1;
      });
      place('v2-e078-types',
        `Types du fil : récit ${types['récit']} · figure ${types['figure']} · lieu ${types['lieu']} · audit ${types['audit']}.`);
    }

    /* --- E078-06 : compte des filtres C3 actifs. ------------------------- */
    const boutons = Array.from(corps.querySelectorAll('.c3a-filter'));
    if (boutons.length) {
      const actifs = boutons.filter((b) => {
        const fk = typeof b.getAttribute === 'function' ? (b.getAttribute('data-fk') || '') : '';
        return b.getAttribute('aria-pressed') === 'true' && !/-all$/.test(fk);
      }).length;
      place('v2-e078-filtres',
        `Filtres C3 actifs : ${actifs} sur ${boutons.length} bouton(s) de filtre.`);
    }

    /* --- E078-07 : volume de texte du fil. ------------------------------- */
    if (items.length) {
      const caracteres = items.reduce((sum, n) => sum + String(n.textContent || '').length, 0);
      place('v2-e078-volume',
        `Volume de texte affiché dans le fil : ${caracteres} caractère(s).`);
    }

    /* --- E078-08 : respect du mouvement réduit (V2). --------------------- */
    let reduit = false;
    if (typeof reducedMotion === 'function') {
      try { reduit = Boolean(reducedMotion()); } catch (_) { reduit = false; }
    }
    pose(layout, 'data-v2-e078-motion', reduit ? 'reduce' : 'normal');
    if (reduit) ajouteClasse(layout, 'recit-v2-e078-sans-mouvement');

    /* --- E078-09 : rétention du fil (taux d'affichage). ------------------- */
    const libelle = search && typeof search.getAttribute === 'function'
      ? (search.getAttribute('aria-label') || '') : '';
    const trouv = libelle.match(/parmi les (\d+) points/);
    const total = trouv ? parseInt(trouv[1], 10) : 0;
    if (total > 0 && items.length) {
      const pct = Math.round((items.length / total) * 100);
      place('v2-e078-retention',
        `Rétention du fil : ${items.length} point(s) affiché(s) sur ${total} du repère (${pct} %).`);
    }

    /* --- E078-10 : bilan de sobriété V2, replié par défaut. -------------- */
    if (legende && !document.getElementById('v2-e078-bilan')) {
      const details = el('details', 'recit-v2-e078-bilan');
      details.id = 'v2-e078-bilan';
      details.appendChild(el('summary', '', 'Sobriété — passe 2 : mesures et confinement'));
      details.appendChild(el('p', '',
        'Cette passe 2 n’ajoute aucune ressource distante : ni requête réseau, ni police, ni image supplémentaire. '
        + 'Elle ne modifie aucun texte du récit et n’écrase aucun attribut existant.'));
      details.appendChild(el('p', '',
        'Elle confine le défilement du corps et l’illustration, puis affiche six lectures chiffrées dérivées du DOM réel : '
        + 'coût du fil, certitudes, types, filtres actifs, volume de texte et rétention. Le mouvement réduit est respecté.'));
      legende.appendChild(details);
    }
  } catch (_) {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
