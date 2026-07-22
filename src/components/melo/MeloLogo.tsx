'use client';

export function MeloIcon({ size = 40 }: { size?: number }) {
  return (
    <img
      src="/alfaglass-icon.png"
      alt="Alfa Glass"
      style={{ width: size, height: size, objectFit: 'contain', borderRadius: size * 0.22, display: 'block' }}
    />
  );
}

export function MeloWordmark({ dark: _dark = true }: { dark?: boolean }) {
  return (
    <img
      src="/alfaglass-logo.png"
      alt="Alfa Glass"
      style={{ height: 30, width: 'auto', objectFit: 'contain', display: 'block' }}
    />
  );
}

export function MeloLogoFull() {
  return (
    <img
      src="/alfaglass-logo.png"
      alt="Alfa Glass"
      style={{ width: 220, height: 'auto', objectFit: 'contain', display: 'block' }}
    />
  );
}
