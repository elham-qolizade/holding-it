'use client';

import React, { useState, useEffect } from 'react';
import { RetroWindow } from './RetroWindow';
import { PersonalState, Lang, RemedyKey, PoopResult } from '@/types';
import { dictionaries, num, MIN } from '@/lib/i18n';
import { splash, releaseBalloons } from '@/lib/fx';
import { playApplause } from '@/lib/audio';

interface ConstipationBureauProps {
  isOpen: boolean;
  onToggle: () => void;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  state: PersonalState;
  onLogBowelMovement: (result: PoopResult, durationMins?: number) => void;
  onToggleRemedy: (key: RemedyKey) => void;
  onAddStuckDay: () => void;
  onStartBattle: () => void;
  onEndBattle: (result: PoopResult) => void;
  lang: Lang;
}

const REMEDY_DATA: Record<
  RemedyKey,
  { titleKey: keyof typeof dictionaries['fa']; benefitKey: keyof typeof dictionaries['fa']; howKey: keyof typeof dictionaries['fa'] }
> = {
  water: { titleKey: 'remWaterTitle', benefitKey: 'remWaterBenefit', howKey: 'remWaterHow' },
  olive: { titleKey: 'remOliveTitle', benefitKey: 'remOliveBenefit', howKey: 'remOliveHow' },
  flixweed: { titleKey: 'remFlixweedTitle', benefitKey: 'remFlixweedBenefit', howKey: 'remFlixweedHow' },
  figs: { titleKey: 'remFigsTitle', benefitKey: 'remFigsBenefit', howKey: 'remFigsHow' },
  squat: { titleKey: 'remSquatTitle', benefitKey: 'remSquatBenefit', howKey: 'remSquatHow' },
  kiwi: { titleKey: 'remKiwiTitle', benefitKey: 'remKiwiBenefit', howKey: 'remKiwiHow' },
  walk: { titleKey: 'remWalkTitle', benefitKey: 'remWalkBenefit', howKey: 'remWalkHow' },
  coffee: { titleKey: 'remCoffeeTitle', benefitKey: 'remCoffeeBenefit', howKey: 'remCoffeeHow' },
};

export const ConstipationBureau: React.FC<ConstipationBureauProps> = ({
  isOpen,
  onToggle,
  detailsOpen,
  onToggleDetails,
  state,
  onLogBowelMovement,
  onToggleRemedy,
  onAddStuckDay,
  onStartBattle,
  onEndBattle,
  lang,
}) => {
  const t = dictionaries[lang];
  const [selectedRemedy, setSelectedRemedy] = useState<RemedyKey>('water');
  const [battleDuration, setBattleDuration] = useState(0);

  const inBattle = typeof state.battleStart === 'number';

  useEffect(() => {
    if (!inBattle || !state.battleStart) {
      setBattleDuration(0);
      return;
    }
    const updateBattle = () => {
      setBattleDuration(Math.floor((Date.now() - state.battleStart!) / 1000));
    };
    updateBattle();
    const interval = setInterval(updateBattle, 1000);
    return () => clearInterval(interval);
  }, [inBattle, state.battleStart]);

  const daysSince = state.lastPoopAt
    ? Math.floor((Date.now() - state.lastPoopAt) / (24 * 3600 * 1000))
    : state.constipationDays;

  const todayPoops = (state.poopLog ?? []).filter(p => p.result !== 'failed');

  let badgeClass = 'badge';
  let badgeText = '';
  let daysText = '';

  if (todayPoops.length > 0) {
    badgeClass = 'badge good';
    badgeText = t.poopStatusClean;
    daysText = t.poopDays(num(0, lang));
  } else if (daysSince === 0 || daysSince === 1) {
    badgeClass = 'badge';
    badgeText = t.poopStatus1;
    daysText = t.poopDays(num(1, lang));
  } else if (daysSince === 2) {
    badgeClass = 'badge money';
    badgeText = t.poopStatus2;
    daysText = t.poopDays(num(2, lang));
  } else {
    badgeClass = 'badge bad';
    badgeText = t.poopStatus3;
    daysText = t.poopDays(num(Math.max(3, daysSince), lang));
  }

  const lastText = state.lastPoopAt
    ? t.poopLast(
        new Date(state.lastPoopAt).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB', {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      )
    : t.poopNever;

  const remedyInfo = REMEDY_DATA[selectedRemedy] || REMEDY_DATA.water;
  const isRemedyDone = (state.remedies ?? []).includes(selectedRemedy);

  const battleMins = Math.floor(battleDuration / 60);
  const battleSecs = battleDuration % 60;
  const battleTimerStr = `${String(battleMins).padStart(2, '0')}:${String(battleSecs).padStart(2, '0')}`;

  const handleFinishBattle = (result: PoopResult) => {
    const mins = state.battleStart ? Math.max(1, Math.round((Date.now() - state.battleStart) / MIN)) : 0;
    if (result !== 'failed') {
      splash(null);
      releaseBalloons();
      playApplause();
    }
    onEndBattle(result);
  };

  return (
    <RetroWindow
      id="poopWin"
      title={t.poopTitle}
      className="poopwin"
      isOpen={isOpen}
      onToggle={onToggle}
    >
      <div className="body">
        <div className="poop-status-card">
          <div className="poop-status-head">
            <span id="poopStatusBadge" className={badgeClass}>
              {badgeText}
            </span>
            <b id="poopDaysText">{daysText}</b>
          </div>

          <p className="muted" id="poopLastText" style={{ margin: '6px 0 10px' }}>
            {lastText}
          </p>

          <div className="poop-quick-actions">
            <button
              id="poopStuckBtn"
              className="btn small"
              type="button"
              onClick={onAddStuckDay}
            >
              {t.poopStuckAction}
            </button>
            <button
              id="poopOpenLogBtn"
              className="btn small primary"
              type="button"
              onClick={onToggleDetails}
            >
              {t.poopLogAction}
            </button>
          </div>
        </div>

        <details
          id="poopLogDetails"
          className="poop-details"
          style={{ margin: '12px 0' }}
          open={detailsOpen}
        >
          <summary onClick={e => { e.preventDefault(); onToggleDetails(); }}>
            {t.poopLogDetailsTitle}
          </summary>
          <p className="muted" style={{ margin: '6px 0' }}>
            {t.poopBristolHelp}
          </p>
          <div className="poop-grid">
            <button
              type="button"
              className="poop-type-btn"
              onClick={() => onLogBowelMovement('smooth')}
            >
              <b>{t.poopSmoothTitle}</b>
              <small>{t.poopSmoothDesc}</small>
            </button>

            <button
              type="button"
              className="poop-type-btn"
              onClick={() => onLogBowelMovement('struggle')}
            >
              <b>{t.poopStruggleTitle}</b>
              <small>{t.poopStruggleDesc}</small>
            </button>

            <button
              type="button"
              className="poop-type-btn"
              onClick={() => onLogBowelMovement('liquid')}
            >
              <b>{t.poopLiquidTitle}</b>
              <small>{t.poopLiquidDesc}</small>
            </button>

            <button
              type="button"
              className="poop-type-btn"
              onClick={() => onLogBowelMovement('failed')}
            >
              <b>{t.poopFailedTitle}</b>
              <small>{t.poopFailedDesc}</small>
            </button>
          </div>
        </details>

        <div className="battle-box" id="battleBox">
          <div className="battle-head">
            <b>{t.poopBattleHeading}</b>
          </div>
          <p className="muted" style={{ margin: '4px 0 8px' }}>
            {t.poopBattleSub}
          </p>

          {inBattle ? (
            <div id="battleTimerWrap">
              <div className="battle-timer" id="battleTimer" dir="ltr">
                {battleTimerStr}
              </div>
              <p className="muted" id="battleTip">
                {t.poopBattleTip}
              </p>
              {battleMins >= 10 && (
                <p className="battle-warn" id="battleWarn">
                  {t.poopBattleWarn}
                </p>
              )}
              <div className="battle-controls">
                <button
                  id="battleEndBtn"
                  className="btn small primary"
                  type="button"
                  onClick={() => handleFinishBattle('smooth')}
                >
                  {t.poopBattleEnd}
                </button>
                <button
                  id="battleRetreatBtn"
                  className="btn small"
                  type="button"
                  onClick={() => handleFinishBattle('failed')}
                >
                  {t.poopBattleGiveUp}
                </button>
              </div>
            </div>
          ) : (
            <button
              id="battleStartBtn"
              className="btn small"
              type="button"
              onClick={onStartBattle}
            >
              {t.poopBattleStart}
            </button>
          )}
        </div>

        <div className="remedies-box">
          <div className="remedies-header">
            <b style={{ fontSize: '0.98rem' }}>{t.poopRemediesTitle}</b>
            <p className="muted" style={{ margin: '3px 0 8px', fontSize: '0.82rem' }}>
              {t.poopRemediesSub}
            </p>
          </div>

          <div className="remedy-grid">
            {(Object.keys(REMEDY_DATA) as RemedyKey[]).map(key => {
              const item = REMEDY_DATA[key];
              const isDone = (state.remedies ?? []).includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  className={`remedy-tab ${key === selectedRemedy ? 'active' : ''} ${
                    isDone ? 'done' : ''
                  }`}
                  onClick={() => setSelectedRemedy(key)}
                >
                  {String(t[item.titleKey])}
                </button>
              );
            })}
          </div>

          <div className="remedy-inspector" id="remedyInspector">
            <div className="remedy-inspector-head">
              <b id="inspectorTitle">{String(t[remedyInfo.titleKey])}</b>
              <button
                type="button"
                id="inspectorActionBtn"
                className={`remedy-toggle-btn ${isRemedyDone ? 'checked' : ''}`}
                onClick={() => onToggleRemedy(selectedRemedy)}
              >
                {isRemedyDone ? t.remedyDone : t.remedyNotDone}
              </button>
            </div>
            <div className="remedy-inspector-body">
              <div>
                <b>{t.remedyBenefit}</b> <span>{String(t[remedyInfo.benefitKey])}</span>
              </div>
              <div>
                <b>{t.remedyHow}</b> <span>{String(t[remedyInfo.howKey])}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RetroWindow>
  );
};
