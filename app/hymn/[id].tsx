import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Share, Animated, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS, GOLD } from '@/src/theme/tokens';
import { api, Hymn, getSections } from '@/src/lib/api';
import { favorites, recents, playlist } from '@/src/lib/collections';
import { hymnFontStorage, HymnFont } from '@/src/lib/storage';
import { ShareCard, buildSharePages } from '@/src/components/ShareCard';

// Limpia marcaciones internas (p.ej. "||...||") y normaliza saltos de línea.
function cleanBlockText(raw: string): string {
  return (raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\|+/g, '')          // quita "||" y "|" internos
    .replace(/^\s*CORO\s*:?\s*$/gim, '') // etiqueta CORO redundante dentro del texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === '')) // evita dobles vacíos
    .join('\n')
    .trim();
}

// Construye TEXTO PURO y limpio para compartir (WhatsApp, etc.). Nunca imagen.
function buildShareText(hymn: Hymn): string {
  const sections = getSections(hymn);
  const lines: string[] = [];
  lines.push('HIMNARIO ADMFC');
  lines.push('');
  lines.push(`${hymn.himnario} — Nº ${hymn.numero}`);
  lines.push(hymn.titulo);
  lines.push('');
  sections.forEach((s, i) => {
    const label = s.kind === 'chorus' ? 'CORO' : `${s.index ?? i + 1}ª `;
    const body = cleanBlockText(s.text);
    if (!body) return;
    lines.push(label);
    lines.push('');
    lines.push(body);
    lines.push('');
  });
  if (hymn.numero_equivalente && hymn.himnario_equivalente) {
    lines.push(`También en: ${hymn.himnario_equivalente} — Nº ${hymn.numero_equivalente}`);
    lines.push('');
  }
  lines.push('HIMNARIO ADMFC');
  lines.push('Asamblea de Dios · Misión de la Fe Cristiana');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}


export default function HymnDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c, fontScale, bumpFont } = useTheme();
  const [hymn, setHymn] = useState<Hymn | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [inList, setInList] = useState(false);
  const [equivId, setEquivId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
const [hymnFont, setHymnFont] = useState<HymnFont>('Lora');
  const pageRefs = useRef<(View | null)[]>([]);
  const starScale = React.useRef(new Animated.Value(1)).current;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const h = await api.getHymn(id);
      setHymn(h); recents.push(h.id);
      setIsFav(await favorites.has(h.id));
      setInList((await playlist.list()).includes(h.id));
      if (h.numero_equivalente && h.himnario_equivalente) {
        const k = h.himnario_equivalente.toLowerCase().includes('gloria') ? 'gt' : 'sion';
        try { const eq = await api.getByNumber(k as any, h.numero_equivalente); setEquivId(eq.id); }
        catch { setEquivId(null); }
      } else setEquivId(null);
    } catch { setHymn(null); } finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); }, [load]);
useFocusEffect(
  useCallback(() => {
    hymnFontStorage.get().then(setHymnFont);
  }, [])
);
  const nav = async (delta: number) => {
    if (!hymn) return;
    const k = hymn.himnario === 'Gloria y Triunfo' ? 'gt' : 'sion';
    try {
      const n = await api.getByNumber(k as any, hymn.numero + delta);
      router.replace(`/hymn/${n.id}`);
    } catch {}
  };
  const toggleFav = async () => {
    if (!hymn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = await favorites.toggle(hymn.id);
    setIsFav(next);
    starScale.setValue(0.7);
    Animated.spring(starScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  };
  const toggleList = async () => {
    if (!hymn) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inList) { await playlist.remove(hymn.id); setInList(false); } else { await playlist.add(hymn.id); setInList(true); }
  };
  const share = async () => {
    if (!hymn) return;
    try { await Share.share({ message: buildShareText(hymn) }); } catch {}
  };
  const shareImage = async () => {
    if (!hymn) return;
    setShareOpen(false); setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      // small delay to ensure off-screen cards are laid out
      await new Promise((r) => setTimeout(r, 350));
      for (let i = 0; i < pageRefs.current.length; i++) {
        const node = pageRefs.current[i];
        if (!node) continue;
        const uri = await captureRef(node, { format: 'png', quality: 1, result: 'tmpfile' });
        if (available) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${hymn.himnario} Nº ${hymn.numero}` });
      }
    } catch (e) {
      // fallback to text
      await share();
    } finally { setSharing(false); }
  };

  if (loading) return <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}><ActivityIndicator color={c.brand} style={{ marginTop: SPACING.xxxl }} /></SafeAreaView>;
  if (!hymn) return <SafeAreaView style={[styles.container, { backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: c.onSurface }}>Himno no encontrado</Text></SafeAreaView>;

  const sections = getSections(hymn);
  const baseSize = 17 * fontScale;
  const shortOther = hymn.himnario === 'Gloria y Triunfo' ? 'Himnos de Sión' : 'Gloria y Triunfo';
  const sharePages = buildSharePages(sections);
  const equivText = hymn.numero_equivalente ? `${shortOther} — Nº ${hymn.numero_equivalente}` : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="hymn-detail-screen">
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="hymn-back"><Feather name="chevron-left" size={28} color={c.brand} /></Pressable>
        <View style={{ flex: 1 }} />
        <Pressable onPress={toggleFav} hitSlop={10} style={styles.iconBtn} testID="hymn-toggle-fav">
          <Animated.View style={{ transform: [{ scale: starScale }] }}>
            <Ionicons name={isFav ? 'star' : 'star-outline'} size={24} color={isFav ? GOLD : c.muted} />
          </Animated.View>
        </Pressable>
        <Pressable onPress={() => setShareOpen(true)} hitSlop={10} style={styles.iconBtn} testID="hymn-share">
          {sharing ? <ActivityIndicator size="small" color={c.brand} /> : <Feather name="share-2" size={22} color={c.brand} />}
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.himnario, { color: c.muted }]}>{hymn.himnario.toUpperCase()}</Text>
        <Text style={[styles.number, { color: c.brand }]}>Nº {hymn.numero}</Text>
        <Text style={[styles.title, { color: c.onSurface }]}>{hymn.titulo}</Text>
        {equivId && hymn.numero_equivalente ? (
          <Pressable onPress={() => router.push(`/hymn/${equivId}`)} style={[styles.equivBox, { borderColor: c.borderStrong, backgroundColor: c.surfaceSecondary }]} testID="hymn-cross-ref">
            <Feather name="link" size={16} color={c.brand} />
            <Text style={{ color: c.onSurface, fontSize: 13 }}>
              También en: <Text style={{ fontWeight: '700', color: c.brand }}>{shortOther} — Nº {hymn.numero_equivalente}</Text>
            </Text>
            <Feather name="chevron-right" size={16} color={c.muted} />
          </Pressable>
        ) : null}
        <View style={[styles.divider, { backgroundColor: c.borderStrong }]} />
        {sections.length === 0 ? (
          <Text style={{ color: c.muted, textAlign: 'center', marginTop: SPACING.xl }}>Letra no disponible</Text>
        ) : (
          <View testID="hymn-lyrics">
            {sections.map((s, i) => (
              <View key={i} style={{ marginBottom: SPACING.lg }}>
                <Text style={[styles.stanzaTitle, { color: c.brand }]}>{s.kind === 'chorus' ? 'CORO' : `${s.index ?? i + 1}ª ESTROFA`}</Text>
                <View style={s.kind === 'chorus' ? [styles.chorusBox, { backgroundColor: c.surfaceSecondary, borderLeftColor: c.brandSecondary }] : undefined}>
                  <Text style={[styles.verse, { color: c.onSurface, fontSize: baseSize, lineHeight: baseSize * 1.55, fontFamily: hymnFont, fontStyle: s.kind === 'chorus' ? 'italic' : 'normal' }]}>{s.text.replace(/\|+/g, '')}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        {hymn.fuente ? <Text style={[styles.meta, { color: c.muted, marginTop: SPACING.lg }]}>Fuente: {hymn.fuente}</Text> : null}
        {hymn.observacion ? <Text style={[styles.meta, { color: c.muted, marginTop: 4 }]}>Nota: {hymn.observacion}</Text> : null}
      </ScrollView>
      <View style={[styles.controlBar, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
        <Pressable onPress={() => nav(-1)} style={[styles.ctrl, { borderColor: c.border }]} testID="hymn-prev"><Feather name="chevron-left" size={18} color={c.onSurface} /></Pressable>
        <Pressable onPress={() => bumpFont(-0.1)} style={[styles.ctrl, { borderColor: c.border }]} testID="hymn-font-minus"><Text style={{ color: c.onSurface, fontWeight: '700' }}>A−</Text></Pressable>
        <Pressable onPress={() => bumpFont(0.1)} style={[styles.ctrl, { borderColor: c.border }]} testID="hymn-font-plus"><Text style={{ color: c.onSurface, fontWeight: '700' }}>A+</Text></Pressable>
        <Pressable onPress={toggleList} style={[styles.ctrlWide, { borderColor: c.border, backgroundColor: inList ? c.surfaceSecondary : 'transparent' }]} testID="hymn-toggle-culto">
          <Feather name={inList ? 'check' : 'plus'} size={16} color={c.brand} />
          <Text style={{ color: c.onSurface, fontSize: 13, fontWeight: '600' }}>{inList ? 'En culto' : 'Culto'}</Text>
        </Pressable>
        <Pressable onPress={() => nav(1)} style={[styles.ctrl, { borderColor: c.border }]} testID="hymn-next"><Feather name="chevron-right" size={18} color={c.onSurface} /></Pressable>
        <Pressable onPress={() => router.push(`/culto-mode?id=${hymn.id}` as any)} style={[styles.ctrl, { backgroundColor: c.brand, borderColor: c.brand }]} testID="hymn-open-culto"><Feather name="maximize" size={16} color={c.onSurfaceInverse} /></Pressable>
      </View>

      {/* Share options modal */}
      <Modal visible={shareOpen} transparent animationType="fade" onRequestClose={() => setShareOpen(false)}>
        <Pressable style={styles.shareWrap} onPress={() => setShareOpen(false)}>
          <View style={[styles.shareCard, { backgroundColor: c.surface }]}>
            <Text style={{ color: c.onSurface, fontWeight: '700', fontSize: 16, textAlign: 'center', marginBottom: SPACING.md }}>Compartir himno</Text>
            <Pressable onPress={shareImage} style={[styles.shareOpt, { backgroundColor: c.brand }]} testID="share-image">
              <Feather name="image" size={18} color={c.onSurfaceInverse} />
              <Text style={{ color: c.onSurfaceInverse, fontWeight: '700' }}>Compartir como imagen</Text>
            </Pressable>
            <Pressable onPress={() => { setShareOpen(false); share(); }} style={[styles.shareOpt, { borderColor: c.border, borderWidth: 1 }]} testID="share-text">
              <Feather name="type" size={18} color={c.brand} />
              <Text style={{ color: c.onSurface, fontWeight: '600' }}>Compartir como texto</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Off-screen render for image capture */}
      <View style={styles.offscreen} pointerEvents="none">
        {sharePages.map((pg, i) => (
          <ShareCard key={i} ref={(r) => { pageRefs.current[i] = r; }}
            himnario={hymn.himnario} numero={hymn.numero} titulo={hymn.titulo}
            page={pg} equivalencia={pg.pageIndex === 1 ? equivText : null} />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
  shareWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  shareCard: { width: '100%', maxWidth: 360, borderRadius: RADIUS.lg, padding: SPACING.xl },
  shareOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, height: 52, borderRadius: RADIUS.md, marginBottom: SPACING.sm },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  iconBtn: { padding: SPACING.sm },
  scroll: { padding: SPACING.lg, paddingBottom: 140 },
  himnario: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  number: { fontSize: 34, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 4 },
  equivBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, marginTop: SPACING.md },
  meta: { fontSize: 12, fontStyle: 'italic' },
  divider: { height: 2, width: 60, marginVertical: SPACING.lg, opacity: 0.7 },
  stanzaTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: SPACING.sm },
  verse: {},
  chorusBox: { padding: SPACING.md, borderLeftWidth: 4, borderRadius: RADIUS.sm },
  controlBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', padding: SPACING.md, gap: 6, borderTopWidth: 1 },
  ctrl: { minWidth: 44, height: 44, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  ctrlWide: { flex: 1, flexDirection: 'row', height: 44, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
});
