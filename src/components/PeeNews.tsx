'use client';

import React from 'react';
import { RetroWindow } from './RetroWindow';
import { NewsData, Lang } from '@/types';
import { dictionaries, num, titleIndex, flagOf, MIN } from '@/lib/i18n';

interface PeeNewsProps {
  news: NewsData | null;
  lang: Lang;
}

const MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export const PeeNews: React.FC<PeeNewsProps> = ({ news, lang }) => {
  const t = dictionaries[lang];
  const day = Math.floor(Date.now() / 86_400_000);
  const canned = (i: number) => t.canned[(day + i) % t.canned.length];

  interface NewsLine {
    template: string;
    person?: { country?: string | null; name?: string | null };
  }

  const lines: NewsLine[] = [];

  if (news?.record) {
    const mins = news.record.mins;
    const rank = t.ranks[titleIndex(mins * MIN)];
    lines.push({
      template: t.nRecord(num(mins, lang), rank),
      person: news.record,
    });
  }

  if (news?.holding && news.holding.mins && news.holding.mins >= 5) {
    lines.push({
      template: t.nHolding(num(news.holding.mins, lang)),
      person: news.holding,
    });
  }

  if (news?.busiest && news.busiest.n && news.busiest.n >= 2) {
    lines.push({
      template: t.nBusy(num(news.busiest.n, lang)),
      person: news.busiest,
    });
  }

  if (news?.country && news.country.n >= 2) {
    lines.push({
      template: t.nCountry(flagOf(news.country.country), num(news.country.n, lang)),
    });
  }

  const todayCount = news?.today ?? 0;
  let milestone: number | undefined;
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (todayCount >= MILESTONES[i]) {
      milestone = MILESTONES[i];
      break;
    }
  }

  if (milestone) {
    lines.push({
      template: t.nMilestone(num(milestone, lang)),
    });
  }

  lines.push({ template: canned(0) }, { template: canned(1) });

  const renderContent = (line: NewsLine) => {
    if (!line.person || !line.template.includes('{who}')) {
      return <span>{line.template}</span>;
    }
    const [before, after = ''] = line.template.split('{who}');
    return (
      <span>
        {before}
        <bdi>{flagOf(line.person.country)}</bdi>{' '}
        <bdi>{line.person.name || t.anon}</bdi>
        {after}
      </span>
    );
  };

  const [top, ...rest] = lines;

  return (
    <RetroWindow title={t.newsTitle} className="newswin">
      <div className="breaking">
        <b>{t.breaking}</b>
        <p id="newsTop">{top ? renderContent(top) : null}</p>
      </div>
      <ul className="news">
        {rest.map((line, idx) => (
          <li key={idx}>{renderContent(line)}</li>
        ))}
      </ul>
    </RetroWindow>
  );
};
