/* Lentille E027 (= E27, transitions) — point d'entrée historique.
   L'implémentation unique réside dans ./E27.js ; cet import la rend active
   sans modifier index.js, qui continue de charger E001.js … E100.js.
   Le cache des modules ES garantit un seul register('E27') par page. */
import './E27.js';
