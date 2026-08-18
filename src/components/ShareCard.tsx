import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
              <View style={styles.equivWrap}>
                <Text
                  style={[
                    styles.equivPrefix,
                    { color: colors.muted },
                  ]}
                >
                  🔗 También en:{' '}
                  <Text
                    style={{
                      color: colors.brand,
                      fontWeight: '700',
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
                      fontFamily:
                        'MerriweatherItalic',
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
      </View>
    );
  }
);

ShareCard.displayName = 'ShareCard';

const styles = StyleSheet.create({
  card: {
    width: 400,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
  },

  himnario: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },

  number: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 4,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 3,
    lineHeight: 25,
  },

  equivWrap: {
    alignSelf: 'center',
    marginTop: 7,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },

  equivPrefix: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },

  divider: {
    height: 2,
    width: 60,
    marginVertical: 16,
    opacity: 0.7,
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
});
