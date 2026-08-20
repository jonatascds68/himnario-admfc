import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, Hymn, Bloque, getSections, MediaProvenanceType } from '@/src/lib/api';

const GT = 'Gloria y Triunfo';
const SN = 'Himnos de Sión';

interface BlockState {
  tipo: 'estrofa' | 'coro';
  numero: string;
  texto: string;
  cifras: string[];
}

function textLines(texto: string): string[] {
  return (texto || '').replace(/\r\n/g, '\n').split('\n');
}

function chordLineFromSegments(
  segmentos: { texto: string; acorde?: string | null }[]
): string {
  let out = '';
  let pos = 0;

  for (const seg of segmentos) {
    if (seg.acorde) {
      if (out.length < pos) {
        out += ' '.repeat(pos - out.length);
      }
      out += seg.acorde;
    }

    pos += (seg.texto || '').length;
  }

  return out.replace(/\s+$/g, '');
}

function parseChordLine(
  letra: string,
  cifra: string
): { texto: string; acorde?: string | null }[] {
  const lyric = letra || '';

  const chords = Array.from(
    (cifra || '').matchAll(/\S+/g)
  ).map((m) => ({
    acorde: m[0],
    pos: Math.min(m.index ?? 0, lyric.length),
  }));

  if (!chords.length) {
    return [{ texto: lyric }];
  }

  const out: { texto: string; acorde?: string | null }[] = [];

  if (chords[0].pos > 0) {
    out.push({
      texto: lyric.slice(0, chords[0].pos),
    });
  }

  chords.forEach((item, index) => {
    const nextPos =
      index + 1 < chords.length
        ? chords[index + 1].pos
        : lyric.length;

    out.push({
      acorde: item.acorde,
      texto: lyric.slice(item.pos, nextPos),
    });
  });

  return out.filter(
    (item) => item.texto.length > 0 || !!item.acorde
  );
}

export default function EditHymn() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { c } = useTheme();
const insets = useSafeAreaInsets();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [hymn, setHymn] = useState<Hymn | null>(null);
  const [himnario, setHimnario] = useState<Hymn['himnario']>(GT);
  const [numero, setNumero] = useState('');
  const [titulo, setTitulo] = useState('');
  const [blocks, setBlocks] = useState<BlockState[]>([]);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [allCats, setAllCats] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState('');

  const [tom, setTom] = useState('');
  const [cifraUrl, setCifraUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [externalAudioUrl, setExternalAudioUrl] = useState('');
  const [audioLocal, setAudioLocal] = useState('');
  const [originalAudioLocal, setOriginalAudioLocal] = useState('');
  const [cifraAutorizada, setCifraAutorizada] = useState(false);
  const [audioAutorizado, setAudioAutorizado] = useState(false);

  const [cifraFuente, setCifraFuente] = useState('');
  const [cifraTipo, setCifraTipo] =
    useState<MediaProvenanceType>('desconocido');
  const [cifraNotas, setCifraNotas] = useState('');

  const [audioFuente, setAudioFuente] = useState('');
  const [audioTipo, setAudioTipo] =
    useState<MediaProvenanceType>('desconocido');
  const [audioNotas, setAudioNotas] = useState('');

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
      setTom(h.tom || '');
      setCifraUrl(h.cifra_url || '');
      setAudioUrl(h.audio_url || '');
      setExternalAudioUrl(h.audio_external_url || '');
      setAudioLocal(h.audio_local || '');
      setOriginalAudioLocal(h.audio_local || '');
      setCifraAutorizada(!!h.cifra_autorizada);
      setAudioAutorizado(!!h.audio_autorizado);

      setCifraFuente(h.cifra_procedencia?.fuente || '');
      setCifraTipo(
        h.cifra_procedencia?.tipo || 'desconocido'
      );
      setCifraNotas(h.cifra_procedencia?.notas || '');

      setAudioFuente(h.audio_procedencia?.fuente || '');
      setAudioTipo(
        h.audio_procedencia?.tipo || 'desconocido'
      );
      setAudioNotas(h.audio_procedencia?.notas || '');
      const secs = getSections(h);
      setBlocks(secs.map((sec, secIndex) => {
        const tipo =
          sec.kind === 'chorus' ? 'coro' : 'estrofa';

        const numero =
          sec.index != null ? String(sec.index) : '';

        const cifraBlock = h.cifra_bloques?.find((cb) => {
          if (tipo === 'coro') return cb.tipo === 'coro';

          return (
            cb.tipo === 'estrofa' &&
            cb.numero === (sec.index ?? secIndex + 1)
          );
        });

        const cifras = textLines(sec.text).map(
          (_, lineIndex) => {
            const linha = cifraBlock?.lineas?.[lineIndex];

            return linha
              ? chordLineFromSegments(linha.segmentos)
              : '';
          }
        );

        return {
          tipo,
          numero,
          texto: sec.text,
          cifras,
        };
      }));
    } catch { setMsg('No se pudo cargar'); } finally { setLoading(false); }
  }, [id, isNew, router, loadCats]);
  useEffect(() => { load(); }, [load]);

  const isManagedAudio = (uri?: string | null) => {
    const base = FileSystem.documentDirectory;

    return !!(
      uri &&
      base &&
      uri.startsWith(`${base}audios/`)
    );
  };

  const deleteManagedAudio = async (
    uri?: string | null
  ) => {
    if (!isManagedAudio(uri)) return;

    try {
      const info = await FileSystem.getInfoAsync(uri!);

      if (info.exists) {
        await FileSystem.deleteAsync(uri!, {
          idempotent: true,
        });
      }
    } catch {}
  };

  const removeLocalAudio = async () => {
    // Se é um arquivo novo ainda não salvo, pode apagar já.
    if (
      audioLocal &&
      audioLocal !== originalAudioLocal
    ) {
      await deleteManagedAudio(audioLocal);
    }

    setAudioLocal('');
  };

  const pickLocalAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];

        const dir = `${FileSystem.documentDirectory}audios/`;
        const info = await FileSystem.getInfoAsync(dir);

        if (!info.exists) {
          await FileSystem.makeDirectoryAsync(dir, {
            intermediates: true,
          });
        }

        const safeName = asset.name.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        );

        const destination =
          `${dir}${Date.now()}-${safeName}`;

        await FileSystem.copyAsync({
          from: asset.uri,
          to: destination,
        });

        if (
          audioLocal &&
          audioLocal !== originalAudioLocal
        ) {
          await deleteManagedAudio(audioLocal);
        }

        setAudioLocal(destination);
      }
    } catch (e: any) {
      setMsg(e?.message || 'No se pudo seleccionar el audio');
    }
  };

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
      const external = externalAudioUrl.trim();

      if (
        external &&
        !/^https?:\/\//i.test(external)
      ) {
        setMsg(
          'El enlace externo debe comenzar con http:// o https://'
        );
        setSaving(false);
        return;
      }

      const fullPayload: Partial<Hymn> = {
        himnario, numero: n, titulo: titulo.trim(),
        categorias: selectedCats,
        bloques: toBloques(),
        cifra_bloques: toCifraBloques(),
        tom: tom.trim() || null,
        cifra_url: cifraUrl.trim() || null,
        audio_url: audioUrl.trim() || null,
        audio_external_url: external || null,
        cifra_autorizada: cifraAutorizada,
        audio_autorizado: audioAutorizado,

        cifra_procedencia: {
          fuente: cifraFuente.trim() || null,
          tipo: cifraTipo,
          autorizado: cifraAutorizada,
          notas: cifraNotas.trim() || null,
        },

        audio_procedencia: {
          fuente: audioFuente.trim() || null,
          tipo: audioTipo,
          autorizado: audioAutorizado,
          notas: audioNotas.trim() || null,
        },
        audio_local: audioLocal || null,
      };

      /*
       * ADMFC 7AA.39:
       * O formulário normaliza campos ausentes da Base Mestre.
       * Essas normalizações não podem virar correções
       * administrativas quando o usuário não alterou o conteúdo.
       */
      const payload: Partial<Hymn> = { ...fullPayload };

      if (!isNew && hymn) {
        const sameJson = (a: any, b: any) =>
          JSON.stringify(a) === JSON.stringify(b);

        /*
         * categorias ausentes e [] representam o mesmo estado
         * administrativo.
         */
        if (
          sameJson(
            hymn.categorias || [],
            selectedCats
          )
        ) {
          delete payload.categorias;
        }

        /*
         * A Base Mestre histórica usa "letra".
         * O editor converte essa letra para bloques ao carregar.
         * Só persistimos bloques quando as seções realmente
         * foram modificadas pelo administrador.
         */
        const originalBlocks: Bloque[] =
          getSections(hymn).map((sec) => ({
            tipo:
              sec.kind === 'chorus'
                ? 'coro'
                : 'estrofa',
            numero:
              sec.kind === 'verse'
                ? sec.index ?? null
                : null,
            texto: sec.text,
          }));

        if (
          sameJson(
            originalBlocks,
            toBloques()
          )
        ) {
          delete payload.bloques;
        }

        /*
         * cifra_bloques ausente e [] também são equivalentes
         * quando nenhuma cifra foi acrescentada.
         */
        if (
          sameJson(
            hymn.cifra_bloques || [],
            toCifraBloques()
          )
        ) {
          delete payload.cifra_bloques;
        }

        /*
         * Campos opcionais vazios não devem ser materializados
         * apenas porque o formulário utiliza valores padrão.
         */
        const optionalNullFields: (keyof Hymn)[] = [
          'tom',
          'cifra_url',
          'audio_url',
          'audio_external_url',
          'audio_local',
        ];

        for (const key of optionalNullFields) {
          const beforeValue = hymn[key] ?? null;
          const afterValue = payload[key] ?? null;

          if (sameJson(beforeValue, afterValue)) {
            delete (payload as any)[key];
          }
        }

        /*
         * Booleanos ausentes historicamente equivalem a false.
         */
        if (
          (hymn.cifra_autorizada ?? false) ===
          cifraAutorizada
        ) {
          delete payload.cifra_autorizada;
        }

        if (
          (hymn.audio_autorizado ?? false) ===
          audioAutorizado
        ) {
          delete payload.audio_autorizado;
        }

        /*
         * Proveniência precisa ser comparada semanticamente.
         * Ausência histórica equivale ao formulário padrão.
         */
        const normalizeProvenance = (value: any) => ({
          fuente: value?.fuente || null,
          tipo: value?.tipo || 'desconocido',
          autorizado: value?.autorizado ?? false,
          notas: value?.notas || null,
        });

        if (
          sameJson(
            normalizeProvenance(
              hymn.cifra_procedencia
            ),
            normalizeProvenance(
              fullPayload.cifra_procedencia
            )
          )
        ) {
          delete payload.cifra_procedencia;
        }

        if (
          sameJson(
            normalizeProvenance(
              hymn.audio_procedencia
            ),
            normalizeProvenance(
              fullPayload.audio_procedencia
            )
          )
        ) {
          delete payload.audio_procedencia;
        }
      }
      if (isNew) {
        const created = await api.createHymn(payload);
        setMsg('Himno creado'); router.replace(`/admin/edit/${created.id}` as any);
      } else {
        const updated = await api.updateHymn(hymn!.id, payload);

        if (
          originalAudioLocal &&
          originalAudioLocal !== audioLocal
        ) {
          await deleteManagedAudio(originalAudioLocal);
        }

        setOriginalAudioLocal(audioLocal);
        setHymn(updated);
        setMsg('Cambios guardados');
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
    setBlocks((prev) =>
      prev.map((b, idx) =>
        idx === i ? { ...b, ...patch } : b
      )
    );

  const updBlockText = (i: number, texto: string) =>
    setBlocks((prev) =>
      prev.map((b, idx) => {
        if (idx !== i) return b;

        const total = textLines(texto).length;

        return {
          ...b,
          texto,
          cifras: Array.from(
            { length: total },
            (_, lineIndex) => b.cifras?.[lineIndex] || ''
          ),
        };
      })
    );

  const updChordLine = (
    blockIndex: number,
    lineIndex: number,
    value: string
  ) =>
    setBlocks((prev) =>
      prev.map((b, idx) => {
        if (idx !== blockIndex) return b;

        const cifras = [...(b.cifras || [])];

        while (cifras.length < textLines(b.texto).length) {
          cifras.push('');
        }

        cifras[lineIndex] = value;

        return {
          ...b,
          cifras,
        };
      })
    );

  const toCifraBloques = (): NonNullable<Hymn['cifra_bloques']> =>
    blocks.flatMap((b) => {
      const hasChord = (b.cifras || []).some(
        (line) => line.trim().length > 0
      );

      if (!hasChord) return [];

      return [{
        tipo: b.tipo,
        numero:
          b.tipo === 'estrofa' && b.numero
            ? parseInt(b.numero, 10)
            : null,
        lineas: textLines(b.texto).map(
          (letra, lineIndex) => ({
            segmentos: parseChordLine(
              letra,
              b.cifras?.[lineIndex] || ''
            ),
          })
        ),
      }];
    });
  const addBlock = () =>
    setBlocks((prev) => [
      ...prev,
      {
        tipo: 'estrofa',
        numero: String(
          prev.filter((b) => b.tipo === 'estrofa').length + 1
        ),
        texto: '',
        cifras: [''],
      },
    ]);
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

          {/* CATEGORIES — ADMFC UI compacta */}
          <View style={styles.sectionHead}>
            <View>
              <Label c={c}>Categorías</Label>
              <Text style={[styles.sectionHint, { color: c.muted }]}>
                {selectedCats.length
                  ? `${selectedCats.length} seleccionada${selectedCats.length === 1 ? '' : 's'}`
                  : 'Sin categorías seleccionadas'}
              </Text>
            </View>

            <Pressable
              onPress={() => setCategoriesExpanded((v) => !v)}
              style={[
                styles.manageBtn,
                {
                  backgroundColor: c.surfaceSecondary,
                  borderColor: c.border,
                },
              ]}
            >
              <Feather
                name={categoriesExpanded ? 'chevron-up' : 'sliders'}
                size={15}
                color={c.brand}
              />
              <Text style={[styles.manageBtnText, { color: c.brand }]}>
                {categoriesExpanded ? 'Cerrar' : 'Gestionar'}
              </Text>
            </Pressable>
          </View>

          <View
            style={[
              styles.categorySummary,
              {
                backgroundColor: c.surfaceSecondary,
                borderColor: c.border,
              },
            ]}
          >
            {selectedCats.length ? (
              <View style={styles.chipsWrapCompact}>
                {selectedCats.slice(0, 4).map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => toggleCat(name)}
                    style={[
                      styles.catChipCompact,
                      {
                        backgroundColor: c.brand,
                        borderColor: c.brand,
                      },
                    ]}
                  >
                    <Feather
                      name="check"
                      size={12}
                      color={c.onSurfaceInverse}
                    />
                    <Text
                      numberOfLines={1}
                      style={{
                        color: c.onSurfaceInverse,
                        fontSize: 11.5,
                        fontWeight: '700',
                        maxWidth: 150,
                      }}
                    >
                      {name}
                    </Text>
                  </Pressable>
                ))}

                {selectedCats.length > 4 ? (
                  <Pressable
                    onPress={() => setCategoriesExpanded(true)}
                    style={[
                      styles.moreCatsChip,
                      { borderColor: c.borderStrong },
                    ]}
                  >
                    <Text style={{ color: c.brand, fontWeight: '800', fontSize: 12 }}>
                      +{selectedCats.length - 4}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <Pressable
                onPress={() => setCategoriesExpanded(true)}
                style={styles.emptyCategoryRow}
              >
                <Feather name="tag" size={17} color={c.muted} />
                <Text style={{ color: c.muted, fontSize: 13, flex: 1 }}>
                  Toque en Gestionar para seleccionar categorías
                </Text>
                <Feather name="chevron-right" size={17} color={c.muted} />
              </Pressable>
            )}

            {categoriesExpanded ? (
              <View
                style={[
                  styles.categoryManager,
                  { borderTopColor: c.border },
                ]}
              >
                <View style={styles.chipsWrap}>
                  {allCats.map((cat) => {
                    const on = selectedCats.includes(cat.name);

                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => toggleCat(cat.name)}
                        style={[
                          styles.catChip,
                          {
                            backgroundColor: on
                              ? c.brand
                              : c.surface,
                            borderColor: on
                              ? c.brand
                              : c.border,
                          },
                        ]}
                        testID={`edit-cat-${cat.name}`}
                      >
                        {on ? (
                          <Feather
                            name="check"
                            size={13}
                            color={c.onSurfaceInverse}
                          />
                        ) : null}

                        <Text
                          style={{
                            color: on
                              ? c.onSurfaceInverse
                              : c.onSurface,
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {cat.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.newCategoryRow}>
                  <TextInput
                    value={newCat}
                    onChangeText={setNewCat}
                    placeholder="Nueva categoría…"
                    placeholderTextColor={c.muted}
                    style={[
                      styles.input,
                      {
                        flex: 1,
                        height: 44,
                        backgroundColor: c.surface,
                        borderColor: c.border,
                        color: c.onSurface,
                      },
                    ]}
                    testID="edit-new-cat"
                  />

                  <Pressable
                    onPress={createCat}
                    style={[
                      styles.addCatBtn,
                      {
                        borderColor: c.brand,
                        backgroundColor: c.surface,
                      },
                    ]}
                    testID="edit-create-cat"
                  >
                    <Feather name="plus" size={18} color={c.brand} />
                  </Pressable>
                </View>

                <Pressable
                  onPress={() => router.push('/admin/categories' as any)}
                  style={styles.fullCategoryManager}
                >
                  <Feather name="settings" size={14} color={c.brand} />
                  <Text style={{ color: c.brand, fontSize: 12, fontWeight: '700' }}>
                    Administrar nombres y categorías
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* MUSICA / CIFRAS / AUDIO */}
          <Label c={c}>Música, cifras y audio</Label>

          <View
            style={[
              styles.musicBox,
              {
                backgroundColor: c.surfaceSecondary,
                borderColor: c.borderStrong,
              },
            ]}
          >
            <View style={styles.cardTitleRow}>
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: c.surface },
                ]}
              >
                <Feather name="music" size={18} color={c.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.onSurface }]}>
                  Recursos musicales
                </Text>
                <Text style={[styles.cardSubtitle, { color: c.muted }]}>
                  Tono, cifra y fuentes de audio
                </Text>
              </View>
            </View>
            <Text style={[styles.musicHelp, { color: c.muted }]}>
              Guarda solo datos livianos. El audio puede quedar en una URL externa o como referencia a un archivo local del dispositivo.
            </Text>

            <Text style={[styles.musicLabel, { color: c.onSurface }]}>Tono original</Text>
            <TextInput
              value={tom}
              onChangeText={setTom}
              placeholder="Ej.: C, G, D, Am..."
              placeholderTextColor={c.muted}
              autoCapitalize="characters"
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.onSurface }]}
            />

            <Text style={[styles.musicLabel, { color: c.onSurface }]}>URL de la cifra</Text>
            <TextInput
              value={cifraUrl}
              onChangeText={setCifraUrl}
              placeholder="https://..."
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.onSurface }]}
            />

            <Pressable
              onPress={() => setCifraAutorizada((v) => !v)}
              style={[styles.authRow, { borderColor: c.border }]}
            >
              <Feather
                name={cifraAutorizada ? 'check-square' : 'square'}
                size={19}
                color={cifraAutorizada ? c.brand : c.muted}
              />
              <Text style={{ color: c.onSurface, fontSize: 13, fontWeight: '600' }}>
                Cifra autorizada para uso
              </Text>
            </Pressable>

            <Text style={[styles.musicLabel, { color: c.onSurface }]}>URL directa de audio</Text>
            <TextInput
              value={audioUrl}
              onChangeText={setAudioUrl}
              placeholder="https://..."
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              keyboardType="url"
              style={[styles.input, { backgroundColor: c.surface, borderColor: c.border, color: c.onSurface }]}
            />

            <Text style={[styles.musicLabel, { color: c.onSurface }]}>
              Enlace externo (Spotify, YouTube, etc.)
            </Text>

            <TextInput
              value={externalAudioUrl}
              onChangeText={setExternalAudioUrl}
              placeholder="https://open.spotify.com/..."
              placeholderTextColor={c.muted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={[
                styles.input,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  color: c.onSurface,
                },
              ]}
            />

            <Text style={{ color: c.muted, fontSize: 10.5, lineHeight: 15 }}>
              Este enlace se abrirá en Spotify, YouTube u otra aplicación externa; no se reproduce dentro del Hinario.
            </Text>

            <Text style={[styles.musicLabel, { color: c.onSurface }]}>Archivo local de audio</Text>

            <Pressable
              onPress={pickLocalAudio}
              style={[styles.fileBtn, { borderColor: c.brand }]}
            >
              <Feather name="music" size={18} color={c.brand} />
              <Text style={{ color: c.brand, fontWeight: '700' }}>
                Seleccionar archivo
              </Text>
            </Pressable>

            {audioLocal ? (
              <View style={[styles.localFileBox, { borderColor: c.border }]}>
                <Feather name="file" size={16} color={c.brand} />
                <Text
                  numberOfLines={2}
                  style={{ color: c.muted, fontSize: 11, flex: 1 }}
                >
                  {decodeURIComponent(
                    audioLocal.split('/').pop() ||
                    audioLocal
                  )}
                </Text>

                <Pressable onPress={removeLocalAudio} hitSlop={8}>
                  <Feather name="x" size={18} color={c.error} />
                </Pressable>
              </View>
            ) : null}

            <Pressable
              onPress={() => setAudioAutorizado((v) => !v)}
              style={[styles.authRow, { borderColor: c.border }]}
            >
              <Feather
                name={audioAutorizado ? 'check-square' : 'square'}
                size={19}
                color={audioAutorizado ? c.brand : c.muted}
              />
              <Text style={{ color: c.onSurface, fontSize: 13, fontWeight: '600' }}>
                Audio autorizado para uso
              </Text>
            </Pressable>
          </View>

          {/* PROCEDENCIA / DERECHOS */}
          <Label c={c}>Procedencia y derechos</Label>

          <View
            style={[
              styles.provenanceBox,
              {
                backgroundColor: c.surfaceSecondary,
                borderColor: c.border,
              },
            ]}
          >
            <View style={styles.cardTitleRow}>
              <View
                style={[
                  styles.cardIcon,
                  { backgroundColor: c.surface },
                ]}
              >
                <Feather name="shield" size={18} color={c.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: c.onSurface }]}>
                  Procedencia y derechos
                </Text>
                <Text style={[styles.cardSubtitle, { color: c.muted }]}>
                  Fuente, autorización y observaciones
                </Text>
              </View>
            </View>

            <Text
              style={[
                styles.provenanceTitle,
                { color: c.brand },
              ]}
            >
              Cifra
            </Text>

            <TextInput
              value={cifraFuente}
              onChangeText={setCifraFuente}
              placeholder="Fuente de la cifra"
              placeholderTextColor={c.muted}
              style={[
                styles.input,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  color: c.onSurface,
                },
              ]}
            />

            <View style={styles.provenanceChips}>
              {([
                ['propio', 'Propio'],
                ['autorizado', 'Autorizado'],
                ['dominio_publico', 'Dominio público'],
                ['enlace_externo', 'Enlace externo'],
                ['desconocido', 'Por revisar'],
              ] as [MediaProvenanceType, string][]).map(
                ([value, label]) => {
                  const active = cifraTipo === value;

                  return (
                    <Pressable
                      key={value}
                      onPress={() => setCifraTipo(value)}
                      style={[
                        styles.provenanceChip,
                        {
                          backgroundColor: active
                            ? c.brand
                            : c.surface,
                          borderColor: active
                            ? c.brand
                            : c.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: active
                            ? c.onSurfaceInverse
                            : c.onSurface,
                          fontSize: 10.5,
                          fontWeight: '700',
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            <TextInput
              value={cifraNotas}
              onChangeText={setCifraNotas}
              placeholder="Notas sobre autorización, edición, origen..."
              placeholderTextColor={c.muted}
              multiline
              style={[
                styles.input,
                styles.provenanceNotes,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  color: c.onSurface,
                },
              ]}
            />

            <View
              style={[
                styles.provenanceDivider,
                { backgroundColor: c.border },
              ]}
            />

            <Text
              style={[
                styles.provenanceTitle,
                { color: c.brand },
              ]}
            >
              Audio
            </Text>

            <TextInput
              value={audioFuente}
              onChangeText={setAudioFuente}
              placeholder="Fuente del audio"
              placeholderTextColor={c.muted}
              style={[
                styles.input,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  color: c.onSurface,
                },
              ]}
            />

            <View style={styles.provenanceChips}>
              {([
                ['propio', 'Propio'],
                ['autorizado', 'Autorizado'],
                ['dominio_publico', 'Dominio público'],
                ['enlace_externo', 'Enlace externo'],
                ['desconocido', 'Por revisar'],
              ] as [MediaProvenanceType, string][]).map(
                ([value, label]) => {
                  const active = audioTipo === value;

                  return (
                    <Pressable
                      key={value}
                      onPress={() => setAudioTipo(value)}
                      style={[
                        styles.provenanceChip,
                        {
                          backgroundColor: active
                            ? c.brand
                            : c.surface,
                          borderColor: active
                            ? c.brand
                            : c.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: active
                            ? c.onSurfaceInverse
                            : c.onSurface,
                          fontSize: 10.5,
                          fontWeight: '700',
                        }}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            <TextInput
              value={audioNotas}
              onChangeText={setAudioNotas}
              placeholder="Notas sobre grabación, licencia, enlace..."
              placeholderTextColor={c.muted}
              multiline
              style={[
                styles.input,
                styles.provenanceNotes,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                  color: c.onSurface,
                },
              ]}
            />
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
              <TextInput value={b.texto} onChangeText={(v) => updBlockText(i, v)} multiline textAlignVertical="top"
                placeholder="Texto del bloque…" placeholderTextColor={c.muted}
                style={[styles.blockText, { color: c.onSurface }]} testID={`block-text-${i}`} />

              <View
                style={[
                  styles.chordEditor,
                  { borderTopColor: c.border },
                ]}
              >
                <View style={styles.chordEditorHead}>
                  <Feather
                    name="music"
                    size={15}
                    color={c.brand}
                  />
                  <Text
                    style={{
                      color: c.onSurface,
                      fontSize: 12,
                      fontWeight: '800',
                    }}
                  >
                    Cifra de este bloque
                  </Text>
                </View>

                <Text
                  style={[
                    styles.chordHelp,
                    { color: c.muted },
                  ]}
                >
                  Escriba cada acorde encima de la posición exacta donde ocurre el cambio.
                </Text>

                {textLines(b.texto).map((linea, lineIndex) => (
                  <View
                    key={`cifra-${i}-${lineIndex}`}
                    style={[
                      styles.chordEditorLine,
                      {
                        backgroundColor: c.surface,
                        borderColor: c.border,
                      },
                    ]}
                  >
                    <TextInput
                      value={b.cifras?.[lineIndex] || ''}
                      onChangeText={(value) =>
                        updChordLine(i, lineIndex, value)
                      }
                      placeholder="C       G          D"
                      placeholderTextColor={c.muted}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      multiline={false}
                      style={[
                        styles.chordInput,
                        { color: c.brandSecondary },
                      ]}
                    />

                    <Text
                      selectable
                      style={[
                        styles.chordLyricPreview,
                        { color: c.onSurface },
                      ]}
                    >
                      {linea || ' '}
                    </Text>
                  </View>
                ))}
              </View>
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

<View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.divider, paddingBottom: SPACING.md + insets.bottom }]}>
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  sectionHint: {
    fontSize: 11,
    marginTop: -2,
    marginBottom: 6,
  },
  manageBtn: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    marginBottom: 6,
  },
  manageBtnText: {
    fontSize: 12,
    fontWeight: '800',
  },
  categorySummary: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
  },
  chipsWrapCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  catChipCompact: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  moreCatsChip: {
    minHeight: 30,
    minWidth: 42,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
  },
  emptyCategoryRow: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: 4,
  },
  categoryManager: {
    borderTopWidth: 1,
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
  },
  newCategoryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  fullCategoryManager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    marginTop: SPACING.sm,
  },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 34, paddingHorizontal: 12, borderRadius: RADIUS.pill, borderWidth: 1 },
  addCatBtn: { width: 44, height: 44, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  blockCard: { borderRadius: RADIUS.md, borderWidth: 1.5, padding: SPACING.md, marginBottom: SPACING.sm },
  blockHead: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  typeToggle: { paddingHorizontal: 10, height: 30, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  numInput: { width: 48, height: 34, borderRadius: RADIUS.sm, borderWidth: 1, textAlign: 'center', paddingVertical: 0 },
  blockText: { minHeight: 90, fontSize: 15, lineHeight: 22, paddingTop: 4 },
  addBlockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: RADIUS.md, borderWidth: 1.5, marginTop: SPACING.xs },
  chordEditor: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.sm,
  },

  chordEditorHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  chordHelp: {
    fontSize: 10.5,
    lineHeight: 15,
  },

  chordEditorLine: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 7,
  },

  chordInput: {
    minHeight: 28,
    paddingVertical: 0,
    paddingHorizontal: 0,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios'
      ? 'Courier'
      : 'monospace',
    fontWeight: '800',
  },

  chordLyricPreview: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios'
      ? 'Courier'
      : 'monospace',
  },

  provenanceBox: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },

  provenanceTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },

  provenanceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  provenanceChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },

  provenanceNotes: {
    minHeight: 74,
    textAlignVertical: 'top',
  },

  provenanceDivider: {
    height: 1,
    marginVertical: SPACING.sm,
  },

  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '900',
  },

  cardSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 1,
  },

  musicBox: {
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },

  musicHelp: {
    fontSize: 11.5,
    lineHeight: 17,
    marginBottom: 2,
  },

  musicLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 4,
  },

  authRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minHeight: 42,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },

  fileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    minHeight: 46,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
  },

  localFileBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md,
  },

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
