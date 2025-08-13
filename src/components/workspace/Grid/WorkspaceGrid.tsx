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

    const { width, height } = bounds;
    const cx = width / 2;
    const cy = height / 2;

    // Draw vertical lines symmetrically around center (cx)
    for (let x = cx; x <= width; x += grid.size) {
      const offset = x - cx;
      const xPos = cx + offset;
      const xNeg = cx - offset;
      // positive side
      elems.push(
        <line
          key={`v+${xPos.toFixed(3)}`}
          x1={xPos}
          y1={0}
          x2={xPos}
          y2={height}
          stroke={GRID_LINE_STROKE.color}
          strokeWidth={GRID_LINE_STROKE.width}
        />
      );
      // negative side (skip duplicate at center when offset === 0)
      if (offset > 0) {
        elems.push(
          <line
            key={`v-${xNeg.toFixed(3)}`}
            x1={xNeg}
            y1={0}
            x2={xNeg}
            y2={height}
            stroke={GRID_LINE_STROKE.color}
            strokeWidth={GRID_LINE_STROKE.width}
          />
        );
      }
    }

    // Draw horizontal lines symmetrically around center (cy)
    for (let y = cy; y <= height; y += grid.size) {
      const offset = y - cy;
      const yPos = cy + offset;
      const yNeg = cy - offset;
      // positive side (downwards in SVG)
      elems.push(
        <line
          key={`h+${yPos.toFixed(3)}`}
          x1={0}
          y1={yPos}
          x2={width}
          y2={yPos}
          stroke={GRID_LINE_STROKE.color}
          strokeWidth={GRID_LINE_STROKE.width}
        />
      );
      // negative side (upwards in SVG) - skip duplicate at center
      if (offset > 0) {
        elems.push(
          <line
            key={`h-${yNeg.toFixed(3)}`}
            x1={0}
            y1={yNeg}
            x2={width}
            y2={yNeg}
            stroke={GRID_LINE_STROKE.color}
            strokeWidth={GRID_LINE_STROKE.width}
          />
        );
      }
    }

    // Emphasize axes: X-axis at y = cy (maker Y=0), Y-axis at x = cx (maker X=0)
    const xAxisColor = '#fa5252';
    const yAxisColor = '#8ce99a';
    const axisWidth = Math.max(1.25, GRID_LINE_STROKE.width * 1.1);
    elems.push(
      <line
        key="axis-x"
        x1={0}
        y1={cy}
        x2={width}
        y2={cy}
        stroke={xAxisColor}
        strokeWidth={axisWidth}
      />
    );
    elems.push(
      <line
        key="axis-y"
        x1={cx}
        y1={0}
        x2={cx}
        y2={height}
        stroke={yAxisColor}
        strokeWidth={axisWidth}
      />
    );

    return elems;
  }, [grid.show, grid.size, bounds.width, bounds.height]);

  return <g data-role="workspace-grid">{lines}</g>;
};
