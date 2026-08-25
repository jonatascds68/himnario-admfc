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
        <View style={styles.header}>
          <View style={styles.titleAccent} />

          <View style={styles.headerText}>
            <Text
              style={[
                styles.title,
                { color: c.onSurface },
              ]}
            >
              Más
            </Text>

            <View style={styles.headerSubtitleRow}>
              <Feather
                name="settings"
                size={13}
                color={c.brandSecondary}
              />

              <Text
                style={[
                  styles.subtitle,
                  { color: c.muted },
                ]}
              >
                Preferencias y herramientas
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
        >
          <View style={styles.sectionHeader}>
            <Feather
              name="sliders"
              size={20}
              color={c.brandSecondary}
            />

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.section,
                  { color: c.onSurface },
                ]}
              >
                Preferencias
              </Text>

              <Text
                style={[
                  styles.sectionSub,
                  { color: c.muted },
                ]}
              >
                Personaliza tu experiencia de lectura
              </Text>
            </View>
          </View>

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
                {
                  backgroundColor: isDark
                    ? '#0B1B3D'
                    : c.surface,
                  borderColor: c.brandSecondary,
                },
              ]}
            >
              <Feather
                name="moon"
                size={17}
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
              value={mode === 'dark'}
              onValueChange={(v) =>
                setMode(v ? 'dark' : 'light')
              }
              disabled={mode === 'system'}
              style={{
                opacity: mode === 'system' ? 0.45 : 1,
              }}
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
                {
                  backgroundColor: isDark
                    ? '#0B1B3D'
                    : c.surface,
                  borderColor: c.brandSecondary,
                },
              ]}
            >
              <Text
                style={{
                  color: c.brandSecondary,
                  fontSize: 17,
                  fontWeight: '800',
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
                  {
                    backgroundColor: c.surface,
                    borderColor: c.brandSecondary,
                  },
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
                  {
                    backgroundColor: c.surface,
                    borderColor: c.brandSecondary,
                  },
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
                {
                  backgroundColor: isDark
                    ? '#0B1B3D'
                    : c.surface,
                  borderColor: c.brandSecondary,
                },
              ]}
            >
              <Feather
                name="align-left"
                size={17}
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
            <View style={styles.fontSectionHeader}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: isDark
                      ? '#0B1B3D'
                      : c.surface,
                    borderColor: c.brandSecondary,
                  },
                ]}
              >
                <Feather
                  name="type"
                  size={17}
                  color={c.brandSecondary}
                />
              </View>

              <View style={styles.fontSectionHeaderText}>
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
              </View>
            </View>

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
                          ? 1.5
                          : 1,
                        backgroundColor:
                          c.surface,
                        shadowColor: '#000000',
                        shadowOffset: {
                          width: 0,
                          height: 2,
                        },
                        shadowOpacity: selected
                          ? 0.10
                          : 0.05,
                        shadowRadius: selected
                          ? 5
                          : 3,
                        elevation: selected
                          ? 3
                          : 1,
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
                ? (isDark ? 'dark' : 'light')
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
              setMode(
                v
                  ? 'system'
                  : (isDark ? 'dark' : 'light')
              )
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

        {/* ACERCA DE */}
        <Pressable
          onPress={() => router.push('/about' as any)}
          style={[
            styles.actionCard,
            {
              backgroundColor:
                c.surfaceSecondary,
              borderColor: c.border,
            },
          ]}
          testID="more-link-about"
        >
          <View
            style={[
              styles.iconCircle,
              { borderColor: c.border },
            ]}
          >
            <Feather
              name="info"
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
              Acerca de
            </Text>

            <Text
              style={[
                styles.prefSubtitle,
                { color: c.muted },
              ]}
            >
              Información sobre el himnario y ADMFC
            </Text>
          </View>

          <Feather
            name="chevron-right"
            size={21}
            color={c.muted}
          />
        </Pressable>

        </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
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

  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },

  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },

  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 10,
  },

  section: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  sectionSub: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
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

  fontSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 11,
  },

  fontSectionHeaderText: {
    flex: 1,
  },

  fontSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },

  fontSectionSub: {
    fontSize: 11,
    marginTop: 3,
  },

  fontList: {
    gap: 8,
    paddingRight: 4,
  },

  fontCard: {
    width: 138,
    height: 122,
    borderRadius: RADIUS.lg,
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


});

