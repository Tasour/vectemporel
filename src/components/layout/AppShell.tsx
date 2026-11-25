import type React from 'react';
import { lazy, Suspense, useCallback, useEffect } from 'react';
import { MainContent } from './MainContent';
import { BottomDock } from '../navigation/BottomDock';
import { MenuDrawer } from '../navigation/MenuDrawer';
import { RightDrawer } from './RightDrawer/RightDrawer';
import { CollectionsContent } from '../library/CollectionsContent';
import { DownloadManager } from '../library/DownloadManager';
import { LayersContent } from '../navigation/LayersContent';
import { SettingsContent } from '../navigation/SettingsContent';
import { LoadingBar } from '../global/LoadingBar';
import { LoginDialog } from '../auth/LoginDialog/LoginDialog';
import { InfoDialog } from '../global/InfoDialog/InfoDialog';
import { useUIStore } from '../../stores/uiStore';
import { useNavigationStore } from '../../stores/navigationStore';
import { useTimelineStore } from '../../stores/timelineStore';
import { clearURLParams } from '../../utils/urlStateUtils';
import styles from './AppShell.module.css';

const Timeline = lazy(() => import('../timeline/Timeline/Timeline').then((m) => ({ default: m.Timeline })));

export interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AppShell component - Main layout wrapper combining all layout areas.
 * Requirements: 2.1, 2.4, 2.7, 2.8, 2.9
 */
export const AppShell: React.FC<AppShellProps> = ({ children, className }) => {
  const { rightDrawerOpen, rightDrawerContent, closeRightDrawer, loginDialogOpen, closeLoginDialog, infoDialogOpen, infoDialogTab, closeInfoDialog, bottomToolsOpen, setBottomToolsOpen } = useUIStore();
  const { drawerOpen, drawerContent, closeDrawer } = useNavigationStore();
  const isYearDialogOpen = useTimelineStore((state) => state.isYearDialogOpen);
  const isAutoplayMenuOpen = useTimelineStore((state) => state.isAutoplayMenuOpen);
  const isSearchOpen = useTimelineStore((state) => state.isSearchOpen);

  /**
   * Handles closing the right drawer and clearing URL params.
   * Requirement 2.7: WHEN the close button is clicked, THE RightDrawer SHALL close
   * Requirement 2.9: WHEN the RightDrawer closes, THE System SHALL remove type and value from URL
   */
  const handleRightDrawerClose = useCallback(() => {
    closeRightDrawer();
    clearURLParams(['type', 'value']);
  }, [closeRightDrawer]);

  // Un drawer ouvre toujours la voie : la feuille Outils se referme.
  useEffect(() => {
    if (drawerOpen || rightDrawerOpen) setBottomToolsOpen(false);
  }, [drawerOpen, rightDrawerOpen, setBottomToolsOpen]);

  // Sur mobile, les deux drawers ne coexistent pas : le panneau de droite reste.
  useEffect(() => {
    if (!drawerOpen || !rightDrawerOpen) return;
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      handleRightDrawerClose();
    }
  }, [drawerOpen, handleRightDrawerClose, rightDrawerOpen]);

  // Une modale reste au-dessus de tout et rend les calques secondaires inertes.
  useEffect(() => {
    if (!infoDialogOpen && !loginDialogOpen && !isYearDialogOpen) return;
    setBottomToolsOpen(false);
    useTimelineStore.setState({ isAutoplayMenuOpen: false, isSearchOpen: false });
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      closeDrawer();
      closeRightDrawer();
    }
  }, [closeDrawer, closeRightDrawer, infoDialogOpen, isYearDialogOpen, loginDialogOpen, setBottomToolsOpen]);

  // Un seul popover à la fois : Outils, lecture auto ou recherche d'épopées.
  useEffect(() => {
    if (bottomToolsOpen && (isAutoplayMenuOpen || isSearchOpen)) {
      useTimelineStore.setState({ isAutoplayMenuOpen: false, isSearchOpen: false });
    } else if (!bottomToolsOpen && (isAutoplayMenuOpen || isSearchOpen)) {
      setBottomToolsOpen(false);
    }
  }, [bottomToolsOpen, isAutoplayMenuOpen, isSearchOpen, setBottomToolsOpen]);

  // Échap ferme uniquement la couche la plus haute.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isYearDialogOpen) useTimelineStore.setState({ isYearDialogOpen: false });
      else if (infoDialogOpen) closeInfoDialog();
      else if (loginDialogOpen) closeLoginDialog();
      else if (isAutoplayMenuOpen) useTimelineStore.setState({ isAutoplayMenuOpen: false });
      else if (isSearchOpen) useTimelineStore.setState({ isSearchOpen: false });
      else if (bottomToolsOpen) setBottomToolsOpen(false);
      else if (rightDrawerOpen) handleRightDrawerClose();
      else if (drawerOpen) closeDrawer();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [bottomToolsOpen, closeDrawer, closeInfoDialog, closeLoginDialog, drawerOpen, handleRightDrawerClose, infoDialogOpen, isAutoplayMenuOpen, isSearchOpen, isYearDialogOpen, loginDialogOpen, rightDrawerOpen, setBottomToolsOpen]);

  return (
    <div
      data-testid="app-shell"
      className={`${styles['shell'] ?? ''} ${className ?? ''}`.trim()}
    >
      {/* Header hidden - production uses sidebar logo as branding */}
      {/* <Header /> */}
      
      {/* Loading bar at top of viewport */}
      <LoadingBar />
      
      <div className={styles['body']}>
        <MainContent>
          {children}
        </MainContent>

        <MenuDrawer
          isOpen={drawerOpen}
          contentType={drawerContent}
          onClose={closeDrawer}
        >
          {drawerContent === 'layers' && <LayersContent onClose={closeDrawer} />}
          {drawerContent === 'collections' && <CollectionsContent onClose={closeDrawer} />}
          {drawerContent === 'downloads' && <DownloadManager />}
          {drawerContent === 'settings' && <SettingsContent onClose={closeDrawer} />}
        </MenuDrawer>
        
        {/* Right drawer for province/marker details */}
        {/* Requirement 2.1: WHEN a province is clicked, THE RightDrawer SHALL open */}
        {/* Requirement 2.2: WHEN the RightDrawer opens, THE MapView SHALL reduce its width by 25% */}
        <RightDrawer
          isOpen={rightDrawerOpen}
          content={rightDrawerContent}
          onClose={handleRightDrawerClose}
        />
      </div>
      
      <Suspense fallback={null}>
        <Timeline />
      </Suspense>

      <BottomDock />

      <LoginDialog isOpen={loginDialogOpen} onClose={closeLoginDialog} />
      <InfoDialog isOpen={infoDialogOpen} onClose={closeInfoDialog} initialTab={infoDialogTab} />
    </div>
  );
};

export default AppShell;
