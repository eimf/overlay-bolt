import React, { useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, TouchableOpacity, Text, Dimensions } from 'react-native';
import { Move, X, Minus } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';

type Props = {
  children: React.ReactNode;
  onClose?: () => void;
  initialWidth?: number;
  initialHeight?: number;
};

export function FloatingOverlay({ children, onClose, initialWidth = 520, initialHeight = 380 }: Props) {
  const screen = Dimensions.get('window');
  const [pos, setPos] = useState({
    x: Math.max(20, (screen.width - initialWidth) / 2),
    y: Math.max(80, (screen.height - initialHeight) / 2),
  });
  const [size, setSize] = useState({ w: initialWidth, h: initialHeight });
  const [collapsed, setCollapsed] = useState(false);

  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ w: 0, h: 0 });

  const dragPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragStart.current = { x: pos.x, y: pos.y };
      },
      onPanResponderMove: (_, g) => {
        setPos({
          x: Math.max(0, dragStart.current.x + g.dx),
          y: Math.max(0, dragStart.current.y + g.dy),
        });
      },
    }),
  ).current;

  const resizePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        resizeStart.current = { w: size.w, h: size.h };
      },
      onPanResponderMove: (_, g) => {
        setSize({
          w: Math.max(240, resizeStart.current.w + g.dx),
          h: Math.max(200, resizeStart.current.h + g.dy),
        });
      },
    }),
  ).current;

  if (collapsed) {
    return (
      <TouchableOpacity
        onPress={() => setCollapsed(false)}
        style={[styles.bubble, { left: pos.x, top: pos.y }]}
      >
        <Text style={styles.bubbleText}>Notes</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.window,
        { left: pos.x, top: pos.y, width: size.w, height: size.h },
      ]}
    >
      <View style={styles.header} {...dragPan.panHandlers}>
        <Move size={14} color={colors.textDim} />
        <Text style={styles.title}>Overlay Notes</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => setCollapsed(true)} style={styles.hBtn}>
          <Minus size={14} color={colors.text} />
        </TouchableOpacity>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.hBtn}>
            <X size={14} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.body}>{children}</View>
      <View style={styles.resize} {...resizePan.panHandlers} />
    </View>
  );
}

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing(1.5),
    paddingVertical: spacing(1),
    backgroundColor: colors.surfaceAlt,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  hBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  resize: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    backgroundColor: colors.border,
    borderTopLeftRadius: 12,
  },
  bubble: {
    position: 'absolute',
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1.25),
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  bubbleText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 13,
  },
});
