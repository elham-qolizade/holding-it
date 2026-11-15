'use client';

import React, { useRef } from 'react';
import { PixelIcon } from './PixelIcon';
import { Lang } from '@/types';
import { dictionaries } from '@/lib/i18n';
import { splash, releaseBalloons } from '@/lib/fx';
import { playApplause, playHoldTick } from '@/lib/audio';

interface ActionButtonsProps {
  name: string;
  onNameChange: (val: string) => void;
  isHolding: boolean;
  onHold: () => void;
  onGo: () => void;
  onOpenPoop: () => void;
  lang: Lang;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  name,
  onNameChange,
  isHolding,
  onHold,
  onGo,
  onOpenPoop,
  lang,
}) => {
  const t = dictionaries[lang];
  const goBtnRef = useRef<HTMLButtonElement>(null);

  const handleHoldClick = () => {
    playHoldTick();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(30);
      } catch {}
    }
    onHold();
  };

  const handleGoClick = () => {
    splash(goBtnRef.current);
    releaseBalloons();
    playApplause();
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([40, 50, 40]);
      } catch {}
    }
    onGo();
  };

  return (
    <>
      <label className="namerow">
        <span>{t.nameLabel}</span>
        <input
          id="name"
          maxLength={16}
          autoComplete="nickname"
          enterKeyHint="done"
          placeholder={t.namePh}
          value={name}
          onChange={e => onNameChange(e.target.value.slice(0, 16))}
        />
      </label>

      <section className="buttons">
        <button
          id="holdBtn"
          type="button"
          className="btn"
          disabled={isHolding}
          onClick={handleHoldClick}
        >
          <PixelIcon name="hourglass" />
          <span>{isHolding ? t.holdingNow : t.hold}</span>
        </button>

        <button
          id="goBtn"
          ref={goBtnRef}
          type="button"
          className="btn primary"
          onClick={handleGoClick}
        >
          <PixelIcon name="toilet" />
          <span>{t.go}</span>
        </button>

        <button
          id="poopQuickBtn"
          type="button"
          className="btn"
          onClick={onOpenPoop}
        >
          <PixelIcon name="poop" />
          <span>{t.poopQuick}</span>
        </button>
      </section>
    </>
  );
};
