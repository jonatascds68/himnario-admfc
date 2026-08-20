import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Modal } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, adminSession } from '@/src/lib/api';

export default function Admin() {
  const router = useRouter();
  const { c } = useTheme();
const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  // ADMFC 7AA.41 — confirmação visual própria para restauração.
  const [restoreConfirm, setRestoreConfirm] = useState<{
    data: any;
    hymnCount: number;
  } | null>(null);
  const load = useCallback(async () => {
    try {
      await api.me();
      const s = await api.stats();
      const pendingChanges = await api.adminChangesCount();
      setStats({ ...s, pendingChanges });
} catch {
      router.replace('/admin-login' as any);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = async () => { await api.logout(); router.replace('/(tabs)' as any); };
  const doExport = async () => {
    setBusy('export'); setMsg('');
    try {
      const data = await api.exportBackup();
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `admfc-backup-${ts}.json`;
      if (Platform.OS === 'web') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
      } else {
        const uri = (FileSystem as any).cacheDirectory + filename;
        await (FileSystem as any).writeAsStringAsync(uri, JSON.stringify(data, null, 2));
        if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri);
      }
      setMsg('Backup exportado');
    } catch (e: any) { setMsg(e?.message || 'Error exportando'); }
    finally { setBusy(''); }
  };

  /*
   * ADMFC 7AA.41:
   * A restauração de backup substitui a base local.
   * Exige confirmação explícita antes de persistir qualquer dado.
   */
  const doRestore = async () => {
    setMsg('');

    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (res.canceled || !res.assets?.[0]) return;

    try {
      let text = '';

      if (Platform.OS === 'web') {
        const r = await fetch(res.assets[0].uri);
        text = await r.text();
      } else {
        text = await (FileSystem as any).readAsStringAsync(
          res.assets[0].uri
        );
      }

      const data = JSON.parse(text);
      const hymns = data?.himnos || data?.hymns;

      if (!Array.isArray(hymns) || !hymns.length) {
        throw new Error('Backup inválido');
      }

      setRestoreConfirm({
        data,
        hymnCount: hymns.length,
      });
    } catch (e: any) {
      setMsg(e?.message || 'Error restaurando');
    }
  };

  const confirmRestore = async () => {
    if (!restoreConfirm) return;

    const data = restoreConfirm.data;
    setRestoreConfirm(null);
    setBusy('restore');

    try {
      const out = await api.restoreBackup(data);

      setMsg(
        `Restaurado: ${out.restored_hymns} himnos, ${out.restored_categories} categorías, ${out.restored_changes ?? 0} correcciones pendientes`
      );

      await load();
    } catch (e: any) {
      setMsg(e?.message || 'Error restaurando');
    } finally {
      setBusy('');
    }
  };

  return (
    <>
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="admin-screen">
      <View style={styles.header}>
        <Pressable onPress={() => { adminSession.clear(); router.replace('/(tabs)/more' as any); }} hitSlop={10}>
          <Feather name="chevron-left" size={28} color={c.brand} />
        </Pressable>
        <Text style={[styles.title, { color: c.brand }]}>Administración</Text>  
      <View style={{ flex: 1 }} />
        <Pressable onPress={logout} testID="admin-logout" hitSlop={10}>
          <Feather name="log-out" size={22} color={c.error} />
        </Pressable>
      </View>
<ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: SPACING.xxxl + insets.bottom }}>
        {stats ? (
          <View style={[styles.statCard, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
            <View style={styles.statRow}>
              <Stat label="Total" value={stats.total} c={c} />
              <Stat label="Gloria y Triunfo" value={stats.gt} c={c} />
            </View>
            <View style={styles.statRow}>
              <Stat label="Himnos de Sión" value={stats.sion} c={c} />
              <Stat label="Equivalencias" value={stats.equivalences} c={c} />
            </View>
            <View style={styles.statRow}>
              <Stat label="Con letra" value={stats.with_lyrics} c={c} />
              <Stat label="Pendientes" value={stats.pendingChanges ?? 0} c={c} />
            </View>
          </View>
        ) : <ActivityIndicator color={c.brand} />}

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: c.surfaceSecondary }]}>
            <Feather name="database" size={17} color={c.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: c.onSurface }]}>
              Editor de la Base
            </Text>
            <Text style={[styles.sectionSubtitle, { color: c.muted }]}>
              Administración y corrección del himnario
            </Text>
          </View>
        </View>
        <View style={[styles.actionCard, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
          <ActionBtn
            c={c}
            icon="edit-3"
            label="Editor de Himnos"
            description="Título, letra, número, categorías y equivalencias"
            onPress={() => router.push('/admin/hymns' as any)}
            testID="admin-editor"
          />
          <ActionBtn
            c={c}
            icon="clock"
            label="Cambios pendientes"
            description={`${stats?.pendingChanges ?? 0} correcciones pendientes de revisión`}
            onPress={() => router.push('/admin/changes' as any)}
            testID="admin-changes"
          />
        </View>

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: c.surfaceSecondary }]}>
            <Feather name="hard-drive" size={17} color={c.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: c.onSurface }]}>
              Importación / Exportación
            </Text>
            <Text style={[styles.sectionSubtitle, { color: c.muted }]}>
              Seguridad y restauración de la base
            </Text>
          </View>
        </View>
        <View style={[styles.actionCard, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
          <ActionBtn
            c={c}
            icon="download"
            label="Exportar backup"
            description="Guardar una copia completa en formato JSON"
            onPress={doExport}
            busy={busy === 'export'}
            testID="admin-export"
          />
          <ActionBtn
            c={c}
            icon="rotate-ccw"
            label="Restaurar backup"
            description="Recuperar la base desde un archivo JSON"
            onPress={doRestore}
            busy={busy === 'restore'}
            testID="admin-restore"
          />
        </View>

        {msg ? <Text style={{ color: c.info, marginTop: SPACING.md, textAlign: 'center' }} testID="admin-msg">{msg}</Text> : null}
        {/* ADMFC 7AA.42: removido bloco legado de importação CSV/XLSX. */}

        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIcon, { backgroundColor: c.surfaceSecondary }]}>
            <Feather name="info" size={17} color={c.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: c.onSurface }]}>
              Notas
            </Text>
            <Text style={[styles.sectionSubtitle, { color: c.muted }]}>
              Información del módulo administrativo
            </Text>
          </View>
        </View>
        <Text style={{ color: c.muted, fontSize: 13, lineHeight: 20 }}>
          {/* ADMFC 7AA.40: notas atualizadas ao estado real do painel administrativo. */}
          • El Editor de Himnos permite corregir título, letra, número, equivalencias y demás datos administrables.{'\n'}
          • Las modificaciones reales quedan registradas en Cambios pendientes para su revisión y exportación.{'\n'}
          • El backup conserva los himnos, categorías y correcciones pendientes en formato JSON.
        </Text>
      </ScrollView>
    </SafeAreaView>

    <Modal
      visible={!!restoreConfirm}
      transparent
      animationType="fade"
      onRequestClose={() => setRestoreConfirm(null)}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
            },
          ]}
        >
          <View
            style={[
              styles.modalIcon,
              { backgroundColor: c.surfaceSecondary },
            ]}
          >
            <Feather
              name="alert-triangle"
              size={28}
              color={c.error}
            />
          </View>

          <Text
            style={[
              styles.modalTitle,
              { color: c.onSurface },
            ]}
          >
            Restaurar backup
          </Text>

          <Text
            style={[
              styles.modalText,
              { color: c.muted },
            ]}
          >
            Este archivo contiene{' '}
            <Text style={{ fontWeight: '800', color: c.onSurface }}>
              {restoreConfirm?.hymnCount ?? 0} himnos
            </Text>
            . La restauración reemplazará la base local actual y
            restaurará también las correcciones pendientes guardadas
            en este backup.
          </Text>

          <Text
            style={[
              styles.modalWarning,
              { color: c.error },
            ]}
          >
            Esta acción reemplazará los datos locales actuales.
          </Text>

          <View style={styles.modalActions}>
            <Pressable
              onPress={() => setRestoreConfirm(null)}
              style={[
                styles.modalButton,
                {
                  borderColor: c.borderStrong,
                  backgroundColor: c.surfaceSecondary,
                },
              ]}
            >
              <Feather
                name="x"
                size={18}
                color={c.onSurface}
              />
              <Text
                style={[
                  styles.modalButtonText,
                  { color: c.onSurface },
                ]}
              >
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={confirmRestore}
              style={[
                styles.modalButton,
                styles.modalDangerButton,
                { backgroundColor: c.error },
              ]}
            >
              <Feather
                name="rotate-ccw"
                size={18}
                color={c.onSurfaceInverse}
              />
              <Text
                style={[
                  styles.modalButtonText,
                  { color: c.onSurfaceInverse },
                ]}
              >
                Restaurar backup
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
    </>
  );
}

function Stat({ label, value, c }: any) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: c.brand, fontSize: 26, fontWeight: '800' }}>{value ?? '—'}</Text>
      <Text style={{ color: c.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
function ActionBtn({ c, icon, label, description, onPress, busy, testID }: any) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[
        styles.actionBtn,
        {
          borderColor: c.border,
          backgroundColor: c.surface,
          opacity: busy ? 0.6 : 1,
        },
      ]}
      testID={testID}
    >
      <View
        style={[
          styles.actionIconBox,
          { backgroundColor: c.surfaceSecondary },
        ]}
      >
        <Feather name={icon} size={20} color={c.brand} />
      </View>

      <View style={styles.actionTextBox}>
        <Text
          numberOfLines={2}
          style={[styles.actionTitle, { color: c.onSurface }]}
        >
          {label}
        </Text>

        {description ? (
          <Text
            numberOfLines={2}
            style={[styles.actionDescription, { color: c.muted }]}
          >
            {description}
          </Text>
        ) : null}
      </View>

      <View style={styles.actionEnd}>
        {busy ? (
          <ActivityIndicator size="small" color={c.brand} />
        ) : (
          <Feather name="chevron-right" size={20} color={c.muted} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  statCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.lg,
  },

  statRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },

  section: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: SPACING.xl,
    marginBottom: 10,
    minHeight: 48,
  },

  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  sectionSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 1,
  },

  actionCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 10,
    gap: 9,
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    minHeight: 74,
  },

  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  actionTextBox: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 8,
  },

  actionTitle: {
    fontSize: 14.5,
    lineHeight: 19,
    fontWeight: '800',
  },

  actionDescription: {
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 3,
  },

  actionEnd: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  // ADMFC 7AA.41 — confirmação visual segura de restauração.
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  modalText: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  modalWarning: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  modalActions: {
    width: '100%',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  modalButton: {
    minHeight: 52,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  modalDangerButton: {
    borderWidth: 0,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
