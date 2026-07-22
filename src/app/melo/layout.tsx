import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { ThemeProvider } from '@/lib/melo/theme';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-melo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Alfa Glass',
  description: 'Soluções em Engenharia — Gestão',
  manifest: '/melo-manifest.json',
  icons: {
    icon: [
      { url: '/alfaglass-icon.png', type: 'image/png' },
    ],
    shortcut: '/alfaglass-icon.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'apple-touch-icon-precomposed', url: '/apple-touch-icon-precomposed.png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',   // status bar transparente — cor do app aparece atrás
    title: 'Alfa Glass',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#0C0C0A' },
    { media: '(prefers-color-scheme: light)', color: '#F6F6F3' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function MeloLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={jakarta.variable}
      style={{ fontFamily: 'var(--font-melo), system-ui, sans-serif' }}
    >
      {/* ThemeProvider aqui garante que TODOS os pages podem usar useTheme() */}
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </div>
  );
}
