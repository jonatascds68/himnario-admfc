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

import {
  Feather,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
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


/*
 * ADMFC 7AA.58 — PROFESSIONAL GESTURE ICONS
 *
 * O guia não desenha mais anatomia humana.
 *
 * Usa ícones vetoriais profissionais já disponíveis
 * no MaterialCommunityIcons:
 *
 * - gesture-tap
 * - gesture-swipe-horizontal
 * - gesture-pinch
 *
 * O Animated controla apenas movimento e feedback.
 */

type GestureHandMode =
  | 'tap'
  | 'point'
  | 'pinch';

function GestureHand({
  mode = 'tap',
  style,
}: {
  mode?: GestureHandMode;
  style?: any;
}) {
  const motion = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    motion.setValue(0);

    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(500),

        Animated.timing(motion, {
          toValue: 1,
          duration:
            mode === 'pinch'
              ? 700
              : 380,
          easing:
            Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.delay(
          mode === 'pinch'
            ? 450
            : 220
        ),

        Animated.timing(motion, {
          toValue: 0,
          duration:
            mode === 'pinch'
              ? 700
              : 420,
          easing:
            Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.delay(650),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [mode, motion]);

  const iconName =
    mode === 'pinch'
      ? 'gesture-pinch'
      : 'gesture-tap';

  const translateY =
    motion.interpolate({
      inputRange: [0, 1],
      outputRange:
        mode === 'tap'
          ? [7, 0]
          : [0, 0],
    });

  const scale =
    motion.interpolate({
      inputRange: [0, 1],
      outputRange:
        mode === 'pinch'
          ? [0.80, 1.16]
          : mode === 'tap'
            ? [1, 0.92]
            : [1, 0.92],
    });

  const pulseOpacity =
    motion.interpolate({
      inputRange: [0, 0.25, 1],
      outputRange:
        mode === 'tap'
          ? [0, 0.42, 0]
          : [0, 0, 0],
    });

  const pulseScale =
    motion.interpolate({
      inputRange: [0, 1],
      outputRange: [0.7, 1.5],
    });

  return (
    <View
      pointerEvents="none"
      style={[
        styles.gestureHandRoot,
        style,
      ]}
    >
      {mode === 'tap' ? (
        <Animated.View
          style={[
            styles.gestureTouchPulse,
            {
              opacity: pulseOpacity,
              transform: [
                { scale: pulseScale },
              ],
            },
          ]}
        />
      ) : null}

      <Animated.View
        style={[
          styles.gestureIconMotion,
          {
            transform: [
              { translateY },
              { scale },
            ],
          },
        ]}
      >
        <MaterialCommunityIcons
          name={iconName as any}
          size={
            mode === 'pinch'
              ? 70
              : 72
          }
          color="#D88A68"
        />
      </Animated.View>
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
        <GestureHand mode="tap" />
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
  const [queryText, setQueryText] =
    useState('');

  const [resultVisible, setResultVisible] =
    useState(false);

  /*
   * ADMFC 7AA.58C — busca demonstrativa 1 -> 2 -> 3.
   *
   * O gesto toca cada tecla da primeira linha.
   * O campo é preenchido progressivamente.
   * O resultado surge somente depois de "123".
   */
  const tapX = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise<void>(resolve => {
        setTimeout(resolve, ms);
      });

    const moveTo = (
      toValue: number,
      duration = 260,
    ) =>
      new Promise<void>(resolve => {
        Animated.timing(tapX, {
          toValue,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }).start(() => resolve());
      });

    const run = async () => {
      while (!cancelled) {
        setQueryText('');
        setResultVisible(false);
        tapX.setValue(0);

        await sleep(650);
        if (cancelled) break;

        setQueryText('1');

        await sleep(430);
        if (cancelled) break;

        await moveTo(43);
        if (cancelled) break;

        await sleep(180);
        setQueryText('12');

        await sleep(430);
        if (cancelled) break;

        await moveTo(86);
        if (cancelled) break;

        await sleep(180);
        setQueryText('123');

        await sleep(350);
        if (cancelled) break;

        setResultVisible(true);

        await sleep(1500);
        if (cancelled) break;

        await moveTo(0, 420);

        await sleep(500);
      }
    };

    run();

    return () => {
      cancelled = true;
      tapX.stopAnimation();
    };
  }, [tapX]);

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
          {queryText || ' '}
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
                  backgroundColor:
                    queryText.endsWith(n)
                      ? 'rgba(221,182,46,0.12)'
                      : 'transparent',
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
              opacity: resultVisible ? 1 : 0,
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
              { translateX: tapX },
            ],
          },
        ]}
      >
        <GestureHand mode="point" />
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

  const [sortMode, setSortMode] =
    useState<'az' | '123' | 'star'>('az');

  useEffect(() => {
    const favoriteAnimation = Animated.loop(
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

    favoriteAnimation.start();

    let cancelled = false;

    const sleep = (ms: number) =>
      new Promise<void>(resolve => {
        setTimeout(resolve, ms);
      });

    const cycleSort = async () => {
      while (!cancelled) {
        setSortMode('az');
        await sleep(1200);

        if (cancelled) break;

        setSortMode('123');
        await sleep(1200);

        if (cancelled) break;

        setSortMode('star');
        await sleep(1400);
      }
    };

    cycleSort();

    return () => {
      cancelled = true;
      favoriteAnimation.stop();
    };
  }, [favorite]);

  const sortItems = [
    {
      key: 'az' as const,
      label: 'A–Z',
      text: 'Por título',
    },
    {
      key: '123' as const,
      label: '123',
      text: 'Por número',
    },
    {
      key: 'star' as const,
      label: '★',
      text: 'Por orden de favoritación',
    },
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
          { borderColor: c.border },
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

      <View
        style={[
          styles.favoriteSortBox,
          {
            backgroundColor:
              c.surfaceSecondary,
            borderColor: c.border,
          },
        ]}
      >
        <Text
          style={[
            styles.favoriteSortTitle,
            { color: c.onSurface },
          ]}
        >
          Ordena tus favoritos
        </Text>

        <View style={styles.favoriteSortRow}>
          {sortItems.map(item => {
            const active =
              sortMode === item.key;

            return (
              <View
                key={item.key}
                style={[
                  styles.favoriteSortOption,
                  {
                    borderColor:
                      active
                        ? '#DDB62E'
                        : c.border,
                    backgroundColor:
                      active
                        ? 'rgba(221,182,46,0.12)'
                        : c.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.favoriteSortLabel,
                    {
                      color:
                        active
                          ? c.brand
                          : c.onSurface,
                    },
                  ]}
                >
                  {item.label}
                </Text>

                <Text
                  numberOfLines={2}
                  style={[
                    styles.favoriteSortText,
                    { color: c.muted },
                  ]}
                >
                  {item.text}
                </Text>
              </View>
            );
          })}
        </View>
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

  const fingerScale =
    zoom.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.96, 1.03, 0.96],
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
          style={[
            styles.pinchHandMotion,
            {
              transform: [
                { scale: fingerScale },
              ],
            },
          ]}
        >
          <GestureHand mode="pinch" />
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

  const cultoTap = useRef(
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

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(450),

        Animated.timing(cultoTap, {
          toValue: 1,
          duration: 360,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.delay(240),

        Animated.timing(cultoTap, {
          toValue: 0,
          duration: 420,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.delay(900),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [cultoTap]);

  const cultoTapY = cultoTap.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 0],
  });

  const cultoTapScale = cultoTap.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.03],
  });

  const cultoTapOpacity = cultoTap.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 1, 1],
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
                transform: [],
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

      <View style={styles.startCultoArea}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.cultoHandDemo,
            {
              opacity: cultoTapOpacity,
              transform: [
                { translateY: cultoTapY },
                { scale: cultoTapScale },
              ],
            },
          ]}
        >
          <GestureHand mode="tap" />
        </Animated.View>

        <Animated.View
          style={{
            transform: [{ scale }],
          }}
        >
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
        </Animated.View>
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
    title: 'Guarda y organiza tus favoritos',
    text:
      'Marca tus himnos favoritos y ordénalos por título, por número o por el orden en que los agregaste.',
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
      router.replace('/(tabs)' as any);
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

    /* =====================================================
       ADMFC 7AA.58 — PROFESSIONAL GESTURE ICONS
       ===================================================== */

    gestureHandRoot: {
      width: 100,
      height: 100,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
    },

    gestureIconMotion: {
      width: 88,
      height: 88,
      alignItems: 'center',
      justifyContent: 'center',
    },

    gestureTouchPulse: {
      position: 'absolute',
      top: 2,
      left: 36,
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: '#DDB62E',
      backgroundColor:
        'rgba(221,182,46,0.08)',
      zIndex: 5,
    },

    demoFingerPosition: {
      position: 'absolute',
      bottom: 58,
      left: 51,
    },

    pinchHandMotion: {
      width: 112,
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
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
      bottom: 144,
      left: -1,
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

    favoriteSortBox: {
      marginTop: 12,
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
    },

    favoriteSortTitle: {
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
      marginBottom: 8,
    },

    favoriteSortRow: {
      flexDirection: 'row',
      gap: 6,
    },

    favoriteSortOption: {
      flex: 1,
      minHeight: 60,
      borderWidth: 1,
      borderRadius: 9,
      paddingHorizontal: 4,
      paddingVertical: 7,
      alignItems: 'center',
      justifyContent: 'center',
    },

    favoriteSortLabel: {
      fontSize: 14,
      fontWeight: '900',
      marginBottom: 2,
    },

    favoriteSortText: {
      fontSize: 8,
      lineHeight: 11,
      textAlign: 'center',
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
      height: 112,
      marginTop: 0,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'visible',
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

    startCultoArea: {
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
      marginBottom: 8,
      minHeight: 82,
    },

    cultoHandDemo: {
      position: 'absolute',
      bottom: -18,
      zIndex: 5,
      alignSelf: 'center',
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
