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
  title: 'Melo Digital Studio',
  description: 'Gestão do seu negócio criativo',
  manifest: '/melo-manifest.json',
  icons: {
    icon: [
      { url: '/melo-logo.png', type: 'image/png' },
    ],
    shortcut: '/melo-logo.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'apple-touch-icon-precomposed', url: '/apple-touch-icon-precomposed.png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Melo Digital',
  },
};

export const viewport: Viewport = {
  themeColor: '#ffffff',
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
