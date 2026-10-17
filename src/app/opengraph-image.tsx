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
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF8F3',
        }}
      >
        <svg width="480" height="480" viewBox="0 0 48 48">
          <rect width="48" height="48" rx="13" fill="#1E3FC4" />
          <path d="M36.5 14.2A15.5 15.5 0 1 0 40 25" fill="none" stroke="#F2B705" strokeWidth="4" strokeLinecap="round" />
          <path d="M15.5 24.8l5.6 5.6L33 17.5" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
