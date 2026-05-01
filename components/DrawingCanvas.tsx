import React, { useCallback, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Stroke } from '@/lib/supabase';

export type DrawingCanvasHandle = {
  getStrokes: () => Stroke[];
  setStrokes: (s: Stroke[]) => void;
  undo: () => void;
  clear: () => void;
};

type Props = {
  color: string;
  width: number;
  tool: 'pen' | 'highlighter' | 'eraser';
  pencilOnly: boolean;
  onChange?: (strokes: Stroke[]) => void;
  style?: any;
};

function strokeToPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const p = points[0];
    return `M ${p.x} ${p.y} L ${p.x + 0.1} ${p.y + 0.1}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const mx = (prev.x + cur.x) / 2;
    const my = (prev.y + cur.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${mx} ${my}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export const DrawingCanvas = forwardRef<DrawingCanvasHandle, Props>(function DrawingCanvas(
  { color, width, tool, pencilOnly, onChange, style },
  ref,
) {
  const [strokes, setStrokesState] = useState<Stroke[]>([]);
  const [active, setActive] = useState<Stroke | null>(null);
  const activeRef = useRef<Stroke | null>(null);

  useImperativeHandle(ref, () => ({
    getStrokes: () => strokes,
    setStrokes: (s) => setStrokesState(s),
    undo: () => setStrokesState((prev) => prev.slice(0, -1)),
    clear: () => setStrokesState([]),
  }));

  const update = useCallback(
    (next: Stroke[]) => {
      setStrokesState(next);
      onChange?.(next);
    },
    [onChange],
  );

  const eraseAt = useCallback((x: number, y: number) => {
    setStrokesState((prev) => {
      const radius = 14;
      const next = prev.filter((s) => {
        for (const p of s.points) {
          const dx = p.x - x;
          const dy = p.y - y;
          if (dx * dx + dy * dy < radius * radius) return false;
        }
        return true;
      });
      return next;
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        if (pencilOnly && Platform.OS !== 'web') {
          // @ts-ignore
          const t = evt.nativeEvent.touches?.[0];
          // @ts-ignore
          if (t && t.tool !== undefined && t.tool !== 2) return false;
        }
        return true;
      },
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (tool === 'eraser') {
          eraseAt(locationX, locationY);
          return;
        }
        const s: Stroke = {
          color,
          width: tool === 'highlighter' ? width * 3 : width,
          tool: tool === 'highlighter' ? 'highlighter' : 'pen',
          points: [{ x: locationX, y: locationY }],
        };
        activeRef.current = s;
        setActive(s);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        if (tool === 'eraser') {
          eraseAt(locationX, locationY);
          return;
        }
        const cur = activeRef.current;
        if (!cur) return;
        const last = cur.points[cur.points.length - 1];
        if (last && Math.abs(last.x - locationX) < 1 && Math.abs(last.y - locationY) < 1) return;
        cur.points.push({ x: locationX, y: locationY });
        setActive({ ...cur, points: [...cur.points] });
      },
      onPanResponderRelease: () => {
        const cur = activeRef.current;
        if (cur && cur.points.length > 0) {
          update([...strokes, cur]);
        }
        activeRef.current = null;
        setActive(null);
      },
      onPanResponderTerminate: () => {
        const cur = activeRef.current;
        if (cur && cur.points.length > 0) {
          update([...strokes, cur]);
        }
        activeRef.current = null;
        setActive(null);
      },
    }),
  ).current;

  return (
    <View style={[styles.container, style]} {...panResponder.panHandlers}>
      <Svg style={StyleSheet.absoluteFill}>
        {strokes.map((s, i) => (
          <Path
            key={i}
            d={strokeToPath(s.points)}
            stroke={s.color}
            strokeWidth={s.width}
            strokeOpacity={s.tool === 'highlighter' ? 0.35 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ))}
        {active && (
          <Path
            d={strokeToPath(active.points)}
            stroke={active.color}
            strokeWidth={active.width}
            strokeOpacity={active.tool === 'highlighter' ? 0.35 : 1}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
