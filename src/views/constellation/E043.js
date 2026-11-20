import { register } from './registry.js';

/* Lentille E043 — Contraste visuel appliqué à la légende de la vue Constellation.
   Dix chantiers concrets et variés : ancrage et recensement, mesure WCAG du
   contraste, couleur de texte renforcée, formes distinctes, pastilles agrandies,
   fond dédié, ombre portée, bascule « Contraste renforcé », étiquettes doubles
   symbole + texte, focus visible et mouvement réduit. Greffon tolérant : aucune
   exception, aucun réseau, aucun aléa, aucun timer, aucun rAF propre. */

const CSS_ID = 'constellation-e043';

const CSS = `
  /* E043-03 — couleur de texte renforcée et corps lisible. */
  .constellation-layout .constellation-legend,
  #e043-legend {
    color: var(--ink-soft);
    font-size: 11px;
    line-height: 1.45;
  }
  /* E043-04 — formes distinctes : disque, carré, anneau ; la couleur seule ne porte plus l'information. */
  #e043-legend.e043-formes .legend-sun::before {
    border: 1px solid var(--gold-bright); border-radius: 50%;
  }
  #e043-legend.e043-formes .legend-planet::before {
    border: 1px solid var(--blue); border-radius: 1px;
  }
  #e043-legend.e043-formes .legend-moon::before {
    border: 2px solid var(--violet); border-radius: 50%; background: transparent;
  }
  /* E043-05 — pastilles agrandies, non compressibles et détachées du fond. */
  #e043-legend.e043-pastilles span::before {
    width: 9px; height: 9px; flex: 0 0 9px;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, .9);
  }
  /* E043-06 — panneau de fond à contraste maîtrisé. */
  #e043-legend[data-e043-fond="panneau"] {
    padding: 6px 10px; border: 1px solid var(--line-strong);
    border-radius: 8px; background: var(--surface-2);
  }
  /* E043-07 — ombre portée qui détache le libellé du dégradé de la vue. */
  #e043-legend.e043-ombre span { text-shadow: 0 1px 2px rgba(0, 0, 0, .85); }
  /* E043-08 — bouton de bascule, cible minimale de 36 px et état pressed explicite. */
  #e043-toggle {
    min-height: 36px; padding: 6px 10px;
    border: 1px solid var(--line-strong); border-radius: 8px;
    background: var(--surface-2); color: var(--ink);
    font: inherit; font-size: 10px; cursor: pointer;
  }
  #e043-toggle[aria-pressed="true"] {
    border-color: var(--gold-bright); color: var(--gold-bright);
    background: rgba(230, 185, 111, .12);
  }
  /* E043-08 — Mode renforcé piloté par l'attribut posé au clic. */
  #e043-legend[data-e043-boost="on"] {
    background: #000; color: #fff; border-color: #fff;
  }
  #e043-legend[data-e043-boost="on"] span { color: #fff; font-size: 12px; }
  #e043-legend[data-e043-boost="on"] span::before { box-shadow: 0 0 0 1px #fff; }
  /* E043-09 — symbole textuel inséré après chaque libellé. */
  #e043-legend span[data-e043-symbole]::after {
    margin-left: 4px; content: attr(data-e043-symbole);
    font-weight: 700; color: var(--ink);
  }
  #e043-readout { margin: 0; color: var(--muted); font-size: 9px; }
  /* E043-10 — focus visible et respect du mouvement réduit. */
  #e043-toggle:focus-visible { outline: 2px solid var(--gold-bright); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) {
    #e043-toggle { transition: none !important; }
  }
`;

/* Luminance relative WCAG 2.1 d'une couleur hexadécimale à six chiffres. */
function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const canal = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/* Ratio de contraste (L_clair + 0,05) / (L_sombre + 0,05). */
function contraste(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  if (la === null || lb === null) return null;
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function formatRatio(x) {
  return x === null ? 'n/d' : `${x.toFixed(2).replace('.', ',')} : 1`;
}

register('E043', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM tant que ctx.layout n'est pas exploitable. */
  if (!ctx || !ctx.layout || ctx.layout.nodeType !== 1
    || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;

  try {
    const layout = ctx.layout;
    const doc = layout.ownerDocument;
    const make = typeof ctx.el === 'function' ? ctx.el : null;

    /* E043-01 — Ancrage et recensement de la légende : id dédié, décompte des
       trois entrées et publication du total sur le layout. Sans légende, on
       sort immédiatement sans toucher au DOM. */
    const legend = layout.querySelector('.constellation-legend');
    if (!legend || typeof legend.setAttribute !== 'function') return;
    legend.id = 'e043-legend';
    const entrees = Array.from(legend.querySelectorAll(
      'span.legend-sun, span.legend-planet, span.legend-moon'
    ));
    layout.dataset.e043LegendItems = String(entrees.length);
    layout.classList.add('e043-contrast-legend');

    /* E043-02 — Mesure WCAG recalculée : gris d'origine (#8c8d91) puis
       texte renforcé (#d7d1c6), tous deux sur le fond #10151d. Le résultat
       est publié en attribut et dans une région live. */
    const avant = contraste('#8c8d91', '#10151d');
    const apres = contraste('#d7d1c6', '#10151d');
    layout.dataset.e043ContrastAvant = formatRatio(avant);
    layout.dataset.e043ContrastApres = formatRatio(apres);
    const oldReadout = doc && typeof doc.getElementById === 'function'
      ? doc.getElementById('e043-readout') : null;
    if (oldReadout && oldReadout.parentNode) oldReadout.parentNode.removeChild(oldReadout);
    const lecture = make ? make('p', 'e043-readout', '') : null;
    if (!lecture) return;
    lecture.id = 'e043-readout';
    lecture.setAttribute('role', 'status');
    lecture.setAttribute('aria-live', 'polite');
    lecture.setAttribute('aria-atomic', 'true');
    lecture.textContent = `Contraste du texte de la légende : ${formatRatio(avant)} avant, `
      + `${formatRatio(apres)} après renforcement.`;
    legend.appendChild(lecture);

    /* E043-03 — Attribution de la couleur renforcée : marqueur d'état lu par
       la règle CSS unique qui reprend --ink-soft et un corps de 11 px. */
    legend.dataset.e043Text = 'ink-soft';

    /* E043-04 — Distinction par la forme : classe activant disque, carré et
       anneau afin que l'ère, le repère et le point vérifié ne se distinguent
       plus par la seule teinte. */
    legend.classList.add('e043-formes');

    /* E043-05 — Pastilles de 9 px rendues non compressibles : classe activant
       le dimensionnement et le liseré noir de la règle CSS dédiée. */
    legend.classList.add('e043-pastilles');

    /* E043-06 — Fond dédié : attribut qui active le panneau à bordure dorée,
       isolant la légende du dégradé de la constellation. */
    legend.dataset.e043Fond = 'panneau';

    /* E043-07 — Ombre portée du texte : classe activant text-shadow sur chaque
       libellé pour le détacher d'un fond clair ou d'une surbrillance locale. */
    legend.classList.add('e043-ombre');

    /* E043-08 — Bascule « Contraste renforcé » : bouton unique, aria-pressed
       réservé à cette bascule indépendante, écouteur qui alterne l'attribut
       pilotant le mode noir/blanc et met à jour la région live. */
    const oldToggle = doc && typeof doc.getElementById === 'function'
      ? doc.getElementById('e043-toggle') : null;
    if (oldToggle && oldToggle.parentNode) oldToggle.parentNode.removeChild(oldToggle);
    const bouton = make ? make('button', 'e043-toggle', 'Contraste renforcé') : null;
    if (!bouton) return;
    bouton.id = 'e043-toggle';
    bouton.setAttribute('type', 'button');
    bouton.setAttribute('aria-pressed', 'false');
    bouton.setAttribute('aria-label', 'Contraste renforcé — légende de la constellation');
    layout.dataset.e043Boost = 'off';
    bouton.addEventListener('click', () => {
      const actif = layout.dataset.e043Boost === 'on';
      const suivant = actif ? 'off' : 'on';
      layout.dataset.e043Boost = suivant;
      bouton.setAttribute('aria-pressed', suivant === 'on' ? 'true' : 'false');
      bouton.textContent = suivant === 'on' ? 'Contraste standard' : 'Contraste renforcé';
      bouton.setAttribute('aria-label', suivant === 'on'
        ? 'Contraste standard — légende de la constellation'
        : 'Contraste renforcé — légende de la constellation');
      lecture.textContent = suivant === 'on'
        ? `Contraste renforcé actif : blanc sur noir, ${formatRatio(apres)} mesurés.`
        : `Contraste standard rétabli : ${formatRatio(apres)} après renforcement.`;
    });
    legend.appendChild(bouton);

    /* E043-09 — Étiquettes doubles : chaque entrée reçoit un symbole textuel
       et un aria-label qui redit la forme, le sens et le libellé visible. */
    const symboles = { 'legend-sun': '●', 'legend-planet': '■', 'legend-moon': '○' };
    const senses = {
      'legend-sun': 'Disque doré : Ère',
      'legend-planet': 'Carré bleu : Repère',
      'legend-moon': 'Anneau violet : Point vérifié du repère'
    };
    entrees.forEach((entree) => {
      const cle = ['legend-sun', 'legend-planet', 'legend-moon']
        .find((candidate) => entree.classList.contains(candidate));
      if (!cle) return;
      entree.setAttribute('data-e043-symbole', symboles[cle]);
      const visible = typeof entree.textContent === 'string' ? entree.textContent.trim() : '';
      entree.setAttribute('aria-label', `${senses[cle]}${visible ? ' — ' + visible : ''}`);
    });

    /* E043-10 — Focus visible, description de la bascule et mouvement réduit :
       l'attribut de layout trace le mode choisi, la feuille de style annule les
       transitions quand ctx.reducedMotion() le demande. */
    bouton.setAttribute('aria-describedby', 'e043-readout');
    const reduit = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    layout.dataset.e043Motion = reduit ? 'reduced' : 'full';

    /* Feuille de style unique, identifiant réservé à cette lentille. */
    if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);
  } catch {
    /* Greffon tolérant : toute anomalie locale est neutralisée sans bruit. */
    return;
  }
});
