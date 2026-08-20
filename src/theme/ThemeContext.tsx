import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { COLORS } from './tokens';
import * as NavigationBar from 'expo-navigation-bar';
import { kv, hymnFontStorage, HymnFont } from '../lib/storage';

type Mode = 'light' | 'dark' | 'system';

interface Ctx {
  mode: Mode;
  setMode: (m: Mode) => void;
  isDark: boolean;
  c: typeof COLORS.light;
  fontScale: number;
  setFontScale: (n: number) => void;
  bumpFont: (delta: number) => void;
  hymnFont: HymnFont;
  setHymnFont: (font: HymnFont) => void;
}

const ThemeCtx = createContext<Ctx | null>(null);
const KEY_MODE = 'admfc_theme_mode';
const KEY_FONT = 'admfc_font_scale';
const KEY_THEME_MIGRATION = 'admfc_theme_migration_v1';
const KEY_HYMN_FONT_MIGRATION = 'admfc_hymn_font_montserrat_v1';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
const [mode, setModeState] = useState<Mode>('light');
const [fontScale, setFontScaleState] = useState<number>(1.2);
  const [hymnFont, setHymnFontState] = useState<HymnFont>('Montserrat');

  useEffect(() => {
    (async () => {
const m = await kv.get(KEY_MODE);
const migrated = await kv.get(KEY_THEME_MIGRATION);

if (!migrated && m === 'system') {
  setModeState('light');
  await kv.set(KEY_MODE, 'light');
  await kv.set(KEY_THEME_MIGRATION, 'done');
} else {
  if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
  if (!migrated) await kv.set(KEY_THEME_MIGRATION, 'done');
}
      if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
      const f = await kv.get(KEY_FONT);
      if (f) setFontScaleState(Math.min(2.5, Math.max(0.85, parseFloat(f) || 1)));

      const fontMigrated = await kv.get(KEY_HYMN_FONT_MIGRATION);

      if (!fontMigrated) {
        // Migração única: todos os usuários atuais passam para Montserrat.
        setHymnFontState('Montserrat');
        await hymnFontStorage.set('Montserrat');
        await kv.set(KEY_HYMN_FONT_MIGRATION, 'done');
      } else {
        // Depois da migração, respeita a escolha feita pelo usuário.
        const savedHymnFont = await hymnFontStorage.get();
        setHymnFontState(savedHymnFont);
      }
    })();
  }, []);

  const setMode = useCallback((m: Mode) => { setModeState(m); kv.set(KEY_MODE, m); }, []);
  const setFontScale = useCallback((n: number) => {
    const clamped = Math.min(2.5, Math.max(0.85, n));
    setFontScaleState(clamped);
    kv.set(KEY_FONT, String(clamped));
  }, []);
  const bumpFont = useCallback((delta: number) => setFontScale(fontScale + delta), [fontScale, setFontScale]);

  const setHymnFont = useCallback((font: HymnFont) => {
    setHymnFontState(font);
    hymnFontStorage.set(font);
  }, []);

  const isDark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const c = isDark ? COLORS.dark : COLORS.light;

  /*
   * ADMFC — integra a barra de navegação nativa do Android
   * ao tema visual do aplicativo.
   *
   * Tema claro: ícones escuros e bem visíveis.
   * Tema escuro: ícones claros.
   */
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const syncAndroidNavigationBar = async () => {
      try {
        await NavigationBar.setButtonStyleAsync(
          isDark ? 'light' : 'dark'
        );

        await NavigationBar.setBackgroundColorAsync(
          c.surface
        );
      } catch {
        // Não interrompe o aplicativo caso o dispositivo
        // controle a barra de navegação de outra forma.
      }
    };

    syncAndroidNavigationBar();
  }, [isDark, c.surface]);

  const value = useMemo(() => ({
    mode,
    setMode,
    isDark,
    c,
    fontScale,
    setFontScale,
    bumpFont,
    hymnFont,
    setHymnFont,
  }),
    [
      mode,
      isDark,
      c,
      fontScale,
      setMode,
      setFontScale,
      bumpFont,
      hymnFont,
      setHymnFont,
    ]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme outside provider');
  return v;
}
