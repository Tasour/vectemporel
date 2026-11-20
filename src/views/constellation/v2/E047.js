import { register } from './registry.js';

/* Lentille V2 E047 — diagnostic textuel avancé de la légende de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e047 (aucune collision avec la passe 1). */
register('E047', ctx => {
  /* Garde d'entrée : sans contexte ni layout courant, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Chaque chantier est isolé : une anomalie locale n'empêche pas les autres. */
  const safe = (fn) => { try { fn(); } catch { /* neutralisé sans bruit */ } };

  /* Lecture et normalisation déterministes, partagées par tous les chantiers. */
  const lire = (node) => node
    ? String(node.textContent || '').replace(/\s+/g, ' ').trim() : '';
  const normaliser = (value) => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  const creer = (tag, className, text) => typeof ctx.el === 'function'
    ? ctx.el(tag, className, text) : document.createElement(tag);

  /* Feuille unique de la lentille : texte masqué, numérotation ordinale,
     cible tactile et repli « mouvement réduit ». Aucune couleur n'est le
     seul vecteur d'information. */
  css('constellation-v2-e047', `
.v2e047-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e047-legende [data-v2e047-ordre]::after{content:attr(data-v2e047-ordre) ". ";font-variant-numeric:tabular-nums;color:var(--muted)}
.v2e047-dense{gap:4px 8px!important}
.v2e047-bascule{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:9px;cursor:pointer}
.v2e047-bascule:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px}
.v2e047-rapport[hidden]{display:none}
.v2e047-rapport{margin:6px 0 0;font-size:9px;line-height:1.55;color:var(--muted-2)}
.v2e047-calm .v2e047-bascule{transition:none}
@media (prefers-reduced-motion: reduce){.v2e047-bascule{transition:none}}
`);

  const legende = layout.querySelector('.constellation-legend');
  if (!legende) return;
  const caption = layout.querySelector('.constellation-caption');
  const champ = layout.querySelector('.constellation-field');
  const conteneur = caption || legende;

  /* Seuls les trois termes d'origine sont diagnostiqués : les pastilles des
     lentilles voisines et les nôtres sont exclues par leur classe. */
  const termes = Array.from(legende.children).filter((node) =>
    String(node.tagName).toLowerCase() === 'span'
    && /\b(?:legend-sun|legend-planet|legend-moon)\b/.test(node.className || ''));
  if (!termes.length) return;

  const calques = [
    layout.querySelector('.const-layer-suns'),
    layout.querySelector('.const-layer-planets'),
    layout.querySelector('.const-layer-moons'),
  ];
  const libelles = termes.map(lire);
  const normalises = libelles.map(normaliser);

  /* E047-01 — Numérotation ordinale visible des trois termes de la légende. */
  safe(() => {
    legende.classList.add('v2e047-legende');
    termes.forEach((terme, index) => {
      terme.dataset.v2e047Ordre = String(index + 1);
    });
    layout.dataset.v2e047Ordre = String(termes.length);
  });

  /* E047-02 — Détection des libellés dupliqués après normalisation accents
     et casse : un même mot répété est signalé sur chaque occurrence. */
  safe(() => {
    const vus = new Map();
    normalises.forEach((valeur) => {
      if (!vus.has(valeur)) vus.set(valeur, []);
      vus.get(valeur).push(valeur);
    });
    let doublons = 0;
    termes.forEach((terme, index) => {
      const repetition = (vus.get(normalises[index]) || []).length > 1;
      terme.dataset.v2e047Doublon = repetition ? '1' : '0';
      if (repetition) doublons += 1;
    });
    layout.dataset.v2e047Doublons = String(doublons);
  });

  /* E047-03 — Initiales distinctes : une collision d'initiale n'est pas un
     doublon, mais elle gêne la recherche mnémotechnique. */
  safe(() => {
    const initiales = normalises.map((valeur) => valeur.charAt(0));
    const comptes = new Map();
    initiales.forEach((lettre) => {
      if (lettre) comptes.set(lettre, (comptes.get(lettre) || 0) + 1);
    });
    let collisions = 0;
    termes.forEach((terme, index) => {
      const lettre = initiales[index];
      terme.dataset.v2e047Initiale = lettre || '—';
      const collision = lettre && comptes.get(lettre) > 1 ? '1' : '0';
      terme.dataset.v2e047InitialeCollision = collision;
      if (collision === '1') collisions += 1;
    });
    layout.dataset.v2e047Collisions = String(collisions);
  });

  /* E047-04 — Densité lexicale : mots, caractères et moyenne par libellé,
     consignés dans un attribut et dans un paragraphe visible du caption. */
  safe(() => {
    const mots = libelles.reduce((total, texte) =>
      total + (texte ? texte.split(' ').length : 0), 0);
    const caracteres = libelles.reduce((total, texte) => total + texte.length, 0);
    const moyenne = termes.length ? Math.round(caracteres / termes.length) : 0;
    layout.dataset.v2e047Densite = `${mots}:${caracteres}:${moyenne}`;
    legende.classList.toggle('v2e047-dense', moyenne > 18);
    if (!layout.querySelector('#v2e047-densite')) {
      const p = creer('p', 'v2e047-densite',
        `Densité de la légende : ${mots} mots, ${caracteres} caractères, `
        + `${moyenne} caractères par libellé en moyenne.`);
      p.id = 'v2e047-densite';
      conteneur.appendChild(p);
    }
  });

  /* E047-05 — Rattachement non destructif de la légende au champ : l'identifiant
     existant est ajouté à aria-describedby sans écraser la note de la vue. */
  safe(() => {
    if (!champ) return;
    if (!legende.id) legende.id = 'v2e047-legende';
    const decrits = (champ.getAttribute('aria-describedby') || '')
      .split(/\s+/).filter(Boolean);
    if (decrits.indexOf(legende.id) === -1) {
      decrits.push(legende.id);
      champ.setAttribute('aria-describedby', decrits.join(' '));
    }
    champ.dataset.v2e047Legende = 'liee';
  });

  /* E047-06 — Inventaire réel des objets rendus dans chaque calque, confronté
     au libellé correspondant de la légende. */
  safe(() => {
    const singuliers = ['ère', 'repère', 'point'];
    const occurrences = calques.map((calque) =>
      calque ? calque.querySelectorAll('button').length : 0);
    termes.forEach((terme, index) => {
      terme.dataset.v2e047Occurrences = String(occurrences[index] || 0);
    });
    layout.dataset.v2e047Inventaire = occurrences.join(':');
    if (!layout.querySelector('#v2e047-inventaire')) {
      const detail = occurrences.map((nombre, index) =>
        `${nombre} ${singuliers[index] || 'objet'}${nombre > 1 ? 's' : ''}`).join(' · ');
      const p = creer('p', 'v2e047-inventaire', `Inventaire du rendu : ${detail}.`);
      p.id = 'v2e047-inventaire';
      conteneur.appendChild(p);
    }
  });

  /* E047-07 — Affinité sémantique entre un libellé et le nom accessible du
     calque : proportion de jetons communs, racine grossière au pluriel. */
  safe(() => {
    const jetons = (texte) => normaliser(texte).split(' ')
      .filter(Boolean).map((mot) => (mot.length > 3 && mot.slice(-1) === 's'
        ? mot.slice(0, -1) : mot));
    termes.forEach((terme, index) => {
      const source = jetons(libelles[index]);
      const calque = calques[index];
      const cible = calque ? jetons(calque.getAttribute('aria-label') || '') : [];
      const communs = source.filter((mot) => cible.indexOf(mot) !== -1).length;
      const score = source.length ? communs / source.length : 0;
      terme.dataset.v2e047Affinite = String(Math.round(score * 100));
    });
  });

  /* E047-08 — Liste ordonnée masquée : l'ordre de lecture canonique est un
     vrai texte pour les technologies d'assistance, sans modifier l'affichage. */
  safe(() => {
    let liste = layout.querySelector('#v2e047-liste');
    if (!liste) {
      liste = creer('ol', 'v2e047-sr');
      liste.id = 'v2e047-liste';
      liste.setAttribute('aria-label', 'Ordre de lecture de la légende');
      libelles.forEach((libelle, index) => {
        const item = creer('li', '', `${index + 1}. ${libelle || 'Libellé indisponible'}`);
        item.setAttribute('aria-posinset', String(index + 1));
        item.setAttribute('aria-setsize', String(termes.length));
        liste.appendChild(item);
      });
      layout.appendChild(liste);
    }
    if (champ) {
      const decrits = (champ.getAttribute('aria-describedby') || '')
        .split(/\s+/).filter(Boolean);
      if (decrits.indexOf(liste.id) === -1) {
        decrits.push(liste.id);
        champ.setAttribute('aria-describedby', decrits.join(' '));
      }
    }
  });

  /* E047-09 — Bascale « diagnostic détaillé » : bouton indépendant à
     aria-pressed, cible d'au moins 36 px, focus visible, sans minuteur. */
  safe(() => {
    if (layout.querySelector('#v2e047-bascule')) return;
    const bouton = creer('button', 'v2e047-bascule', 'Afficher le diagnostic détaillé');
    bouton.id = 'v2e047-bascule';
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-controls', 'v2e047-rapport');
    bouton.addEventListener('click', () => {
      const rapport = layout.querySelector('#v2e047-rapport');
      const ouvert = bouton.getAttribute('aria-pressed') !== 'true';
      bouton.setAttribute('aria-pressed', ouvert ? 'true' : 'false');
      bouton.textContent = ouvert
        ? 'Masquer le diagnostic détaillé' : 'Afficher le diagnostic détaillé';
      if (rapport) rapport.hidden = !ouvert;
      layout.dataset.v2e047Ouvert = ouvert ? '1' : '0';
      const annonce = layout.querySelector('#v2e047-annonce');
      if (annonce) annonce.textContent = ouvert
        ? 'Diagnostic détaillé affiché.' : 'Diagnostic détaillé masqué.';
    });
    conteneur.appendChild(bouton);
  });

  /* E047-10 — Panneau de rapport détaillé, annonce live et repli « mouvement
     réduit » : la synthèse agrège les mesures des chantiers précédents. */
  safe(() => {
    if (!layout.querySelector('#v2e047-rapport')) {
      const rapport = creer('div', 'v2e047-rapport');
      rapport.id = 'v2e047-rapport';
      rapport.hidden = true;
      rapport.setAttribute('aria-label', 'Diagnostic détaillé de la légende');
      const lignes = termes.map((terme, index) => {
        const nature = terme.dataset.v2e047Doublon === '1'
          ? 'libellé dupliqué' : 'libellé unique';
        return `${index + 1}. ${libelles[index] || '—'} — initiale `
          + `${terme.dataset.v2e047Initiale || '—'}, `
          + `${terme.dataset.v2e047Occurrences || '0'} objet(s), affinité `
          + `${terme.dataset.v2e047Affinite || '0'} %, ${nature}.`;
      });
      const resume = `Densité ${layout.dataset.v2e047Densite || '—'} ; `
        + `doublons ${layout.dataset.v2e047Doublons || '0'} ; `
        + `collisions d’initiales ${layout.dataset.v2e047Collisions || '0'}.`;
      rapport.appendChild(creer('p', '', `${lignes.join(' ')} ${resume}`));
      conteneur.appendChild(rapport);
    }
    if (!layout.querySelector('#v2e047-annonce')) {
      const annonce = creer('p', 'v2e047-sr', '');
      annonce.id = 'v2e047-annonce';
      annonce.setAttribute('role', 'status');
      annonce.setAttribute('aria-live', 'polite');
      annonce.setAttribute('aria-atomic', 'true');
      layout.appendChild(annonce);
    }
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    legende.classList.toggle('v2e047-calm', !!reduit);
    layout.dataset.v2e047Motion = reduit ? 'reduced' : 'full';
  });
});
