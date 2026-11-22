#!/usr/bin/env node
/* Simultanéités : partage de souverain, limite, tri et déterminisme. */
import { arcPairs, linkedProvinces } from '../src/globe/simultaneity.js';

let failed = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const row = (ruler, population, culture = 'culture') => [ruler, culture, 'religion', 'Capitale', population];
const areas = {
  Berry: row('FRK', 1000),
  Paris: row('FRK', 9000, 'frankish'),
  Lyon: row('FRK', 5000, 'frankish'),
  Aachen: row('FRK', 20000, 'hessian'),
  Toulouse: row('FRK', 3000),
  London: row('ENG', 7000),
  Roma: row('', 10000),
  Athenae: null,
};

const linked = linkedProvinces(areas, 'Berry');
check('4 voisins maximum avec la sélection', linked.length === 4, `${linked.length}`);
check('même souverain', linked.every((item) => item.ruler === 'FRK'));
check('sélection exclue', linked.every((item) => item.name !== 'Berry'));
check('population décroissante', linked.map((item) => item.population).join(',') === '20000,9000,5000,3000');
check('ordre déterministe', JSON.stringify(linked) === JSON.stringify(linkedProvinces(areas, 'Berry')));
check('limite personnalisée', linkedProvinces(areas, 'Berry', 2).length === 1);
check('paires pour les arcs', JSON.stringify(arcPairs('Berry', linked)) === JSON.stringify([
  { from: 'Berry', to: 'Aachen' }, { from: 'Berry', to: 'Paris' },
  { from: 'Berry', to: 'Lyon' }, { from: 'Berry', to: 'Toulouse' },
]));
check('souverain vide : aucun lien', linkedProvinces(areas, 'Roma').length === 0);
check('province absente : aucun lien', linkedProvinces(areas, 'Inconnue').length === 0);
check('années sans zones : aucun lien', linkedProvinces(null, 'Berry').length === 0);
check('sans sélection : aucun lien', linkedProvinces(areas, null).length === 0);
check('ligne nulle ignorée', linkedProvinces(areas, 'Athenae').length === 0);

console.log(failed ? `${failed} échec(s)` : 'Simultanéités OK.');
process.exit(failed ? 1 : 0);
