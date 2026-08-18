import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Feather,
  MaterialCommunityIcons,
} from '@expo/vector-icons';

import { useTheme } from '@/src/theme/ThemeContext';
import {
  LOGO_LOCAL,
  SPACING,
  RADIUS,
} from '@/src/theme/tokens';
import { api } from '@/src/lib/api';

type CategoryItem = {
  id: string;
  name: string;
  count?: number;
};

const QUICK_ACCESS = [
  {
    key: 'favorites',
    title: 'Favoritos',
    subtitle: 'Tus himnos',
    icon: 'heart-outline',
    href: '/favorites',
  },
  {
    key: 'categories',
    title: 'Categorías',
    subtitle: 'Explora temas',
    icon: 'view-grid-outline',
    href: '/categories',
  },
  {
    key: 'culto',
    title: 'Lista del Culto',
    subtitle: 'Organiza el culto',
    icon: 'format-list-bulleted',
    href: '/(tabs)/culto',
  },
  {
    key: 'recents',
    title: 'Recientes',
    subtitle: 'Últimos vistos',
    icon: 'clock-outline',
    href: '/recents',
  },
] as const;

const FEATURED = [
  {
    name: 'Alabanza a Dios',
    icon: 'music-note',
  },
  {
    name: 'Oración - Culto',
    icon: 'hands-pray',
  },
  {
    name: 'Bautismo en el Espíritu Santo',
    icon: 'fire',
  },
  {
    name: 'Fe y Confianza',
    icon: 'anchor',
  },
  {
    name: 'Cielo - Gloriosa Esperanza',
    icon: 'weather-partly-cloudy',
  },
  {
    name: 'Sagradas Escrituras',
    icon: 'book-open-page-variant',
  },
] as const;

export default function Home() {
  const router = useRouter();
const { c, isDark } = useTheme();

  const [categories, setCategories] =
    useState<CategoryItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await api.listCategories();
        setCategories(r.items);
      } catch {
        setCategories([]);
      }
    })();
  }, []);

  const categoryCount = (name: string) =>
    categories.find((item) => item.name === name)
      ?.count ?? 0;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: c.surface },
      ]}
      edges={['top']}
      testID="home-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* CABEÇALHO */}
        <View style={styles.header}>
          <Image
            source={LOGO_LOCAL}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.brand,
                { color: c.brand },
              ]}
            >
              HIMNARIO ADMFC
            </Text>

            <Text
              style={[
                styles.brandSub,
                { color: c.muted },
              ]}
              numberOfLines={1}
            >
              Asamblea de Dios · Misión de la Fe Cristiana
            </Text>
          </View>
        </View>

        {/* BUSCA */}
        <Pressable
          onPress={() =>
            router.push('/(tabs)/search')
          }
          style={[
            styles.searchBar,
            {
              backgroundColor:
                c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
          testID="home-search-shortcut"
        >
          <Feather
            name="search"
            size={20}
            color={c.muted}
          />

          <Text
            style={[
              styles.searchText,
              { color: c.muted },
            ]}
            numberOfLines={1}
          >
            Buscar por número, título o letra...
          </Text>

          <MaterialCommunityIcons
            name="tune-variant"
            size={20}
            color={c.brandSecondary}
          />
        </Pressable>

        {/* HIMNARIOS */}
<SectionTitle
  title="Himnarios"
  action="Ver todos"
  onAction={() => router.push('/(tabs)/search')}
  c={c}
/>

<View style={styles.hymnalsRow}>
  {[
    {
      key: 'gt',
      title: 'Gloria y Triunfo',
      count: '400 himnos',
      href: '/collection?type=gt',
    },
    {
      key: 'sion',
      title: 'Himnos de Sión',
      count: '318 himnos',
      href: '/collection?type=sion',
    },
  ].map((item) => (
    <Pressable
      key={item.key}
      onPress={() => router.push(item.href as any)}
      style={[
        styles.hymnalCard,
        {
          backgroundColor: isDark ? '#0B1B3D' : c.brand,
        },
      ]}
      testID={`home-tile-${item.key}`}
    >
      <View
        style={[
          styles.hymnalIcon,
          {
            borderColor: c.brandSecondary,
          },
        ]}
      >
        <MaterialCommunityIcons
          name="book-open-page-variant"
          size={26}
          color={c.brandSecondary}
        />
      </View>

      <View style={styles.hymnalTextArea}>
        <Text
          style={[
            styles.hymnalTitle,
            {
              color: isDark ? '#FFFFFF' : c.onSurfaceInverse,
            },
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text
          style={[
            styles.hymnalCount,
            {
              color: isDark ? '#F0D77A' : c.brandTertiary,
            },
          ]}
        >
          {item.count}
        </Text>
      </View>

      <View
        style={[
          styles.goldArrow,
          {
            backgroundColor: c.brandSecondary,
          },
        ]}
      >
        <Feather
          name="chevron-right"
          size={22}
          color="#0B1B3D"
        />
      </View>
    </Pressable>
  ))}
</View>

        {/* CONTINUAR / RECENTES */}
        <SectionTitle
          title="Continúa donde paraste"
          action="Ver recientes"
          onAction={() =>
            router.push('/recents' as any)
          }
          c={c}
        />

        <Pressable
          onPress={() =>
            router.push('/recents' as any)
          }
          style={[
            styles.featureCard,
            {
              backgroundColor:
                c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
        >
          <View
            style={[
              styles.featureIcon,
              {
                borderColor:
                  c.brandSecondary,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="history"
              size={25}
              color={c.brand}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.featureTitle,
                { color: c.onSurface },
              ]}
            >
              Tus himnos recientes
            </Text>

            <Text
              style={[
                styles.featureSub,
                { color: c.muted },
              ]}
            >
              Continúa rápidamente desde donde estabas
            </Text>
          </View>

          <Feather
            name="chevron-right"
            size={22}
            color={c.brand}
          />
        </Pressable>

        {/* ACESSO RÁPIDO */}
        <SectionTitle
          title="Acceso rápido"
          c={c}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.horizontalContent
          }
        >
          {QUICK_ACCESS.map((item) => (
            <Pressable
              key={item.key}
              onPress={() =>
                router.push(
                  item.href as any
                )
              }
              style={[
                styles.quickCard,
                {
                  backgroundColor:
                    c.surfaceSecondary,
                  borderColor: c.border,
                },
              ]}
            >
              <View
                style={[
                  styles.quickIcon,
                  {
                    borderColor:
                      c.brandSecondary,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={26}
                  color={c.brandSecondary}
                />
              </View>

              <Text
                style={[
                  styles.quickTitle,
                  { color: c.onSurface },
                ]}
              >
                {item.title}
              </Text>

              <Text
                style={[
                  styles.quickSub,
                  { color: c.muted },
                ]}
              >
                {item.subtitle}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* CATEGORIAS DESTACADAS */}
        <SectionTitle
          title="Categorías destacadas"
          action="Ver todas"
          onAction={() =>
            router.push('/categories' as any)
          }
          c={c}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={
            styles.horizontalContent
          }
        >
          {FEATURED.map((item) => (
            <Pressable
              key={item.name}
              onPress={() =>
                router.push(
                  `/category/${encodeURIComponent(
                    item.name
                  )}` as any
                )
              }
              style={styles.categoryCard}
            >
              <View
                style={[
                  styles.categoryIcon,
                  {
backgroundColor:
  isDark ? '#0B1B3D' : c.brand,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item.icon}
                  size={27}
                  color={
                    c.brandSecondary
                  }
                />
              </View>

              <Text
                style={[
                  styles.categoryTitle,
                  { color: c.onSurface },
                ]}
                numberOfLines={2}
              >
                {item.name}
              </Text>

              <Text
                style={[
                  styles.categoryCount,
                  { color: c.muted },
                ]}
              >
                {categoryCount(item.name)}{' '}
                {categoryCount(item.name) === 1
                  ? 'himno'
                  : 'himnos'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* TODOS OS HINOS */}
        <Pressable
          onPress={() =>
            router.push('/(tabs)/search')
          }
          style={[
            styles.allCard,
{ backgroundColor: isDark ? '#0B1B3D' : c.brand },
          ]}
          testID="home-cta-all"
        >
          <View
            style={[
              styles.allIcon,
              {
                backgroundColor:
                  c.brandSecondary,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="bookmark-outline"
              size={26}
              color="#0B1B3D"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.allTitle,
                {
                  color:
                    c.onSurfaceInverse,
                },
              ]}
            >
              Explora todos los himnos
            </Text>

            <Text
              style={[
                styles.allSub,
                {
                  color:
                    c.brandTertiary,
                },
              ]}
            >
              718 himnos disponibles
            </Text>
          </View>

          <View
            style={[
              styles.goldArrow,
              {
                backgroundColor:
                  c.brandSecondary,
              },
            ]}
          >
            <Feather
              name="chevron-right"
              size={22}
              color="#0B1B3D"
            />
          </View>
        </Pressable>

        {/* FRASE FINAL */}
        <View
          style={[
            styles.footerCard,
            {
              backgroundColor:
                c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
        >
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={23}
            color={c.brandSecondary}
          />

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.footerLabel,
                {
                  color:
                    c.brandSecondary,
                },
              ]}
            >
              HIMNARIO ADMFC
            </Text>

            <Text
              style={[
                styles.footerText,
                { color: c.onSurface },
              ]}
            >
              Una herramienta para adorar, crecer y servir al Señor.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionTitle({
  title,
  action,
  onAction,
  c,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  c: any;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleWrap}>
        <View
          style={[
            styles.sectionLine,
            {
              backgroundColor:
                c.brandSecondary,
            },
          ]}
        />

        <Text
          style={[
            styles.sectionTitle,
            { color: c.onSurface },
          ]}
        >
          {title}
        </Text>
      </View>

      {action ? (
        <Pressable onPress={onAction}>
          <Text
            style={[
              styles.sectionAction,
              {
                color:
                  c.brandSecondary,
              },
            ]}
          >
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scroll: {
    paddingBottom: SPACING.xxxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },

  logo: {
    width: 66,
    height: 66,
  },

  brand: {
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  brandSub: {
    fontSize: 11.5,
    marginTop: 3,
  },

  searchBar: {
    marginHorizontal: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 54,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.xl,
  },

  searchText: {
    flex: 1,
    fontSize: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },

  sectionLine: {
    width: 3,
    height: 18,
    borderRadius: 3,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
  },

  horizontalContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },

hymnalsRow: {
  flexDirection: 'row',
  gap: SPACING.md,
  paddingHorizontal: SPACING.lg,
  marginBottom: SPACING.xl,
},

hymnalCard: {
  flex: 1,
  height: 190,
  borderRadius: RADIUS.lg,
  padding: SPACING.lg,
  position: 'relative',
  justifyContent: 'space-between',
},

hymnalIcon: {
  width: 48,
  height: 48,
  borderRadius: 24,
  borderWidth: 1.5,
  alignItems: 'center',
  justifyContent: 'center',
},

hymnalTextArea: {
  paddingRight: 46,
},

hymnalTitle: {
  fontSize: 18,
  fontWeight: '800',
  lineHeight: 23,
},

hymnalCount: {
  fontSize: 13,
  marginTop: 6,
  fontWeight: '700',
},

goldArrow: {
  position: 'absolute',
  right: SPACING.md,
  bottom: SPACING.md,
  width: 40,
  height: 40,
  borderRadius: 20,
  alignItems: 'center',
  justifyContent: 'center',
},
  featureCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },

  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
  },

  featureSub: {
    fontSize: 11.5,
    marginTop: 3,
  },

  quickCard: {
    width: 132,
    minHeight: 145,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },

  quickTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  quickSub: {
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 4,
  },

  categoryCard: {
    width: 115,
    alignItems: 'center',
  },

  categoryIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },

  categoryTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 34,
  },

  categoryCount: {
    fontSize: 10.5,
    marginTop: 3,
    textAlign: 'center',
  },

  allCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    minHeight: 86,
  },

  allIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },

  allTitle: {
    fontSize: 16,
    fontWeight: '800',
  },

  allSub: {
    fontSize: 12,
    marginTop: 4,
  },

  footerCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'flex-start',
  },

  footerLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  footerText: {
    fontSize: 13,
    lineHeight: 19,
  },
});
