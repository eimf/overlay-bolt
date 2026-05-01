import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Info, Pencil, Layers, Smartphone, Database } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { usePreferences } from '@/lib/preferences';
import type { GridType } from '@/components/GridBackground';

const GRID_OPTIONS: { id: GridType; title: string }[] = [
  { id: 'none', title: 'None' },
  { id: 'lines', title: 'Lines' },
  { id: 'squared', title: 'Squared' },
  { id: 'dots', title: 'Dots' },
];

export default function SettingsScreen() {
  const [prefs, setPref] = usePreferences();

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.h1}>Settings</Text>
        <Text style={styles.sub}>Control persistence, overlay grid, and canvas behavior</Text>

        <Section icon={<Database size={16} color={colors.accent} />} title="Persistence">
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Save sketches to the cloud</Text>
              <Text style={styles.rowHint}>
                When off, nothing leaves this device and Sessions stays empty.
              </Text>
            </View>
            <Switch
              value={prefs.persistenceEnabled}
              onValueChange={(v) => setPref('persistenceEnabled', v)}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>
          <Row label="Backend" value="Supabase (anonymous session)" />
          <Row label="Security" value="Row Level Security enabled" />
        </Section>

        <Section icon={<Layers size={16} color={colors.accent} />} title="Grid Overlay">
          <Text style={styles.rowHint}>Semi-transparent guide — no photo backgrounds.</Text>
          <View style={styles.chipRow}>
            {GRID_OPTIONS.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => setPref('gridType', g.id)}
                style={[styles.chip, prefs.gridType === g.id && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, prefs.gridType === g.id && { color: colors.bg }]}
                >
                  {g.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section icon={<Pencil size={16} color={colors.accent} />} title="Canvas Opacity">
          <Text style={styles.rowHint}>Dim the whole overlay so content beneath stays visible.</Text>
          <View style={styles.chipRow}>
            {[0.2, 0.4, 0.6, 0.8, 1].map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setPref('canvasOpacity', v)}
                style={[styles.chip, prefs.canvasOpacity === v && styles.chipActive]}
              >
                <Text
                  style={[styles.chipText, prefs.canvasOpacity === v && { color: colors.bg }]}
                >
                  {Math.round(v * 100)}%
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section icon={<Smartphone size={16} color={colors.accent} />} title="iPadOS Constraints">
          <Text style={styles.body}>
            Apple does not allow true system-wide overlays. This preview simulates an overlay within
            the app. For cross-app use, pair with Stage Manager or Split View on iPad.
          </Text>
        </Section>

        <Section icon={<Info size={16} color={colors.accent} />} title="About">
          <Row label="Engine" value="SVG (Expo web-compatible)" />
          <Row label="Apple Pencil" value="Native build uses PencilKit" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ icon, title, children }: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing(3),
    gap: spacing(2),
    paddingBottom: spacing(6),
  },
  h1: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: colors.textDim, fontSize: 13, marginTop: 4, marginBottom: spacing(1) },
  section: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(74,222,128,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionBody: {
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(1),
    gap: spacing(1.5),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  rowHint: {
    color: colors.textDim,
    fontSize: 12,
    lineHeight: 17,
    paddingVertical: spacing(0.5),
  },
  rowValue: {
    color: colors.textDim,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  body: {
    color: colors.textDim,
    fontSize: 13,
    lineHeight: 20,
    paddingVertical: spacing(1),
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: spacing(1),
  },
  chip: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
});
