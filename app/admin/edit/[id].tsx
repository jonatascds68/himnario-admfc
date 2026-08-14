import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, Hymn, Bloque, getSections } from '@/src/lib/api';

const GT = 'Gloria y Triunfo';
const SN = 'Himnos de Sión';

interface BlockState { tipo: 'estrofa' | 'coro'; numero: string; texto: string; }

export default function EditHymn() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [hymn, setHymn] = useState<Hymn | null>(null);
  const [himnario, setHimnario] = useState<Hymn['himnario']>(GT);
  const [numero, setNumero] = useState('');
  const [titulo, setTitulo] = useState('');
  const [blocks, setBlocks] = useState<BlockState[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [allCats, setAllCats] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState('');

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState('');
  const [pickerResults, setPickerResults] = useState<Hymn[]>([]);
  const [confirm, setConfirm] = useState<null | { kind: 'save' | 'delete' | 'delblock'; idx?: number }>(null);
  const [newCat, setNewCat] = useState('');

  const loadCats = useCallback(async () => {
    try { const r = await api.listCategories(); setAllCats(r.items); } catch {}
  }, []);

  const load = useCallback(async () => {
    try { await api.me(); } catch { router.replace('/admin-login' as any); return; }
    await loadCats();
    if (isNew) { setLoading(false); return; }
    setLoading(true);
    try {
      const h = await api.getHymn(id!);
      setHymn(h); setHimnario(h.himnario); setNumero(String(h.numero));
      setTitulo(h.titulo); setSelectedCats(h.categorias || []);
      const secs = getSections(h);
      setBlocks(secs.map((s) => ({
        tipo: s.kind === 'chorus' ? 'coro' : 'estrofa',
        numero: s.index != null ? String(s.index) : '',
        texto: s.text,
      })));
    } catch { setMsg('No se pudo cargar'); } finally { setLoading(false); }
  }, [id, isNew, router, loadCats]);
  useEffect(() => { load(); }, [load]);

  const otherHim = himnario === GT ? SN : GT;
  const otherKey = himnario === GT ? 'sion' : 'gt';

  const toBloques = (): Bloque[] => blocks.map((b) => ({
    tipo: b.tipo,
    numero: b.tipo === 'estrofa' && b.numero ? parseInt(b.numero, 10) : null,
    texto: b.texto,
  }));

  const doSave = async () => {
    setConfirm(null); setSaving(true); setMsg('');
    try {
      const n = parseInt(numero, 10);
      if (!n || !titulo.trim()) { setMsg('Número y título son obligatorios'); setSaving(false); return; }
      const payload: Partial<Hymn> = {
        himnario, numero: n, titulo: titulo.trim(),
        categorias: selectedCats, bloques: toBloques(),
      };
      if (isNew) {
        const created = await api.createHymn(payload);
        setMsg('Himno creado'); router.replace(`/admin/edit/${created.id}` as any);
      } else {
        const updated = await api.updateHymn(hymn!.id, payload);
        setHymn(updated); setMsg('Cambios guardados');
      }
    } catch (e: any) { setMsg(e?.message || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const doDelete = async () => {
    setConfirm(null); setSaving(true);
    try { await api.deleteHymn(hymn!.id); router.back(); }
    catch (e: any) { setMsg(e?.message || 'Error al eliminar'); setSaving(false); }
  };

  // block ops
  const updBlock = (i: number, patch: Partial<BlockState>) =>
    setBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, ...patch } : b));
  const addBlock = () => setBlocks((prev) => [...prev, { tipo: 'estrofa', numero: String(prev.filter((b) => b.tipo === 'estrofa').length + 1), texto: '' }]);
  const moveBlock = (i: number, dir: -1 | 1) => setBlocks((prev) => {
    const j = i + dir; if (j < 0 || j >= prev.length) return prev;
    const cp = [...prev]; const t = cp[i]; cp[i] = cp[j]; cp[j] = t; return cp;
  });
  const delBlock = (i: number) => { setConfirm(null); setBlocks((prev) => prev.filter((_, idx) => idx !== i)); };

  // categories
  const toggleCat = (name: string) =>
    setSelectedCats((prev) => prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]);
  const createCat = async () => {
    const name = newCat.trim(); if (!name) return;
    try { await api.createCategory(name); setNewCat(''); await loadCats(); setSelectedCats((p) => [...p, name]); }
    catch (e: any) { setMsg(e?.message || 'Error'); }
  };

  // equivalence
  const openPicker = () => { setPickerQ(''); setPickerResults([]); setPickerOpen(true); searchPicker(''); };
  const searchPicker = async (query: string) => {
    try { const r = await api.listHymns({ himnario: otherKey as any, q: query || undefined }); setPickerResults(r.items.slice(0, 60)); }
    catch { setPickerResults([]); }
  };
  useEffect(() => { if (pickerOpen) { const t = setTimeout(() => searchPicker(pickerQ), 220); return () => clearTimeout(t); } }, [pickerQ, pickerOpen]);
  const linkEquiv = async (target: Hymn) => {
    setPickerOpen(false); setSaving(true); setMsg('');
    try { const res = await api.setEquivalence(hymn!.id, otherKey as any, target.numero); setHymn(res.hymn); setMsg(`Equivalencia: ${otherHim} Nº ${target.numero}`); }
    catch (e: any) { setMsg(e?.message || 'Error al vincular'); } finally { setSaving(false); }
  };
  const unlinkEquiv = async () => {
    setSaving(true); setMsg('');
    try { const res = await api.removeEquivalence(hymn!.id); setHymn(res.hymn); setMsg('Equivalencia eliminada'); }
    catch (e: any) { setMsg(e?.message || 'Error'); } finally { setSaving(false); }
  };

  if (loading) return <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}><ActivityIndicator color={c.brand} style={{ marginTop: SPACING.xxxl }} /></SafeAreaView>;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="admin-edit-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}><Feather name="chevron-left" size={28} color={c.brand} /></Pressable>
        <Text style={[styles.title, { color: c.brand }]}>{isNew ? 'Nuevo Himno' : 'Editar Himno'}</Text>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
          <Label c={c}>Himnario</Label>
          <View style={{ flexDirection: 'row', gap: SPACING.sm }}>
            {([GT, SN] as Hymn['himnario'][]).map((h) => {
              const active = himnario === h;
              return (
                <Pressable key={h} onPress={() => setHimnario(h)}
                  style={[styles.himBtn, { borderColor: active ? c.brand : c.border, backgroundColor: active ? c.brand : c.surfaceSecondary }]}
                  testID={`edit-him-${h === GT ? 'gt' : 'sion'}`}>
                  <Text style={{ color: active ? c.onSurfaceInverse : c.onSurface, fontWeight: '600', fontSize: 13 }}>{h}</Text>
                </Pressable>
              );
            })}
          </View>

          <Label c={c}>Número</Label>
          <TextInput value={numero} onChangeText={setNumero} keyboardType="number-pad" placeholder="Nº"
            placeholderTextColor={c.muted} style={[styles.input, { backgroundColor: c.surfaceSecondary, borderColor: c.border, color: c.onSurface }]} testID="edit-numero" />

          <Label c={c}>Título</Label>
          <TextInput value={titulo} onChangeText={setTitulo} placeholder="Título del himno"
            placeholderTextColor={c.muted} style={[styles.input, { backgroundColor: c.surfaceSecondary, borderColor: c.border, color: c.onSurface }]} testID="edit-titulo" />

          {/* CATEGORIES */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label c={c}>Categorías</Label>
            <Pressable onPress={() => router.push('/admin/categories' as any)} hitSlop={8}>
              <Text style={{ color: c.info, fontSize: 12, marginTop: SPACING.lg }}>Gestionar</Text>
            </Pressable>
          </View>
          <View style={styles.chipsWrap}>
            {allCats.map((cat) => {
              const on = selectedCats.includes(cat.name);
              return (
                <Pressable key={cat.id} onPress={() => toggleCat(cat.name)}
                  style={[styles.catChip, { backgroundColor: on ? c.brand : c.surfaceSecondary, borderColor: on ? c.brand : c.border }]}
                  testID={`edit-cat-${cat.name}`}>
                  {on ? <Feather name="check" size={13} color={c.onSurfaceInverse} /> : null}
                  <Text style={{ color: on ? c.onSurfaceInverse : c.onSurface, fontSize: 12.5, fontWeight: '600' }}>{cat.name}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
            <TextInput value={newCat} onChangeText={setNewCat} placeholder="Nueva categoría…" placeholderTextColor={c.muted}
              style={[styles.input, { flex: 1, height: 44, backgroundColor: c.surfaceSecondary, borderColor: c.border, color: c.onSurface }]} testID="edit-new-cat" />
            <Pressable onPress={createCat} style={[styles.addCatBtn, { borderColor: c.brand }]} testID="edit-create-cat">
              <Feather name="plus" size={18} color={c.brand} />
            </Pressable>
          </View>

          {/* STRUCTURE / BLOCKS */}
          <Label c={c}>Estructura de la letra</Label>
          <Text style={{ color: c.muted, fontSize: 12, marginBottom: SPACING.sm }}>
            Cada bloque es una ESTROFA o el CORO. Solo el CORO recibe el destaque visual.
          </Text>
          {blocks.map((b, i) => (
            <View key={i} style={[styles.blockCard, { borderColor: b.tipo === 'coro' ? c.brandSecondary : c.border, backgroundColor: c.surfaceSecondary }]} testID={`block-${i}`}>
              <View style={styles.blockHead}>
                <Pressable onPress={() => updBlock(i, { tipo: b.tipo === 'estrofa' ? 'coro' : 'estrofa' })}
                  style={[styles.typeToggle, { backgroundColor: b.tipo === 'coro' ? c.brandSecondary : c.brand }]} testID={`block-type-${i}`}>
                  <Text style={{ color: b.tipo === 'coro' ? c.brand : c.onSurfaceInverse, fontWeight: '800', fontSize: 11, letterSpacing: 1 }}>
                    {b.tipo === 'coro' ? 'CORO' : 'ESTROFA'}
                  </Text>
                </Pressable>
                {b.tipo === 'estrofa' ? (
                  <TextInput value={b.numero} onChangeText={(v) => updBlock(i, { numero: v.replace(/[^0-9]/g, '') })}
                    keyboardType="number-pad" placeholder="Nº" placeholderTextColor={c.muted}
                    style={[styles.numInput, { borderColor: c.border, color: c.onSurface }]} testID={`block-num-${i}`} />
                ) : <View style={{ flex: 1 }} />}
                <Pressable onPress={() => moveBlock(i, -1)} hitSlop={6} disabled={i === 0} testID={`block-up-${i}`}><Feather name="chevron-up" size={20} color={i === 0 ? c.divider : c.muted} /></Pressable>
                <Pressable onPress={() => moveBlock(i, 1)} hitSlop={6} disabled={i === blocks.length - 1} testID={`block-down-${i}`}><Feather name="chevron-down" size={20} color={i === blocks.length - 1 ? c.divider : c.muted} /></Pressable>
                <Pressable onPress={() => setConfirm({ kind: 'delblock', idx: i })} hitSlop={6} testID={`block-del-${i}`}><Feather name="trash-2" size={18} color={c.error} /></Pressable>
              </View>
              <TextInput value={b.texto} onChangeText={(v) => updBlock(i, { texto: v })} multiline textAlignVertical="top"
                placeholder="Texto del bloque…" placeholderTextColor={c.muted}
                style={[styles.blockText, { color: c.onSurface }]} testID={`block-text-${i}`} />
            </View>
          ))}
          <Pressable onPress={addBlock} style={[styles.addBlockBtn, { borderColor: c.brand }]} testID="add-block">
            <Feather name="plus" size={16} color={c.brand} />
            <Text style={{ color: c.brand, fontWeight: '600' }}>Agregar bloque</Text>
          </Pressable>

          {/* EQUIVALENCE */}
          {!isNew && (
            <>
              <Label c={c}>Equivalencia</Label>
              <View style={[styles.equivBox, { borderColor: c.border, backgroundColor: c.surfaceSecondary }]}>
                {hymn?.numero_equivalente ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                    <Feather name="link" size={16} color={c.brand} />
                    <Text style={{ color: c.onSurface, flex: 1 }}>{otherHim} — Nº {hymn.numero_equivalente}</Text>
                    <Pressable onPress={unlinkEquiv} style={[styles.smallBtn, { borderColor: c.error }]} testID="edit-remove-equiv">
                      <Text style={{ color: c.error, fontSize: 12, fontWeight: '600' }}>Quitar</Text>
                    </Pressable>
                  </View>
                ) : <Text style={{ color: c.muted }}>Sin equivalencia registrada</Text>}
                <Pressable onPress={openPicker} style={[styles.linkBtn, { borderColor: c.brand }]} testID="edit-add-equiv">
                  <Feather name="plus" size={16} color={c.brand} />
                  <Text style={{ color: c.brand, fontWeight: '600' }}>{hymn?.numero_equivalente ? 'Cambiar equivalencia' : `Vincular con ${otherHim}`}</Text>
                </Pressable>
              </View>
            </>
          )}

          {msg ? <Text style={{ color: c.info, marginTop: SPACING.md, textAlign: 'center' }} testID="edit-msg">{msg}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.divider }]}>
        {!isNew && (
          <Pressable onPress={() => setConfirm({ kind: 'delete' })} style={[styles.delBtn, { borderColor: c.error }]} testID="edit-delete">
            <Feather name="trash-2" size={18} color={c.error} />
          </Pressable>
        )}
        <Pressable onPress={() => setConfirm({ kind: 'save' })} disabled={saving} style={[styles.saveBtn, { backgroundColor: c.brand, opacity: saving ? 0.6 : 1 }]} testID="edit-save">
          {saving ? <ActivityIndicator color={c.onSurfaceInverse} /> : <Text style={{ color: c.onSurfaceInverse, fontWeight: '700', fontSize: 15 }}>{isNew ? 'Crear himno' : 'Guardar cambios'}</Text>}
        </Pressable>
      </View>

      {/* Equivalence picker */}
      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalWrap}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <View style={styles.modalHead}>
              <Text style={{ color: c.brand, fontSize: 16, fontWeight: '800' }}>Buscar en {otherHim}</Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={10}><Feather name="x" size={24} color={c.onSurface} /></Pressable>
            </View>
            <View style={[styles.box, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
              <Feather name="search" size={18} color={c.muted} />
              <TextInput value={pickerQ} onChangeText={setPickerQ} placeholder="Número o título…" placeholderTextColor={c.muted}
                style={{ flex: 1, color: c.onSurface, fontSize: 15, paddingVertical: 4 }} autoFocus testID="equiv-picker-search" />
            </View>
            <FlatList data={pickerResults} keyExtractor={(h) => h.id} style={{ marginTop: SPACING.sm }} keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.divider }} />}
              renderItem={({ item }) => (
                <Pressable onPress={() => linkEquiv(item)} style={styles.pickRow} testID={`equiv-pick-${item.id}`}>
                  <Text style={{ color: c.brand, fontWeight: '800', width: 44 }}>{item.numero}</Text>
                  <Text style={{ color: c.onSurface, flex: 1 }} numberOfLines={1}>{item.titulo}</Text>
                  <Feather name="link" size={16} color={c.muted} />
                </Pressable>
              )}
              ListEmptyComponent={<Text style={{ color: c.muted, textAlign: 'center', padding: SPACING.lg }}>Sin resultados</Text>} />
          </View>
        </View>
      </Modal>

      {/* Confirm */}
      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.confirmWrap}>
          <View style={[styles.confirmCard, { backgroundColor: c.surface }]}>
            <Text style={{ color: c.onSurface, fontSize: 16, fontWeight: '700', textAlign: 'center' }}>
              {confirm?.kind === 'delete' ? '¿Eliminar este himno?' : confirm?.kind === 'delblock' ? '¿Eliminar este bloque?' : '¿Guardar los cambios?'}
            </Text>
            {confirm?.kind === 'delete' ? <Text style={{ color: c.muted, textAlign: 'center', marginTop: 6 }}>Esta acción no se puede deshacer.</Text> : null}
            <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg }}>
              <Pressable onPress={() => setConfirm(null)} style={[styles.confirmBtn, { borderColor: c.border }]} testID="confirm-cancel">
                <Text style={{ color: c.onSurface, fontWeight: '600' }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={() => confirm?.kind === 'delete' ? doDelete() : confirm?.kind === 'delblock' ? delBlock(confirm.idx!) : doSave()}
                style={[styles.confirmBtn, { backgroundColor: confirm?.kind === 'save' ? c.brand : c.error, borderColor: confirm?.kind === 'save' ? c.brand : c.error }]} testID="confirm-ok">
                <Text style={{ color: '#fff', fontWeight: '700' }}>{confirm?.kind === 'save' ? 'Guardar' : 'Eliminar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Label({ children, c }: any) {
  return <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginTop: SPACING.lg, marginBottom: 6 }}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.md },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  input: { height: 50, borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, fontSize: 15 },
  himBtn: { flex: 1, height: 46, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 12, borderRadius: RADIUS.pill, borderWidth: 1 },
  addCatBtn: { width: 44, height: 44, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  blockCard: { borderRadius: RADIUS.md, borderWidth: 1.5, padding: SPACING.md, marginBottom: SPACING.sm },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  typeToggle: { paddingHorizontal: 10, height: 30, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  numInput: { width: 48, height: 34, borderRadius: RADIUS.sm, borderWidth: 1, textAlign: 'center', paddingVertical: 0 },
  blockText: { minHeight: 90, fontSize: 15, lineHeight: 22, paddingTop: 4 },
  addBlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: RADIUS.md, borderWidth: 1.5, marginTop: SPACING.xs },
  equivBox: { borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.md, gap: SPACING.md },
  linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: RADIUS.md, borderWidth: 1 },
  smallBtn: { paddingHorizontal: 12, height: 32, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: SPACING.sm, padding: SPACING.md, borderTopWidth: 1 },
  delBtn: { width: 52, height: 52, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { flex: 1, height: 52, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  box: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 8, borderRadius: RADIUS.lg, borderWidth: 1 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { height: '80%', borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.md },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, minHeight: 48 },
  confirmWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  confirmCard: { width: '100%', maxWidth: 360, borderRadius: RADIUS.lg, padding: SPACING.xl },
  confirmBtn: { flex: 1, height: 48, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
