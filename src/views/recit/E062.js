import { register } from './registry.js';

/* Lentille E062 — Hiérarchie visuelle et informationnelle (vue Récit).
 *
 * Dix chantiers E062-01 … E062-10, tous implémentés ici. Rapport :
 * UNIFIED_AUDIT/RECIT/views/E062.md. Lectures seules : recit.js,
 * styles.css, registry.js, index.js. Jeu de données : 901 points,
 * kind ∈ {récit, figure, lieu, audit}, confidence ∈ {vérifié, certain,
 * probable, disputed}, 587 points sans source.
 *
 * Greffon strictement non destructif : une seule feuille de style, une seule
 * classe racine, des classes préfixées recit-e062-, des attributs data-e062-*
 * et quelques nœuds purement additionnels (fil d'Ariane, libellés de groupes,
 * repère de progression, lecture chiffrée, titre de légende). Aucun texte
 * existant n'est remplacé, aucun gestionnaire existant n'est réattribué,
 * aucun nœud n'est retiré. Sans JavaScript, la vue reste intégralement lisible.
 *
 * Aucun appel réseau, aucune sortie de débogage, aucun aléa, aucun timer,
 * aucune animation par image. Tous les ids créés sont préfixés e062- et
 * uniques par rendu.
 */

const CSS = `
/* E062-01 — fil d'Ariane : niveau « où suis-je » au-dessus du point. */
.recit-e062-fil-ariane{margin:0 0 9px}
.recit-e062-fil-ariane-liste{display:flex;flex-wrap:wrap;gap:6px;margin:0;padding:0;list-style:none;color:var(--muted-2);font-size:9px;line-height:1.4}
.recit-e062-fil-ariane-item:not(:last-child)::after{content:'\\203A';margin-left:6px;color:var(--gold)}
.recit-e062-fil-ariane-item[aria-current="page"]{color:var(--gold-bright);font-weight:600}

/* E062-02 — outline numérotée des blocs : repère dollar en haut à droite. */
.recit-e062-numero{position:relative}
.recit-e062-numero::before{content:'\\00A7 ' attr(data-e062-seq);position:absolute;right:4px;top:2px;color:var(--muted-2);font-size:8px;letter-spacing:.06em;font-variant-numeric:tabular-nums;pointer-events:none}

/* E062-03 — rails d'indenture : la profondeur est portée par le retrait. */
.recit-e062-profondeur-1{margin-left:var(--e062-retrait);padding-left:10px;border-left:1px solid var(--line)}
.recit-e062-profondeur-2{margin-left:calc(var(--e062-retrait) * 2);padding-left:10px;border-left:1px solid var(--e062-or)}
.recit-e062-profondeur-3{margin-left:calc(var(--e062-retrait) * 3);padding-left:10px;border-left:1px dashed var(--line-strong)}

/* E062-04 — progression segmentée et lecture chiffrée. */
.recit-e062-progression{position:relative}
.recit-e062-progression::after{content:'';position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(90deg,transparent 0 calc(100% / var(--e062-steps, 12) - 1px),rgba(0,0,0,.45) calc(100% / var(--e062-steps, 12) - 1px) calc(100% / var(--e062-steps, 12)))}
.recit-e062-progression-lecture{margin:3px 0 0;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}

/* E062-05 — outline sémantique : étiquettes de section nommées. */
.recit-e062-titre-section{margin:0 0 6px;color:var(--gold-bright);font-size:9px;font-weight:600;letter-spacing:.11em;text-transform:uppercase}

/* E062-06 — hiérarchie des types dans le fil (forme, pas couleur seule). */
.recit-e062-type .thread-kind{font-size:9px;letter-spacing:.08em;text-transform:uppercase}
.recit-e062-type[data-e062-type="récit"] .thread-kind{font-weight:700;color:var(--gold-bright)}
.recit-e062-type[data-e062-type="figure"] .thread-kind{font-style:normal;color:var(--ink-soft)}
.recit-e062-type[data-e062-type="lieu"] .thread-kind{font-style:italic;color:var(--muted)}
.recit-e062-type[data-e062-type="audit"] .thread-kind{font-weight:600;letter-spacing:.14em;color:var(--muted-2)}

/* E062-07 — groupement des commandes : navigation / changement de vue. */
.recit-e062-etiquette{align-self:center;padding:0 2px;color:var(--muted-2);font-size:8px;letter-spacing:.12em;text-transform:uppercase;white-space:nowrap}
.recit-e062-separateur{align-self:stretch;width:1px;min-height:24px;margin:0 4px;background:var(--line-strong)}

/* E062-08 — lettrine d'entrée sur le chapeau du repère. */
.recit-e062-lettrine::first-letter{float:left;margin:2px 8px 0 0;color:var(--gold-bright);font-size:2.5em;font-weight:700;line-height:.86}

/* E062-09 — statut de traçabilité : documenté / sans source. */
.recit-e062-source::before{display:inline-block;margin-right:7px;padding:1px 7px;border:1px solid var(--line-strong);border-radius:999px;color:var(--gold-bright);font-size:8px;letter-spacing:.06em;vertical-align:1px;content:attr(data-e062-source)}
.recit-e062-source[data-e062-source="Sans source"]::before{color:var(--muted-2);border-style:dashed}

/* E062-10 — repli responsive et mouvement réduit. */
@media (max-width:620px){
  .recit-e062-fil-ariane-liste{font-size:8px;gap:4px}
  .recit-e062-lettrine::first-letter{font-size:1.6em;margin-right:5px}
  .recit-e062-etiquette{display:none}
}
.recit-layout[data-e062-motion="reduce"] .recit-e062-numero::before,
.recit-layout[data-e062-motion="reduce"] .recit-e062-source::before{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e062-numero::before,.recit-e062-source::before{transition:none}
}
`;

function q(root, selector) {
  return root && typeof root.querySelector === 'function' ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector))
    : [];
}

function addCls(noeud, nom) {
  if (noeud && noeud.classList && typeof noeud.classList.add === 'function'
      && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

function attr(noeud, nom, valeur) {
  if (noeud && typeof noeud.setAttribute === 'function') noeud.setAttribute(nom, String(valeur));
}

function texte(noeud) {
  return noeud && typeof noeud.textContent === 'string' ? noeud.textContent.trim() : '';
}

/* Extrait « Étape X / Y · type » du surtitre existant, sans le modifier. */
function lireEtape(kicker) {
  const brut = texte(kicker);
  const n = /Étape\s+(\d+)\s*\/\s*(\d+)/i.exec(brut);
  const type = /·\s*([^·]+)$/.exec(brut);
  return {
    brut,
    index: n ? parseInt(n[1], 10) : 0,
    total: n ? parseInt(n[2], 10) : 0,
    kind: type ? type[1].trim() : '',
  };
}

/* Le premier segment de la meta (« Titre · année · certitude ») est le repère. */
function lireRepere(meta) {
  const t = texte(meta);
  return t ? t.split('·')[0].trim() : '';
}

register('E062', (ctx) => {
  try {
    if (!ctx || typeof document === 'undefined') return;
    const { stage, layout, css, el, reducedMotion } = ctx;
    if (typeof css === 'function') css('recit-e062', CSS); /* un seul bloc CSS. */

    const root = layout || stage;
    if (!root || typeof root.querySelector !== 'function') return;
    addCls(root, 'recit-e062-racine');

    const body = q(root, '.recit-body');
    const kicker = q(root, '.view-kicker');
    const meta = q(root, '.recit-meta');
    const contexte = q(root, '#recit-context') || q(root, '.recit-context');
    const timing = q(root, '.recit-timing');
    const progress = q(root, '.recit-progress');
    const fil = q(root, '.recit-thread');
    const titreFil = q(root, '.recit-thread-title');
    const legend = q(root, '.recit-legend');
    const trace = q(root, '.recit-trace');
    const sources = q(root, '.recit-sources');
    const actions = q(root, '.recit-actions');
    const etape = lireEtape(kicker);

    if (etape.total > 0) {
      attr(root, 'data-e062-total', etape.total);
      attr(root, 'data-e062-index', etape.index);
    }

    /* E062-01 — fil d'Ariane hiérarchique, inséré avant le surtitre. */
    if (body && typeof el === 'function' && !q(root, '#e062-breadcrumb')) {
      const filAriane = el('nav', 'recit-e062-fil-ariane');
      filAriane.id = 'e062-breadcrumb';
      filAriane.setAttribute('aria-label', 'Hiérarchie du récit');
      const liste = el('ol', 'recit-e062-fil-ariane-liste');
      const niveaux = ['Récit guidé', lireRepere(meta) || 'Repère', etape.brut || 'Étape en cours'];
      niveaux.forEach((nom, i) => {
        const item = el('li', 'recit-e062-fil-ariane-item', nom);
        if (i === niveaux.length - 1) item.setAttribute('aria-current', 'page');
        liste.appendChild(item);
      });
      filAriane.appendChild(liste);
      if (kicker && kicker.parentNode === body) body.insertBefore(filAriane, kicker);
      else body.insertBefore(filAriane, body.firstChild);
    }

    /* E062-02 — outline numérotée des quatre blocs majeurs du récit. */
    const blocs = [];
    if (contexte) blocs.push(contexte);
    if (fil) blocs.push(fil);
    if (trace || sources) blocs.push(trace || sources);
    if (legend) blocs.push(legend);
    blocs.forEach((bloc, i) => {
      addCls(bloc, 'recit-e062-numero');
      attr(bloc, 'data-e062-seq', String(i + 1).padStart(2, '0'));
    });

    /* E062-03 — rails d'indenture : retrait croissant = profondeur croissante. */
    addCls(timing, 'recit-e062-profondeur-1');
    if (legend) qa(legend, 'p').forEach((p) => addCls(p, 'recit-e062-profondeur-2'));
    addCls(sources, 'recit-e062-profondeur-3');

    /* E062-04 — barre segmentée et lecture chiffrée de la position. */
    if (progress) {
      addCls(progress, 'recit-e062-progression');
      if (etape.total > 0) {
        attr(progress, 'data-e062-index', etape.index);
        attr(progress, 'data-e062-total', etape.total);
        if (progress.style && typeof progress.style.setProperty === 'function') {
          progress.style.setProperty('--e062-steps', String(etape.total));
        }
      }
      if (body && typeof el === 'function' && !q(root, '#e062-progression-lecture')) {
        const pct = etape.total > 0 ? Math.round((etape.index / etape.total) * 100) : 0;
        const lecture = el('p', 'recit-e062-progression-lecture', etape.total > 0
          ? `Position ${etape.index} sur ${etape.total} · ${pct} % du repère parcouru.`
          : 'Progression du repère.');
        lecture.id = 'e062-progression-lecture';
        lecture.setAttribute('aria-hidden', 'true'); /* la région live existante annonce déjà le point. */
        if (progress.parentNode) progress.parentNode.insertBefore(lecture, progress.nextSibling);
        else body.appendChild(lecture);
      }
    }

    /* E062-05 — outline sémantique pour les lecteurs d'écran. */
    if (titreFil) {
      addCls(titreFil, 'recit-e062-titre-section');
      attr(titreFil, 'role', 'heading');
      attr(titreFil, 'aria-level', '2');
    }
    if (legend) {
      const deja = q(legend, '[role="heading"], .recit-e002-section-label');
      if (deja) {
        attr(deja, 'role', 'heading');
        attr(deja, 'aria-level', '2');
      } else if (typeof el === 'function') {
        const titreLegende = el('p', 'recit-e062-titre-section', 'Repères et raccourcis');
        titreLegende.setAttribute('role', 'heading');
        titreLegende.setAttribute('aria-level', '2');
        legend.insertBefore(titreLegende, legend.firstChild);
      }
    }

    /* E062-06 — les types du fil se distinguent par la forme, pas la couleur seule. */
    qa(root, '.recit-thread-item').forEach((item) => {
      const kind = item.getAttribute('data-kind') || 'point';
      addCls(item, 'recit-e062-type');
      attr(item, 'data-e062-type', kind);
    });

    /* E062-07 — groupement des commandes : navigation du point / changement de vue. */
    if (actions && typeof el === 'function') {
      const boutons = qa(actions, 'button');
      const parFk = (fk) => boutons.find((b) => b && b.getAttribute('data-fk') === fk) || null;
      const nav = parFk('c3a-prev');
      const vues = parFk('c3a-next-event');
      boutons.forEach((b) => {
        const fk = b.getAttribute('data-fk') || '';
        attr(b, 'data-e062-groupe', fk === 'c3a-next-event' || fk === 'c3a-chrono' ? 'vues' : 'navigation');
      });
      if (nav && !q(actions, '[data-e062-label="nav"]')) {
        const lab = el('span', 'recit-e062-etiquette', 'Navigation du point');
        lab.setAttribute('data-e062-label', 'nav');
        actions.insertBefore(lab, nav);
      }
      if (vues && !q(actions, '#e062-separateur')) {
        const sep = el('span', 'recit-e062-separateur');
        sep.id = 'e062-separateur';
        sep.setAttribute('aria-hidden', 'true');
        const lab = el('span', 'recit-e062-etiquette', 'Changer de vue');
        lab.setAttribute('data-e062-label', 'vues');
        actions.insertBefore(sep, vues);
        actions.insertBefore(lab, vues);
      }
    }

    /* E062-08 — lettrine d'entrée sur le chapeau (réduite sur mobile). */
    addCls(contexte, 'recit-e062-lettrine');

    /* E062-09 — statut de traçabilité explicite, y compris pour les 587 sans source. */
    if (trace) {
      addCls(trace, 'recit-e062-source');
      attr(trace, 'data-e062-source', 'Documenté');
    }
    if (sources) {
      addCls(sources, 'recit-e062-source');
      attr(sources, 'data-e062-source', 'Sans source');
    }

    /* E062-10 — préférence de mouvement lue une seule fois par rendu. */
    let reduit = false;
    try { reduit = typeof reducedMotion === 'function' && reducedMotion(); }
    catch { reduit = false; }
    attr(root, 'data-e062-motion', reduit ? 'reduce' : 'normal');
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
