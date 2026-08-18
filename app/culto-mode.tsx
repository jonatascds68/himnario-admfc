import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS, COLORS } from '@/src/theme/tokens';
import { api, Hymn, getSections } from '@/src/lib/api';
import { playlist } from '@/src/lib/collections';
import { hymnFontStorage, HymnFont, hymnAlignStorage, HymnAlign } from '@/src/lib/storage';
export default function CultoMode() {
  const { id: initialId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
const { c, fontScale, bumpFont } = useTheme();
const insets = useSafeAreaInsets();
  useEffect(() => {
    if (Platform.OS === 'web') return;
    activateKeepAwakeAsync().catch(() => {});
    return () => { try { deactivateKeepAwake(); } catch {} };
  }, []);
  const [queue, setQueue] = useState<string[]>([]);
  const [pos, setPos] = useState(0);
  const [hymn, setHymn] = useState<Hymn | null>(null);
  const [loading, setLoading] = useState(true);
const [hymnFont, setHymnFont] = useState<HymnFont>('Lora');
const [hymnAlign, setHymnAlign] = useState<HymnAlign>('center');
useEffect(() => {
  hymnFontStorage.get().then(setHymnFont);
hymnAlignStorage.get().then(setHymnAlign);
}, []);
  useEffect(() => { (async () => {
    const pl = await playlist.list();
    const cid = initialId || pl[0];
    const list = pl.length > 0 ? pl : (cid ? [cid] : []);
    const idx = cid ? Math.max(0, list.indexOf(cid)) : 0;
    setQueue(list); setPos(idx);
  })(); }, [initialId]);
  const load = useCallback(async (id: string) => {
    setLoading(true);
    try { setHymn(await api.getHymn(id)); } catch { setHymn(null); } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (queue[pos]) load(queue[pos]); }, [queue, pos, load]);
const bg = c.surface, fg = c.onSurface, gold = c.brand;
const baseSize = 20 * fontScale;
  const sections = hymn ? getSections(hymn) : [];
  return (
    <View style={[styles.container, { backgroundColor: bg }]} testID="culto-mode-screen">
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn} testID="culto-mode-exit"><Feather name="x" size={26} color={fg} /></Pressable>
<Text style={{ color: c.muted, fontSize: 13, marginLeft: 6 }}>{queue.length > 0 ? `${pos + 1} / ${queue.length}` : ''}</Text>
        <View style={{ flex: 1 }} />
<Pressable onPress={() => bumpFont(-0.1)} style={[styles.ctrl, { borderColor: c.border }]} testID="culto-font-minus"><Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>A−</Text></Pressable>
<Pressable onPress={() => bumpFont(0.1)} style={[styles.ctrl, { borderColor: c.border, marginLeft: 8 }]} testID="culto-font-plus"><Text style={{ color: fg, fontWeight: '700', fontSize: 16 }}>A+</Text></Pressable>
      </View>
      {loading ? <ActivityIndicator color={gold} style={{ marginTop: SPACING.xxxl }} /> : hymn ? (
        <ScrollView contentContainerStyle={styles.scroll}>
<Text style={{ color: c.muted, fontSize: 12, fontWeight: '800', letterSpacing: 2 }}>{hymn.himnario.toUpperCase()}</Text>
          <Text style={[styles.number, { color: gold }]}>Nº {hymn.numero}</Text>
          <Text style={[styles.title, { color: fg }]}>{hymn.titulo}</Text>
          <View style={[styles.divider, { backgroundColor: gold }]} />
          {sections.map((s, i) => (
            <View key={i} style={{ marginBottom: SPACING.xl }}>
{s.kind === 'chorus' ? (
  <>
    <Text style={{ color: gold, fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: SPACING.sm, textAlign: hymnAlign }}>CORO</Text>
    <View style={styles.chorusClean}>
<Text style={{ color: fg, fontSize: baseSize, lineHeight: baseSize * 1.5, fontFamily: hymnFont, textAlign: hymnAlign }}>{s.text.replace(/\|+/g, '')}</Text>
    </View>
  </>
) : (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
    <Text style={{ color: gold, width: 32, fontSize: 12, fontWeight: '800', marginTop: 5 }}>{`${s.index ?? i + 1}.`}</Text>
    <Text style={{ flex: 1, color: fg, fontSize: baseSize, lineHeight: baseSize * 1.5, fontFamily: hymnFont, textAlign: hymnAlign }}>{s.text.replace(/\|+/g, '')}</Text>
  </View>
)}
            </View>
          ))}
        </ScrollView>
      ) : null}
<View style={[styles.navBar, { borderTopColor: c.border, paddingBottom: 8 + insets.bottom }]}>
<Pressable onPress={() => setPos((p) => Math.max(0, p - 1))} disabled={pos === 0} style={[styles.navBtn, { borderColor: c.border, opacity: pos === 0 ? 0.4 : 1 }]} testID="culto-prev"><Feather name="chevron-left" size={26} color={fg} /><Text style={{ color: fg, fontWeight: '600' }}>Anterior</Text></Pressable>
<Pressable onPress={() => setPos((p) => Math.min(queue.length - 1, p + 1))} disabled={pos >= queue.length - 1} style={[styles.navBtn, { borderColor: c.border, opacity: pos >= queue.length - 1 ? 0.4 : 1 }]} testID="culto-next"><Text style={{ color: fg, fontWeight: '600' }}>Siguiente</Text><Feather name="chevron-right" size={26} color={fg} /></Pressable>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 44 : 24 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  iconBtn: { padding: SPACING.sm },
  scroll: { padding: SPACING.xl, paddingBottom: 120 },
  number: { fontSize: 38, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  title: { fontSize: 28, fontWeight: '700', marginTop: 4 },
  divider: { height: 2, width: 80, marginVertical: SPACING.xl, opacity: 0.8 },
chorusClean: { paddingVertical: 8, marginTop: 6, marginBottom: 10 },
  ctrl: { paddingHorizontal: 14, height: 40, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
navBar: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingTop: 6, gap: SPACING.sm, borderTopWidth: 1 },
  navBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 52, borderRadius: RADIUS.md, borderWidth: 1 },
});
