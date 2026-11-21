import { register } from './registry.js';

/* Lentille V2 E058 — audit E2E avancé du focus et de la tabulation de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés, sans
   réseau, sans source aléatoire, sans minuteur ni boucle d'animation propre.
   Le domaine reste celui de la passe 1 (instrumentation E2E), mais aucun signal
   n'est repris : signature, transitions, couverture et conflits sont observés
   ici pour la première fois. Préfixe exclusif : `v2e058`. */

const CSS_ID = 'constellation-v2-e058';
const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]';
const IDS = [
  'v2e058-panel', 'v2e058-title', 'v2e058-summary',
  'v2e058-metrics', 'v2e058-findings', 'v2e058-legend',
];
const LIMITE = 64;

const CSS = `
.v2e058-wrap{margin-top:12px}
#v2e058-panel{margin:0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2);color:var(--muted);font:inherit;font-size:9px;line-height:1.55;contain:layout style}
#v2e058-title{margin:0;color:var(--gold);font-family:var(--serif);font-size:12px;font-weight:450}
#v2e058-summary{margin:8px 0 6px;color:var(--ink-soft);font-variant-numeric:tabular-nums}
#v2e058-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:3px 12px;margin:6px 0}
#v2e058-metrics>div{min-width:0}
#v2e058-metrics dt{margin:0;color:var(--muted-2);font-size:8px;letter-spacing:.04em;text-transform:uppercase}
#v2e058-metrics dd{margin:1px 0;color:var(--ink-soft);font-size:9px;font-variant-numeric:tabular-nums}
#v2e058-findings{margin:6px 0 0;padding-left:16px;color:var(--muted-2)}
#v2e058-findings li{margin:1px 0;overflow-wrap:anywhere}
#v2e058-legend{margin-top:8px;border-top:1px solid var(--line);padding-top:6px}
#v2e058-legend summary{min-height:28px;color:var(--gold-bright);font-size:9px;cursor:pointer}
#v2e058-legend summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
#v2e058-defs div{margin:4px 0}
#v2e058-defs dt{margin:0;color:var(--gold);font-size:9px}
#v2e058-defs dd{margin:1px 0;color:var(--muted);font-size:9px;line-height:1.5}
.v2e058-dup-key{outline:1px dashed var(--violet);outline-offset:2px}
.v2e058-ghost{outline:1px dotted var(--gold);outline-offset:2px}
@media (max-width:620px){#v2e058-panel{padding:8px 9px}#v2e058-metrics{grid-template-columns:repeat(auto-fit,minmax(120px,1fr))}}
@media (prefers-reduced-motion:reduce){#v2e058-panel,#v2e058-panel *{transition:none!important;animation:none!important}}
`;

function nouveau(ctx, tag, cls, text) {
  let noeud = null;
  if (ctx && typeof ctx.el === 'function') noeud = ctx.el(tag, cls, text);
  if (!noeud) {
    noeud = document.createElement(tag);
    if (cls) noeud.className = cls;
    if (text !== undefined) noeud.textContent = text;
  }
  return noeud;
}

function attribut(noeud, nom) {
  return noeud && typeof noeud.getAttribute === 'function'
    ? (noeud.getAttribute(nom) || '') : '';
}

function texte(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
}

function clef(noeud, rang) {
  const posee = attribut(noeud, 'data-e058-testid');
  if (posee) return posee;
  const brute = attribut(noeud, 'data-const-key');
  if (brute) return 'noeud-' + brute.replace(/[^a-z0-9]/gi, '-');
  if (noeud && noeud.classList) {
    if (noeud.classList.contains('constellation-back')) return 'retour-chronologie';
    if (noeud.classList.contains('e001-skip')) return 'evitement-soleils';
  }
  return 'controle-' + (rang + 1);
}

function courant(layout, evenement, exclusion) {
  const noeud = evenement && evenement.target && evenement.target.nodeType === 1
    ? evenement.target : null;
  if (!noeud || typeof layout.contains !== 'function' || !layout.contains(noeud)) return null;
  if (exclusion && typeof exclusion.contains === 'function' && exclusion.contains(noeud)) return null;
  return noeud;
}

function signature(chaine) {
  const s = String(chaine || '');
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function pourcent(n, d) {
  if (!d) return '0 %';
  const v = Math.round(n / d * 10000) / 100;
  return String(v).replace('.', ',') + ' %';
}

function unSeul(ctx, id, tag, cls, parent) {
  const trouves = Array.from(document.querySelectorAll('[id="' + id + '"]'));
  for (let i = 1; i < trouves.length; i += 1) {
    if (trouves[i].parentNode) trouves[i].parentNode.removeChild(trouves[i]);
  }
  let cible = trouves[0];
  if (!cible) {
    cible = nouveau(ctx, tag, cls);
    cible.id = id;
    if (parent) parent.appendChild(cible);
  }
  return cible;
}

function rangee(ctx, parent, nom, valeur) {
  const bloc = nouveau(ctx, 'div', '');
  bloc.appendChild(nouveau(ctx, 'dt', '', nom));
  bloc.appendChild(nouveau(ctx, 'dd', '', valeur));
  parent.appendChild(bloc);
}

register('E058', ctx => {
  /* Garde d'entrée : sans layout rendu ni fonction css, la lentille ne touche
   * à aucun DOM. Un layout déjà instrumenté n'est pas instrumenté deux fois. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  if (!layout.classList || typeof layout.querySelectorAll !== 'function') return;
  css(CSS_ID, CSS);
  if (layout.getAttribute('data-v2e058-bound') === '1') return;
  layout.setAttribute('data-v2e058-bound', '1');

  /* Préambule — périmètre isolé : les arrêts sont figés avant la création du
   * panneau, afin que l'instrumentation ne s'instrumente pas elle-même. */
  const order = Array.from(layout.querySelectorAll(FOCUSABLE))
    .filter(node => node.tabIndex >= 0 && !node.disabled
      && node.getAttribute('aria-hidden') !== 'true');
  const total = order.length;
  const keys = order.map((node, rank) => clef(node, rank));

  let enveloppe = layout.querySelector('.v2e058-wrap');
  if (!enveloppe) {
    enveloppe = nouveau(ctx, 'div', 'v2e058-wrap');
    layout.appendChild(enveloppe);
  }
  const panneau = unSeul(ctx, 'v2e058-panel', 'section', '', enveloppe);
  panneau.textContent = '';
  panneau.setAttribute('aria-labelledby', 'v2e058-title');
  const titre = unSeul(ctx, 'v2e058-title', 'h3', '', panneau);
  titre.textContent = 'Audit E2E V2 — focus et tabulation';
  panneau.appendChild(titre);
  const synthese = unSeul(ctx, 'v2e058-summary', 'p', 'v2e058-summary', panneau);
  synthese.setAttribute('role', 'status');
  synthese.setAttribute('aria-live', 'polite');
  synthese.setAttribute('aria-atomic', 'true');
  panneau.appendChild(synthese);
  const mesures = unSeul(ctx, 'v2e058-metrics', 'dl', 'v2e058-metrics', panneau);
  mesures.textContent = '';
  panneau.appendChild(mesures);
  const constats = unSeul(ctx, 'v2e058-findings', 'ul', 'v2e058-findings', panneau);
  constats.textContent = '';
  panneau.appendChild(constats);

  layout.dataset.v2e058Stops = String(total);
  layout.dataset.v2e058Mode = total ? 'actif' : 'vide';

  /* E058-01 — Signature d'état déterministe : empreinte FNV-1a 32 bits de la
   * suite des clés d'arrêts et du texte d'état. Aucune horloge, aucun tirage. */
  const brut = keys.join('|') + '#' + texte(layout.querySelector('.constellation-state'));
  layout.dataset.v2e058Signature = signature(brut);

  /* E058-02 — Détecteur de doublons de clés de test : deux arrêts partageant
   * la même clé sont ambigus pour un harnais. Seule la seconde occurrence est
   * marquée, l'ordre du DOM servant de référence déterministe. */
  const vus = new Set();
  let doublons = 0;
  keys.forEach((key, rang) => {
    if (vus.has(key)) {
      doublons += 1;
      order[rang].setAttribute('data-v2e058-dup-key', key);
      if (order[rang].classList) order[rang].classList.add('v2e058-dup-key');
    } else {
      vus.add(key);
    }
  });
  layout.dataset.v2e058DupKeys = String(doublons);

  /* E058-03 — Graphe de transitions : paires orientées clé-source → clé-cible
   * enregistrées à chaque changement d'arrêt, dédupliquées et bornées à 64. */
  const aretes = [];
  let precedent = null;
  layout.addEventListener('focusin', (evenement) => {
    const noeud = courant(layout, evenement, panneau);
    if (!noeud) return;
    const rang = order.indexOf(noeud);
    const cle = rang >= 0 ? keys[rang] : clef(noeud, 0);
    if (precedent !== null && precedent !== cle) {
      const arete = precedent + '→' + cle;
      if (aretes.indexOf(arete) < 0) {
        aretes.push(arete);
        if (aretes.length > LIMITE) aretes.shift();
      }
    }
    precedent = cle;
    layout.dataset.v2e058Edges = aretes.join('|');
    layout.dataset.v2e058EdgeCount = String(aretes.length);
  });

  /* E058-04 — Matrice de couverture : ensemble ordonné des arrêts visités au
   * moins une fois, avec taux exprimé en pourcentage français. */
  const visites = [];
  layout.addEventListener('focusin', (evenement) => {
    const noeud = courant(layout, evenement, panneau);
    if (!noeud) return;
    const rang = order.indexOf(noeud);
    const cle = rang >= 0 ? keys[rang] : clef(noeud, 0);
    if (visites.indexOf(cle) < 0) visites.push(cle);
    layout.dataset.v2e058Visited = visites.join('|');
    layout.dataset.v2e058VisitedCount = String(visites.length);
    layout.dataset.v2e058Coverage = pourcent(visites.length, total);
  });

  /* E058-05 — Détecteur de boucle : plus longue suite de focus consécutifs
   * sur une même clé, avec la clé concernée, sans seuil ni minuteur. */
  let repet = 0;
  let maxRepet = 0;
  let cleRepet = '';
  let derniere = null;
  layout.addEventListener('focusin', (evenement) => {
    const noeud = courant(layout, evenement, panneau);
    if (!noeud) return;
    const rang = order.indexOf(noeud);
    const cle = rang >= 0 ? keys[rang] : clef(noeud, 0);
    repet = cle === derniere ? repet + 1 : 1;
    derniere = cle;
    if (repet > maxRepet) {
      maxRepet = repet;
      cleRepet = cle;
    }
    layout.dataset.v2e058Repeat = String(maxRepet);
    layout.dataset.v2e058RepeatKey = cleRepet;
  });

  /* E058-06 — Horodatage logique : compteur d'événements purement séquentiel,
   * sans Date.now ni minuteur, complété sur chaque nœud par son premier et
   * son dernier rang d'occurrence. */
  let seq = 0;
  layout.addEventListener('focusin', (evenement) => {
    const noeud = courant(layout, evenement, panneau);
    if (!noeud) return;
    seq += 1;
    if (typeof noeud.hasAttribute === 'function' && !noeud.hasAttribute('data-v2e058-seq-first')) {
      noeud.setAttribute('data-v2e058-seq-first', String(seq));
    }
    noeud.setAttribute('data-v2e058-seq-last', String(seq));
    layout.dataset.v2e058Seq = String(seq);
  });

  /* E058-07 — Instantané de l'état de la vue : la ligne d'état visible est
   * publiée telle quelle puis découpée en ère, repère et point. Les motifs
   * restent vides si le texte est absent, sans jamais corriger la source. */
  const etatBrut = texte(layout.querySelector('.constellation-state'));
  layout.dataset.v2e058State = etatBrut;
  const mEre = etatBrut.match(/Ère\s*:\s*([^·]+)/);
  const mRepere = etatBrut.match(/Repère\s*:\s*([^·]+)/);
  const mPoint = etatBrut.match(/Point\s*:\s*(.+)$/);
  layout.dataset.v2e058Era = mEre ? mEre[1].trim() : '';
  layout.dataset.v2e058Event = mRepere ? mRepere[1].trim() : '';
  layout.dataset.v2e058Point = mPoint ? mPoint[1].trim() : '';

  /* E058-08 — Arrêts non enregistrés : un focus sur un nœud absent de la
   * photographie initiale est un « fantôme » ; il est compté et marqué, mais
   * jamais ajouté rétroactivement à l'ordre de tabulation. */
  let fantomes = 0;
  let cleFantome = '';
  layout.addEventListener('focusin', (evenement) => {
    const noeud = courant(layout, evenement, panneau);
    if (!noeud || order.indexOf(noeud) >= 0) return;
    fantomes += 1;
    cleFantome = clef(noeud, 0);
    if (typeof noeud.setAttribute === 'function') noeud.setAttribute('data-v2e058-ghost', '1');
    if (noeud.classList) noeud.classList.add('v2e058-ghost');
    layout.dataset.v2e058Ghosts = String(fantomes);
    layout.dataset.v2e058GhostKey = cleFantome;
  });

  /* E058-09 — Conflits d'état ARIA : dans le radiogroupe des ères, exactement
   * un aria-checked="true" est attendu et aucun aria-pressed ne doit y figurer.
   * Le comptage est purement observateur : aucun attribut n'est réécrit. */
  let coches = 0;
  let presses = 0;
  let conflits = 0;
  const groupe = layout.querySelector('.const-layer-suns');
  if (groupe && typeof groupe.querySelectorAll === 'function') {
    const radios = Array.from(groupe.querySelectorAll('[aria-checked]'));
    radios.forEach((radio) => {
      if (radio.getAttribute('aria-checked') === 'true') coches += 1;
    });
    presses = Array.from(groupe.querySelectorAll('[aria-pressed]')).length;
    if (radios.length && coches !== 1) conflits += 1;
    if (presses > 0) conflits += 1;
  }
  layout.dataset.v2e058Checked = String(coches);
  layout.dataset.v2e058Pressed = String(presses);
  layout.dataset.v2e058AriaConflicts = String(conflits);

  /* E058-10 — Tableau de bord et région live de synthèse : dix mesures, les
   * constats textuels et une légende définissant chaque formule. La synthèse
   * est mise à jour en fin de chaîne d'écouteurs, donc après les chantiers 03
   * à 08, sans minuteur ni boucle d'animation. */
  const lignes = [
    ['Arrêts', String(total)],
    ['Signature', layout.dataset.v2e058Signature],
    ['Clés dupliquées', String(doublons)],
    ['Transitions', layout.dataset.v2e058EdgeCount],
    ['Couverture', layout.dataset.v2e058Coverage],
    ['Répétition max', String(maxRepet)],
    ['Horodatage', String(seq)],
    ['Ère', layout.dataset.v2e058Era],
    ['Fantômes', String(fantomes)],
    ['Conflits ARIA', String(conflits)],
  ];
  lignes.forEach(([nom, valeur]) => rangee(ctx, mesures, nom, valeur));

  const signalements = [];
  if (doublons > 0) signalements.push(`${doublons} clé(s) de test dupliquée(s) sur les arrêts.`);
  if (conflits > 0) signalements.push(`${conflits} conflit(s) d'état ARIA dans le radiogroupe.`);
  if (fantomes > 0) signalements.push(`${fantomes} focus hors du manifeste initial.`);
  if (!signalements.length) signalements.push('Aucun écart V2 détecté sur l’instrumentation du focus.');
  signalements.forEach(phrase => constats.appendChild(nouveau(ctx, 'li', '', phrase)));

  const legende = unSeul(ctx, 'v2e058-legend', 'details', '', panneau);
  legende.textContent = '';
  legende.appendChild(nouveau(ctx, 'summary', '', 'Comprendre l’audit E2E V2'));
  const definitions = nouveau(ctx, 'dl', '', '');
  definitions.id = 'v2e058-defs';
  const paires = [
    ['Signature', 'Empreinte FNV-1a 32 bits des clés d’arrêts et du texte d’état : deux rendus identiques donnent la même valeur hexadécimale.'],
    ['Clé dupliquée', 'Deux arrêts partageant la même clé de test sont ambigus ; seul le second est marqué.'],
    ['Transition', 'Paire orientée source → cible relevée lors d’un changement d’arrêt, dédupliquée puis bornée à 64 entrées.'],
    ['Couverture', 'Part des arrêts du manifeste ayant reçu le focus au moins une fois, calculée sans horloge.'],
    ['Répétition', 'Plus longue suite de focus consécutifs sur une même clé : une valeur élevée signale un piège possible.'],
    ['Fantôme', 'Focus reçu par un nœud absent de la photographie initiale du DOM.'],
    ['Conflit ARIA', 'Nombre de cases cochées différent de une, ou présence de aria-pressed dans le radiogroupe.'],
  ];
  paires.forEach(([nom, definition]) => rangee(ctx, definitions, nom, definition));
  legende.appendChild(definitions);
  panneau.appendChild(legende);

  synthese.textContent = `Audit V2 · ${total} arrêt(s) · signature ${layout.dataset.v2e058Signature} · `
    + `${doublons} clé(s) dupliquée(s) · ${conflits} conflit(s) ARIA · couverture ${layout.dataset.v2e058Coverage}.`;
  layout.addEventListener('focusin', (evenement) => {
    if (!courant(layout, evenement, panneau)) return;
    synthese.textContent = `Audit V2 · ${layout.dataset.v2e058VisitedCount}/${total} arrêt(s) visité(s) · `
      + `${layout.dataset.v2e058EdgeCount} transition(s) · séquence ${seq} · `
      + `${fantomes} fantôme(s) · couverture ${layout.dataset.v2e058Coverage}.`;
  });

  layout.dataset.v2e058Unique = String(IDS.every(id => document.querySelectorAll('[id="' + id + '"]').length <= 1));
  layout.dataset.v2e058Reduced = String(Boolean(ctx.reducedMotion && ctx.reducedMotion()));
});
