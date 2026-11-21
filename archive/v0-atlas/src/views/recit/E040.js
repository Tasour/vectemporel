import { register } from './registry.js';

/* Lentille E040 — Données, traçabilité et provenance.
   Dix enrichissements indépendants et non destructifs de la vue Récit.
   Lecture seule : aucun fichier partagé n'est modifié, aucune donnée historique
   n'est inventée. Les chiffres de référence (901 points, 587 sans source)
   proviennent de l'inventaire de l'atlas ; tout le reste est dérivé du DOM
   déjà rendu. Zéro réseau, zéro console, zéro aléa. */
register('E040', (ctx) => {
  const { stage, layout, css, el, reducedMotion } = ctx;

  /* Bloc CSS unique, préfixé, injecté une seule fois par cssOnce. */
  css('recit-e040', `
.recit-e040-provenance{margin:10px 0 4px;padding:9px 11px;border:1px solid var(--line);border-left:3px solid var(--gold);border-radius:8px;background:rgba(255,255,255,.02);color:var(--muted);font-size:9px;line-height:1.55}
.recit-e040-provenance dl{display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin:5px 0 0}
.recit-e040-provenance dt{color:var(--muted-2)}
.recit-e040-provenance dd{margin:0;color:var(--ink);font-variant-numeric:tabular-nums}
.recit-e040-title{margin:0 0 3px;color:var(--gold-bright);font-size:9px;letter-spacing:.08em;text-transform:uppercase}
.recit-e040-trace-badge{display:inline-flex;align-items:center;gap:4px;margin-left:6px;padding:2px 7px;border:1px solid var(--line-strong);border-radius:999px;font-size:9px;white-space:nowrap}
.recit-e040-trace-badge.is-sourced{color:var(--gold-bright)}
.recit-e040-trace-badge.is-unsourced{color:var(--muted)}
.recit-e040-tally{margin:5px 0 0;color:var(--muted);font-size:8px;line-height:1.6}
.recit-e040-conf-mark{margin-right:5px;color:var(--gold-bright);font-weight:700}
.recit-e040-citation{margin:8px 0 4px;padding:8px 11px;border:1px dashed var(--line-strong);border-radius:8px;background:rgba(0,0,0,.14);color:var(--muted)}
.recit-e040-citation-text{margin:0 0 7px;color:var(--ink);font-size:9px;line-height:1.55;overflow-wrap:anywhere}
.recit-e040-copy{min-height:28px;padding:2px 9px;border:1px solid var(--line);border-radius:7px;background:transparent;color:var(--gold-bright);font:inherit;font-size:9px;cursor:pointer}
.recit-e040-copy-status{margin-left:8px;color:var(--muted-2);font-size:9px}
.recit-e040-glossaire{margin-top:9px;color:var(--muted-2);font-size:8px}
.recit-e040-glossaire summary{min-height:26px;display:flex;align-items:center;cursor:pointer}
.recit-e040-glossaire p{margin:4px 0;line-height:1.6}
.recit-e040-share{margin:6px 0 0;color:var(--muted-2);font-size:8px;line-height:1.5;font-variant-numeric:tabular-nums}
.recit-e040-source-caption{margin:6px 0 2px;color:var(--muted);font-size:9px}
.recit-e040-source-list{margin:0;padding-left:18px;color:var(--muted);font-size:9px;line-height:1.6}
.recit-e040-source-id{color:var(--gold-bright);font-size:9px;overflow-wrap:anywhere}
.recit-e040-trace-btn{min-height:34px;padding:4px 10px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--gold-bright);font:inherit;font-size:10px;cursor:pointer}
.recit-e040-trace-btn[disabled]{opacity:.35;cursor:not-allowed}
.recit-e040-copy:focus-visible,.recit-e040-trace-btn:focus-visible,.recit-e040-glossaire summary:focus-visible{outline:2px solid var(--gold-bright);outline-offset:2px}
@media (max-width:620px){
  .recit-e040-provenance{font-size:10px}
  .recit-e040-copy{min-height:36px}
  .recit-e040-trace-btn{min-height:40px}
}
@media (prefers-reduced-motion:reduce){
  .recit-e040-provenance,.recit-e040-citation{transition:none}
}
`);

  /* Racine sûre : la vue est reconstruite à chaque rendu, on travaille dans le
     fragment courant uniquement. Tout échec local est absorbé. */
  if (typeof document === 'undefined') return;
  const root = (layout && typeof layout.querySelector === 'function')
    ? layout
    : (stage && typeof stage.querySelector === 'function' ? stage : null);
  if (!root) return;

  const q = (selector) => root.querySelector(selector);
  const qa = (selector) => Array.from(root.querySelectorAll(selector));
  const unique = (id) => !document.getElementById(id);
  const safe = (fn) => { try { fn(); } catch (_) { /* neutre : jamais de throw */ } };

  function insertAfter(node, reference) {
    if (!node || !reference || !reference.parentNode) return;
    reference.parentNode.insertBefore(node, reference.nextSibling);
  }

  /* Échelles de lecture des mentions d'audit : symbole + libellé, jamais la
     seule couleur. Les libellés reprennent ceux de la vue, sans réécriture. */
  const CONF = {
    'vérifié': { mark: '✓', label: 'Vérifié' },
    'certain': { mark: '■', label: 'Certain' },
    'probable': { mark: '◐', label: 'Probable' },
    'disputed': { mark: '≈', label: 'Contesté (terme source : disputed)' },
  };
  const KINDS = ['récit', 'figure', 'lieu', 'audit'];
  const TOTAL_POINTS = 901;      // inventaire de l'atlas
  const UNSOURCED_POINTS = 587;  // points sans identifiant de source

  function confInfo(value) {
    return CONF[value] || { mark: '•', label: value || 'mention inconnue' };
  }

  function stepNumbers() {
    const kicker = q('.view-kicker');
    const match = String(kicker?.textContent || '').match(/Étape\s+(\d+)\s*\/\s*(\d+)/);
    return {
      current: match ? parseInt(match[1], 10) : null,
      total: match ? parseInt(match[2], 10) : null,
    };
  }

  function eventTitle() {
    const meta = String(q('.recit-meta')?.textContent || '').trim();
    return meta.split(' · ')[0] || 'Repère courant';
  }

  const timing = q('.recit-timing');

  /* E040-01 — Fiche de provenance du jeu de données. */
  safe(() => {
    if (!unique('e040-provenance') || !timing) return;
    const panel = el('aside', 'recit-e040-provenance');
    panel.id = 'e040-provenance';
    panel.setAttribute('aria-label', 'Provenance du jeu de données');
    panel.appendChild(el('p', 'recit-e040-title', 'Provenance des données'));
    const dl = el('dl');
    const lines = [
      ['Origine', 'audits locaux + données curatées'],
      ['Points inventoriés', `${TOTAL_POINTS}`],
      ['Sans identifiant de source', `${UNSOURCED_POINTS} / ${TOTAL_POINTS}, soit environ ${Math.round((UNSOURCED_POINTS / TOTAL_POINTS) * 100)} %`],
      ['Ressources externes', '0 — aucune requête réseau'],
    ];
    lines.forEach(([key, value]) => {
      dl.appendChild(el('dt', '', key));
      dl.appendChild(el('dd', '', value));
    });
    panel.appendChild(dl);
    insertAfter(panel, timing);
  });

  /* E040-02 — Pastille de traçabilité du point courant. */
  safe(() => {
    if (!unique('e040-trace-badge')) return;
    const meta = q('.recit-meta');
    if (!meta) return;
    const withTrace = q('.recit-trace');
    const withNone = q('.recit-sources');
    if (!withTrace && !withNone) return;
    const sourced = Boolean(withTrace);
    let count = 1;
    if (sourced) {
      const match = String(withTrace.querySelector('summary')?.textContent || '')
        .match(/(\d+)\s+référence/);
      if (match) count = parseInt(match[1], 10) || 1;
    }
    const badge = el('span', 'recit-e040-trace-badge ' + (sourced ? 'is-sourced' : 'is-unsourced'),
      sourced ? `✓ ${count} référence(s) locale(s)` : '◌ Aucune source identifiée');
    badge.id = 'e040-trace-badge';
    badge.title = sourced
      ? 'Des identifiants de source locaux sont attachés à cette affirmation.'
      : 'Aucun identifiant de source n’est attaché à cette affirmation dans le jeu de données.';
    meta.appendChild(badge);
  });

  /* E040-03 — Décompte des degrés de certitude du repère, depuis le fil. */
  safe(() => {
    if (!unique('e040-conf-tally')) return;
    const legend = q('.recit-legend');
    if (!legend) return;
    const items = qa('#c3a-thread .c3a-thread-item[data-confidence]');
    if (!items.length) return;
    const counts = {};
    items.forEach((item) => {
      const key = item.getAttribute('data-confidence') || 'inconnu';
      counts[key] = (counts[key] || 0) + 1;
    });
    const parts = Object.keys(counts).map((key) => {
      const info = confInfo(key);
      return `${info.mark} ${info.label} ×${counts[key]}`;
    });
    const p = el('p', 'recit-e040-tally', `Certitudes du repère (${items.length} points) : ${parts.join(' · ')}.`);
    p.id = 'e040-conf-tally';
    legend.appendChild(p);
  });

  /* E040-04 — Décompte des types de points du repère, depuis le fil. */
  safe(() => {
    if (!unique('e040-kind-tally')) return;
    const legend = q('.recit-legend');
    if (!legend) return;
    const items = qa('#c3a-thread .c3a-thread-item[data-kind]');
    if (!items.length) return;
    const counts = {};
    items.forEach((item) => {
      const key = item.getAttribute('data-kind') || 'point';
      counts[key] = (counts[key] || 0) + 1;
    });
    const parts = KINDS.filter((key) => counts[key]).map((key) => `${key} ×${counts[key]}`);
    Object.keys(counts).filter((key) => !KINDS.includes(key))
      .forEach((key) => parts.push(`${key} ×${counts[key]}`));
    const p = el('p', 'recit-e040-tally', `Types du repère : ${parts.join(' · ')}.`);
    p.id = 'e040-kind-tally';
    legend.appendChild(p);
  });

  /* E040-05 — Marques de certitude sur le fil + annonce aux lecteurs d'écran. */
  safe(() => {
    qa('#c3a-thread .c3a-thread-item[data-confidence]').forEach((item) => {
      if (item.getAttribute('data-e040-conf') === '1') return;
      const value = item.getAttribute('data-confidence') || '';
      const info = confInfo(value);
      const mark = el('span', 'recit-e040-conf-mark', info.mark);
      mark.title = `Certitude : ${info.label}`;
      item.prepend(mark);
      const label = item.getAttribute('aria-label');
      if (label && label.indexOf('certitude :') === -1) {
        item.setAttribute('aria-label', `${label}, certitude : ${info.label}`);
      }
      item.setAttribute('data-e040-conf', '1');
    });
  });

  /* E040-06 — Citation du point courant, prête à copier, avec retour d'état. */
  safe(() => {
    if (!unique('e040-citation')) return;
    const titleText = String(q('#recit-point-title')?.textContent || '').trim();
    if (!titleText) return;
    const confText = String(q('.recit-conf')?.textContent || '').trim();
    const step = stepNumbers();
    const ref = `Vectemporel · ${eventTitle()} · point ${step.current ?? '?'} sur ${step.total ?? '?'}`
      + ` · ${confText} · ${titleText}`;
    const quote = el('blockquote', 'recit-e040-citation');
    quote.id = 'e040-citation';
    const text = el('p', 'recit-e040-citation-text', ref);
    const controls = el('p');
    const copy = el('button', 'recit-e040-copy', 'Copier la référence');
    copy.type = 'button';
    copy.setAttribute('aria-label', 'Copier la référence de provenance de ce point');
    const status = el('span', 'recit-e040-copy-status', '');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    copy.addEventListener('click', () => {
      let copied = false;
      try {
        const clip = typeof navigator !== 'undefined' ? navigator.clipboard : null;
        if (clip && typeof clip.writeText === 'function') {
          const attempt = clip.writeText(ref);
          copied = true;
          if (attempt && typeof attempt.catch === 'function') {
            attempt.catch(() => { status.textContent = 'Copie refusée : sélectionnez la référence.'; });
          }
        }
      } catch (_) { copied = false; }
      if (!copied) {
        try {
          const range = document.createRange();
          range.selectNodeContents(text);
          const selection = typeof window !== 'undefined' ? window.getSelection() : null;
          if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
            copied = true;
          }
        } catch (_) { copied = false; }
      }
      status.textContent = copied
        ? 'Référence copiée.'
        : 'Copie indisponible : sélectionnez la référence pour la copier.';
    });
    controls.append(copy, status);
    quote.append(text, controls);
    const panel = document.getElementById('e040-provenance');
    insertAfter(quote, panel || timing);
  });

  /* E040-07 — Glossaire de provenance des mentions et des types. */
  safe(() => {
    if (!unique('e040-glossaire')) return;
    const legend = q('.recit-legend');
    if (!legend) return;
    const details = el('details', 'recit-e040-glossaire');
    details.id = 'e040-glossaire';
    details.appendChild(el('summary', '', 'Vocabulaire de provenance'));
    details.appendChild(el('p', '',
      'Vérifié, certain, probable et contesté sont des mentions reprises des audits : '
      + 'elles décrivent le degré de confirmation d’une affirmation, jamais une opinion du lecteur.'));
    details.appendChild(el('p', '',
      'Récit, figure, lieu et audit désignent l’origine de l’affirmation : phrase de synthèse, '
      + 'acteur, repère géographique documenté ou énoncé issu d’un audit.'));
    legend.appendChild(details);
  });

  /* E040-08 — Ancrage local → inventaire global (part du repère courant). */
  safe(() => {
    if (!unique('e040-share')) return;
    const step = stepNumbers();
    if (!step.total || step.total <= 0) return;
    const share = (step.total / TOTAL_POINTS) * 100;
    const p = el('p', 'recit-e040-share',
      `Couverture locale : ce repère consulte ${step.total} point(s) sur les ${TOTAL_POINTS} inventoriés, `
      + `soit ${share.toFixed(1).replace('.', ',')} % de l’inventaire (${UNSOURCED_POINTS} points sans source au total).`);
    p.id = 'e040-share';
    const panel = document.getElementById('e040-provenance');
    const citation = document.getElementById('e040-citation');
    insertAfter(p, panel || citation || timing);
  });

  /* E040-09 — Identifiants de source structurés en liste, depuis la trace. */
  safe(() => {
    if (!unique('e040-source-list')) return;
    const details = q('.recit-trace');
    if (!details) return;
    const sourceText = String(details.querySelector('p')?.textContent || '');
    const match = sourceText.match(/Identifiants\s*:\s*([^.]+)\./);
    if (!match) return;
    const ids = match[1].split(',').map((value) => value.trim()).filter(Boolean);
    if (!ids.length) return;
    details.appendChild(el('p', 'recit-e040-source-caption', 'Identifiants structurés :'));
    const list = el('ul', 'recit-e040-source-list');
    list.id = 'e040-source-list';
    ids.forEach((id) => {
      const li = el('li');
      li.appendChild(el('code', 'recit-e040-source-id', id));
      list.appendChild(li);
    });
    details.appendChild(list);
  });

  /* E040-10 — Accès direct à la traçabilité depuis les commandes. */
  safe(() => {
    if (!unique('e040-trace-btn')) return;
    const actions = q('.recit-actions');
    if (!actions) return;
    const details = q('.recit-trace');
    const button = el('button', 'recit-e040-trace-btn', '◈ Voir la traçabilité');
    button.id = 'e040-trace-btn';
    button.type = 'button';
    if (!details) {
      button.disabled = true;
      button.title = 'Aucune source attachée à ce point.';
    } else {
      button.title = 'Ouvrir le détail des identifiants de source de ce point.';
      button.addEventListener('click', () => {
        try {
          details.open = true;
          const summary = details.querySelector('summary');
          if (summary) {
            summary.focus({ preventScroll: true });
            if (!reducedMotion() && typeof summary.scrollIntoView === 'function') {
              summary.scrollIntoView({ block: 'nearest' });
            }
          }
        } catch (_) { /* repli silencieux */ }
      });
    }
    actions.appendChild(button);
  });
});
