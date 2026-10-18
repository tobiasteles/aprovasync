import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'AprovaSync — o cronograma que se ajusta quando a vida acontece', template: '%s · AprovaSync' },
  description:
    'Cronograma de estudos adaptativo para concursos e ENEM. Perdeu um dia? O AprovaSync recalcula sua carga até a data da prova, sem estourar suas horas.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
};

export const viewport: Viewport = { themeColor: '#faf8f3' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
