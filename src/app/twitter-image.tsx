import { renderOg, ogSize } from '@/lib/og';

export const runtime = 'edge';
export const alt = "Holding It — The World's Live Bladder & Bowel Bureau";
export const size = ogSize;
export const contentType = 'image/png';

export default function Image() {
  return renderOg();
}
