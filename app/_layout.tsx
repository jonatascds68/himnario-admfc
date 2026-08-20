import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  AppState,
  Easing,
  Image,
  LogBox,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { useFonts } from 'expo-font';
import { Lora_400Regular } from '@expo-google-fonts/lora';
import {
  Merriweather_400Regular,
  Merriweather_400Regular_Italic,
} from '@expo-google-fonts/merriweather';
import { SourceSerif4_400Regular } from '@expo-google-fonts/source-serif-4';
import { PlayfairDisplay_400Regular } from '@expo-google-fonts/playfair-display';
import { Montserrat_400Regular } from '@expo-google-fonts/montserrat';
import { AtkinsonHyperlegible_400Regular } from '@expo-google-fonts/atkinson-hyperlegible';
import { ThemeProvider } from '@/src/theme/ThemeContext';
import { guideStorage } from '@/src/lib/storage';
import { syncContentUpdates } from '@/src/lib/content-sync';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [loaded, error] = useIconFonts();

  const [textFontsLoaded, textFontsError] = useFonts({
    Lora: Lora_400Regular,
    Merriweather: Merriweather_400Regular,
    MerriweatherItalic: Merriweather_400Regular_Italic,
    SourceSerif4: SourceSerif4_400Regular,
    PlayfairDisplay: PlayfairDisplay_400Regular,
    Montserrat: Montserrat_400Regular,
    AtkinsonHyperlegible: AtkinsonHyperlegible_400Regular,
  });

  const [introVisible, setIntroVisible] = useState(true);

  /*
   * ADMFC — atualização automática das letras e demais conteúdos.
   *
   * - consulta ao iniciar;
   * - consulta novamente quando o app volta ao primeiro plano;
   * - nunca bloqueia a abertura do hinário;
   * - falha de internet é silenciosa para o usuário.
   */
  useEffect(() => {
    let active = true;

    const runSync = () => {
      if (!active) return;

      syncContentUpdates().catch(() => {
        // A sincronização jamais deve interromper o aplicativo.
      });
    };

    runSync();

    const subscription = AppState.addEventListener(
      'change',
      nextState => {
        if (nextState === 'active') {
          runSync();
        }
      }
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  // ADMFC — abertura clean
  const logoScale = useRef(new Animated.Value(0.58)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(8)).current;
  const introOpacity = useRef(new Animated.Value(1)).current;

  const ready =
    (loaded || error) &&
    (textFontsLoaded || textFontsError);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const start = async () => {
      await SplashScreen.hideAsync();

      Animated.sequence([

        // Logo surge e cresce lentamente
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 650,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),

          Animated.timing(logoScale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),

          // O nome começa a aparecer enquanto
          // o brasão ainda está crescendo
          Animated.sequence([
            Animated.delay(650),

            Animated.parallel([
              Animated.timing(titleOpacity, {
                toValue: 1,
                duration: 650,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
              }),

              Animated.timing(titleTranslateY, {
                toValue: 0,
                duration: 650,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
              }),
            ]),
          ]),
        ]),

        // Marca completamente formada
        Animated.delay(500),

        // Saída limpa e simultânea
        Animated.parallel([
          Animated.timing(introOpacity, {
            toValue: 0,
            duration: 500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),

          Animated.timing(logoScale, {
            toValue: 1.035,
            duration: 500,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start(async ({ finished }) => {
        if (!active || !finished) return;

        setIntroVisible(false);

        try {
          const hasSeenGuide = await guideStorage.hasSeen();

          if (!hasSeenGuide && active) {
            router.replace('/guide' as any);
          }
        } catch (error) {
          console.warn(
            'No se pudo verificar la guía inicial:',
            error
          );
        }
      });
    };

    start();

    return () => {
      active = false;
    };
  }, [
    ready,
    logoScale,
    logoOpacity,
    titleOpacity,
    titleTranslateY,
    introOpacity,
    router,
  ]);

  if (!ready) return null;

return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
              }}
            />

            {introVisible ? (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.intro,
                  { opacity: introOpacity },
                ]}
              >


                <Animated.View
                  style={{
                    opacity: logoOpacity,
                    transform: [{ scale: logoScale }],
                  }}
                >
                  <Image
                    source={require('../assets/images/logo-admfc.png')}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </Animated.View>

                <Animated.Text
                  style={[
                    styles.introTitle,
                    {
                      opacity: titleOpacity,
                      transform: [
                        { translateY: titleTranslateY },
                      ],
                    },
                  ]}
                >
                  HIMNARIO ADMFC
                </Animated.Text>

              </Animated.View>
            ) : null}
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#0B1B3D',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logo: {
    width: 270,
    height: 270,
  },

  introTitle: {
    marginTop: 34,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 3.5,
    color: '#D4AF37',
    textAlign: 'center',
  },
});
