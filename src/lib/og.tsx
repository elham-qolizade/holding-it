import { ImageResponse } from 'next/og';

export const ogSize = { width: 1200, height: 630 };

export function renderOg() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#ffc2d1',
          color: '#2a1a4a',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            background: '#fff8ec',
            border: '8px solid #2a1a4a',
            boxShadow: '16px 16px 0 #2a1a4a',
            padding: '48px 64px',
            width: 960,
          }}
        >
          <div style={{ fontSize: 26, letterSpacing: 3, color: '#6a5a80' }}>
            SUPREME COURT OF BLADDER &amp; BOWEL AFFAIRS
          </div>
          <div style={{ fontSize: 108, fontWeight: 800, marginTop: 16 }}>Holding It</div>
          <div style={{ fontSize: 40, marginTop: 8, textAlign: 'center' }}>
            Live worldwide. Get your official verdict.
          </div>
          <div
            style={{
              marginTop: 36,
              padding: '12px 28px',
              background: '#ffd23f',
              border: '5px solid #2a1a4a',
              fontSize: 34,
              fontWeight: 700,
            }}
          >
            No signup · 100% free
          </div>
        </div>
      </div>
    ),
    ogSize
  );
}
