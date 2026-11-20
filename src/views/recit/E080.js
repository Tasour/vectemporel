import { register } from './registry.js';

/* Lentille E080 — Données, traçabilité et provenance (vue Récit).
   Dix chantiers indépendants, tous non destructifs : sans ce module, la vue
   reste intégralement lisible. Toutes les grandeurs affichées sont dérivées
   du DOM déjà rendu (fil, mentions de certitude, trace, kicker, métadonnées) ;
   aucune donnée historique n'est ajoutée. Un seul greffon, une seule feuille
   CSS, des classes préfixées recit-e080- et des identifiants e080- uniques.
   Zéro réseau, zéro aléa, zéro sortie de débogage, aucun fichier partagé touché. */

const CONF = {
  'vérifié': { mark: '✓', label: 'Vérifié' },
  'certain': { mark: '■', label: 'Certain' },
  'probable': { mark: '◐', label: 'Probable' },
  'disputed': { mark: '≈', label: 'Contesté' },
};
const KINDS = ['récit', 'figure', 'lieu', 'audit'];

const CSS = `
/* E080-01 — badge de couverture des sources du point courant. */
.recit-e080-source{display:inline-flex;align-items:center;margin-left:8px;padding:2px 8px;border:1px dashed var(--line-strong);border-radius:999px;color:var(--ink-soft);font-size:10px;white-space:normal}
.recit-e080-source[data-e080-source-count="0"]{color:var(--muted)}

/* E080-02 — marques de certitude sur chaque item du fil. */
.recit-e080-mark{margin-left:5px;color:var(--gold);font-size:10px}

/* E080-03 / E080-04 — profils agrégés du repère. */
.recit-e080-profile{margin:6px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-e080-hide-profiles .recit-e080-profile{display:none}

/* E080-05 — dossier de provenance structuré. */
.recit-e080-dossier{margin:10px 0;padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.02);font-size:10px}
.recit-e080-dossier dt{color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.08em}
.recit-e080-dossier dd{margin:0 0 5px;color:var(--ink-soft);line-height:1.45;overflow-wrap:anywhere}

/* E080-06 — ancrage temporel d'origine. */
.recit-e080-anchor{margin:4px 0 0;color:var(--ink-soft);font-size:10px;line-height:1.5}

/* E080-07 — bascule d'affichage des profils. */
.recit-e080-btn{min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:8px;background:rgba(255,255,255,.03);color:var(--ink-soft);font-size:10px;cursor:pointer}
.recit-e080-btn[aria-pressed="true"]{border-color:var(--gold);color:var(--gold-bright);background:rgba(230,185,111,.12)}

/* E080-08 — avertissement de contrôle d'intégrité. */
.recit-e080-warn{margin:8px 0;padding:7px 10px;border-left:3px solid var(--gold);background:rgba(230,185,111,.08);color:var(--ink);font-size:10px;line-height:1.5}

/* E080-10 — focus, cibles tactiles et mouvement réduit. */
.recit-e080-btn:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
.recit-layout[data-e080-motion="reduce"] .recit-e080-btn,
.recit-layout[data-e080-motion="reduce"] .recit-e080-source{transition:none}
@media (prefers-reduced-motion:reduce){
  .recit-e080-btn,.recit-e080-source{transition:none}
}
@media (max-width:620px){
  .recit-e080-btn{min-height:40px}
  .recit-e080-dossier{padding:8px 10px}
}
`;

/* État de la bascule E080-07 : survit aux reconstructions du DOM par la coque. */
let profilsVisibles = true;

function ajouteClasse(noeud, nom) {
  if (noeud && noeud.classList && !noeud.classList.contains(nom)) noeud.classList.add(nom);
}

/* Crée un nœud via l'usine du contrat, ou réutilise celui portant l'id.
   L'insertion est non destructive et idempotente (un seul nœud par id). */
function creeOuReutilise(id, tag, cls, parent, el, before) {
  if (typeof document === 'undefined' || !parent) return null;
  let noeud = document.getElementById(id);
  if (!noeud || typeof noeud.appendChild !== 'function') {
    noeud = el(tag, cls);
    noeud.id = id;
  } else if (cls && noeud.classList && !noeud.classList.contains(cls)) {
    noeud.classList.add(cls);
  }
  if (noeud.parentElement !== parent) {
    if (before && before.parentElement === parent) parent.insertBefore(noeud, before);
    else parent.appendChild(noeud);
  }
  return noeud;
}

function infosConf(valeur) {
  return CONF[valeur] || { mark: '•', label: valeur || 'non précisée' };
}

/* Identifiants de source lus sur le paragraphe de la tracabilité repliée. */
function identifiantsSource(trace) {
  if (!trace || typeof trace.textContent !== 'string') return [];
  let src = trace.textContent;
  const paragraphes = typeof trace.querySelectorAll === 'function' ? trace.querySelectorAll('p') : [];
  if (paragraphes.length) src = paragraphes[paragraphes.length - 1].textContent || src;
  const idx = src.indexOf('Identifiants');
  if (idx < 0) return [];
  const brut = src.slice(idx).replace(/^Identifiants\s*:\s*/i, '').split('.')[0];
  return brut.split(',').map((part) => part.trim()).filter(Boolean);
}

/* Origine temporelle : titre du repère et millésime lus dans .recit-meta. */
function origine(meta) {
  const texte = String(meta?.textContent || '');
  const parties = texte.split('·').map((part) => part.trim()).filter(Boolean);
  let annee = '';
  for (const partie of parties) {
    if (/^\d{3,4}$/.test(partie) || /^\d+\s*av\.\s*J\.-C\.$/i.test(partie)) { annee = partie; break; }
  }
  return { titre: parties[0] || '', annee };
}

/* Valeur de certitude déduite du libellé de la pastille .recit-conf. */
function valeurChip(chip) {
  const texte = String(chip?.textContent || '');
  for (const valeur of Object.keys(CONF)) {
    if (texte.indexOf(CONF[valeur].label) >= 0) return valeur;
  }
  return '';
}

/* Position et nature lues dans le kicker « Étape X / N · kind ». */
function reference(kicker) {
  const texte = String(kicker?.textContent || '');
  const pos = texte.match(/Étape\s+(\d+)\s*\/\s*(\d+)/i);
  const nature = texte.match(/·\s*([^\s·]+)/);
  return { x: pos ? pos[1] : '', n: pos ? pos[2] : '', kind: nature ? nature[1] : '' };
}

/* Effectifs par valeur d'un attribut de données du fil. */
function compteurs(items, cle) {
  const sorts = {};
  items.forEach((item) => {
    if (!item || !item.dataset) return;
    const valeur = item.dataset[cle] || 'autre';
    sorts[valeur] = (sorts[valeur] || 0) + 1;
  });
  return sorts;
}

register('E080', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;
  try {
    if (typeof document === 'undefined' || !layout || typeof layout.querySelector !== 'function') return;
    css('recit-e080', CSS); /* un seul appel, toutes les règles du module. */

    const body = layout.querySelector('.recit-body');
    const meta = layout.querySelector('.recit-meta');
    const confChip = layout.querySelector('.recit-conf');
    const kicker = layout.querySelector('.view-kicker');
    const actions = layout.querySelector('.recit-actions');
    const status = layout.querySelector('.c3a-status');
    const trace = layout.querySelector('.recit-trace');
    const sourcesNote = layout.querySelector('.recit-sources');
    const thread = layout.querySelector('.recit-thread');
    const items = thread && typeof thread.querySelectorAll === 'function'
      ? Array.from(thread.querySelectorAll('.recit-thread-item')) : [];
    const courant = items.find((noeud) => noeud.classList.contains('is-current'))
      || (thread && typeof thread.querySelector === 'function' ? thread.querySelector('[aria-current="step"]') : null);

    const ids = identifiantsSource(trace);
    const avecSource = ids.length > 0;
    const orig = origine(meta);
    const ref = reference(kicker);
    const confChipVal = valeurChip(confChip);
    const confFilVal = courant && courant.dataset ? (courant.dataset.confidence || '') : '';
    const coherence = (confChipVal && confFilVal && confChipVal !== confFilVal) ? 'mismatch'
      : (confChipVal && confFilVal ? 'ok' : 'unknown');

    /* E080-01 — badge de couverture des sources du point courant. */
    if (meta) {
      const badge = creeOuReutilise('e080-source-badge', 'span', 'recit-e080-source', meta, el, null);
      if (badge) {
        badge.textContent = avecSource
          ? `Provenance : ${ids.length} référence${ids.length > 1 ? 's' : ''} locale${ids.length > 1 ? 's' : ''}`
          : 'Provenance : aucune source attachée';
        badge.setAttribute('aria-label', badge.textContent);
        badge.setAttribute('data-e080-source-count', String(ids.length));
      }
    }

    /* E080-02 — marque de certitude lisible sur chaque item du fil. */
    items.forEach((item) => {
      if (!item || !item.setAttribute || item.getAttribute('data-e080-mark') === '1') return;
      const valeur = item.dataset ? (item.dataset.confidence || '') : '';
      const info = infosConf(valeur);
      const marque = el('span', 'recit-e080-mark', info.mark);
      marque.setAttribute('aria-hidden', 'true');
      item.appendChild(marque);
      const label = item.getAttribute('aria-label') || '';
      item.setAttribute('aria-label', `${label}${label ? ', ' : ''}certitude : ${info.label}`);
      item.setAttribute('data-e080-mark', '1');
    });

    /* E080-03 / E080-04 — profils agrégés, dérivés des données du fil. */
    if (body && items.length) {
      const parConf = compteurs(items, 'confidence');
      const confP = creeOuReutilise('e080-conf-profile', 'p', 'recit-e080-profile', body, el,
        status ? status.nextSibling : null);
      if (confP) {
        const detail = Object.keys(CONF)
          .map((cle) => `${CONF[cle].mark} ${CONF[cle].label} ×${parConf[cle] || 0}`).join(' · ');
        confP.textContent = `Profil de certitude du repère : ${detail} (sur ${items.length} point${items.length > 1 ? 's' : ''} affiché${items.length > 1 ? 's' : ''}).`;
      }
      const parKind = compteurs(items, 'kind');
      const kindP = creeOuReutilise('e080-kind-profile', 'p', 'recit-e080-profile', body, el,
        confP ? confP.nextSibling : null);
      if (kindP) {
        const natures = KINDS.concat(Object.keys(parKind).filter((cle) => !KINDS.includes(cle)));
        const detail = natures.map((cle) => `${cle} ×${parKind[cle] || 0}`).join(' · ');
        kindP.textContent = `Nature des points affichés : ${detail} (sur ${items.length}).`;
      }
    }

    /* E080-05 — dossier de provenance structuré du point courant. */
    if (body) {
      const dossier = creeOuReutilise('e080-dossier', 'dl', 'recit-e080-dossier', body, el,
        trace ? trace.nextSibling : (sourcesNote ? sourcesNote.nextSibling : null));
      if (dossier && typeof dossier.replaceChildren === 'function') {
        const lignes = [
          ['Référence du point', ref.x ? `Point ${ref.x} sur ${ref.n}` : 'position indisponible'],
          ['Nature', ref.kind || 'non précisée'],
          ['Certitude', confChipVal ? infosConf(confChipVal).label : 'non précisée'],
          ['Repère d’origine', orig.titre ? `${orig.titre}${orig.annee ? ' · ' + orig.annee : ''}` : 'non précisé'],
          ['Identifiants de source', avecSource ? ids.join(', ') : 'aucun identifiant attaché'],
        ];
        dossier.replaceChildren();
        lignes.forEach(([terme, valeur]) => {
          dossier.append(el('dt', '', terme), el('dd', '', valeur));
        });
      }
    }

    /* E080-06 — ancrage temporel et origine des mentions. */
    if (body && orig.titre) {
      const ancrage = creeOuReutilise('e080-anchor', 'p', 'recit-e080-anchor', body, el,
        meta ? meta.nextSibling : null);
      if (ancrage) {
        ancrage.textContent = `Origine du repère : ${orig.titre}${orig.annee ? ' · ' + orig.annee : ''}. Les mentions de type et de certitude sont reprises de l’audit local.`;
      }
    }

    /* E080-07 — bascule d'affichage des profils de données. */
    if (actions) {
      const bouton = creeOuReutilise('e080-profiles-toggle', 'button', 'recit-e080-btn', actions, el, null);
      if (bouton) {
        bouton.type = 'button';
        const libelle = profilsVisibles ? 'Profils de données : masquer' : 'Profils de données : afficher';
        bouton.textContent = libelle;
        bouton.setAttribute('aria-label', libelle);
        bouton.setAttribute('aria-pressed', profilsVisibles ? 'true' : 'false');
        if (body) {
          if (profilsVisibles) body.classList.remove('recit-e080-hide-profiles');
          else ajouteClasse(body, 'recit-e080-hide-profiles');
        }
        if (bouton.getAttribute('data-e080-bound') !== '1') {
          bouton.setAttribute('data-e080-bound', '1');
          bouton.addEventListener('click', () => {
            profilsVisibles = !profilsVisibles;
            const corps = document.querySelector('.recit-body');
            const btn = document.getElementById('e080-profiles-toggle');
            if (corps) {
              if (profilsVisibles) corps.classList.remove('recit-e080-hide-profiles');
              else corps.classList.add('recit-e080-hide-profiles');
            }
            if (btn) {
              const texte = profilsVisibles ? 'Profils de données : masquer' : 'Profils de données : afficher';
              btn.textContent = texte;
              btn.setAttribute('aria-label', texte);
              btn.setAttribute('aria-pressed', profilsVisibles ? 'true' : 'false');
            }
          });
        }
      }
    }

    /* E080-08 — contrôle d'intégrité entre la pastille et le fil. */
    if (body && coherence === 'mismatch') {
      const alerte = creeOuReutilise('e080-consistency-warn', 'p', 'recit-e080-warn', body, el, null);
      if (alerte) {
        alerte.setAttribute('role', 'note');
        alerte.textContent = 'Contrôle de provenance : la certitude affichée pour le point diffère de celle enregistrée dans le fil. Vérifier la donnée source.';
      }
    } else {
      const restant = document.getElementById('e080-consistency-warn');
      if (restant && restant.parentElement) restant.parentElement.removeChild(restant);
    }

    /* E080-09 — métadonnées de provenance lisibles par machine. */
    if (body && body.setAttribute) {
      body.setAttribute('data-e080-kind', ref.kind || '');
      body.setAttribute('data-e080-confidence', confChipVal || confFilVal || '');
      body.setAttribute('data-e080-sources', String(ids.length));
      body.setAttribute('data-e080-has-source', avecSource ? 'true' : 'false');
      body.setAttribute('data-e080-ref', ref.x ? `${ref.x}/${ref.n}` : '');
      body.setAttribute('data-e080-consistency', coherence);
    }

    /* E080-10 — portée, focus, cibles tactiles et mouvement réduit. */
    ajouteClasse(layout, 'recit-e080-root');
    if (layout.setAttribute) {
      const reduit = reducedMotion && typeof reducedMotion === 'function' && reducedMotion();
      layout.setAttribute('data-e080-motion', reduit ? 'reduce' : 'normal');
    }
  } catch {
    /* Une lentille défaillante ne doit jamais casser le rendu de la vue. */
  }
});
