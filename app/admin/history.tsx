import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING, RADIUS } from '@/src/theme/tokens';
import { api } from '@/src/lib/api';

type PublicationHistoryItem = {
  revision: number;
  generated_at: string | null;
  published_at: string | null;
  changes: Array<{
    id: string;
    hymn_id: string;
    changed_fields: string[];
    after: Record<string, any>;
  }>;
};

function revisionLabel(revision: number) {
  return `R${String(revision).padStart(6, '0')}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
}

export default function AdminPublicationHistory() {
  const router = useRouter();
  const { c } = useTheme();

  const [items, setItems] = useState<PublicationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRevision, setExpandedRevision] =
    useState<number | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);

    try {
      const result = await api.getContentPublicationHistory();

      setItems(
        Array.isArray(result)
          ? (result as PublicationHistoryItem[])
          : []
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: c.surface },
      ]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Feather
            name="chevron-left"
            size={28}
            color={c.brand}
          />
        </Pressable>

        <Text
          style={[
            styles.title,
            { color: c.brand },
          ]}
        >
          Historial de actualizaciones
        </Text>
      </View>

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator color={c.brand} />

          <Text
            style={[
              styles.emptyDescription,
              { color: c.muted },
            ]}
          >
            Cargando historial...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather
            name="archive"
            size={44}
            color={c.brand}
          />

          <Text
            style={[
              styles.emptyTitle,
              { color: c.onSurface },
            ]}
          >
            Sin publicaciones registradas
          </Text>

          <Text
            style={[
              styles.emptyDescription,
              { color: c.muted },
            ]}
          >
            Las próximas actualizaciones confirmadas
            aparecerán aquí.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.summary}>
            <Text
              style={[
                styles.summaryNumber,
                { color: c.brand },
              ]}
            >
              {items.length}
            </Text>

            <Text
              style={[
                styles.summaryText,
                { color: c.muted },
              ]}
            >
              {items.length === 1
                ? 'publicación registrada'
                : 'publicaciones registradas'}
            </Text>
          </View>

          {items.map(item => {
            const expanded =
              expandedRevision === item.revision;

            return (
              <View
                key={item.revision}
                style={[
                  styles.card,
                  {
                    backgroundColor:
                      c.surfaceSecondary,
                    borderColor: c.border,
                  },
                ]}
              >
                <Pressable
                  onPress={() =>
                    setExpandedRevision(
                      expanded
                        ? null
                        : item.revision
                    )
                  }
                  style={styles.cardHeader}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver revisión ${revisionLabel(
                    item.revision
                  )}`}
                >
                  <View
                    style={[
                      styles.iconBox,
                      {
                        borderColor: c.brand,
                      },
                    ]}
                  >
                    <Feather
                      name="check-circle"
                      size={22}
                      color={c.brand}
                    />
                  </View>

                  <View style={styles.cardIdentity}>
                    <Text
                      style={[
                        styles.revision,
                        { color: c.brand },
                      ]}
                    >
                      {revisionLabel(item.revision)}
                    </Text>

                    <Text
                      style={[
                        styles.cardTitle,
                        { color: c.onSurface },
                      ]}
                    >
                      Actualización publicada
                    </Text>
                  </View>

                  <Feather
                    name={
                      expanded
                        ? 'chevron-up'
                        : 'chevron-down'
                    }
                    size={22}
                    color={c.muted}
                  />
                </Pressable>

                <View
                  style={[
                    styles.divider,
                    { backgroundColor: c.divider },
                  ]}
                />

                <View style={styles.metaRow}>
                  <Feather
                    name="calendar"
                    size={14}
                    color={c.muted}
                  />

                  <Text
                    style={[
                      styles.metaText,
                      { color: c.muted },
                    ]}
                  >
                    Publicada: {formatDate(item.published_at)}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Feather
                    name="edit-3"
                    size={14}
                    color={c.muted}
                  />

                  <Text
                    style={[
                      styles.metaText,
                      { color: c.muted },
                    ]}
                  >
                    {item.changes.length}{' '}
                    {item.changes.length === 1
                      ? 'corrección'
                      : 'correcciones'}
                  </Text>
                </View>

                {expanded ? (
                  <View
                    style={[
                      styles.details,
                      {
                        backgroundColor: c.surface,
                        borderColor: c.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.detailsTitle,
                        { color: c.muted },
                      ]}
                    >
                      DETALLES DE LA PUBLICACIÓN
                    </Text>

                    <Text
                      style={[
                        styles.detailText,
                        { color: c.onSurface },
                      ]}
                    >
                      Preparada:{' '}
                      {formatDate(item.generated_at)}
                    </Text>

                    <Text
                      style={[
                        styles.detailText,
                        { color: c.onSurface },
                      ]}
                    >
                      Confirmada:{' '}
                      {formatDate(item.published_at)}
                    </Text>

                    {item.changes.map(
                      (change, index) => (
                        <View
                          key={`${change.id}-${index}`}
                          style={[
                            styles.changeItem,
                            {
                              borderTopColor:
                                c.divider,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.changeHymn,
                              { color: c.brand },
                            ]}
                          >
                            Himno {change.hymn_id}
                          </Text>

                          <Text
                            style={[
                              styles.changeFields,
                              { color: c.muted },
                            ]}
                          >
                            Campos publicados:{' '}
                            {change.changed_fields.length
                              ? change.changed_fields.join(
                                  ', '
                                )
                              : '—'}
                          </Text>
                        </View>
                      )
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
  },

  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },

  summary: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginVertical: SPACING.lg,
  },

  summaryNumber: {
    fontSize: 36,
    fontWeight: '500',
  },

  summaryText: {
    fontSize: 17,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },

  emptyTitle: {
    fontSize: 23,
    fontWeight: '700',
    textAlign: 'center',
  },

  emptyDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },

  card: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBox: {
    width: 42,
    height: 42,
    borderWidth: 1,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardIdentity: {
    flex: 1,
  },

  revision: {
    fontSize: 19,
    fontWeight: '800',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: SPACING.md,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 7,
  },

  metaText: {
    fontSize: 14,
  },

  details: {
    marginTop: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.md,
  },

  detailsTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 12,
  },

  detailText: {
    fontSize: 14,
    marginBottom: 6,
  },

  changeItem: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    marginTop: 12,
  },

  changeHymn: {
    fontSize: 15,
    fontWeight: '700',
  },

  changeFields: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
});
