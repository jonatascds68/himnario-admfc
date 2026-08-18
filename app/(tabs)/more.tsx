import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '@/src/theme/ThemeContext';
import {
  HymnFont,
  hymnAlignStorage,
  HymnAlign,
} from '@/src/lib/storage';
import { SPACING, RADIUS } from '@/src/theme/tokens';

const LINKS: {
  key: string;
  label: string;
  icon: string;
  href: string;
}[] = [
  {
    key: 'gt',
    label: 'Gloria y Triunfo (índice)',
    icon: 'book',
    href: '/collection?type=gt',
  },
  {
    key: 'sion',
    label: 'Himnos de Sión (índice)',
    icon: 'book-open',
    href: '/collection?type=sion',
  },
  {
    key: 'cat',
    label: 'Categorías',
    icon: 'grid',
    href: '/categories',
  },
  {
    key: 'fav',
    label: 'Favoritos',
    icon: 'star',
    href: '/favorites',
  },
  {
    key: 'rec',
    label: 'Recientes',
    icon: 'clock',
    href: '/recents',
  },
  {
    key: 'about',
    label: 'Acerca de',
    icon: 'info',
    href: '/about',
  },
];

const FONT_OPTIONS: {
  value: HymnFont;
  label: string;
}[] = [
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Merriweather', label: 'Merriweather' },
  {
    value: 'AtkinsonHyperlegible',
    label: 'Atkinson\nHyperlegible',
  },
  {
    value: 'PlayfairDisplay',
    label: 'Playfair\nDisplay',
  },
];

export default function More() {
  const router = useRouter();

  const {
    c,
    mode,
    setMode,
    isDark,
    fontScale,
    bumpFont,
    hymnFont,
    setHymnFont,
  } = useTheme();

  const [hymnAlign, setHymnAlign] =
    useState<HymnAlign>('center');

  useEffect(() => {
    hymnAlignStorage.get().then(setHymnAlign);
  }, []);

  const setAlignment = async (align: HymnAlign) => {
    setHymnAlign(align);
    await hymnAlignStorage.set(align);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: c.surface },
      ]}
      edges={['top']}
      testID="more-screen"
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={[
            styles.title,
            { color: c.brand },
          ]}
        >
          Más
        </Text>

        <Text
          style={[
            styles.subtitle,
            { color: c.muted },
          ]}
        >
          Preferencias y herramientas
        </Text>

        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
        >
          <Text
            style={[
              styles.section,
              { color: c.brandSecondary },
            ]}
          >
            PREFERENCIAS
          </Text>

          {/* TEMA OSCURO */}

          <View
            style={[
              styles.prefRow,
              { borderBottomColor: c.divider },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { borderColor: c.border },
              ]}
            >
              <Feather
                name="moon"
                size={18}
                color={c.brand}
              />
            </View>

            <View style={styles.prefText}>
              <Text
                style={[
                  styles.prefTitle,
                  { color: c.onSurface },
                ]}
              >
                Tema oscuro
              </Text>

              <Text
                style={[
                  styles.prefSubtitle,
                  { color: c.muted },
                ]}
              >
                Modo de apariencia
              </Text>
            </View>

            <Switch
              value={isDark}
              onValueChange={(v) =>
                setMode(v ? 'dark' : 'light')
              }
              testID="pref-dark-toggle"
            />
          </View>

          {/* TAMANHO */}

          <View
            style={[
              styles.prefRow,
              { borderBottomColor: c.divider },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { borderColor: c.border },
              ]}
            >
              <Text
                style={{
                  color: c.onSurface,
                  fontSize: 19,
                  fontWeight: '700',
                }}
              >
                A
              </Text>
            </View>

            <View style={styles.prefText}>
              <Text
                style={[
                  styles.prefTitle,
                  { color: c.onSurface },
                ]}
              >
                Tamaño de letra
              </Text>

              <Text
                style={[
                  styles.prefSubtitle,
                  { color: c.muted },
                ]}
              >
                Ajusta el tamaño de lectura
              </Text>
            </View>

            <View style={styles.inlineControls}>
              <Pressable
                onPress={() => bumpFont(-0.1)}
                style={[
                  styles.smallBtn,
                  { borderColor: c.border },
                ]}
                testID="pref-font-minus"
              >
                <Text
                  style={[
                    styles.smallBtnText,
                    { color: c.onSurface },
                  ]}
                >
                  A−
                </Text>
              </Pressable>

              <Text
                style={[
                  styles.percent,
                  { color: c.muted },
                ]}
              >
                {Math.round(fontScale * 100)}%
              </Text>

              <Pressable
                onPress={() => bumpFont(0.1)}
                style={[
                  styles.smallBtn,
                  { borderColor: c.border },
                ]}
                testID="pref-font-plus"
              >
                <Text
                  style={[
                    styles.smallBtnText,
                    { color: c.onSurface },
                  ]}
                >
                  A+
                </Text>
              </Pressable>
            </View>
          </View>

          {/* ALINHAMENTO */}

          <View
            style={[
              styles.prefRow,
              { borderBottomColor: c.divider },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { borderColor: c.border },
              ]}
            >
              <Feather
                name="align-left"
                size={18}
                color={c.brand}
              />
            </View>

            <View style={styles.prefText}>
              <Text
                style={[
                  styles.prefTitle,
                  { color: c.onSurface },
                ]}
              >
                Alineación del texto
              </Text>

              <Text
                style={[
                  styles.prefSubtitle,
                  { color: c.muted },
                ]}
              >
                Elige cómo se muestra el texto
              </Text>
            </View>

            <View style={styles.inlineControls}>
              <Pressable
                onPress={() =>
                  setAlignment('center')
                }
                style={[
                  styles.alignBtn,
                  {
                    borderColor:
                      hymnAlign === 'center'
                        ? c.brand
                        : c.border,
                    backgroundColor:
                      hymnAlign === 'center'
                        ? c.brand
                        : 'transparent',
                  },
                ]}
              >
                <Feather
                  name="align-center"
                  size={19}
                  color={
                    hymnAlign === 'center'
                      ? '#FFFFFF'
                      : c.onSurface
                  }
                />
              </Pressable>

              <Pressable
                onPress={() =>
                  setAlignment('left')
                }
                style={[
                  styles.alignBtn,
                  {
                    borderColor:
                      hymnAlign === 'left'
                        ? c.brand
                        : c.border,
                    backgroundColor:
                      hymnAlign === 'left'
                        ? c.brand
                        : 'transparent',
                  },
                ]}
              >
                <Feather
                  name="align-left"
                  size={19}
                  color={
                    hymnAlign === 'left'
                      ? '#FFFFFF'
                      : c.onSurface
                  }
                />
              </Pressable>
            </View>
          </View>

          {/* FONTES */}

          <View style={styles.fontSection}>
            <Text
              style={[
                styles.fontSectionTitle,
                { color: c.onSurface },
              ]}
            >
              Fuente de los himnos
            </Text>

            <Text
              style={[
                styles.fontSectionSub,
                { color: c.muted },
              ]}
            >
              Elige la fuente que prefieras para leer los himnos
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.fontList}
            >
              {FONT_OPTIONS.map((item) => {
                const selected =
                  hymnFont === item.value;

                return (
                  <Pressable
                    key={item.value}
                    onPress={() =>
                      setHymnFont(item.value)
                    }
                    style={[
                      styles.fontCard,
                      {
                        borderColor: selected
                          ? c.brand
                          : c.border,
                        borderWidth: selected
                          ? 1.8
                          : 1,
                        backgroundColor:
                          selected
                            ? c.surface
                            : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.fontName,
                        {
                          color: selected
                            ? c.brand
                            : c.onSurface,
                          fontFamily:
                            item.value,
                        },
                      ]}
                    >
                      {item.label}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={[
                        styles.fontPreview,
                        {
                          color: c.onSurface,
                          fontFamily:
                            item.value,
                        },
                      ]}
                    >
                      Jehová es mi pastor...
                    </Text>

                    <View
                      style={[
                        styles.selectCircle,
                        {
                          borderColor: selected
                            ? c.brand
                            : c.muted,
                          backgroundColor:
                            selected
                              ? c.brand
                              : 'transparent',
                        },
                      ]}
                    >
                      {selected && (
                        <Feather
                          name="check"
                          size={14}
                          color="#FFFFFF"
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.infoRow}>
              <Feather
                name="info"
                size={15}
                color={c.muted}
              />

              <Text
                style={[
                  styles.infoText,
                  { color: c.muted },
                ]}
              >
                La fuente seleccionada se aplicará en todos los himnos.
              </Text>
            </View>
          </View>
        </View>

        {/* TEMA DO SISTEMA */}

        <Pressable
          onPress={() =>
            setMode(
              mode === 'system'
                ? 'light'
                : 'system'
            )
          }
          style={[
            styles.actionCard,
            {
              backgroundColor:
                c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
          testID="pref-system"
        >
          <View
            style={[
              styles.iconCircle,
              { borderColor: c.border },
            ]}
          >
            <Feather
              name="smartphone"
              size={18}
              color={c.brand}
            />
          </View>

          <View style={styles.prefText}>
            <Text
              style={[
                styles.prefTitle,
                { color: c.onSurface },
              ]}
            >
              Usar tema del sistema
            </Text>

            <Text
              style={[
                styles.prefSubtitle,
                { color: c.muted },
              ]}
            >
              Se adapta automáticamente al sistema
            </Text>
          </View>

          <Switch
            value={mode === 'system'}
            onValueChange={(v) =>
              setMode(v ? 'system' : 'light')
            }
          />
        </Pressable>

        {/* GUIA DE USO - preparação visual */}

        <Pressable
          onPress={() => router.push('/guide' as any)}
          style={[
            styles.actionCard,
            {
              backgroundColor:
                c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { borderColor: c.border },
            ]}
          >
            <Feather
              name="book-open"
              size={19}
              color={c.brandSecondary}
            />
          </View>

          <View style={styles.prefText}>
            <Text
              style={[
                styles.prefTitle,
                { color: c.onSurface },
              ]}
            >
              Guía de uso
            </Text>

            <Text
              style={[
                styles.prefSubtitle,
                { color: c.muted },
              ]}
            >
              Aprende a usar todas las funciones
            </Text>
          </View>

          <Feather
            name="chevron-right"
            size={21}
            color={c.muted}
          />
        </Pressable>

        {/* LINKS EXISTENTES */}

        <View
          style={[
            styles.linksCard,
            {
              backgroundColor:
                c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
        >
          {LINKS.map((l, i) => (
            <Pressable
              key={l.key}
              onPress={() =>
                router.push(l.href as any)
              }
              style={[
                styles.link,
                {
                  borderBottomColor:
                    c.divider,
                  borderBottomWidth:
                    i === LINKS.length - 1
                      ? 0
                      : StyleSheet.hairlineWidth,
                },
              ]}
              testID={`more-link-${l.key}`}
            >
              <Feather
                name={l.icon as any}
                size={19}
                color={c.brand}
              />

              <Text
                style={[
                  styles.linkText,
                  { color: c.onSurface },
                ]}
              >
                {l.label}
              </Text>

              <Feather
                name="chevron-right"
                size={19}
                color={c.muted}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scroll: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  subtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: SPACING.lg,
  },

  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },

  section: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 5,
  },

  prefRow: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth:
      StyleSheet.hairlineWidth,
    gap: 10,
  },

  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  prefText: {
    flex: 1,
  },

  prefTitle: {
    fontSize: 14,
    fontWeight: '700',
  },

  prefSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },

  inlineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  smallBtn: {
    minWidth: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  smallBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },

  percent: {
    fontSize: 12,
    minWidth: 38,
    textAlign: 'center',
  },

  alignBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  fontSection: {
    paddingTop: 14,
  },

  fontSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  fontSectionSub: {
    fontSize: 11,
    marginTop: 3,
    marginBottom: 11,
  },

  fontList: {
    gap: 8,
    paddingRight: 4,
  },

  fontCard: {
    width: 138,
    height: 122,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },

  fontName: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '600',
    textAlign: 'center',
    minHeight: 30,
  },

  fontPreview: {
    fontSize: 14,
    textAlign: 'center',
  },

  selectCircle: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1.5,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingTop: 11,
  },

  infoText: {
    flex: 1,
    fontSize: 10.5,
  },

  actionCard: {
    minHeight: 65,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 10,
  },

  linksCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.lg,
  },

  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 48,
  },

  linkText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});

