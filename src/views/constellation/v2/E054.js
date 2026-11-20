import { register } from './registry.js';

/* Lentille V2 E054 — structure sémantique du focus et de la tabulation de la
   vue Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e054 (aucune collision avec la passe 1). */

/* Exécution défensive : un écueil local ne neutralise pas les neuf autres. */
function safe(action) {
  try { action(); } catch (erreur) { /* silence voulu, sans journalisation */ }
}

/* Ajout d'un jeton d'attribut sans écraser une valeur déjà portée. */
function ajouterJeton(node, attribut, jeton) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const jetons = (node.getAttribute(attribut) || '').split(/\s+/).filter(Boolean);
  if (jetons.indexOf(jeton) === -1) jetons.push(jeton);
  node.setAttribute(attribut, jetons.join(' '));
}

/* Empreinte FNV-1a 32 bits : déterministe, sans horloge ni tirage. */
function empreinte(source) {
  let h = 0x811c9dc5;
  for (let i = 0; i < source.length; i += 1) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/* Ramassage tolérant d'un DOM incomplet. */
function collect(root, selecteur) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selecteur)) : [];
}

/* Nom accessible indirectement porté par un aria-labelledby. */
function nomReference(node) {
  if (!node || typeof node.getAttribute !== 'function') return '';
  const identifiants = (node.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
  if (typeof document === 'undefined') return '';
  return identifiants.map((id) => {
    const cible = document.getElementById(id);
    return cible && typeof cible.textContent === 'string' ? cible.textContent.trim() : '';
  }).join(' ');
}

const COUCHES = [
  { code: 'suns', selecteur: '.const-layer-suns' },
  { code: 'planets', selecteur: '.const-layer-planets' },
  { code: 'moons', selecteur: '.const-layer-moons' },
];

register('E054', ctx => {
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof document === 'undefined') return;
  const layout = ctx.layout;
  const css = ctx.css;

  /* Fabrique d'éléments avec repli sur le DOM natif si ctx.el est absent. */
  const fabriquer = (tag, classe, texte) => {
    let noeud;
    try { noeud = typeof ctx.el === 'function' ? ctx.el(tag, classe, texte) : document.createElement(tag); }
    catch (erreur) { noeud = document.createElement(tag); }
    if (classe && !noeud.className) noeud.className = classe;
    if (texte !== undefined && !noeud.textContent) noeud.textContent = texte;
    return noeud;
  };

  /* Feuille unique de la lentille, portée à la vue, sans ressource distante. */
  safe(() => css('constellation-v2-e054', `
    .v2e054-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
    .constellation-layout[data-v2e054-field-focus="inside"] [data-v2e054-role]:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
    .constellation-layout [data-v2e054-corrected="1"]{text-decoration:underline dotted var(--muted-2)}
  `));

  const field = layout.querySelector('.constellation-field');
  const caption = layout.querySelector('.constellation-caption');
  const title = layout.querySelector('.constellation-title');
  const note = layout.querySelector('.constellation-note');
  const stops = collect(layout, 'button, [href], [tabindex]').filter((node) =>
    node && node.nodeType === 1 && !node.hasAttribute('disabled') &&
    node.getAttribute('aria-hidden') !== 'true');

  /* E054-01 — Landmarks de lecture du champ et du récapitulatif. */
  safe(() => {
    if (title && !title.id) title.id = 'v2e054-title';
    if (field) {
      if (title && title.id) ajouterJeton(field, 'aria-labelledby', title.id);
      field.dataset.v2e054Landmark = field.getAttribute('role') || 'group';
    }
    if (caption) {
      if (!caption.getAttribute('role')) caption.setAttribute('role', 'complementary');
      if (!caption.getAttribute('aria-label')) {
        caption.setAttribute('aria-label', 'Récapitulatif de la constellation : ère, repère et point');
      }
      caption.dataset.v2e054Landmark = caption.getAttribute('role');
    }
    const champ = field ? `champ:${field.dataset.v2e054Landmark}` : 'champ:absent';
    const resumer = caption ? `récapitulatif:${caption.dataset.v2e054Landmark}` : 'récapitulatif:absent';
    layout.dataset.v2e054Landmarks = `${champ} · ${resumer}`;
  });

  /* E054-02 — Registre des raccourcis clavier déclarés sur chaque couche. */
  safe(() => {
    const touches = [
      'ArrowLeft ArrowRight ArrowUp ArrowDown Home End',
      'ArrowLeft ArrowRight',
      'ArrowLeft ArrowRight',
    ];
    const enregistres = [];
    COUCHES.forEach((modele, index) => {
      const couche = field && field.querySelector(modele.selecteur);
      if (!couche) return;
      ajouterJeton(couche, 'aria-keyshortcuts', touches[index]);
      couche.dataset.v2e054Keys = touches[index].replace(/\s+/g, ',');
      enregistres.push(`${modele.code}:${touches[index].split(/\s+/).length}`);
    });
    layout.dataset.v2e054KeyRegistry = enregistres.join('|');
  });

  /* E054-03 — Audit des marqueurs courants, un seul par couche attendu. */
  safe(() => {
    const bilan = [];
    COUCHES.forEach((modele) => {
      const couche = field && field.querySelector(modele.selecteur);
      if (!couche) return;
      const marques = collect(couche, '[aria-current="true"], .is-active');
      couche.dataset.v2e054Current = String(marques.length);
      couche.dataset.v2e054CurrentState = marques.length === 1
        ? 'unique' : (marques.length === 0 ? 'aucun' : 'multiple');
      bilan.push(`${modele.code}:${marques.length}`);
    });
    layout.dataset.v2e054CurrentAudit = bilan.join('|');
  });

  /* E054-04 — Frontière de tabulation du champ, annoncée sans minuteur. */
  safe(() => {
    if (!field) return;
    let live = layout.querySelector('#v2e054-boundary-live');
    if (!live) {
      live = fabriquer('p', 'v2e054-sr', '');
      live.id = 'v2e054-boundary-live';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      layout.appendChild(live);
    }
    if (field.dataset.v2e054BoundaryBound === '1') return;
    field.dataset.v2e054BoundaryBound = '1';
    let dedans = false;
    let entrees = 0;
    let sorties = 0;
    field.addEventListener('focusin', (event) => {
      const cible = event && event.target;
      if (!cible || cible.nodeType !== 1 || !field.contains(cible)) return;
      if (dedans) return;
      dedans = true;
      entrees += 1;
      field.dataset.v2e054FieldFocus = 'inside';
      field.dataset.v2e054Entries = String(entrees);
      const nom = cible.getAttribute('aria-label') || (cible.textContent || '').trim() || 'contrôle';
      live.textContent = `Entrée dans la constellation : ${nom}. Tab parcourt les arrêts.`;
    });
    field.addEventListener('focusout', (event) => {
      const suite = event && event.relatedTarget;
      if (suite && suite.nodeType === 1 && field.contains(suite)) return;
      if (!dedans) return;
      dedans = false;
      sorties += 1;
      field.dataset.v2e054FieldFocus = 'outside';
      field.dataset.v2e054Exits = String(sorties);
      live.textContent = 'Sortie de la constellation : le focus est au récapitulatif ou hors de la vue.';
    });
  });

  /* E054-05 — Liaison des points vérifiés à la note explicative. */
  safe(() => {
    if (!note) return;
    if (!note.id) note.id = 'v2e054-note';
    let lies = 0;
    const couche = field && field.querySelector('.const-layer-moons');
    const points = couche ? collect(couche, 'button') : [];
    points.forEach((point) => {
      if (!point.hasAttribute('aria-details')) point.setAttribute('aria-details', note.id);
      point.dataset.v2e054Details = note.id;
      lies += 1;
    });
    layout.dataset.v2e054Details = String(lies);
  });

  /* E054-06 — Ordre canonique des couches dans le document. */
  safe(() => {
    const classeVersCode = {
      'const-layer-suns': 'suns',
      'const-layer-planets': 'planets',
      'const-layer-moons': 'moons',
    };
    const presents = [];
    collect(field, '.const-layer').forEach((couche) => {
      Object.keys(classeVersCode).forEach((classe) => {
        if (couche.classList && couche.classList.contains(classe)) presents.push(classeVersCode[classe]);
      });
    });
    const ordre = presents.join('>');
    layout.dataset.v2e054LayerOrder = ordre;
    layout.dataset.v2e054Canonical = ordre === 'suns>planets>moons' ? 'oui' : 'non';
  });

  /* E054-07 — Contrôle des libellés accessibles des arrêts. */
  safe(() => {
    const sansNom = [];
    let corriges = 0;
    stops.forEach((node, index) => {
      const label = (node.getAttribute('aria-label') || '').trim();
      const titre = (node.getAttribute('title') || '').trim();
      const texte = (node.textContent || '').trim();
      const reference = nomReference(node);
      if (label || titre || texte || reference) {
        node.dataset.v2e054Named = '1';
        return;
      }
      const correctif = fabriquer('span', 'v2e054-sr',
        `Arrêt ${index + 1} : contrôle sans libellé, décrit par la note de la constellation.`);
      correctif.id = `v2e054-name-${index + 1}`;
      layout.appendChild(correctif);
      ajouterJeton(node, 'aria-describedby', correctif.id);
      node.dataset.v2e054Corrected = '1';
      corriges += 1;
      sansNom.push(node.dataset.constKey || `arret:${index + 1}`);
    });
    layout.dataset.v2e054Named = String(stops.length - corriges);
    layout.dataset.v2e054Unnamed = sansNom.join('|');
    layout.dataset.v2e054Corrected = String(corriges);
  });

  /* E054-08 — Type sémantique effectif de chaque arrêt. */
  safe(() => {
    const comptes = {};
    stops.forEach((node) => {
      const role = node.getAttribute('role') || (node.tagName === 'A' ? 'link' : 'button');
      node.dataset.v2e054Role = role;
      comptes[role] = (comptes[role] || 0) + 1;
    });
    layout.dataset.v2e054RoleMap = Object.keys(comptes)
      .map((role) => `${role}=${comptes[role]}`).join('|');
  });

  /* E054-09 — Détection des pièges de focus : focusables masqués. */
  safe(() => {
    const pieges = [];
    collect(layout, '[tabindex], button, a[href]').forEach((node) => {
      const masque = node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('hidden') ||
        (node.style && /display\s*:\s*none/.test(node.style.cssText || ''));
      if (!masque) return;
      const brut = node.getAttribute('tabindex');
      const reellementFocus = node.hasAttribute('tabindex') ? Number(brut) >= 0 : true;
      if (!reellementFocus) return;
      const cle = node.dataset.constKey || node.id || node.tagName.toLowerCase();
      pieges.push(cle);
      node.dataset.v2e054Trap = '1';
    });
    layout.dataset.v2e054TrapCount = String(pieges.length);
    layout.dataset.v2e054Traps = pieges.join('|');
  });

  /* E054-10 — Ancre de focus stable entre deux rendus. */
  safe(() => {
    const actifs = stops.filter((node) =>
      node.getAttribute('aria-current') === 'true' ||
      (node.classList && node.classList.contains('is-active')));
    const clefs = actifs.map((node) => node.dataset.constKey || 'sans-cle');
    const ancre = clefs.length ? `ancre:${clefs.join('>')}` : 'ancre:vide';
    const empreinteAncre = empreinte(ancre);
    layout.dataset.v2e054Anchor = ancre;
    layout.dataset.v2e054AnchorHash = empreinteAncre;
    try {
      if (typeof window !== 'undefined') {
        window.__v2e054_anchor = { cle: ancre, hash: empreinteAncre };
      }
    } catch (erreur) { /* stockage indisponible : l'ancre reste sur le layout */ }
    layout.dataset.v2e054Applied = '1';
  });
});
