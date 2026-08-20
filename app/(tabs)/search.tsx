import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator } from 'react-native';
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
  const { c, isDark } = useTheme();
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

  // ADMFC — a lupa executa sua própria busca.
  // Não depende do debounce nem do estado atual da lista.
  const submitSearch = async () => {
    const query = q.trim();
    if (!query) return;

    try {
      const r = mode === '123'
        ? await api.listHymns({ himnario: him, q: query })
        : await api.listHymns({ q: query });

      const result = r.items[0];
      if (!result) return;

      router.push(`/hymn/${result.id}`);
    } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="search-screen">
      <View style={styles.header}>
        <View style={styles.titleAccent} />
        <View>
          <Text style={[styles.title, { color: c.onSurface }]}>Buscar</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>
            Encuentra tu himno rápidamente
          </Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <View
          style={[
            styles.box,
            {
              backgroundColor: c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
        >
          <View
            style={[
              styles.searchIcon,
              { borderColor: c.brandSecondary },
            ]}
          >
            <Feather
              name={mode === '123' ? 'hash' : 'search'}
              size={17}
              color={c.brandSecondary}
            />
          </View>
          <TextInput ref={inputRef} value={q} onChangeText={setQ}
            placeholder={mode === '123' ? 'Número del himno…' : 'Título o palabra de la letra…'}
            placeholderTextColor={c.muted} keyboardType={mode === '123' ? 'number-pad' : 'default'}
            autoCorrect={false} autoCapitalize="none" returnKeyType="search" onSubmitEditing={submitSearch}
            style={[styles.input, { color: c.onSurface }]} testID="search-input" />
          {q ? <Pressable onPress={() => setQ('')} hitSlop={10} testID="search-clear"><Feather name="x" size={18} color={c.muted} /></Pressable> : null}
        </View>
        <View
          style={[
            styles.toggle,
            {
              backgroundColor: c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
        >
          {(['123', 'abc'] as const).map((m) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                style={[
                  styles.toggleBtn,
                  active && {
                    backgroundColor: isDark ? '#0B1B3D' : c.brand,
                    borderColor: c.brandSecondary,
                  },
                ]}
                testID={`search-mode-${m}`}
              >
                <Text
                  style={[
                    styles.toggleText,
                    {
                      color: active ? c.brandSecondary : c.muted,
                    },
                  ]}
                >
                  {m === '123' ? '123' : 'ABC'}
                </Text>
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
              <Pressable
              key={h}
              onPress={() => setHim(h)}
              style={[
                styles.himChip,
                {
                  backgroundColor: active
                    ? (isDark ? '#0B1B3D' : c.brand)
                    : c.surfaceSecondary,
                  borderColor: active
                    ? c.brandSecondary
                    : c.border,
                },
              ]}
              testID={`search-him-${h}`}
            >
              <Feather
                name="book-open"
                size={15}
                color={active ? c.brandSecondary : c.muted}
              />
              <Text
                style={[
                  styles.himChipText,
                  {
                    color: active
                      ? (isDark ? '#FFFFFF' : c.onSurfaceInverse)
                      : c.onSurface,
                  },
                ]}
              >
                {h === 'gt' ? 'Gloria y Triunfo' : 'Himnos de Sión'}
              </Text>
            </Pressable>
            );
          })}
        </View>
      )}

      {loading ? <ActivityIndicator style={{ marginTop: SPACING.xl }} color={c.brand} /> : (
        <FlatList data={items} keyExtractor={(h) => h.id}
          contentContainerStyle={{
            paddingHorizontal: SPACING.lg,
            paddingTop: SPACING.md,
            paddingBottom: SPACING.xxxl,
          }}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
          renderItem={({ item }) => <HymnRow hymn={item} onPress={() => router.push(`/hymn/${item.id}`)} />}
          ListEmptyComponent={<View style={styles.empty}><Feather name="inbox" size={32} color={c.muted} /><Text style={{ color: c.muted, marginTop: SPACING.md }}>No se encontraron himnos.</Text></View>}
          testID="search-results" keyboardShouldPersistTaps="handled" />
      )}
    </SafeAreaView>
  );
}

export function HymnRow({ hymn, onPress }: { hymn: Hymn; onPress: () => void }) {
  const { c, isDark } = useTheme();
  const short = hymn.himnario === 'Gloria y Triunfo' ? 'GT' : 'SN';
  const eq = hymn.numero_equivalente ? `${short === 'GT' ? 'SIÓN' : 'GT'} Nº ${hymn.numero_equivalente}` : null;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.row,
        {
          backgroundColor: c.surfaceSecondary,
          borderColor: c.border,
        },
      ]}
      testID={`hymn-row-${hymn.id}`}
    >
      <View
        style={[
          styles.numberBadge,
          {
            backgroundColor: isDark ? '#0B1B3D' : c.brand,
            borderColor: c.brandSecondary,
          },
        ]}
      >
        <Text style={[styles.rowNumber, { color: c.brandSecondary }]}>
          {hymn.numero}
        </Text>
      </View>

      <View style={styles.rowContent}>
        <Text
          style={[styles.rowTitle, { color: c.onSurface }]}
          numberOfLines={2}
        >
          {hymn.titulo}
        </Text>

        {eq ? (
          <View style={styles.eqRow}>
            <Feather name="repeat" size={11} color={c.brandSecondary} />
            <Text style={[styles.rowSub, { color: c.muted }]}>
              {eq}
            </Text>
          </View>
        ) : null}
      </View>

      <View
        style={[
          styles.rowArrow,
          { backgroundColor: c.brandSecondary },
        ]}
      >
        <Feather name="chevron-right" size={17} color="#0B1B3D" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },

  titleAccent: {
    width: 4,
    height: 36,
    borderRadius: RADIUS.pill,
    backgroundColor: '#D4AF37',
  },

  title: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '500',
  },

  searchRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },

  box: {
    flex: 1,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },

  searchIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },

  toggle: {
    flexDirection: 'column',
    width: 58,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },

  toggleBtn: {
    flex: 1,
    minHeight: 24,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  toggleText: {
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.4,
  },

  himRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },

  himChip: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    gap: 7,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
  },

  himChipText: {
    fontWeight: '700',
    fontSize: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 70,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
  },

  numberBadge: {
    minWidth: 48,
    height: 48,
    paddingHorizontal: 5,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rowNumber: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  rowContent: {
    flex: 1,
    justifyContent: 'center',
  },

  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },

  eqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },

  rowSub: {
    fontSize: 11,
    fontWeight: '500',
  },

  rowArrow: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  empty: {
    alignItems: 'center',
    padding: SPACING.xxxl,
    marginTop: SPACING.lg,
  },
});
