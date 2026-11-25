/** Barre basse compacte : navigation principale et ouverture du menu Outils. */

import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS, type NavItemConfig } from '../navConfig';
import { useNavItemAction } from '../useNavItemAction';
import { useNavigationStore } from '@/stores/navigationStore';
import { useUIStore } from '@/stores/uiStore';
import styles from './BottomDock.module.css';

export interface BottomDockProps {
  testId?: string;
}

const ToolsIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
    <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" />
  </svg>
);

interface DockButtonProps {
  icon: React.ReactNode;
  label: string;
  shortLabel: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
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
  expanded,
  testId,
}) => (
  <button
    type="button"
    className={`${styles['item'] ?? ''} ${active ? styles['active'] ?? '' : ''}`}
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    aria-expanded={expanded}
    aria-controls="bottom-menu"
    data-testid={testId}
  >
    <span className={styles['itemIcon']} aria-hidden="true">{icon}</span>
    <span className={styles['itemLabel']}>{shortLabel}</span>
  </button>
);

export const BottomDock: React.FC<BottomDockProps> = ({ testId = 'bottom-dock' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const onItemClick = useNavItemAction();
  const drawerOpen = useNavigationStore((state) => state.drawerOpen);
  const drawerContent = useNavigationStore((state) => state.drawerContent);
  const toolsOpen = useUIStore((state) => state.bottomToolsOpen);
  const setToolsOpen = useUIStore((state) => state.setBottomToolsOpen);

  const isNavActive = (item: NavItemConfig): boolean => {
    if (item.to) {
      return location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
    }
    if (item.action === 'discover') return drawerOpen && drawerContent === 'discover';
    if (item.action && ['layers', 'collections', 'settings'].includes(item.action)) {
      return drawerOpen && drawerContent === item.action;
    }
    return false;
  };

  const handleClick = (item: NavItemConfig) => {
    if (item.to) {
      void navigate(item.to);
      return;
    }
    setToolsOpen(false);
    onItemClick(item);
  };

  const directItems = NAV_ITEMS.filter((item) => ['discover', 'random', 'layers', 'collections'].includes(item.id));

  return (
    <div className={styles['dock']} data-testid={testId}>
      <div className={styles['row']} data-testid="bottom-dock-navigation">
        {directItems.map((item) => {
          const label = t(`nav.${item.id}`, item.label);
          return (
            <DockButton
              key={item.id}
              icon={item.icon}
              label={label}
              shortLabel={t(`nav.short.${item.id}`, label)}
              onClick={() => handleClick(item)}
              active={isNavActive(item)}
              expanded={isNavActive(item)}
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
          expanded={toolsOpen}
          testId="bottom-dock-tools"
        />
      </div>
    </div>
  );
};

export default BottomDock;
