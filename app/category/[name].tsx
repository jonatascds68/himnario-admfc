import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING } from '@/src/theme/tokens';
import { api, Hymn } from '@/src/lib/api';
import { HymnRow } from '../(tabs)/search';

export default function CategoryHymns() {
  const router = useRouter();
  const { c } = useTheme();
  const { name } = useLocalSearchParams<{ name: string }>();

  const categoryName = Array.isArray(name) ? name[0] : name;

  const [items, setItems] = useState<Hymn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryName) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const r = await api.listHymns({ category: categoryName });
        setItems(r.items);
      } finally {
        setLoading(false);
      }
    })();
  }, [categoryName]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: c.surface }]}
      edges={['top']}
      testID="category-hymns-screen"
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-left" size={28} color={c.brand} />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.brand }]}>
            {categoryName || 'Categoría'}
          </Text>

          {!loading ? (
            <Text style={[styles.count, { color: c.muted }]}>
              {items.length} {items.length === 1 ? 'himno' : 'himnos'}
            </Text>
          ) : null}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          style={{ marginTop: SPACING.xl }}
          color={c.brand}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: c.divider,
              }}
            />
          )}
          renderItem={({ item }) => (
            <HymnRow
              hymn={item}
              onPress={() => {
                const view =
                  item.himnario === 'Gloria y Triunfo'
                    ? 'gt'
                    : item.himnario === 'Himnos de Sión'
                      ? 'sion'
                      : 'cant';

                router.push({
                  pathname: '/hymn/[id]',
                  params: {
                    id: item.id,
                    view,
                  },
                });
              }}
            />
          )}
          ListEmptyComponent={
            <Text
              style={{
                color: c.muted,
                textAlign: 'center',
                marginTop: SPACING.xxxl,
              }}
            >
              Sin himnos en esta categoría
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  count: {
    fontSize: 12,
    marginTop: 2,
  },

  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
});
