import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
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
    key: 'recents',
    title: 'Recientes',
    subtitle: 'Últimos vistos',
    icon: 'clock-outline',
    href: '/recents',
  },
  {
    key: 'culto',
    title: 'Lista del Culto',
    subtitle: 'Organiza el culto',
    icon: 'format-list-bulleted',
    href: '/(tabs)/culto',
  },
  {
    key: 'categories',
    title: 'Categorías',
    subtitle: 'Explora temas',
    icon: 'view-grid-outline',
    href: '/categories',
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

  const [hymnalCounts, setHymnalCounts] = useState({
    total: 0,
    gt: 0,
    sion: 0,
    canticos: 0,
  });

  const homeScrollRef = useRef<ScrollView>(null);
  const scrollHintY = useRef(new Animated.Value(0)).current;
  const scrollYRef = useRef(0);
  const viewportHeightRef = useRef(0);
  const contentHeightRef = useRef(0);

  const [showScrollHint, setShowScrollHint] = useState(true);

  const loadHomeData = useCallback(async () => {
    try {
      const [categoryResult, stats] = await Promise.all([
        api.listCategories(),
        api.stats(),
      ]);

      setCategories(categoryResult.items);
      setHymnalCounts({
        total: stats.total,
        gt: stats.gt,
        sion: stats.sion,
        canticos: stats.canticos,
      });
    } catch {
      setCategories([]);
      setHymnalCounts({
        total: 0,
        gt: 0,
        sion: 0,
        canticos: 0,
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomeData();
    }, [loadHomeData])
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(650),
        Animated.timing(scrollHintY, {
          toValue: 6,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(scrollHintY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.delay(350),
      ]),
      { iterations: 3 }
    );

    animation.start();

    return () => animation.stop();
  }, [scrollHintY]);

  const updateScrollHint = () => {
    const remaining =
      contentHeightRef.current -
      viewportHeightRef.current -
      scrollYRef.current;

    setShowScrollHint(remaining > 80);
  };

  const scrollHomeDown = () => {
    const viewport = viewportHeightRef.current || 500;

    homeScrollRef.current?.scrollTo({
      y:
        scrollYRef.current +
        Math.max(280, viewport * 0.72),
      animated: true,
    });
  };

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
        ref={homeScrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onLayout={(event) => {
          viewportHeightRef.current =
            event.nativeEvent.layout.height;
          updateScrollHint();
        }}
        onContentSizeChange={(_, height) => {
          contentHeightRef.current = height;
          updateScrollHint();
        }}
        onScroll={(event) => {
          scrollYRef.current =
            event.nativeEvent.contentOffset.y;
          updateScrollHint();
        }}
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
      count: `${hymnalCounts.gt} himnos`,
      href: '/collection?type=gt',
    },
    {
      key: 'sion',
      title: 'Himnos de Sión',
      count: `${hymnalCounts.sion} himnos`,
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
          styles.collectionCodeBadge,
          { borderColor: c.brandSecondary },
        ]}
      >
        <Text
          style={[
            styles.collectionCodeText,
            { color: c.brandSecondary },
          ]}
        >
          {item.key === 'gt' ? 'GT' : 'SN'}
        </Text>
      </View>

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
              color: c.brandSecondary,
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
        {/* CÁNTICOS DE ALABANZA */}
        <Pressable
          onPress={() => router.push('/collection?type=cant' as any)}
          style={[
            styles.featureCard,
            {
              backgroundColor: isDark ? '#0B1B3D' : c.brand,
              borderColor: c.brand,
              marginBottom: SPACING.xl,
            },
          ]}
          testID="home-tile-cant"
        >
          <View
            style={[
              styles.collectionCodeBadge,
              { borderColor: c.brandSecondary, right: 64 },
            ]}
          >
            <Text
              style={[
                styles.collectionCodeText,
                { color: c.brandSecondary },
              ]}
            >
              CA
            </Text>
          </View>

          <View style={[styles.featureIcon, { borderColor: c.brandSecondary }]}>
            <MaterialCommunityIcons name="music-note" size={26} color={c.brandSecondary} />
          </View>
          <View style={{ flex: 1, minWidth: 0, paddingRight: 14 }}>
            <Text
              style={[styles.featureTitle, { color: '#FFFFFF' }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.88}
            >
              Cánticos de Alabanza
            </Text>
            <Text style={[styles.featureSub, { color: c.brandSecondary }]}>
              {hymnalCounts.canticos} cánticos
            </Text>
          </View>
          <View style={[styles.goldArrow, { backgroundColor: c.brandSecondary }]}>
            <Feather name="chevron-right" size={22} color="#0B1B3D" />
          </View>
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
                  size={24}
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
              Explora todos los himnos y cánticos
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
              {hymnalCounts.total} himnos y cánticos disponibles
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

      {showScrollHint ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.scrollHintWrap,
            {
              transform: [
                { translateY: scrollHintY },
              ],
            },
          ]}
        >
          <Pressable
            onPress={scrollHomeDown}
            hitSlop={12}
            style={[
              styles.scrollHintButton,
              {
                backgroundColor: c.surface,
                borderColor: c.border,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Ver más contenido"
            testID="home-scroll-hint"
          >
            <Feather
              name="chevron-down"
              size={23}
              color={c.brandSecondary}
            />
          </Pressable>
        </Animated.View>
      ) : null}
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

  scrollHintWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    alignItems: 'center',
    zIndex: 20,
    elevation: 20,
  },

  scrollHintButton: {
    width: 42,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 4,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },

  logo: {
    width: 58,
    height: 58,
  },

  brand: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  brandSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },

  searchBar: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 14,
    height: 56,
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 28,

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },

  searchText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingHorizontal: 18,
    marginBottom: 11,
    marginTop: 6,
  },

  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },

  sectionLine: {
    width: 4,
    height: 16,
    borderRadius: 4,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  sectionAction: {
    fontSize: 12.5,
    fontWeight: '700',
  },

  horizontalContent: {
    paddingHorizontal: 18,
    paddingBottom: 22,
    gap: 10,
  },

  hymnalsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginBottom: 26,
  },

  hymnalCard: {
    flex: 1,
    height: 176,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'relative',
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  hymnalIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hymnalTextArea: {
    paddingRight: 42,
  },

  hymnalTitle: {
    fontSize: 17.5,
    fontWeight: '800',
    lineHeight: 21,
    letterSpacing: -0.25,
  },

  collectionCodeBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    minWidth: 27,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },

  collectionCodeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
    lineHeight: 11,
    textAlign: 'center',
  },

  hymnalCount: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '700',
    opacity: 0.92,
  },

  goldArrow: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCard: {
    marginHorizontal: 18,
    marginBottom: 22,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featureTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  featureSub: {
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },

  quickCard: {
    width: 148,
    minHeight: 108,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.025,
    shadowRadius: 6,
    elevation: 1,
  },

  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  quickTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'left',
    letterSpacing: -0.15,
  },

  quickSub: {
    fontSize: 10.5,
    lineHeight: 14,
    textAlign: 'left',
    marginTop: 3,
  },

  categoryCard: {
    width: 112,
    minHeight: 126,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
  },

  categoryTitle: {
    fontSize: 11.5,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 30,
    letterSpacing: -0.1,
  },

  categoryCount: {
    fontSize: 10,
    lineHeight: 13,
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
