import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { HymnFont, hymnAlignStorage, HymnAlign } from '@/src/lib/storage';
import { SPACING, RADIUS } from '@/src/theme/tokens';

const LINKS: { key: string; label: string; icon: string; href: string }[] = [
  { key: 'gt', label: 'Gloria y Triunfo (índice)', icon: 'book', href: '/collection?type=gt' },
  { key: 'sion', label: 'Himnos de Sión (índice)', icon: 'book-open', href: '/collection?type=sion' },
  { key: 'cat', label: 'Categorías', icon: 'grid', href: '/categories' },
  { key: 'fav', label: 'Favoritos', icon: 'star', href: '/favorites' },
  { key: 'rec', label: 'Recientes', icon: 'clock', href: '/recents' },
  { key: 'about', label: 'Acerca de', icon: 'info', href: '/about' },
];

export default function More() {
  const router = useRouter();
  const { c, mode, setMode, isDark, fontScale, bumpFont, hymnFont, setHymnFont } = useTheme();

const [hymnAlign, setHymnAlign] = useState<HymnAlign>('center');
useEffect(() => {
  
  hymnAlignStorage.get().then(setHymnAlign);
}, []);
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="more-screen">
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: c.brand }]}>Más</Text>

        <View style={[styles.card, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Text style={[styles.section, { color: c.muted }]}>Preferencias</Text>
          <View style={styles.pref}>
            <Text style={[styles.prefLabel, { color: c.onSurface }]}>Tema oscuro</Text>
            <Switch value={isDark} onValueChange={(v) => setMode(v ? 'dark' : 'light')} testID="pref-dark-toggle" />
          </View>
          <View style={styles.pref}>
            <Text style={[styles.prefLabel, { color: c.onSurface }]}>Tamaño de letra</Text>
            <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
              <Pressable onPress={() => bumpFont(-0.1)} style={[styles.fontBtn, { borderColor: c.border }]} testID="pref-font-minus">
                <Text style={{ color: c.onSurface, fontWeight: '700' }}>A−</Text>
              </Pressable>
              <View style={styles.fontValue}>
                <Text style={{ color: c.muted, fontSize: 12 }}>{Math.round(fontScale * 100)}%</Text>
              </View>
              <Pressable onPress={() => bumpFont(0.1)} style={[styles.fontBtn, { borderColor: c.border }]} testID="pref-font-plus">
                <Text style={{ color: c.onSurface, fontWeight: '700' }}>A+</Text>
              </Pressable>
            </View>
          </View>
<View style={styles.pref}>
  <Text style={[styles.prefLabel, { color: c.onSurface }]}>Alineación del texto</Text>
  <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
    <Pressable
      onPress={async () => {
        setHymnAlign('center');
        await hymnAlignStorage.set('center');
      }}
      style={[styles.fontBtn, { borderColor: hymnAlign === 'center' ? c.brand : c.border }]}
    >
      <Feather name="align-center" size={18} color={hymnAlign === 'center' ? c.brand : c.onSurface} />
    </Pressable>
    <Pressable
      onPress={async () => {
        setHymnAlign('left');
        await hymnAlignStorage.set('left');
      }}
      style={[styles.fontBtn, { borderColor: hymnAlign === 'left' ? c.brand : c.border }]}
    >
      <Feather name="align-left" size={18} color={hymnAlign === 'left' ? c.brand : c.onSurface} />
    </Pressable>
  </View>
</View>
<View style={{ marginTop: SPACING.sm }}>
  <Text style={[styles.prefLabel, { color: c.onSurface, marginBottom: SPACING.sm }]}>Fuente de los himnos</Text>

  {(['Lora', 'Merriweather', 'SourceSerif4', 'PlayfairDisplay'] as HymnFont[]).map((font) => (
    <Pressable
      key={font}
      onPress={async () => {
        setHymnFont(font);
      }}
      style={{
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: RADIUS.md,
        marginBottom: 6,
        borderWidth: hymnFont === font ? 2 : 1,
        borderColor: hymnFont === font ? c.brand : c.border,
      }}
    >
      <Text
        style={{
          color: c.onSurface,
          fontFamily: font,
fontSize: 15,
        }}
      >
        {font === 'SourceSerif4'
          ? 'Source Serif 4'
          : font === 'PlayfairDisplay'
            ? 'Playfair Display'
            : font}
      </Text>
    </Pressable>
  ))}
</View>
<Pressable
  onPress={() => setMode('system')}
  style={[styles.systemBtn, { borderColor: mode === 'system' ? c.brand : c.border }]}
  testID="pref-system"
>
  <Feather name="smartphone" size={16} color={mode === 'system' ? c.brand : c.muted} />
  <Text style={{ color: mode === 'system' ? c.brand : c.onSurface, fontSize: 13, fontWeight: '600', flex: 1 }}>
    Usar tema del sistema
  </Text>
  {mode === 'system' ? <Feather name="check" size={16} color={c.brand} /> : null}
</Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: c.surfaceSecondary, borderColor: c.border, marginTop: SPACING.lg }]}>
          {LINKS.map((l, i) => (
            <Pressable
              key={l.key}
              onPress={() => router.push(l.href as any)}
              style={[styles.link, { borderBottomColor: c.divider, borderBottomWidth: i === LINKS.length - 1 ? 0 : StyleSheet.hairlineWidth }]}
              testID={`more-link-${l.key}`}
            >
              <Feather name={l.icon as any} size={20} color={c.brand} />
              <Text style={[styles.linkText, { color: c.onSurface }]}>{l.label}</Text>
              <Feather name="chevron-right" size={20} color={c.muted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: 1, marginBottom: SPACING.lg },
  card: { borderRadius: RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  section: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: SPACING.sm, letterSpacing: 1 },
  pref: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm, minHeight: 44 },
  prefLabel: { fontSize: 15 },
  fontBtn: { paddingHorizontal: 14, height: 36, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fontValue: { paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
systemBtn: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, minHeight: 44, paddingHorizontal: 12, marginTop: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1 },
  link: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, minHeight: 48 },
  linkText: { flex: 1, fontSize: 15, fontWeight: '600' },
});
