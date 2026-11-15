'use client';

import React from 'react';
import { RetroWindow } from './RetroWindow';
import { FeedItem, Lang } from '@/types';
import { dictionaries, num, flagOf, ordinal } from '@/lib/i18n';

interface LiveFeedProps {
  feed: FeedItem[];
  myIds: number[];
  lastFeedId: number;
  lang: Lang;
}

export const LiveFeed: React.FC<LiveFeedProps> = ({
  feed,
  myIds,
  lastFeedId,
  lang,
}) => {
  const t = dictionaries[lang];

  return (
    <RetroWindow title={t.feedTitle} className="feedwin">
      <ul className="feed" id="feed">
        {!feed.length && <li>{t.feedEmpty}</li>}
        {feed.map(e => {
          const mine = myIds.includes(e.id);
          const isPoop = e.kind === 'poop';
          const you = mine && !e.name;

          const text =
            e.type === 'hold'
              ? t.fHold(you)
              : isPoop
              ? e.held_mins
                ? t.fAfterPoop(you, num(e.held_mins, lang))
                : t.fPoop(you)
              : e.nth && e.nth >= 5
              ? t.fNth(you, lang === 'en' ? ordinal(e.nth) : num(e.nth, lang))
              : e.held_mins
              ? t.fAfter(you, num(e.held_mins, lang))
              : t.fGo(you);

          const flagText = mine ? '🫵' : flagOf(e.country);
          const isNew = e.id > lastFeedId;

          return (
            <li
              key={e.id}
              className={`${mine ? 'me' : ''} ${isNew ? 'new' : ''}`}
            >
              <span>
                <bdi>{flagText}</bdi>{' '}
                {e.name ? (
                  (() => {
                    const [before, ...after] = text.split(t.someone);
                    return (
                      <>
                        {before}
                        <bdi>{e.name}</bdi>
                        {after.join(t.someone)}
                      </>
                    );
                  })()
                ) : (
                  text
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </RetroWindow>
  );
};
