import type { Metadata, Viewport } from 'next';
import '../../styles/global.css';

export const metadata: Metadata = {
  title: 'Melo Digital — Gestão',
  description: 'Sistema de gestão empresarial',
  manifest: '/melo-manifest.json',
  icons: {
    icon: [{ url: '/melo-logo.png', type: 'image/png' }],
    shortcut: '/melo-logo.png',
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [{ rel: 'apple-touch-icon-precomposed', url: '/apple-touch-icon-precomposed.png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Melo Digital',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
