import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'AprovaSync — cronograma de estudos adaptativo';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#FAF8F3',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <svg width="240" height="240" viewBox="0 0 48 48">
            <rect width="48" height="48" rx="13" fill="#1E3FC4" />
            <path d="M36.5 14.2A15.5 15.5 0 1 0 40 25" fill="none" stroke="#F2B705" strokeWidth="4" strokeLinecap="round" />
            <path d="M15.5 24.8l5.6 5.6L33 17.5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: '#12203F' }}>
            Aprova<span style={{ color: '#1E3FC4' }}>Sync</span>
          </div>
        </div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 52, fontWeight: 800, color: '#12203F', maxWidth: 900, lineHeight: 1.15 }}>
          Perdeu um dia de estudo?
        </div>
        <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, color: '#1E3FC4', maxWidth: 900, lineHeight: 1.15 }}>
          A gente refaz o plano.
        </div>
        <div style={{ display: 'flex', marginTop: 32, fontSize: 28, color: '#4A5776' }}>
          Cronograma adaptativo para concursos e ENEM
        </div>
      </div>
    ),
    { ...size },
  );
}
