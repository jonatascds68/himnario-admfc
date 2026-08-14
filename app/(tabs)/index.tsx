import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { LOGO_LOCAL, SPACING, RADIUS } from '@/src/theme/tokens';

const SECONDARY = [
  { key: 'favorites', title: 'Favoritos', icon: 'star', href: '/favorites' },
  { key: 'recents', title: 'Recientes', icon: 'clock', href: '/recents' },
  { key: 'categories', title: 'Categorías', icon: 'grid', href: '/categories' },
  { key: 'culto', title: 'Lista del Culto', icon: 'list', href: '/(tabs)/culto' },
];

export default function Home() {
  const router = useRouter();
  const { c } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Image source={LOGO_LOCAL} style={styles.logo} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.brand, { color: c.brand }]}>HIMNARIO ADMFC</Text>
            <Text style={[styles.brandSub, { color: c.muted }]}>Asamblea de Dios · Misión de la Fe Cristiana</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/search')}
          style={[styles.searchBar, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
          testID="home-search-shortcut"
        >
          <Feather name="search" size={17} color={c.muted} />
          <Text style={[styles.searchText, { color: c.muted }]}>Buscar por número, título o letra…</Text>
        </Pressable>

        {/* Primary hymnals — equal, prominent */}
        <View style={styles.primaryRow}>
          {[
            { key: 'gt', title: 'Gloria y Triunfo', sub: '400 himnos', href: '/collection?type=gt' },
            { key: 'sion', title: 'Himnos de Sión', sub: '318 himnos', href: '/collection?type=sion' },
          ].map((t) => (
            <Pressable
              key={t.key}
              onPress={() => router.push(t.href as any)}
              style={[styles.primaryCard, { backgroundColor: c.brand }]}
              testID={`home-tile-${t.key}`}
            >
              <View style={[styles.primaryIcon, { borderColor: c.brandSecondary }]}>
                <Feather name="book-open" size={22} color={c.brandSecondary} />
              </View>
              <Text style={[styles.primaryTitle, { color: c.onSurfaceInverse }]} numberOfLines={2}>{t.title}</Text>
              <Text style={[styles.primarySub, { color: c.brandTertiary }]}>{t.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* Secondary quick access */}
        <View style={styles.grid}>
          {SECONDARY.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => router.push(t.href as any)}
              style={[styles.tile, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}
              testID={`home-tile-${t.key}`}
            >
              <View style={[styles.tileIcon, { borderColor: c.borderStrong }]}>
                <Feather name={t.icon as any} size={19} color={c.brand} />
              </View>
              <Text style={[styles.tileTitle, { color: c.onSurface }]} numberOfLines={1}>{t.title}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => router.push('/(tabs)/search')}
          style={[styles.cta, { borderColor: c.brandSecondary }]}
          testID="home-cta-all"
        >
          <Feather name="list" size={17} color={c.brand} />
          <Text style={[styles.ctaText, { color: c.brand }]}>Ver todos los himnos</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  logo: { width: 68, height: 68 },
  brand: { fontSize: 21, fontWeight: '800', letterSpacing: 1 },
  brandSub: { fontSize: 11.5, marginTop: 2 },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 12, borderRadius: RADIUS.lg, borderWidth: 1, marginBottom: SPACING.lg },
  searchText: { fontSize: 14.5 },
  primaryRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  primaryCard: { flex: 1, padding: SPACING.lg, borderRadius: RADIUS.lg, minHeight: 132 },
  primaryIcon: { width: 42, height: 42, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  primaryTitle: { fontSize: 17, fontWeight: '800' },
  primarySub: { fontSize: 13, marginTop: 4, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, marginBottom: SPACING.lg },
  tile: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, minHeight: 64 },
  tileIcon: { width: 38, height: 38, borderRadius: RADIUS.pill, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 14, borderRadius: RADIUS.lg, borderWidth: 1.5 },
  ctaText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
});
