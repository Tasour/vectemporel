/** Contenu Outils du menu bas. */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from '../navConfig';
import { useNavItemAction } from '../useNavItemAction';
import { useTimelineQuickControls } from '../../timeline/useTimelineQuickControls';
import { useNavigationStore } from '@/stores/navigationStore';
import { useTimelineStore } from '@/stores/timelineStore';
import styles from '../BottomDock/BottomDock.module.css';

const ResetIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
  </svg>
);

const SearchIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M15.5 14h-.8l-.3-.3a6.5 6.5 0 1 0-.7.7l.3.3v.8l5 5 1.4-1.4-5-5zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z" />
  </svg>
);

const PlayIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    {active ? <path d="M6 6h12v12H6z" /> : <path d="M8 5v14l11-7z" />}
  </svg>
);

export interface ToolsPanelProps {
  onClose: () => void;
}

export const ToolsPanel: React.FC<ToolsPanelProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const onItemClick = useNavItemAction();
  const controls = useTimelineQuickControls();
  const drawerOpen = useNavigationStore((state) => state.drawerOpen);
  const drawerContent = useNavigationStore((state) => state.drawerContent);
  const isAutoplayActive = useTimelineStore((state) => state.isAutoplayActive);

  const run = (action: () => void) => {
    action();
    onClose();
  };

  const secondary = NAV_ITEMS.filter((item) => item.id === 'settings' || item.id === 'help');

  return (
    <div data-testid="bottom-dock-tools-sheet">
      <div className={styles['sheetGrid']}>
        {secondary.map((item) => {
          const label = t(`nav.${item.id}`, item.label);
          const active = drawerOpen && drawerContent === item.action;
          return (
            <button
              key={item.id}
              type="button"
              className={`${styles['item'] ?? ''} ${active ? styles['active'] ?? '' : ''}`}
              onClick={() => {
                onClose();
                onItemClick(item);
              }}
              aria-label={label}
              aria-pressed={active}
              data-testid={`bottom-dock-tools-${item.id}`}
            >
              <span className={styles['itemIcon']} aria-hidden="true">{item.icon}</span>
              <span className={styles['itemLabel']}>{t(`nav.short.${item.id}`, label)}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`${styles['item'] ?? ''} ${controls.isExpanded ? styles['active'] ?? '' : ''}`}
          onClick={() => run(controls.toggleExpand)}
          aria-label={controls.isExpanded ? t('timeline.collapseTimeline', 'Réduire') : t('timeline.expandTimeline', 'Agrandir')}
          aria-pressed={controls.isExpanded}
          data-testid="bottom-dock-tools-expand"
        >
          <span className={styles['itemIcon']} aria-hidden="true">{controls.isExpanded ? '▾' : '▴'}</span>
          <span className={styles['itemLabel']}>{t('timeline.short.expand', controls.isExpanded ? 'Réduire' : 'Agrandir')}</span>
        </button>
        <button
          type="button"
          className={styles['item']}
          onClick={() => run(controls.reset)}
          disabled={controls.isDefaultView}
          aria-label={t('timeline.resetView', 'Réinitialiser')}
          data-testid="bottom-dock-tools-reset"
        >
          <span className={styles['itemIcon']} aria-hidden="true"><ResetIcon /></span>
          <span className={styles['itemLabel']}>{t('timeline.short.reset', 'Réinitialiser')}</span>
        </button>
        <button
          type="button"
          className={`${styles['item'] ?? ''} ${controls.isSearchOpen ? styles['active'] ?? '' : ''}`}
          onClick={() => run(controls.toggleSearch)}
          aria-label={t('timeline.searchEpics', 'Épopées')}
          aria-pressed={controls.isSearchOpen}
          data-testid="bottom-dock-tools-search"
        >
          <span className={styles['itemIcon']} aria-hidden="true"><SearchIcon /></span>
          <span className={styles['itemLabel']}>{t('timeline.short.search', 'Épopées')}</span>
        </button>
        <button
          type="button"
          className={`${styles['item'] ?? ''} ${isAutoplayActive ? styles['active'] ?? '' : ''}`}
          onClick={() => run(controls.toggleAutoplay)}
          aria-label={isAutoplayActive ? t('timeline.stopAutoplay', 'Arrêter') : t('timeline.autoplay', 'Lecture')}
          aria-pressed={isAutoplayActive}
          data-testid="bottom-dock-tools-autoplay"
        >
          <span className={styles['itemIcon']} aria-hidden="true"><PlayIcon active={isAutoplayActive} /></span>
          <span className={styles['itemLabel']}>{t('timeline.short.autoplay', isAutoplayActive ? 'Arrêter' : 'Lecture')}</span>
        </button>
      </div>
    </div>
  );
};

export default ToolsPanel;
