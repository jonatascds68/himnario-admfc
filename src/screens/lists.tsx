import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING } from '@/src/theme/tokens';
import { api, Hymn } from '@/src/lib/api';
import { favorites, recents } from '@/src/lib/collections';
import { HymnRow } from '../../app/(tabs)/search';

function ListScreen({ title, sub, empty, loader, testID }: {
  title: string; sub: string; empty: string; testID: string;
  loader: () => Promise<Hymn[]>;
}) {
  const router = useRouter();
  const { c } = useTheme();
  const [items, setItems] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setItems(await loader()); } finally { setLoading(false); }
  }, [loader]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID={testID}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-left" size={28} color={c.brand} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.brand }]}>{title}</Text>
          <Text style={[styles.sub, { color: c.muted }]}>{sub}</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xl }} color={c.brand} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />}
          renderItem={({ item }) => <HymnRow hymn={item} onPress={() => router.push(`/hymn/${item.id}`)} />}
          ListEmptyComponent={<Text style={{ color: c.muted, textAlign: 'center', marginTop: SPACING.xxxl }}>{empty}</Text>}
        />
      )}
    </SafeAreaView>
  );
}

export function FavoritesScreen() {
  const load = useCallback(async () => {
    const ids = await favorites.list();
    if (ids.length === 0) return [];
    const items = await Promise.all(ids.map((id) => api.getHymn(id).catch(() => null)));
    return items.filter(Boolean) as Hymn[];
  }, []);
  return <ListScreen title="Favoritos" sub="Mis himnos" empty="Aún no tienes favoritos" testID="favorites-screen" loader={load} />;
}

export function RecentsScreen() {
  const load = useCallback(async () => {
    const ids = await recents.list();
    if (ids.length === 0) return [];
    const items = await Promise.all(ids.map((id) => api.getHymn(id).catch(() => null)));
    return items.filter(Boolean) as Hymn[];
  }, []);
  return <ListScreen title="Recientes" sub="Últimos abiertos" empty="Sin himnos recientes" testID="recents-screen" loader={load} />;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  sub: { fontSize: 12, marginTop: 2 },
});
