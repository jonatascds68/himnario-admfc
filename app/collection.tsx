import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, Hymn } from '@/src/lib/api';
import { HymnRow } from './(tabs)/search';

export default function Collection() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const isSion = type === 'sion';
  const himnario = isSion ? 'sion' : 'gt';
  const title = isSion ? 'Himnos de Sión' : 'Gloria y Triunfo';
  const total = isSion ? 318 : 400;

  const [all, setAll] = useState<Hymn[]>([]);
  const [items, setItems] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'123' | 'abc'>('123');
  const inputRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);

      return () => clearTimeout(timer);
    }, [])
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const r = await api.listHymns({ himnario: himnario as any }); setAll(r.items); setItems(r.items); }
      finally { setLoading(false); }
    })();
  }, [himnario]);

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setItems(all); return; }
    try { const r = await api.listHymns({ himnario: himnario as any, q: query.trim() }); setItems(r.items); }
    catch { setItems([]); }
  }, [all, himnario]);

  useEffect(() => { const t = setTimeout(() => runSearch(q), 200); return () => clearTimeout(t); }, [q, runSearch]);

  const switchMode = (m: '123' | 'abc') => {
    setMode(m);
    setQ('');
    setItems(all);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  // ADMFC — a lupa do teclado executa uma busca própria
  // e abre diretamente o primeiro hino encontrado.
  const submitSearch = async () => {
    const query = q.trim();
    if (!query) return;

    try {
      const r = await api.listHymns({
        himnario: himnario as any,
        q: query,
      });

      const result = r.items[0];
      if (!result) return;

      router.push(`/hymn/${result.id}`);
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="collection-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="chevron-left" size={28} color={c.brand} /></Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.brand }]}>{title}</Text>
          <Text style={[styles.sub, { color: c.muted }]}>{total} himnos</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.box, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Feather name={mode === '123' ? 'hash' : 'search'} size={17} color={c.muted} />
          <TextInput ref={inputRef} value={q} onChangeText={setQ}
            placeholder={mode === '123' ? 'Número del himno…' : 'Título o palabra de la letra…'}
            placeholderTextColor={c.muted} keyboardType={mode === '123' ? 'number-pad' : 'default'}
            autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={submitSearch}
            style={[styles.input, { color: c.onSurface }]} testID="collection-search-input" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={10} testID="collection-search-clear"><Feather name="x" size={18} color={c.muted} /></Pressable> : null}
        </View>
        <View style={[styles.toggle, { borderColor: c.border }]}>
          {(['123', 'abc'] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable key={m} onPress={() => switchMode(m)}
                style={[styles.toggleBtn, active && { backgroundColor: c.brand }]} testID={`collection-mode-${m}`}>
                <Text style={{ color: active ? c.onSurfaceInverse : c.onSurface, fontWeight: '800', fontSize: 12 }}>{m === '123' ? '123' : 'ABC'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {loading ? <ActivityIndicator style={{ marginTop: SPACING.xl }} color={c.brand} /> : (
        <FlatList data={items} keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />}
          renderItem={({ item }) => <HymnRow hymn={item} onPress={() => router.push(`/hymn/${item.id}`)} />}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={{ color: c.muted, textAlign: 'center', marginTop: SPACING.xxxl }}>No se encontraron himnos.</Text>} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  sub: { fontSize: 12, marginTop: 2 },
  searchRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.md },
  box: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 9, borderRadius: RADIUS.lg, borderWidth: 1 },
  input: { flex: 1, fontSize: 15, paddingVertical: 4 },
  toggle: { flexDirection: 'row', borderRadius: RADIUS.md, borderWidth: 1, overflow: 'hidden' },
  toggleBtn: { paddingHorizontal: 12, height: 42, alignItems: 'center', justifyContent: 'center' },
});
