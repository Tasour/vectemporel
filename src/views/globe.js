/* Porte d'entrée : globe 3D local, sans service externe. */
import { DATASET } from '../data/dataset.js';
import { countryByCode, selectCountry } from '../domain/store.js';

let host = null;
let initialized = false;
let engine = null;

function ensure() {
  if (host) return host;
  host = document.createElement('div');
  host.className = 'globe-host';
  host.id = 'globe-canvas';
  return host;
}

export function renderGlobe(stage) {
  const wrapper = document.createElement('div');
  wrapper.className = 'globe-view';
  const hostNode = ensure();
  wrapper.appendChild(hostNode);
  const list = document.createElement('div');
  list.className = 'globe-list';
  list.appendChild(Object.assign(document.createElement('h2'), { textContent: 'Dix pays documentés' }));
  const help = document.createElement('p');
  help.textContent = 'Tournez le globe et cliquez un pays coloré. La liste ci-dessous offre le même accès au clavier.';
  list.appendChild(help);
  DATASET.countries.forEach((country) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `${country.flag || ''} ${country.name} · ${country.events.length} repères`;
    button.addEventListener('click', () => selectCountry(country.id));
    list.appendChild(button);
  });
  wrapper.appendChild(list);
  stage.appendChild(wrapper);

  if (!initialized && window.THREE && window.VECTEMPOREL_GLOBE) {
    initialized = true;
    engine = window.VECTEMPOREL_GLOBE;
    engine.init(hostNode, {
      onSelect: (code) => {
        const country = countryByCode(code);
        if (country) selectCountry(country.id);
      },
    }).then(() => engine.open()).catch(() => {
      hostNode.textContent = 'Globe indisponible : utilisez la liste des pays.';
    });
  } else if (initialized && engine) {
    requestAnimationFrame(() => engine.resize());
  }
}
