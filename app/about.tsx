import React, { useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { LOGO_LOCAL, SPACING, RADIUS } from '@/src/theme/tokens';

export default function About() {
  const router = useRouter();
  const { c } = useTheme();

  // Acesso administrativo oculto:
  // 7 toques rápidos consecutivos na logo.
  // O acesso continua protegido pela tela de login e senha.
  const adminTapCount = useRef(0);
  const adminLastTap = useRef(0);

  const handleSecretAdminAccess = () => {
    const now = Date.now();

    // Se demorar mais de 1,2 s entre os toques,
    // reinicia a sequência.
    if (now - adminLastTap.current > 1200) {
      adminTapCount.current = 0;
    }

    adminLastTap.current = now;
    adminTapCount.current += 1;

    if (adminTapCount.current >= 7) {
      adminTapCount.current = 0;
      adminLastTap.current = 0;
      router.push('/admin-login' as any);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="about-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-left" size={28} color={c.brand} />
        </Pressable>
        <Text style={[styles.title, { color: c.brand }]}>Acerca de</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable
        onPress={handleSecretAdminAccess}
        style={styles.logoSecretAccess}
        accessibilityLabel="Logo ADMFC"
        testID="about-logo"
      >
        <Image
          source={LOGO_LOCAL}
          style={styles.logo}
          resizeMode="contain"
        />
      </Pressable>
        <Text style={[styles.brand, { color: c.brand }]}>HIMNARIO ADMFC</Text>
        <Text style={[styles.sub, { color: c.onSurface }]}>Asamblea de Dios · Misión de la Fe Cristiana</Text>
        <View style={[styles.divider, { backgroundColor: c.borderStrong }]} />
        <Text style={[styles.p, { color: c.onSurface }]}>
          Basado en Himnos de Gloria y Triunfo con referencias cruzadas de Himnos de Sión.
        </Text>
        <Text style={[styles.h2, { color: c.brand }]}>Notas de contenido</Text>
        <Text style={[styles.p, { color: c.muted }]}>
          El HIMNARIO ADMFC incluye títulos y numeraciones obtenidas de índices públicos.
          Las letras se incorporan únicamente cuando existe verificación de dominio público,
          licencia compatible o autorización de reproducción. En caso contrario, cada himno
          aparece como “LETRA PENDIENTE DE VERIFICACIÓN/AUTORIZACIÓN”, para que el
          administrador pueda completarla desde el panel administrativo o mediante importación.
        </Text>
        <Text style={[styles.h2, { color: c.brand }]}>Numeración principal</Text>
        <Text style={[styles.p, { color: c.muted }]}>
          El número principal corresponde a Gloria y Triunfo. Cuando el mismo himno aparece
          en Himnos de Sión, se registra secundariamente su número Sión como referencia
          cruzada. No existe una tercera numeración ADMFC.
        </Text>
        <Text style={[styles.h2, { color: c.brand }]}>Derechos</Text>
        <Text style={[styles.p, { color: c.muted }]}>
          ADMFC no reclama derechos autorales sobre composiciones pertenecientes a terceros.
          Créditos y fuentes se registran por himno cuando están disponibles.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  scroll: { padding: SPACING.lg, alignItems: 'center' },
  logoSecretAccess: {
    width: 140,
    height: 140,
    marginBottom: SPACING.md,
  },
  logo: {
    width: 140,
    height: 140,
  },
  brand: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  sub: { fontSize: 13, marginTop: 4, textAlign: 'center' },
  divider: { height: 2, width: 60, marginVertical: SPACING.lg, opacity: 0.7, borderRadius: RADIUS.sm },
  p: { fontSize: 14, lineHeight: 21, marginBottom: SPACING.md, alignSelf: 'stretch' },
  h2: { fontSize: 14, fontWeight: '800', letterSpacing: 1, marginTop: SPACING.lg, marginBottom: SPACING.sm, alignSelf: 'stretch' },
});
