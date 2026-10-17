import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AprovaSync — cronograma de estudos adaptativo',
    short_name: 'AprovaSync',
    description: 'Cronograma de estudos para concursos e ENEM que se reorganiza quando você perde um dia.',
    start_url: '/app',
    display: 'standalone',
    background_color: '#FAF8F3',
    theme_color: '#1E3FC4',
    icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  };
}
