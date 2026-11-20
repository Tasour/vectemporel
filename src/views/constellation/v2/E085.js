import { register } from './registry.js';

/* Lentille V2 E085 — métrologie directionnelle et lisibilité du chemin de
   connexion de la vue Constellation, c'est-à-dire des traits `line.is-path`
   du SVG décoratif `.constellation-edges`. Seconde passe : dix chantiers
   inédits, tous implémentés, sans réseau, sans source aléatoire et sans
   minuteur ni boucle d'animation propre. Préfixe exclusif : v2e085
   (aucune collision d'identifiant avec les lentilles de la passe 1). */
register('E085', ctx => {
  /* Garde d'entrée : sans contexte ni layout courant, aucun ajout au DOM. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;

  /* Chaque chantier est isolé : une anomalie locale n'en interrompt pas neuf. */
  const safe = (fn) => { try { fn(); } catch { /* neutralisé sans bruit */ } };
  const creer = (tag, className, text) => typeof ctx.el === 'function'
    ? ctx.el(tag, className, text) : document.createElement(tag);
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const arrondi = (nombre) => Math.round(nombre * 10) / 10;

  /* Lecture des quatre coordonnées d'un trait, dans la grille 0–100 du SVG. */
  const coordonnees = (ligne) => {
    if (!ligne || typeof ligne.getAttribute !== 'function') return null;
    const x1 = parseFloat(ligne.getAttribute('x1'));
    const y1 = parseFloat(ligne.getAttribute('y1'));
    const x2 = parseFloat(ligne.getAttribute('x2'));
    const y2 = parseFloat(ligne.getAttribute('y2'));
    if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
    return { x1, y1, x2, y2 };
  };

  /* Feuille unique de la lentille : jalons numérotés, flèche directionnelle,
     sillage de séparation, bascule accessible, repli mouvement réduit et
     contraste forcé. Aucune couleur n'est le seul vecteur d'information. */
  css('constellation-v2-e085', `
.v2e085-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-field.v2e085-path .v2e085-jalon circle{fill:var(--surface-2);stroke:var(--gold-bright);stroke-width:.35;vector-effect:non-scaling-stroke}
.constellation-field.v2e085-path .v2e085-jalon text{fill:var(--gold-bright);font-size:2.4px;font-family:var(--sans, sans-serif);font-weight:600;text-anchor:middle;dominant-baseline:central}
.constellation-field.v2e085-path .v2e085-jalon[data-v2e085-jalon="1"] circle{stroke:var(--violet)}
.constellation-field.v2e085-path[data-v2e085-jalons="0"] .v2e085-jalon{opacity:0}
.constellation-field.v2e085-path[data-v2e085-fleche="1"] .constellation-edges line.is-path{marker-end:url(#v2e085-fleche)}
#v2e085-fleche path{fill:var(--gold-bright)}
.constellation-field.v2e085-path[data-v2e085-halo="1"] .constellation-edges line.is-path{filter:drop-shadow(0 0 1px var(--surface-1, #101018)) drop-shadow(0 0 2px rgba(0,0,0,.85));paint-order:stroke markers}
.v2e085-bascule{display:inline-flex;align-items:center;min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:9px;cursor:pointer}
.v2e085-bascule:hover{border-color:var(--gold);color:var(--gold-bright)}
.v2e085-bascule:focus-visible{outline:3px solid var(--gold-bright);outline-offset:3px}
.v2e085-bascule[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.1)}
.v2e085-description{margin:6px 0 0;font-size:9px;line-height:1.55;color:var(--muted-2);font-variant-numeric:tabular-nums}
.constellation-field.v2e085-path.v2e085-calm .v2e085-jalon{transition:none}
@media (prefers-reduced-motion: reduce){.constellation-field.v2e085-path .v2e085-jalon{transition:none!important}}
@media (forced-colors: active){
  .constellation-field.v2e085-path .v2e085-jalon circle{fill:Canvas;stroke:CanvasText}
  .constellation-field.v2e085-path .v2e085-jalon text{fill:CanvasText}
  #v2e085-fleche path{fill:Highlight}
  .constellation-field.v2e085-path .constellation-edges line.is-path{stroke:Highlight}
  .v2e085-bascule,.v2e085-bascule[aria-pressed="true"]{border-color:ButtonText;color:ButtonText;background:ButtonFace}
}
`);

  const champ = layout.querySelector('.constellation-field');
  const svg = layout.querySelector('.constellation-edges');
  const legende = layout.querySelector('.constellation-legend');
  const caption = layout.querySelector('.constellation-caption');
  const conteneur = caption || legende || layout;

  if (!champ) return;
  champ.classList.add('v2e085-path');

  const segments = svg && typeof svg.querySelectorAll === 'function'
    ? Array.from(svg.querySelectorAll('line.is-path')) : [];
  if (!segments.length) return;

  /* E085-01 — Inventaire ordinal : chaque trait reçoit son rang et son rôle,
     là où la passe 1 ne publiait qu'un compte global de segments. */
  safe(() => {
    segments.forEach((ligne, index) => {
      ligne.dataset.v2e085Ordre = String(index + 1);
      ligne.dataset.v2e085Role = index === 0 ? 'depart'
        : index === segments.length - 1 ? 'arrivee' : 'intermediaire';
    });
    champ.dataset.v2e085Segments = String(segments.length);
    layout.dataset.v2e085Segments = String(segments.length);
  });

  /* E085-02 — Longueur de chaque segment dans la grille 0–100 du viewBox :
     hypot des écarts, arrondi au dixième, cumulé en parcours total. */
  safe(() => {
    let total = 0;
    segments.forEach((ligne) => {
      const point = coordonnees(ligne);
      if (!point) return;
      const longueur = Math.hypot(point.x2 - point.x1, point.y2 - point.y1);
      total += longueur;
      ligne.dataset.v2e085Longueur = String(arrondi(longueur));
    });
    champ.dataset.v2e085Total = String(arrondi(total));
    layout.dataset.v2e085Parcours = String(arrondi(total));
  });

  /* E085-03 — Continuité bout à bout : la fin d'un trait doit rejoindre le
     début du suivant au repère actif ; tolérance d'une demi-unité de grille. */
  safe(() => {
    let ecarts = 0;
    const journaux = [];
    for (let index = 0; index < segments.length - 1; index += 1) {
      const amont = coordonnees(segments[index]);
      const aval = coordonnees(segments[index + 1]);
      if (!amont || !aval) continue;
      const distance = Math.hypot(aval.x1 - amont.x2, aval.y1 - amont.y2);
      const joint = distance <= 0.5;
      if (!joint) ecarts += 1;
      segments[index + 1].dataset.v2e085Raccord = joint ? 'joint' : 'ecart';
      journaux.push(arrondi(distance));
    }
    champ.dataset.v2e085Ecarts = String(ecarts);
    champ.dataset.v2e085Raccord = segments.length < 2
      ? 'unique' : ecarts ? 'ecart' : 'joint';
    layout.dataset.v2e085Journal = journaux.join(':');
  });

  /* E085-04 — Coude au repère : cosinus de l'angle entre les deux traits,
     sans trigonométrie inverse ; droit au-dessus de .7, replié sous -.2. */
  safe(() => {
    if (segments.length < 2) {
      champ.dataset.v2e085Coude = 'absent';
      return;
    }
    const premier = coordonnees(segments[0]);
    const dernier = coordonnees(segments[segments.length - 1]);
    if (!premier || !dernier) return;
    const u = { x: premier.x2 - premier.x1, y: premier.y2 - premier.y1 };
    const v = { x: dernier.x2 - dernier.x1, y: dernier.y2 - dernier.y1 };
    const normeU = Math.hypot(u.x, u.y);
    const normeV = Math.hypot(v.x, v.y);
    if (!normeU || !normeV) return;
    const cosinus = (u.x * v.x + u.y * v.y) / (normeU * normeV);
    champ.dataset.v2e085Cosinus = String(Math.round(cosinus * 1000) / 1000);
    champ.dataset.v2e085Coude = cosinus > .7 ? 'droit'
      : cosinus < -.2 ? 'replie' : 'oblique';
  });

  /* E085-05 — Équivalent textuel du chemin décoratif : paragraphe français
     role="status" alimenté par les mesures, distinct du compteur de la V1. */
  safe(() => {
    let description = layout.querySelector('#v2e085-description');
    if (!description) {
      description = creer('p', 'v2e085-description', '');
      description.id = 'v2e085-description';
      description.setAttribute('role', 'status');
      description.setAttribute('aria-live', 'polite');
      description.setAttribute('aria-atomic', 'true');
      conteneur.appendChild(description);
    }
    const coude = champ.dataset.v2e085Coude || 'absent';
    const nature = {
      droit: 'un coude droit', oblique: 'un coude oblique',
      replie: 'un coude replié', absent: 'aucun coude',
    }[coude] || 'un coude indéterminé';
    const raccord = champ.dataset.v2e085Raccord === 'ecart'
      ? 'une discontinuité' : 'un raccord continu';
    description.textContent = `Chemin de connexion : `
      + `${champ.dataset.v2e085Segments || '0'} segment(s), `
      + `${champ.dataset.v2e085Total || '0'} unités de grille, `
      + `${raccord}, ${nature}.`;
  });

  /* E085-06 — Jalons numérotés aux nœuds : un cercle et un chiffre SVG par
     extrémité, regroupés sous un identifiant dédié, reconstruits à l'identique
     à chaque rendu et déjà rendus muets par l'aria-hidden du SVG. */
  safe(() => {
    if (typeof document.createElementNS !== 'function' || !svg) return;
    let groupe = typeof svg.querySelector === 'function'
      ? svg.querySelector('#v2e085-jalons') : null;
    if (!groupe && typeof svg.appendChild === 'function') {
      groupe = document.createElementNS(SVG_NS, 'g');
      groupe.setAttribute('id', 'v2e085-jalons');
      svg.appendChild(groupe);
    }
    if (!groupe) return;
    while (groupe.firstChild) groupe.removeChild(groupe.firstChild);
    const noeuds = [];
    const depart = coordonnees(segments[0]);
    if (depart) noeuds.push({ x: depart.x1, y: depart.y1 });
    segments.forEach((ligne) => {
      const point = coordonnees(ligne);
      if (point) noeuds.push({ x: point.x2, y: point.y2 });
    });
    noeuds.forEach((noeud, index) => {
      const jalon = document.createElementNS(SVG_NS, 'g');
      jalon.setAttribute('class', 'v2e085-jalon');
      jalon.setAttribute('data-v2e085-jalon', String(index + 1));
      const cercle = document.createElementNS(SVG_NS, 'circle');
      cercle.setAttribute('cx', String(arrondi(noeud.x)));
      cercle.setAttribute('cy', String(arrondi(noeud.y)));
      cercle.setAttribute('r', '1.5');
      jalon.appendChild(cercle);
      const chiffre = document.createElementNS(SVG_NS, 'text');
      chiffre.setAttribute('x', String(arrondi(noeud.x)));
      chiffre.setAttribute('y', String(arrondi(noeud.y)));
      chiffre.textContent = String(index + 1);
      jalon.appendChild(chiffre);
      groupe.appendChild(jalon);
    });
    champ.dataset.v2e085Noeuds = String(noeuds.length);
    champ.dataset.v2e085Jalons = '1';
  });

  /* E085-07 — Bascule « jalons » : choix indépendant, aria-pressed légitime,
     cible de 36 px, focus visible et annonce via une région live séparée. */
  safe(() => {
    if (!legende || layout.querySelector('#v2e085-bascule')) return;
    const bouton = creer('button', 'v2e085-bascule', 'Masquer les jalons du chemin');
    bouton.id = 'v2e085-bascule';
    bouton.type = 'button';
    bouton.setAttribute('aria-pressed', 'true');
    bouton.setAttribute('aria-controls', 'v2e085-jalons');
    bouton.addEventListener('click', () => {
      const ouvert = bouton.getAttribute('aria-pressed') !== 'true';
      bouton.setAttribute('aria-pressed', ouvert ? 'true' : 'false');
      bouton.textContent = ouvert
        ? 'Masquer les jalons du chemin' : 'Afficher les jalons du chemin';
      champ.dataset.v2e085Jalons = ouvert ? '1' : '0';
      const annonce = layout.querySelector('#v2e085-annonce');
      if (annonce) annonce.textContent = ouvert
        ? 'Jalons du chemin affichés.' : 'Jalons du chemin masqués.';
    });
    legende.appendChild(bouton);
    if (!layout.querySelector('#v2e085-annonce')) {
      const annonce = creer('p', 'v2e085-sr', '');
      annonce.id = 'v2e085-annonce';
      annonce.setAttribute('role', 'status');
      annonce.setAttribute('aria-live', 'polite');
      annonce.setAttribute('aria-atomic', 'true');
      layout.appendChild(annonce);
    }
  });

  /* E085-08 — Sillage de séparation : une ombre sombre ceinture le seul
     chemin actif pour le détacher du maillage, sans recolorier les arêtes. */
  safe(() => {
    champ.dataset.v2e085Halo = '1';
    if (svg && svg.dataset) svg.dataset.v2e085Halo = '1';
  });

  /* E085-09 — Direction du chemin : marqueur SVG local défini une seule fois,
     le sens soleil → repère → point est porté par la forme. Seule une ancre #
     est référencée : aucune ressource distante, aucun `url(http…)`. */
  safe(() => {
    if (!svg || typeof document.createElementNS !== 'function') return;
    if (typeof svg.querySelector === 'function' && !svg.querySelector('#v2e085-fleche')) {
      let defs = svg.querySelector('defs');
      if (!defs) {
        defs = document.createElementNS(SVG_NS, 'defs');
        svg.insertBefore(defs, svg.firstChild);
      }
      const marqueur = document.createElementNS(SVG_NS, 'marker');
      marqueur.setAttribute('id', 'v2e085-fleche');
      marqueur.setAttribute('viewBox', '0 0 10 10');
      marqueur.setAttribute('refX', '8');
      marqueur.setAttribute('refY', '5');
      marqueur.setAttribute('markerWidth', '3');
      marqueur.setAttribute('markerHeight', '3');
      marqueur.setAttribute('orient', 'auto');
      marqueur.setAttribute('markerUnits', 'userSpaceOnUse');
      const pointe = document.createElementNS(SVG_NS, 'path');
      pointe.setAttribute('d', 'M 0 1 L 9 5 L 0 9 z');
      marqueur.appendChild(pointe);
      defs.appendChild(marqueur);
    }
    champ.dataset.v2e085Fleche = '1';
  });

  /* E085-10 — Repli de mouvement : la classe de transition n'est posée que
     si le contexte l'autorise ; le contraste forcé est porté par la feuille
     unique. La préférence est demandée au contexte, sans sonde propre. */
  safe(() => {
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    champ.classList.toggle('v2e085-calm', !!reduit);
    champ.dataset.v2e085Motion = reduit ? 'reduced' : 'full';
  });
});
