"use client";

import React, { useMemo, useRef, useState, memo } from 'react';
import { Box } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { rectPathData } from '@/lib/maker/generateSvgPath';
import { transformForMakerPath } from '@/lib/coords';
import { DndContext, DragEndEvent, DragMoveEvent, DragStartEvent, PointerSensor, useDraggable, useSensor, useSensors } from '@dnd-kit/core';

type DragOrigin = { id: string; x0: number; y0: number } | null;

export function WorkspaceStage() {
  const bounds = useWorkspaceStore((s) => s.bounds);
  const grid = useWorkspaceStore((s) => s.grid);
  const viewport = useWorkspaceStore((s) => s.viewport);
  const items = useWorkspaceStore((s) => s.items);
  const selectedIds = useWorkspaceStore((s) => s.selection.selectedIds);
  const selectOnly = useWorkspaceStore((s) => s.selectOnly);
  const updateItemPosition = useWorkspaceStore((s) => s.updateItemPosition);

  const { ref: svgRef } = useElementSize();
  const contentGroupRef = useRef<SVGGElement | null>(null);
  // TODO: Make activation distance user-configurable via workspace settings
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 1 } })
  );
  const dragOriginRef = useRef<DragOrigin>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragPosMm, setDragPosMm] = useState<{ x: number; y: number } | null>(null);
  // Imperative path refs for high-FPS drag updates without React re-renders
  const pathRefs = useRef<Map<string, SVGPathElement>>(new Map());
  const setPathRef = (id: string, el: SVGPathElement | null) => {
    if (el) pathRefs.current.set(id, el);
    else pathRefs.current.delete(id);
  };
  const dragPendingRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Compute mm-per-px using the actual rendered transform matrix (accounts for pan/zoom, borders, DPI)
  const getMmPerPx = () => {
    const g = contentGroupRef.current;
    if (!g) return { x: 0, y: 0 };
    const m = g.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    // a and d represent scaleX and scaleY
    return { x: 1 / m.a, y: 1 / m.d };
  };

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

  // DnD handlers
  const onDragStart = (e: DragStartEvent) => {
    const id = String(e.active.id);
    const item = items.find((it) => it.id === id);
    if (!item) return;
    dragOriginRef.current = { id, x0: item.position.x, y0: item.position.y };
    setActiveId(id);
    setDragPosMm({ x: item.position.x, y: item.position.y });
    selectOnly(id);
  };

  const onDragMove = (e: DragMoveEvent) => {
    if (!dragOriginRef.current) return;
    const { id, x0, y0 } = dragOriginRef.current;
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const dxPx = e.delta.x;
    const dyPx = e.delta.y;
    const mmpp = getMmPerPx();
    const dxMm = dxPx * mmpp.x;
    const dyMm = dyPx * mmpp.y;
    let nx = x0 + dxMm;
    let ny = y0 + dyMm;
    // Clamp within bounds (ensuring item stays fully inside)
    nx = Math.max(0, Math.min(bounds.width - item.rect.width, nx));
    ny = Math.max(0, Math.min(bounds.height - item.rect.height, ny));
    if (grid.snap && grid.size > 0) {
      nx = Math.round(nx / grid.size) * grid.size;
      ny = Math.round(ny / grid.size) * grid.size;
    }
    // Schedule an imperative transform update via RAF for smoothness
    dragPendingRef.current = { x: nx, y: ny };
    if (rafIdRef.current == null) {
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        const pending = dragPendingRef.current;
        if (!pending || !activeId) return;
        const el = pathRefs.current.get(activeId);
        if (el) {
          el.setAttribute('transform', transformForMakerPath(pending.x, pending.y, item.rect.height));
        }
      });
    }
  };

  const onDragEnd = (_e: DragEndEvent) => {
    // Commit latest pending or local drag state to store
    const commit = dragPendingRef.current || dragPosMm;
    if (activeId && commit) {
      updateItemPosition(activeId, commit.x, commit.y);
    }
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    dragPendingRef.current = null;
    dragOriginRef.current = null;
    setActiveId(null);
    setDragPosMm(null);
  };

  return (
    <Box style={{ width: '100%', height: 420 }}>
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}>
        <svg
          ref={svgRef as any}
          width="100%"
          height="100%"
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, userSelect: 'none', touchAction: 'none' }}
          onClick={() => selectOnly(null)}
        >
          {/* Pan/Zoom group in mm */}
          <g ref={contentGroupRef} transform={`translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.zoom})`}>
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
                const d = rectPathData(it.rect.width, it.rect.height);
                const posX = activeId === it.id && dragPosMm ? dragPosMm.x : it.position.x;
                const posY = activeId === it.id && dragPosMm ? dragPosMm.y : it.position.y;
                return (
                  <DraggablePath
                    key={it.id}
                    id={it.id}
                    d={d}
                    transform={transformForMakerPath(posX, posY, it.rect.height)}
                    selected={sel}
                    setPathRef={setPathRef}
                    onClick={() => selectOnly(it.id)}
                  />
                );
              }
              return null;
            })}
          </g>
        </svg>
      </DndContext>
    </Box>
  );
}

type DraggablePathProps = {
  id: string;
  d: string;
  transform: string;
  selected: boolean;
  onClick: () => void;
  setPathRef: (id: string, el: SVGPathElement | null) => void;
};

const DraggablePath = memo(function DraggablePath({ id, d, transform, selected, onClick, setPathRef }: DraggablePathProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });
  const groupRef = setNodeRef as unknown as (node: SVGGElement | null) => void;
  return (
    <g
      ref={groupRef}
      {...listeners}
      {...attributes}
      pointerEvents="all"
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <path
        ref={(el) => setPathRef(id, el)}
        d={d}
        transform={transform}
        fill="transparent"
        stroke={selected ? '#1e90ff' : '#222'}
        strokeWidth={selected ? 0.8 : 0.5}
        opacity={isDragging ? 0.9 : 1}
        pointerEvents="all"
      />
    </g>
  );
});
