'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function LoginInner() {
  const router = useRouter();
  const [pin,      setPin]      = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
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
    const res  = await fetch('/api/melo/auth', {
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
      <div style={{ position: 'fixed', inset: 0, background: '#0C0C0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {[0,1,2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: '#D97706', animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
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
          }
        }
      `}</style>

      <div className="melo-login-root"
        style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'flex-end', justifyContent: 'flex-end', padding: '0 20px',
          paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Top vignette */}
        <div style={{ position: 'absolute', inset: 0, top: 0, height: '30%', pointerEvents: 'none',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)' }} />

        {/* Bottom vignette */}
        <div style={{ position: 'absolute', inset: 0, top: 'auto', bottom: 0, height: '65%', pointerEvents: 'none',
          background: 'linear-gradient(to top, rgba(8,6,4,0.96) 40%, transparent 100%)' }} />

        {/* Card */}
        <div style={{
          position: 'relative', zIndex: 10, width: '100%', maxWidth: 360,
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        }}>
          {/* Outer bezel */}
          <div style={{
            borderRadius: 28, padding: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
          }}>
            {/* Inner card */}
            <div style={{
              borderRadius: 22, padding: '28px 28px 24px',
              background: 'rgba(10,10,8,0.90)',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}>
              <form onSubmit={handleLogin}>
                <p style={{ color: '#F0F0EC', fontSize: 20, fontWeight: 800,
                  letterSpacing: '-0.03em', marginBottom: 4 }}>
                  Bem-vindo de volta
                </p>
                <p style={{ color: '#5C5C54', fontSize: 13, marginBottom: 24 }}>
                  Digite seu PIN para acessar
                </p>

                <label style={{ display: 'block', fontSize: 10, fontWeight: 700,
                  color: '#5C5C54', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
                  PIN de acesso
                </label>

                <div style={{
                  borderRadius: 14, padding: 4, marginBottom: 16,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <input
                    type="password" inputMode="numeric" pattern="[0-9]*"
                    value={pin} onChange={e => setPin(e.target.value)}
                    placeholder="••••" maxLength={8} autoFocus required
                    style={{
                      width: '100%', padding: '12px 0',
                      textAlign: 'center', fontSize: 24, letterSpacing: '0.5em',
                      color: '#F0F0EC', background: 'transparent',
                      outline: 'none', border: 'none', borderRadius: 10,
                      fontVariantNumeric: 'tabular-nums', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {error && (
                  <div style={{
                    marginBottom: 16, padding: '10px 16px', borderRadius: 12,
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    color: '#FCA5A5', fontSize: 13, textAlign: 'center',
                  }}>
                    {error}
                  </div>
                )}

                {/* Amber button */}
                <div style={{
                  borderRadius: 16, padding: 2,
                  background: 'linear-gradient(145deg, rgba(29,110,247,0.6), rgba(146,64,14,0.5))',
                }}>
                  <button type="submit" disabled={loading || !pin} style={{
                    width: '100%', padding: '13px 0',
                    borderRadius: 14, fontWeight: 700, fontSize: 15,
                    color: '#fff', cursor: loading || !pin ? 'not-allowed' : 'pointer',
                    opacity: loading || !pin ? 0.45 : 1,
                    border: 'none',
                    background: loading || !pin
                      ? 'rgba(29,110,247,0.4)'
                      : 'linear-gradient(145deg, #1D6EF7, #1249C2)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
                    transition: 'all 180ms cubic-bezier(0.32,0.72,0,1)',
                    fontFamily: 'inherit',
                  }}>
                    {loading ? (
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Verificando...
                      </span>
                    ) : 'Entrar'}
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
