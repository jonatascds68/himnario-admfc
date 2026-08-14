import React from 'react';
import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.brand,
        tabBarInactiveTintColor: isDark ? '#B8BEC9' : '#5A6472',
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.divider,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Feather name="home" color={color} size={size} testID="tab-home-icon" />,
          tabBarButtonTestID: 'tab-home',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color, size }) => <Feather name="search" color={color} size={size} testID="tab-search-icon" />,
          tabBarButtonTestID: 'tab-search',
        }}
      />
      <Tabs.Screen
        name="culto"
        options={{
          title: 'Culto',
          tabBarIcon: ({ color, size }) => <Feather name="list" color={color} size={size} testID="tab-culto-icon" />,
          tabBarButtonTestID: 'tab-culto',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'Más',
          tabBarIcon: ({ color, size }) => <Feather name="menu" color={color} size={size} testID="tab-more-icon" />,
          tabBarButtonTestID: 'tab-more',
        }}
      />
    </Tabs>
  );
}
