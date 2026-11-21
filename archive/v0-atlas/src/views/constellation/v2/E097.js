import { register } from './registry.js';

/* Lentille V2 E097 — diagnostic textuel approfondi du champ d'étoiles de la
   vue Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e097 (aucune collision avec la passe 1 e097-…). */

/* État module : survit aux reconstructions complètes du DOM par la coque. */
const etat = {
  rendus: 0,
  signaturePrecedente: null,
};

/* Greffon tolérant : un chantier défaillant n'interrompt pas les suivants. */
function sansEchec(action) {
  try { action(); } catch { /* neutralisation silencieuse, sans journalisation */ }
}

function sortie(layout, id) {
  return typeof layout.querySelector === 'function'
    ? layout.querySelector('#' + id)
    : null;
}

function fichesDu(layout) {
  return Array.from(layout.querySelectorAll('.const-sun, .const-planet, .const-moon'));
}

/* Position lue depuis les variables CSS en pourcentage écrites par la vue. */
function positionDe(noeud) {
  const x = parseFloat(noeud.style.getPropertyValue('--x'));
  const y = parseFloat(noeud.style.getPropertyValue('--y'));
  return { x: Number.isFinite(x) ? x : NaN, y: Number.isFinite(y) ? y : NaN };
}

function decimale(valeur) {
  return Number.isFinite(valeur) ? valeur.toFixed(2).replace('.', ',') : '—';
}

/* Signature déterministe : FNV-1a 32 bits sur les clés et positions triées.
   Aucun tirage aléatoire, aucune horloge : deux rendus identiques donnent
   exactement la même empreinte. */
function signatureDu(noeuds) {
  const parties = noeuds.map((noeud) => {
    const p = positionDe(noeud);
    const x = Number.isFinite(p.x) ? p.x.toFixed(2) : '?';
    const y = Number.isFinite(p.y) ? p.y.toFixed(2) : '?';
    return `${noeud.dataset.constKey || '?'}:${x},${y}`;
  }).sort();
  const source = parties.join('|');
  let h = 0x811c9dc5;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function panneauDans(layout, fabriquer) {
  const existant = typeof layout.querySelector === 'function'
    ? layout.querySelector('#v2e097-panel') : null;
  if (existant) return existant;

  const panneau = fabriquer('section', 'v2e097-panel');
  panneau.id = 'v2e097-panel';
  panneau.setAttribute('aria-labelledby', 'v2e097-titre');

  const titre = fabriquer('h2', 'v2e097-titre', 'Diagnostic V2 du champ d’étoiles');
  titre.id = 'v2e097-titre';
  panneau.appendChild(titre);

  const lignes = [
    'v2e097-selection',
    'v2e097-cles',
    'v2e097-geometrie',
    'v2e097-rosace',
    'v2e097-proximite',
    'v2e097-legende',
    'v2e097-etat',
    'v2e097-description',
    'v2e097-cibles',
    'v2e097-signature',
  ];
  lignes.forEach((id) => {
    const ligne = fabriquer('p', 'v2e097-ligne', 'Contrôle en attente.');
    ligne.id = id;
    panneau.appendChild(ligne);
  });

  const live = fabriquer('p', 'v2e097-ligne v2e097-live', 'Diagnostic V2 en attente de calcul.');
  live.id = 'v2e097-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  live.setAttribute('aria-atomic', 'true');
  panneau.appendChild(live);

  const champ = layout.querySelector('.constellation-field');
  if (champ && typeof layout.insertBefore === 'function') layout.insertBefore(panneau, champ);
  else layout.appendChild(panneau);
  return panneau;
}

register('E097', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const fabriquer = typeof ctx.el === 'function' ? ctx.el : null;
  if (!fabriquer) return;

  const champ = layout.querySelector('.constellation-field');
  if (!champ) return; // vue vide : rien à diagnostiquer

  /* Feuille unique de la lentille : panneau lisible, anomalie matérialisée par
     un contour en pointillés (jamais par la seule couleur) et mode sobre. */
  css('constellation-v2-e097', `
.constellation-layout[data-v2e097="on"] #v2e097-panel {
  margin: 10px 0 4px; padding: 8px 10px;
  border: 1px solid var(--line); border-radius: 8px;
  background: rgba(255,255,255,.02);
  font-family: var(--sans, inherit); color: var(--ink-soft);
}
#v2e097-titre {
  margin: 0 0 5px; font-size: 10px; font-weight: 600;
  letter-spacing: .1em; text-transform: uppercase; color: var(--gold);
}
#v2e097-panel .v2e097-ligne {
  margin: 3px 0; font-size: 9px; line-height: 1.45;
  color: var(--muted-2); font-variant-numeric: tabular-nums;
}
#v2e097-live { color: var(--gold-bright); }
.constellation-layout[data-v2e097="on"] .v2e097-anomalie {
  outline: 2px dashed var(--gold); outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  #v2e097-panel * { transition: none !important; animation: none !important; }
}
@media (max-width: 620px) {
  #v2e097-titre { font-size: 9px; }
  #v2e097-panel .v2e097-ligne { font-size: 8px; }
}
`);

  const fiches = fichesDu(layout);
  const aretes = Array.from(champ.querySelectorAll('.constellation-edges line'));
  panneauDans(layout, fabriquer);
  layout.dataset.v2e097 = 'on';

  /* E097-01 — État de sélection : concordance entre la classe .is-active et
     l'attribut aria-current, contrôlée séparément dans les trois couches. */
  sansEchec(() => {
    const groupes = [
      ['Ères', '.const-sun'],
      ['Repères', '.const-planet'],
      ['Points', '.const-moon'],
    ];
    const rapports = [];
    let ecarts = 0;
    groupes.forEach(([nom, selecteur]) => {
      const noeuds = Array.from(layout.querySelectorAll(selecteur));
      const actifs = noeuds.filter(n => n.classList.contains('is-active'));
      const courants = noeuds.filter(n => n.getAttribute('aria-current') === 'true');
      const coherent = actifs.length === courants.length
        && actifs.every(n => courants.indexOf(n) !== -1);
      if (!coherent) ecarts += 1;
      rapports.push(`${nom} ${actifs.length}/${courants.length}${coherent ? '' : ' écart'}`);
      noeuds.forEach(n => {
        const visuel = n.classList.contains('is-active');
        const vocal = n.getAttribute('aria-current') === 'true';
        if (visuel !== vocal) n.classList.add('v2e097-anomalie');
        else n.classList.remove('v2e097-anomalie');
      });
    });
    layout.dataset.v2e097Selection = ecarts ? 'ecart' : 'ok';
    const ligne = sortie(layout, 'v2e097-selection');
    if (ligne) {
      ligne.textContent = `Sélection — .is-active / aria-current par groupe : ${rapports.join(' · ')}${ecarts ? ` · ${ecarts} écart(s), nœuds en pointillés` : ' · cohérent'}`;
    }
  });

  /* E097-02 — Unicité et format des clés de focus : la passe 1 vérifiait leur
     présence ; ici on contrôle l'absence de doublon et le préfixe type:index. */
  sansEchec(() => {
    const vus = new Set();
    const doublons = [];
    const malformes = [];
    const prefixes = [
      ['const-sun', 'sun'],
      ['const-planet', 'planet'],
      ['const-moon', 'moon'],
    ];
    fiches.forEach((noeud, index) => {
      const cle = (noeud.dataset.constKey || '').trim();
      const entree = prefixes.find(([cls]) => noeud.classList.contains(cls));
      const prefixe = entree ? entree[1] : '';
      const attendu = prefixe + ':';
      const reste = cle.slice(attendu.length);
      const formatOk = !!prefixe && cle.indexOf(attendu) === 0
        && /^\d+$/.test(reste);
      if (!formatOk) malformes.push(String(index + 1));
      if (vus.has(cle)) doublons.push(cle || '(vide)');
      else vus.add(cle);
    });
    layout.dataset.v2e097ClesUniques = String(vus.size);
    layout.dataset.v2e097Doublons = String(doublons.length);
    layout.dataset.v2e097Malformes = String(malformes.length);
    const ligne = sortie(layout, 'v2e097-cles');
    if (ligne) {
      ligne.textContent = `Clés de focus V2 — ${fiches.length} nœuds, ${vus.size} clés distinctes · doublons ${doublons.length}${doublons.length ? ' (' + doublons.join(', ') + ')' : ''} · format invalide ${malformes.length}${malformes.length ? ' (rangs ' + malformes.join(', ') + ')' : ''}`;
    }
  });

  /* E097-03 — Correspondance géométrique entre les extrémités des segments SVG
     et les positions réelles des nœuds (tolérance d'un point de pourcentage). */
  sansEchec(() => {
    const positions = fiches.map(positionDe)
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    const rattache = (pt) => positions.some(p =>
      Math.abs(p.x - pt.x) <= 1 && Math.abs(p.y - pt.y) <= 1);
    let liees = 0;
    const orphelines = [];
    aretes.forEach((line, index) => {
      const a = {
        x: parseFloat(line.getAttribute('x1')),
        y: parseFloat(line.getAttribute('y1')),
      };
      const b = {
        x: parseFloat(line.getAttribute('x2')),
        y: parseFloat(line.getAttribute('y2')),
      };
      const valide = Number.isFinite(a.x) && Number.isFinite(a.y)
        && Number.isFinite(b.x) && Number.isFinite(b.y);
      if (valide && rattache(a) && rattache(b)) liees += 1;
      else orphelines.push(String(index + 1));
    });
    layout.dataset.v2e097AretesLiees = String(liees);
    layout.dataset.v2e097AretesOrphelines = String(orphelines.length);
    const ligne = sortie(layout, 'v2e097-geometrie');
    if (ligne) {
      ligne.textContent = `Géométrie des arêtes — ${liees}/${aretes.length} segments reliant deux nœuds (tolérance 1 %) · ${orphelines.length} segment(s) orphelin(s)${orphelines.length ? ' (' + orphelines.join(', ') + ')' : ''}`;
    }
  });

  /* E097-04 — Régularité de la rosace des ères : écart angulaire minimal entre
     soleils consécutifs, comparé à l'espacement théorique de 360/N degrés. */
  sansEchec(() => {
    const soleils = Array.from(layout.querySelectorAll('.const-sun'));
    const angles = soleils.map((noeud) => {
      const p = positionDe(noeud);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
      return (Math.atan2(p.y - 50, p.x - 50) * 180 / Math.PI + 360) % 360;
    }).filter(a => a !== null).sort((a, b) => a - b);
    const n = angles.length;
    let ecartMin = NaN;
    let attendu = NaN;
    let regime = 'indetermine';
    if (n > 1) {
      attendu = 360 / n;
      ecartMin = Infinity;
      for (let i = 0; i < n; i++) {
        const suivant = i === n - 1 ? angles[0] + 360 : angles[i + 1];
        const ecart = suivant - angles[i];
        if (ecart < ecartMin) ecartMin = ecart;
      }
      regime = ecartMin < attendu * 0.6 ? 'irregulier' : 'regulier';
    }
    layout.dataset.v2e097RosaceEcart = Number.isFinite(ecartMin) ? decimale(ecartMin) : '—';
    layout.dataset.v2e097RosaceRegime = regime;
    const ligne = sortie(layout, 'v2e097-rosace');
    if (ligne) {
      ligne.textContent = n > 1
        ? `Rosace des ères — ${n} soleils · écart angulaire minimal ${decimale(ecartMin)}° pour ${decimale(attendu)}° attendus · répartition ${regime === 'regulier' ? 'régulière' : 'irrégulière (chevauchement possible)'}`
        : `Rosace des ères — ${n} soleil, répartition angulaire non significative`;
    }
  });

  /* E097-05 — Proximité des nœuds : distance euclidienne minimale dans le
     repère en pourcentage du champ et nombre de paires sous le seuil de 5 %. */
  sansEchec(() => {
    const points = fiches.map((noeud, index) => ({
      rang: index + 1,
      p: positionDe(noeud),
    })).filter(o => Number.isFinite(o.p.x) && Number.isFinite(o.p.y));
    const seuil = 5;
    let minimum = Infinity;
    let paire = '';
    let proches = 0;
    for (let a = 0; a < points.length; a++) {
      for (let b = a + 1; b < points.length; b++) {
        const distance = Math.hypot(
          points[a].p.x - points[b].p.x,
          points[a].p.y - points[b].p.y
        );
        if (distance < minimum) {
          minimum = distance;
          paire = `${points[a].rang}-${points[b].rang}`;
        }
        if (distance < seuil) proches += 1;
      }
    }
    const exploitable = points.length > 1;
    layout.dataset.v2e097DistanceMin = exploitable ? decimale(minimum) : '—';
    layout.dataset.v2e097PairesProches = String(proches);
    const ligne = sortie(layout, 'v2e097-proximite');
    if (ligne) {
      ligne.textContent = exploitable
        ? `Proximité — distance minimale ${decimale(minimum)} % entre nœuds ${paire} · ${proches} paire(s) sous ${seuil} % (chevauchement possible)`
        : 'Proximité — moins de deux nœuds exploitables';
    }
  });

  /* E097-06 — Légende des trois types : présence des entrées Ère, Repère et
     Point et présence des trois couches porteuses correspondantes. */
  sansEchec(() => {
    const legend = layout.querySelector('.constellation-legend');
    const entrees = legend
      ? Array.from(legend.children).map(c => (c.textContent || '').trim())
      : [];
    const attendus = ['Ère', 'Repère', 'Point'];
    const manquants = attendus.filter(a =>
      !entrees.some(t => t.indexOf(a) === 0));
    const couchesOk = [
      'const-layer-suns',
      'const-layer-planets',
      'const-layer-moons',
    ].every(c => !!layout.querySelector('.' + c));
    layout.dataset.v2e097Legende = manquants.length ? 'incomplete' : 'complete';
    layout.dataset.v2e097CouchesCle = couchesOk ? 'ok' : 'ecart';
    const ligne = sortie(layout, 'v2e097-legende');
    if (ligne) {
      ligne.textContent = `Légende — ${entrees.length} entrée(s) · ${manquants.length ? 'absent(s) : ' + manquants.join(', ') : 'Ère, Repère et Point présents'} · couches clés ${couchesOk ? 'complètes' : 'incomplètes'}`;
    }
  });

  /* E097-07 — Cohérence de la ligne d'état .constellation-state avec les
     nœuds réellement marqués actifs (nom d'ère, titre de repère, rang du point). */
  sansEchec(() => {
    const noeudEtat = layout.querySelector('.constellation-state');
    const texte = noeudEtat ? (noeudEtat.textContent || '') : '';
    const soleilActif = layout.querySelector('.const-sun.is-active');
    const planeteActive = layout.querySelector('.const-planet.is-active');
    const lunes = Array.from(layout.querySelectorAll('.const-moon'));
    const rangLune = lunes.findIndex(n => n.classList.contains('is-active'));
    const nomEre = soleilActif
      ? (soleilActif.dataset.label || '').split(' · ')[0].trim() : '';
    const titreRepere = planeteActive
      ? (planeteActive.dataset.label || '').split(' · ').slice(1).join(' · ').trim() : '';
    const pointAttendu = rangLune >= 0 ? `${rangLune + 1} / ${lunes.length}` : 'aucun';
    const okEre = !nomEre || texte.indexOf(nomEre) !== -1;
    const okRepere = !titreRepere || texte.indexOf(titreRepere) !== -1;
    const okPoint = texte.indexOf(pointAttendu) !== -1;
    const coherent = okEre && okRepere && okPoint;
    layout.dataset.v2e097EtatTexte = coherent ? 'ok' : 'ecart';
    const ligne = sortie(layout, 'v2e097-etat');
    if (ligne) {
      ligne.textContent = `État affiché — ère ${okEre ? 'conforme' : 'écart'} · repère ${okRepere ? 'conforme' : 'écart'} · point ${okPoint ? 'conforme' : 'écart'} (attendu ${pointAttendu})${texte ? '' : ' · texte absent'}`;
    }
  });

  /* E097-08 — Description du champ : l'identifiant aria-describedby doit
     pointer vers une note textuelle non vide reprenant les repères de cadrage. */
  sansEchec(() => {
    const reference = (champ.getAttribute('aria-describedby') || '').trim();
    const ids = reference.split(/\s+/).filter(Boolean);
    const textes = ids.map((id) => {
      const cible = typeof document !== 'undefined' && document.getElementById
        ? document.getElementById(id) : layout.querySelector('#' + id);
      return cible ? (cible.textContent || '').trim() : '';
    });
    const presents = textes.filter(t => t.length > 0).length;
    const note = textes.join(' ');
    const marqueurs = ['137,5', 'déterministes', 'réseau'];
    const trouves = marqueurs.filter(m => note.indexOf(m) !== -1);
    const ok = ids.length > 0 && presents === ids.length
      && trouves.length === marqueurs.length;
    layout.dataset.v2e097Description = ok ? 'ok' : 'ecart';
    const ligne = sortie(layout, 'v2e097-description');
    if (ligne) {
      ligne.textContent = `Description du champ — ${ids.length} référence(s), ${presents} cible(s) textuelle(s) · repères de cadrage ${trouves.length}/${marqueurs.length} (137,5°, déterministes, zéro réseau)${ok ? '' : ' · à vérifier'}`;
    }
  });

  /* E097-09 — Taille des cibles tactiles déclarées : 42 px pour une ère, la
     variable --const-node-size pour un repère, 14 px pour un point vérifié. */
  sansEchec(() => {
    const brut = parseFloat(champ.style.getPropertyValue('--const-node-size'));
    const planete = Number.isFinite(brut) ? brut : 28;
    const cibles = [['Ère', 42], ['Repère', planete], ['Point', 14]];
    const petites = cibles.filter(([, valeur]) => valeur < 24);
    const minimum = Math.min.apply(null, cibles.map(c => c[1]));
    layout.dataset.v2e097CibleMin = String(minimum);
    const ligne = sortie(layout, 'v2e097-cibles');
    if (ligne) {
      ligne.textContent = `Cibles — ère 42 px · repère ${decimale(planete)} px · point 14 px · ${petites.length ? petites.map(c => c[0]).join(' et ') + ' sous 24 px (à agrandir au toucher)' : 'toutes ≥ 24 px'}`;
    }
  });

  /* E097-10 — Signature déterministe, stabilité inter-rendus, bilan chiffré et
     annonce polie. La même entrée donne toujours la même empreinte : aucun
     hasard, aucune horloge, aucun minuteur. */
  sansEchec(() => {
    etat.rendus += 1;
    const empreinte = signatureDu(fiches);
    const stabilite = etat.signaturePrecedente === null
      ? 'premier'
      : (etat.signaturePrecedente === empreinte ? 'stable' : 'modifiee');
    etat.signaturePrecedente = empreinte;

    const anomalies = (layout.dataset.v2e097Selection === 'ecart' ? 1 : 0)
      + (Number(layout.dataset.v2e097Doublons || 0) > 0 ? 1 : 0)
      + (Number(layout.dataset.v2e097Malformes || 0) > 0 ? 1 : 0)
      + (Number(layout.dataset.v2e097AretesOrphelines || 0) > 0 ? 1 : 0)
      + (layout.dataset.v2e097RosaceRegime === 'irregulier' ? 1 : 0)
      + (Number(layout.dataset.v2e097PairesProches || 0) > 0 ? 1 : 0)
      + (layout.dataset.v2e097Legende === 'incomplete' ? 1 : 0)
      + (layout.dataset.v2e097EtatTexte === 'ecart' ? 1 : 0)
      + (layout.dataset.v2e097Description === 'ecart' ? 1 : 0)
      + (Number(layout.dataset.v2e097CibleMin || 99) < 24 ? 1 : 0);
    const score = Math.max(0, 10 - anomalies);

    layout.dataset.v2e097Signature = empreinte;
    layout.dataset.v2e097Stabilite = stabilite;
    layout.dataset.v2e097Score = String(score);
    layout.dataset.v2e097Rendus = String(etat.rendus);

    const ligne = sortie(layout, 'v2e097-signature');
    if (ligne) {
      ligne.textContent = `Signature — ${empreinte} sur ${fiches.length} nœuds (FNV-1a des clés et positions triées) · ${stabilite === 'stable' ? 'identique au rendu précédent' : stabilite === 'modifiee' ? 'diffère du rendu précédent' : 'premier rendu'} · passage n° ${etat.rendus} · bilan ${score}/10`;
    }
    const live = sortie(layout, 'v2e097-live');
    if (live) {
      live.textContent = `Diagnostic V2 : ${score}/10 contrôles conformes, ${anomalies} anomalie(s), signature ${empreinte}.`;
    }
  });
});
