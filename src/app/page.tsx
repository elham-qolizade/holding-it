'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Menubar } from '@/components/Menubar';
import { LiveCounter } from '@/components/LiveCounter';
import { ActionButtons } from '@/components/ActionButtons';
import { TimerBox } from '@/components/TimerBox';
import { PeeNews } from '@/components/PeeNews';
import { SosFinder } from '@/components/SosFinder';
import { DayStats } from '@/components/DayStats';
import { ConstipationBureau } from '@/components/ConstipationBureau';
import { LiveFeed } from '@/components/LiveFeed';
import { FeedbackBox } from '@/components/FeedbackBox';
import { CertificateDialog } from '@/components/CertificateDialog';

import {
  PersonalState,
  WorldStats,
  FeedItem,
  NewsData,
  Lang,
  PoopResult,
  RemedyKey,
} from '@/types';
import { dictionaries, num, MIN } from '@/lib/i18n';
import {
  loadPersonalState,
  savePersonalState,
  getSessionId,
  getMyIds,
  saveMyIds,
  getStoredLang,
  setStoredLang,
  DEFAULT_STATE,
} from '@/lib/storage';
import { fetchPulse, logEvent, fetchNews } from '@/lib/supabase';

const NUDGE_AFTER = 180 * MIN; // 3 hours

export default function Home() {
  const [lang, setLang] = useState<Lang>('fa');
  const [session, setSession] = useState<string>('');
  const [myIds, setMyIds] = useState<number[]>([]);
  const [state, setState] = useState<PersonalState>(DEFAULT_STATE);
  const [worldStats, setWorldStats] = useState<WorldStats>({
    inToilet: null,
    holding: null,
    todayTotal: null,
  });
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [lastFeedId, setLastFeedId] = useState<number>(0);
  const [news, setNews] = useState<NewsData | null>(null);

  // Modals / Windows open states
  const [sosOpen, setSosOpen] = useState(false);
  const [poopOpen, setPoopOpen] = useState(false);
  const [poopDetailsOpen, setPoopDetailsOpen] = useState(false);
  const [certOpen, setCertOpen] = useState(false);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = dictionaries[lang];

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMsg(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2200);
  }, []);

  // Initialize client state
  useEffect(() => {
    const initialLang = getStoredLang();
    setLang(initialLang);
    document.documentElement.lang = initialLang;
    document.documentElement.dir = dictionaries[initialLang].dir;

    const initialSession = getSessionId();
    setSession(initialSession);

    const initialMyIds = getMyIds();
    setMyIds(initialMyIds);

    const initialPersonalState = loadPersonalState();
    setState(initialPersonalState);

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // Update document language and title when lang changes
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = t.dir;
    document.title = t.docTitle;
  }, [lang, t]);

  // Persist personal state
  const updateState = useCallback(
    (updater: (prev: PersonalState) => PersonalState) => {
      setState(prev => {
        const next = updater(prev);
        savePersonalState(next);
        return next;
      });
    },
    []
  );

  // Language toggle
  const handleToggleLang = () => {
    const nextLang: Lang = lang === 'fa' ? 'en' : 'fa';
    setLang(nextLang);
    setStoredLang(nextLang);
  };

  // Pulse & Feed merging
  const pulse = useCallback(async () => {
    try {
      const p = await fetchPulse();
      setWorldStats({
        inToilet: p.in_toilet,
        holding: p.holding,
        todayTotal: p.today,
      });

      setFeed(prevFeed => {
        const serverIds = new Set(p.feed.map(e => e.id));
        const localOnly = prevFeed.filter(e => myIds.includes(e.id) && !serverIds.has(e.id));
        const merged = [...localOnly, ...p.feed].slice(0, 30);
        return merged;
      });

      if (p.feed.length > 0) {
        setLastFeedId(prev => Math.max(prev, ...p.feed.map(e => e.id)));
      }
    } catch {}
  }, [myIds]);

  // Initial and periodic pulse
  useEffect(() => {
    pulse();
    const interval = setInterval(() => {
      if (!document.hidden) pulse();
    }, 5000);

    const handleVisibility = () => {
      if (!document.hidden) pulse();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [pulse]);

  // Initial and periodic news fetch
  useEffect(() => {
    const loadNews = async () => {
      try {
        const data = await fetchNews();
        setNews(data);
      } catch {}
    };

    loadNews();
    const interval = setInterval(() => {
      if (!document.hidden) loadNews();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // 3-hour inactivity nudge notification check
  useEffect(() => {
    const since = Math.max(state.trips[state.trips.length - 1] ?? 0, state.remindOn ?? 0);
    const overdue = !!state.remind && Date.now() - since > NUDGE_AFTER;

    if (overdue && state.nudgedFor !== since) {
      updateState(prev => ({ ...prev, nudgedFor: since }));
      if (
        typeof window !== 'undefined' &&
        document.hidden &&
        window.Notification?.permission === 'granted'
      ) {
        if (navigator.serviceWorker) {
          navigator.serviceWorker.ready.then(reg =>
            reg.showNotification(`${t.h1a} ${t.h1b}`, {
              body: t.nudge,
              icon: '/icon-192.png',
            })
          ).catch(() => {});
        } else {
          try {
            new Notification(`${t.h1a} ${t.h1b}`, { body: t.nudge });
          } catch {}
        }
      }
    }
  }, [state, t, updateState]);

  // Optimistic feed item addition
  const addOptimisticFeed = (type: 'hold' | 'go', heldMins = 0, isPoop = false): number => {
    const localId = -Date.now();
    const newMyIds = [...myIds, localId].slice(-30);
    setMyIds(newMyIds);
    saveMyIds(newMyIds);

    const item: FeedItem = {
      id: localId,
      type,
      kind: isPoop ? 'poop' : 'pee',
      held_mins: heldMins || null,
      nth: type === 'go' && !isPoop ? state.trips.length + 1 : null,
      country: null,
      name: state.name || null,
    };

    setFeed(prev => [item, ...prev.filter(e => e.id !== localId)].slice(0, 30));
    return localId;
  };

  const publishEvent = async (type: 'hold' | 'go', heldMins = 0, isPoop = false) => {
    const localId = addOptimisticFeed(type, heldMins, isPoop);
    try {
      const serverId = await logEvent({
        p_session: session,
        p_type: type,
        p_held_mins: heldMins,
        p_name: state.name || null,
        p_kind: isPoop ? 'poop' : 'pee',
      });
      if (serverId) {
        setFeed(prev => prev.filter(e => e.id !== localId));
        setMyIds(prev => {
          const next = [...prev.filter(i => i !== localId), serverId].slice(-30);
          saveMyIds(next);
          return next;
        });
      }
    } catch {}
    pulse();
  };

  // Actions
  const handleHold = () => {
    updateState(prev => ({
      ...prev,
      holdingSince: Date.now(),
    }));
    publishEvent('hold');
    showToast(t.toastHold);
  };

  const handleGo = () => {
    const held = state.holdingSince ? Date.now() - state.holdingSince : 0;
    const heldMins = Math.floor(held / MIN);
    const newTrips = [...state.trips, Date.now()];

    updateState(prev => ({
      ...prev,
      bestHold: Math.max(prev.bestHold, held),
      holdingSince: null,
      trips: newTrips,
    }));

    publishEvent('go', heldMins, false);
    showToast(t.toastGo(num(newTrips.length, lang)));
  };

  const handleLogBowelMovement = (result: PoopResult, durationMins = 0) => {
    const newLog = [
      ...state.poopLog,
      { at: Date.now(), result, durationMins },
    ];

    if (result !== 'failed') {
      updateState(prev => ({
        ...prev,
        poopLog: newLog,
        lastPoopAt: Date.now(),
        constipationDays: 0,
      }));
      publishEvent('go', durationMins, true);
      showToast(t.poopToastSuccess);
    } else {
      updateState(prev => ({
        ...prev,
        poopLog: newLog,
        constipationDays: prev.constipationDays + 1,
      }));
      showToast(t.poopToastFailed);
    }
    setPoopDetailsOpen(false);
  };

  const handleAddStuckDay = () => {
    updateState(prev => ({
      ...prev,
      constipationDays: prev.constipationDays + 1,
    }));
    showToast(t.poopToastStuck);
  };

  const handleToggleRemedy = (key: RemedyKey) => {
    const list = state.remedies ?? [];
    if (list.includes(key)) {
      updateState(prev => ({
        ...prev,
        remedies: list.filter(k => k !== key),
      }));
    } else {
      updateState(prev => ({
        ...prev,
        remedies: [...list, key],
      }));
      showToast(t.remedyToast(String(t[key === 'water' ? 'remWaterTitle' : 'remWaterTitle'])));
    }
  };

  const handleStartBattle = () => {
    updateState(prev => ({ ...prev, battleStart: Date.now() }));
  };

  const handleEndBattle = (result: PoopResult) => {
    const durationMins = state.battleStart
      ? Math.max(1, Math.round((Date.now() - state.battleStart) / MIN))
      : 0;
    updateState(prev => ({ ...prev, battleStart: null }));
    handleLogBowelMovement(result, durationMins);
  };

  const handleNameChange = (name: string) => {
    updateState(prev => ({ ...prev, name }));
  };

  // Nudge overdue condition
  const since = Math.max(state.trips[state.trips.length - 1] ?? 0, state.remindOn ?? 0);
  const isOverdue = !!state.remind && Date.now() - since > NUDGE_AFTER;

  return (
    <>
      <Menubar
        lang={lang}
        onToggleLang={handleToggleLang}
        onOpenSos={() => setSosOpen(true)}
      />

      <main>
        <header>
          <h1>
            <span>{t.h1a}</span> <span className="hl">{t.h1b}</span>
          </h1>
          <p className="tag">{t.tag}</p>
          <p className="how">{t.how}</p>
        </header>

        <LiveCounter stats={worldStats} lang={lang} />

        <ActionButtons
          name={state.name || ''}
          onNameChange={handleNameChange}
          isHolding={state.holdingSince !== null}
          onHold={handleHold}
          onGo={handleGo}
          onOpenPoop={() => {
            setPoopOpen(true);
            setPoopDetailsOpen(true);
          }}
          lang={lang}
        />

        {isOverdue && (
          <section className="win" id="nudge" role="status">
            <div className="body">{t.nudge}</div>
          </section>
        )}

        <TimerBox
          holdingSince={state.holdingSince}
          worldHolding={worldStats.holding}
          lang={lang}
        />

        <PeeNews news={news} lang={lang} />

        <SosFinder
          isOpen={sosOpen}
          onToggle={() => setSosOpen(prev => !prev)}
          session={session}
          lang={lang}
        />

        <DayStats
          state={state}
          onUpdateState={updateState}
          onOpenCertificate={() => setCertOpen(true)}
          lang={lang}
        />

        <ConstipationBureau
          isOpen={poopOpen}
          onToggle={() => setPoopOpen(prev => !prev)}
          detailsOpen={poopDetailsOpen}
          onToggleDetails={() => setPoopDetailsOpen(prev => !prev)}
          state={state}
          onLogBowelMovement={handleLogBowelMovement}
          onToggleRemedy={handleToggleRemedy}
          onAddStuckDay={handleAddStuckDay}
          onStartBattle={handleStartBattle}
          onEndBattle={handleEndBattle}
          lang={lang}
        />

        <LiveFeed
          feed={feed}
          myIds={myIds}
          lastFeedId={lastFeedId}
          lang={lang}
        />

        <FeedbackBox session={session} lang={lang} />

        <footer>{t.footer}</footer>

        {toastMsg && (
          <div id="toast" role="status">
            {toastMsg}
          </div>
        )}

        <CertificateDialog
          isOpen={certOpen}
          onClose={() => setCertOpen(false)}
          state={state}
          session={session}
          lang={lang}
        />
      </main>
    </>
  );
}
