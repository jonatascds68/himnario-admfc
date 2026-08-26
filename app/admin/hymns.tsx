import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, Hymn } from '@/src/lib/api';

type Key = 'all' | 'gt' | 'sion' | 'cant';
const SEG: { key: Key; label: string }[] = [
  { key: 'all', label: 'Todos' }, { key: 'gt', label: 'Gloria y Triunfo' }, { key: 'sion', label: 'Himnos de Sión' }, { key: 'cant', label: 'Cánticos de Alabanza' },
];


// ADMFC_ADMIN_LOGICAL_COLLECTIONS
// No Administrativo, "Todos" representa as entradas lógicas
// de GT, Sión e Cánticos. Um único registro físico pode aparecer
// em mais de uma coleção sem duplicar sua letra na Base Mestre.
async function listAdminHymns(
  col: 'all' | 'gt' | 'sion' | 'cant',
  q: string,
) {
  const query = q || undefined;

  if (col !== 'all') {
    return api.listHymns({
      himnario: col,
      q: query,
    });
  }

  const [gt, sion, cant] = await Promise.all([
    api.listHymns({ himnario: 'gt', q: query }),
    api.listHymns({ himnario: 'sion', q: query }),
    api.listHymns({ himnario: 'cant', q: query }),
  ]);

  return {
    ...gt,
    items: [
      ...gt.items,
      ...sion.items,
      ...cant.items,
    ],
    total:
      gt.items.length +
      sion.items.length +
      cant.items.length,
  };
}

function adminViewForHymn(item: {
  himnario: string;
}): 'gt' | 'sion' | 'cant' {
  if (item.himnario === 'Gloria y Triunfo') return 'gt';
  if (item.himnario === 'Himnos de Sión') return 'sion';
  return 'cant';
}

export default function AdminHymns() {
  const router = useRouter();
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [col, setCol] = useState<Key>('all');
  const [items, setItems] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const clearSearchOnReturnRef = useRef(false);

  const load = useCallback(async () => {
    try { await api.me(); } catch { router.replace('/admin-login' as any); return; }
    setLoading(true);
    try {
      const r = await listAdminHymns(col, q);
      setItems(r.items);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [q, col, router]);

  useEffect(() => { const t = setTimeout(load, 220); return () => clearTimeout(t); }, [load]);

  useFocusEffect(useCallback(() => {
    if (clearSearchOnReturnRef.current) {
      clearSearchOnReturnRef.current = false;
      setQ('');
    }

    load();

    // ADMFC — ao voltar da edição, reabre o teclado da busca.
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 320);

    return () => clearTimeout(timer);
  }, [load]));

  // ADMFC — a lupa executa sua própria busca.
  // Não depende do debounce nem do estado atual da lista.
  const submitSearch = async () => {
    const query = q.trim();
    if (!query) return;

    try {
      const r = await api.listHymns({
        himnario: col === 'all' ? undefined : col,
        q: query,
      });

      const result = r.items[0];
      if (!result) return;

      clearSearchOnReturnRef.current = true;

      router.push({
        pathname: '/admin/edit/[id]',
        params: {
          id: result.id,
          view: adminViewForHymn(result),
        },
      } as any);
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="admin-hymns-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="chevron-left" size={28} color={c.brand} /></Pressable>
        <Text style={[styles.title, { color: c.brand }]}>Editor de Himnos y Cánticos</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push('/admin/edit/new' as any)} hitSlop={10} testID="admin-new-hymn">
          <Feather name="plus-circle" size={24} color={c.brand} />
        </Pressable>
      </View>
      <View style={[styles.box, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
        <Feather name="search" size={18} color={c.muted} />
        <TextInput ref={inputRef} value={q} onChangeText={setQ} placeholder="Nº, título o palabra…" placeholderTextColor={c.muted}
          style={[styles.input, { color: c.onSurface }]} autoCorrect={false} autoCapitalize="none"
          returnKeyType="search" onSubmitEditing={submitSearch} testID="admin-hymns-search" />
        {q ? <Pressable onPress={() => setQ('')} hitSlop={10}><Feather name="x" size={18} color={c.muted} /></Pressable> : null}
      </View>
      <ScrollView
          horizontal
          style={styles.segScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.segRow}
        >
        {SEG.map((s) => {
          const active = col === s.key;
          return (
            <Pressable key={s.key} onPress={() => setCol(s.key)}
              style={[styles.seg, { backgroundColor: active ? c.brand : c.surfaceSecondary, borderColor: active ? c.brand : c.border }]}>
              <Text style={{ color: active ? c.onSurfaceInverse : c.onSurface, fontSize: 13, fontWeight: '600' }}>{s.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {loading ? <ActivityIndicator style={{ marginTop: SPACING.xl }} color={c.brand} /> : (
        <FlatList
          data={items}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />}
          renderItem={({ item }) => {
            const short = item.himnario === 'Gloria y Triunfo' ? 'GT' : item.himnario === 'Himnos de Sión' ? 'SN' : 'CA';
            return (
              <Pressable
                onPress={() => {
                  clearSearchOnReturnRef.current = true;

                  router.push({
                    pathname: '/admin/edit/[id]',
                    params: {
                      id: item.id,
                      view: adminViewForHymn(item),
                    },
                  } as any);
                }}
                style={styles.row}
                testID={`admin-hymn-${item.id}`}
              >
                <View style={[styles.badge, { borderColor: c.borderStrong }]}>
                  <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700' }}>{short}</Text>
                  <Text style={{ color: c.brand, fontSize: 17, fontWeight: '800' }}>{item.numero}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.onSurface, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>{item.titulo}</Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>
                    {item.numero_equivalente ? `Equiv: ${short === 'GT' ? 'Sión' : 'GT'} ${item.numero_equivalente}` : short === 'CA' ? 'Cántico de Alabanza' : 'Sin equivalencia'}
                  </Text>
                </View>
                <Feather name="edit-2" size={18} color={c.muted} />
              </Pressable>
            );
          }} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  box: { marginHorizontal: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, borderRadius: RADIUS.lg, borderWidth: 1 },
  input: { flex: 1, fontSize: 16, paddingVertical: 4 },
  segScroll: { flexGrow: 0 },
  segRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  seg: { height: 36, paddingHorizontal: 14, borderRadius: RADIUS.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, minHeight: 60 },
  badge: { width: 54, height: 50, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
