import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
} from 'react-native';
import { LOGO_LOCAL } from '@/src/theme/tokens';
import { Section } from '@/src/lib/api';
import { HymnFont, HymnAlign } from '@/src/lib/storage';

export interface SharePage {
  sections: Section[];
  pageIndex: number;
  pageTotal: number;
}

export function buildSharePages(sections: Section[]): SharePage[] {
  // Compartilhamento em imagem:
  // o hino inteiro deve ser renderizado em uma única imagem vertical.
  // A altura do ShareCard cresce automaticamente conforme o conteúdo.
  return [
    {
      sections,
      pageIndex: 1,
      pageTotal: 1,
    },
  ];
}

interface ThemeColors {
  surface: string;
  onSurface: string;
  muted: string;
  brand: string;
  borderStrong: string;
}

interface Props {
  himnario: string;
  numero: number;
  titulo: string;
  page: SharePage;
  equivalencia?: string | null;

  colors: ThemeColors;
  isDark: boolean;

  hymnFont: HymnFont;
  hymnAlign: HymnAlign;
  baseSize: number;
}

export const ShareCard = React.forwardRef<View, Props>(
  (
    {
      himnario,
      numero,
      titulo,
      page,
      equivalencia,
      colors,
      isDark,
      hymnFont,
      hymnAlign,
      baseSize,
    },
    ref
  ) => {
    return (
      <View
        ref={ref}
        collapsable={false}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
          },
        ]}
      >
        {page.pageIndex === 1 ? (
            <>
              <View style={styles.brandHeader}>
                <Image
                  source={LOGO_LOCAL}
                  style={styles.logo}
                  resizeMode="contain"
                />

                <View style={styles.brandText}>
                  <Text
                    style={[
                      styles.brandName,
                      { color: colors.onSurface },
                    ]}
                  >
                    HIMNARIO ADMFC
                  </Text>

                  <Text
                    style={[
                      styles.brandSubtitle,
                      { color: colors.muted },
                    ]}
                  >
                    ASAMBLEA DE DIOS · MISIÓN DE LA FE CRISTIANA
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.headerRule,
                  {
                    backgroundColor:
                      colors.borderStrong,
                  },
                ]}
              />

              <Text
                style={[
                  styles.himnario,
                  { color: colors.muted },
                ]}
              >
                {himnario.toUpperCase()}
              </Text>

              <Text
                style={[
                  styles.number,
                  { color: colors.brand },
                ]}
              >
                Nº {numero}
              </Text>

              <Text
                style={[
                  styles.title,
                  {
                    color: colors.onSurface,
                    textAlign: 'center',
                  },
                ]}
              >
                {titulo}
              </Text>

              {equivalencia ? (
                <View
                  style={[
                    styles.equivWrap,
                    {
                      borderColor:
                        colors.borderStrong,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.equivPrefix,
                      { color: colors.muted },
                    ]}
                  >
                    También en{' '}
                    <Text
                      style={{
                        color: colors.brand,
                        fontWeight: '800',
                      }}
                    >
                      {equivalencia}
                    </Text>
                  </Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.divider,
                  {
                    backgroundColor:
                      colors.borderStrong,
                  },
                ]}
              />
            </>
          ) : (
          <>
            <Text
              style={[
                styles.contHead,
                { color: colors.muted },
              ]}
            >
              {himnario.toUpperCase()} · Nº {numero}
            </Text>

            <Text
              style={[
                styles.contTitle,
                { color: colors.onSurface },
              ]}
            >
              {titulo}
            </Text>

            <View
              style={[
                styles.divider,
                {
                  backgroundColor:
                    colors.borderStrong,
                },
              ]}
            />
          </>
        )}

        {page.sections.map((s, i) => {
          const text = (s.text || '')
            .replace(/\|+/g, '')
            .trim();

          if (s.kind === 'chorus') {
            return (
              <View
                key={i}
                style={styles.chorusSection}
              >
                <Text
                  style={[
                    styles.chorusTitle,
                    {
                      color: colors.brand,
                      textAlign: hymnAlign,
                    },
                  ]}
                >
                  CORO
                </Text>

                <Text
                  style={[
                    styles.verse,
                    {
                      color: isDark
                        ? '#D6C59A'
                        : '#75612F',
                      fontSize: baseSize,
                      lineHeight: baseSize * 1.55,
                      fontFamily: hymnFont,
                      textAlign: hymnAlign,
                    },
                  ]}
                >
                  {text}
                </Text>
              </View>
            );
          }

          return (
            <View
              key={i}
              style={styles.verseSection}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                }}
              >
                <Text
                  style={[
                    styles.stanzaNumber,
                    {
                      color: colors.brand,
                    },
                  ]}
                >
                  {`${s.index ?? i + 1}.`}
                </Text>

                <Text
                  style={[
                    styles.verse,
                    {
                      flex: 1,
                      color: colors.onSurface,
                      fontSize: baseSize,
                      lineHeight: baseSize * 1.55,
                      fontFamily: hymnFont,
                      textAlign: hymnAlign,
                    },
                  ]}
                >
                  {text}
                </Text>
              </View>
            </View>
          );
        })}

        {page.pageTotal > 1 ? (
          <Text
            style={[
              styles.pageNumber,
              { color: colors.muted },
            ]}
          >
            {page.pageIndex}/{page.pageTotal}
          </Text>
        ) : null}

          <View
            style={[
              styles.footerRule,
              {
                backgroundColor:
                  colors.borderStrong,
              },
            ]}
          />

          <View style={styles.footer}>
            <Image
              source={LOGO_LOCAL}
              style={styles.footerLogo}
              resizeMode="contain"
            />

            <View style={styles.footerTextWrap}>
              <Text
                style={[
                  styles.footerTitle,
                  { color: colors.onSurface },
                ]}
              >
                HIMNARIO ADMFC
              </Text>

              <Text
                style={[
                  styles.footerSubtitle,
                  { color: colors.muted },
                ]}
              >
                Asamblea de Dios · Misión de la Fe Cristiana
              </Text>
            </View>
          </View>
      </View>
    );
  }
);

ShareCard.displayName = 'ShareCard';

const styles = StyleSheet.create({
  card: {
    width: 400,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 22,
  },

  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  logo: {
    width: 52,
    height: 52,
  },

  brandText: {
    flex: 1,
    marginLeft: 12,
  },

  brandName: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },

  brandSubtitle: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.65,
    lineHeight: 12,
    marginTop: 3,
  },

  headerRule: {
    height: 1,
    width: '100%',
    marginTop: 16,
    marginBottom: 22,
    opacity: 0.75,
  },

  himnario: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
  },

  number: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 5,
    textAlign: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 25,
  },

  equivWrap: {
    alignSelf: 'center',
    marginTop: 11,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderRadius: 999,
  },

  equivPrefix: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'center',
  },

  divider: {
    height: 2,
    width: 54,
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 24,
    opacity: 0.85,
  },

  contHead: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  contTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },

  verseSection: {
    marginBottom: 24,
  },

  chorusSection: {
    marginBottom: 32,
  },

  stanzaNumber: {
    width: 28,
    marginTop: 3,
    fontSize: 14,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 1.8,
  },

  chorusTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 1.8,
    marginBottom: 12,
  },

  verse: {},

  pageNumber: {
    fontSize: 10,
    textAlign: 'right',
    marginTop: 4,
  },

  footerRule: {
    height: 1,
    width: '100%',
    marginTop: 10,
    marginBottom: 16,
    opacity: 0.65,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  footerLogo: {
    width: 30,
    height: 30,
  },

  footerTextWrap: {
    flex: 1,
    marginLeft: 9,
  },

  footerTitle: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.1,
  },

  footerSubtitle: {
    fontSize: 7,
    lineHeight: 10,
    marginTop: 2,
  },
});
