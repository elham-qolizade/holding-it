'use client';

import React from 'react';
import { RetroWindow } from './RetroWindow';
import { WaterTracker } from './WaterTracker';
import { PersonalState, Lang } from '@/types';
import { dictionaries, num, avgGap, fmtMin, MIN } from '@/lib/i18n';

interface DayStatsProps {
  state: PersonalState;
  onUpdateState: (updater: (prev: PersonalState) => PersonalState) => void;
  onOpenCertificate: () => void;
  lang: Lang;
}

export const DayStats: React.FC<DayStatsProps> = ({
  state,
  onUpdateState,
  onOpenCertificate,
  lang,
}) => {
  const t = dictionaries[lang];
  const gap = avgGap(state.trips);
  const dur = (ms: number) => (ms >= MIN ? fmtMin(ms, lang) : '–');

  const handleRemindChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    onUpdateState(prev => ({
      ...prev,
      remind: checked,
      remindOn: Date.now(),
    }));

    if (checked && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  };

  const handleAddWater = (cups: number) => {
    onUpdateState(prev => ({
      ...prev,
      waterLog: [...prev.waterLog, { ml: cups * 250, at: Date.now() }],
    }));
  };

  const handleUndoWater = () => {
    onUpdateState(prev => {
      if (!prev.waterLog.length) return prev;
      return {
        ...prev,
        waterLog: prev.waterLog.slice(0, -1),
      };
    });
  };

  const handleSetGoal = (goal: number) => {
    onUpdateState(prev => ({ ...prev, waterGoal: goal }));
  };

  return (
    <RetroWindow title={t.yourDay} className="daywin">
      <div className="body">
        <div className="stats">
          <div>
            <b id="sCount">{num(state.trips.length, lang)}</b>
            <span className="muted">{t.trips}</span>
          </div>
          <div>
            <b id="sGap">{gap === null ? '–' : dur(gap)}</b>
            <span className="muted">{t.gap}</span>
          </div>
          <div>
            <b id="sBest">{dur(state.bestHold)}</b>
            <span className="muted">{t.best}</span>
          </div>
        </div>

        <label className="remind">
          <input
            type="checkbox"
            id="remind"
            checked={!!state.remind}
            onChange={handleRemindChange}
          />
          <span>{t.remind}</span>
        </label>

        <WaterTracker
          waterLog={state.waterLog}
          waterGoal={state.waterGoal}
          onAddWater={handleAddWater}
          onUndoWater={handleUndoWater}
          onSetGoal={handleSetGoal}
          lang={lang}
        />

        <button
          id="shareBtn"
          type="button"
          className="btn cert-btn"
          onClick={onOpenCertificate}
        >
          <span>{t.share}</span>
        </button>
      </div>
    </RetroWindow>
  );
};
