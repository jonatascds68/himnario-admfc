import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, Hymn } from '@/src/lib/api';

let lastMode: '123' | 'abc' = '123';

export default function Search() {
  const router = useRouter();
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'123' | 'abc'>(lastMode);
  const [him, setHim] = useState<'gt' | 'sion'>('gt');
  const [items, setItems] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<TextInput>(null);

  // ADMFC — sempre que Buscar recebe foco, reativa o teclado.
  // Isso vale tanto na primeira abertura quanto ao voltar de um hino.
  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 320);

      return () => clearTimeout(timer);
    }, [])
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === '123') {
        const r = await api.listHymns({ himnario: him, q: q || undefined });
        setItems(r.items);
      } else {
        const r = await api.listHymns({ q: q || undefined });
        setItems(r.items);
      }
    } catch { setItems([]); } finally { setLoading(false); }
  }, [q, mode, him]);
  useEffect(() => { const t = setTimeout(load, 220); return () => clearTimeout(t); }, [load]);

  const switchMode = (m: '123' | 'abc') => { setMode(m); lastMode = m; setQ(''); setTimeout(() => inputRef.current?.focus(), 50); };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="search-screen">
      <View style={styles.header}><Text style={[styles.title, { color: c.brand }]}>Buscar</Text></View>

      <View style={styles.searchRow}>
        <View style={[styles.box, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Feather name={mode === '123' ? 'hash' : 'search'} size={18} color={c.muted} />
          <TextInput ref={inputRef} value={q} onChangeText={setQ}
            placeholder={mode === '123' ? 'Número del himno…' : 'Título o palabra de la letra…'}
            placeholderTextColor={c.muted} keyboardType={mode === '123' ? 'number-pad' : 'default'}
            autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={Keyboard.dismiss}
            style={[styles.input, { color: c.onSurface }]} testID="search-input" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={10} testID="search-clear"><Feather name="x" size={18} color={c.muted} /></Pressable> : null}
        </View>
        <View style={[styles.toggle, { borderColor: c.border }]}>
          {(['123', 'abc'] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable key={m} onPress={() => switchMode(m)} style={[styles.toggleBtn, active && { backgroundColor: c.brand }]} testID={`search-mode-${m}`}>
                <Text style={{ color: active ? c.onSurfaceInverse : c.onSurface, fontWeight: '800', fontSize: 12 }}>{m === '123' ? '123' : 'ABC'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {mode === '123' && (
        <View style={styles.himRow}>
          {(['gt', 'sion'] as const).map((h) => {
            const active = him === h;
            return (
              <Pressable key={h} onPress={() => setHim(h)}
                style={[styles.himChip, { backgroundColor: active ? c.brand : c.surfaceSecondary, borderColor: active ? c.brand : c.border }]}
                testID={`search-him-${h}`}>
                <Text style={{ color: active ? c.onSurfaceInverse : c.onSurface, fontWeight: '700', fontSize: 13 }}>{h === 'gt' ? 'Gloria y Triunfo' : 'Himnos de Sión'}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {loading ? <ActivityIndicator style={{ marginTop: SPACING.xl }} color={c.brand} /> : (
        <FlatList data={items} keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl }}
          ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: c.divider }]} />}
          renderItem={({ item }) => <HymnRow hymn={item} onPress={() => router.push(`/hymn/${item.id}`)} />}
          ListEmptyComponent={<View style={styles.empty}><Feather name="inbox" size={32} color={c.muted} /><Text style={{ color: c.muted, marginTop: SPACING.md }}>No se encontraron himnos.</Text></View>}
          testID="search-results" keyboardShouldPersistTaps="handled" />
      )}
    </SafeAreaView>
  );
}

export function HymnRow({ hymn, onPress }: { hymn: Hymn; onPress: () => void }) {
  const { c } = useTheme();
  const short = hymn.himnario === 'Gloria y Triunfo' ? 'GT' : 'SN';
  const eq = hymn.numero_equivalente ? `${short === 'GT' ? 'SIÓN' : 'GT'} Nº ${hymn.numero_equivalente}` : null;
  return (
    <Pressable onPress={onPress} style={styles.row} testID={`hymn-row-${hymn.id}`}>
<Text style={[styles.rowNumber, { color: c.brand }]}>{hymn.numero}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: c.onSurface }]} numberOfLines={2}>{hymn.titulo}</Text>
<View style={{ flexDirection: 'row', marginTop: eq ? 2 : 0, flexWrap: 'wrap' }}>
{eq ? <Text style={[styles.rowSub, { color: c.muted, fontSize: 11 }]}>{eq}</Text> : null}
        </View>
      </View>
      <Feather name="chevron-right" size={20} color={c.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  searchRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg },
  box: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: RADIUS.lg, borderWidth: 1 },
  input: { flex: 1, fontSize: 16, paddingVertical: 4 },
  toggle: { flexDirection: 'row', borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: 12, height: 44, alignItems: 'center', justifyContent: 'center' },
  himRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  himChip: { flex: 1, height: 40, borderRadius: RADIUS.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth },
row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 8, minHeight: 50 },
rowNumber: { width: 42, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  badge: { width: 60, height: 56, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  badgeTop: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  badgeNum: { fontSize: 18, fontWeight: '800' },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 12 },
  empty: { alignItems: 'center', padding: SPACING.xxxl, marginTop: SPACING.lg },
});
