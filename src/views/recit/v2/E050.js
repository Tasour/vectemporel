import { register } from './registry.js';

/* V2 lentille E050 — Données, traçabilité et provenance (complément de la passe 1).
   La passe 1 traite déjà l'empreinte du point, la couverture de source, le
   registre des identifiants, le raccourci vers la traçabilité, l'alerte de
   fiabilité, la transparence du filtrage, les répartitions certitudes/origines,
   le miroir machine et le gloss de la pastille. La V2 propose donc dix
   chantiers neufs et distincts, tous dérivés du DOM réellement rendu :
   filiation du repère, provenance visuelle, portée de la recherche, état des
   filtres, lecture intégrale estimée, ancre du point courant, état du dossier
   de traçabilité, vocabulaire documenté, lisibilité des sources et mouvement
   réduit. Aucune valeur n'est inventée, aucun appel réseau, aucun aléa,
   aucune journalisation. Préfixes : classes `recit-v2-e050-`, ids DOM
   `v2-e050-` (jamais les ids `e050-` de la passe 1 qui tourne sur le même DOM).
   Enrichissement strictement non destructif : sans ce module la vue reste
   intégralement lisible et utilisable. */

const CSS = `
/* E050-01 — Filiation du repère : ligne de synthèse sous le kicker. */
.recit-v2-e050-readout{margin:6px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.recit-v2-e050-filiation strong{color:var(--gold-bright);font-weight:700}

/* E050-02 — Provenance visuelle : crédit, licence ou absence d'image. */
.recit-v2-e050-visuelle{color:var(--muted)}

/* E050-03 — Portée de la recherche : requête et effectif interrogeable. */
.recit-v2-e050-recherche{color:var(--muted)}

/* E050-04 — État des filtres actifs, lu sur aria-pressed. */
.recit-v2-e050-filtres{color:var(--muted)}

/* E050-05 — Lecture intégrale estimée : chiffres alignés. */
.recit-v2-e050-lecture{color:var(--muted)}

/* E050-06 — Ancre de navigation du point courant dans le fil. */
.recit-v2-e050-ancre{margin:0 0 6px}

/* E050-07 — État du dossier de traçabilité, actualisé à l'ouverture. */
.recit-v2-e050-trace-etat{color:var(--muted)}

/* E050-08 — Vocabulaire des origines documenté dans la légende. */
.recit-v2-e050-vocabulaire{color:var(--muted)}

/* E050-09 — Lisibilité renforcée des textes de provenance. */
.recit-layout .recit-v2-e050-lisibilite .recit-trace p{line-height:1.7;margin:8px 0;color:var(--ink)}
.recit-layout .recit-v2-e050-lisibilite .recit-sources{line-height:1.6;color:var(--ink)}

/* E050-10 — Mouvement réduit des relevés V2. */
.recit-v2-e050-readout{transition:opacity .2s linear}
.recit-layout[data-v2-e050-motion="reduce"] .recit-v2-e050-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e050-readout{transition:none}}
`;

/* --- utilitaires de lecture, tous gardés --------------------------------- */

function q(root, selector) {
  return root && typeof root.querySelector === 'function'
    ? root.querySelector(selector) : null;
}

function qa(root, selector) {
  return root && typeof root.querySelectorAll === 'function'
    ? Array.from(root.querySelectorAll(selector)) : [];
}

function txt(node) {
  return String((node && node.textContent) || '');
}

function present(node) {
  return Boolean(node && node.nodeType === 1);
}

function ajouteClasse(node, nom) {
  if (present(node) && node.classList && typeof node.classList.add === 'function'
      && !node.classList.contains(nom)) node.classList.add(nom);
}

function safe(fn) {
  try { fn(); } catch { /* neutralisé : la vue reste lisible et inchangée */ }
}

/* Identifiant de repère stable, dérivé du titre réel : aucune composante
   aléatoire, aucune date d'exécution. */
function slug(chaine) {
  return String(chaine || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/* `.recit-meta` = « Titre de l'événement · année · pastille ». */
function lireMeta(meta) {
  const parties = txt(meta).split('·').map((part) => part.trim()).filter(Boolean);
  return { evenement: parties[0] || '', annee: parties[1] || '' };
}

/* `.view-kicker` = « Étape X / Y · type ». */
function lireKicker(kicker) {
  const trouve = txt(kicker).match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
  return trouve ? { position: trouve[1], total: trouve[2] } : { position: '', total: '' };
}

/* Dépose (ou réutilise) un paragraphe visible, juste après une ancre stable.
   Le nœud est retrouvé par id : aucun doublon après reconstruction du DOM. */
function poserParagraphe(el, id, classe, parent, ancre, texte) {
  if (typeof el !== 'function' || !present(parent)
      || typeof parent.insertBefore !== 'function') return null;
  let noeud = typeof document !== 'undefined' ? document.getElementById(id) : null;
  if (!noeud) {
    noeud = el('p', `recit-v2-e050-readout ${classe}`);
    if (!present(noeud)) return null;
    noeud.id = id;
  }
  noeud.textContent = texte;
  const cible = present(ancre) && ancre.parentNode === parent ? ancre.nextSibling : null;
  if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
    parent.insertBefore(noeud, cible);
  }
  return noeud;
}

register('E050', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout
        || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e050', CSS); /* un seul appel, toutes les règles du module. */

    const racine = present(layout) ? layout : (present(stage) ? stage : null);
    if (!racine) return;
    const corps = q(racine, '.recit-body');
    if (!corps) return;

    const poser = (id, classe, parent, ancre, texte) =>
      poserParagraphe(el, id, classe, parent, ancre, texte);
    const meta = q(corps, '.recit-meta');
    const kicker = q(corps, '.view-kicker');
    const { evenement, annee } = lireMeta(meta);
    const { total } = lireKicker(kicker);

    safe(() => {
      /* E050-01 — Filiation du repère : titre, année, effectif et référence
         stable, tous lus dans la coque courante. */
      if (!evenement) return;
      const ref = slug(evenement);
      const texte = `Filiation des données : repère « ${evenement} »`
        + (annee ? ` · année ${annee}` : '')
        + (total ? ` · ${total} points` : '')
        + (ref ? ` · réf. ${ref}${annee ? '-' + slug(annee) : ''}` : '') + '.';
      poser('v2-e050-filiation', 'recit-v2-e050-filiation', corps, kicker, texte);
    });

    safe(() => {
      /* E050-02 — Provenance visuelle : crédit/licence de l'image, ou le
         message « aucune image vérifiée » déjà rendu par la vue. */
      const credit = q(racine, '.recit-media-credit');
      const vide = q(racine, '.media-empty');
      let texte = '';
      if (present(credit)) texte = `Provenance visuelle : ${txt(credit)}.`;
      else if (present(vide)) texte = `Provenance visuelle : ${txt(vide)}.`;
      if (!texte) return;
      poser('v2-e050-visuelle', 'recit-v2-e050-visuelle', corps, meta, texte);
    });

    safe(() => {
      /* E050-03 — Portée de la recherche : valeur saisie et effectif porté
         par l'aria-label du champ, avec repli sur le total du kicker. */
      const recherche = q(racine, '#c3a-search');
      if (!present(recherche)) return;
      const label = String(recherche.getAttribute('aria-label') || '');
      const trouve = label.match(/(\d+)\s*points/);
      const n = trouve ? trouve[1] : total;
      if (!n) return;
      const valeur = String(recherche.value || '').trim();
      const texte = valeur
        ? `Recherche active : « ${valeur} » · ${n} points interrogeables.`
        : `Aucune recherche active · ${n} points interrogeables.`;
      poser('v2-e050-recherche', 'recit-v2-e050-recherche', corps,
        q(corps, '#c3a-status'), texte);
    });

    safe(() => {
      /* E050-04 — État des filtres actifs : aria-pressed des groupes Type et
         Certitude, en excluant les boutons « tous » (data-fk *-all). */
      const groupes = qa(corps, '.c3a-group');
      const actifs = [];
      groupes.forEach((groupe) => {
        const legende = txt(q(groupe, '.c3a-group-label')).trim();
        qa(groupe, '.c3a-filter[aria-pressed="true"]').forEach((bouton) => {
          const fk = String(bouton.getAttribute('data-fk') || '');
          if (/-all$/.test(fk)) return;
          const libelle = txt(bouton).trim();
          if (libelle) actifs.push(`${legende} = ${libelle}`);
        });
      });
      const texte = actifs.length
        ? `Filtres actifs : ${actifs.join(' · ')}.`
        : 'Aucun filtre actif : repère affiché intégralement.';
      poser('v2-e050-filtres', 'recit-v2-e050-filtres', corps,
        q(corps, '#c3a-tools'), texte);
    });

    safe(() => {
      /* E050-05 — Lecture intégrale estimée : secondes réelles du point
         courant multipliées par le nombre réel de points du repère. */
      const timing = q(corps, '.recit-timing');
      const trouve = txt(timing).match(/≈\s*(\d+)\s*s/);
      if (!trouve || !total) return;
      const secondes = Number(trouve[1]) * Number(total);
      if (!secondes) return;
      const minutes = Math.floor(secondes / 60);
      const reste = secondes % 60;
      const texte = `Lecture intégrale estimée : ≈ ${secondes} s (${minutes} min ${reste} s) pour ${total} points.`;
      poser('v2-e050-lecture', 'recit-v2-e050-lecture', corps, timing, texte);
    });

    safe(() => {
      /* E050-06 — Ancre de navigation du point courant : data-fk de l'item
         actif et position de son aria-label, sans toucher au fil. */
      const fil = q(corps, '.recit-thread');
      const item = (fil && q(fil, '.recit-thread-item[aria-current="step"]'))
        || (fil && q(fil, '.recit-thread-item.is-current'));
      if (!present(item)) return;
      const fk = String(item.getAttribute('data-fk') || '');
      const aria = String(item.getAttribute('aria-label') || '');
      const pos = aria.match(/Point\s+(\d+)\s+sur\s+(\d+)/i);
      const texte = `Ancre du point courant : ${fk || 'non renseignée'}`
        + (pos ? ` · position ${pos[1]} sur ${pos[2]}` : '') + '.';
      poser('v2-e050-ancre', 'recit-v2-e050-ancre', fil,
        q(fil, '.recit-thread-title'), texte);
    });

    safe(() => {
      /* E050-07 — État du dossier de traçabilité : lu sur .open et actualisé
         par un écouteur 'toggle' posé une seule fois par <details>. */
      const trace = q(corps, '.recit-trace');
      const sources = q(corps, '.recit-sources');
      if (!present(trace) && !present(sources)) return;
      const ancre = present(trace) ? trace : sources;
      const lire = () => present(trace)
        ? `Dossier de traçabilité : ${trace.open ? 'ouvert' : 'fermé'} · ${txt(q(trace, 'summary')).trim()}.`
        : 'Dossier de traçabilité : aucun dossier local attaché à ce point.';
      const noeud = poser('v2-e050-trace-etat', 'recit-v2-e050-trace-etat',
        corps, ancre, lire());
      if (present(trace) && present(noeud)
          && !trace.getAttribute('data-v2-e050-ecoute')) {
        trace.setAttribute('data-v2-e050-ecoute', '1');
        const maj = () => {
          try {
            const cible = document.getElementById('v2-e050-trace-etat');
            if (present(cible)) cible.textContent = lire();
          } catch { /* le dossier reste lisible sans actualisation */ }
        };
        trace.addEventListener('toggle', maj);
      }
    });

    safe(() => {
      /* E050-08 — Vocabulaire des origines réellement documenté dans la
         légende, compté sur les quatre libellés connus du jeu de données. */
      const legend = q(corps, '.recit-legend');
      if (!present(legend)) return;
      const contenu = txt(legend);
      const origines = ['récit', 'figure', 'lieu', 'audit']
        .filter((mot) => new RegExp('\\b' + mot + '\\b', 'i').test(contenu));
      if (!origines.length) return;
      const texte = `Vocabulaire documenté : ${origines.length} origines déclarées dans la légende (${origines.join(', ')}).`;
      poser('v2-e050-vocabulaire', 'recit-v2-e050-vocabulaire', corps, legend, texte);
    });

    safe(() => {
      /* E050-09 — Lisibilité des textes de provenance : classe portée par
         .recit-body, règles scoped sous .recit-layout, aucun texte retiré. */
      ajouteClasse(corps, 'recit-v2-e050-lisibilite');
    });

    safe(() => {
      /* E050-10 — Mouvement réduit : préférence lue une fois par rendu et
         reportée sur un attribut propre à la V2. */
      let reduce = false;
      try { reduce = Boolean(typeof reducedMotion === 'function' && reducedMotion()); }
      catch { reduce = false; }
      layout.setAttribute('data-v2-e050-motion', reduce ? 'reduce' : 'normal');
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
