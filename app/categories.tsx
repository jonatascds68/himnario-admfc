import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING } from '@/src/theme/tokens';
import { api } from '@/src/lib/api';

type CategoryItem = {
  id: string;
  name: string;
  count?: number;
};

const CATEGORY_ICONS: Record<
  string,
  keyof typeof MaterialCommunityIcons.glyphMap
> = {
  'Actividad Cristiana': 'human-handsup',
  'Alabanza a Dios': 'music-note',
  'Amor y Gracia de Dios': 'heart-circle',
  'Año Nuevo': 'calendar-star',
  'Apertura de Cultos': 'door-open',
  'Ayuda de Dios en las Pruebas': 'shield-cross',

  'Bautismo en el Espíritu Santo': 'fire',
  'Bautismo en las Aguas': 'water',

  'Bienvenidas': 'hand-wave',
  'Bodas': 'heart-multiple',

  'Cena del Señor': 'glass-wine',
  'Cielo - Gloriosa Esperanza': 'weather-partly-cloudy',

  'Consagración': 'hands-pray',
  'Coros': 'music-circle',
  'Despedida': 'hand-wave-outline',

  'Escuela Dominical': 'school',
  'Fe y Confianza': 'anchor',

  'Gozo y Paz de los Creyentes': 'weather-sunny',

  'Iglesia': 'church',
  'Invitación': 'account-heart',

  'Jesús Salvador y Amigo': 'heart-circle',

  'Navidad': 'star-four-points',
  'Oración - Culto': 'hands-pray',

  'Pascua': 'weather-sunset-up',

  'Sagradas Escrituras': 'book-open-page-variant',
  'Sanidad Divina': 'medical-bag',

  'Sangre, Redención, Salvación': 'cross',
  'Segunda Venida': 'cloud',

  'Sufrimiento y Muerte de Jesús': 'cross-outline',
};

function getCategoryIcon(
  name: string
): keyof typeof MaterialCommunityIcons.glyphMap {
  return CATEGORY_ICONS[name] || 'bookmark-outline';
}

export default function Categories() {
  const router = useRouter();
  const { c } = useTheme();

  const [cats, setCats] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.listCategories();

        const official = r.items.filter(
          (item) => (item.count ?? 0) > 0
        );

        const ordered = [...official].sort((a, b) =>
          a.name.localeCompare(
            b.name,
            'es',
            { sensitivity: 'base' }
          )
        );

        setCats(ordered);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: c.surface },
      ]}
      edges={['top']}
      testID="categories-screen"
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
        >
          <Feather
            name="chevron-left"
            size={30}
            color={c.brand}
          />
        </Pressable>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.title,
              { color: c.brand },
            ]}
          >
            Categorías
          </Text>

          {!loading ? (
            <Text
              style={[
                styles.subtitle,
                { color: c.muted },
              ]}
            >
              {cats.length} categorías
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
          data={cats}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View
              style={[
                styles.separator,
                { backgroundColor: c.divider },
              ]}
            />
          )}
          renderItem={({ item }) => {
            const icon = getCategoryIcon(item.name);

            return (
              <Pressable
                onPress={() =>
                  router.push(
                    `/category/${encodeURIComponent(
                      item.name
                    )}` as any
                  )
                }
                style={({ pressed }) => [
                  styles.row,
                  pressed && {
                    opacity: 0.65,
                  },
                ]}
                testID={`category-row-${item.name}`}
              >
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor:
                        c.surfaceSecondary,
                      borderColor: c.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.iconInner,
                      {
                        borderColor: c.brand,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={icon}
                      size={24}
                      color={c.brand}
                    />
                  </View>
                </View>

                <View style={styles.textArea}>
                  <Text
                    style={[
                      styles.categoryName,
                      { color: c.onSurface },
                    ]}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={[
                      styles.categoryCount,
                      { color: c.muted },
                    ]}
                  >
                    {item.count ?? 0}{' '}
                    {(item.count ?? 0) === 1
                      ? 'himno'
                      : 'himnos'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.arrow,
                    {
                      borderColor: c.border,
                    },
                  ]}
                >
                  <Feather
                    name="chevron-right"
                    size={19}
                    color={c.brand}
                  />
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text
              style={{
                color: c.muted,
                textAlign: 'center',
                marginTop: SPACING.xxxl,
              }}
            >
              No hay categorías disponibles
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
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  list: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 84,
    paddingVertical: 12,
  },

  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
  },

  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },

  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  textArea: {
    flex: 1,
    paddingRight: 10,
  },

  categoryName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },

  categoryCount: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 5,
  },

  arrow: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
