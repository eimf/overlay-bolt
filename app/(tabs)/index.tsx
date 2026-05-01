import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Eye, EyeOff, Layers, Sparkles, CloudOff, Cloud } from 'lucide-react-native';
import { DrawingCanvas, DrawingCanvasHandle } from '@/components/DrawingCanvas';
import { Toolbar } from '@/components/Toolbar';
import { FloatingOverlay } from '@/components/FloatingOverlay';
import { GridBackground, GridType } from '@/components/GridBackground';
import { colors, radius, spacing } from '@/constants/theme';
import { supabase, ensureSession } from '@/lib/supabase';
import { usePreferences } from '@/lib/preferences';

type Mode = 'fullscreen' | 'floating';
type Tool = 'pen' | 'highlighter' | 'eraser';

const GRIDS: { id: GridType; title: string }[] = [
  { id: 'none', title: 'None' },
  { id: 'lines', title: 'Lines' },
  { id: 'squared', title: 'Squared' },
  { id: 'dots', title: 'Dots' },
];

const OPACITY_STEPS = [0.2, 0.4, 0.6, 0.8, 1];

export default function CanvasScreen() {
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const floatingRef = useRef<DrawingCanvasHandle>(null);
  const [prefs, setPref] = usePreferences();
  const [mode, setMode] = useState<Mode>('fullscreen');
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#F87171');
  const [width, setWidth] = useState(4);
  const [visible, setVisible] = useState(true);
  const [title, setTitle] = useState('Untitled Sketch');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [pencilOnly, setPencilOnly] = useState(false);

  useEffect(() => {
    if (prefs.persistenceEnabled) {
      ensureSession().catch(() => {});
    }
  }, [prefs.persistenceEnabled]);

  const activeCanvas = mode === 'fullscreen' ? canvasRef : floatingRef;

  const handleSave = async () => {
    if (!prefs.persistenceEnabled) {
      setSavedMsg('Persistence is off. Enable it in Settings.');
      setTimeout(() => setSavedMsg(null), 2400);
      return;
    }
    try {
      setSaving(true);
      setSavedMsg(null);
      const session = await ensureSession();
      if (!session) {
        setSavedMsg('Sign-in unavailable. Sketch kept locally.');
        return;
      }
      const strokes = activeCanvas.current?.getStrokes() ?? [];
      const { error } = await supabase.from('sketches').insert({
        user_id: session.user.id,
        title: title || 'Untitled Sketch',
        strokes,
        mode,
        opacity: prefs.canvasOpacity,
        background: prefs.gridType,
      });
      if (error) throw error;
      setSavedMsg('Saved to your sessions.');
      setTimeout(() => setSavedMsg(null), 2400);
    } catch (e: any) {
      setSavedMsg(e?.message ?? 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const toolbar = (
    <Toolbar
      tool={tool}
      color={color}
      width={width}
      mode={mode}
      onToolChange={setTool}
      onColorChange={setColor}
      onWidthChange={setWidth}
      onUndo={() => activeCanvas.current?.undo()}
      onClear={() => activeCanvas.current?.clear()}
      onSave={handleSave}
      onToggleMode={() => setMode((m) => (m === 'fullscreen' ? 'floating' : 'fullscreen'))}
      saving={saving}
    />
  );

  return (
    <View style={styles.root}>
      <View style={StyleSheet.absoluteFill}>
        <GridBackground type={prefs.gridType} />
      </View>

      {mode === 'fullscreen' && visible && (
        <View style={[StyleSheet.absoluteFill, { opacity: prefs.canvasOpacity }]} pointerEvents="box-none">
          <DrawingCanvas
            ref={canvasRef}
            color={color}
            width={width}
            tool={tool}
            pencilOnly={pencilOnly}
          />
        </View>
      )}

      {mode === 'floating' && visible && (
        <FloatingOverlay>
          <DrawingCanvas
            ref={floatingRef}
            color={color}
            width={width}
            tool={tool}
            pencilOnly={pencilOnly}
            style={{ opacity: prefs.canvasOpacity, backgroundColor: 'rgba(255,255,255,0.02)' }}
          />
        </FloatingOverlay>
      )}

      <SafeAreaView style={styles.chromeTop} pointerEvents="box-none">
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.brandDot}>
              <Sparkles size={14} color={colors.bg} />
            </View>
            <Text style={styles.brandText}>Overlay Notes</Text>
          </View>

          <View style={styles.titleWrap}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.titleInput}
              placeholder="Sketch title"
              placeholderTextColor={colors.textDim}
            />
          </View>

          <View style={styles.topActions}>
            <View
              style={[
                styles.iconBtn,
                {
                  backgroundColor: prefs.persistenceEnabled
                    ? 'rgba(74,222,128,0.15)'
                    : 'rgba(20,23,28,0.8)',
                },
              ]}
            >
              {prefs.persistenceEnabled ? (
                <Cloud size={16} color={colors.accent} />
              ) : (
                <CloudOff size={16} color={colors.textDim} />
              )}
            </View>
            <TouchableOpacity onPress={() => setVisible((v) => !v)} style={styles.iconBtn}>
              {visible ? (
                <Eye size={16} color={colors.text} />
              ) : (
                <EyeOff size={16} color={colors.textDim} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPencilOnly((p) => !p)}
              style={[styles.iconBtn, pencilOnly && { backgroundColor: colors.accent }]}
            >
              <Layers size={16} color={pencilOnly ? colors.bg : colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {savedMsg && (
          <View style={styles.toast}>
            <Text style={styles.toastText}>{savedMsg}</Text>
          </View>
        )}
      </SafeAreaView>

      <SafeAreaView style={styles.chromeBottom} pointerEvents="box-none">
        <View style={styles.bottomStack}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.backdropRow}
          >
            {GRIDS.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => setPref('gridType', g.id)}
                style={[styles.backdropChip, prefs.gridType === g.id && styles.backdropChipActive]}
              >
                <Text
                  style={[styles.backdropLabel, prefs.gridType === g.id && { color: colors.bg }]}
                >
                  {g.title}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.opacityWrap}>
              <Text style={styles.opacityLabel}>Opacity</Text>
              <View style={styles.opacityTrack}>
                {OPACITY_STEPS.map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setPref('canvasOpacity', v)}
                    style={[styles.opacityDot, prefs.canvasOpacity === v && styles.opacityDotActive]}
                  >
                    <Text style={styles.opacityDotText}>{Math.round(v * 100)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {Platform.OS === 'web' ? (
            <View style={styles.toolbarWrap}>{toolbar}</View>
          ) : (
            <BlurView intensity={40} tint="dark" style={styles.toolbarWrap}>
              {toolbar}
            </BlurView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  chromeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.4,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  titleInput: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 180,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(0.75),
    backgroundColor: 'rgba(20,23,28,0.7)',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20,23,28,0.8)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  toast: {
    alignSelf: 'center',
    marginTop: spacing(1),
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(74,222,128,0.15)',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  toastText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  chromeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomStack: {
    paddingHorizontal: spacing(2),
    paddingBottom: spacing(1),
    gap: spacing(1),
  },
  backdropRow: {
    gap: 8,
    alignItems: 'center',
    paddingVertical: 4,
  },
  backdropChip: {
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(20,23,28,0.8)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  backdropChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  backdropLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  opacityWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 12,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  opacityLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  opacityTrack: {
    flexDirection: 'row',
    gap: 4,
  },
  opacityDot: {
    minWidth: 34,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(20,23,28,0.8)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  opacityDotActive: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.accent,
  },
  opacityDotText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  toolbarWrap: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
});
