import { register } from './registry.js';

/* Lentille V2 E013 — contraste visuel appliqué aux planètes de la vue
   Constellation. Seconde passe : dix chantiers inédits, tous implémentés,
   sans réseau, sans source aléatoire et sans minuteur ni boucle propre.
   Préfixe exclusif : v2e013 (aucune collision avec la passe 1). */
register('E013', ctx => {
  /* Garde d'entrée : sans layout courant, aucun ajout au DOM n'est tenté. */
  if (!ctx || !ctx.layout || typeof document === 'undefined') return;
  const css = ctx.css;
  if (typeof css !== 'function') return;
  const layout = ctx.layout;
  const make = typeof ctx.el === 'function' ? ctx.el : (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  /* Feuille unique de la lentille. Aucune règle d'import, aucun url() distant,
     aucune couleur n'est le seul vecteur d'information : chaque signal V2 est
     doublé d'une forme, d'un contour ou d'un texte indexable. */
  css('constellation-v2-e013', `
.v2e013-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.constellation-field .const-planet[data-v2e013-etat="actif"]{
  border-style:dashed;
  box-shadow:0 0 0 2px rgba(0,0,0,.9),0 0 0 4px var(--gold-bright,#f5d99a),
    0 0 14px rgba(245,217,154,.6);
}
/* E013-03 — parité : les voisins immédiats ne partagent pas la même forme. */
.constellation-field .const-planet[data-v2e013-parite="pair"]:not([data-v2e013-etat="actif"]){border-style:double}
.constellation-field .const-planet[data-v2e013-parite="impair"]:not([data-v2e013-etat="actif"]){border-style:solid}
/* E013-04 — voisinage serré : anneau de séparation supplémentaire. */
.constellation-field .const-planet[data-v2e013-voisinage="serre"]{
  box-shadow:0 0 0 1px rgba(0,0,0,.95),0 0 0 3px rgba(244,214,158,.55),
    0 1px 4px rgba(0,0,0,.6);
}
/* E013-05 — halo du chiffre : contour de texte, distinct de l'ombre portée. */
.constellation-field[data-v2e013-halo="oui"] .const-planet{
  -webkit-text-stroke:.4px rgba(0,0,0,.95);
  paint-order:stroke fill;
}
/* E013-06 — étiquette à largeur bornée : plus de chevauchement entre voisins. */
.constellation-field[data-v2e013-etiquette="bornee"] .const-planet::after{
  max-width:18ch;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
/* E013-02 — correction sous le seuil AA : texte et bordure renforcés. */
.constellation-field[data-v2e013-sous-aa="oui"] .const-planet:not([data-v2e013-etat="actif"]){
  color:#fff;
  border-color:#fff;
  text-shadow:0 0 3px #000,0 1px 2px #000;
}
/* E013-08 — lunes du repère actif : contour renforcé, pas de couleur seule. */
.constellation-field .const-moon[data-v2e013-lune-active="oui"]{
  outline:2px solid var(--gold-bright,#f5d99a);
  outline-offset:2px;
}
/* E013-09 — bascule de contraste renforcé : cible >= 36 px. */
#v2e013-toggle{
  min-height:36px;
  padding:6px 12px;
  border:1px solid var(--gold,#e6b96f);
  border-radius:8px;
  background:var(--surface-2,rgba(255,255,255,.06));
  color:var(--gold-bright,#f5d99a);
  font-size:11px;
  cursor:pointer;
}
#v2e013-toggle:focus-visible{outline:3px solid var(--gold-bright,#f5d99a);outline-offset:3px}
#v2e013-toggle[aria-pressed="true"]{
  border-width:2px;
  border-style:double;
  background:var(--gold,#e6b96f);
  color:#1a1408;
}
.constellation-field[data-v2e013-renforce="oui"] .const-planet{
  border-width:2px;
  box-shadow:0 0 0 2px rgba(0,0,0,.9),0 0 0 4px var(--gold-bright,#f5d99a);
}
#v2e013-report{
  margin:6px 0 0;
  color:var(--ink,#f4f6f8);
  font-size:10px;
  line-height:1.5;
}
#v2e013-report[data-v2e013-sous-aa="oui"]{border-left:3px solid #fff;padding-left:8px}
/* E013-10 — repli mouvement réduit : aucune transition, contraste intact. */
.constellation-field.v2e013-sobre .const-planet,
.constellation-field.v2e013-sobre .const-moon{transition:none}
@media (prefers-reduced-motion: reduce){
  .constellation-field .const-planet,.constellation-field .const-moon{transition:none!important}
}
@media (prefers-contrast: more){
  .constellation-field .const-planet:not([data-v2e013-etat="actif"]){border-width:2px}
  .constellation-field .const-planet[data-v2e013-etat="actif"]{outline:3px double var(--gold-bright,#f5d99a)}
}
@media (forced-colors: active){
  .constellation-field .const-planet{border:2px solid CanvasText}
  .constellation-field .const-planet[data-v2e013-etat="actif"]{outline:3px double CanvasText}
  .constellation-field .const-moon[data-v2e013-lune-active="oui"]{outline:2px solid CanvasText}
}
  `);

  /* Pas de champ = pas de planètes à traiter ; la feuille reste inoffensive. */
  const field = layout.querySelector('.constellation-field');
  if (!field || typeof field.querySelectorAll !== 'function') return;
  const planets = Array.prototype.slice.call(field.querySelectorAll('button.const-planet'));
  if (!planets.length) return;
  const caption = layout.querySelector('.constellation-caption');

  /* Luminance relative WCAG d'une couleur calculée ; null si inexploitable. */
  const luminance = color => {
    if (typeof color !== 'string') return null;
    const parts = color.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
    if (!parts) return null;
    const channels = [parts[1], parts[2], parts[3]].map(raw => {
      const c = Math.max(0, Math.min(1, Number(raw) / 255));
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };

  /* Premier fond opaque rencontré en remontant l'arbre (le champ est transparent). */
  const effectiveBg = node => {
    let current = node;
    while (current && typeof window !== 'undefined'
           && typeof window.getComputedStyle === 'function') {
      let bg;
      try { bg = window.getComputedStyle(current).backgroundColor; }
      catch (error) { return null; }
      if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') return bg;
      current = current.parentElement;
    }
    return null;
  };

  const computedColor = node => {
    if (!node || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return null;
    try { return window.getComputedStyle(node).color; }
    catch (error) { return null; }
  };

  const french = value => String(value).replace('.', ',');

  /* E013-01 — Rapport de contraste WCAG calculé et publié dans la légende.
     Le rapport (Lclaire + 0,05) / (Lsombre + 0,05) est arrondi au dixième ;
     le texte indexable remplace une simple couleur indicative. */
  let ratio = null;
  const textLum = luminance(computedColor(planets[0]));
  const bgLum = luminance(effectiveBg(field));
  if (textLum !== null && bgLum !== null) {
    const high = Math.max(textLum, bgLum);
    const low = Math.min(textLum, bgLum);
    ratio = Math.round(((high + 0.05) / (low + 0.05)) * 10) / 10;
    field.dataset.v2e013Ratio = french(ratio);
  }
  let report = caption ? caption.querySelector('#v2e013-report') : null;
  if (caption && !report) {
    report = make('p', 'v2e013-report', '');
    report.id = 'v2e013-report';
    caption.appendChild(report);
  }
  const threshold = ratio === null ? 'indisponible'
    : ratio >= 7 ? 'seuil AAA atteint'
      : ratio >= 4.5 ? 'seuil AA atteint' : 'seuil AA non atteint';
  if (report) {
    report.textContent = ratio === null
      ? 'Contraste texte/fond : mesure indisponible sur ce rendu.'
      : `Contraste texte/fond mesuré : ${french(ratio)} pour 1 — ${threshold}.`;
  }

  /* E013-02 — Correction automatique sous le seuil AA : l'attribut pilote une
     inversion locale du chiffre et de la bordure, sans toucher au thème. */
  const belowAA = ratio !== null && ratio < 4.5;
  field.dataset.v2e013SousAa = belowAA ? 'oui' : 'non';
  if (report) report.setAttribute('data-v2e013-sous-aa', belowAA ? 'oui' : 'non');

  /* État V2 propre, indépendant de la passe 1 : l'actif garde un anneau tireté
     prioritaire sur le codage de parité. */
  planets.forEach(planet => {
    const active = !!(planet.classList && planet.classList.contains('is-active'));
    planet.setAttribute('data-v2e013-etat', active ? 'actif' : 'inactif');
    if (active) planet.setAttribute('aria-current', 'true');
  });

  /* E013-03 — Parité d'index : forme de bordure double pour les repères pairs,
     pleine pour les impairs. Deux voisins ne partagent jamais la même forme. */
  planets.forEach((planet, index) => {
    planet.dataset.v2e013Parite = index % 2 === 0 ? 'pair' : 'impair';
  });

  /* E013-04 — Voisinage serré déduit des positions --x/--y déjà posées par la
     vue : deux repères à moins de huit unités reçoivent un anneau de séparation.
     Aucune donnée inventée, aucun tirage, calcul géométrique déterministe. */
  const coords = planets.map(planet => {
    const x = parseFloat(planet.style.getPropertyValue('--x'));
    const y = parseFloat(planet.style.getPropertyValue('--y'));
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
  });
  let maxNeighbours = 0;
  planets.forEach((planet, index) => {
    const origin = coords[index];
    let neighbours = 0;
    if (origin) {
      coords.forEach((other, otherIndex) => {
        if (!other || otherIndex === index) return;
        const dx = origin.x - other.x;
        const dy = origin.y - other.y;
        if (dx * dx + dy * dy < 64) neighbours += 1;
      });
    }
    if (neighbours > maxNeighbours) maxNeighbours = neighbours;
    planet.dataset.v2e013Voisinage = neighbours > 0 ? 'serre' : 'large';
  });
  field.dataset.v2e013Voisins = String(maxNeighbours);

  /* E013-05 — Halo du chiffre : activation conditionnelle du contour de texte,
     complémentaire de l'ombre portée de la passe 1. */
  field.dataset.v2e013Halo = 'oui';

  /* E013-06 — Étiquette à largeur bornée : l'ellipse évite qu'un titre long
     recouvre le disque voisin ; le title d'origine reste intact. */
  field.dataset.v2e013Etiquette = planets.some(p => p.dataset.label) ? 'bornee' : 'libre';

  /* E013-07 — Région live de sélection : écrite en capture, avant le re-rendu
     de selectEvent, avec rang, libellé et contraste mesuré. */
  let live = layout.querySelector('#v2e013-live');
  if (!live) {
    live = make('p', 'v2e013-sr', '');
    live.id = 'v2e013-live';
    live.setAttribute('role', 'status');
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');
    layout.appendChild(live);
  }
  field.addEventListener('click', event => {
    const target = event && event.target;
    const planet = target && target.nodeType === 1 && typeof target.closest === 'function'
      ? target.closest('button.const-planet') : null;
    if (!planet || !field.contains(planet)) return;
    const index = planets.indexOf(planet);
    if (index < 0) return;
    const name = planet.dataset.label || planet.getAttribute('aria-label') || '';
    const suffix = ratio === null ? '' : ` Contraste ${french(ratio)} pour 1.`;
    live.textContent = `Repère ${index + 1} sur ${planets.length} : ${name}.${suffix}`;
  }, true);

  /* E013-08 — Lunes rattachées au repère actif : contour renforcé et rang
     respecté dans l'ensemble, sans modifier leur libellé ni leur couleur. */
  const moons = Array.prototype.slice.call(field.querySelectorAll('button.const-moon'));
  const hasActive = planets.some(planet => planet.getAttribute('data-v2e013-etat') === 'actif');
  moons.forEach((moon, index) => {
    moon.dataset.v2e013LuneIndex = `${index + 1}/${moons.length}`;
    if (hasActive) moon.dataset.v2e013LuneActive = 'oui';
  });
  field.dataset.v2e013Lunes = String(moons.length);

  /* E013-09 — Bascule indépendante de contraste renforcé : aria-pressed est
     légitime ici (état binaire autonome), la cible mesure au moins 36 px. */
  let toggle = layout.querySelector('#v2e013-toggle');
  if (caption && !toggle) {
    toggle = make('button', 'v2e013-toggle', 'Contraste renforcé');
    toggle.id = 'v2e013-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-pressed', 'false');
    let enhanced = false;
    toggle.addEventListener('click', () => {
      enhanced = !enhanced;
      field.dataset.v2e013Renforce = enhanced ? 'oui' : 'non';
      toggle.setAttribute('aria-pressed', enhanced ? 'true' : 'false');
      live.textContent = enhanced
        ? 'Contraste renforcé activé : bordures épaissies et anneau marqué.'
        : 'Contraste renforcé désactivé : retour au contraste standard.';
    });
    const back = caption.querySelector('.constellation-back');
    if (back && typeof back.parentNode === 'object') back.parentNode.insertBefore(toggle, back);
    else caption.appendChild(toggle);
  }
  if (!field.dataset.v2e013Renforce) field.dataset.v2e013Renforce = 'non';

  /* E013-10 — Mouvement réduit et contrastes forcés : la classe sobre retire
     les transitions ; les requêtes média renforcent contour et bordure sans
     minuteur ni boucle d'animation propre. */
  let sober = false;
  if (typeof ctx.reducedMotion === 'function') {
    try { sober = !!ctx.reducedMotion(); }
    catch (error) { sober = false; }
  }
  if (sober) field.classList.add('v2e013-sobre');
  else field.classList.remove('v2e013-sobre');
});
