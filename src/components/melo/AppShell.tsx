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
  { href: '/melo/dashboard',  icon: SquaresFour,    label: 'Dashboard' },
  { href: '/melo/finances',   icon: CurrencyDollar, label: 'Finanças' },
  { href: '/melo/agenda',     icon: Calendar,       label: 'Agenda' },
  { href: '/melo/services',   icon: Briefcase,      label: 'Serviços' },
  { href: '/melo/documents',  icon: FolderOpen,     label: 'Documentos' },
  { href: '/melo/reminders',  icon: Bell,           label: 'Alarmes' },
  { href: '/melo/statistics', icon: ChartLineUp,    label: 'Estatísticas' },
  { href: '/melo/help',       icon: Question,       label: 'Ajuda' },
];

const MOBILE_NAV = [
  { href: '/melo/dashboard',  icon: SquaresFour,    label: 'Início' },
  { href: '/melo/finances',   icon: CurrencyDollar, label: 'Finanças' },
  { href: '/melo/agenda',     icon: Calendar,       label: 'Agenda' },
  { href: '/melo/services',   icon: Briefcase,      label: 'Serviços' },
  { href: '/melo/documents',  icon: FolderOpen,     label: 'Docs' },
  { href: '/melo/reminders',  icon: Bell,           label: 'Alarmes' },
  { href: '/melo/statistics', icon: ChartLineUp,    label: 'Stats' },
  { href: '/melo/help',       icon: Question,       label: 'Ajuda' },
];

const NOTIF_INTERVAL_MS = 4 * 60 * 60 * 1000;

type SearchResult = {
  finances: { id: string; description: string; amount: number; type: string }[];
  agenda: { id: string; title: string; date: string }[];
  services: { id: string; name: string; client: string }[];
};

const ease = 'cubic-bezier(0.32,0.72,0,1)';

function ShellInner({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { isDark, toggle, c } = useTheme();

  const [authChecked, setAuthChecked] = useState(false);
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<SearchResult | null>(null);
  const [searching,   setSearching]   = useState(false);

  // Sincroniza theme-color da barra do Safari/iPhone com o tema do app
  // Remove todos os meta theme-color existentes (Next.js cria com media query)
  // e insere um novo sem media query para sobrescrever
  useEffect(() => {
    const color = isDark ? '#0C0C0A' : '#F6F6F3';
    document.querySelectorAll('meta[name="theme-color"]').forEach(el => el.remove());
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    document.head.appendChild(meta);
  }, [isDark]);

  useEffect(() => {
    const token = localStorage.getItem('melo_token');
    if (!token) { router.replace('/melo'); return; }
    fetch('/api/melo/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) { localStorage.removeItem('melo_token'); router.replace('/melo'); }
        else {
          setAuthChecked(true);
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/melo-sw.js', { scope: '/' }).catch(() => {});
          }
          const last = parseInt(localStorage.getItem('melo_last_notif_check') || '0', 10);
          if (Date.now() - last > NOTIF_INTERVAL_MS) {
            localStorage.setItem('melo_last_notif_check', String(Date.now()));
            fetch('/api/melo/cron/check-notifications', { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
          }
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
    localStorage.removeItem('melo_last_notif_check');
    router.replace('/melo');
  }

  if (!authChecked) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#1D6EF7', animationDelay: `${i*150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  const pageTitle = NAV.find(n => n.href === pathname)?.label ?? 'Alfa Glass';

  const sidebarItem = (active: boolean) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: '9px 12px',
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    transition: `all 200ms ${ease}`,
    textDecoration: 'none',
    color: active ? c.accent : (isDark ? '#6C6C64' : '#5A5A52'),
    background: active ? c.accentMuted : 'transparent',
    borderLeft: active ? `2px solid ${c.accent}` : '2px solid transparent',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0,
      paddingTop: 'env(safe-area-inset-top)',
      background: c.bg, color: c.t1,
      transition: 'background 300ms, color 300ms',
      transitionTimingFunction: ease,
      overflowX: 'hidden',   /* bloqueia scroll lateral global */
    }}>
      {/* Grain */}
      <div className="pointer-events-none fixed inset-0 z-[999] mix-blend-overlay"
        style={{
          opacity: 0.018,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat', backgroundSize: '160px',
        }}
      />

      <div className="h-full flex overflow-hidden">
        {/* ── Desktop Sidebar — completely hidden on mobile ── */}
        <aside className="hidden md:flex flex-col flex-shrink-0 h-full"
          style={{
            width: 220,
            background: isDark ? '#090908' : '#F2F2EF',
            borderRight: `1px solid ${c.border}`,
            transition: `background 300ms ${ease}`,
          }}>
          <div style={{
            padding: '0 16px',
            height: 60,
            display: 'flex',
            alignItems: 'center',
            borderBottom: `1px solid ${c.border}`,
          }}>
            <MeloIcon size={34} />
          </div>

          <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
            {NAV.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} style={sidebarItem(active)}>
                  <Icon size={16} weight={active ? 'fill' : 'regular'} color={active ? c.accent : undefined} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          <div style={{ padding: '10px 10px 14px', borderTop: `1px solid ${c.border}`, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <button onClick={toggle} style={{
              ...sidebarItem(false),
              background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left',
              borderLeft: '2px solid transparent',
            }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
              <span>{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
            <button onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer',
              width: '100%', textAlign: 'left', transition: `all 200ms ${ease}`,
            }}>
              <SignOut size={16} />
              <span>Sair</span>
            </button>
          </div>
        </aside>

        {/* ── Main column ── */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <header style={{
            height: 58,
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            background: isDark ? 'rgba(9,9,8,0.88)' : 'rgba(246,246,243,0.88)',
            borderBottom: `1px solid ${c.border}`,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            transition: `background 300ms ${ease}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="md:hidden"><MeloIcon size={28} /></div>
              <span style={{ fontWeight: 600, fontSize: 15, color: c.t1 }}>{pageTitle}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setSearchOpen(true)} style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 12px', borderRadius: 20,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${c.border}`,
                color: c.muted, fontSize: 13, fontWeight: 500,
                cursor: 'pointer', transition: `all 200ms ${ease}`,
              }}>
                <MagnifyingGlass size={13} weight="bold" />
                <span className="hidden sm:inline">Pesquisar</span>
              </button>

              <button onClick={toggle} className="hidden md:flex" style={{
                width: 34, height: 34, borderRadius: 8,
                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                border: `1px solid ${c.border}`,
                color: c.muted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: `all 200ms ${ease}`,
              }}>
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {/* Logo avatar */}
              <img
                src="/alfaglass-icon.png"
                alt="Alfa Glass"
                style={{
                  width: 32, height: 32, borderRadius: 9,
                  objectFit: 'cover', flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
                }}
              />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto"
            style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))',
              overflowX: 'hidden', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
            {children}
          </main>
        </div>
      </div>

      {/* ── Mobile: Floating Pill Nav ──
          left:12/right:12 + flex:1 garante que todos os 8 itens caibam
          uniformemente na largura do iPhone, sem corte. */}
      <nav className="md:hidden" style={{
        position: 'fixed',
        bottom: 'max(0.75rem, calc(env(safe-area-inset-bottom) + 0.25rem))',
        left: 12,
        right: 12,
        zIndex: 40,
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        background: isDark ? 'rgba(14,14,12,0.86)' : 'rgba(252,252,250,0.88)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
        borderRadius: 9999,
        boxShadow: isDark
          ? '0 8px 32px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)'
          : '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '5px 3px',
      }}>
        {MOBILE_NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              prefetch
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '6px 2px',
                borderRadius: 9999,
                textDecoration: 'none',
                background: active ? c.accentMuted : 'transparent',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <Icon size={18} weight={active ? 'fill' : 'regular'}
                color={active ? c.accent : (isDark ? '#6C6C64' : '#9C9C94')} />
              <span style={{
                fontSize: 8, fontWeight: 700,
                color: active ? c.accent : (isDark ? '#5A5A54' : '#9C9C94'),
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}>
                {label}
              </span>
            </Link>
          );
        })}

      </nav>

      {/* ── Search Modal ── */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 4rem)',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) { setSearchOpen(false); setQuery(''); setResults(null); } }}
        >
          <div className="w-full max-w-lg" style={{
            borderRadius: 20,
            overflow: 'hidden',
            background: isDark ? 'rgba(14,14,12,0.92)' : 'rgba(254,254,252,0.95)',
            border: `1px solid ${c.border}`,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            backdropFilter: 'blur(20px)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '14px 16px',
              borderBottom: `1px solid ${c.border}`,
            }}>
              <MagnifyingGlass size={16} color={c.muted} />
              <input autoFocus value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Pesquisar em tudo..."
                style={{
                  flex: 1, fontSize: 14, background: 'transparent',
                  outline: 'none', color: c.t1, border: 'none',
                  fontFamily: 'inherit',
                }} />
              <button onClick={() => { setSearchOpen(false); setQuery(''); setResults(null); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.muted, display: 'flex' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {searching && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '24px 0' }}>
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ background: '#1D6EF7', animationDelay: `${i*150}ms` }} />
                  ))}
                </div>
              )}
              {!searching && results && (
                <div style={{ padding: 8 }}>
                  {results.finances.length === 0 && results.agenda.length === 0 && results.services.length === 0 ? (
                    <p style={{ textAlign: 'center', fontSize: 13, padding: '20px 0', color: c.muted }}>Nenhum resultado</p>
                  ) : (
                    <>
                      {results.finances.map(f => (
                        <Link key={f.id} href="/melo/finances" onClick={() => setSearchOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 10, textDecoration: 'none',
                            transition: `background 150ms`, color: c.t1,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = c.accentMuted)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ fontSize: 13 }}>{f.description}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: f.type==='income'?'#16A34A':'#EF4444' }}>
                            {f.type==='income'?'+':'-'}R${f.amount.toFixed(0)}
                          </span>
                        </Link>
                      ))}
                      {results.agenda.map(e => (
                        <Link key={e.id} href="/melo/agenda" onClick={() => setSearchOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 10, textDecoration: 'none', color: c.t1,
                            transition: `background 150ms`,
                          }}
                          onMouseEnter={e2 => (e2.currentTarget.style.background = c.accentMuted)}
                          onMouseLeave={e2 => (e2.currentTarget.style.background = 'transparent')}>
                          <span style={{ fontSize: 13 }}>{e.title}</span>
                          <span style={{ fontSize: 11, color: c.muted }}>{e.date}</span>
                        </Link>
                      ))}
                      {results.services.map(s => (
                        <Link key={s.id} href="/melo/services" onClick={() => setSearchOpen(false)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 10, textDecoration: 'none', color: c.t1,
                            transition: `background 150ms`,
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = c.accentMuted)}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          <span style={{ fontSize: 13 }}>{s.name}</span>
                          <CaretRight size={13} color={c.muted} />
                        </Link>
                      ))}
                    </>
                  )}
                </div>
              )}
              {!searching && !results && (
                <p style={{ textAlign: 'center', fontSize: 13, padding: '20px 0', color: c.muted }}>
                  Digite algo para pesquisar
                </p>
              )}
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
