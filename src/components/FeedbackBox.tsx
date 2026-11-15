'use client';

import React, { useState } from 'react';
import { Lang } from '@/types';
import { dictionaries } from '@/lib/i18n';
import { submitFeedback } from '@/lib/supabase';

interface FeedbackBoxProps {
  session: string;
  lang: Lang;
}

const APP_VERSION = 'web-next-1';

export const FeedbackBox: React.FC<FeedbackBoxProps> = ({ session, lang }) => {
  const t = dictionaries[lang];
  const [kind, setKind] = useState('bug');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (trimmed.length < 3) {
      setStatus(t.feedbackShort);
      return;
    }

    setIsSending(true);
    setStatus(t.feedbackSending);

    try {
      await submitFeedback({
        p_session: session,
        p_kind: kind,
        p_message: trimmed,
        p_name: name.trim() || null,
        p_lang: lang,
        p_app_version: APP_VERSION,
      });
      setMessage('');
      setName('');
      setStatus(t.feedbackSent);
    } catch (err: any) {
      setStatus(
        /limit/.test(err.message) ? t.feedbackLimit : t.feedbackError
      );
    }
    setIsSending(false);
  };

  return (
    <details className="feedback-box">
      <summary>{t.feedbackOpen}</summary>
      <div className="feedback-form">
        <p className="muted">{t.feedbackPrivacy}</p>

        <div className="feedback-types">
          {(['bug', 'idea', 'place', 'other'] as const).map(k => (
            <label key={k}>
              <input
                type="radio"
                name="feedbackKind"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
              />
              <span>
                {k === 'bug'
                  ? t.feedbackBug
                  : k === 'idea'
                  ? t.feedbackIdea
                  : k === 'place'
                  ? t.feedbackPlace
                  : t.feedbackOther}
              </span>
            </label>
          ))}
        </div>

        <label className="feedback-name">
          <span>{t.feedbackNameLabel}</span>
          <input
            id="feedbackName"
            maxLength={16}
            autoComplete="nickname"
            placeholder={t.feedbackNamePh}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </label>

        <textarea
          id="feedbackMessage"
          maxLength={500}
          placeholder={t.feedbackPlaceholder}
          value={message}
          onChange={e => setMessage(e.target.value)}
        />

        <button
          id="feedbackSend"
          type="button"
          className="btn small"
          disabled={isSending}
          onClick={handleSubmit}
        >
          {t.feedbackSend}
        </button>

        {status && (
          <p id="feedbackStatus" role="status">
            {status}
          </p>
        )}
      </div>
    </details>
  );
};
