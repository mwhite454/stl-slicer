"use client";

import React from 'react';
import { BORDER_STROKE } from '../workspaceConstants';

export type WorkspaceBorderProps = {
  width: number;
  height: number;
  stroke?: string;
  strokeWidth?: number;
};

/**
 * SVG border rectangle for the workspace content area (mm space).
 */
export const WorkspaceBorder = React.memo(function WorkspaceBorder({
  width,
  height,
  stroke = BORDER_STROKE.color,
  strokeWidth = BORDER_STROKE.width,
}: WorkspaceBorderProps) {
  return (
    <rect
      x={0}
      y={0}
      width={width}
      height={height}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
});
