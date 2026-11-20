import { register } from './registry.js';

/* V2 lentille E040 — Données, traçabilité et provenance (complément de la passe 1).
   La passe 1 traite déjà : fiche de provenance du jeu, pastille de traçabilité,
   décomptes de certitude et de type, marques sur le fil, citation copiable,
   glossaire, ancrage local/global, liste d'identifiants et accès à la trace.
   La V2 propose donc dix chantiers neufs et distincts, tous dérivés du DOM réel :
   empreinte d'intégrité, datation normalisée, provenance de l'illustration,
   contexte de sélection, complétude des champs, cohérence de la certitude,
   tendance dominante, diversité des origines, répartition croisée et confort
   de mouvement réduit. Préfixes : classes recit-v2-e040-, ids DOM v2-e040-
   (jamais e040- de la passe 1, qui tourne sur le même DOM). Zéro réseau,
   zéro console, zéro aléa, aucun fichier partagé modifié. */

const CSS = `
/* E040-01 — Empreinte d'intégrité du point. */
.recit-v2-e040-fingerprint{margin:3px 0 0;color:var(--muted);font-size:9px;line-height:1.5}
.recit-v2-e040-code{margin-left:2px;padding:1px 5px;border:1px solid var(--line);border-radius:5px;background:rgba(255,255,255,.03);color:var(--gold-bright);font-size:9px;letter-spacing:.06em;font-variant-numeric:tabular-nums}

/* E040-02 — Datation normalisée du repère. */
.recit-v2-e040-datation{margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E040-03 — Provenance de l'illustration. */
.recit-v2-e040-image{margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.5}

/* E040-04 — Contexte de sélection (filtres actifs). */
.recit-v2-e040-selection{margin:4px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E040-05 — Indice de complétude des champs de traçabilité. */
.recit-v2-e040-completude{margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.5;font-variant-numeric:tabular-nums}

/* E040-06 — Contrôle de cohérence de la certitude. */
.recit-v2-e040-coherence{margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.5}

/* E040-07 — Tendance de certitude du repère. */
.recit-v2-e040-tendance{margin:4px 0 0;color:var(--muted);font-size:9px;line-height:1.6}

/* E040-08 — Diversité des origines des points. */
.recit-v2-e040-diversite{margin:2px 0 0;color:var(--muted);font-size:9px;line-height:1.6}

/* E040-09 — Répartition croisée type × certitude. */
.recit-v2-e040-croisement{margin:8px 0 0;border-collapse:collapse;color:var(--muted);font-size:9px;line-height:1.4;font-variant-numeric:tabular-nums}
.recit-v2-e040-croisement caption{margin-bottom:4px;color:var(--ink-soft);font-size:9px;text-align:left}
.recit-v2-e040-croisement th,.recit-v2-e040-croisement td{padding:2px 6px;border:1px solid var(--line);text-align:center}
.recit-v2-e040-croisement th[scope="row"],.recit-v2-e040-croisement thead th:first-child{text-align:left;color:var(--ink-soft)}

/* E040-10 — Confort : mouvement réduit des synthèses V2. */
.recit-v2-e040-readout{transition:opacity .2s linear}
.recit-layout[data-v2-e040-motion="reduce"] .recit-v2-e040-readout{transition:none}
@media (prefers-reduced-motion:reduce){.recit-v2-e040-readout{transition:none}}
@media (max-width:620px){.recit-v2-e040-readout,.recit-v2-e040-croisement{font-size:10px}}
`;

/* Libellés de certitude repris de la vue (étiquettes uniquement, aucun chiffre). */
const CONF_LABEL = {
  'vérifié': 'Vérifié',
  'certain': 'Certain',
  'probable': 'Probable',
  'disputed': 'Contesté',
};

register('E040', (ctx) => {
  const { layout, css, el, reducedMotion } = ctx;

  /* Repositionne un nœud déjà inséré sans le dupliquer (idempotence). */
  function repositionne(noeud, parent, ancre) {
    if (!noeud || !parent || typeof parent.insertBefore !== 'function') return;
    const cible = (ancre && ancre.parentNode === parent) ? ancre.nextSibling : null;
    if (noeud.parentNode !== parent || (cible && noeud.nextSibling !== cible)) {
      parent.insertBefore(noeud, cible);
    }
  }

  /* Dépose (ou réutilise) un paragraphe de synthèse visible. */
  function insereParagraphe(id, classe, parent, ancre, texte) {
    if (!parent || typeof parent.insertBefore !== 'function') return null;
    let noeud = document.getElementById(id);
    if (!noeud) {
      noeud = el('p', `recit-v2-e040-readout ${classe}`);
      noeud.id = id;
    }
    noeud.textContent = texte;
    repositionne(noeud, parent, ancre);
    return noeud;
  }

  /* Empreinte : paragraphe avec un <code> dont on ne remplace que le texte. */
  function insereEmpreinte(parent, ancre, valeur) {
    if (!parent || typeof parent.insertBefore !== 'function') return null;
    let noeud = document.getElementById('v2-e040-fingerprint');
    if (!noeud) {
      noeud = el('p', 'recit-v2-e040-readout recit-v2-e040-fingerprint');
      noeud.id = 'v2-e040-fingerprint';
      noeud.appendChild(document.createTextNode('Empreinte d’intégrité : '));
      noeud.appendChild(el('code', 'recit-v2-e040-code', ''));
    }
    const code = noeud.querySelector('code');
    if (code) code.textContent = valeur;
    repositionne(noeud, parent, ancre);
    return noeud;
  }

  /* Tableau croisé reconstruit à partir des seuls attributs du fil. */
  function insereTable(parent, ancre, lignes, colonnes, cases) {
    if (!parent || typeof parent.insertBefore !== 'function') return null;
    let table = document.getElementById('v2-e040-croisement');
    if (!table) {
      table = el('table', 'recit-v2-e040-readout recit-v2-e040-croisement');
      table.id = 'v2-e040-croisement';
    }
    while (table.firstChild) table.removeChild(table.firstChild);
    table.appendChild(el('caption', '', 'Répartition croisée type × certitude du repère (d’après le fil).'));
    const thead = el('thead');
    const hr = el('tr');
    hr.appendChild(el('th', '', ''));
    colonnes.forEach((col) => {
      const th = el('th', '', col.label);
      th.setAttribute('scope', 'col');
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = el('tbody');
    lignes.forEach((ligne) => {
      const tr = el('tr');
      const th = el('th', '', ligne.label);
      th.setAttribute('scope', 'row');
      tr.appendChild(th);
      colonnes.forEach((col) => {
        tr.appendChild(el('td', '', String(cases[ligne.key + '||' + col.key] || 0)));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    repositionne(table, parent, ancre);
    return table;
  }

  const safe = (fn) => { try { fn(); } catch (_) { /* neutre : jamais de throw */ } };

  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-v2-e040', CSS); /* un seul appel, toutes les règles du module. */

    const corps = layout.querySelector('.recit-body');
    if (!corps) return;

    const titre = document.getElementById('recit-point-title') || corps.querySelector('.recit-title');
    const meta = corps.querySelector('.recit-meta');
    const timing = corps.querySelector('.recit-timing');
    const confChip = corps.querySelector('.recit-conf');
    const statut = document.getElementById('c3a-status') || corps.querySelector('.c3a-status');
    const thread = document.getElementById('c3a-thread') || corps.querySelector('.recit-thread-list');
    const legende = corps.querySelector('.recit-legend');
    const media = layout.querySelector('.recit-media');
    const items = thread ? Array.from(thread.querySelectorAll('.c3a-thread-item')) : [];
    let anneeInfo = null;

    /* E040-01 — empreinte déterministe dérivée du titre, de la métadonnée et de la certitude. */
    safe(() => {
      const texteTitre = String(titre?.textContent || '').trim();
      if (!texteTitre) return;
      const source = texteTitre + '|'
        + String(meta?.textContent || '').trim() + '|'
        + String(confChip?.textContent || '').trim();
      let h = 2166136261; /* FNV-1a : hachage déterministe, aucun aléa. */
      for (let i = 0; i < source.length; i += 1) {
        h ^= source.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const empreinte = (h >>> 0).toString(36).toUpperCase().padStart(6, '0').slice(0, 8);
      insereEmpreinte(corps, meta, empreinte);
    });

    /* E040-02 — année lue dans la métadonnée, reformulée avec son ère. */
    safe(() => {
      const parties = String(meta?.textContent || '').split('·').map((s) => s.trim());
      const brute = parties[1] || '';
      const m = brute.match(/^(\d+)\s*(av\.\s*J\.-C\.)?$/i);
      if (!m) return;
      anneeInfo = { label: m[2] ? `${m[1]} av. J.-C.` : `${m[1]} apr. J.-C.` };
      insereParagraphe('v2-e040-datation', 'recit-v2-e040-datation', corps, timing,
        `Datation du repère : ${anneeInfo.label} (année lue dans la métadonnée du point).`);
    });

    /* E040-03 — crédit / licence de l'illustration, ou absence explicite. */
    safe(() => {
      const credit = String(media?.querySelector('.recit-media-credit')?.textContent || '').trim().replace(/\.\s*$/, '');
      const legendeImg = String(media?.querySelector('.media-caption')?.textContent || '').trim().replace(/\.\s*$/, '');
      const aImage = Boolean(media?.querySelector('img'));
      const vide = Boolean(media?.querySelector('.media-empty'));
      let texte;
      if (credit) {
        texte = `Provenance de l’illustration : ${credit}` + (legendeImg ? ` — légende : ${legendeImg}` : '') + '.';
      } else if (aImage) {
        texte = 'Illustration présente, mais sans crédit ni licence renseignés dans le DOM.';
      } else if (vide) {
        texte = 'Aucune illustration vérifiée pour ce repère : aucun crédit à tracer.';
      } else {
        return;
      }
      const precedent = document.getElementById('v2-e040-datation') || timing;
      insereParagraphe('v2-e040-image', 'recit-v2-e040-image', corps, precedent, texte);
    });

    /* E040-04 — contexte de sélection lu dans le statut des filtres C3. */
    safe(() => {
      const t = String(statut?.textContent || '');
      const m = t.match(/(\d+)\s*point\(s\)\s*affiché\(s\)\s*sur\s*(\d+)/);
      if (!m) return;
      const filtres = [];
      const q = t.match(/recherche :\s*«\s*([^»]+?)\s*»/);
      if (q) filtres.push(`recherche « ${q[1].trim()} »`);
      const k = t.match(/type :\s*([^·]+)/);
      if (k) filtres.push(`type ${k[1].trim()}`);
      const c = t.match(/certitude :\s*([^·]+)/);
      if (c) filtres.push(`certitude ${c[1].trim()}`);
      const texte = filtres.length
        ? `Contexte de sélection : ${m[1]} affiché(s) sur ${m[2]} · ${filtres.join(' · ')}.`
        : `Contexte de sélection : ${m[1]} affiché(s) sur ${m[2]}, sans filtre actif.`;
      insereParagraphe('v2-e040-selection', 'recit-v2-e040-selection', corps, statut, texte);
    });

    /* E040-05 — complétude des champs de traçabilité du point courant. */
    safe(() => {
      const champs = [
        ['titre', Boolean(String(titre?.textContent || '').trim())],
        ['année', Boolean(anneeInfo)],
        ['certitude', Boolean(String(confChip?.textContent || '').trim())],
        ['source', Boolean(corps.querySelector('.recit-trace') || corps.querySelector('.recit-sources'))],
      ];
      const presents = champs.filter((champ) => champ[1]);
      const texte = `Champs de traçabilité renseignés : ${presents.length} sur ${champs.length}`
        + ` (${presents.map((champ) => champ[0]).join(', ') || 'aucun'}).`;
      const precedent = document.getElementById('v2-e040-selection') || statut;
      insereParagraphe('v2-e040-completude', 'recit-v2-e040-completude', corps, precedent, texte);
    });

    /* E040-06 — cohérence entre certitude du fil et pastille du point. */
    safe(() => {
      const courant = items.find((n) => n.classList && n.classList.contains('is-current'));
      const cle = courant?.getAttribute('data-confidence');
      if (!cle) return;
      const attendu = CONF_LABEL[cle] || cle;
      const pastille = String(confChip?.textContent || '').trim();
      const coherent = pastille.toLowerCase().includes(attendu.toLowerCase());
      const texte = coherent
        ? `Cohérence des mentions : la certitude du fil (${attendu}) concorde avec la pastille du point.`
        : `Cohérence des mentions : divergence relevée — fil « ${attendu} », pastille « ${pastille || 'absente'} ».`;
      const precedent = document.getElementById('v2-e040-completude')
        || document.getElementById('v2-e040-selection') || statut;
      insereParagraphe('v2-e040-coherence', 'recit-v2-e040-coherence', corps, precedent, texte);
    });

    /* E040-07 — certitude dominante du repère (synthèse, distincte du décompte passe 1). */
    safe(() => {
      if (!items.length || !legende) return;
      const counts = {};
      items.forEach((n) => {
        const c = n.getAttribute('data-confidence') || 'inconnu';
        counts[c] = (counts[c] || 0) + 1;
      });
      const cle = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
      const label = CONF_LABEL[cle] || cle;
      const texte = `Tendance de certitude du repère : ${label} domine`
        + ` (${counts[cle]} point(s) sur ${items.length}, d’après le fil).`;
      insereParagraphe('v2-e040-tendance', 'recit-v2-e040-tendance', legende, null, texte);
    });

    /* E040-08 — nombre de types d'origine distincts présents dans le fil. */
    safe(() => {
      if (!items.length || !legende) return;
      const kinds = Array.from(new Set(items.map((n) => n.getAttribute('data-kind') || 'point')));
      const texte = `Origines des points : ${kinds.length} type(s) représenté(s) — ${kinds.join(', ')}.`;
      const precedent = document.getElementById('v2-e040-tendance') || null;
      insereParagraphe('v2-e040-diversite', 'recit-v2-e040-diversite', legende, precedent, texte);
    });

    /* E040-09 — tableau de contingence type × certitude, construit depuis le fil. */
    safe(() => {
      if (!items.length || !legende) return;
      const kindKeys = Array.from(new Set(items.map((n) => n.getAttribute('data-kind') || 'point')));
      const confKeys = Array.from(new Set(items.map((n) => n.getAttribute('data-confidence') || 'inconnu')));
      const cases = {};
      items.forEach((n) => {
        const k = n.getAttribute('data-kind') || 'point';
        const c = n.getAttribute('data-confidence') || 'inconnu';
        const key = k + '||' + c;
        cases[key] = (cases[key] || 0) + 1;
      });
      const lignes = kindKeys.map((k) => ({ key: k, label: k }));
      const colonnes = confKeys.map((c) => ({ key: c, label: CONF_LABEL[c] || c }));
      const precedent = document.getElementById('v2-e040-diversite')
        || document.getElementById('v2-e040-tendance') || null;
      insereTable(legende, precedent, lignes, colonnes, cases);
    });

    /* E040-10 — mouvement réduit, lu une fois par rendu, attribut propre à la V2. */
    safe(() => {
      const reduit = (typeof reducedMotion === 'function' && reducedMotion()) ? 'reduce' : 'normal';
      layout.setAttribute('data-v2-e040-motion', reduit);
    });
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
