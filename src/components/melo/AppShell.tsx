'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  SquaresFour, CurrencyDollar, Calendar, Briefcase,
  ChartLineUp, Question, MagnifyingGlass, Bell,
  SignOut, Sun, Moon, X, CaretRight, FolderOpen,
} from '@phosphor-icons/react';
import { useTheme } from '@/lib/melo/theme';
import { MeloIcon } from '@/components/melo/MeloLogo';

const NAV = [
  { href: '/melo/dashboard',  icon: SquaresFour,   label: 'Dashboard' },
  { href: '/melo/finances',   icon: CurrencyDollar, label: 'Finanças' },
  { href: '/melo/agenda',     icon: Calendar,      label: 'Agenda' },
  { href: '/melo/services',   icon: Briefcase,     label: 'Serviços' },
  { href: '/melo/documents',  icon: FolderOpen,    label: 'Documentos' },
  { href: '/melo/reminders',  icon: Bell,          label: 'Alarmes' },
  { href: '/melo/statistics', icon: ChartLineUp,   label: 'Estatísticas' },
  { href: '/melo/help',       icon: Question,      label: 'Ajuda' },
];

type SearchResult = {
  finances: { id: string; description: string; amount: number; type: string }[];
  agenda: { id: string; title: string; date: string }[];
  services: { id: string; name: string; client: string }[];
};

const ease = 'cubic-bezier(0.32,0.72,0,1)';

function ShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggle, v, c } = useTheme();
  const [authChecked, setAuthChecked] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('melo_token');
    if (!token) { router.replace('/melo'); return; }
    fetch('/api/melo/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) { localStorage.removeItem('melo_token'); router.replace('/melo'); }
        else {
          setAuthChecked(true);
          // Registra o Service Worker para notificações push
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/melo-sw.js', { scope: '/' }).catch(() => {});
          }
          // Dispara verificação de notificações em background
          fetch('/api/melo/cron/check-notifications', { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        }
      })
      .catch(() => { localStorage.removeItem('melo_token'); router.replace('/melo'); });
  }, [pathname, router]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(null); return; }
    setSearching(true);
    const token = localStorage.getItem('melo_token') || '';
    fetch(`/api/melo/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setResults(d); setSearching(false); })
      .catch(() => setSearching(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 280);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  async function logout() {
    const token = localStorage.getItem('melo_token') || '';
    await fetch('/api/melo/auth', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    localStorage.removeItem('melo_token');
    router.replace('/melo');
  }

  if (!authChecked) {
    return (
      <div className={`${v.bg} flex items-center justify-center`} style={{ position: 'fixed', inset: 0 }}>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#1D6EF7] animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const pageTitle = NAV.find(n => n.href === pathname)?.label ?? 'Melo Digital';
  const navItem = (active: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${active
      ? 'bg-[#1D6EF7] text-white shadow-[0_2px_12px_rgba(29,110,247,0.32),inset_0_1px_0_rgba(255,255,255,0.12)]'
      : `${isDark ? 'text-[#6C6C64]' : 'text-[#5A5A52]'} ${v.hover}`
    }`;

  return (
    /* ── Fixed full-screen shell — fixes iOS scroll ── */
    <div
      style={{
        position: 'fixed', inset: 0,
        paddingTop: 'env(safe-area-inset-top)',
        background: c.bg,
        color: c.t1,            /* herança de cor para todos os filhos */
        transition: 'background 300ms, color 300ms',
        transitionTimingFunction: ease,
      }}
    >
      {/* Grain overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-[999] mix-blend-overlay"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '160px',
        }}
      />

      <div className="h-full flex overflow-hidden">
        {/* ── Desktop Sidebar ── */}
        <aside
          className="hidden md:flex flex-col w-56 flex-shrink-0 h-full"
          style={{ background: c.bg, borderRight: `1px solid ${c.border}`, transition: `background 300ms ${ease}` }}
        >
          <div className="px-4 h-[58px] flex items-center flex-shrink-0"
            style={{ borderBottom: `1px solid ${c.border}` }}>
            <MeloIcon size={36} />
          </div>
          <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto">
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={navItem(active)}
                  style={{ transitionDuration: '200ms', transitionTimingFunction: ease }}>
                  <Icon size={17} weight={active ? 'fill' : 'regular'} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="px-2.5 py-3 space-y-0.5 flex-shrink-0" style={{ borderTop: `1px solid ${c.border}` }}>
            <button onClick={toggle}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl w-full text-[13px] font-medium ${isDark ? 'text-[#6C6C64]' : 'text-[#5A5A52]'} ${v.hover}`}
              style={{ transition: `all 200ms ${ease}` }}>
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
              {isDark ? 'Modo Claro' : 'Modo Escuro'}
            </button>
            <button onClick={logout}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#E5484D] hover:bg-[#E5484D]/10 w-full text-[13px] font-medium"
              style={{ transition: `all 200ms ${ease}` }}>
              <SignOut size={17} />
              Sair
            </button>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <header
            className="backdrop-blur-xl h-[58px] px-4 md:px-5 flex items-center justify-between flex-shrink-0 z-10"
            style={{
              background: c.bg + 'E8',
              borderBottom: `1px solid ${c.border}`,
              WebkitBackdropFilter: 'blur(20px)',
              backdropFilter: 'blur(20px)',
              transition: `background 300ms ${ease}`,
            }}
          >
            <div className="flex items-center gap-2.5">
              <div className="md:hidden"><MeloIcon size={30} /></div>
              <span className="font-semibold text-[15px]" style={{ color: c.t1 }}>{pageTitle}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setSearchOpen(true)}
                className={`flex items-center gap-2 ${isDark ? 'bg-[#1C1C18] text-[#8C8C84] hover:bg-[#242420]' : 'bg-[#EFEFEA] text-[#7C7C74] hover:bg-[#E4E4DC]'} px-3 py-1.5 rounded-full text-[13px] font-medium`}
                style={{ transition: `all 200ms ${ease}` }}>
                <MagnifyingGlass size={13} weight="bold" />
                <span className="hidden sm:inline">Pesquisar</span>
              </button>
              <button onClick={toggle}
                className={`hidden md:flex w-8 h-8 items-center justify-center rounded-xl ${v.hover}`}
                style={{ transition: `all 200ms ${ease}` }}>
                {isDark ? <Sun size={16} className="text-[#8C8C84]" /> : <Moon size={16} className="text-[#7C7C74]" />}
              </button>
              <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px] text-white flex-shrink-0"
                style={{ background: 'linear-gradient(145deg,#1D6EF7,#1249C2)', boxShadow: '0 2px 8px rgba(29,110,247,0.28),inset 0 1px 0 rgba(255,255,255,0.14)' }}>
                M
              </div>
            </div>
          </header>

          {/* Scrollable content */}
          <main
            className="flex-1 overflow-y-auto pb-20 md:pb-0"
            style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
          >
            {children}
          </main>
        </div>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          background: c.bg + 'EE',
          borderTop: `1px solid ${c.border}`,
        }}
      >
        <div className="flex">
          {/* Dashboard, Finanças, Agenda, Serviços, Documentos */}
          {[
            { href: '/melo/dashboard', icon: SquaresFour,   label: 'Início' },
            { href: '/melo/finances',  icon: CurrencyDollar, label: 'Finanças' },
            { href: '/melo/agenda',    icon: Calendar,      label: 'Agenda' },
            { href: '/melo/services',  icon: Briefcase,     label: 'Serviços' },
            { href: '/melo/documents', icon: FolderOpen,    label: 'Docs' },
          ].map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href}
                className="flex-1 flex flex-col items-center pt-2.5 pb-2 gap-0.5"
                style={{ color: active ? '#1D6EF7' : c.muted, transition: `color 200ms ${ease}` }}>
                <Icon size={21} weight={active ? 'fill' : 'regular'} />
                <span className="text-[9px] font-semibold">{label}</span>
              </Link>
            );
          })}
          {/* Modo noturno */}
          <button onClick={toggle}
            className="flex-1 flex flex-col items-center pt-2.5 pb-2 gap-0.5 active:opacity-60 transition-opacity"
            style={{ color: isDark ? '#3B82F6' : c.muted }}>
            {isDark ? <Sun size={21} weight="fill" /> : <Moon size={21} />}
            <span className="text-[9px] font-semibold">{isDark ? 'Claro' : 'Escuro'}</span>
          </button>
        </div>
      </nav>

      {/* ── Search Modal ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 4rem)', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setSearchOpen(false); setQuery(''); setResults(null); } }}
        >
          <div
            className="w-full max-w-lg rounded-[1.5rem] p-1.5"
            style={{
              background: isDark ? 'rgba(12,12,10,0.7)' : 'rgba(254,254,254,0.7)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`,
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}>
            <div className={`${v.modal} rounded-[calc(1.5rem-6px)] overflow-hidden`}
              style={{ border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
              <div className={`flex items-center gap-3 px-4 py-3.5 border-b ${v.border}`}>
                <MagnifyingGlass size={16} className={v.muted} />
                <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                  placeholder="Pesquisar em tudo..."
                  className="flex-1 text-[14px] bg-transparent outline-none"
                  style={{ color: isDark ? '#F0F0EC' : '#111110' }} />
                <button onClick={() => { setSearchOpen(false); setQuery(''); setResults(null); }}>
                  <X size={16} className={v.muted} />
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
                {searching && (
                  <div className="flex gap-1.5 justify-center py-6">
                    {[0,1,2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#1D6EF7] animate-pulse" style={{ animationDelay: `${i*150}ms` }} />)}
                  </div>
                )}
                {!searching && results && (
                  <div className="p-2">
                    {results.finances.length === 0 && results.agenda.length === 0 && results.services.length === 0
                      ? <p className={`text-center text-[13px] py-5 ${v.muted}`}>Nenhum resultado</p>
                      : <>
                          {results.finances.map(f => (
                            <Link key={f.id} href="/melo/finances" onClick={() => setSearchOpen(false)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl ${v.hover}`}>
                              <span className={`text-[13px] ${v.t1}`}>{f.description}</span>
                              <span className={`text-[13px] font-semibold ${f.type === 'income' ? 'text-[#16A34A]' : 'text-[#E5484D]'}`}>
                                {f.type === 'income' ? '+' : '-'}R${f.amount.toFixed(0)}
                              </span>
                            </Link>
                          ))}
                          {results.agenda.map(e => (
                            <Link key={e.id} href="/melo/agenda" onClick={() => setSearchOpen(false)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl ${v.hover}`}>
                              <span className={`text-[13px] ${v.t1}`}>{e.title}</span>
                              <span className={`text-[11px] ${v.muted}`}>{e.date}</span>
                            </Link>
                          ))}
                          {results.services.map(s => (
                            <Link key={s.id} href="/melo/services" onClick={() => setSearchOpen(false)}
                              className={`flex items-center justify-between px-3 py-2 rounded-xl ${v.hover}`}>
                              <span className={`text-[13px] ${v.t1}`}>{s.name}</span>
                              <CaretRight size={13} className={v.muted} />
                            </Link>
                          ))}
                        </>
                    }
                  </div>
                )}
                {!searching && !results && (
                  <p className={`text-center text-[13px] py-5 ${v.muted}`}>Digite algo para pesquisar</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <ShellInner>{children}</ShellInner>;
}
