'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function LoginInner() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('melo_token');
    if (!token) { setChecking(false); return; }
    fetch('/api/melo/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (r.ok) router.replace('/melo/dashboard');
        else { setChecking(false); localStorage.removeItem('melo_token'); }
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setLoading(true); setError('');
    const res = await fetch('/api/melo/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || 'PIN incorreto'); setLoading(false); setPin(''); return; }
    localStorage.setItem('melo_token', data.token);
    router.push('/melo/dashboard');
  }

  if (checking) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#050510', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Fundo responsivo via CSS — mobile usa WPP, desktop usa melo-bg */}
      <style>{`
        .melo-login-root {
          background-image: url('/WPP---IPHONE.jpg');
          background-size: cover;
          background-position: center center;
          background-repeat: no-repeat;
        }
        @media (min-width: 768px) {
          .melo-login-root {
            background-image: url('/melo-bg.jpg');
            background-position: center center;
          }
        }
      `}</style>
    <div
      className="melo-login-root flex flex-col items-end justify-end px-5"
      style={{
        position: 'fixed', inset: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Gradiente preto no topo para suavizar se a imagem cortar */}
      <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ height: '22%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)' }} />

      {/* Gradiente escuro na base para o card */}
      <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: '60%', background: 'linear-gradient(to top, rgba(4,4,18,0.92) 40%, transparent 100%)' }} />

      {/* Double-bezel card — posicionado na parte inferior */}
      <div className="relative z-10 w-full max-w-sm pb-8"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <div
          className="rounded-[1.75rem] p-1.5"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          <div
            className="rounded-[calc(1.75rem-6px)] px-7 py-7"
            style={{
              background: 'rgba(12,12,18,0.88)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }}
          >
            <form onSubmit={handleLogin}>
              <p className="text-white text-[20px] font-bold tracking-tight mb-0.5">Bem-vindo de volta</p>
              <p className="text-[#7C7C88] text-[13px] mb-6">Digite seu PIN para acessar</p>

              <label className="block text-[11px] font-semibold text-[#6C6C78] uppercase tracking-[0.14em] mb-2">
                PIN de acesso
              </label>

              {/* Input */}
              <div
                className="rounded-[14px] p-0.5 mb-4"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}
              >
                <input
                  type="password" inputMode="numeric" pattern="[0-9]*"
                  value={pin} onChange={e => setPin(e.target.value)}
                  placeholder="••••" maxLength={8} autoFocus required
                  className="w-full py-3 text-center text-2xl tracking-[0.5em] text-white bg-transparent outline-none placeholder-[#2C2C3C] rounded-[13px]"
                  style={{ fontVariantNumeric: 'tabular-nums' }}
                />
              </div>

              {error && (
                <div className="mb-4 px-4 py-2.5 rounded-xl text-[#E5484D] text-[13px] text-center"
                  style={{ background: 'rgba(229,72,77,0.12)', border: '1px solid rgba(229,72,77,0.22)' }}>
                  {error}
                </div>
              )}

              {/* Button */}
              <div className="rounded-2xl p-0.5"
                style={{ background: 'linear-gradient(145deg,rgba(29,110,247,0.7),rgba(18,73,194,0.7))' }}>
                <button
                  type="submit" disabled={loading || !pin}
                  className="w-full py-3 rounded-[14px] font-semibold text-[15px] text-white disabled:opacity-40 active:scale-[0.98] transition-all"
                  style={{
                    background: loading || !pin ? 'rgba(29,110,247,0.5)' : 'linear-gradient(145deg,#1D6EF7,#1249C2)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                    transitionDuration: '180ms',
                    transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)',
                  }}
                >
                  {loading
                    ? <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Verificando...
                      </span>
                    : 'Entrar'
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

export default function MeloLogin() {
  return <LoginInner />;
}
