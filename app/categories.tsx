import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, Hymn } from '@/src/lib/api';
import { HymnRow } from './(tabs)/search';

export default function Categories() {
  const router = useRouter();
  const { c } = useTheme();
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [items, setItems] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await api.listCategories();
      setCats(r.items);
      if (r.items[0]) setSelected(r.items[0].name);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const r = await api.listHymns({ category: selected });
      setItems(r.items);
    })();
  }, [selected]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="categories-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-left" size={28} color={c.brand} />
        </Pressable>
        <Text style={[styles.title, { color: c.brand }]}>Categorías</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {cats.map((cat) => {
          const active = selected === cat.name;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setSelected(cat.name)}
              style={[styles.chip, {
                backgroundColor: active ? c.brand : c.surfaceSecondary,
                borderColor: active ? c.brand : c.border,
              }]}
              testID={`category-chip-${cat.name}`}
            >
              <Text style={{ color: active ? c.onSurfaceInverse : c.onSurface, fontSize: 13, fontWeight: '600' }}>
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xl }} color={c.brand} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl }}
          ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />}
          renderItem={({ item }) => <HymnRow hymn={item} onPress={() => router.push(`/hymn/${item.id}`)} />}
          ListEmptyComponent={<Text style={{ color: c.muted, textAlign: 'center', marginTop: SPACING.xxxl }}>Sin himnos en esta categoría</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  chips: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: RADIUS.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});
