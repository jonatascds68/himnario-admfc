import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS, LOGO_LOCAL } from '@/src/theme/tokens';
import { api, adminSession } from '@/src/lib/api';

export default function AdminLogin() {
  const router = useRouter();
  const { c } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Cada entrada a Administración exige login: al montar, cerramos cualquier
  // sesión administrativa previa. No hay auto-ingreso.
  useEffect(() => { adminSession.clear(); }, []);

  const submit = async () => {
    setError(''); setLoading(true);
    try {
      await api.login(email.trim(), password);
      router.replace('/admin' as any);
    } catch (e: any) {
      setError(e?.message || 'Error de autenticación');
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} testID="admin-login-screen">
      <View style={styles.headerBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-left" size={28} color={c.brand} />
        </Pressable>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.form}>
        <Image source={LOGO_LOCAL} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: c.brand }]}>Administración</Text>
        <Text style={[styles.sub, { color: c.muted }]}>Ingrese sus credenciales</Text>

        <View style={{ marginTop: SPACING.xl, gap: SPACING.md }}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={c.muted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, { backgroundColor: c.surfaceSecondary, borderColor: c.border, color: c.onSurface }]}
            testID="admin-email"
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Contraseña"
            placeholderTextColor={c.muted}
            secureTextEntry
            style={[styles.input, { backgroundColor: c.surfaceSecondary, borderColor: c.border, color: c.onSurface }]}
            testID="admin-password"
          />
          {error ? <Text style={{ color: c.error, textAlign: 'center' }} testID="admin-login-error">{error}</Text> : null}
          <Pressable onPress={submit} disabled={loading} style={[styles.btn, { backgroundColor: c.brand, opacity: loading ? 0.6 : 1 }]} testID="admin-login-submit">
            {loading ? <ActivityIndicator color={c.onSurfaceInverse} /> :
              <Text style={{ color: c.onSurfaceInverse, fontWeight: '700', fontSize: 15 }}>Ingresar</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerBar: { padding: SPACING.md },
  form: { flex: 1, padding: SPACING.xl, alignItems: 'center' },
  logo: { width: 96, height: 96, marginBottom: SPACING.md },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  sub: { fontSize: 13, marginTop: 4 },
  input: { height: 52, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, fontSize: 15, minWidth: 280 },
  btn: { height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.sm },
});
