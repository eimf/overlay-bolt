import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { Trash2, FileText, Clock } from 'lucide-react-native';
import { supabase, ensureSession, Sketch, Stroke } from '@/lib/supabase';
import { colors, radius, spacing } from '@/constants/theme';
import { usePreferences } from '@/lib/preferences';

function strokeToPath(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) d += ` L ${points[i].x} ${points[i].y}`;
  return d;
}

function Thumbnail({ strokes }: { strokes: Stroke[] }) {
  const all = strokes.flatMap((s) => s.points);
  if (all.length === 0) {
    return (
      <View style={[styles.thumb, styles.thumbEmpty]}>
        <FileText size={20} color={colors.textDim} />
      </View>
    );
  }
  const xs = all.map((p) => p.x);
  const ys = all.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  return (
    <View style={styles.thumb}>
      <Svg viewBox={`${minX - 4} ${minY - 4} ${w + 8} ${h + 8}`} style={StyleSheet.absoluteFill}>
        {strokes.map((s, i) => (
          <Path
            key={i}
            d={strokeToPath(s.points)}
            stroke={s.color}
            strokeWidth={s.width}
            strokeOpacity={s.tool === 'highlighter' ? 0.35 : 1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </Svg>
    </View>
  );
}

export default function SessionsScreen() {
  const [prefs] = usePreferences();
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!prefs.persistenceEnabled) {
      setSketches([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await ensureSession();
      const { data, error } = await supabase
        .from('sketches')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      setSketches((data as Sketch[]) ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [prefs.persistenceEnabled]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const remove = async (id: string) => {
    const prev = sketches;
    setSketches((list) => list.filter((s) => s.id !== id));
    const { error } = await supabase.from('sketches').delete().eq('id', id);
    if (error) {
      setSketches(prev);
      setError(error.message);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.h1}>Sessions</Text>
        <Text style={styles.sub}>Saved overlays, strokes, and setups</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={sketches}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing(2) }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>
                {prefs.persistenceEnabled ? 'No sessions yet' : 'Persistence is off'}
              </Text>
              <Text style={styles.emptyText}>
                {prefs.persistenceEnabled
                  ? 'Draw something in the Canvas tab and tap Save to store it here.'
                  : 'Turn on "Save sketches to the cloud" in Settings to keep your work.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Thumbnail strokes={item.strokes} />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.meta}>
                <Clock size={11} color={colors.textDim} />
                <Text style={styles.metaText}>
                  {new Date(item.updated_at).toLocaleDateString()}
                </Text>
                <View style={styles.dot} />
                <Text style={styles.metaText}>{item.mode}</Text>
              </View>
              <TouchableOpacity onPress={() => remove(item.id)} style={styles.delBtn}>
                <Trash2 size={13} color={colors.danger} />
                <Text style={styles.delText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2),
    paddingBottom: spacing(1.5),
  },
  h1: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  sub: {
    color: colors.textDim,
    fontSize: 13,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: spacing(3),
    paddingBottom: spacing(3),
    gap: spacing(2),
  },
  errorBox: {
    marginHorizontal: spacing(3),
    padding: spacing(1.5),
    borderRadius: radius.md,
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: colors.danger,
    marginBottom: spacing(1),
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  thumb: {
    aspectRatio: 1.3,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbEmpty: {},
  cardBody: {
    padding: spacing(1.5),
    gap: 6,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '500',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textDim,
  },
  delBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing(1),
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(248,113,113,0.08)',
  },
  delText: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing(8),
    gap: 6,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 19,
  },
});
