/* Point d'entrée du bundle D3 local : uniquement les fonctions utilisées par
 * la vue Histomap. D3 v7.9.2, ISC, © Mike Bostock — voir vendor/D3-LICENSES.md. */
import d3 from '../vendor/d3.cjs';

export const {
  select,
  scaleLinear,
  stack,
  stackOrderInsideOut,
  stackOffsetWiggle,
  area,
  curveBasis,
  axisBottom,
  axisLeft,
  max,
  format,
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  zoom,
  drag,
} = d3;
