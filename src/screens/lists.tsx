import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, Hymn } from '@/src/lib/api';
import { favorites, recents } from '@/src/lib/collections';
import { HymnRow } from '../../app/(tabs)/search';

function ListScreen({
  title,
  sub,
  empty,
  testID,
  loader,
  action,
  onAction,
}: {
  title: string;
  sub: string;
  empty: string;
  testID: string;
  loader: () => Promise<Hymn[]>;
  action?: string;
  onAction?: () => Promise<void> | void;
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
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={[
            styles.backBtn,
            {
              backgroundColor: c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
        >
          <Feather
            name="chevron-left"
            size={21}
            color={c.onSurface}
          />
        </Pressable>

        <View style={styles.titleAccent} />

        <View style={styles.headerText}>
          <Text style={[styles.title, { color: c.onSurface }]}>
            {title}
          </Text>

          <View style={styles.subRow}>
            <Feather
              name={testID === 'favorites-screen' ? 'heart' : 'clock'}
              size={12}
              color={c.brandSecondary}
            />
            <Text style={[styles.sub, { color: c.muted }]}>
              {sub}
            </Text>
          </View>
        </View>

        {action && onAction ? (
          <Pressable
            onPress={async () => {
              await onAction();
              await refresh();
            }}
            hitSlop={8}
            style={[
              styles.headerAction,
              {
                backgroundColor: c.surfaceSecondary,
                borderColor: c.border,
              },
            ]}
          >
            <Feather
              name="trash-2"
              size={14}
              color={c.error}
            />
            <Text
              style={[
                styles.headerActionText,
                { color: c.muted },
              ]}
            >
              {action}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xl }} color={c.brand} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(h) => h.id}
          contentContainerStyle={{
            paddingHorizontal: SPACING.lg,
            paddingTop: SPACING.sm,
            paddingBottom: SPACING.xxxl,
            flexGrow: 1,
          }}
          ItemSeparatorComponent={() => (
            <View style={{ height: SPACING.sm }} />
          )}
          renderItem={({ item }) => (
            <HymnRow
              hymn={item}
              onPress={() => router.push(`/hymn/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View
                style={[
                  styles.emptyIcon,
                  {
                    backgroundColor: c.surfaceSecondary,
                    borderColor: c.brandSecondary,
                  },
                ]}
              >
                <Feather
                  name={testID === 'favorites-screen' ? 'heart' : 'clock'}
                  size={27}
                  color={c.brandSecondary}
                />
              </View>

              <Text style={[styles.emptyTitle, { color: c.onSurface }]}>
                {testID === 'favorites-screen'
                  ? 'Aún no tienes favoritos'
                  : 'Sin himnos recientes'}
              </Text>

              <Text style={[styles.emptySub, { color: c.muted }]}>
                {testID === 'favorites-screen'
                  ? 'Marca tus himnos preferidos con el corazón y aparecerán aquí.'
                  : 'Los himnos que abras recientemente aparecerán aquí.'}
              </Text>
            </View>
          }
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
    const items = await Promise.all(
      ids.map((id) => api.getHymn(id).catch(() => null))
    );
    return items.filter(Boolean) as Hymn[];
  }, []);

  const clearRecents = async () => {
    await recents.clear();
  };

  return (
    <ListScreen
      title="Recientes"
      sub="Últimos abiertos"
      empty="Sin himnos recientes"
      testID="recents-screen"
      loader={load}
      action="Limpiar"
      onAction={clearRecents}
    />
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  titleAccent: {
    width: 4,
    height: 36,
    marginLeft: 2,
    borderRadius: RADIUS.pill,
    backgroundColor: '#D4AF37',
  },

  headerText: {
    flex: 1,
    marginLeft: 2,
  },

  title: {
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },

  sub: {
    fontSize: 12,
    fontWeight: '500',
  },

  headerAction: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 10,
  },

  headerActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingBottom: 80,
  },

  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },

  emptyTitle: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptySub: {
    maxWidth: 300,
    marginTop: SPACING.sm,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
