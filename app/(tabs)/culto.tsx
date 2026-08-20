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
  const { c, isDark } = useTheme();
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
        <View style={styles.headerMain}>
          <View style={styles.titleAccent} />

          <View style={styles.headerText}>
            <Text style={[styles.title, { color: c.onSurface }]}>
              Lista del Culto
            </Text>

            <View style={styles.counterRow}>
              <Feather
                name="music"
                size={13}
                color={c.brandSecondary}
              />
              <Text style={[styles.sub, { color: c.muted }]}>
                {hymns.length} {hymns.length === 1 ? 'himno' : 'himnos'} preparados
              </Text>
            </View>
          </View>
        </View>

        {hymns.length > 0 && (
          <Pressable
            onPress={clear}
            hitSlop={10}
            style={[
              styles.clearBtn,
              {
                backgroundColor: c.surfaceSecondary,
                borderColor: c.border,
              },
            ]}
            testID="culto-clear"
          >
            <Feather name="trash-2" size={17} color={c.error} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: SPACING.xl }} color={c.brand} />
      ) : (
        <FlatList
          data={hymns}
          keyExtractor={(h) => h.id}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          contentContainerStyle={{
            paddingHorizontal: SPACING.lg,
            paddingTop: SPACING.sm,
            paddingBottom: 130,
          }}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <View
                style={[
                  styles.orderBadge,
                  {
                    backgroundColor: c.surfaceSecondary,
                    borderColor: c.border,
                  },
                ]}
              >
                <Text style={[styles.idx, { color: c.brandSecondary }]}>
                  {index + 1}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <HymnRow
                  hymn={item}
                  onPress={() => router.push(`/hymn/${item.id}`)}
                />
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => move(index, index - 1)}
                  disabled={index === 0}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: c.surfaceSecondary,
                      borderColor: c.border,
                      opacity: index === 0 ? 0.35 : 1,
                    },
                  ]}
                  testID={`culto-up-${item.id}`}
                >
                  <Feather
                    name="chevron-up"
                    size={17}
                    color={c.onSurface}
                  />
                </Pressable>

                <Pressable
                  onPress={() => move(index, index + 1)}
                  disabled={index === hymns.length - 1}
                  style={[
                    styles.actionBtn,
                    {
                      backgroundColor: c.surfaceSecondary,
                      borderColor: c.border,
                      opacity: index === hymns.length - 1 ? 0.35 : 1,
                    },
                  ]}
                  testID={`culto-down-${item.id}`}
                >
                  <Feather
                    name="chevron-down"
                    size={17}
                    color={c.onSurface}
                  />
                </Pressable>

                <Pressable
                  onPress={() => remove(item.id)}
                  hitSlop={8}
                  style={[
                    styles.actionBtn,
                    styles.removeBtn,
                    {
                      backgroundColor: c.surfaceSecondary,
                      borderColor: c.border,
                    },
                  ]}
                  testID={`culto-remove-${item.id}`}
                >
                  <Feather name="x" size={16} color={c.error} />
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
                <View
                  style={[
                    styles.emptyIcon,
                    {
                      backgroundColor: isDark ? '#0B1B3D' : c.brand,
                      borderColor: c.brandSecondary,
                    },
                  ]}
                >
                  <Feather
                    name="music"
                    size={28}
                    color={c.brandSecondary}
                  />
                </View>

                <Text style={[styles.emptyT, { color: c.onSurface }]}>
                  Prepara tu lista del culto
                </Text>

                <Text style={[styles.emptySub, { color: c.muted }]}>
                  Agrega los himnos que usarás en el culto y ordénalos
                  en la secuencia que prefieras.
                </Text>
              </View>
          }
        />
      )}

      {hymns.length > 0 && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: c.surface,
              borderTopColor: c.divider,
            },
          ]}
        >
          <Pressable
            onPress={() =>
              router.push(`/culto-mode?id=${hymns[0].id}` as any)
            }
            style={[
              styles.startBtn,
              {
                backgroundColor: isDark ? '#0B1B3D' : c.brand,
                borderColor: c.brandSecondary,
              },
            ]}
            testID="culto-start-mode"
          >
            <View
              style={[
                styles.playIcon,
                { backgroundColor: c.brandSecondary },
              ]}
            >
              <Feather name="play" size={17} color="#0B1B3D" />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.startTitle,
                  {
                    color: isDark
                      ? '#FFFFFF'
                      : c.onSurfaceInverse,
                  },
                ]}
              >
                Iniciar Modo Culto
              </Text>

              <Text
                style={[
                  styles.startSub,
                  {
                    color: isDark
                      ? c.brandTertiary
                      : c.brandTertiary,
                  },
                ]}
              >
                Presenta los himnos en secuencia
              </Text>
            </View>

            <Feather
              name="chevron-right"
              size={21}
              color={c.brandSecondary}
            />
          </Pressable>
        </View>
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },

  headerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },

  titleAccent: {
    width: 4,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: '#D4AF37',
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },

  sub: {
    fontSize: 12,
    fontWeight: '500',
  },

  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },

  orderBadge: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  idx: {
    fontSize: 12,
    fontWeight: '800',
  },

  actions: {
    flexDirection: 'column',
    gap: 4,
  },

  actionBtn: {
    width: 30,
    height: 27,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeBtn: {
    marginTop: 2,
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingTop: 90,
  },

  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },

  emptyT: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },

  emptySub: {
    maxWidth: 300,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderTopWidth: 1,
  },

  startBtn: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },

  playIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  startTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  startSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
});
