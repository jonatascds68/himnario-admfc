import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS } from './tokens';
import { kv } from '../lib/storage';

type Mode = 'light' | 'dark' | 'system';

interface Ctx {
  mode: Mode;
  setMode: (m: Mode) => void;
  isDark: boolean;
  c: typeof COLORS.light;
  fontScale: number;
  setFontScale: (n: number) => void;
  bumpFont: (delta: number) => void;
}

const ThemeCtx = createContext<Ctx | null>(null);
const KEY_MODE = 'admfc_theme_mode';
const KEY_FONT = 'admfc_font_scale';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>('system');
  const [fontScale, setFontScaleState] = useState<number>(1);

  useEffect(() => {
    (async () => {
      const m = await kv.get(KEY_MODE);
      if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
      const f = await kv.get(KEY_FONT);
      if (f) setFontScaleState(Math.min(2.5, Math.max(0.85, parseFloat(f) || 1)));
    })();
  }, []);

  const setMode = useCallback((m: Mode) => { setModeState(m); kv.set(KEY_MODE, m); }, []);
  const setFontScale = useCallback((n: number) => {
    const clamped = Math.min(2.5, Math.max(0.85, n));
    setFontScaleState(clamped);
    kv.set(KEY_FONT, String(clamped));
  }, []);
  const bumpFont = useCallback((delta: number) => setFontScale(fontScale + delta), [fontScale, setFontScale]);

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const c = isDark ? COLORS.dark : COLORS.light;

  const value = useMemo(() => ({ mode, setMode, isDark, c, fontScale, setFontScale, bumpFont }),
    [mode, isDark, c, fontScale, setMode, setFontScale, bumpFont]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme outside provider');
  return v;
}
