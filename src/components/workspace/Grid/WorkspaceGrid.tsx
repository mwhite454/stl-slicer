import React, { useMemo } from 'react';
import type { Bounds, GridSettings } from '@/types/workspace';
import { GRID_LINE_STROKE } from '@/components/workspace/workspaceConstants';

export type WorkspaceGridProps = {
  bounds: Bounds;
  grid: GridSettings;
};

export const WorkspaceGrid: React.FC<WorkspaceGridProps> = ({ bounds, grid }) => {
  const lines = useMemo(() => {
    if (!grid.show || grid.size <= 0) return null;
    const elems: React.ReactElement[] = [];

    // vertical lines
    for (let x = 0; x <= bounds.width; x += grid.size) {
      elems.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={bounds.height}
          stroke={GRID_LINE_STROKE.color}
          strokeWidth={GRID_LINE_STROKE.width}
        />
      );
    }

    // horizontal lines
    for (let y = 0; y <= bounds.height; y += grid.size) {
      elems.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={bounds.width}
          y2={y}
          stroke={GRID_LINE_STROKE.color}
          strokeWidth={GRID_LINE_STROKE.width}
        />
      );
    }

    return elems;
  }, [grid.show, grid.size, bounds.width, bounds.height]);

  return <g data-role="workspace-grid">{lines}</g>;
};
