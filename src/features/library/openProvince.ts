/** Ouvre une province dans le tiroir local, sans URL externe. */

import { useMapStore } from '@/stores/mapStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useUIStore } from '@/stores/uiStore';

export async function openProvince(provinceId: string, title: string): Promise<string | null> {
  const year = useTimelineStore.getState().selectedYear;
  await useMapStore.getState().loadAreaData(year);
  const data = useMapStore.getState().currentAreaData;
  if (!data?.[provinceId]) {
    return `La province « ${title} » n’est pas disponible en ${String(year)}.`;
  }
  useUIStore.getState().openRightDrawer({
    type: 'area',
    provinceId,
    provinceName: title,
  });
  return null;
}
