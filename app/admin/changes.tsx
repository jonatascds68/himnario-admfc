import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api, AdminHymnChange } from '@/src/lib/api';

type PreparedContentPublication = {
  revision: number;
  generated_at: string | null;
  total_changes: number;
};

function displayValue(value: any): string {
  if (value === undefined || value === null || value === '') {
    return '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Sí' : 'No';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '—';

    if (value.every((item) => typeof item === 'string')) {
      return value.join(', ');
    }

    return `${value.length} elemento${value.length === 1 ? '' : 's'}`;
  }

  if (typeof value === 'object') {
    return 'Contenido actualizado';
  }

  return String(value);
}


function blockLabel(block: any, index: number): string {
  const tipo = String(
    block?.tipo ?? block?.type ?? block?.kind ?? ''
  ).toLowerCase();

  if (tipo.includes('coro') || tipo.includes('chorus')) {
    return 'CORO';
  }

  const numero =
    block?.numero ??
    block?.number ??
    block?.n ??
    index + 1;

  return `ESTROFA ${numero}`;
}

function blockText(block: any): string {
  if (!block) return '—';

  const value =
    block?.texto ??
    block?.text ??
    block?.letra ??
    block?.content ??
    '';

  if (Array.isArray(value)) {
    return value.join('\n').trim() || '—';
  }

  return String(value ?? '').trim() || '—';
}

function ChangedBlocksView({
  before,
  after,
  c,
}: {
  before: any;
  after: any;
  c: any;
}) {
  const oldBlocks = Array.isArray(before) ? before : [];
  const newBlocks = Array.isArray(after) ? after : [];

  const total = Math.max(oldBlocks.length, newBlocks.length);

  const changed = Array.from({ length: total }, (_, index) => ({
    index,
    oldBlock: oldBlocks[index],
    newBlock: newBlocks[index],
  })).filter(
    ({ oldBlock, newBlock }) =>
      JSON.stringify(oldBlock ?? null) !==
      JSON.stringify(newBlock ?? null)
  );

  if (!changed.length) {
    return (
      <Text style={[styles.valueText, { color: c.muted }]}>
        Sin diferencias visibles
      </Text>
    );
  }

  return (
    <View style={styles.blocksReview}>
      {changed.map(({ index, oldBlock, newBlock }) => {
        const reference = newBlock ?? oldBlock;

        return (
          <View
            key={`${index}-${blockLabel(reference, index)}`}
            style={[
              styles.blockReview,
              {
                borderColor: c.border,
                backgroundColor: c.surfaceSecondary,
              },
            ]}
          >
            <Text style={[styles.blockTitle, { color: c.brand }]}>
              {blockLabel(reference, index)}
            </Text>

            <Text style={[styles.valueLabel, { color: c.muted }]}>
              ANTES
            </Text>

            <Text style={[styles.blockText, { color: c.onSurface }]}>
              {blockText(oldBlock)}
            </Text>

            <View
              style={[
                styles.blockDivider,
                { backgroundColor: c.divider },
              ]}
            />

            <Text style={[styles.valueLabel, { color: c.muted }]}>
              DESPUÉS
            </Text>

            <Text style={[styles.blockText, { color: c.onSurface }]}>
              {blockText(newBlock)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function AdminChanges() {
  const router = useRouter();
  const { c } = useTheme();
  const [changes, setChanges] = useState<AdminHymnChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [preparedPublication, setPreparedPublication] =
    useState<PreparedContentPublication | null>(null);
  const [confirmingPublication, setConfirmingPublication] =
    useState(false);
  const [publicationTarget, setPublicationTarget] =
    useState<PreparedContentPublication | null>(null);
  const [reviewTarget, setReviewTarget] =
    useState<AdminHymnChange | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadChanges = useCallback(async () => {
    setLoading(true);
    try {
      const [result, prepared] = await Promise.all([
        api.listAdminChanges(),
        api.getPreparedContentPublication(),
      ]);

      setChanges(result.items);
      setPreparedPublication(prepared);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChanges();
    }, [loadChanges])
  );

  const exportChanges = async () => {
    if (!changes.length || exporting) return;

    try {
      setExporting(true);

      const data = await api.exportAdminChanges();

      const ts = new Date()
        .toISOString()
        .replace(/[:.]/g, '-');

      const filename = `admfc-correcciones-${ts}.json`;
      const content = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob(
          [content],
          { type: 'application/json' }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
      } else {
        const uri =
          (FileSystem as any).cacheDirectory +
          filename;

        await (FileSystem as any).writeAsStringAsync(
          uri,
          content
        );

        if (Platform.OS === 'android') {
          const SAF =
            (FileSystem as any).StorageAccessFramework;

          Alert.alert(
            'Exportar correcciones',
            '¿Cómo desea exportar el archivo de correcciones?',
            [
              {
                text: 'Guardar archivo',
                onPress: async () => {
                  try {
                    const permission =
                      await SAF.requestDirectoryPermissionsAsync();

                    if (!permission.granted) {
                      return;
                    }

                    const fileUri =
                      await SAF.createFileAsync(
                        permission.directoryUri,
                        filename,
                        'application/json'
                      );

                    await (FileSystem as any).writeAsStringAsync(
                      fileUri,
                      content
                    );

                    Alert.alert(
                      'Archivo guardado',
                      `Las correcciones fueron guardadas correctamente como:\n\n${filename}`
                    );
                  } catch (saveError: any) {
                    Alert.alert(
                      'Error',
                      saveError?.message ||
                        'No se pudo guardar el archivo'
                    );
                  }
                },
              },
              {
                text: 'Compartir',
                onPress: async () => {
                  try {
                    const available =
                      await Sharing.isAvailableAsync();

                    if (!available) {
                      throw new Error(
                        'El sistema no permite compartir archivos en este dispositivo'
                      );
                    }

                    await Sharing.shareAsync(uri, {
                      mimeType: 'application/json',
                      dialogTitle:
                        'Exportar correcciones ADMFC',
                    });
                  } catch (shareError: any) {
                    Alert.alert(
                      'Error',
                      shareError?.message ||
                        'No se pudo compartir el archivo'
                    );
                  }
                },
              },
              {
                text: 'Cancelar',
                style: 'cancel',
              },
            ]
          );
        } else {
          const available =
            await Sharing.isAvailableAsync();

          if (!available) {
            throw new Error(
              'El sistema no permite compartir archivos en este dispositivo'
            );
          }

          await Sharing.shareAsync(uri, {
            mimeType: 'application/json',
            dialogTitle: 'Exportar correcciones ADMFC',
          });
        }
      }
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.message ||
          'No se pudieron exportar las correcciones'
      );
    } finally {
      setExporting(false);
    }
  };


  /*
   * ADMFC 7AA.44 — gera o pacote enxuto que futuramente
   * será distribuído automaticamente aos usuários.
   *
   * Gerar/compartilhar NÃO significa publicar.
   * A revisão só será confirmada quando existir publicação remota real.
   */
  const generateContentUpdate = async () => {
    if (!changes.length || exporting || preparedPublication) return;

    try {
      setExporting(true);

      const data = await api.exportContentUpdates();

      const prepared =
        await api.getPreparedContentPublication();

      setPreparedPublication(prepared);

      const filename =
        `admfc-update-r${String(data.revision).padStart(6, '0')}.json`;

      const content = JSON.stringify(data, null, 2);

      if (Platform.OS === 'web') {
        const blob = new Blob(
          [content],
          { type: 'application/json' }
        );

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        a.href = url;
        a.download = filename;
        a.click();

        URL.revokeObjectURL(url);
        return;
      }

      const uri =
        (FileSystem as any).cacheDirectory + filename;

      await (FileSystem as any).writeAsStringAsync(
        uri,
        content
      );

      const available =
        await Sharing.isAvailableAsync();

      if (!available) {
        throw new Error(
          'El sistema no permite compartir archivos en este dispositivo'
        );
      }

      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        dialogTitle:
          `Actualización ADMFC — revisión ${data.revision}`,
      });
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.message ||
          'No se pudo generar la actualización'
      );
    } finally {
      setExporting(false);
    }
  };

  const confirmPublication = async () => {
    if (!publicationTarget || confirmingPublication) return;

    const target = publicationTarget;

    try {
      setConfirmingPublication(true);

      const result = await api.confirmContentPublished(
        target.revision
      );

      setPublicationTarget(null);

      await loadChanges();

      Alert.alert(
        'Publicación confirmada',
        `La revisión R${String(result.revision).padStart(6, '0')} fue confirmada correctamente.`
      );
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.message || 'No se pudo confirmar la publicación'
      );
    } finally {
      setConfirmingPublication(false);
    }
  };

  const markAsReviewed = (item: AdminHymnChange) => {
    setReviewTarget(item);
  };

  const confirmReviewed = async () => {
    if (!reviewTarget || reviewingId) return;

    const item = reviewTarget;

    try {
      setReviewingId(item.id);

      await api.markAdminChangeReviewed(item.id);

      setReviewTarget(null);
      await loadChanges();
    } catch (e: any) {
      Alert.alert(
        'Error',
        e?.message || 'No se pudo marcar como revisado'
      );
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.surface }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Feather name="chevron-left" size={28} color={c.brand} />
        </Pressable>
        <Text style={[styles.title, { color: c.brand }]}>
          Cambios pendientes
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={c.brand} />
          <Text style={[styles.description, { color: c.muted }]}>
            Cargando cambios...
          </Text>
        </View>
      ) : changes.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="check-circle" size={42} color={c.brand} />
          <Text style={[styles.heading, { color: c.onSurface }]}>
            Todo actualizado
          </Text>
          <Text style={[styles.description, { color: c.muted }]}>
            No hay correcciones administrativas pendientes.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summary}>
            <Text style={[styles.summaryNumber, { color: c.brand }]}>
              {changes.length}
            </Text>
            <Text style={[styles.summaryText, { color: c.muted }]}>
              {changes.length === 1
                ? 'corrección pendiente'
                : 'correcciones pendientes'}
            </Text>
          </View>

          <Pressable
            onPress={exportChanges}
            disabled={exporting}
            style={[
              styles.exportButton,
              {
                backgroundColor: c.brand,
                opacity: exporting ? 0.65 : 1,
              },
            ]}
          >
            {exporting ? (
              <ActivityIndicator
                size="small"
                color={c.surface}
              />
            ) : (
              <Feather
                name="share-2"
                size={17}
                color={c.surface}
              />
            )}

            <Text
              style={[
                styles.exportButtonText,
                { color: c.surface },
              ]}
            >
              {exporting
                ? 'Exportando...'
                : 'Exportar correcciones'}
            </Text>
          </Pressable>


          <Pressable
            onPress={generateContentUpdate}
            disabled={exporting || !!preparedPublication}
            style={[
              styles.exportButton,
              {
                backgroundColor: c.surfaceSecondary,
                borderWidth: 1,
                borderColor: c.brand,
                opacity:
                  exporting || preparedPublication
                    ? 0.55
                    : 1,
              },
            ]}
          >
            <Feather
              name="upload-cloud"
              size={17}
              color={c.brand}
            />

            <Text
              style={[
                styles.exportButtonText,
                { color: c.brand },
              ]}
            >
              {preparedPublication
                ? 'Actualización preparada'
                : 'Generar actualización'}
            </Text>
          </Pressable>

          {preparedPublication ? (
            <View
              style={[
                styles.preparedCard,
                {
                  backgroundColor: c.surface,
                  borderColor: c.brand,
                },
              ]}
            >
              <View style={styles.preparedHeader}>
                <Feather
                  name="upload-cloud"
                  size={22}
                  color={c.brand}
                />

                <View style={styles.preparedHeaderText}>
                  <Text
                    style={[
                      styles.preparedTitle,
                      { color: c.onSurface },
                    ]}
                  >
                    Actualización preparada
                  </Text>

                  <Text
                    style={[
                      styles.preparedRevision,
                      { color: c.brand },
                    ]}
                  >
                    R{String(preparedPublication.revision).padStart(6, '0')}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.preparedDescription,
                  { color: c.muted },
                ]}
              >
                {preparedPublication.total_changes}{' '}
                {preparedPublication.total_changes === 1
                  ? 'corrección revisada'
                  : 'correcciones revisadas'}{' '}
                esperan confirmación de publicación.
              </Text>

              {preparedPublication.generated_at ? (
                <Text
                  style={[
                    styles.preparedDate,
                    { color: c.muted },
                  ]}
                >
                  Preparada:{' '}
                  {new Date(
                    preparedPublication.generated_at
                  ).toLocaleString()}
                </Text>
              ) : null}

              <Pressable
                onPress={() =>
                  setPublicationTarget(preparedPublication)
                }
                disabled={confirmingPublication}
                style={[
                  styles.confirmPublicationButton,
                  {
                    backgroundColor: c.brand,
                    opacity: confirmingPublication ? 0.65 : 1,
                  },
                ]}
              >
                <Feather
                  name="check-circle"
                  size={17}
                  color={c.surface}
                />

                <Text
                  style={[
                    styles.confirmPublicationButtonText,
                    { color: c.surface },
                  ]}
                >
                  Confirmar publicación
                </Text>
              </Pressable>
            </View>
          ) : null}

          {changes.map((item) => (
            <View
              key={item.id}
              style={[
                styles.changeCard,
                {
                  backgroundColor: c.surfaceSecondary,
                  borderColor: c.border,
                },
              ]}
            >
              <View style={styles.cardTop}>
                <View style={styles.hymnIdentity}>
                  <Text style={[styles.hymnal, { color: c.brand }]}>
                    {item.himnario === 'Gloria y Triunfo' ? 'GT' : 'SIÓN'}
                    {'  '}Nº {item.numero}
                  </Text>

                  <Text
                    style={[styles.hymnTitle, { color: c.onSurface }]}
                    numberOfLines={2}
                  >
                    {item.titulo}
                  </Text>
                </View>

                <Feather name="edit-3" size={18} color={c.brand} />
              </View>

              <View style={[styles.divider, { backgroundColor: c.divider }]} />

              <Text style={[styles.fieldsLabel, { color: c.muted }]}>
                CAMPOS MODIFICADOS
              </Text>

              <View style={styles.fields}>
                {item.changed_fields.map((field) => (
                  <View
                    key={field}
                    style={[
                      styles.fieldChange,
                      {
                        borderColor: c.border,
                        backgroundColor: c.surface,
                      },
                    ]}
                  >
                    <Text style={[styles.fieldName, { color: c.brand }]}>
                      {field}
                    </Text>

                    {field === 'bloques' ? (
                      <ChangedBlocksView
                        before={(item.before as any)?.[field]}
                        after={(item.after as any)?.[field]}
                        c={c}
                      />
                    ) : (
                      <View style={styles.valueRow}>
                        <View style={styles.valueColumn}>
                          <Text style={[styles.valueLabel, { color: c.muted }]}>
                            ANTES
                          </Text>

                          <Text
                            style={[styles.valueText, { color: c.onSurface }]}
                            numberOfLines={4}
                          >
                            {displayValue((item.before as any)?.[field])}
                          </Text>
                        </View>

                        <Feather
                          name="arrow-right"
                          size={16}
                          color={c.muted}
                          style={styles.arrow}
                        />

                        <View style={styles.valueColumn}>
                          <Text style={[styles.valueLabel, { color: c.muted }]}>
                            DESPUÉS
                          </Text>

                          <Text
                            style={[styles.valueText, { color: c.onSurface }]}
                            numberOfLines={4}
                          >
                            {displayValue((item.after as any)?.[field])}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.dateRow}>
                  <Feather name="clock" size={13} color={c.muted} />
                  <Text style={[styles.dateText, { color: c.muted }]}>
                    {new Date(item.created_at).toLocaleString()}
                  </Text>
                </View>

                <Pressable
                  onPress={() => {
                    if (item.status !== 'reviewed') {
                      markAsReviewed(item);
                    }
                  }}
                  disabled={reviewingId === item.id}
                  style={[
                    styles.reviewButton,
                    {
                      borderColor: c.brand,
                      opacity:
                        reviewingId === item.id
                          ? 0.6
                          : item.status === 'reviewed'
                            ? 0.72
                            : 1,
                    },
                  ]}
                >
                  {reviewingId === item.id ? (
                    <ActivityIndicator size="small" color={c.brand} />
                  ) : (
                    <Feather
                      name={item.status === 'reviewed' ? 'check-circle' : 'eye'}
                      size={15}
                      color={c.brand}
                    />
                  )}

                  <Text
                    style={[
                      styles.reviewButtonText,
                      { color: c.brand },
                    ]}
                  >
                    {item.status === 'reviewed' ? 'Revisado' : 'Revisar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    <Modal
      visible={!!publicationTarget}
      transparent
      animationType="fade"
      onRequestClose={() => {
        if (!confirmingPublication) {
          setPublicationTarget(null);
        }
      }}
    >
      <View style={styles.reviewOverlay}>
        <View
          style={[
            styles.reviewCard,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
            },
          ]}
        >
          <View
            style={[
              styles.reviewIcon,
              { backgroundColor: c.surfaceSecondary },
            ]}
          >
            <Feather
              name="upload-cloud"
              size={29}
              color={c.brand}
            />
          </View>

          <Text
            style={[
              styles.reviewTitle,
              { color: c.onSurface },
            ]}
          >
            Confirmar publicación
          </Text>

          {publicationTarget ? (
            <Text
              style={[
                styles.publicationRevision,
                { color: c.brand },
              ]}
            >
              R{String(publicationTarget.revision).padStart(6, '0')}
            </Text>
          ) : null}

          <Text
            style={[
              styles.reviewText,
              { color: c.muted },
            ]}
          >
            Confirme solamente después de que el archivo de
            actualización haya sido publicado correctamente.
          </Text>

          <Text
            style={[
              styles.reviewWarning,
              { color: c.muted },
            ]}
          >
            Al confirmar, las correcciones incluidas en esta
            revisión serán retiradas de la fila administrativa.
            Cualquier corrección realizada después de generar el
            archivo será preservada.
          </Text>

          <View style={styles.reviewActions}>
            <Pressable
              onPress={() => setPublicationTarget(null)}
              disabled={confirmingPublication}
              style={[
                styles.reviewModalButton,
                {
                  backgroundColor: c.surfaceSecondary,
                  borderColor: c.borderStrong,
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
                  styles.reviewModalButtonText,
                  { color: c.onSurface },
                ]}
              >
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={confirmPublication}
              disabled={confirmingPublication}
              style={[
                styles.reviewModalButton,
                styles.reviewConfirmButton,
                {
                  backgroundColor: c.brand,
                  opacity: confirmingPublication ? 0.65 : 1,
                },
              ]}
            >
              {confirmingPublication ? (
                <ActivityIndicator
                  size="small"
                  color={c.onSurfaceInverse}
                />
              ) : (
                <Feather
                  name="check"
                  size={18}
                  color={c.onSurfaceInverse}
                />
              )}

              <Text
                style={[
                  styles.reviewModalButtonText,
                  { color: c.onSurfaceInverse },
                ]}
              >
                Confirmar
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    <Modal
      visible={!!reviewTarget}
      transparent
      animationType="fade"
      onRequestClose={() => setReviewTarget(null)}
    >
      <View style={styles.reviewOverlay}>
        <View
          style={[
            styles.reviewCard,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
            },
          ]}
        >
          <View
            style={[
              styles.reviewIcon,
              { backgroundColor: c.surfaceSecondary },
            ]}
          >
            <Feather
              name="check-circle"
              size={29}
              color={c.brand}
            />
          </View>

          <Text
            style={[
              styles.reviewTitle,
              { color: c.onSurface },
            ]}
          >
            Marcar como revisado
          </Text>

          <Text
            style={[
              styles.reviewText,
              { color: c.muted },
            ]}
          >
            Esta corrección quedará marcada como revisada y se conservará
            para la próxima publicación.
          </Text>

          {reviewTarget ? (
            <View
              style={[
                styles.reviewHymnBox,
                {
                  backgroundColor: c.surfaceSecondary,
                  borderColor: c.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.reviewHymnMeta,
                  { color: c.brand },
                ]}
              >
                {reviewTarget.himnario} · Nº {reviewTarget.numero}
              </Text>

              <Text
                numberOfLines={2}
                style={[
                  styles.reviewHymnTitle,
                  { color: c.onSurface },
                ]}
              >
                {reviewTarget.titulo}
              </Text>
            </View>
          ) : null}

          <Text
            style={[
              styles.reviewWarning,
              { color: c.muted },
            ]}
          >
            Marque como revisado solamente después de comprobar que
            la corrección está correcta. Solo los cambios revisados podrán
            formar parte de la próxima actualización.
          </Text>

          <View style={styles.reviewActions}>
            <Pressable
              onPress={() => setReviewTarget(null)}
              style={[
                styles.reviewModalButton,
                {
                  backgroundColor: c.surfaceSecondary,
                  borderColor: c.borderStrong,
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
                  styles.reviewModalButtonText,
                  { color: c.onSurface },
                ]}
              >
                Cancelar
              </Text>
            </Pressable>

            <Pressable
              onPress={confirmReviewed}
              style={[
                styles.reviewModalButton,
                styles.reviewConfirmButton,
                { backgroundColor: c.brand },
              ]}
            >
              <Feather
                name="check"
                size={18}
                color={c.onSurfaceInverse}
              />
              <Text
                style={[
                  styles.reviewModalButtonText,
                  { color: c.onSurfaceInverse },
                ]}
              >
                Marcar revisado
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  preparedCard: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  preparedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  preparedHeaderText: {
    flex: 1,
  },
  preparedTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  preparedRevision: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  preparedDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: SPACING.md,
  },
  preparedDate: {
    fontSize: 12,
    marginTop: SPACING.sm,
  },
  confirmPublicationButton: {
    minHeight: 44,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  confirmPublicationButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  publicationRevision: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  blocksReview: {
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  blockReview: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  blockText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5,
  },
  blockDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.md,
  },

  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: SPACING.md,
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxxl,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  summaryNumber: {
    fontSize: 30,
    fontWeight: '800',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    marginBottom: SPACING.md,
  },
  exportButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
  changeCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  hymnIdentity: {
    flex: 1,
  },
  hymnal: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  hymnTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  fieldsLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: SPACING.sm,
  },
  fields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  fieldChange: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.sm,
  },
  fieldName: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  valueColumn: {
    flex: 1,
  },
  valueLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.7,
    marginBottom: 3,
  },
  valueText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  arrow: {
    marginHorizontal: SPACING.sm,
    marginTop: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  dateText: {
    fontSize: 11,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 6,
    minWidth: 92,
  },
  reviewButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },

  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },

  reviewCard: {
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.xl,
    alignItems: 'center',
  },

  reviewIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },

  reviewTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },

  reviewText: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },

  reviewHymnBox: {
    width: '100%',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },

  reviewHymnMeta: {
    fontSize: 10.5,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginBottom: 4,
  },

  reviewHymnTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
  },

  reviewWarning: {
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: SPACING.md,
  },

  reviewActions: {
    width: '100%',
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },

  reviewModalButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: SPACING.sm,
  },

  reviewConfirmButton: {
    borderWidth: 0,
  },

  reviewModalButtonText: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

});
