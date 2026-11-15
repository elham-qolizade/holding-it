'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RetroWindow } from './RetroWindow';
import { WorldStats, Lang } from '@/types';
import { dictionaries, num } from '@/lib/i18n';

interface LiveCounterProps {
  stats: WorldStats;
  lang: Lang;
}

export const LiveCounter: React.FC<LiveCounterProps> = ({ stats, lang }) => {
  const t = dictionaries[lang];
  const [bump, setBump] = useState(false);
  const prevTotal = useRef<number | null>(stats.todayTotal);

  useEffect(() => {
    if (stats.todayTotal !== null && stats.todayTotal !== prevTotal.current) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 300);
      prevTotal.current = stats.todayTotal;
      return () => clearTimeout(timer);
    }
  }, [stats.todayTotal]);

  const display = (val: number | null) => (val === null ? '–' : num(val.toLocaleString('en'), lang));

  return (
    <RetroWindow title={t.liveTitle} className="livewin">
      <div className="live">
        <div className="tile g">
          <b>{display(stats.inToilet)}</b>
          <small>
            <span className="dot" />
            <span>{t.inToilet}</span>
          </small>
        </div>
        <div className="tile y">
          <b>{display(stats.holding)}</b>
          <small>
            <span className="dot" />
            <span>{t.holding}</span>
          </small>
        </div>
      </div>
      <p className="total">
        <b className={bump ? 'bump' : ''}>{display(stats.todayTotal)}</b> <span>{t.total}</span>
      </p>
    </RetroWindow>
  );
};
