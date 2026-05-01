import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Pattern, Path, Rect, Circle } from 'react-native-svg';

export type GridType = 'none' | 'lines' | 'squared' | 'dots';

type Props = {
  type: GridType;
  color?: string;
  opacity?: number;
  spacing?: number;
};

export function GridBackground({
  type,
  color = '#FFFFFF',
  opacity = 0.18,
  spacing = 28,
}: Props) {
  if (type === 'none') return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" opacity={opacity}>
        <Defs>
          {type === 'lines' && (
            <Pattern
              id="grid-lines"
              width={spacing}
              height={spacing}
              patternUnits="userSpaceOnUse"
            >
              <Path
                d={`M 0 ${spacing} L ${spacing * 10} ${spacing}`}
                stroke={color}
                strokeWidth={1}
              />
            </Pattern>
          )}
          {type === 'squared' && (
            <Pattern
              id="grid-squared"
              width={spacing}
              height={spacing}
              patternUnits="userSpaceOnUse"
            >
              <Path
                d={`M ${spacing} 0 L 0 0 0 ${spacing}`}
                fill="none"
                stroke={color}
                strokeWidth={1}
              />
            </Pattern>
          )}
          {type === 'dots' && (
            <Pattern
              id="grid-dots"
              width={spacing}
              height={spacing}
              patternUnits="userSpaceOnUse"
            >
              <Circle cx={spacing / 2} cy={spacing / 2} r={1.4} fill={color} />
            </Pattern>
          )}
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#grid-${type})`} />
      </Svg>
    </View>
  );
}
