'use client';

import React, { useState } from 'react';
import { WaterEntry, Lang } from '@/types';
import { dictionaries, num } from '@/lib/i18n';

interface WaterTrackerProps {
  waterLog: WaterEntry[];
  waterGoal: number;
  onAddWater: (cups: number) => void;
  onUndoWater: () => void;
  onSetGoal: (goal: number) => void;
  lang: Lang;
}

export const WaterTracker: React.FC<WaterTrackerProps> = ({
  waterLog,
  waterGoal,
  onAddWater,
  onUndoWater,
  onSetGoal,
  lang,
}) => {
  const t = dictionaries[lang];
  const [isOpen, setIsOpen] = useState(false);

  const waterTotal = waterLog.reduce((sum, entry) => sum + entry.ml, 0);
  const waterCups = waterTotal / 250;
  const waterPercent = Math.min(100, Math.round((waterTotal / waterGoal) * 100));

  const lastEntryTime = waterLog.length
    ? new Date(waterLog[waterLog.length - 1].at).toLocaleTimeString(
        lang === 'fa' ? 'fa-IR' : 'en-GB',
        { hour: '2-digit', minute: '2-digit' }
      )
    : '';

  const metaText =
    waterTotal >= waterGoal
      ? t.waterDone
      : !waterLog.length
      ? t.waterEmpty
      : t.waterLast(num(waterLog.length, lang), lastEntryTime);

  return (
    <>
      <button
        id="waterOpen"
        className="btn small"
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(prev => !prev)}
      >
        {isOpen ? t.waterHide : t.waterOpen}
      </button>

      {isOpen && (
        <div className="water-card" id="waterCard">
          <div className="water-head">
            <span>
              <b id="waterTotal">{num(waterCups, lang)}</b> <span>{t.waterCups}</span>
            </span>
            <label className="water-goal">
              <span>{t.waterGoal}</span>
              <select
                id="waterGoal"
                value={waterGoal}
                onChange={e => onSetGoal(Number(e.target.value))}
              >
                <option value="1500">6</option>
                <option value="2000">8</option>
                <option value="2500">10</option>
                <option value="3000">12</option>
              </select>
            </label>
          </div>

          <div
            className="water-track"
            id="waterTrack"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={waterGoal / 250}
            aria-valuenow={waterCups}
          >
            <span id="waterProgress" style={{ width: `${waterPercent}%` }} />
          </div>

          <div className="water-actions">
            <button
              id="water250"
              type="button"
              onClick={() => onAddWater(1)}
            >
              {t.waterOne}
            </button>
            <button
              id="water500"
              type="button"
              onClick={() => onAddWater(2)}
            >
              {t.waterTwo}
            </button>
            <button
              id="waterUndo"
              type="button"
              disabled={!waterLog.length}
              onClick={onUndoWater}
            >
              {t.waterUndo}
            </button>
          </div>

          <small id="waterMeta" className="muted">
            {metaText}
          </small>
        </div>
      )}
    </>
  );
};
