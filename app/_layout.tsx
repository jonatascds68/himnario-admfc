import React from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { LogBox, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useIconFonts } from '@/src/hooks/use-icon-fonts';
import { useFonts } from 'expo-font';
import { Lora_400Regular } from '@expo-google-fonts/lora';
import { Merriweather_400Regular } from '@expo-google-fonts/merriweather';
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
  SourceSerif4: SourceSerif4_400Regular,
  PlayfairDisplay: PlayfairDisplay_400Regular,
});
useEffect(() => {
  if ((loaded || error) && (textFontsLoaded || textFontsError)) {
    SplashScreen.hideAsync();
  }
}, [loaded, error, textFontsLoaded, textFontsError]);
if ((!loaded && !error) || (!textFontsLoaded && !textFontsError)) return null;  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
