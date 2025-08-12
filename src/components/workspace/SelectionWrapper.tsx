"use client";

import React from 'react';

export type SelectionWrapperProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  stroke?: string;
  strokeWidth?: number;
};

/**
 * Renders an SVG selection rectangle with corner handles.
 * All coordinates are in workspace mm space.
 */
export const SelectionWrapper = React.memo(function SelectionWrapper({
  x,
  y,
  width,
  height,
  stroke = '#1e90ff',
  strokeWidth = 0.75,
}: SelectionWrapperProps) {
  const handles = [
    { x, y, cursor: 'nwse-resize' as const },
    { x: x + width, y, cursor: 'nesw-resize' as const },
    { x, y: y + height, cursor: 'nesw-resize' as const },
    { x: x + width, y: y + height, cursor: 'nwse-resize' as const },
  ];

  return (
    <g>
      <rect
        x={x}
        y={(y-(width/2))}
        width={width}
        height={height}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      <text x={x} y={y} fill="black" fontSize={10}>{width.toFixed(2)} {height.toFixed(2)} {x.toFixed(2)} {y.toFixed(2)}</text>
      {handles.map((handle, handleIndex) => (
        <g key={handleIndex} style={{ cursor: handle.cursor }}>
          <circle cx={handle.x} cy={handle.y} r={0.75} fill={stroke} />
          <circle cx={handle.x} cy={handle.y} r={2} fill={stroke} fillOpacity={0} strokeOpacity={0} />
        </g>
      ))}
    </g>
  );
});
