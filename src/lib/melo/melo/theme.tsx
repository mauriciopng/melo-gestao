'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type TV = {
  bg: string;
  card: string;
  card2: string;
  border: string;
  t1: string;
  t2: string;
  muted: string;
  ib: string;
  ibr: string;
  it: string;
  modal: string;
  sidebar: string;
  header: string;
  shadow: string;
  divider: string;
  hover: string;
  accent: string;
  accentText: string;
  accentHover: string;
};

/* Raw CSS color values — usados em inline styles para garantir
   geração correta independente do scanner do Tailwind */
export type TC = {
  bg: string; card: string; t1: string; t2: string; muted: string;
  border: string; ib: string; ibr: string; it: string; accent: string;
};

const LIGHT_C: TC = {
  bg: '#F6F6F3', card: '#FEFEFE', t1: '#111110', t2: '#3A3A34',
  muted: '#7C7C74', border: '#E4E4DC', ib: '#F8F8F5', ibr: '#D8D8D0',
  it: '#111110', accent: '#1D6EF7',
};
const DARK_C: TC = {
  bg: '#0C0C0A', card: '#141412', t1: '#F0F0EC', t2: '#C8C8C0',
  muted: '#8C8C84', border: '#262620', ib: '#1C1C18', ibr: '#2E2E28',
  it: '#F0F0EC', accent: '#3B82F6',
};

const LIGHT: TV = {
  bg: 'bg-[#F6F6F3]',
  card: 'bg-[#FEFEFE]',
  card2: 'bg-[#F0F0EC]',
  border: 'border-[#E4E4DC]',
  t1: 'text-[#111110]',
  t2: 'text-[#3A3A34]',
  muted: 'text-[#7C7C74]',
  ib: 'bg-[#F8F8F5]',
  ibr: 'border-[#D8D8D0]',
  it: 'text-[#111110]',
  modal: 'bg-[#FEFEFE]',
  sidebar: 'bg-[#F9F9F6]',
  header: 'bg-[#F9F9F6]/90',
  shadow: 'shadow-[0_1px_2px_rgba(17,17,16,0.04),0_6px_20px_rgba(17,17,16,0.06)]',
  divider: 'bg-[#E8E8E0]',
  hover: 'hover:bg-[#F0F0EC]',
  accent: 'bg-[#1D6EF7]',
  accentText: 'text-[#1D6EF7]',
  accentHover: 'hover:bg-[#1860D8]',
};

const DARK: TV = {
  bg: 'bg-[#0C0C0A]',
  card: 'bg-[#141412]',
  card2: 'bg-[#1C1C18]',
  border: 'border-[#262620]',
  t1: 'text-[#F0F0EC]',
  t2: 'text-[#C8C8C0]',
  muted: 'text-[#8C8C84]',
  ib: 'bg-[#1C1C18]',
  ibr: 'border-[#2E2E28]',
  it: 'text-[#F0F0EC]',
  modal: 'bg-[#141412]',
  sidebar: 'bg-[#090908]',
  header: 'bg-[#090908]/90',
  shadow: 'shadow-[0_1px_2px_rgba(0,0,0,0.4),0_6px_20px_rgba(0,0,0,0.6)]',
  divider: 'bg-[#1C1C18]',
  hover: 'hover:bg-[#1C1C18]',
  accent: 'bg-[#2563EB]',
  accentText: 'text-[#60A5FA]',
  accentHover: 'hover:bg-[#1D4ED8]',
};

interface ThemeCtx {
  isDark: boolean;
  toggle: () => void;
  v: TV;
  c: TC;          // raw CSS colors — use estes em inline styles
}

const ThemeContext = createContext<ThemeCtx>({ isDark: false, toggle: () => {}, v: LIGHT, c: LIGHT_C });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem('melo_theme') === 'dark') setIsDark(true);
  }, []);

  const toggle = () => {
    setIsDark(d => {
      const next = !d;
      localStorage.setItem('melo_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  if (!mounted) {
    return <ThemeContext.Provider value={{ isDark: false, toggle, v: LIGHT, c: LIGHT_C }}>{children}</ThemeContext.Provider>;
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggle, v: isDark ? DARK : LIGHT, c: isDark ? DARK_C : LIGHT_C }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
