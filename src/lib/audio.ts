export function playApplause(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    for (let i = 0; i < 11; i++) {
      const length = Math.floor(ctx.sampleRate * 0.045);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < length; j++) {
        data[j] = (Math.random() * 2 - 1) * (1 - j / length);
      }
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = 'bandpass';
      filter.frequency.value = 900 + Math.random() * 900;
      filter.Q.value = 0.7;
      gain.gain.value = 0.07 + Math.random() * 0.035;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start(ctx.currentTime + i * 0.075 + Math.random() * 0.035);
    }
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1200);
  } catch {}
}

export function playGavel(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    for (const delay of [0, 0.13]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(delay ? 82 : 105, ctx.currentTime + delay);
      osc.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + delay + 0.12);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + delay + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.17);
    }
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch {}
}

export function playHoldTick(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.09);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 250);
  } catch {}
}
