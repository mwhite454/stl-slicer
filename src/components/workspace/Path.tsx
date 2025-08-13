
import React, { memo } from 'react';

interface PathProps {
  d: string;
  isDragging?: boolean;
  stroke?: string;
}

export const Path = memo(function Path({ d, isDragging = false, stroke = '#222' }: PathProps) {
  return (
    <path
      focusable={false as any}
      d={d}
      fill="transparent"
      stroke={stroke}
      strokeWidth={0.8}
      vectorEffect="non-scaling-stroke"
      opacity={isDragging ? 0.9 : 1}
      pointerEvents="all"
      style={{ outline: 'none' }}
      onFocus={(e) => {
        (e.currentTarget as any)?.blur?.();
      }}
    />
  );
});