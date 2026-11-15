'use client';

import React, { useEffect, useState } from 'react';
import { PixelIcon } from './PixelIcon';
import { Lang } from '@/types';
import { dictionaries } from '@/lib/i18n';

interface MenubarProps {
  lang: Lang;
  onToggleLang: () => void;
  onOpenSos: () => void;
}

export const Menubar: React.FC<MenubarProps> = ({ lang, onToggleLang, onOpenSos }) => {
  const t = dictionaries[lang];
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [dateText, setDateText] = useState('');

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    setDateText(
      new Date().toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    );
  }, [lang]);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <nav className="menubar">
      <span className="logo">
        <PixelIcon name="toilet" />
      </span>
      <button type="button" onClick={onToggleLang}>
        {t.switchTo}
      </button>
      {installPrompt && (
        <button type="button" onClick={handleInstall}>
          {t.install}
        </button>
      )}
      <button type="button" onClick={onOpenSos}>
        🚨 <span>{t.sosShort}</span>
      </button>
      <span className="spacer" />
      <span>{dateText}</span>
    </nav>
  );
};
