import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore, type DetailLevel, type Theme } from '@/stores/uiStore';
import { useMapStore, type LabelNameMode } from '@/stores/mapStore';
import { useNavigationStore } from '@/stores/navigationStore';
import { SUPPORTED_LANGUAGES } from '@/i18n/i18n';
import { getShareableURL } from '@/utils/urlStateUtils';
import styles from './SettingsContent.module.css';
import { detectHaptics, getLastHapticsStatus, resetHapticsGuard, vibrateSafely } from '../../timeline/VisTimelineWrapper/haptics';

interface SettingsContentProps {
  onClose: () => void;
}

const THEME_VALUES: Theme[] = ['light', 'dark', 'luther'];

interface LabelNameModeOption { value: LabelNameMode; label: string; }
const LABEL_NAME_MODE_OPTIONS: LabelNameModeOption[] = [
  { value: 'historical', label: 'Historical Names' },
  { value: 'modern', label: 'Modern Names' },
  { value: 'both', label: 'Both' },
];

const DETAIL_LEVEL_VALUES: DetailLevel[] = ['low', 'medium', 'high'];

export const SettingsContent: React.FC<SettingsContentProps> = ({ onClose: _onClose }) => {
  const { t } = useTranslation();
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);
  const hapticsMode = useUIStore((s) => s.hapticsMode);
  const setHapticsMode = useUIStore((s) => s.setHapticsMode);
  const locale = useUIStore((s) => s.locale);
  const setLocale = useUIStore((s) => s.setLocale);
  const labelNameMode = useMapStore((s) => s.labelNameMode);
  const setLabelNameMode = useMapStore((s) => s.setLabelNameMode);
  const isFullscreenState = useUIStore((s) => s.isFullscreen);
  const setFullscreen = useUIStore((s) => s.setFullscreen);
  const detailLevel = useUIStore((s) => s.detailLevel);
  const setDetailLevel = useUIStore((s) => s.setDetailLevel);
  const [copied, setCopied] = useState(false);
  const openDrawer = useNavigationStore((state) => state.openDrawer);

  // Keep store state in sync with browser fullscreen changes (user pressing Esc, etc.)
  useEffect(() => {
    const handleChange = () => {
      setFullscreen(document.fullscreenElement !== null);
    };
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, [setFullscreen]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocale(e.target.value);
  };

  const handleFullscreenToggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  }, []);

  const handleCopyLink = useCallback(async () => {
    const url = getShareableURL();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  }, []);

  const hapticsCapability = useMemo(() => detectHaptics(), []);
  const [hapticsStatus, setHapticsStatus] = useState<string>(getLastHapticsStatus());

  const testVibration = useCallback(() => {
    resetHapticsGuard();
    const result = vibrateSafely([200, 100, 200]);
    setHapticsStatus(result.status);
  }, []);

  const copyDiagnostic = useCallback(async () => {
    const capability = detectHaptics();
    const text = [
      `api=${String(capability.api)}`,
      `platform=${capability.platform}`,
      `brave=${String(capability.brave)}`,
      `touch=${String(capability.touch)}`,
      `standalone=${String(capability.standalone)}`,
      `activation=${String(capability.userActivation)}`,
      `last=${getLastHapticsStatus()}`,
      `ua=${capability.userAgent}`,
    ].join(' ');
    try {
      await navigator.clipboard.writeText(text);
      setHapticsStatus('diagnostic copié');
    } catch {
      setHapticsStatus('copie impossible');
    }
  }, []);

  return (
    <div className={styles['container']} data-testid="settings-content">

      <div className={styles['section']}>
        <div className={styles['sectionLabel']}>{t('settings.theme', 'Theme')}</div>
        <div className={styles['themeButtons']}>
          {THEME_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              className={`${styles['themeBtn'] ?? ''} ${theme === v ? (styles['themeBtnActive'] ?? '') : ''}`}
              onClick={() => handleThemeChange(v)}
              data-testid={`theme-btn-${v}`}
              aria-pressed={theme === v}
            >
              {t(`settings.themes.${v}`, v)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['sectionLabel']}>{t('settings.haptics', 'Retour de cran')}</div>
        <div className={styles['themeButtons']}>
          {(['auto', 'vibrate', 'visual'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`${styles['themeBtn'] ?? ''} ${hapticsMode === mode ? (styles['themeBtnActive'] ?? '') : ''}`}
              onClick={() => {
                setHapticsMode(mode);
                if (mode === 'visual') setHapticsStatus('visual');
                else testVibration();
              }}
              data-testid={`haptics-mode-${mode}`}
              aria-pressed={hapticsMode === mode}
            >
              {mode === 'auto' ? 'Auto' : mode === 'vibrate' ? 'Vibration' : 'Visuel'}
            </button>
          ))}
        </div>
        <p className={styles['hapticsStatus']} data-testid="haptics-status">
          API {hapticsCapability.api ? 'présente' : 'absente'} · {hapticsCapability.platform}
          {hapticsCapability.brave ? ' · Brave' : ''} · dernier : {hapticsStatus}
        </p>
        <p className={styles['hapticsHint']}>
          {hapticsCapability.api
            ? 'Si « ok » mais rien ne vibre : vérifie Ne pas déranger, le mode silencieux et l’intensité système.'
            : 'Vibration indisponible sur ce navigateur (iOS/WebView) : le cran visuel est utilisé.'}
        </p>
        <div className={styles['themeButtons']}>
          <button type="button" className={styles['themeBtn']} onClick={testVibration} data-testid="haptics-test">
            Tester la vibration
          </button>
          <button type="button" className={styles['themeBtn']} onClick={() => { void copyDiagnostic(); }} data-testid="haptics-copy">
            Copier le diagnostic
          </button>
        </div>
      </div>

      <div className={styles['section']}>
        <div className={styles['sectionLabel']}>{t('settings.language', 'Language')}</div>
        <select
          className={styles['languageSelect']}
          value={locale}
          onChange={handleLanguageChange}
          data-testid="language-select"
          aria-label={t('settings.language', 'Language')}
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles['section']}>
        <div className={styles['sectionLabel']}>{t('layers.mapLabels', 'Map Labels')}</div>
        <select
          className={styles['languageSelect']}
          value={labelNameMode}
          onChange={(e) => setLabelNameMode(e.target.value as LabelNameMode)}
          data-testid="label-name-mode-select"
          aria-label={t('layers.mapLabels', 'Map Labels')}
        >
          {LABEL_NAME_MODE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {t(`layers.labelModes.${o.value}`, o.label)}
            </option>
          ))}
        </select>
      </div>

      {/* Detail level / performance preset — Issue #8 */}
      <div className={styles['section']}>
        <div className={styles['sectionLabel']}>{t('settings.detailLevel', 'Detail Level')}</div>
        <div className={styles['themeButtons']}>
          {DETAIL_LEVEL_VALUES.map((v) => (
            <button
              key={v}
              type="button"
              className={`${styles['themeBtn'] ?? ''} ${detailLevel === v ? (styles['themeBtnActive'] ?? '') : ''}`}
              onClick={() => setDetailLevel(v)}
              data-testid={`detail-level-btn-${v}`}
              aria-pressed={detailLevel === v}
            >
              {t(`settings.detailLevels.${v}`, v.charAt(0).toUpperCase() + v.slice(1))}
            </button>
          ))}
        </div>
        <div className={styles['caption']}>
          {t(
            `settings.detailLevelCaptions.${detailLevel ?? 'medium'}`,
            detailLevel === 'low'
              ? 'Up to 2,000 markers — lighter on older or mobile devices.'
              : detailLevel === 'high'
                ? 'Up to 10,000 markers — needs a faster computer.'
                : 'Up to 5,000 markers — recommended default.'
          )}
        </div>
      </div>

      {/* Fullscreen toggle — Issue #19 */}
      <div className={styles['section']}>
        <div className={styles['sectionLabel']}>{t('settings.fullscreen', 'Fullscreen')}</div>
        <div className={styles['actionButtons']}>
          <button
            type="button"
            className={`${styles['actionBtn'] ?? ''} ${isFullscreenState ? (styles['actionBtnActive'] ?? '') : ''}`}
            onClick={() => { void handleFullscreenToggle(); }}
            data-testid="fullscreen-toggle"
            aria-pressed={isFullscreenState}
          >
            {isFullscreenState
              ? t('settings.exitFullscreen', 'Exit Fullscreen')
              : t('settings.enterFullscreen', 'Enter Fullscreen')}
          </button>
        </div>
      </div>

      {/* Share current view — Issue #21 */}
      <div className={styles['section']}>
        <div className={styles['sectionLabel']}>{t('settings.share', 'Share this view')}</div>
        <div className={styles['actionButtons']}>
          <button
            type="button"
            className={styles['actionBtn'] ?? ''}
            onClick={() => { void handleCopyLink(); }}
            data-testid="share-copy-link"
          >
            {copied
              ? t('settings.linkCopied', 'Link copied!')
              : t('settings.copyLink', 'Copy link')}
          </button>
        </div>
      </div>

      {/* Bibliothèque locale — sélection hiérarchique */}
      <div className={styles['section']}>
        <div className={styles['sectionLabel']}>Bibliothèque locale</div>
        <div className={styles['actionButtons']}>
          <button
            type="button"
            className={styles['actionBtn']}
            onClick={() => openDrawer('downloads')}
            data-testid="open-downloads"
          >
            Gérer les téléchargements
          </button>
        </div>
      </div>

    </div>
  );
};

export default SettingsContent;
