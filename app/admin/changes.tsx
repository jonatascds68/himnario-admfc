import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/src/theme/ThemeContext';
import { SPACING } from '@/src/theme/tokens';
import { api, AdminHymnChange } from '@/src/lib/api';

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

export default function AdminChanges() {
  const router = useRouter();
  const { c } = useTheme();
  const [changes, setChanges] = useState<AdminHymnChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const loadChanges = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listAdminChanges();
      setChanges(result.items);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadChanges();
    }, [loadChanges])
  );

  const markAsReviewed = (item: AdminHymnChange) => {
    Alert.alert(
      'Marcar como revisado',
      `¿Confirmar que la corrección de ${item.himnario === 'Gloria y Triunfo' ? 'GT' : 'Sión'} Nº ${item.numero} ya fue revisada?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sí, revisado',
          onPress: async () => {
            try {
              setReviewingId(item.id);

              await api.removeAdminChange(item.id);

              setChanges(current =>
                current.filter(change => change.id !== item.id)
              );
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.message || 'No se pudo marcar la corrección como revisada'
              );
            } finally {
              setReviewingId(null);
            }
          },
        },
      ]
    );
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
                  onPress={() => markAsReviewed(item)}
                  disabled={reviewingId === item.id}
                  style={[
                    styles.reviewButton,
                    {
                      borderColor: c.brand,
                      opacity: reviewingId === item.id ? 0.6 : 1,
                    },
                  ]}
                >
                  {reviewingId === item.id ? (
                    <ActivityIndicator size="small" color={c.brand} />
                  ) : (
                    <Feather name="check" size={15} color={c.brand} />
                  )}

                  <Text
                    style={[
                      styles.reviewButtonText,
                      { color: c.brand },
                    ]}
                  >
                    Revisado
                  </Text>
                </Pressable>
              </View>
            </View>
          ))}
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
});
