'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PersonalState, Lang } from '@/types';
import { dictionaries, num, fmtMin, MIN } from '@/lib/i18n';
import { calculateCertificateRuling, generateCertificateImage } from '@/lib/certificate';
import { playGavel } from '@/lib/audio';
import { certificateConfetti } from '@/lib/fx';

interface CertificateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  state: PersonalState;
  session: string;
  lang: Lang;
}

export const CertificateDialog: React.FC<CertificateDialogProps> = ({
  isOpen,
  onClose,
  state,
  session,
  lang,
}) => {
  const t = dictionaries[lang];
  const [stampHit, setStampHit] = useState(false);
  const [shareStatus, setShareStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const paperRef = useRef<HTMLElement>(null);

  const waterTotal = (state.waterLog ?? []).reduce((sum, entry) => sum + entry.ml, 0);
  const waterCups = waterTotal / 250;
  const poopSuccess = (state.poopLog ?? []).filter(p => p.result !== 'failed').length;

  const caseId = `${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${session.slice(-4).toUpperCase()}`;
  const ruling = calculateCertificateRuling(state, lang);

  const tripsCountStr = num(state.trips.length, lang);
  const poopCountStr = num(poopSuccess, lang);
  const holdTimeStr = state.bestHold >= MIN ? fmtMin(state.bestHold, lang) : '–';
  const waterCountStr = num(waterCups, lang);

  useEffect(() => {
    if (isOpen) {
      setStampHit(false);
      setShareStatus('');
      const timer = setTimeout(() => {
        setStampHit(true);
        playGavel();
        certificateConfetti(paperRef.current);
      }, 650);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleShare = async () => {
    setIsGenerating(true);
    setShareStatus(t.certPreparing);

    try {
      const blob = await generateCertificateImage({
        caseId,
        verdict: ruling.verdict,
        stamp: ruling.stamp,
        tripsCount: tripsCountStr,
        poopCount: poopCountStr,
        holdTime: holdTimeStr,
        waterCount: waterCountStr,
        lang,
      });

      const filename = 'holding-it-verdict.png';
      const file =
        typeof File === 'function'
          ? new File([blob], filename, { type: 'image/png' })
          : null;

      const shareText =
        `${t.certTitle}\n` +
        t.shareText(
          num(state.trips.length, lang),
          state.bestHold >= MIN ? fmtMin(state.bestHold, lang) : ''
        );

      const data: ShareData = { text: shareText };
      if (typeof window !== 'undefined' && /^https?:/.test(window.location.href)) {
        data.url = window.location.href;
      }

      if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ ...data, files: [file] });
        setShareStatus(t.certCopied);
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        if (navigator.clipboard?.writeText) {
          await navigator.clipboard
            .writeText([data.text, data.url].filter(Boolean).join(' '))
            .catch(() => {});
        }
        setShareStatus(t.certDownloaded);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setShareStatus(t.certShareFail);
      }
    }
    setIsGenerating(false);
  };

  const handleShareOnX = () => {
    const verdictClean = ruling.verdict.replace(/\s+/g, ' ').trim();
    const stampClean = ruling.stamp.replace(/\n/g, ' ').trim();
    const text =
      lang === 'fa'
        ? `⚖️ حکم رسمی دادگاه عالی امور مثانه و روده:\n«${verdictClean}»\nتمبر: [${stampClean}]\n#HoldingIt`
        : `⚖️ Official Supreme Court of Bladder & Bowel Affairs verdict:\n"${verdictClean}"\n\nOfficial Stamp: [${stampClean}]\n#HoldingIt`;
    const url = typeof window !== 'undefined' ? window.location.origin : 'https://holding-it.vercel.app';
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div id="certificateDialog" onClick={onClose} role="dialog" aria-modal="true">
      <article
        ref={paperRef}
        className="certificate reveal"
        onClick={e => e.stopPropagation()}
      >
        <p className="court-kicker">{t.certCourt}</p>
        <h3>{t.certTitle}</h3>
        <p className="case-no" id="certCase">
          {t.certCase(caseId)}
        </p>
        <p className="verdict" id="certVerdict">
          {ruling.verdict}
        </p>

        <div className="cert-stats">
          <div>
            <b id="certTrips">{tripsCountStr}</b>
            <small>{t.certTripsLabel}</small>
          </div>
          <div>
            <b id="certPoop">{poopCountStr}</b>
            <small>{t.certPoopLabel}</small>
          </div>
          <div>
            <b id="certHold">{holdTimeStr}</b>
            <small>{t.certHoldLabel}</small>
          </div>
          <div>
            <b id="certWater">{waterCountStr}</b>
            <small>{t.certWaterLabel}</small>
          </div>
        </div>

        <div
          id="certStamp"
          className={`stamp ${stampHit ? 'hit' : ''}`}
        >
          {ruling.stamp}
        </div>

        <div className="cert-actions">
          <button
            id="certShare"
            className="btn"
            type="button"
            disabled={isGenerating}
            onClick={handleShare}
          >
            💾 {t.certShare}
          </button>
          <button
            id="certTwitter"
            className="btn twitter-btn"
            type="button"
            onClick={handleShareOnX}
            title={lang === 'fa' ? 'اشتراک در توییتر' : 'Post verdict on X'}
          >
            𝕏 {lang === 'fa' ? 'توییت حکم' : 'Post on X'}
          </button>
          <button
            id="certClose"
            className="btn"
            type="button"
            aria-label={t.certCloseLabel}
            onClick={onClose}
          >
            {t.certClose}
          </button>
        </div>

        {shareStatus && (
          <p id="certStatus" role="status">
            {shareStatus}
          </p>
        )}
      </article>
    </div>
  );
};
