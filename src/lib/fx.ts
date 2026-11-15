export function splash(target: HTMLElement | null): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const rect = target ? target.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
  const colors = ['#3fd0bd', '#5cc8ff', '#ffd23f'];

  for (let i = 0; i < 14; i++) {
    const d = document.createElement('i');
    d.className = 'drop';
    d.style.cssText =
      `left:${rect.left + rect.width / 2}px;top:${rect.top + rect.height / 2}px;` +
      `--dx:${Math.random() * 260 - 130}px;--dy:${-50 - Math.random() * 110}px;` +
      `background:${colors[i % 3]}`;
    d.onanimationend = () => d.remove();
    document.body.append(d);
  }
}

export function releaseBalloons(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#ff7a6b', '#ffd23f', '#3fd0bd', '#c3adff', '#ff9ebb', '#5cc8ff'];

  for (let i = 0; i < 10; i++) {
    const balloon = document.createElement('i');
    balloon.className = 'balloon';
    const sway = Math.random() * 70 - 35;
    balloon.style.cssText =
      `--bx:${5 + Math.random() * 88}vw;` +
      `--bc:${colors[i % colors.length]};` +
      `--bd:${Math.random() * 0.35}s;` +
      `--bs:${sway}px;` +
      `--be:${sway * -0.5}px`;
    balloon.onanimationend = () => balloon.remove();
    document.body.append(balloon);
  }
}

export function certificateConfetti(container: HTMLElement | null): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const paper = container || document.querySelector('.certificate');
  if (!paper) return;

  const colors = ['#ff7a6b', '#ffd23f', '#3fd0bd', '#c3adff', '#ff9ebb'];
  for (let i = 0; i < 18; i++) {
    const bit = document.createElement('i');
    bit.className = 'cert-confetti';
    const angle = (Math.PI * 2 * i) / 18;
    const distance = 90 + Math.random() * 130;
    bit.style.cssText =
      `--confetti:${colors[i % colors.length]};` +
      `--cx:${Math.cos(angle) * distance}px;` +
      `--cy:${Math.sin(angle) * distance}px;` +
      `--cr:${Math.random() * 720 - 360}deg`;
    bit.onanimationend = () => bit.remove();
    paper.append(bit);
  }
}
