import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, Pressable, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api } from '@/src/lib/api';

export default function AdminCategories() {
  const router = useRouter();
  const { c } = useTheme();
  const [cats, setCats] = useState<{ id: string; name: string; count?: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [msg, setMsg] = useState('');
  const [edit, setEdit] = useState<null | { id: string; name: string }>(null);
  const [editName, setEditName] = useState('');
  const [del, setDel] = useState<null | { id: string; name: string; count?: number }>(null);

  const load = useCallback(async () => {
    try { await api.me(); } catch { router.replace('/admin-login' as any); return; }
    setLoading(true);
    try { const r = await api.listCategories(); setCats(r.items); } finally { setLoading(false); }
  }, [router]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    const n = newName.trim(); if (!n) return;
    try { await api.createCategory(n); setNewName(''); setMsg(''); load(); }
    catch (e: any) { setMsg(e?.message || 'Error'); }
  };
  const rename = async () => {
    if (!edit) return;
    try { await api.renameCategory(edit.id, editName.trim()); setEdit(null); load(); }
    catch (e: any) { setMsg(e?.message || 'Error'); setEdit(null); }
  };
  const remove = async () => {
    if (!del) return;
    try { await api.deleteCategory(del.id); setDel(null); load(); }
    catch (e: any) { setMsg(e?.message || 'Error'); setDel(null); }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="admin-categories-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="chevron-left" size={28} color={c.brand} /></Pressable>
        <Text style={[styles.title, { color: c.brand }]}>Categorías</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm }}>
          <TextInput value={newName} onChangeText={setNewName} placeholder="Nueva categoría…" placeholderTextColor={c.muted}
            style={[styles.input, { flex: 1, backgroundColor: c.surfaceSecondary, borderColor: c.border, color: c.onSurface }]} testID="cat-new-input" />
          <Pressable onPress={create} style={[styles.addBtn, { backgroundColor: c.brand }]} testID="cat-create">
            <Feather name="plus" size={20} color={c.onSurfaceInverse} />
          </Pressable>
        </View>
        {msg ? <Text style={{ color: c.error, textAlign: 'center', marginBottom: 6 }}>{msg}</Text> : null}
        {loading ? <ActivityIndicator color={c.brand} style={{ marginTop: SPACING.xl }} /> : (
          <FlatList data={cats} keyExtractor={(x) => x.id}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg, paddingBottom: SPACING.xxxl }}
            ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />}
            renderItem={({ item }) => (
              <View style={styles.row} testID={`cat-row-${item.name}`}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.onSurface, fontSize: 15, fontWeight: '600' }}>{item.name}</Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>{item.count ?? 0} himnos</Text>
                </View>
                <Pressable onPress={() => { setEdit(item); setEditName(item.name); }} hitSlop={8} style={{ padding: 8 }} testID={`cat-edit-${item.name}`}>
                  <Feather name="edit-2" size={18} color={c.brand} />
                </Pressable>
                <Pressable onPress={() => setDel(item)} hitSlop={8} style={{ padding: 8 }} testID={`cat-delete-${item.name}`}>
                  <Feather name="trash-2" size={18} color={c.error} />
                </Pressable>
              </View>
            )} />
        )}
      </KeyboardAvoidingView>

      <Modal visible={!!edit} transparent animationType="fade" onRequestClose={() => setEdit(null)}>
        <View style={styles.mWrap}><View style={[styles.mCard, { backgroundColor: c.surface }]}>
          <Text style={{ color: c.onSurface, fontWeight: '700', fontSize: 16, marginBottom: SPACING.md }}>Renombrar categoría</Text>
          <TextInput value={editName} onChangeText={setEditName} autoFocus
            style={[styles.input, { backgroundColor: c.surfaceSecondary, borderColor: c.border, color: c.onSurface }]} testID="cat-rename-input" />
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg }}>
            <Pressable onPress={() => setEdit(null)} style={[styles.mBtn, { borderColor: c.border }]}><Text style={{ color: c.onSurface, fontWeight: '600' }}>Cancelar</Text></Pressable>
            <Pressable onPress={rename} style={[styles.mBtn, { backgroundColor: c.brand, borderColor: c.brand }]} testID="cat-rename-save"><Text style={{ color: '#fff', fontWeight: '700' }}>Guardar</Text></Pressable>
          </View>
        </View></View>
      </Modal>

      <Modal visible={!!del} transparent animationType="fade" onRequestClose={() => setDel(null)}>
        <View style={styles.mWrap}><View style={[styles.mCard, { backgroundColor: c.surface }]}>
          <Text style={{ color: c.onSurface, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>¿Eliminar &quot;{del?.name}&quot;?</Text>
          <Text style={{ color: c.muted, textAlign: 'center', marginTop: 6 }}>Se quitará de {del?.count ?? 0} himnos. No se eliminan los himnos.</Text>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg }}>
            <Pressable onPress={() => setDel(null)} style={[styles.mBtn, { borderColor: c.border }]}><Text style={{ color: c.onSurface, fontWeight: '600' }}>Cancelar</Text></Pressable>
            <Pressable onPress={remove} style={[styles.mBtn, { backgroundColor: c.error, borderColor: c.error }]} testID="cat-delete-confirm"><Text style={{ color: '#fff', fontWeight: '700' }}>Eliminar</Text></Pressable>
          </View>
        </View></View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  input: { height: 48, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, fontSize: 15 },
  addBtn: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, minHeight: 56 },
  mWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  mCard: { width: '100%', maxWidth: 360, borderRadius: RADIUS.lg, padding: SPACING.xl },
  mBtn: { flex: 1, height: 46, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
