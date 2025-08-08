"use client";

import React, { useMemo } from 'react';
import { Box } from '@mantine/core';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export function WorkspaceStage() {
  const bounds = useWorkspaceStore((s) => s.bounds);
  const grid = useWorkspaceStore((s) => s.grid);
  const viewport = useWorkspaceStore((s) => s.viewport);
  const items = useWorkspaceStore((s) => s.items);
  const selectedIds = useWorkspaceStore((s) => s.selection.selectedIds);
  const selectOnly = useWorkspaceStore((s) => s.selectOnly);

  const gridLines = useMemo(() => {
    if (!grid.show || grid.size <= 0) return null;
    const lines: React.ReactElement[] = [];
    // vertical lines
    for (let x = 0; x <= bounds.width; x += grid.size) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={bounds.height}
          stroke="#e0e0e0"
          strokeWidth={0.2}
        />
      );
    }
    // horizontal lines
    for (let y = 0; y <= bounds.height; y += grid.size) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={bounds.width}
          y2={y}
          stroke="#e0e0e0"
          strokeWidth={0.2}
        />
      );
    }
    return lines;
  }, [grid.show, grid.size, bounds.width, bounds.height]);

  return (
    <Box style={{ width: '100%', height: 420 }}>
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${bounds.width} ${bounds.height}`}
        style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8 }}
        onClick={() => selectOnly(null)}
      >
        {/* Pan/Zoom group in mm */}
        <g transform={`translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.zoom})`}>
          {/* Grid */}
          {gridLines}

          {/* Workspace border in content space */}
          <rect
            x={0}
            y={0}
            width={bounds.width}
            height={bounds.height}
            fill="none"
            stroke="#bbb"
            strokeWidth={0.4}
          />

          {/* Items */}
          {items.map((it) => {
            const sel = selectedIds.includes(it.id);
            if (it.type === 'rectangle') {
              return (
                <rect
                  key={it.id}
                  x={it.position.x}
                  y={it.position.y}
                  width={it.rect.width}
                  height={it.rect.height}
                  fill="none"
                  stroke={sel ? '#1e90ff' : '#222'}
                  strokeWidth={sel ? 0.6 : 0.4}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectOnly(it.id);
                  }}
                />
              );
            }
            return null;
          })}
        </g>
      </svg>
    </Box>
  );
}
