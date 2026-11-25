/** Barre basse compacte : navigation principale + feuille Outils. */

import React, { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS, type NavItemConfig } from '../navConfig';
import { useNavItemAction } from '../useNavItemAction';
import { useTimelineQuickControls } from '../../timeline/useTimelineQuickControls';
import { useNavigationStore } from '@/stores/navigationStore';
import { useTimelineStore } from '@/stores/timelineStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './BottomDock.module.css';

export interface BottomDockProps {
  testId?: string;
}

const DIRECT_IDS = ['discover', 'random', 'layers', 'collections'];
const SECONDARY_IDS = ['settings', 'help'];

const ToolsIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
  </svg>
);

const CollapseIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M12 15.5 5.5 9l1.4-1.4L12 12.7l5.1-5.1L18.5 9z" />
  </svg>
);

const ExpandIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M12 8.5 18.5 15l-1.4 1.4L12 11.3 6.9 16.4 5.5 15z" />
  </svg>
);

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

const AutoplayIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    {active ? <path d="M6 6h12v12H6z" /> : <path d="M8 5v14l11-7z" />}
  </svg>
);

interface DockButtonProps {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  testId: string;
}

const DockButton: React.FC<DockButtonProps> = ({
  icon,
  label,
  shortLabel,
  onClick,
  disabled = false,
  active = false,
  pressed,
  expanded,
  testId,
}) => (
  <button
    type="button"
    className={`${styles['item'] ?? ''} ${active ? styles['active'] ?? '' : ''}`}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-pressed={pressed}
    aria-expanded={expanded}
    data-testid={testId}
  >
    <span className={styles['itemIcon']} aria-hidden="true">
      {icon}
    </span>
    <span className={styles['itemLabel']}>{shortLabel}</span>
  </button>
);

export const BottomDock: React.FC<BottomDockProps> = ({ testId = 'bottom-dock' }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const onItemClick = useNavItemAction();
  const drawerOpen = useNavigationStore((state) => state.drawerOpen);
  const drawerContent = useNavigationStore((state) => state.drawerContent);
  const isAutoplayActive = useTimelineStore((state) => state.isAutoplayActive);
  const toolsOpen = useUIStore((state) => state.bottomToolsOpen);
  const setToolsOpen = useUIStore((state) => state.setBottomToolsOpen);
  const controls = useTimelineQuickControls();
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const closeTools = useCallback(() => setToolsOpen(false), [setToolsOpen]);
  const runControl = useCallback(
    (action: () => void) => {
      action();
      setToolsOpen(false);
    },
    [setToolsOpen],
  );

  useEffect(() => {
    if (!toolsOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeTools();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && !target.closest(`[data-testid="${testId}"]`)) closeTools();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [closeTools, testId, toolsOpen]);

  useEffect(() => {
    if (toolsOpen) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      sheetRef.current?.querySelector('button')?.focus();
      return;
    }
    if (triggerRef.current) {
      triggerRef.current.focus();
      triggerRef.current = null;
    }
  }, [toolsOpen]);

  const isNavActive = (item: NavItemConfig): boolean => {
    if (item.to) {
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    }
    if (item.action === 'play') return isAutoplayActive;
    if (item.action && ['layers', 'collections', 'settings'].includes(item.action)) {
      return drawerOpen && drawerContent === item.action;
    }
    return false;
  };

  const directItems = NAV_ITEMS.filter((item) => DIRECT_IDS.includes(item.id));
  const secondaryItems = NAV_ITEMS.filter((item) => SECONDARY_IDS.includes(item.id));

  const expandLabel = controls.isExpanded
    ? t('timeline.collapseTimeline', 'Réduire la chronologie')
    : t('timeline.expandTimeline', 'Agrandir la chronologie');
  const autoplayLabel = isAutoplayActive
    ? t('timeline.stopAutoplay', 'Arrêter la lecture')
    : t('timeline.autoplay', 'Démarrer la lecture');

  return (
    <div className={styles['dock']} data-testid={testId}>
      {toolsOpen ? (
        <div ref={sheetRef} className={styles['toolsSheet']} role="dialog" aria-label={t('nav.tools', 'Outils')} data-testid="bottom-dock-tools-sheet">
          <p className={styles['sheetTitle']}>{t('nav.tools', 'Outils')}</p>
          <div className={styles['sheetGrid']}>
            {secondaryItems.map((item) => {
              const label = t(`nav.${item.id}`, item.label);
              return (
                <DockButton
                  key={item.id}
                  icon={item.icon}
                  label={label}
                  shortLabel={t(`nav.short.${item.id}`, label)}
                  onClick={() => {
                    closeTools();
                    onItemClick(item);
                  }}
                  active={isNavActive(item)}
                  testId={`bottom-dock-tools-${item.id}`}
                />
              );
            })}
            <DockButton
              icon={controls.isExpanded ? <CollapseIcon /> : <ExpandIcon />}
              label={expandLabel}
              shortLabel={t('timeline.short.expand', controls.isExpanded ? 'Réduire' : 'Agrandir')}
              onClick={() => runControl(controls.toggleExpand)}
              active={controls.isExpanded}
              pressed={controls.isExpanded}
              testId="bottom-dock-tools-expand"
            />
            <DockButton
              icon={<ResetIcon />}
              label={t('timeline.resetView', 'Réinitialiser la chronologie')}
              shortLabel={t('timeline.short.reset', 'Réinitialiser')}
              onClick={() => runControl(controls.reset)}
              disabled={controls.isDefaultView}
              testId="bottom-dock-tools-reset"
            />
            <DockButton
              icon={<SearchIcon />}
              label={t('timeline.searchEpics', 'Rechercher des épopées')}
              shortLabel={t('timeline.short.search', 'Épopées')}
              onClick={() => runControl(controls.toggleSearch)}
              active={controls.isSearchOpen}
              pressed={controls.isSearchOpen}
              testId="bottom-dock-tools-search"
            />
            <DockButton
              icon={<AutoplayIcon active={isAutoplayActive} />}
              label={autoplayLabel}
              shortLabel={t('timeline.short.autoplay', isAutoplayActive ? 'Arrêter' : 'Lecture')}
              onClick={() => runControl(controls.toggleAutoplay)}
              active={isAutoplayActive || controls.isAutoplayMenuOpen}
              pressed={isAutoplayActive}
              testId="bottom-dock-tools-autoplay"
            />
          </div>
        </div>
      ) : null}

      <div className={styles['row']} data-testid="bottom-dock-navigation">
        {directItems.map((item) => {
          const label = t(`nav.${item.id}`, item.label);
          return (
            <DockButton
              key={item.id}
              icon={item.icon}
              label={label}
              shortLabel={t(`nav.short.${item.id}`, label)}
              onClick={() => onItemClick(item)}
              active={isNavActive(item)}
              testId={`bottom-dock-${item.id}`}
            />
          );
        })}
        <DockButton
          icon={<ToolsIcon />}
          label={t('nav.tools', 'Outils')}
          shortLabel={t('nav.tools', 'Outils')}
          onClick={() => setToolsOpen(!toolsOpen)}
          active={toolsOpen}
          pressed={toolsOpen}
          expanded={toolsOpen}
          testId="bottom-dock-tools"
        />
      </div>
    </div>
  );
};

export default BottomDock;
