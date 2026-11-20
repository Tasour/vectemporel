import { register } from './registry.js';

/* Lentille V2 E082 — métrologie et optimisations complémentaires du chemin
   de connexion de la vue Constellation. Seconde passe : dix chantiers
   inédits, tous implémentés, sous le préfixe exclusif v2e082 (aucune
   collision avec la passe 1). Aucun réseau, aucun aléa, aucun minuteur
   ni boucle d'animation propre. */
register('E082', ctx => {
  /* Garde d'entrée : sans layout exploitable, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Chaque chantier est isolé : une anomalie locale n'empêche pas les autres. */
  const safe = (fn) => { try { fn(); } catch { /* neutralisé sans bruit */ } };

  /* Lecture numérique tolérante et arrondi déterministe à deux décimales. */
  const num = (value, fallback) => {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const round2 = (value) => Math.round(value * 100) / 100;

  /* Empreinte FNV-1a locale : ni graine aléatoire ni horloge ; une même
     suite de coordonnées donne toujours la même chaîne. */
  const empreinte = (texte) => {
    let h = 2166136261;
    for (let i = 0; i < texte.length; i += 1) {
      h ^= texte.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  };

  const creer = (tag, className, text) => typeof ctx.el === 'function'
    ? ctx.el(tag, className, text) : document.createElement(tag);

  /* Feuille unique de la lentille, installée une seule fois par le registre.
     Les règles du SVG ne s'activent qu'après l'écriture finale du chantier 10. */
  css('constellation-v2-e082', `
.v2e082-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.v2e082-metrique{margin:6px 0 0;font-size:9px;line-height:1.55;color:var(--muted-2,#93a0b4)}
.constellation-field[data-v2e082-ready="1"] .constellation-edges line[data-v2e082-axe="h"],
.constellation-field[data-v2e082-ready="1"] .constellation-edges line[data-v2e082-axe="v"]{shape-rendering:crispEdges}
.constellation-field[data-v2e082-ready="1"] .constellation-edges line[data-v2e082-hors-cadre="1"]{display:none}
.constellation-field[data-v2e082-ready="1"] .constellation-edges line,
.constellation-field[data-v2e082-ready="1"] .constellation-edges path{pointer-events:none}
.constellation-field button{pointer-events:auto}
.v2e082-details{min-height:36px;min-width:36px;padding:0 12px;border:1px solid var(--line,#3a4150);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft,#cfd8e6);font-size:9px;cursor:pointer}
.v2e082-details:focus-visible{outline:3px solid var(--gold-bright,#f5e6c4);outline-offset:3px}
.v2e082-rapport[hidden]{display:none}
.v2e082-rapport{margin:6px 0 0;font-size:9px;line-height:1.55;color:var(--muted-2,#93a0b4)}
.v2e082-calm .v2e082-details{transition:none}
@media (prefers-reduced-motion: reduce){.v2e082-details{transition:none}}
`);

  let champ, edges, lignes;
  try {
    champ = layout.querySelector('.constellation-field');
    edges = champ ? champ.querySelector('.constellation-edges') : null;
  } catch { return; }
  if (!champ || !edges || typeof edges.querySelectorAll !== 'function') return;
  try {
    lignes = Array.from(edges.querySelectorAll('line'))
      .filter((line) => line.classList && line.classList.contains('const-edge'));
  } catch { return; }
  if (!lignes.length) return;

  /* Lecture unique des coordonnées, partagée par les huit premières mesures. */
  const geo = lignes.map((line, index) => {
    const x1 = num(line.getAttribute('x1'), 0);
    const y1 = num(line.getAttribute('y1'), 0);
    const x2 = num(line.getAttribute('x2'), 0);
    const y2 = num(line.getAttribute('y2'), 0);
    const len = round2(Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)));
    return {
      line, x1, y1, x2, y2, len, index,
      cle: [x1, y1, x2, y2].map(round2).join(','),
      actif: line.classList.contains('is-path'),
      invisible: false,
      origine: '',
    };
  });

  /* E082-01 — Signature de géométrie : empreinte déterministe des
     coordonnées, comparée à celle du rendu précédent mémorisée sur le layout. */
  safe(() => {
    const signature = empreinte(geo.map((g) => g.cle).join('|'));
    const precedente = layout.dataset.v2e082SignaturePrecedent;
    const changement = !precedente ? 'initial'
      : (precedente === signature ? 'stable' : 'modifie');
    edges.dataset.v2e082Signature = signature;
    edges.dataset.v2e082Changement = changement;
    layout.dataset.v2e082SignaturePrecedent = signature;
    layout.dataset.v2e082Changement = changement;
  });

  /* E082-02 — Orientation des traits : les segments horizontaux ou
     verticaux (écart au plus 0,05 unité) reçoivent un rendu crispEdges.
     Les traits du chemin actif sont exclus pour préserver la précision
     décidée en passe 1 et ne pas la contredire. */
  safe(() => {
    const EPS = 0.05;
    let horizontaux = 0;
    let verticaux = 0;
    let diagonaux = 0;
    geo.forEach((g) => {
      let axe = 'd';
      if (Math.abs(g.y2 - g.y1) <= EPS) { axe = 'h'; horizontaux += 1; }
      else if (Math.abs(g.x2 - g.x1) <= EPS) { axe = 'v'; verticaux += 1; }
      else { diagonaux += 1; }
      g.line.dataset.v2e082Axe = axe;
      if (axe !== 'd' && !g.actif) {
        g.line.dataset.v2e082Nettete = '1';
        g.line.setAttribute('shape-rendering', 'crispEdges');
      }
    });
    champ.dataset.v2e082Axes = `${horizontaux}:${verticaux}:${diagonaux}`;
  });

  /* E082-03 — Traits entièrement hors du viewBox : quand les deux
     extrémités sont du même côté d'une limite, le segment ne peut pas être
     vu ; il sort de la peinture sans être retiré du balisage d'origine. */
  safe(() => {
    const BAS = -2;
    const HAUT = 102;
    const dehors = (a, b) => (a < BAS && b < BAS) || (a > HAUT && b > HAUT);
    let compt = 0;
    geo.forEach((g) => {
      const invisible = dehors(g.x1, g.x2) || dehors(g.y1, g.y2);
      g.invisible = invisible;
      if (invisible) {
        g.line.dataset.v2e082HorsCadre = '1';
        compt += 1;
      }
    });
    champ.dataset.v2e082HorsCadre = String(compt);
  });

  /* E082-04 — Surface de trait estimée : longueur multipliée par une
     largeur nominale d'une unité de viewBox, comparée à une référence
     fixe de 1 200 unités carrées. */
  safe(() => {
    const LARGEUR = 1;
    const SURF_REF = 1200;
    const surface = round2(geo.reduce((total, g) =>
      total + (g.invisible ? 0 : g.len * LARGEUR), 0));
    champ.dataset.v2e082Surface = String(surface);
    if (!layout.querySelector('#v2e082-surface')) {
      const p = creer('p', 'v2e082-metrique',
        `Surface de trait estimée : ${surface} unités carrées, `
        + `référence ${SURF_REF} unités carrées.`);
      p.id = 'v2e082-surface';
      const caption = layout.querySelector('.constellation-caption') || champ;
      caption.appendChild(p);
    }
  });

  /* E082-05 — Topologie en étoile : regroupement des traits par origine
     commune arrondie à deux décimales, avec mesure du plus gros éventail. */
  safe(() => {
    const groupes = new Map();
    geo.forEach((g) => {
      const origine = `${round2(g.x1)},${round2(g.y1)}`;
      g.origine = origine;
      groupes.set(origine, (groupes.get(origine) || 0) + 1);
    });
    let maximum = 0;
    geo.forEach((g) => {
      const taille = groupes.get(g.origine) || 1;
      g.line.dataset.v2e082Eventail = String(taille);
      if (taille > maximum) maximum = taille;
    });
    champ.dataset.v2e082EventailMax = String(maximum);
    champ.dataset.v2e082Origines = String(groupes.size);
  });

  /* E082-06 — Désactivation du test de pointage sur les traits : le SVG ne
     participe plus au test de position du pointeur ; seuls les boutons
     restent interactifs, comme dans la vue d'origine. */
  safe(() => {
    edges.dataset.v2e082Pointage = 'desactive';
    champ.dataset.v2e082Pointer = 'off';
  });

  /* E082-07 — Arbre d'accessibilité : le SVG de connexion est décoratif,
     il est retiré de l'arbre et rendu non focalisable. Aucune information
     n'est perdue : l'état du chemin est porté par les annonces textuelles
     et les étiquettes des nœuds. */
  safe(() => {
    edges.setAttribute('aria-hidden', 'true');
    edges.setAttribute('focusable', 'false');
    edges.dataset.v2e082Aria = 'decoratif';
  });

  /* E082-08 — Longueur du chemin actif et segment dominant : somme des
     segments is-path visibles, comparée à une référence de 260 unités, et
     signalement du plus long d'entre eux. */
  safe(() => {
    const PATH_REF = 260;
    const actifs = geo.filter((g) => g.actif && !g.invisible);
    const total = round2(actifs.reduce((somme, g) => somme + g.len, 0));
    let dominant = null;
    actifs.forEach((g) => {
      if (!dominant || g.len > dominant.len) dominant = g;
    });
    if (dominant) dominant.line.dataset.v2e082Dominant = '1';
    champ.dataset.v2e082LongueurActive = String(total);
    champ.dataset.v2e082ReferenceActive = String(PATH_REF);
    if (!layout.querySelector('#v2e082-actif')) {
      const p = creer('p', 'v2e082-metrique',
        `Chemin actif : ${total} unités sur ${PATH_REF} unités de référence ; `
        + `${actifs.length} segments, dominant `
        + `${dominant ? dominant.len : 0} unités.`);
      p.id = 'v2e082-actif';
      const caption = layout.querySelector('.constellation-caption') || champ;
      caption.appendChild(p);
    }
  });

  /* E082-09 — Bascule « rapport de performance » : choix binaire
     indépendant (aria-pressed), cible d'au moins 36 px, focus visible,
     panneau agrégé et annonce live, sans minuteur ni animation. */
  safe(() => {
    const caption = layout.querySelector('.constellation-caption') || champ;
    let bouton = layout.querySelector('#v2e082-details');
    if (!bouton) {
      bouton = creer('button', 'v2e082-details', 'Afficher le rapport de performance');
      bouton.id = 'v2e082-details';
      bouton.type = 'button';
      bouton.setAttribute('aria-pressed', 'false');
      bouton.setAttribute('aria-controls', 'v2e082-rapport');
      caption.appendChild(bouton);
    }
    if (bouton.dataset.v2e082Bound !== '1') {
      bouton.dataset.v2e082Bound = '1';
      bouton.addEventListener('click', () => {
        const ouvert = bouton.getAttribute('aria-pressed') !== 'true';
        bouton.setAttribute('aria-pressed', ouvert ? 'true' : 'false');
        bouton.textContent = ouvert
          ? 'Masquer le rapport de performance'
          : 'Afficher le rapport de performance';
        const rapport = layout.querySelector('#v2e082-rapport');
        if (rapport) rapport.hidden = !ouvert;
        const annonce = layout.querySelector('#v2e082-annonce');
        if (annonce) {
          annonce.textContent = ouvert
            ? 'Rapport de performance affiché.'
            : 'Rapport de performance masqué.';
        }
      });
    }
    if (!layout.querySelector('#v2e082-rapport')) {
      const rapport = creer('div', 'v2e082-rapport');
      rapport.id = 'v2e082-rapport';
      rapport.hidden = true;
      rapport.setAttribute('aria-label', 'Rapport de performance du chemin de connexion');
      const lignes = [
        `Empreinte ${edges.dataset.v2e082Signature || '—'} : chemin `
          + `${edges.dataset.v2e082Changement || '—'}.`,
        `Axes ${champ.dataset.v2e082Axes || '—'} (horizontal : vertical : diagonal) ; `
          + `${champ.dataset.v2e082HorsCadre || '0'} trait(s) hors cadre.`,
        `Surface estimée ${champ.dataset.v2e082Surface || '—'} unités carrées ; `
          + `${champ.dataset.v2e082Origines || '0'} origines, éventail maximal `
          + `${champ.dataset.v2e082EventailMax || '0'} traits.`,
        `Chemin actif ${champ.dataset.v2e082LongueurActive || '—'} unités sur `
          + `${champ.dataset.v2e082ReferenceActive || '—'} de référence.`,
      ];
      rapport.appendChild(creer('p', '', lignes.join(' ')));
      caption.appendChild(rapport);
    }
    if (!layout.querySelector('#v2e082-annonce')) {
      const annonce = creer('p', 'v2e082-sr', '');
      annonce.id = 'v2e082-annonce';
      annonce.setAttribute('role', 'status');
      annonce.setAttribute('aria-live', 'polite');
      annonce.setAttribute('aria-atomic', 'true');
      layout.appendChild(annonce);
    }
  });

  /* E082-10 — Idempotence, mouvement réduit et activation atomique : les
     nœuds créés restent uniques d'un rendu à l'autre, la préférence réduite
     est demandée au contexte, et une dernière écriture arme les règles. */
  safe(() => {
    const reduit = !!(typeof ctx.reducedMotion === 'function' && ctx.reducedMotion());
    champ.classList.toggle('v2e082-calm', reduit);
    layout.dataset.v2e082Motion = reduit ? 'reduced' : 'full';
    champ.dataset.v2e082Count = String(geo.length);
    champ.dataset.v2e082Ready = '1';
    layout.dataset.v2e082Ready = '1';
  });
});
