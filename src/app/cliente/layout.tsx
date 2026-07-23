import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-melo',
  display: 'swap',
});

// Layout mínimo da área pública do cliente — carrega a fonte da marca.
// Fica fora de /melo de propósito: o link enviado ao cliente não deve
// conter nenhuma referência à marca antiga.
export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={jakarta.variable}
      style={{ fontFamily: 'var(--font-melo), system-ui, sans-serif' }}
    >
      {children}
    </div>
  );
}
