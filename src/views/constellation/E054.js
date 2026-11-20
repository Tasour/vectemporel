import { register } from './registry.js';

/* Lentille E054 — structure sémantique appliquée au focus et à la tabulation
   de la vue Constellation. Dix chantiers locaux et complémentaires : inventaire
   des arrêts, groupes nommés, descriptions partagées, ordre explicite, annonces
   live, repères visuels, évitement, mémoire de retour, cohérence et bilan.
   Aucun appel réseau, aucune source aléatoire, aucun minuteur ni boucle
   d'animation propre ; aucun fichier partagé n'est modifié. */

const LIVE_ID = 'e054-live';
const HELP_ID = 'e054-focus-help';
const SKIP_ID = 'e054-skip';
const STATE_ID = 'e054-state';
const REPORT_ID = 'e054-report';

const GROUPES = [
  { selecteur: '.const-layer-suns', code: 'suns', nom: 'ères', titre: 'Ères' },
  { selecteur: '.const-layer-planets', code: 'planets', nom: 'repères', titre: 'Repères' },
  { selecteur: '.const-layer-moons', code: 'moons', nom: 'points vérifiés', titre: 'Points' },
];

/* Exécution défensive : un chantier défaillant ne neutralise pas les autres. */
function safe(action) {
  try { action(); } catch (erreur) { /* silence voulu, sans journalisation */ }
}

/* Ajout d'un jeton d'attribut sans écraser une valeur déjà portée. */
function ajouterJeton(node, attribut, jeton) {
  if (!node || typeof node.getAttribute !== 'function') return;
  const jetons = (node.getAttribute(attribut) || '').split(/\s+/).filter(Boolean);
  if (jetons.indexOf(jeton) !== -1) return;
  jetons.push(jeton);
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

function libelle(node) {
  if (!node) return '';
  return node.getAttribute('aria-label') || node.dataset.label || node.textContent || '';
}

function cibleFocus(event) {
  const source = event && event.target;
  if (!source || source.nodeType !== 1 || typeof source.closest !== 'function') return null;
  return source.closest('[data-e054-step]');
}

register('E054', (ctx) => {
  /* Garde d'entrée : aucun ajout au DOM sans layout exploitable. */
  if (!ctx || !ctx.layout || typeof ctx.layout.querySelectorAll !== 'function') return;
  if (typeof ctx.css !== 'function' || typeof ctx.el !== 'function') return;
  if (typeof document === 'undefined') return;
  const layout = ctx.layout;
  const fabriquer = (tag, cls, text) => ctx.el(tag, cls, text);

  /* Feuille unique de la lentille, portée à la vue, sans ressource distante. */
  safe(() => ctx.css('constellation-e054', `
.e054-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-layout [data-e054-step]{outline:none}
.constellation-layout [data-e054-step]:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.constellation-layout [data-e054-step]::after{content:attr(data-e054-step);position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);padding:1px 3px;border:1px solid var(--line);border-radius:4px;background:var(--surface-2);color:var(--gold-bright);font-size:8px;line-height:1;white-space:nowrap;opacity:0;pointer-events:none}
.constellation-layout [data-e054-step]:focus-visible::after{opacity:1}
.constellation-layout.e054-divergent [data-e054-step]:focus-visible{outline-style:dashed}
.constellation-layout.e054-aligned [data-e054-step]:focus-visible{outline-style:solid}
.e054-skip{position:absolute;left:10px;top:-64px;z-index:9;min-height:36px;padding:0 12px;border:1px solid var(--gold);border-radius:8px;background:var(--surface-2);color:var(--gold-bright);font-size:10px;cursor:pointer}
.e054-skip:focus-visible{top:8px}
.e054-report{margin:6px 0 0;color:var(--muted-2);font-size:9px;font-variant-numeric:tabular-nums}
.e054-calm [data-e054-step]:focus-visible::after{opacity:1}
@media (prefers-reduced-motion: reduce){.e054-skip{transition:none!important}}
`));

  /* E054-01 — Inventaire déterministe des arrêts : la séquence de tabulation est lue une seule fois, ordonnée et publiée sur le layout. */
  let arrets = [];
  safe(() => {
    arrets = Array.prototype.filter.call(
      layout.querySelectorAll('button, [href], [tabindex]'),
      (node) => node && node.nodeType === 1 &&
        !node.hasAttribute('disabled') &&
        node.getAttribute('aria-hidden') !== 'true'
    );
    const cles = arrets.map((node, index) => node.dataset.constKey || `arret:${index + 1}`);
    layout.dataset.e054TabOrder = cles.join('|');
    layout.dataset.e054TabCount = String(arrets.length);
    layout.dataset.e054View = String(ctx.viewId || 'constellation');
  });

  /* E054-02 — Groupes nommés : un titre caché par couche devient l'unique source du nom accessible, sans écraser le rôle existant. */
  const groupes = [];
  safe(() => {
    GROUPES.forEach((modele, index) => {
      const couche = layout.querySelector(modele.selecteur);
      if (!couche) return;
      const titre = fabriquer('p', 'e054-sr',
        `${modele.titre} : groupe ${index + 1} sur ${GROUPES.length} — ` +
        `${couche.querySelectorAll('button').length} arrêt(s). ` +
        (couche.getAttribute('aria-label') || ''));
      titre.id = `e054-label-${modele.code}`;
      couche.appendChild(titre);
      ajouterJeton(couche, 'aria-labelledby', titre.id);
      if (!couche.hasAttribute('role')) couche.setAttribute('role', 'group');
      couche.dataset.e054Group = modele.code;
      couche.dataset.e054GroupRank = String(index + 1);
      couche.dataset.e054GroupName = modele.nom;
      groupes.push({
        code: modele.code, titre: modele.titre, couche, rang: index + 1, id: titre.id,
      });
    });
    layout.dataset.e054Groups = String(groupes.length);
  });

  /* E054-03 — Descriptions de focus partagées : un nœud d'aide unique est relié à chaque arrêt sans écraser une description existante. */
  safe(() => {
    let aide = layout.querySelector('#' + HELP_ID);
    if (!aide) {
      aide = fabriquer('p', 'e054-sr',
        'Tab : arrêt suivant. Maj+Tab : arrêt précédent. Flèches : changer d’ère ou de repère dans le groupe. Entrée : ouvrir le détail. Le focus reste visible et annoncé.');
      aide.id = HELP_ID;
      layout.appendChild(aide);
    }
    arrets.forEach((node) => {
      ajouterJeton(node, 'aria-describedby', HELP_ID);
      node.dataset.e054Described = '1';
    });
  });

  /* E054-04 — Ordre explicite : tout tabindex présent est préservé, sinon l'arrêt reçoit 0 ; l'origine est sérialisée en attribut. */
  let existants = 0;
  let normalises = 0;
  safe(() => {
    arrets.forEach((node) => {
      const brut = node.getAttribute('tabindex');
      if (brut !== null && /^-?\d+$/.test(brut.trim())) {
        existants += 1;
        node.dataset.e054TabindexSource = 'existant';
      } else {
        node.tabIndex = 0;
        normalises += 1;
        node.dataset.e054TabindexSource = 'normalise';
      }
      node.dataset.e054Tabindex = String(node.tabIndex);
    });
    layout.dataset.e054TabindexExisting = String(existants);
    layout.dataset.e054TabindexNormalized = String(normalises);
  });

  /* E054-05 — Région live de focus : un écouteur unique annonce rang, libellé et groupe de l'arrêt entrant. */
  safe(() => {
    let live = layout.querySelector('#' + LIVE_ID);
    if (!live) {
      live = fabriquer('p', 'e054-sr', '');
      live.id = LIVE_ID;
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      live.setAttribute('aria-atomic', 'true');
      layout.appendChild(live);
    }
    if (layout.dataset.e054LiveBound !== '1') {
      layout.dataset.e054LiveBound = '1';
      layout.addEventListener('focusin', (event) => {
        const node = cibleFocus(event);
        if (!node || !layout.contains(node) || arrets.indexOf(node) === -1) return;
        const rang = arrets.indexOf(node) + 1;
        const groupe = groupes.find((item) => item.couche.contains(node));
        arrets.forEach((autre) => {
          if (autre !== node) autre.removeAttribute('data-e054-focused');
        });
        node.dataset.e054Focused = '1';
        layout.dataset.e054FocusKey = node.dataset.constKey || `arret:${rang}`;
        layout.dataset.e054FocusName = groupe ? groupe.titre : 'hors groupe';
        live.textContent = `Arrêt ${rang} sur ${arrets.length} : ${libelle(node)}. ` +
          `Groupe ${layout.dataset.e054FocusName}. Tab : arrêt suivant.`;
      });
    }
  });

  /* E054-06 — Repère de séquence : chaque arrêt porte son rang visible au focus via un badge en CSS piloté par attribut. */
  safe(() => {
    arrets.forEach((node, index) => {
      node.dataset.e054Step = `${index + 1} / ${arrets.length}`;
    });
    layout.dataset.e054Steps = String(arrets.length);
  });

  /* E054-07 — Raccourci d'évitement : un bouton placé avant le champ amène le focus au récapitulatif, sans quitter la vue. */
  safe(() => {
    const field = layout.querySelector('.constellation-field');
    const etat = layout.querySelector('.constellation-state');
    const retour = layout.querySelector('.constellation-back');
    if (!field || !field.parentNode || (!etat && !retour)) return;
    if (layout.querySelector('#' + SKIP_ID)) return;
    if (etat && !etat.id) etat.id = STATE_ID;
    const cible = etat || retour;
    const saut = fabriquer('button', 'e054-skip', 'Aller au récapitulatif de la constellation');
    saut.id = SKIP_ID;
    saut.type = 'button';
    if (etat) saut.setAttribute('aria-controls', STATE_ID);
    saut.addEventListener('click', () => {
      if (etat) etat.setAttribute('tabindex', '-1');
      cible.dataset.e054SkipTarget = '1';
      safe(() => cible.focus({ preventScroll: true }));
    });
    field.parentNode.insertBefore(saut, field);
    layout.dataset.e054Skip = '1';
  });

  /* E054-08 — Mémoire de retour : un écouteur de sortie mémorise le dernier arrêt et publie la clé de restauration. */
  safe(() => {
    if (layout.dataset.e054MemoryBound !== '1') {
      layout.dataset.e054MemoryBound = '1';
      layout.addEventListener('focusout', (event) => {
        const node = cibleFocus(event);
        if (!node || !layout.contains(node) || arrets.indexOf(node) === -1) return;
        arrets.forEach((autre) => {
          if (autre !== node) autre.removeAttribute('data-e054-last');
        });
        node.dataset.e054Last = '1';
        layout.dataset.e054ReturnKey = node.dataset.constKey || `arret:${arrets.indexOf(node) + 1}`;
        layout.dataset.e054ReturnStep = node.dataset.e054Step || '';
      });
    }
  });

  /* E054-09 — Cohérence focus et sélection : l'alignement entre l'arrêt focalisé et l'élément courant change l'annonce et le trait de focus. */
  safe(() => {
    const courantInitial = arrets.find((node) =>
      node.getAttribute('aria-current') === 'true' || node.classList.contains('is-active'));
    layout.dataset.e054CurrentKey = courantInitial ? (courantInitial.dataset.constKey || '') : 'none';
    if (layout.dataset.e054MatchBound !== '1') {
      layout.dataset.e054MatchBound = '1';
      layout.addEventListener('focusin', (event) => {
        const node = cibleFocus(event);
        if (!node || !layout.contains(node) || arrets.indexOf(node) === -1) return;
        const courant = arrets.find((autre) =>
          autre.getAttribute('aria-current') === 'true' || autre.classList.contains('is-active'));
        const aligne = Boolean(courant) && courant === node;
        const etat = aligne ? 'aligne' : 'decale';
        layout.dataset.e054FocusMatch = etat;
        node.dataset.e054Match = etat;
        layout.classList.toggle('e054-aligned', aligne);
        layout.classList.toggle('e054-divergent', !aligne);
        const live = layout.querySelector('#' + LIVE_ID);
        if (live) live.textContent += aligne ? ' Focus sur la sélection.' : ' Focus hors sélection.';
      });
    }
  });

  /* E054-10 — Bilan local : un rapport live récapitule la structure et une empreinte stable, avec mode sobre demandé au contexte. */
  safe(() => {
    const resume = [
      `arrêts ${arrets.length}`,
      `groupes ${groupes.length}`,
      `tabindex existants ${existants}`,
      `tabindex normalisés ${normalises}`,
      `sélection ${layout.dataset.e054CurrentKey || 'none'}`,
      `retour ${layout.dataset.e054ReturnKey || 'none'}`,
      `alignement ${layout.dataset.e054FocusMatch || 'non testé'}`,
    ].join(' · ');
    let rapport = layout.querySelector('#' + REPORT_ID);
    if (!rapport) {
      rapport = fabriquer('p', 'e054-report', '');
      rapport.id = REPORT_ID;
      rapport.setAttribute('role', 'status');
      rapport.setAttribute('aria-live', 'polite');
      rapport.setAttribute('aria-atomic', 'true');
      layout.appendChild(rapport);
    }
    rapport.textContent = `E054 · structure du focus : ${resume}.`;
    layout.dataset.e054Audit = empreinte(resume);
    const sobre = typeof ctx.reducedMotion === 'function' && ctx.reducedMotion();
    if (sobre) layout.classList.add('e054-calm');
    else layout.classList.remove('e054-calm');
  });
});
