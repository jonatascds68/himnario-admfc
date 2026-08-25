import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Linking, Share, Animated, Modal, Platform, BackHandler,
  AppState,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS, GOLD } from '@/src/theme/tokens';
import { api, Hymn, getSections } from '@/src/lib/api';
import { favorites, recents, playlist } from '@/src/lib/collections';
import { hymnAlignStorage, HymnAlign } from '@/src/lib/storage';
import { ShareCard, buildSharePages } from '@/src/components/ShareCard';

function formatAudioTime(seconds?: number): string {
  const safe = Number.isFinite(seconds)
    ? Math.max(0, seconds || 0)
    : 0;

  const minutes = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);

  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Limpia marcaciones internas (p.ej. "||...||") y normaliza saltos de línea.
function cleanBlockText(raw: string): string {
  return (raw || '')
    .replace(/\r\n/g, '\n')
    .replace(/\|+/g, '')          // quita "||" y "|" internos
    .replace(/^\s*CORO(?:\s+\d+[ºo])?\s*:?\s*$/gim, '') // etiqueta CORO redundante dentro del texto
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === '')) // evita dobles vacíos
    .join('\n')
    .trim();
}

// Construye TEXTO PURO y limpio para compartir (WhatsApp, etc.). Nunca imagen.
const CHROMATIC_NOTES = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
];

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  'B#': 0,

  'C#': 1,
  Db: 1,

  D: 2,

  'D#': 3,
  Eb: 3,

  E: 4,
  Fb: 4,

  'E#': 5,
  F: 5,

  'F#': 6,
  Gb: 6,

  G: 7,

  'G#': 8,
  Ab: 8,

  A: 9,

  'A#': 10,
  Bb: 10,

  B: 11,
  Cb: 11,
};

function transposeNote(
  note: string,
  steps: number
): string {
  const index = NOTE_INDEX[note];

  if (index == null) {
    return note;
  }

  const next =
    (index + steps % 12 + 12) % 12;

  return CHROMATIC_NOTES[next];
}

function transposeChord(
  chord: string,
  steps: number
): string {
  if (!chord || steps === 0) {
    return chord;
  }

  const match = chord.match(
    /^([A-G](?:#|b)?)(.*)$/i
  );

  if (!match) {
    return chord;
  }

  const root =
    match[1][0].toUpperCase() +
    match[1].slice(1);

  let suffix = match[2] || '';

  suffix = suffix.replace(
    /\/([A-G](?:#|b)?)/gi,
    (_, bass: string) => {
      const normalized =
        bass[0].toUpperCase() +
        bass.slice(1);

      return '/' +
        transposeNote(
          normalized,
          steps
        );
    }
  );

  return (
    transposeNote(root, steps) +
    suffix
  );
}

function buildChordDisplayLine(
  segmentos: {
    texto: string;
    acorde?: string | null;
  }[],
  steps: number
): string {
  let out = '';
  let pos = 0;

  for (const segmento of segmentos) {
    if (segmento.acorde) {
      if (out.length < pos) {
        out += ' '.repeat(pos - out.length);
      }

      out += transposeChord(
        segmento.acorde,
        steps
      );
    }

    pos += (segmento.texto || '').length;
  }

  return out.replace(/\s+$/g, '');
}

function buildChordLyricsLine(
  segmentos: {
    texto: string;
    acorde?: string | null;
  }[]
): string {
  return segmentos
    .map(segmento => segmento.texto || '')
    .join('');
}

function buildShareText(hymn: Hymn): string {
  const sections = getSections(hymn);
  const lines: string[] = [];
  lines.push('HIMNARIO ADMFC');
  lines.push('');
  lines.push(`${hymn.himnario} — Nº ${hymn.numero}`);
  lines.push(hymn.titulo);
  lines.push('');
  sections.forEach((s, i) => {
    const label = s.kind === 'chorus' ? (s.label || 'CORO') : hymn.id.startsWith('CANT-') && s.index == null ? '' : `${s.index ?? i + 1}ª `;
    const body = cleanBlockText(s.text);
    if (!body) return;
    if (label) { lines.push(label); lines.push(''); }
    lines.push(body);
    lines.push('');
  });
  if (hymn.numero_equivalente && hymn.himnario_equivalente) {
    lines.push(`También en: ${hymn.himnario_equivalente} — Nº ${hymn.numero_equivalente}`);
    lines.push('');
  }
  lines.push('HIMNARIO ADMFC');
  lines.push('Asamblea de Dios · Misión de la Fe Cristiana');
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}


export default function HymnDetail() {
  const { id, view } = useLocalSearchParams<{
    id: string;
    view?: 'gt' | 'sion' | 'cant';
  }>();
  const router = useRouter();
  const { c, isDark, fontScale, setFontScale, bumpFont, hymnFont } = useTheme();
const insets = useSafeAreaInsets();
  const [hymn, setHymn] = useState<Hymn | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);
  const [inList, setInList] = useState(false);
  const [equivId, setEquivId] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
const [contentMode, setContentMode] = useState<'lyrics' | 'chords' | 'audio'>('lyrics');

  // ADMFC_YOUTUBE_RETURN_TO_LYRICS
  // Ao voltar do YouTube/áudio externo para o app,
  // retorna automaticamente para a letra.
  // Se o YouTube mantiver Picture-in-Picture,
  // o vídeo continua sobre a tela da letra.
  useEffect(() => {
    const subscription = AppState.addEventListener(
      'change',
      (nextAppState) => {
        if (nextAppState === 'active' && contentMode === 'audio') {
          setContentMode('lyrics');
        }
      },
    );

    return () => {
      subscription.remove();
    };
  }, [contentMode]);


useFocusEffect(
  useCallback(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (contentMode !== 'lyrics') {
          setDragTime(null);
          setContentMode('lyrics');
          return true;
        }

        return false;
      }
    );

    return () => subscription.remove();
  }, [contentMode])
);
const [transposeSteps, setTransposeSteps] = useState(0);

const [hymnAlign, setHymnAlign] = useState<HymnAlign>('center');
  const pageRefs = useRef<(View | null)[]>([]);
  const starScale = React.useRef(new Animated.Value(1)).current;

  // Pinça fluida para aumentar/diminuir a letra em tempo real.
  const pinchStartScale = React.useRef(fontScale);
  const pinchTargetScale = React.useRef(fontScale);
  const pinchLastApplied = React.useRef(fontScale);
  const pinchLastUpdate = React.useRef(0);

  // Mantém o valor atual da fonte disponível para o gesto
  // sem obrigar a recriação do Gesture.Pinch a cada render.
  const fontScaleRef = React.useRef(fontScale);

  React.useEffect(() => {
    fontScaleRef.current = fontScale;
    pinchTargetScale.current = fontScale;
    pinchLastApplied.current = fontScale;
  }, [fontScale]);

  const audioSource =
    hymn?.audio_url ||
    hymn?.audio_local ||
    null;

  const audioPlayer = useAudioPlayer(audioSource, {
    updateInterval: 500,
  });

  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const audioTrackWidth = useRef(0);
  const [dragTime, setDragTime] = useState<number | null>(null);

  const audioDisplayTime =
    dragTime ?? audioStatus.currentTime;

  const seekAudioFromX = (
    x: number,
    commit: boolean
  ) => {
    if (
      audioTrackWidth.current <= 0 ||
      audioStatus.duration <= 0
    ) {
      return;
    }

    const ratio = Math.max(
      0,
      Math.min(
        1,
        x / audioTrackWidth.current
      )
    );

    const seconds =
      ratio * audioStatus.duration;

    setDragTime(seconds);

    if (commit) {
      audioPlayer.seekTo(seconds);
      setDragTime(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      return () => {
        try {
          audioPlayer.pause();
        } catch {}
        setDragTime(null);
      };
    }, [audioPlayer])
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const h = await api.getHymnView(id, view);
      setHymn(h); recents.push(h.id);
      setIsFav(await favorites.has(h.id));
      setInList((await playlist.list()).includes(h.id));
      if (h.numero_equivalente && h.himnario_equivalente) {
        const k = h.himnario_equivalente.toLowerCase().includes('gloria') ? 'gt' : 'sion';
        try { const eq = await api.getByNumber(k as any, h.numero_equivalente); setEquivId(eq.id); }
        catch { setEquivId(null); }
      } else setEquivId(null);
    } catch { setHymn(null); } finally { setLoading(false); }
  }, [id, view]);
  useEffect(() => { load(); }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    setTransposeSteps(0);
  }, [id]);
useFocusEffect(
  useCallback(() => {
    
hymnAlignStorage.get().then(setHymnAlign);
  }, [])
);
  const nav = async (delta: number) => {
    if (!hymn) return;
    const k =
      hymn.himnario === 'Gloria y Triunfo'
        ? 'gt'
        : hymn.himnario === 'Himnos de Sión'
          ? 'sion'
          : 'cant';
    try {
      const n = await api.getByNumber(k as any, hymn.numero + delta);
      router.replace({
        pathname: '/hymn/[id]',
        params: { id: n.id, view: k },
      });
    } catch {}
  };
  const toggleFav = async () => {
    if (!hymn) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = await favorites.toggle(hymn.id);
    setIsFav(next);
    starScale.setValue(0.7);
    Animated.spring(starScale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
  };
  const toggleList = async () => {
    if (!hymn) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inList) { await playlist.remove(hymn.id); setInList(false); } else { await playlist.add(hymn.id); setInList(true); }
  };
  const pinchGesture = React.useMemo(() => {
    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onBegin(() => {
        const currentScale = fontScaleRef.current;

        pinchStartScale.current = currentScale;
        pinchTargetScale.current = currentScale;
        pinchLastApplied.current = currentScale;
        pinchLastUpdate.current = 0;
      })
      .onUpdate((event) => {
        const next = Math.min(
          2.5,
          Math.max(
            0.85,
            pinchStartScale.current * event.scale
          )
        );

        const smoothNext = Math.round(next * 100) / 100;
        pinchTargetScale.current = smoothNext;

        const now = Date.now();

        if (
          now - pinchLastUpdate.current >= 32 &&
          Math.abs(
            smoothNext - pinchLastApplied.current
          ) >= 0.01
        ) {
          pinchLastUpdate.current = now;
          pinchLastApplied.current = smoothNext;
          setFontScale(smoothNext);
        }
      })
      .onEnd(() => {
        const finalScale = pinchTargetScale.current;

        pinchLastApplied.current = finalScale;
        setFontScale(finalScale);
      });

    /*
     * O ScrollView possui seu próprio gesto nativo.
     * Com Gesture.Native() + Simultaneous, permitimos que o
     * detector de pinça seja reconhecido sem precisar esperar
     * o ScrollView perder a disputa pelos toques.
     *
     * Resultado esperado:
     * - 1 dedo continua rolando normalmente;
     * - 2 dedos podem iniciar a pinça imediatamente.
     */
    const nativeScroll = Gesture.Native();

    return Gesture.Simultaneous(
      nativeScroll,
      pinch
    );
  }, [setFontScale]);

  const share = async () => {
    if (!hymn) return;
    try { await Share.share({ message: buildShareText(hymn) }); } catch {}
  };
  const shareImage = async () => {
    if (!hymn) return;
    setShareOpen(false); setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      // small delay to ensure off-screen cards are laid out
      await new Promise((r) => setTimeout(r, 350));
      for (let i = 0; i < pageRefs.current.length; i++) {
        const node = pageRefs.current[i];
        if (!node) continue;
        const uri = await captureRef(node, { format: 'png', quality: 1, result: 'tmpfile' });
        if (available) await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: `${hymn.himnario} Nº ${hymn.numero}` });
      }
    } catch (e) {
      // fallback to text
      await share();
    } finally { setSharing(false); }
  };

  if (loading) return <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]}><ActivityIndicator color={c.brand} style={{ marginTop: SPACING.xxxl }} /></SafeAreaView>;
  if (!hymn) return <SafeAreaView style={[styles.container, { backgroundColor: c.surface, alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: c.onSurface }}>Himno no encontrado</Text></SafeAreaView>;

  const sections = getSections(hymn);
  const baseSize = 17 * fontScale;
  const shortOther =
    hymn.himnario === 'Gloria y Triunfo'
      ? 'Himnos de Sión'
      : 'Gloria y Triunfo';

  const sharePages = buildSharePages(sections);

  const equivText =
    hymn.numero_equivalente != null
      ? `${shortOther} · n° ${hymn.numero_equivalente}`
      : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']} testID="hymn-detail-screen">
      <View style={styles.topBar}>
        <Pressable
          onPress={() => {
            if (contentMode !== 'lyrics') {
              try {
                audioPlayer.pause();
              } catch {}
              setDragTime(null);
              setContentMode('lyrics');
              return;
            }
            router.back();
          }}
          hitSlop={10}
          testID="hymn-back"
        >
          <Feather
            name="chevron-left"
            size={28}
            color={contentMode !== 'lyrics' ? c.brand : c.muted}
          />
        </Pressable>
        <View style={{ flex: 1 }} />
        {(hymn.cifra_url || hymn.cifra || hymn.cifra_bloques?.length) ? (
          <Pressable
            onPress={() => {
              if (contentMode === 'chords') {
                setContentMode('lyrics');
              } else {
                try {
                  audioPlayer.pause();
                } catch {}
                setDragTime(null);
                setContentMode('chords');
              }
            }}
            hitSlop={10}
            style={[
              styles.iconBtn,
              contentMode === 'chords' && {
                backgroundColor: c.surfaceSecondary,
              },
            ]}
            testID="hymn-open-chords"
          >
            {contentMode === 'chords' ? (
              <Feather
                name="file-text"
                size={22}
                color={c.brand}
              />
            ) : (
              <MaterialCommunityIcons
                name="music-clef-treble"
                size={23}
                color={c.muted}
              />
            )}
          </Pressable>
        ) : null}

        {(audioSource || hymn.audio_external_url) ? (
          <Pressable
            onPress={() => {
              if (contentMode === 'audio') {
                try {
                  audioPlayer.pause();
                } catch {}
                setDragTime(null);
                setContentMode('lyrics');
              } else {
                setContentMode('audio');
              }
            }}
            hitSlop={10}
            style={[
              styles.iconBtn,
              contentMode === 'audio' && {
                backgroundColor: c.surfaceSecondary,
              },
            ]}
            testID="hymn-open-audio"
          >
            <Feather
              name={
                contentMode === 'audio'
                  ? 'file-text'
                  : 'headphones'
              }
              size={22}
              color={
                contentMode === 'audio'
                  ? c.brand
                  : c.muted
              }
            />
          </Pressable>
        ) : null}

        <Pressable onPress={toggleFav} hitSlop={10} style={styles.iconBtn} testID="hymn-toggle-fav">
          <Animated.View style={{ transform: [{ scale: starScale }] }}>
            <Ionicons name={isFav ? 'star' : 'star-outline'} size={24} color={isFav ? GOLD : c.muted} />
          </Animated.View>
        </Pressable>
        <Pressable onPress={() => setShareOpen(true)} hitSlop={10} style={styles.iconBtn} testID="hymn-share">
          {sharing
            ? <ActivityIndicator size="small" color={c.muted} />
            : <Feather name="share-2" size={22} color={c.muted} />
          }
        </Pressable>
      </View>
      <GestureDetector gesture={pinchGesture}>
        <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.himnario, { color: c.muted }]}>{hymn.himnario.toUpperCase()}</Text>
        <Text style={[styles.number, { color: c.brand }]}>Nº {hymn.numero}</Text>
<Text style={[styles.title, { color: c.onSurface, textAlign: 'center' }]}>{hymn.titulo}</Text>
        {equivId && hymn.numero_equivalente != null ? (
        <Pressable
          onPress={() => {
            audioPlayer.pause();
            setDragTime(null);
            router.replace(`/hymn/${equivId}`);
          }}
          hitSlop={8}
          style={styles.equivCompact}
          testID="hymn-cross-ref"
        >
          <Feather
            name="link"
            size={12}
            color={c.muted}
          />

          <Text
            style={[
              styles.equivCompactText,
              { color: c.muted },
            ]}
          >
            También en:
          </Text>

          <Text
            style={[
              styles.equivCompactText,
              {
                color: c.brand,
                fontWeight: '700',
              },
            ]}
          >
            {shortOther} · n° {String(hymn.numero_equivalente)}
          </Text>

          <Feather
            name="chevron-right"
            size={12}
            color={c.muted}
          />
        </Pressable>
      ) : null}
        <View style={[styles.divider, { backgroundColor: c.borderStrong }]} />


{contentMode !== 'lyrics' ? (
        <Pressable
          onPress={() => setContentMode('lyrics')}
          hitSlop={8}
          style={styles.backToLyrics}
          testID="hymn-back-to-lyrics"
        >
          <Feather
            name="chevron-left"
            size={15}
            color={c.brand}
          />
          <Text
            style={{
              color: c.brand,
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            Volver a la letra
          </Text>
        </Pressable>
      ) : null}

      {contentMode === 'lyrics' ? (
  <>
    {sections.length === 0 ? (
          <Text style={{ color: c.muted, textAlign: 'center', marginTop: SPACING.xl }}>Letra no disponible</Text>
        ) : (
          <View testID="hymn-lyrics">
            {sections.map((s, i) => (
<View
  key={i}
  style={{
    marginBottom:
      i === sections.length - 1
        ? 0
        : s.kind === 'chorus'
          ? SPACING.xxxl
          : SPACING.xxl,
  }}
>
{s.kind === 'chorus' ? (
  <>
    <Text style={[styles.stanzaTitle, { color: c.brand, textAlign: hymnAlign }]}>{s.label || 'CORO'}</Text>
    <View style={styles.chorusClean}>
<Text
      style={[
        styles.verse,
        {
          color: isDark ? '#D6C59A' : '#75612F',
          fontSize: baseSize,
          lineHeight: baseSize * 1.55,
          fontFamily: 'MerriweatherItalic',
          textAlign: hymnAlign,
        },
      ]}
    >
      {s.text.replace(/\|+/g, '')}
    </Text>
    </View>
  </>
) : (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
    {hymn.id.startsWith('CANT-') && s.index == null ? null : (<Text style={[styles.stanzaTitle, { color: c.brand, width: 28, marginTop: 3 }]}>{`${s.index ?? i + 1}.`}</Text>)}
    <Text style={[styles.verse, { flex: 1, color: c.onSurface, fontSize: baseSize, lineHeight: baseSize * 1.55, fontFamily: hymnFont, textAlign: hymnAlign }]}>{s.text.replace(/\|+/g, '')}</Text>
  </View>
)}
              </View>
            ))}
          </View>
        )}
      </>
    ) : contentMode === 'chords' ? (
  <View style={styles.chordsWrap}>
    <View style={styles.chordsHeader}>
      <MaterialCommunityIcons
        name="music-clef-treble"
        size={28}
        color={c.brandSecondary}
      />

      <View style={{ flex: 1 }}>
        <Text style={[styles.experimentalTitle, { color: c.onSurface }]}>
          Cifras
        </Text>

        {hymn.tom ? (
          <Text style={[styles.experimentalMeta, { color: c.muted }]}>
            Tono: {transposeChord(hymn.tom, transposeSteps)}
          </Text>
        ) : null}
      </View>
    </View>

    {hymn.tom ? (
      <View
        style={[
          styles.transposeBar,
          {
            backgroundColor:
              c.surfaceSecondary,
            borderColor: c.border,
          },
        ]}
      >
        <Pressable
          onPress={() =>
            setTransposeSteps((value) =>
              Math.max(-11, value - 1)
            )
          }
          style={[
            styles.transposeBtn,
            { borderColor: c.border },
          ]}
        >
          <Feather
            name="minus"
            size={20}
            color={c.brandSecondary}
          />
        </Pressable>

        <Pressable
          onPress={() =>
            setTransposeSteps(0)
          }
          style={styles.transposeCenter}
        >
          <Text
            style={[
              styles.transposeTone,
              { color: c.onSurface },
            ]}
          >
            {transposeChord(
              hymn.tom,
              transposeSteps
            )}
          </Text>

          <Text
            style={[
              styles.transposeCaption,
              { color: c.muted },
            ]}
          >
            {transposeSteps === 0
              ? 'Tono original'
              : transposeSteps > 0
                ? `+${transposeSteps} semitono${transposeSteps === 1 ? '' : 's'}`
                : `${transposeSteps} semitono${transposeSteps === -1 ? '' : 's'}`}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            setTransposeSteps((value) =>
              Math.min(11, value + 1)
            )
          }
          style={[
            styles.transposeBtn,
            { borderColor: c.border },
          ]}
        >
          <Feather
            name="plus"
            size={20}
            color={c.brandSecondary}
          />
        </Pressable>
      </View>
    ) : null}

    {hymn.cifra_bloques?.length ? (
      <>
        <View style={styles.chordsBlocks}>
          {hymn.cifra_bloques.map((bloque, blocoIndex) => (
            <View
              key={`${bloque.tipo}-${blocoIndex}`}
              style={styles.chordBlock}
            >
              <Text
                style={[
                  styles.chordBlockTitle,
                  { color: c.brand },
                ]}
              >
                {bloque.tipo === 'coro'
                  ? 'CORO'
                  : `${bloque.numero ?? blocoIndex + 1}.`}
              </Text>

              <View style={{ flex: 1 }}>
                {bloque.lineas.map((linea, lineaIndex) => (
                  <View
                    key={lineaIndex}
                    style={styles.chordLine}
                  >
                    {(() => {
                      const chordLine =
                        buildChordDisplayLine(
                          linea.segmentos,
                          transposeSteps
                        );

                      const lyricLine =
                        buildChordLyricsLine(
                          linea.segmentos
                        );

                      return (
                        <View style={styles.chordAlignedLine}>
                          {chordLine ? (
                            <Text
                              style={[
                                styles.chordAlignedChord,
                                {
                                  color: isDark
                                    ? '#F2C14E'
                                    : '#A56A00',
                                  fontSize: baseSize,
                                  lineHeight:
                                    baseSize * 1.25,
                                },
                              ]}
                            >
                              {chordLine}
                            </Text>
                          ) : null}

                          <Text
                            style={[
                              styles.chordAlignedLyrics,
                              {
                                color: c.onSurface,
                                fontSize: baseSize,
                                lineHeight:
                                  baseSize * 1.4,
                              },
                            ]}
                          >
                            {lyricLine || ' '}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {sections
          .filter((sec, secIndex) => {
            if (sec.kind === 'chorus') {
              return !hymn.cifra_bloques?.some(
                (b) => b.tipo === 'coro'
              );
            }

            const numero = sec.index ?? secIndex + 1;

            return !hymn.cifra_bloques?.some(
              (b) =>
                b.tipo === 'estrofa' &&
                b.numero === numero
            );
          })
          .map((sec, secIndex) => (
            <View
              key={`sin-cifra-${secIndex}`}
              style={{
                marginTop: SPACING.xl,
                marginBottom: SPACING.md,
              }}
            >
              <Text
                style={[
                  styles.chordBlockTitle,
                  {
                    color:
                      sec.kind === 'chorus'
                        ? '#0B6678'
                        : c.brand,
                    width: '100%',
                    marginTop: 0,
                    marginBottom: SPACING.sm,
                  },
                ]}
              >
                {sec.kind === 'chorus'
                  ? 'CORO'
                  : `${sec.index ?? secIndex + 1}.`}
              </Text>

              <Text
                style={[
                  styles.verse,
                  {
                    color: c.onSurface,
                    fontSize: baseSize,
                    lineHeight: baseSize * 1.55,
                    fontFamily: hymnFont,
                    textAlign: hymnAlign,
                  },
                ]}
              >
                {sec.text.replace(/\|+/g, '')}
              </Text>
            </View>
          ))}
      </>
    ) : hymn.cifra ? (
      <Text
        style={[
          styles.experimentalText,
          {
            color: c.onSurface,
            fontFamily: 'monospace',
            lineHeight: 24,
          },
        ]}
      >
        {hymn.cifra}
      </Text>
    ) : (
      <View
        style={[
          styles.musicStatusCard,
          {
            backgroundColor: '#FFF8E6',
            borderColor: '#E7C85B',
          },
        ]}
      >
        <View
          style={[
            styles.musicStatusIcon,
            { backgroundColor: '#F8E8A6' },
          ]}
        >
          <Feather name="info" size={20} color="#8A6A00" />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.musicStatusTitle,
              { color: '#6F5600' },
            ]}
          >
            Cifra no disponible
          </Text>

          <Text
            style={[
              styles.musicStatusDescription,
              { color: '#776B48' },
            ]}
          >
            Este himno todavía no tiene una cifra registrada.
          </Text>
        </View>
      </View>
    )}
  </View>
) : (
  <View style={styles.audioWrap}>
    <View style={styles.audioHeader}>
      <MaterialCommunityIcons
        name="headphones"
        size={32}
        color={c.brandSecondary}
      />

      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.experimentalTitle,
            {
              color: c.onSurface,
              marginTop: 0,
            },
          ]}
        >
          Audio
        </Text>

        <Text
          style={[
            styles.audioSource,
            { color: c.muted },
          ]}
        >
          {hymn.audio_url
            ? 'Audio disponible'
            : hymn.audio_local
              ? 'Audio disponible'
              : hymn.audio_external_url
                ? 'Audio disponible por enlace externo'
                : 'Audio no disponible'}
        </Text>
      </View>
    </View>

    {audioSource ? (
      <View
        style={[
          styles.audioCard,
          {
            backgroundColor: c.surfaceSecondary,
            borderColor: c.border,
          },
        ]}
      >
        <View style={styles.audioTimes}>
          <Text style={[styles.audioTime, { color: c.muted }]}>
            {formatAudioTime(audioDisplayTime)}
          </Text>

          <Text style={[styles.audioTime, { color: c.muted }]}>
            {formatAudioTime(audioStatus.duration)}
          </Text>
        </View>

        <View
          style={styles.audioSeekArea}
          onLayout={(event) => {
            audioTrackWidth.current =
              event.nativeEvent.layout.width;
          }}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={(event) =>
            seekAudioFromX(
              event.nativeEvent.locationX,
              false
            )
          }
          onResponderMove={(event) =>
            seekAudioFromX(
              event.nativeEvent.locationX,
              false
            )
          }
          onResponderRelease={(event) =>
            seekAudioFromX(
              event.nativeEvent.locationX,
              true
            )
          }
          onResponderTerminate={() =>
            setDragTime(null)
          }
        >
          <View
            style={[
              styles.audioTrack,
              { backgroundColor: c.border },
            ]}
          >
            <View
              style={[
                styles.audioProgress,
                {
                  backgroundColor:
                    c.brandSecondary,
                  width:
                    audioStatus.duration > 0
                      ? `${Math.min(
                          100,
                          (audioDisplayTime /
                            audioStatus.duration) *
                            100
                        )}%`
                      : '0%',
                },
              ]}
            />

            {audioStatus.duration > 0 ? (
              <View
                pointerEvents="none"
                style={[
                  styles.audioThumb,
                  {
                    backgroundColor:
                      c.brandSecondary,
                    left: `${Math.min(
                      100,
                      (audioDisplayTime /
                        audioStatus.duration) *
                        100
                    )}%`,
                  },
                ]}
              />
            ) : null}
          </View>
        </View>

        <View style={styles.audioControls}>
          <Pressable
            onPress={() =>
              audioPlayer.seekTo(
                Math.max(
                  0,
                  audioStatus.currentTime - 10
                )
              )
            }
            style={[
              styles.audioSmallBtn,
              { borderColor: c.border },
            ]}
          >
            <MaterialCommunityIcons
              name="rewind-10"
              size={24}
              color={c.brand}
            />
          </Pressable>

          <Pressable
            onPress={() => {
              if (audioStatus.playing) {
                audioPlayer.pause();
              } else {
                audioPlayer.play();
              }
            }}
            style={[
              styles.audioPlayBtn,
              { backgroundColor: c.brand },
            ]}
          >
            <Feather
              name={audioStatus.playing ? 'pause' : 'play'}
              size={28}
              color={c.onSurfaceInverse}
            />
          </Pressable>

          <Pressable
            onPress={() =>
              audioPlayer.seekTo(
                audioStatus.duration > 0
                  ? Math.min(
                      audioStatus.duration,
                      audioStatus.currentTime + 10
                    )
                  : audioStatus.currentTime + 10
              )
            }
            style={[
              styles.audioSmallBtn,
              { borderColor: c.border },
            ]}
          >
            <MaterialCommunityIcons
              name="fast-forward-10"
              size={24}
              color={c.brand}
            />
          </Pressable>
        </View>

        {hymn.audio_external_url ? (
          <Pressable
            onPress={async () => {
              try {
                await Linking.openURL(hymn.audio_external_url!);
              } catch {
                // enlace inválido ou sem aplicativo compatível
              }
            }}
            style={[
              styles.externalAudioBtn,
              {
                borderColor: c.brandSecondary,
              },
            ]}
          >
            <Feather
              name="external-link"
              size={18}
              color={c.brandSecondary}
            />
            <Text
              style={{
                color: c.brandSecondary,
                fontWeight: '800',
                fontSize: 13,
              }}
            >
              Abrir enlace externo
            </Text>
          </Pressable>
        ) : null}

        {audioStatus.isBuffering ? (
          <View style={styles.audioLoading}>
            <ActivityIndicator
              size="small"
              color={c.brandSecondary}
            />
            <Text style={{ color: c.muted, fontSize: 11 }}>
              Cargando audio...
            </Text>
          </View>
        ) : null}
      </View>
    ) : hymn.audio_external_url ? (
      <View style={styles.externalAudioOnlyWrap}>
        <Pressable
          onPress={async () => {
            try {
              await Linking.openURL(hymn.audio_external_url!);
            } catch {
              // enlace inválido ou aplicação não disponível
            }
          }}
          style={[
            styles.externalAudioPrimaryBtn,
            {
              backgroundColor: c.brand,
              borderColor: c.brand,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Escuchar audio"
        >
          <View
            style={[
              styles.externalAudioPrimaryIcon,
              {
                backgroundColor: c.onSurfaceInverse,
              },
            ]}
          >
            <Feather
              name="external-link"
              size={22}
              color={c.brand}
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.externalAudioPrimaryTitle,
                { color: c.onSurfaceInverse },
              ]}
            >
              Escuchar audio
            </Text>

            <Text
              style={[
                styles.externalAudioPrimarySubtitle,
                { color: c.onSurfaceInverse },
              ]}
            >
              Abrir enlace externo
            </Text>
          </View>

          <Feather
            name="chevron-right"
            size={23}
            color={c.onSurfaceInverse}
          />
        </Pressable>

        <Text
          style={[
            styles.externalAudioHint,
            { color: c.muted },
          ]}
        >
          Se abrirá en una aplicación externa.
        </Text>
      </View>
    ) : (
      <View
        style={[
          styles.musicStatusCard,
          {
            backgroundColor: '#FFF8E6',
            borderColor: '#E7C85B',
          },
        ]}
      >
        <View
          style={[
            styles.musicStatusIcon,
            { backgroundColor: '#F8E8A6' },
          ]}
        >
          <Feather name="info" size={20} color="#8A6A00" />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.musicStatusTitle,
              { color: '#6F5600' },
            ]}
          >
            Audio no disponible
          </Text>

          <Text
            style={[
              styles.musicStatusDescription,
              { color: '#776B48' },
            ]}
          >
            Este himno todavía no tiene un audio registrado.
          </Text>
        </View>
      </View>
    )}
  </View>
)}
        </ScrollView>
      </GestureDetector>
<View
  style={[
    styles.controlBar,
    {
      backgroundColor: c.surface,
      borderTopColor: c.divider,
      paddingBottom: 8 + insets.bottom,
      paddingLeft: SPACING.md + insets.left,
      paddingRight: SPACING.md + insets.right,
    },
  ]}
>
        <Pressable onPress={() => nav(-1)} style={[styles.ctrl, { borderColor: c.border }]} testID="hymn-prev"><Feather name="chevron-left" size={18} color={c.onSurface} /></Pressable>
        <Pressable onPress={() => bumpFont(-0.1)} style={[styles.ctrl, { borderColor: c.border }]} testID="hymn-font-minus"><Text style={{ color: c.onSurface, fontWeight: '700' }}>A−</Text></Pressable>
        <Pressable onPress={() => bumpFont(0.1)} style={[styles.ctrl, { borderColor: c.border }]} testID="hymn-font-plus"><Text style={{ color: c.onSurface, fontWeight: '700' }}>A+</Text></Pressable>
        <Pressable onPress={toggleList} style={[styles.ctrlWide, { borderColor: c.border, backgroundColor: inList ? c.surfaceSecondary : 'transparent' }]} testID="hymn-toggle-culto">
          <Feather name={inList ? 'check' : 'plus'} size={16} color={c.brand} />
          <Text style={{ color: c.onSurface, fontSize: 13, fontWeight: '600' }}>{inList ? 'En culto' : 'Culto'}</Text>
        </Pressable>
        <Pressable onPress={() => nav(1)} style={[styles.ctrl, { borderColor: c.border }]} testID="hymn-next"><Feather name="chevron-right" size={18} color={c.onSurface} /></Pressable>
        <Pressable onPress={() => router.push(`/culto-mode?id=${hymn.id}` as any)} style={[styles.ctrl, { backgroundColor: c.brand, borderColor: c.brand }]} testID="hymn-open-culto"><Feather name="maximize" size={16} color={c.onSurfaceInverse} /></Pressable>
      </View>

      {/* Share options modal */}
      <Modal visible={shareOpen} transparent animationType="fade" onRequestClose={() => setShareOpen(false)}>
        <Pressable style={styles.shareWrap} onPress={() => setShareOpen(false)}>
          <View style={[styles.shareCard, { backgroundColor: c.surface }]}>
            <Text style={{ color: c.onSurface, fontWeight: '700', fontSize: 16, textAlign: 'center', marginBottom: SPACING.md }}>Compartir himno</Text>
            <Pressable onPress={shareImage} style={[styles.shareOpt, { backgroundColor: c.brand }]} testID="share-image">
              <Feather name="image" size={18} color={c.onSurfaceInverse} />
              <Text style={{ color: c.onSurfaceInverse, fontWeight: '700' }}>Compartir como imagen</Text>
            </Pressable>
            <Pressable onPress={() => { setShareOpen(false); share(); }} style={[styles.shareOpt, { borderColor: c.border, borderWidth: 1 }]} testID="share-text">
              <Feather name="type" size={18} color={c.brand} />
              <Text style={{ color: c.onSurface, fontWeight: '600' }}>Compartir como texto</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Off-screen render for image capture */}
      <View style={styles.offscreen} pointerEvents="none">
        {sharePages.map((pg, i) => (
          <ShareCard
            key={i}
            ref={(r) => {
              pageRefs.current[i] = r;
            }}
            himnario={hymn.himnario}
            numero={hymn.numero}
            titulo={hymn.titulo}
            page={pg}
            equivalencia={
              pg.pageIndex === 1
                ? equivText
                : null
            }
            colors={c}
            isDark={isDark}
            hymnFont={hymnFont}
            hymnAlign={hymnAlign}
            baseSize={baseSize}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  offscreen: { position: 'absolute', left: -10000, top: 0 },
  shareWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: SPACING.xl },
  shareCard: { width: '100%', maxWidth: 360, borderRadius: RADIUS.lg, padding: SPACING.xl },
  shareOpt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, height: 52, borderRadius: RADIUS.md, marginBottom: SPACING.sm },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, gap: SPACING.sm },
  iconBtn: {
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  scroll: { padding: SPACING.lg, paddingBottom: 140 },
  himnario: { fontSize: 11, fontWeight: '800', letterSpacing: 2 },
  number: { fontSize: 27, fontWeight: '900', letterSpacing: 1, marginTop: 1 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: -1,
    lineHeight: 24,
  },
  equivBox: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, marginTop: SPACING.md },
  equivCompact: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 3,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },

  equivCompactText: {
    fontSize: 11,
    lineHeight: 15,
    flexShrink: 1,
    textAlign: 'center',
  },

  meta: { fontSize: 12, fontStyle: 'italic' },
  divider: { height: 2, width: 60, marginTop: 14, marginBottom: 14, opacity: 0.7 },
stanzaTitle: { fontSize: 14, fontWeight: '800', fontStyle: 'italic', letterSpacing: 1.8, marginBottom: SPACING.md },
  verse: {},
chorusClean: { paddingVertical: 8, marginTop: 6, marginBottom: 10 },
controlBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', paddingHorizontal: SPACING.md, paddingTop: 6, gap: 6, borderTopWidth: 1 },
  ctrl: { minWidth: 44, height: 44, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  ctrlWide: { flex: 1, flexDirection: 'row', height: 44, borderRadius: RADIUS.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 8 },
  externalChordBtn: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  modeTabs: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.xl,
  },

  modeTab: {
    flex: 1,
    height: 42,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  backToLyrics: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 5,
    paddingRight: 8,
    marginBottom: SPACING.sm,
  },

  musicStatusCard: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },

  musicStatusIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  musicStatusTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },

  musicStatusDescription: {
    fontSize: 13,
    lineHeight: 19,
  },

  audioWrap: {
    paddingVertical: SPACING.md,
  },

  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },

  audioSource: {
    fontSize: 11.5,
    marginTop: 3,
  },

  audioCard: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },

  audioTimes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  audioTime: {
    fontSize: 11,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  audioSeekArea: {
    height: 32,
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },

  audioTrack: {
    height: 6,
    borderRadius: 6,
    overflow: 'visible',
  },

  audioProgress: {
    height: '100%',
    borderRadius: 6,
  },

  audioThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -5,
    marginLeft: -8,
  },

  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
  },

  audioPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  audioSmallBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  externalAudioBtn: {
    minHeight: 46,
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },

  externalAudioBtnAvailable: {
    backgroundColor: '#EDF8F0',
    borderColor: '#8AC59A',
    marginTop: 0,
  },

  externalAudioBtnAvailableText: {
    color: '#287A40',
    fontWeight: '800',
    fontSize: 13,
  },

  externalAudioOnlyWrap: {
    gap: 10,
  },

  externalAudioPrimaryBtn: {
    minHeight: 86,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },

  externalAudioPrimaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  externalAudioPrimaryTitle: {
    fontSize: 18,
    fontWeight: '800',
  },

  externalAudioPrimarySubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 3,
    opacity: 0.82,
  },

  externalAudioHint: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },

  audioLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: SPACING.md,
  },

  experimentalBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
  },

  experimentalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: SPACING.md,
  },

  experimentalMeta: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: '700',
  },

  experimentalText: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: SPACING.md,
  },

  transposeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: 5,
    marginBottom: SPACING.xl,
  },

  transposeBtn: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  transposeCenter: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  transposeTone: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 25,
  },

  transposeCaption: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },

  chordsWrap: {
    paddingVertical: SPACING.md,
  },

  chordsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },

  chordsBlocks: {
    gap: SPACING.xl,
  },

  chordBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },

  chordBlockTitle: {
    width: 40,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 18,
  },

  chordAlignedLine: {
    marginBottom: 14,
  },

  chordAlignedChord: {
    fontFamily: Platform.OS === 'ios'
      ? 'Courier'
      : 'monospace',
    fontWeight: '800',
  },

  chordAlignedLyrics: {
    fontFamily: Platform.OS === 'ios'
      ? 'Courier'
      : 'monospace',
  },

  chordLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  chordSegment: {
    alignItems: 'flex-start',
  },

  chordName: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    minHeight: 18,
  },

  chordLyrics: {
    paddingRight: 1,
  },
});
