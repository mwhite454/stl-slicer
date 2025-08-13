"use client";
import React, { memo } from 'react';

interface SelectedPathProps {
  d: string;
  selectionD?: string;
}

export const SelectedPath = memo(function SelectedPath({ d, selectionD }: SelectedPathProps) {
  return (
    <path
      d={selectionD || d}
      fill="none"
      stroke="#1e90ff"
      strokeWidth={1.4}
      strokeLinejoin="round"
      strokeLinecap="round"
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
      strokeDasharray="3 2"
    />
  );
});