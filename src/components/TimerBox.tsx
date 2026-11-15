'use client';

import React, { useEffect, useState } from 'react';
import { RetroWindow } from './RetroWindow';
import { Lang } from '@/types';
import { dictionaries, num, titleIndex } from '@/lib/i18n';

interface TimerBoxProps {
  holdingSince: number | null;
  worldHolding: number | null;
  lang: Lang;
}

export const TimerBox: React.FC<TimerBoxProps> = ({ holdingSince, worldHolding, lang }) => {
  const t = dictionaries[lang];
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!holdingSince) {
      setElapsedSeconds(0);
      return;
    }

    const updateTimer = () => {
      const ms = Math.max(0, Date.now() - holdingSince);
      setElapsedSeconds(Math.floor(ms / 1000));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [holdingSince]);

  if (!holdingSince) return null;

  const ms = elapsedSeconds * 1000;
  const mins = Math.floor(elapsedSeconds / 60);
  const secs = elapsedSeconds % 60;
  const timeString = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const currentTitle = t.titles[titleIndex(ms)];
  const othersResisting = Math.max(0, (worldHolding ?? 1) - 1);

  return (
    <RetroWindow id="timerBox" title={t.timerTitle} className="timerwin">
      <div className="body">
        <div id="timer" dir="ltr">
          {timeString}
        </div>
        <div id="title">{currentTitle}</div>
        <div className="muted" id="others">
          {t.others(num(othersResisting, lang))}
        </div>
      </div>
    </RetroWindow>
  );
};
