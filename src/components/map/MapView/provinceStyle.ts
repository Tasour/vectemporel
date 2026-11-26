/**
 * Calcul déterministe de la couleur d'une province pour une année.
 *
 * Extrait du effet `feature-state` de MapView pour être partagé avec la
 * surcouche de geste : les deux chemins doivent produire exactement la même
 * couleur, sinon le fondu au relâchement ferait clignoter la carte.
 */

import {
  DIMENSION_INDEX,
  FALLBACK_COLOR,
  type AreaColorDimension,
  type AreaData,
  type EntityMetadata,
} from '../../../stores/mapStore';
import { darkenColor } from '../../../utils/colorUtils';
import {
  DEFAULT_FILL_OPACITY,
  MAX_POPULATION_FOR_OPACITY,
  POPULATION_FILL_COLOR,
  POPULATION_OPACITY_MAX,
  POPULATION_OPACITY_MIN,
} from './MapView.constants';

export interface ProvinceStyle {
  fill: string;
  border: string;
  opacity: number;
  value: string | number | null | undefined;
}

export function getProvinceStyle(
  provinceId: string,
  areaData: AreaData,
  activeColor: AreaColorDimension,
  metadata: EntityMetadata,
  resolveReligionGeneral: (religionId: string) => string,
): ProvinceStyle {
  const data = areaData[provinceId];
  const dimensionIndex = DIMENSION_INDEX[activeColor];
  let fill = FALLBACK_COLOR;
  let border = '#3a3731';
  let opacity = DEFAULT_FILL_OPACITY;
  let value: string | number | null | undefined = data?.[dimensionIndex];

  if (activeColor === 'population') {
    const population = typeof data?.[4] === 'number' ? data[4] : 0;
    value = population;
    fill = POPULATION_FILL_COLOR;
    border = darkenColor(POPULATION_FILL_COLOR);
    opacity = POPULATION_OPACITY_MIN
      + (POPULATION_OPACITY_MAX - POPULATION_OPACITY_MIN)
      * Math.min(1, population / MAX_POPULATION_FOR_OPACITY);
  } else {
    if (activeColor === 'religionGeneral' && value) {
      value = resolveReligionGeneral(String(value));
    }
    if (value) {
      const color = metadata[activeColor][String(value)]?.color ?? FALLBACK_COLOR;
      fill = color;
      border = darkenColor(color);
    }
  }

  return { fill, border, opacity, value };
}
