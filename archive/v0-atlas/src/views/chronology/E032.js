/* Pont d'intégration : le stub E032 est importé par index.js. On y charge la
   lentille E32 (vague CHRONOLOGIE, sémantique des données) dont
   l'implémentation canonique réside dans E32.js. Les ES modules dédupliquent
   l'import : register('E32') n'est appelé qu'une fois, même si le maître ajoute
   aussi un import direct de E32.js. */
import './E32.js';
