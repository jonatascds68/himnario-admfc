import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, LOGO_LOCAL, SPACING } from '@/src/theme/tokens';

export default function Splash() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(tabs)'), 1600);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <View style={styles.container} testID="splash-screen">
      <Image source={LOGO_LOCAL} style={styles.logo} resizeMode="contain" />
      <Text style={styles.title}>HIMNARIO ADMFC</Text>
      <Text style={styles.sub}>Asamblea de Dios Misión de la Fe Cristiana</Text>
      <View style={styles.divider} />
      <Text style={styles.foot}>Basado en Himnos de Gloria y Triunfo</Text>
      <Text style={styles.foot}>con referencias de Himnos de Sión</Text>
    </View>
  );
}
const NAVY = COLORS.light.brand;
const GOLD = COLORS.light.brandSecondary;
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  logo: { width: 220, height: 220, marginBottom: SPACING.xl },
  title: { color: '#FDFBF7', fontSize: 26, fontWeight: '700', letterSpacing: 2, textAlign: 'center' },
  sub: { color: GOLD, fontSize: 13, marginTop: SPACING.sm, textAlign: 'center', letterSpacing: 1 },
  divider: { width: 60, height: 2, backgroundColor: GOLD, marginVertical: SPACING.xl, opacity: 0.7 },
  foot: { color: '#E5D397', fontSize: 12, opacity: 0.85, textAlign: 'center' },
});
