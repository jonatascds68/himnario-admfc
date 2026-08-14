import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Section } from '@/src/lib/api';
import { GOLD } from '@/src/theme/tokens';

const BG = '#121418';
const FG = '#F3F4F6';
const MUTED = '#9CA3AF';
const CARD2 = '#1E2128';

export interface SharePage {
  sections: Section[];
  pageIndex: number;
  pageTotal: number;
}

export function buildSharePages(sections: Section[]): SharePage[] {
  const MAX_CHARS = 620;
  const MAX_BLOCKS = 4;
  const pages: Section[][] = [];
  let cur: Section[] = [];
  let count = 0;
  for (const s of sections) {
    const len = (s.text || '').length + 20;
    if (cur.length > 0 && (count + len > MAX_CHARS || cur.length >= MAX_BLOCKS)) {
      pages.push(cur); cur = []; count = 0;
    }
    cur.push(s); count += len;
  }
  if (cur.length) pages.push(cur);
  if (pages.length === 0) pages.push([]);
  return pages.map((secs, i) => ({ sections: secs, pageIndex: i + 1, pageTotal: pages.length }));
}

interface Props {
  himnario: string;
  numero: number;
  titulo: string;
  page: SharePage;
  equivalencia?: string | null;
}

export const ShareCard = React.forwardRef<View, Props>(({ himnario, numero, titulo, page, equivalencia }, ref) => {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <Text style={styles.brand}>HIMNARIO ADMFC</Text>
      <Text style={styles.brandSub}>Asamblea de Dios · Misión de la Fe Cristiana</Text>
      <View style={styles.divider} />
      {page.pageIndex === 1 ? (
        <>
          <Text style={styles.himnario}>{himnario.toUpperCase()}</Text>
          <Text style={styles.number}>Nº {numero}</Text>
          <Text style={styles.title}>{titulo}</Text>
          {equivalencia ? <Text style={styles.equiv}>También en: {equivalencia}</Text> : null}
          <View style={styles.smallDivider} />
        </>
      ) : (
        <Text style={styles.contHead}>{himnario.toUpperCase()} · Nº {numero} — {titulo}</Text>
      )}
      {page.sections.map((s, i) => (
        <View key={i} style={{ marginBottom: 16 }}>
          <Text style={styles.label}>{s.kind === 'chorus' ? 'CORO' : `${s.index ?? i + 1}ª ESTROFA`}</Text>
          <View style={s.kind === 'chorus' ? styles.chorusBox : undefined}>
            <Text style={[styles.verse, s.kind === 'chorus' && { fontStyle: 'italic' }]}>{s.text}</Text>
          </View>
        </View>
      ))}
      <View style={styles.footer}>
        <Text style={styles.footerText}>himnario admfc</Text>
        {page.pageTotal > 1 ? <Text style={styles.footerText}>{page.pageIndex}/{page.pageTotal}</Text> : null}
      </View>
    </View>
  );
});
ShareCard.displayName = 'ShareCard';

const styles = StyleSheet.create({
  card: { width: 400, backgroundColor: BG, padding: 28 },
  brand: { color: GOLD, fontSize: 20, fontWeight: '800', letterSpacing: 2 },
  brandSub: { color: MUTED, fontSize: 11, marginTop: 3, letterSpacing: 0.5 },
  divider: { height: 2, backgroundColor: GOLD, opacity: 0.6, marginVertical: 16, width: 70 },
  himnario: { color: MUTED, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  number: { color: GOLD, fontSize: 44, fontWeight: '900', marginTop: 2 },
  title: { color: FG, fontSize: 24, fontWeight: '700', marginTop: 2 },
  equiv: { color: MUTED, fontSize: 12, marginTop: 8 },
  smallDivider: { height: 1, backgroundColor: '#2A2F3A', marginTop: 16 },
  contHead: { color: MUTED, fontSize: 13, fontWeight: '700', marginBottom: 8 },
  label: { color: GOLD, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8, marginTop: 8 },
  verse: { color: FG, fontSize: 17, lineHeight: 26 },
  chorusBox: { backgroundColor: CARD2, borderLeftWidth: 4, borderLeftColor: GOLD, borderRadius: 4, padding: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: '#2A2F3A', paddingTop: 12 },
  footerText: { color: MUTED, fontSize: 11, letterSpacing: 1 },
});
