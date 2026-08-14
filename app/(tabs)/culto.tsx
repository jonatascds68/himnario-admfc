import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { playlist } from '@/src/lib/collections';
import { api, Hymn } from '@/src/lib/api';
import { HymnRow } from './search';

export default function Culto() {
  const router = useRouter();
  const { c } = useTheme();
  const [hymns, setHymns] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const arr = await playlist.list();
    if (arr.length === 0) { setHymns([]); setLoading(false); return; }
    try {
      const results = await Promise.all(arr.map((id) => api.getHymn(id).catch(() => null)));
      setHymns(results.filter(Boolean) as Hymn[]);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const move = async (from: number, to: number) => { await playlist.move(from, to); refresh(); };
  const remove = async (id: string) => { await playlist.remove(id); refresh(); };
  const clear = async () => { await playlist.clear(); refresh(); };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="culto-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.brand }]}>Lista del Culto</Text>
          <Text style={[styles.sub, { color: c.muted }]}>{hymns.length} himnos</Text>
        </View>
        {hymns.length > 0 && (
          <Pressable onPress={clear} hitSlop={10} style={styles.clearBtn} testID="culto-clear">
            <Feather name="trash-2" size={18} color={c.error} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xl }} color={c.brand} />
      ) : (
        <FlatList
          data={hymns}
          keyExtractor={(h) => h.id}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: 120 }}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={[styles.idx, { color: c.muted }]}>{index + 1}.</Text>
              <View style={{ flex: 1 }}>
                <HymnRow hymn={item} onPress={() => router.push(`/hymn/${item.id}`)} />
              </View>
              <View style={{ flexDirection: 'column', gap: 4 }}>
                <Pressable onPress={() => move(index, index - 1)} disabled={index === 0} testID={`culto-up-${item.id}`}>
                  <Feather name="chevron-up" size={20} color={index === 0 ? c.divider : c.muted} />
                </Pressable>
                <Pressable onPress={() => move(index, index + 1)} disabled={index === hymns.length - 1} testID={`culto-down-${item.id}`}>
                  <Feather name="chevron-down" size={20} color={index === hymns.length - 1 ? c.divider : c.muted} />
                </Pressable>
              </View>
              <Pressable onPress={() => remove(item.id)} hitSlop={10} testID={`culto-remove-${item.id}`}>
                <Feather name="x-circle" size={20} color={c.error} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="list" size={40} color={c.muted} />
              <Text style={[styles.emptyT, { color: c.onSurface }]}>Lista vacía</Text>
              <Text style={{ color: c.muted, textAlign: 'center', marginTop: 4 }}>
                Agrega himnos desde su pantalla con el botón &quot;Agregar al culto&quot;.
              </Text>
            </View>
          }
        />
      )}

      {hymns.length > 0 && (
        <View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
          <Pressable
            onPress={() => router.push(`/culto-mode?id=${hymns[0].id}` as any)}
            style={[styles.startBtn, { backgroundColor: c.brand }]}
            testID="culto-start-mode"
          >
            <Feather name="play" size={18} color={c.onSurfaceInverse} />
            <Text style={{ color: c.onSurfaceInverse, fontWeight: '700', fontSize: 15 }}>Iniciar Modo Culto</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 1 },
  sub: { fontSize: 12, marginTop: 2 },
  clearBtn: { padding: SPACING.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: 4 },
  idx: { fontSize: 14, width: 24 },
  empty: { alignItems: 'center', padding: SPACING.xxxl, gap: SPACING.sm },
  emptyT: { fontSize: 18, fontWeight: '700', marginTop: SPACING.md },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg, borderTopWidth: 1 },
  startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, height: 52, borderRadius: RADIUS.lg },
});
