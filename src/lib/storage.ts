import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const isWeb = Platform.OS === 'web';

export const kv = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(key);
    return AsyncStorage.getItem(key);
  },
  async set(key: string, value: string) {
    return AsyncStorage.setItem(key, value);
  },
  async remove(key: string) {
    return AsyncStorage.removeItem(key);
  },
};

export const secureKv = {
  async get(key: string): Promise<string | null> {
    if (isWeb) return AsyncStorage.getItem(`sec_${key}`);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string) {
    if (isWeb) return AsyncStorage.setItem(`sec_${key}`, value);
    return SecureStore.setItemAsync(key, value);
  },
  async remove(key: string) {
    if (isWeb) return AsyncStorage.removeItem(`sec_${key}`);
    return SecureStore.deleteItemAsync(key);
  },
};
export type HymnFont = 'Lora' | 'Merriweather' | 'SourceSerif4' | 'PlayfairDisplay';

const HYMN_FONT_KEY = 'admfc_hymn_font';

export const hymnFontStorage = {
  async get(): Promise<HymnFont> {
    const saved = await kv.get(HYMN_FONT_KEY);
    if (
      saved === 'Lora' ||
      saved === 'Merriweather' ||
      saved === 'SourceSerif4' ||
      saved === 'PlayfairDisplay'
    ) {
      return saved;
    }
    return 'Lora';
  },

  async set(font: HymnFont) {
    await kv.set(HYMN_FONT_KEY, font);
  },
};
