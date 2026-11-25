/** Barre de navigation mobile : accès direct aux actions, sous la timeline. */

import React from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS, type NavItemConfig } from '../navConfig';
import { useNavItemAction } from '../useNavItemAction';
import { useNavigationStore } from '@/stores/navigationStore';
import { useTimelineStore } from '@/stores/timelineStore';
import styles from './MobileDock.module.css';

export interface MobileDockProps {
  testId?: string;
}

export const MobileDock: React.FC<MobileDockProps> = ({ testId = 'mobile-dock' }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const onItemClick = useNavItemAction();
  const drawerOpen = useNavigationStore((state) => state.drawerOpen);
  const drawerContent = useNavigationStore((state) => state.drawerContent);
  const isAutoplayActive = useTimelineStore((state) => state.isAutoplayActive);

  const isActive = (item: NavItemConfig): boolean => {
    if (item.to) {
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    }
    if (item.action === 'play') return isAutoplayActive;
    if (item.action && ['layers', 'collections', 'settings'].includes(item.action)) {
      return drawerOpen && drawerContent === item.action;
    }
    return false;
  };

  return (
    <nav className={styles['dock']} aria-label="Navigation mobile" data-testid={testId}>
      <div className={styles['items']}>
        {NAV_ITEMS.map((item) => {
          const label = t(`nav.${item.id}`, item.label);
          const shortLabel = t(`nav.short.${item.id}`, label);
          const active = isActive(item);
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles['item'] ?? ''} ${active ? styles['active'] ?? '' : ''}`}
              onClick={() => onItemClick(item)}
              aria-label={label}
              aria-current={item.to && active ? 'page' : undefined}
              aria-pressed={item.action === 'play' ? active : undefined}
              data-testid={`mobile-dock-${item.id}`}
            >
              <span className={styles['itemIcon']} aria-hidden="true">
                {item.icon}
              </span>
              <span className={styles['itemLabel']}>{shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileDock;
