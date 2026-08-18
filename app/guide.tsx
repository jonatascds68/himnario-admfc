import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useTheme } from '@/src/theme/ThemeContext';
import { guideStorage } from '@/src/lib/storage';


/* =========================================================
   CONFIGURAÇÃO DO GUIA
   ========================================================= */

const TOTAL_STEPS = 6;


/* =========================================================
   COMPONENTES VISUAIS BÁSICOS
   ========================================================= */

function MiniTopBar({
  title,
  c,
}: {
  title: string;
  c: any;
}) {
  return (
    <View style={styles.miniTopBar}>
      <Feather
        name="arrow-left"
        size={13}
        color={c.onSurface}
      />

      <Text
        numberOfLines={1}
        style={[
          styles.miniTopTitle,
          { color: c.onSurface },
        ]}
      >
        {title}
      </Text>

      <View style={{ width: 13 }} />
    </View>
  );
}


function Finger({
  style,
}: {
  style?: any;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        styles.fingerHand,
        style,
      ]}
    >
      <View style={styles.fingerShadow} />

      <View style={styles.fingerBody}>
        <View style={styles.fingerNail} />
        <View style={styles.fingerJoint} />
      </View>

      <View style={styles.fingerPalm} />
    </View>
  );
}


/* =========================================================
   PASSO 1
   ESCOLHA DO HINÁRIO
   ========================================================= */

function HymnalDemo({
  c,
}: {
  c: any;
}) {
  const press = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(500),

        Animated.timing(press, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.delay(500),

        Animated.timing(press, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),

        Animated.delay(700),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [press]);

  const fingerY = press.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <View
      style={[
        styles.phone,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
      ]}
    >
      <Text
        style={[
          styles.demoHeading,
          { color: c.onSurface },
        ]}
      >
        Elige tu himnario
      </Text>

      <View style={styles.hymnalRow}>
        <View
          style={[
            styles.hymnalCard,
            {
              backgroundColor: c.brand,
            },
          ]}
        >
          <Feather
            name="book-open"
            size={30}
            color="#DDB62E"
          />

          <Text style={styles.hymnalDarkText}>
            GLORIA
          </Text>

          <Text style={styles.hymnalDarkText}>
            Y TRIUNFO
          </Text>
        </View>

        <View
          style={[
            styles.hymnalCard,
            {
              backgroundColor:
                c.surfaceSecondary,
              borderColor: c.border,
              borderWidth: 1,
            },
          ]}
        >
          <Feather
            name="book"
            size={30}
            color="#DDB62E"
          />

          <Text
            style={[
              styles.hymnalLightText,
              { color: c.onSurface },
            ]}
          >
            HIMNOS
          </Text>

          <Text
            style={[
              styles.hymnalLightText,
              { color: c.onSurface },
            ]}
          >
            DE SIÓN
          </Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.demoFingerPosition,
          {
            transform: [
              { translateY: fingerY },
            ],
          },
        ]}
      >
        <Finger />
      </Animated.View>
    </View>
  );
}


/* =========================================================
   PASSO 2
   BUSCA ÚNICA:
   NÚMERO + TÍTULO + TEXTO
   ========================================================= */

function SearchDemo({
  c,
}: {
  c: any;
}) {
  const cursor = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursor, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.delay(700),

        Animated.timing(cursor, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),

        Animated.delay(500),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [cursor]);

  const translateX =
    cursor.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 108],
    });

  return (
    <View
      style={[
        styles.phone,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
      ]}
    >
      <MiniTopBar
        title="Buscar"
        c={c}
      />

      <View
        style={[
          styles.searchBox,
          {
            borderColor: c.border,
            backgroundColor:
              c.surfaceSecondary,
          },
        ]}
      >
        <Feather
          name="search"
          size={16}
          color={c.muted}
        />

        <Text
          style={[
            styles.searchText,
            { color: c.onSurface },
          ]}
        >
          123
        </Text>
      </View>

      <View style={styles.keyboard}>
        {[
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          '8',
          '9',
        ].map((n) => (
          <View
            key={n}
            style={[
              styles.key,
              {
                borderColor: c.border,
              },
            ]}
          >
            <Text
              style={{
                color: c.onSurface,
                fontWeight: '700',
              }}
            >
              {n}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[
          styles.resultCard,
          {
            borderColor: c.border,
          },
        ]}
      >
        <Text
          style={[
            styles.resultNumber,
            { color: c.brand },
          ]}
        >
          123
        </Text>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.resultTitle,
              { color: c.onSurface },
            ]}
          >
            Jehová es mi pastor
          </Text>

          <Text
            style={[
              styles.resultSubtitle,
              { color: c.muted },
            ]}
          >
            Gloria y Triunfo
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.searchHint,
          {
            backgroundColor:
              c.surfaceSecondary,
          },
        ]}
      >
        <Text
          style={[
            styles.searchHintText,
            { color: c.muted },
          ]}
        >
          También puedes escribir un título
          o palabras de la letra
        </Text>
      </View>

      <Animated.View
        style={[
          styles.searchFinger,
          {
            transform: [
              { translateX },
            ],
          },
        ]}
      >
        <Finger />
      </Animated.View>
    </View>
  );
}


/* =========================================================
   PASSO 3
   CATEGORIAS
   ========================================================= */

function CategoriesDemo({
  c,
}: {
  c: any;
}) {
  const pulse = useRef(
    new Animated.Value(1),
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 600,
          useNativeDriver: true,
        }),

        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [pulse]);

  const items = [
    ['music', 'Alabanza y adoración', '25'],
    ['heart', 'Vida cristiana', '42'],
    ['shield', 'Fe y confianza', '31'],
    ['sun', 'Gratitud', '18'],
    ['globe', 'Misiones', '20'],
  ];

  return (
    <View
      style={[
        styles.phone,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
      ]}
    >
      <MiniTopBar
        title="Categorías"
        c={c}
      />

      <Text
        style={[
          styles.categoryIntro,
          { color: c.muted },
        ]}
      >
        Encuentra himnos agrupados
        por tema
      </Text>

      {items.map(
        ([icon, label, count], index) => (
          <Animated.View
            key={label}
            style={[
              styles.categoryRow,
              {
                borderBottomColor:
                  c.divider,
                transform:
                  index === 0
                    ? [{ scale: pulse }]
                    : [],
              },
            ]}
          >
            <Feather
              name={icon as any}
              size={16}
              color={
                index === 0
                  ? '#DDB62E'
                  : c.brand
              }
            />

            <Text
              style={[
                styles.categoryText,
                { color: c.onSurface },
              ]}
            >
              {label}
            </Text>

            <Text
              style={[
                styles.categoryCount,
                { color: c.muted },
              ]}
            >
              {count}
            </Text>
          </Animated.View>
        ),
      )}
    </View>
  );
}


/* =========================================================
   PASSO 4
   FAVORITOS
   ========================================================= */

function FavoritesDemo({
  c,
}: {
  c: any;
}) {
  const favorite = useRef(
    new Animated.Value(1),
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(500),

        Animated.timing(favorite, {
          toValue: 1.35,
          duration: 250,
          useNativeDriver: true,
        }),

        Animated.timing(favorite, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),

        Animated.delay(1000),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [favorite]);

  return (
    <View
      style={[
        styles.phone,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
      ]}
    >
      <View style={styles.hymnHeader}>
        <Feather
          name="arrow-left"
          size={16}
          color={c.onSurface}
        />

        <Text
          style={[
            styles.hymnNumber,
            { color: c.onSurface },
          ]}
        >
          123
        </Text>

        <Animated.View
          style={{
            transform: [
              { scale: favorite },
            ],
          }}
        >
          <Feather
            name="star"
            size={25}
            color="#DDB62E"
          />
        </Animated.View>
      </View>

      <Text
        style={[
          styles.hymnTitle,
          { color: c.onSurface },
        ]}
      >
        Jehová es mi pastor
      </Text>

      <Text
        style={[
          styles.verseNumber,
          { color: c.muted },
        ]}
      >
        1.
      </Text>

      <Text
        style={[
          styles.verse,
          { color: c.onSurface },
        ]}
      >
        Jehová es mi pastor,{'\n'}
        nada me faltará;{'\n'}
        en verdes pastos{'\n'}
        me hace descansar.
      </Text>

      <View
        style={[
          styles.favoriteHint,
          {
            borderColor: c.border,
          },
        ]}
      >
        <Feather
          name="star"
          size={15}
          color="#DDB62E"
        />

        <Text
          style={[
            styles.favoriteHintText,
            { color: c.muted },
          ]}
        >
          Toca la estrella para guardar
        </Text>
      </View>
    </View>
  );
}


/* =========================================================
   PASSO 5
   PERSONALIZAÇÃO + PINÇA
   ========================================================= */

function PinchDemo({
  c,
}: {
  c: any;
}) {
  const zoom = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(400),

        Animated.timing(zoom, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.delay(600),

        Animated.timing(zoom, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.delay(500),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [zoom]);

  const textScale =
    zoom.interpolate({
      inputRange: [0, 1],
      outputRange: [0.90, 1.14],
    });

  const leftX =
    zoom.interpolate({
      inputRange: [0, 1],
      outputRange: [18, -18],
    });

  const rightX =
    zoom.interpolate({
      inputRange: [0, 1],
      outputRange: [-18, 18],
    });

  const fingerScale =
    zoom.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.94, 1, 0.96],
    });

  return (
    <View
      style={[
        styles.phone,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
      ]}
    >
      <View style={styles.readingControls}>
        <View
          style={[
            styles.smallControl,
            {
              borderColor: c.border,
            },
          ]}
        >
          <Text
            style={{
              color: c.onSurface,
              fontWeight: '700',
            }}
          >
            A−
          </Text>
        </View>

        <View
          style={[
            styles.smallControl,
            {
              borderColor: c.border,
            },
          ]}
        >
          <Text
            style={{
              color: c.onSurface,
              fontWeight: '700',
            }}
          >
            A+
          </Text>
        </View>

        <View style={{ flex: 1 }} />

        <Feather
          name="align-center"
          size={17}
          color={c.brand}
        />
      </View>

      <Animated.View
        style={{
          transform: [
            { scale: textScale },
          ],
        }}
      >
        <Text
          style={[
            styles.zoomVerse,
            { color: c.onSurface },
          ]}
        >
          Jehová es mi pastor,{'\n'}
          nada me faltará;{'\n'}
          en verdes pastos{'\n'}
          me hace descansar.
        </Text>
      </Animated.View>

      <View style={styles.pinchArea}>
        <Animated.View
          style={{
            transform: [
              { translateX: leftX },
              { scale: fingerScale },
              { rotate: '-24deg' },
            ],
          }}
        >
          <Finger />
        </Animated.View>

        <Animated.View
          style={{
            transform: [
              { translateX: rightX },
              { scale: fingerScale },
              { rotate: '24deg' },
            ],
          }}
        >
          <Finger />
        </Animated.View>
      </View>

      <View
        style={[
          styles.pinchHint,
          {
            backgroundColor:
              c.surfaceSecondary,
            borderColor: c.border,
          },
        ]}
      >
        <Feather
          name="maximize-2"
          size={16}
          color="#DDB62E"
        />

        <Text
          style={[
            styles.pinchHintText,
            { color: c.onSurface },
          ]}
        >
          Usa dos dedos sobre el texto
          para ampliar o reducir
        </Text>
      </View>
    </View>
  );
}


/* =========================================================
   PASSO 6
   MODO CULTO
   ========================================================= */

function CultoDemo({
  c,
}: {
  c: any;
}) {
  const highlight = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(highlight, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),

        Animated.delay(700),

        Animated.timing(highlight, {
          toValue: 0,
          duration: 650,
          useNativeDriver: true,
        }),

        Animated.delay(500),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [highlight]);

  const scale =
    highlight.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.035],
    });

  const hymns = [
    ['1', '123', 'Jehová es mi pastor'],
    ['2', '45', 'Santo, santo, santo'],
    ['3', '300', 'Gracia sublime es'],
  ];

  return (
    <View
      style={[
        styles.phone,
        {
          backgroundColor: c.surface,
          borderColor: c.border,
        },
      ]}
    >
      <MiniTopBar
        title="Modo Culto"
        c={c}
      />

      {hymns.map(
        ([position, number, title], index) => (
          <Animated.View
            key={number}
            style={[
              styles.cultoRow,
              {
                borderBottomColor:
                  c.divider,
                transform:
                  index === 0
                    ? [{ scale }]
                    : [],
              },
            ]}
          >
            <Text
              style={[
                styles.cultoPosition,
                { color: c.muted },
              ]}
            >
              {position}
            </Text>

            <Text
              style={[
                styles.cultoNumber,
                { color: c.brand },
              ]}
            >
              {number}
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.cultoTitle,
                { color: c.onSurface },
              ]}
            >
              {title}
            </Text>

            <Feather
              name="menu"
              size={15}
              color={c.muted}
            />
          </Animated.View>
        ),
      )}

      <View
        style={[
          styles.startCulto,
          {
            backgroundColor: c.brand,
          },
        ]}
      >
        <Feather
          name="play"
          size={16}
          color="#FFFFFF"
        />

        <Text style={styles.startCultoText}>
          Iniciar culto
        </Text>
      </View>

      <View style={styles.cultoTips}>
        <View style={styles.cultoTip}>
          <Feather
            name="plus-circle"
            size={17}
            color="#DDB62E"
          />

          <Text
            style={[
              styles.cultoTipText,
              { color: c.muted },
            ]}
          >
            Agrega himnos
          </Text>
        </View>

        <View style={styles.cultoTip}>
          <Feather
            name="menu"
            size={17}
            color="#DDB62E"
          />

          <Text
            style={[
              styles.cultoTipText,
              { color: c.muted },
            ]}
          >
            Organiza el orden
          </Text>
        </View>
      </View>
    </View>
  );
}


/* =========================================================
   DADOS DOS PASSOS
   ========================================================= */

const STEPS = [
  {
    title: 'Elige tu himnario',
    text:
      'Selecciona Gloria y Triunfo o Himnos de Sión para comenzar.',
    Demo: HymnalDemo,
  },

  {
    title: 'Encuentra cualquier himno',
    text:
      'Busca por número, por título o escribiendo palabras de la letra del himno.',
    Demo: SearchDemo,
  },

  {
    title: 'Explora por categorías',
    text:
      'Encuentra rápidamente himnos agrupados por temas para cada momento.',
    Demo: CategoriesDemo,
  },

  {
    title: 'Guarda tus favoritos',
    text:
      'Marca los himnos que más utilizas y accede a ellos rápidamente.',
    Demo: FavoritesDemo,
  },

  {
    title: 'Personaliza la lectura',
    text:
      'Ajusta fuente, tamaño y alineación. También puedes ampliar o reducir el texto con el gesto de pinza.',
    Demo: PinchDemo,
  },

  {
    title: 'Usa el Modo Culto',
    text:
      'Prepara los himnos, organiza el orden y accede a ellos rápidamente durante el culto.',
    Demo: CultoDemo,
  },
];


/* =========================================================
   TELA PRINCIPAL
   ========================================================= */

export default function Guide() {
  const router = useRouter();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] =
    useState(0);

  const translateX = useRef(
    new Animated.Value(0),
  ).current;

  const changingStep = useRef(false);

  const current = STEPS[step];
  const Demo = current.Demo;

  const goHome = async () => {
    try {
      await guideStorage.markSeen();
    } catch (error) {
      console.warn(
        'No se pudo registrar la guía:',
        error,
      );
    } finally {
      /*
       * IMPORTANTE:
       * não usamos router.back().
       * No primeiro uso o guia pode ter sido aberto
       * com router.replace(), portanto pode não
       * existir uma tela anterior válida.
       */
      router.replace('/' as any);
    }
  };

  const changeStep = (
    nextStep: number,
  ) => {
    if (
      nextStep < 0 ||
      nextStep >= TOTAL_STEPS ||
      nextStep === step ||
      changingStep.current
    ) {
      return;
    }

    changingStep.current = true;

    const direction =
      nextStep > step ? 1 : -1;

    /*
     * A página não desaparece mais.
     * Fazemos somente um deslocamento curto.
     * Isso elimina o flash/tremulação provocado
     * anteriormente pelo opacity 1 -> 0 -> 1.
     */
    Animated.timing(translateX, {
      toValue: -12 * direction,
      duration: 85,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      setStep(nextStep);

      translateX.setValue(
        12 * direction,
      );

      Animated.timing(translateX, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        changingStep.current = false;
      });
    });
  };

  const next = () => {
    if (
      step ===
      TOTAL_STEPS - 1
    ) {
      goHome();
      return;
    }

    changeStep(step + 1);
  };

  const previous = () => {
    if (step > 0) {
      changeStep(step - 1);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
        },
      ]}
    >
      {/* CABEÇALHO */}

      <View style={styles.header}>
        <Pressable
          onPress={goHome}
          hitSlop={16}
          style={({ pressed }) => [
            styles.closeButton,
            {
              opacity:
                pressed ? 0.55 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar guía"
          testID="guide-close"
        >
          <Feather
            name="x"
            size={29}
            color={c.brand}
          />
        </Pressable>

        <Text
          style={[
            styles.headerTitle,
            { color: c.brand },
          ]}
        >
          Guía de uso
        </Text>

        <Text
          style={[
            styles.headerCount,
            { color: c.muted },
          ]}
        >
          {step + 1}/{TOTAL_STEPS}
        </Text>
      </View>

      {/* CONTEÚDO */}

      <Animated.View
        style={[
          styles.content,
          {
            transform: [
              { translateX },
            ],
          },
        ]}
      >
        <View style={styles.demoArea}>
          <Demo c={c} />
        </View>

        <Text
          style={[
            styles.stepLabel,
            { color: c.muted },
          ]}
        >
          PASO {step + 1} DE {TOTAL_STEPS}
        </Text>

        <Text
          style={[
            styles.title,
            { color: c.brand },
          ]}
        >
          {current.title}
        </Text>

        <Text
          style={[
            styles.description,
            { color: c.muted },
          ]}
        >
          {current.text}
        </Text>

        {/* INDICADORES */}

        <View style={styles.dots}>
          {STEPS.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === step
                      ? '#DDB62E'
                      : c.border,

                  width:
                    index === step
                      ? 24
                      : 7,
                },
              ]}
            />
          ))}
        </View>
      </Animated.View>

      {/* NAVEGAÇÃO */}

      <View
        style={[
          styles.navigation,
          {
            paddingBottom:
              Math.max(
                insets.bottom,
                14,
              ),
          },
        ]}
      >
        {step > 0 ? (
          <Pressable
            onPress={previous}
            style={({ pressed }) => [
              styles.previousButton,
              {
                borderColor: c.border,
                opacity:
                  pressed
                    ? 0.65
                    : 1,
              },
            ]}
          >
            <Feather
              name="arrow-left"
              size={20}
              color={c.brand}
            />

            <Text
              style={[
                styles.previousText,
                { color: c.brand },
              ]}
            >
              Anterior
            </Text>
          </Pressable>
        ) : (
          <View
            style={
              styles.previousPlaceholder
            }
          />
        )}

        <Pressable
          onPress={next}
          style={({ pressed }) => [
            styles.nextButton,
            {
              backgroundColor:
                c.brand,
              opacity:
                pressed
                  ? 0.82
                  : 1,
            },
          ]}
          accessibilityRole="button"
          testID={
            step ===
            TOTAL_STEPS - 1
              ? 'guide-finish'
              : 'guide-next'
          }
        >
          <Text style={styles.nextText}>
            {step ===
            TOTAL_STEPS - 1
              ? 'Finalizar'
              : 'Siguiente'}
          </Text>

          {step <
          TOTAL_STEPS - 1 ? (
            <Feather
              name="arrow-right"
              size={20}
              color="#FFFFFF"
            />
          ) : (
            <Feather
              name="check"
              size={20}
              color="#FFFFFF"
            />
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}


/* =========================================================
   ESTILOS
   ========================================================= */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
    },

    header: {
      height: 66,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 22,
    },

    closeButton: {
      width: 48,
      height: 48,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },

    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 20,
      fontWeight: '800',
    },

    headerCount: {
      width: 48,
      textAlign: 'right',
      fontSize: 13,
      fontWeight: '700',
    },

    content: {
      flex: 1,
      alignItems: 'center',
      paddingHorizontal: 24,
    },

    demoArea: {
      height: 365,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
    },

    phone: {
      width: 250,
      minHeight: 330,
      borderRadius: 27,
      borderWidth: 1.5,
      padding: 16,
      overflow: 'hidden',

      shadowColor: '#000',
      shadowOpacity: 0.07,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 5,
      },

      elevation: 2,
    },

    miniTopBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
    },

    miniTopTitle: {
      flex: 1,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '800',
    },

    demoHeading: {
      fontSize: 16,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 8,
      marginBottom: 24,
    },

    hymnalRow: {
      flexDirection: 'row',
      gap: 10,
    },

    hymnalCard: {
      flex: 1,
      height: 180,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    hymnalDarkText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
    },

    hymnalLightText: {
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
    },

    fingerHand: {
      width: 30,
      height: 62,
      alignItems: 'center',
      position: 'relative',
    },

    fingerShadow: {
      position: 'absolute',
      width: 22,
      height: 50,
      top: 4,
      borderRadius: 13,
      backgroundColor:
        'rgba(0,0,0,0.13)',
      transform: [
        { translateX: 2 },
        { translateY: 3 },
      ],
    },

    fingerBody: {
      width: 21,
      height: 48,
      borderRadius: 12,
      backgroundColor: '#D7A47D',
      borderWidth: 1,
      borderColor: '#B9825D',
      alignItems: 'center',
      paddingTop: 5,
      zIndex: 2,
    },

    fingerNail: {
      width: 11,
      height: 13,
      borderRadius: 6,
      backgroundColor: '#F1CBB3',
      borderWidth: 0.7,
      borderColor: '#C99473',
    },

    fingerJoint: {
      position: 'absolute',
      width: 13,
      height: 1,
      bottom: 10,
      borderRadius: 1,
      backgroundColor:
        'rgba(128,79,52,0.25)',
    },

    fingerPalm: {
      position: 'absolute',
      width: 28,
      height: 22,
      bottom: 0,
      borderRadius: 14,
      backgroundColor: '#D7A47D',
      borderWidth: 1,
      borderColor: '#B9825D',
      zIndex: 1,
    },

    demoFingerPosition: {
      position: 'absolute',
      bottom: 20,
      left: 69,
    },

    searchBox: {
      height: 42,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },

    searchText: {
      fontSize: 14,
      fontWeight: '700',
    },

    keyboard: {
      width: 126,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 5,
    },

    key: {
      width: 38,
      height: 34,
      borderWidth: 1,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },

    resultCard: {
      position: 'absolute',
      top: 116,
      right: 13,
      width: 92,
      borderWidth: 1,
      borderRadius: 12,
      padding: 8,
      gap: 5,
    },

    resultNumber: {
      fontSize: 16,
      fontWeight: '900',
    },

    resultTitle: {
      fontSize: 10,
      fontWeight: '700',
    },

    resultSubtitle: {
      fontSize: 8,
      marginTop: 3,
    },

    searchHint: {
      marginTop: 12,
      padding: 9,
      borderRadius: 10,
    },

    searchHintText: {
      fontSize: 9,
      lineHeight: 13,
      textAlign: 'center',
    },

    searchFinger: {
      position: 'absolute',
      bottom: 27,
      left: 62,
    },

    categoryIntro: {
      fontSize: 10,
      lineHeight: 14,
      textAlign: 'center',
      marginBottom: 8,
    },

    categoryRow: {
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    categoryText: {
      flex: 1,
      fontSize: 11,
      fontWeight: '600',
    },

    categoryCount: {
      fontSize: 10,
    },

    hymnHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    hymnNumber: {
      fontSize: 15,
      fontWeight: '900',
    },

    hymnTitle: {
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
      marginTop: 28,
      marginBottom: 24,
    },

    verseNumber: {
      fontSize: 10,
      fontWeight: '800',
      marginBottom: 8,
    },

    verse: {
      fontSize: 13,
      lineHeight: 22,
    },

    favoriteHint: {
      marginTop: 17,
      borderWidth: 1,
      borderRadius: 11,
      minHeight: 38,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 8,
    },

    favoriteHintText: {
      fontSize: 9,
      fontWeight: '600',
    },

    readingControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 25,
    },

    smallControl: {
      width: 38,
      height: 30,
      borderWidth: 1,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },

    zoomVerse: {
      fontFamily: 'Merriweather',
      fontSize: 15,
      lineHeight: 25,
      textAlign: 'center',
    },

    pinchArea: {
      height: 55,
      marginTop: 12,
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 12,
    },

    pinchHint: {
      borderWidth: 1,
      borderRadius: 12,
      paddingVertical: 8,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },

    pinchHintText: {
      flex: 1,
      fontSize: 9,
      lineHeight: 13,
    },

    cultoRow: {
      height: 48,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    cultoPosition: {
      width: 16,
      fontSize: 10,
      fontWeight: '700',
    },

    cultoNumber: {
      width: 32,
      fontSize: 12,
      fontWeight: '900',
    },

    cultoTitle: {
      flex: 1,
      fontSize: 10,
    },

    startCulto: {
      height: 42,
      borderRadius: 11,
      marginTop: 17,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    startCultoText: {
      color: '#FFFFFF',
      fontSize: 11,
      fontWeight: '800',
    },

    cultoTips: {
      marginTop: 17,
      flexDirection: 'row',
      justifyContent:
        'space-around',
    },

    cultoTip: {
      alignItems: 'center',
      gap: 5,
    },

    cultoTipText: {
      fontSize: 8,
    },

    stepLabel: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.4,
      marginTop: 2,
      marginBottom: 10,
    },

    title: {
      fontSize: 27,
      lineHeight: 33,
      fontWeight: '900',
      textAlign: 'center',
      marginBottom: 10,
    },

    description: {
      maxWidth: 390,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },

    dots: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      marginTop: 19,
    },

    dot: {
      height: 7,
      borderRadius: 5,
    },

    navigation: {
      minHeight: 92,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',
      paddingHorizontal: 24,
      paddingTop: 8,
    },

    previousButton: {
      height: 54,
      minWidth: 126,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderRadius: 17,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 9,
    },

    previousPlaceholder: {
      width: 126,
    },

    previousText: {
      fontSize: 15,
      fontWeight: '800',
    },

    nextButton: {
      minWidth: 145,
      height: 54,
      paddingHorizontal: 20,
      borderRadius: 17,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },

    nextText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '800',
    },
  });
