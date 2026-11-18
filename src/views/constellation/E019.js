import { register } from './registry.js';

/* Lentille E019 — Robustesse et garde-fous appliqués aux planètes de la vue
 * Constellation. Dix chantiers (E019-01 … E019-10) auditent et protègent les
 * boutons `.const-planet` déjà rendus par constellation.js, sans toucher aux
 * fichiers partagés. Tout est dérivé du DOM réel : aucun fait inventé, aucun
 * appel réseau, aucun aléa, aucune sortie de débogage, aucun minuteur, aucune
 * boucle d'animation, aucune feuille de style distante.
 *
 * Contrat : register('E019', ctx => { … }) ; ctx = { viewId, stage, layout,
 * css(id, rules), el(tag, cls, text), reducedMotion() }.
 */

const CSS_ID = 'constellation-e019';
const PANEL_ID = 'e019-panel';
const HEAD_ID = 'e019-head';
const TITLE_ID = 'e019-title';
const TOGGLE_ID = 'e019-toggle';
const READOUT_ID = 'e019-readout';
const METRICS_ID = 'e019-metrics';
const FINDINGS_ID = 'e019-findings';
const LEGEND_ID = 'e019-legend';
const WRAP_CLASS = 'e019-wrap';

const CSS = `
.constellation-layout.e019 .e019-wrap{margin-top:14px}
#${PANEL_ID}{margin:0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font:inherit;font-size:9px;line-height:1.55;contain:layout style}
#${PANEL_ID} .e019-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
#${TITLE_ID}{margin:0;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
#${TOGGLE_ID}{min-height:36px;padding:5px 10px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--ink-soft);font:inherit;font-size:9px;cursor:pointer}
#${TOGGLE_ID}:hover{border-color:var(--gold)}
#${TOGGLE_ID}:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#${TOGGLE_ID}[aria-pressed="true"]{border-color:var(--gold);background:rgba(230,185,111,.12);color:var(--gold-bright)}
#${READOUT_ID}{margin:8px 0 6px;color:var(--ink-soft);font-variant-numeric:tabular-nums}
#${METRICS_ID}{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:3px 12px;margin:6px 0}
#${METRICS_ID}>div{min-width:0}
#${METRICS_ID} dt{margin:0;color:var(--muted-2);font-size:8px;letter-spacing:.04em;text-transform:uppercase}
#${METRICS_ID} dd{margin:1px 0;color:var(--ink-soft);font-size:9px;font-variant-numeric:tabular-nums}
#${FINDINGS_ID}{margin:6px 0 0;padding-left:16px;color:var(--muted-2)}
#${FINDINGS_ID} li{margin:1px 0;overflow-wrap:anywhere}
#${LEGEND_ID}{margin-top:8px;border-top:1px solid var(--line);padding-top:6px}
#${LEGEND_ID} summary{min-height:24px;color:var(--gold-bright);font-size:9px;cursor:pointer}
#${LEGEND_ID} summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#${LEGEND_ID} .e019-defs div{margin:4px 0}
#${LEGEND_ID} .e019-defs dt{margin:0;color:var(--gold);font-size:9px}
#${LEGEND_ID} .e019-defs dd{margin:1px 0;color:var(--muted);font-size:9px;line-height:1.5}
.constellation-layout.e019 .const-planet.e019-risque{outline:1px dashed var(--gold);outline-offset:2px}
.constellation-layout.e019.e019-highlight .const-planet.e019-risque{outline:2px solid var(--gold-bright);box-shadow:0 0 0 3px rgba(230,185,111,.18)}
.constellation-layout.e019.e019-highlight .const-planet.e019-risque::before{content:attr(data-e019-tag);position:absolute;left:50%;bottom:calc(100% + 3px);transform:translateX(-50%);padding:1px 4px;border:1px solid var(--gold);border-radius:4px;background:var(--surface-2);color:var(--gold-bright);font-size:7px;white-space:nowrap;z-index:5}
.constellation-layout.e019.e019-dense .const-planet::after{width:84px;font-size:7px}
@media (max-width:620px){#${PANEL_ID}{padding:8px 9px}#${METRICS_ID}{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))}}
@media (prefers-reduced-motion:reduce){#${PANEL_ID},#${PANEL_ID} *,.constellation-layout.e019 .const-planet{transition:none!important;animation:none!important}}`;

const IDS = [PANEL_ID, HEAD_ID, TITLE_ID, TOGGLE_ID, READOUT_ID, METRICS_ID, FINDINGS_ID, LEGEND_ID];
const SELECTEUR = '.const-planet[data-const-key^="planet:"]';
const CLE_FORMAT = /^planet:\d+$/;

let surligner = false;
let rendus = 0;

function creer(ctx, tag, cls, text) {
  if (typeof ctx.el === 'function') return ctx.el(tag, cls, text);
  const noeud = document.createElement(tag);
  if (cls) noeud.className = cls;
  if (text !== undefined) noeud.textContent = text;
  return noeud;
}

function attribut(noeud, nom) {
  return noeud && typeof noeud.getAttribute === 'function'
    ? (noeud.getAttribute(nom) || '') : '';
}

function texte(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
}

function propriete(noeud, nom) {
  return noeud && noeud.style && typeof noeud.style.getPropertyValue === 'function'
    ? noeud.style.getPropertyValue(nom).trim() : '';
}

function pourcentage(brut) {
  const valeur = parseFloat(String(brut));
  return Number.isFinite(valeur) ? valeur : 50;
}

function decimal(valeur) {
  return (Math.round(valeur * 100) / 100).toString().replace('.', ',');
}

function geometrie(champ) {
  const largeur = champ && champ.clientWidth > 0 ? champ.clientWidth : 100;
  const hauteur = champ && champ.clientHeight > 0 ? champ.clientHeight : 100;
  return { w: largeur, h: hauteur, mesurable: !!(champ && champ.clientWidth > 0 && champ.clientHeight > 0) };
}

function tailleNoeud(champ) {
  const brut = parseInt(propriete(champ, '--const-node-size'), 10);
  return Number.isFinite(brut) && brut > 0 ? brut : 28;
}

function marquer(noeud, libelle) {
  if (!noeud || !noeud.classList) return;
  noeud.classList.add('e019-risque');
  noeud.setAttribute('data-e019-risque', '1');
  const courant = attribut(noeud, 'data-e019-tag');
  noeud.setAttribute('data-e019-tag', courant ? `${courant} · ${libelle}` : libelle);
}

function unSeul(ctx, id, tag, cls, parent) {
  const trouves = Array.from(document.querySelectorAll(`[id="${id}"]`));
  for (let i = 1; i < trouves.length; i += 1) {
    if (trouves[i].parentNode) trouves[i].parentNode.removeChild(trouves[i]);
  }
  let cible = trouves[0];
  if (!cible) {
    cible = creer(ctx, tag, cls);
    cible.id = id;
    if (parent) parent.appendChild(cible);
  }
  return cible;
}

register('E019', (ctx) => {
  /* Gardien : sans layout rendu par constellation.js, la lentille ne touche
   * à aucun DOM. Le css n'est injecté qu'une fois, après ce contrôle. */
  const layout = ctx && ctx.layout;
  if (!layout || layout.nodeType !== 1 || typeof layout.querySelectorAll !== 'function') return;
  if (ctx.viewId && ctx.viewId !== 'constellation') return;
  if (typeof ctx.css === 'function') ctx.css(CSS_ID, CSS);

  try {
    /* E019-01 — Recensement et socle de diagnostic : lecture des planètes
     * rendues, géométrie du champ et création d'un panneau unique enveloppé
     * dans un conteneur sans ID (le tiroir de diagnostic ne le masque pas). */
    const planetes = Array.from(layout.querySelectorAll(SELECTEUR));
    const champ = layout.querySelector('.constellation-field');
    const geo = geometrie(champ);
    const taille = tailleNoeud(champ);
    const total = planetes.length;
    layout.classList.add('e019');
    rendus += 1;

    let enveloppe = layout.querySelector(`.${WRAP_CLASS}`);
    if (!enveloppe) {
      enveloppe = creer(ctx, 'div', WRAP_CLASS);
      layout.appendChild(enveloppe);
    }
    const panneau = unSeul(ctx, PANEL_ID, 'section', 'e019-panel', enveloppe);
    panneau.textContent = '';
    panneau.setAttribute('aria-labelledby', TITLE_ID);
    const tete = unSeul(ctx, HEAD_ID, 'div', 'e019-head', panneau);
    tete.textContent = '';
    const titre = unSeul(ctx, TITLE_ID, 'h3', 'e019-title', tete);
    titre.textContent = 'Garde-fous des planètes · E019';
    tete.appendChild(titre);
    panneau.appendChild(tete);
    const lecture = unSeul(ctx, READOUT_ID, 'p', 'e019-readout', panneau);
    lecture.setAttribute('role', 'status');
    lecture.setAttribute('aria-live', 'polite');
    lecture.setAttribute('aria-atomic', 'true');
    panneau.appendChild(lecture);
    const mesures = unSeul(ctx, METRICS_ID, 'dl', 'e019-metrics', panneau);
    mesures.textContent = '';
    panneau.appendChild(mesures);
    const constats = unSeul(ctx, FINDINGS_ID, 'ul', 'e019-findings', panneau);
    constats.textContent = '';
    panneau.appendChild(constats);

    layout.dataset.e019Planets = String(total);
    layout.dataset.e019Render = String(rendus);
    layout.dataset.e019Mode = total === 0 ? 'vide' : 'actif';

    /* E019-02 — Garde-fou de chevauchement : distance euclidienne entre
     * centres, corrigée par le rapport largeur/hauteur du champ. Les planètes
     * trop proches reçoivent une marque textuelle et l'attribut de risque. */
    const positions = planetes.map((planete) => ({
      noeud: planete,
      x: pourcentage(propriete(planete, '--x')),
      y: pourcentage(propriete(planete, '--y')),
    }));
    const seuil = taille * 1.15 + 2;
    let chevauchements = 0;
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        const dx = ((positions[j].x - positions[i].x) / 100) * geo.w;
        const dy = ((positions[j].y - positions[i].y) / 100) * geo.h;
        if (Math.sqrt(dx * dx + dy * dy) < seuil) {
          chevauchements += 1;
          marquer(positions[i].noeud, 'Chevauchement');
          marquer(positions[j].noeud, 'Chevauchement');
        }
      }
    }
    layout.dataset.e019Overlaps = String(chevauchements);

    /* E019-03 — Garde-fou de bord : l'étiquette large de 118 px peut être
     * coupée par le champ en débordement masqué ; le test n'est appliqué que
     * si le champ est réellement mesurable, sinon l'état est « non mesuré ». */
    let debordements = 0;
    if (geo.mesurable) {
      const demi = 59;
      positions.forEach((pos) => {
        const xPx = (pos.x / 100) * geo.w;
        const yPx = (pos.y / 100) * geo.h;
        if (xPx < demi || xPx > geo.w - demi || yPx > geo.h - taille - 16) {
          debordements += 1;
          pos.noeud.setAttribute('data-e019-edge', '1');
          marquer(pos.noeud, 'Bord');
        }
      });
    }
    layout.dataset.e019Edges = geo.mesurable ? String(debordements) : 'non mesure';

    /* E019-04 — Garde-fou de densité : surface disponible par planète face à
     * une empreinte de référence. En régime serré, une règle CSS réduit la
     * largeur des étiquettes pour limiter les collisions. */
    const surface = geo.w * geo.h;
    const empreinteRef = Math.pow(taille + 10, 2);
    const indice = empreinteRef > 0 && total > 0 ? surface / total / empreinteRef : 0;
    const dense = total > 0 && indice < 1;
    layout.classList.toggle('e019-dense', dense);
    layout.dataset.e019Density = decimal(indice);

    /* E019-05 — Filet de sécurité d'étiquette : si data-label est absent ou
     * sans séparateur, un libellé de repli est recomposé depuis aria-label ou
     * le numéro visible, puis exposé sans écraser l'attribut d'origine. */
    let replis = 0;
    planetes.forEach((planete, index) => {
      const label = attribut(planete, 'data-label');
      let valeur = label;
      if (label.indexOf(' · ') < 0) {
        valeur = attribut(planete, 'aria-label') || texte(planete) || `Repère ${index + 1}`;
        if (!attribut(planete, 'title')) planete.title = valeur;
        replis += 1;
      }
      planete.setAttribute('data-e019-label', valeur);
    });
    layout.dataset.e019LabelFallback = String(replis);

    /* E019-06 — Garde-fou d'accessibilité : les aria-label identiques sont
     * rendus discriminants par un suffixe déterministe indexé sur l'ordre du
     * DOM ; aucun libellé existant n'est supprimé. */
    const vus = new Set();
    let doublons = 0;
    planetes.forEach((planete, index) => {
      const aria = attribut(planete, 'aria-label');
      if (!aria) {
        doublons += 1;
        marquer(planete, 'Libelle absent');
      } else if (vus.has(aria)) {
        doublons += 1;
        planete.setAttribute('aria-label', `${aria} · repère ${index + 1}`);
        planete.setAttribute('data-e019-aria-dup', '1');
        marquer(planete, 'Libelle repete');
      } else {
        vus.add(aria);
      }
    });
    layout.dataset.e019AriaDuplicates = String(doublons);

    /* E019-07 — Intégrité des clés : seules les formes « planet:N » uniques
     * sont acceptées ; toute clé mal formée ou revue est signalée sur la
     * planète fautive par un attribut dédié. */
    const numeros = new Set();
    let clesIrrégulieres = 0;
    planetes.forEach((planete) => {
      const cle = attribut(planete, 'data-const-key');
      if (!CLE_FORMAT.test(cle) || numeros.has(cle)) {
        clesIrrégulieres += 1;
        planete.setAttribute('data-e019-key', '1');
        marquer(planete, 'Cle irreguliere');
      } else {
        numeros.add(cle);
      }
    });
    layout.dataset.e019KeyIssues = String(clesIrrégulieres);

    /* E019-08 — Activité unique et empreinte déterministe : une seule
     * planète active est attendue ; l'empreinte FNV-1a 32 bits des clés et
     * positions donne un témoin reproductible de la configuration rendue. */
    const actifs = planetes.filter((planete) => planete.classList.contains('is-active')
      || attribut(planete, 'aria-current') === 'true').length;
    layout.dataset.e019Active = String(actifs);
    if (total > 0 && actifs !== 1) layout.setAttribute('data-e019-active-alert', '1');
    const signature = positions.map((pos) => `${attribut(pos.noeud, 'data-const-key')}@${pos.x},${pos.y}`).join('|');
    let hachage = 2166136261;
    for (let i = 0; i < signature.length; i += 1) {
      hachage ^= signature.charCodeAt(i);
      hachage = Math.imul(hachage, 16777619);
    }
    const empreinte = (hachage >>> 0).toString(16).padStart(8, '0');
    layout.dataset.e019Fingerprint = empreinte;

    /* E019-09 — Bascule de mise en évidence : un bouton à aria-pressed
     * (bascule indépendante) applique une classe de portée qui révèle les
     * anneaux et les badges textuels des planètes marquées. */
    const bouton = unSeul(ctx, TOGGLE_ID, 'button', 'e019-toggle', tete);
    bouton.type = 'button';
    bouton.setAttribute('aria-controls', FINDINGS_ID);
    bouton.setAttribute('aria-pressed', String(surligner));
    bouton.textContent = surligner ? 'Masquer les garde-fous' : 'Afficher les garde-fous';
    bouton.onclick = () => {
      surligner = !surligner;
      layout.classList.toggle('e019-highlight', surligner);
      layout.dataset.e019Highlight = String(surligner);
      bouton.setAttribute('aria-pressed', String(surligner));
      bouton.textContent = surligner ? 'Masquer les garde-fous' : 'Afficher les garde-fous';
      lecture.textContent = surligner
        ? 'Garde-fous affichés : les planètes à risque portent un badge textuel.'
        : 'Garde-fous masqués : les mesures restent disponibles ci-dessus.';
    };
    tete.appendChild(bouton);
    layout.classList.toggle('e019-highlight', surligner);
    layout.dataset.e019Highlight = String(surligner);

    /* E019-10 — Synthèse auditable : tableau de mesures, constats par
     * planète, légende des formules, état du mouvement réduit et témoin
     * d'unicité des IDs, sans observer, sans minuteur et sans donnée externe. */
    const lignes = [
      ['Planètes', String(total)],
      ['Chevauchements', String(chevauchements)],
      ['Bords à risque', layout.dataset.e019Edges],
      ['Indice de densité', decimal(indice)],
      ['Replis d’étiquette', String(replis)],
      ['Libellés dupliqués', String(doublons)],
      ['Clés irrégulières', String(clesIrrégulieres)],
      ['Planètes actives', String(actifs)],
      ['Empreinte', empreinte],
      ['Rendus', String(rendus)],
    ];
    lignes.forEach(([nom, valeur]) => {
      const rangee = creer(ctx, 'div', '');
      rangee.appendChild(creer(ctx, 'dt', '', nom));
      rangee.appendChild(creer(ctx, 'dd', '', valeur));
      mesures.appendChild(rangee);
    });

    const signales = planetes
      .map((planete, index) => {
        const tag = attribut(planete, 'data-e019-tag');
        return tag ? `Repère ${index + 1} — ${tag}.` : '';
      })
      .filter(Boolean);
    if (!signales.length) signales.push('Aucun écart détecté sur les planètes rendues.');
    signales.forEach((phrase) => constats.appendChild(creer(ctx, 'li', '', phrase)));

    const legend = unSeul(ctx, LEGEND_ID, 'details', '', panneau);
    legend.textContent = '';
    legend.appendChild(creer(ctx, 'summary', '', 'Comprendre ces garde-fous'));
    const definitions = creer(ctx, 'dl', 'e019-defs');
    const paires = [
      ['Chevauchement', 'Deux centres distants de moins de 1,15 × la taille du nœud, plus 2 px de marge.'],
      ['Bord à risque', 'Étiquette de 118 px coupée par le champ : x hors de [59 px, largeur − 59 px] ou y trop bas.'],
      ['Indice de densité', 'Surface par planète divisée par (taille du nœud + 10 px)² ; une valeur ≥ 1 est confortable.'],
      ['Repli d’étiquette', 'Libellé reconstruit depuis aria-label ou le numéro quand le libellé source est absent.'],
      ['Empreinte', 'Hachage FNV-1a 32 bits des clés et positions : un même rendu donne toujours la même valeur.'],
    ];
    paires.forEach(([nom, definition]) => {
      const rangee = creer(ctx, 'div', '');
      rangee.appendChild(creer(ctx, 'dt', '', nom));
      rangee.appendChild(creer(ctx, 'dd', '', definition));
      definitions.appendChild(rangee);
    });
    legend.appendChild(definitions);
    panneau.appendChild(legend);

    lecture.textContent = `${total} planète(s) · ${chevauchements} chevauchement(s) · `
      + `${layout.dataset.e019Edges} débordement(s) · ${clesIrrégulieres} clé(s) irrégulière(s) `
      + `· empreinte ${empreinte}.`;

    layout.dataset.e019Reduced = String(Boolean(ctx.reducedMotion && ctx.reducedMotion()));
    layout.dataset.e019Unique = String(IDS.every((id) => document.querySelectorAll(`[id="${id}"]`).length <= 1));
  } catch (_) {
    /* Greffon tolérant : un DOM inattendu ne doit jamais interrompre le rendu. */
  }
});
