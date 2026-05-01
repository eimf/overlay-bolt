import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Pencil, Eraser, Undo2, Trash2, Highlighter, Save, Maximize2, Minimize2 } from 'lucide-react-native';
import { colors, palette, radius, spacing } from '@/constants/theme';

type Tool = 'pen' | 'highlighter' | 'eraser';

type Props = {
  tool: Tool;
  color: string;
  width: number;
  mode: 'fullscreen' | 'floating';
  onToolChange: (t: Tool) => void;
  onColorChange: (c: string) => void;
  onWidthChange: (w: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onSave: () => void;
  onToggleMode: () => void;
  saving?: boolean;
};

export function Toolbar({
  tool,
  color,
  width,
  mode,
  onToolChange,
  onColorChange,
  onWidthChange,
  onUndo,
  onClear,
  onSave,
  onToggleMode,
  saving,
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.group}>
        <ToolBtn active={tool === 'pen'} onPress={() => onToolChange('pen')}>
          <Pencil size={18} color={tool === 'pen' ? colors.bg : colors.text} />
        </ToolBtn>
        <ToolBtn active={tool === 'highlighter'} onPress={() => onToolChange('highlighter')}>
          <Highlighter size={18} color={tool === 'highlighter' ? colors.bg : colors.text} />
        </ToolBtn>
        <ToolBtn active={tool === 'eraser'} onPress={() => onToolChange('eraser')}>
          <Eraser size={18} color={tool === 'eraser' ? colors.bg : colors.text} />
        </ToolBtn>
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        {palette.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => onColorChange(c)}
            style={[
              styles.swatch,
              { backgroundColor: c },
              color === c && styles.swatchActive,
            ]}
          />
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        {[2, 4, 8].map((w) => (
          <TouchableOpacity
            key={w}
            onPress={() => onWidthChange(w)}
            style={[styles.widthBtn, width === w && styles.widthBtnActive]}
          >
            <View style={{ width: w * 2, height: w * 2, borderRadius: w, backgroundColor: colors.text }} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        <ToolBtn onPress={onUndo}>
          <Undo2 size={18} color={colors.text} />
        </ToolBtn>
        <ToolBtn onPress={onClear}>
          <Trash2 size={18} color={colors.danger} />
        </ToolBtn>
        <ToolBtn onPress={onToggleMode}>
          {mode === 'fullscreen' ? (
            <Minimize2 size={18} color={colors.text} />
          ) : (
            <Maximize2 size={18} color={colors.text} />
          )}
        </ToolBtn>
        <TouchableOpacity onPress={onSave} style={styles.saveBtn} disabled={saving}>
          <Save size={16} color={colors.bg} />
          <Text style={styles.saveText}>{saving ? 'Saving' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ToolBtn({ active, onPress, children }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.toolBtn, active && styles.toolBtnActive]}
    >
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing(1),
    paddingVertical: spacing(0.75),
    gap: spacing(0.75),
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: spacing(0.5),
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  toolBtnActive: {
    backgroundColor: colors.accent,
  },
  swatch: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
  },
  swatchActive: {
    borderColor: colors.accent,
    transform: [{ scale: 1.12 }],
  },
  widthBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  widthBtnActive: {
    backgroundColor: colors.accentDark,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(0.75),
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
  },
  saveText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 13,
  },
});
