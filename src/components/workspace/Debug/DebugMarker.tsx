import React from 'react';

export type DebugMarkerProps = {
  world: { x: number; y: number };
  label: string;
  color?: string;
};

/**
 * Renders a world-space debug marker (circle + label) in the workspace SVG.
 * Pointer-events are disabled so it doesn't interfere with interactions.
 */
export const DebugMarker: React.FC<DebugMarkerProps> = ({ world, label, color = 'purple' }) => {
  return (
    <g pointerEvents="none">
      <circle cx={world.x} cy={world.y} r={3} fill={color} opacity={0.8} />
      <text
        x={world.x + 5}
        y={world.y - 5}
        fontSize={12}
        fill={color}
        fontWeight="bold"
        style={{ userSelect: 'text' }}
      >
        {label} (World: {world.x.toFixed(1)}, {world.y.toFixed(1)})
      </text>
    </g>
  );
};
