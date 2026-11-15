import { PersonalState, Lang, CertificateRuling } from '@/types';
import { dictionaries, fmtMin, num, MIN } from '@/lib/i18n';

export function calculateCertificateRuling(
  state: PersonalState,
  lang: Lang
): CertificateRuling {
  const t = dictionaries[lang];
  const trips = state.trips.length;
  const poopSuccess = (state.poopLog ?? []).filter(p => p.result !== 'failed').length;
  const daysSincePoop = state.lastPoopAt
    ? Math.floor((Date.now() - state.lastPoopAt) / (24 * 3600 * 1000))
    : (state.constipationDays ?? 0);

  if (state.holdingSince) {
    return {
      stamp: t.certStampHolding,
      verdict: t.certVerdictHolding(fmtMin(Date.now() - state.holdingSince, lang)),
    };
  }
  if (daysSincePoop >= 2) {
    return {
      stamp: t.certStampConstipated,
      verdict: t.certVerdictConstipated(num(daysSincePoop, lang)),
    };
  }
  if ((state.poopLog ?? []).some(p => p.result === 'struggle')) {
    return {
      stamp: t.certStampBowelBattle,
      verdict: t.certVerdictBowelBattle,
    };
  }
  if (poopSuccess >= 1 && (state.poopLog ?? []).some(p => p.result === 'smooth')) {
    return {
      stamp: t.certStampBowelSmooth,
      verdict: t.certVerdictBowelSmooth,
    };
  }
  if (!trips && !poopSuccess) {
    return {
      stamp: t.certStampNone,
      verdict: t.certVerdictNone,
    };
  }
  if (state.bestHold >= 45 * MIN) {
    return {
      stamp: t.certStampLong,
      verdict: t.certVerdictLong(fmtMin(state.bestHold, lang)),
    };
  }
  if (trips >= 5) {
    return {
      stamp: t.certStampBusy,
      verdict: t.certVerdictBusy(num(trips, lang)),
    };
  }
  return {
    stamp: t.certStamp,
    verdict: t.certVerdictRelieved(num(trips, lang)),
  };
}

export interface GenerateImageParams {
  caseId: string;
  verdict: string;
  stamp: string;
  tripsCount: string;
  poopCount: string;
  holdTime: string;
  waterCount: string;
  lang: Lang;
}

export async function generateCertificateImage({
  caseId,
  verdict,
  stamp,
  tripsCount,
  poopCount,
  holdTime,
  waterCount,
  lang,
}: GenerateImageParams): Promise<Blob> {
  const t = dictionaries[lang];
  const font = lang === 'fa' ? 'Vazirmatn' : 'Fredoka';

  if (typeof document !== 'undefined' && document.fonts) {
    const sample = [
      caseId,
      verdict,
      tripsCount,
      poopCount,
      holdTime,
      waterCount,
      stamp,
      t.certCourt,
      t.certTitle,
      t.certTripsLabel,
      t.certPoopLabel,
      t.certHoldLabel,
      t.certWaterLabel,
      t.certFooter,
      new Date().toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB'),
    ].join(' ');

    await Promise.all(
      [400, 500, 700, 800].map(weight =>
        document.fonts.load(`${weight} 32px "${font}"`, sample).catch(() => {})
      )
    );
    await document.fonts.ready.catch(() => {});
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1350;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Canvas not supported');

  c.direction = t.dir;
  c.fillStyle = '#fff8df';
  c.fillRect(0, 0, canvas.width, canvas.height);

  c.strokeStyle = '#2a1a4a';
  c.lineWidth = 8;
  c.strokeRect(34, 34, 1012, 1282);
  c.lineWidth = 2;
  c.strokeRect(52, 52, 976, 1246);

  c.strokeStyle = '#2a1a4a18';
  c.lineWidth = 1;
  for (let y = 90; y < 1300; y += 42) {
    c.beginPath();
    c.moveTo(54, y);
    c.lineTo(1026, y);
    c.stroke();
  }

  const center = 540;
  c.textAlign = 'center';
  c.fillStyle = '#2a1a4a';
  c.font = `700 27px ${font}`;
  c.fillText(t.certCourt, center, 125);
  c.font = `800 52px ${font}`;
  c.fillText(t.certTitle, center, 205);
  c.font = `400 24px ${font}`;
  c.fillText(t.certCase(caseId), center, 255);

  const wrapped = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (c.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.forEach((val, i) => c.fillText(val, x, y + i * lineHeight));
  };

  c.strokeStyle = '#2a1a4a';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(120, 300);
  c.lineTo(960, 300);
  c.stroke();

  c.font = `700 32px ${font}`;
  wrapped(verdict, center, 355, 800, 52);

  c.beginPath();
  c.moveTo(120, 490);
  c.lineTo(960, 490);
  c.stroke();

  const statX = [180, 420, 660, 900];
  const statValue = [tripsCount, poopCount, holdTime, waterCount];
  const statLabel = [t.certTripsLabel, t.certPoopLabel, t.certHoldLabel, t.certWaterLabel];
  for (let i = 0; i < 4; i++) {
    c.font = `800 46px ${font}`;
    c.fillText(statValue[i], statX[i], 590);
    c.font = `500 20px ${font}`;
    c.fillText(statLabel[i], statX[i], 635);
  }

  // Gavel / Official Stamp in red
  c.save();
  c.translate(center, 850);
  c.rotate((-13 * Math.PI) / 180);
  c.strokeStyle = '#ba2636';
  c.fillStyle = '#ba2636';
  c.lineWidth = 9;
  c.beginPath();
  c.arc(0, 0, 145, 0, Math.PI * 2);
  c.stroke();
  c.lineWidth = 3;
  c.beginPath();
  c.arc(0, 0, 126, 0, Math.PI * 2);
  c.stroke();
  c.font = `800 34px ${font}`;
  c.textAlign = 'center';
  stamp.split('\n').forEach((line, i) => c.fillText(line, 0, -5 + i * 42));
  c.restore();

  c.fillStyle = '#2a1a4a';
  c.textAlign = 'center';
  c.font = `700 25px ${font}`;
  c.fillText(t.certFooter, center, 1175);
  c.font = `400 22px ${font}`;
  c.fillText(
    new Date().toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-GB'),
    center,
    1225
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))), 'image/png');
  });
}
