/* Lentille E25 (= E025, navigation clavier) — point d'entrée historique.
   L'implémentation unique réside dans ./E25.js ; cet import la rend active
   sans modifier index.js, qui continue de charger E001.js … E100.js.
   Le cache des modules ES garantit un seul register('E25') par page. */
import './E25.js';
