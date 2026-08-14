import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, ScrollView, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, Hymn } from '@/src/lib/api';

type Key = 'all' | 'gt' | 'sion';
const SEG: { key: Key; label: string }[] = [
  { key: 'all', label: 'Todos' }, { key: 'gt', label: 'Gloria y Triunfo' }, { key: 'sion', label: 'Himnos de Sión' },
];

export default function AdminHymns() {
  const router = useRouter();
  const { c } = useTheme();
  const [q, setQ] = useState('');
  const [col, setCol] = useState<Key>('all');
  const [items, setItems] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { await api.me(); } catch { router.replace('/admin-login' as any); return; }
    setLoading(true);
    try {
      const r = await api.listHymns({ himnario: col === 'all' ? undefined : col, q: q || undefined });
      setItems(r.items);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [q, col, router]);

  useEffect(() => { const t = setTimeout(load, 220); return () => clearTimeout(t); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="admin-hymns-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="chevron-left" size={28} color={c.brand} /></Pressable>
        <Text style={[styles.title, { color: c.brand }]}>Editor de Himnos</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={() => router.push('/admin/edit/new' as any)} hitSlop={10} testID="admin-new-hymn">
          <Feather name="plus-circle" size={24} color={c.brand} />
        </Pressable>
      </View>
      <View style={[styles.box, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
        <Feather name="search" size={18} color={c.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Nº, título o palabra…" placeholderTextColor={c.muted}
          style={[styles.input, { color: c.onSurface }]} autoCorrect={false} autoCapitalize="none"
          returnKeyType="search" onSubmitEditing={Keyboard.dismiss} testID="admin-hymns-search" />
        {q ? <Pressable onPress={() => setQ('')} hitSlop={10}><Feather name="x" size={18} color={c.muted} /></Pressable> : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segRow}>
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
        <FlatList data={items} keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />}
          renderItem={({ item }) => {
            const short = item.himnario === 'Gloria y Triunfo' ? 'GT' : 'SN';
            return (
              <Pressable onPress={() => router.push(`/admin/edit/${item.id}` as any)} style={styles.row} testID={`admin-hymn-${item.id}`}>
                <View style={[styles.badge, { borderColor: c.borderStrong }]}>
                  <Text style={{ color: c.muted, fontSize: 10, fontWeight: '700' }}>{short}</Text>
                  <Text style={{ color: c.brand, fontSize: 17, fontWeight: '800' }}>{item.numero}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.onSurface, fontSize: 15, fontWeight: '600' }} numberOfLines={1}>{item.titulo}</Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>
                    {item.numero_equivalente ? `Equiv: ${short === 'GT' ? 'Sión' : 'GT'} ${item.numero_equivalente}` : 'Sin equivalencia'}
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
  segRow: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  seg: { height: 36, paddingHorizontal: 14, borderRadius: RADIUS.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, minHeight: 60 },
  badge: { width: 54, height: 50, borderRadius: RADIUS.md, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
