/** Menu bas unique, inséré entre la timeline et la barre de navigation. */

import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './BottomMenu.module.css';

export interface BottomMenuProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const BottomMenu: React.FC<BottomMenuProps> = ({ open, title, onClose, children }) => {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);

  // La timeline se décale vers le haut de la hauteur réelle du menu ouvert.
  useEffect(() => {
    const element = menuRef.current;
    if (!element) return undefined;
    const root = document.documentElement;
    if (!open) {
      root.style.setProperty('--bottom-menu-height', '0px');
      return undefined;
    }
    const update = () => root.style.setProperty('--bottom-menu-height', `${String(element.offsetHeight)}px`);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    update();
    return () => {
      observer.disconnect();
      root.style.setProperty('--bottom-menu-height', '0px');
    };
  }, [open]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

  return (
    <section
      ref={menuRef}
      id="bottom-menu"
      className={`${styles['menu'] ?? ''} ${open ? styles['open'] ?? '' : ''}`}
      role="dialog"
      aria-label={title}
      aria-hidden={!open}
      data-testid="bottom-menu"
    >
      <header className={styles['header']}>
        <h2 className={styles['title']}>{title}</h2>
        <button
          ref={closeRef}
          type="button"
          className={styles['close']}
          onClick={onClose}
          aria-label={t('common.close', 'Fermer')}
          data-testid="bottom-menu-close"
        >
          ×
        </button>
      </header>
      <div className={styles['content']}>{children}</div>
    </section>
  );
};

export default BottomMenu;
