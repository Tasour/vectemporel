import { mount } from './ui/shell.js';
import { subscribe, state } from './domain/store.js';
import { render } from './ui/shell.js';
import { initKeyboard } from './platform/keyboard.js';
import { DATASET } from './data/dataset.js';

mount(document.getElementById('app'));
subscribe(render);
initKeyboard();

window.VATLAS = {
  meta: DATASET.meta,
  getState: () => ({ ...state }),
  openCountry: (id) => import('./domain/store.js').then(({ selectCountry }) => selectCountry(id)),
  goView: (view) => import('./domain/store.js').then(({ goView }) => goView(view)),
};
