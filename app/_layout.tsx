import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  LogBox,
  StyleSheet,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
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
import { ThemeProvider } from '@/src/theme/ThemeContext';

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  const [textFontsLoaded, textFontsError] = useFonts({
    Lora: Lora_400Regular,
    Merriweather: Merriweather_400Regular,
    MerriweatherItalic: Merriweather_400Regular_Italic,
    SourceSerif4: SourceSerif4_400Regular,
    PlayfairDisplay: PlayfairDisplay_400Regular,
  });

  const [introVisible, setIntroVisible] = useState(true);

  const spin = useRef(new Animated.Value(0)).current;
  const grow = useRef(new Animated.Value(1)).current;
  const fade = useRef(new Animated.Value(1)).current;

  const ready =
    (loaded || error) &&
    (textFontsLoaded || textFontsError);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const start = async () => {
      await SplashScreen.hideAsync();

      Animated.sequence([
        // Duas voltas como moeda
        Animated.timing(spin, {
          toValue: 2,
          duration: 3750,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),

        // Terceira volta crescendo para preencher a tela
        Animated.parallel([
          Animated.timing(spin, {
            toValue: 3,
            duration: 2100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(grow, {
            toValue: 6.5,
            duration: 1400,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(900),
            Animated.timing(fade, {
              toValue: 0,
              duration: 520,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ]),
      ]).start(() => {
        if (active) setIntroVisible(false);
      });
    };

    start();

    return () => {
      active = false;
    };
  }, [ready, spin, grow, fade]);

  if (!ready) return null;

  const rotateY = spin.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: ['0deg', '360deg', '720deg', '1080deg'],
  });

  const squash = spin.interpolate({
    inputRange: [
      0, 0.25, 0.5, 0.75,
      1, 1.25, 1.5, 1.75,
      2, 2.25, 2.5, 2.75, 3,
    ],
    outputRange: [
      1, 0.18, 1, 0.18,
      1, 0.18, 1, 0.18,
      1, 0.18, 1, 0.18, 1,
    ],
  });

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
                  { opacity: fade },
                ]}
              >
                <Animated.View
                  style={{
                    transform: [
                      { perspective: 900 },
                      { rotateY },
                      { scaleX: squash },
                      { scale: grow },
                    ],
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
                    { opacity: fade },
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
    width: 220,
    height: 220,
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
