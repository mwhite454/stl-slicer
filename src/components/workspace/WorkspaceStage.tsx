"use client";

import React, { useMemo, useRef, useState, useEffect, memo } from 'react';
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
  const activationDistance = useWorkspaceStore((s) => s.ui.dragActivationDistance);
  const setZoom = useWorkspaceStore((s) => s.setZoom);
  const setPan = useWorkspaceStore((s) => s.setPan);
  const selectionOverlayOffsetPx = useWorkspaceStore((s) => s.ui.selectionOverlayOffsetPx);
  const panSpeedMultiplier = useWorkspaceStore((s) => s.ui.panSpeedMultiplier);
  const zoomSpeedMultiplier = useWorkspaceStore((s) => s.ui.zoomSpeedMultiplier);
  const showPerfHud = useWorkspaceStore((s) => s.ui.showPerfHud);
  const fitToBoundsRequestId = useWorkspaceStore((s) => s.ui.fitToBoundsRequestId);

  const { ref: svgRef } = useElementSize();
  const contentGroupRef = useRef<SVGGElement | null>(null);
  const [fps, setFps] = useState(0);
  const fpsRef = useRef({ last: performance.now(), frames: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panPointerRef = useRef<{ x: number; y: number } | null>(null);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panRafRef = useRef<number | null>(null);
  const panPendingRef = useRef<{ x: number; y: number } | null>(null);
  const panDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  // Sensors depend on activation distance from store
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: activationDistance } })
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

  // Map client (px) to workspace mm using current group CTM
  const clientToMm = (clientX: number, clientY: number) => {
    const svgEl = (svgRef as any)?.current as SVGSVGElement | null;
    const g = contentGroupRef.current;
    if (!svgEl || !g) return null;
    const pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = g.getScreenCTM();
    if (!m) return null;
    const inv = m.inverse();
    const p = pt.matrixTransform(inv as any);
    return { x: p.x, y: p.y };
  };

  const clampZoom = (z: number) => Math.min(4, Math.max(0.25, z));

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    // Zoom anchored at cursor
    e.preventDefault();
    const svg = svgRef.current as unknown as SVGSVGElement | null;
    const g = contentGroupRef.current;
    if (!svg || !g) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = g.getScreenCTM();
    if (!ctm) return;
    const p = pt.matrixTransform(ctm.inverse());
    const delta = -e.deltaY * Math.max(0.1, zoomSpeedMultiplier); // natural: scroll up to zoom in
    const k = 0.0015; // sensitivity base
    const scale = Math.exp(delta * k);
    const nextZoom = Math.min(4, Math.max(0.25, viewport.zoom * scale));
    const applied = nextZoom / viewport.zoom;
    // Keep cursor point stable: adjust pan so p maps to same screen position
    const newPan = {
      x: p.x - (p.x - viewport.pan.x) * applied,
      y: p.y - (p.y - viewport.pan.y) * applied,
    };
    setZoom(nextZoom);
    setPan(newPan);
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button === 1) {
      // Middle button panning
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      panPointerRef.current = { x: e.clientX, y: e.clientY };
      // capture starting pan from latest store to avoid stale closures
      const latestPan = useWorkspaceStore.getState().viewport.pan;
      panStartRef.current = { x: latestPan.x, y: latestPan.y };
      panDeltaRef.current = { x: 0, y: 0 };
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning || !panPointerRef.current) return;
    e.preventDefault();
    e.stopPropagation();
    const last = panPointerRef.current;
    const dxPx = e.clientX - last.x;
    const dyPx = e.clientY - last.y;
    panPointerRef.current = { x: e.clientX, y: e.clientY };
    const mmpp = getMmPerPx();
    const dxMm = dxPx * mmpp.x * Math.max(0.1, panSpeedMultiplier);
    const dyMm = dyPx * mmpp.y * Math.max(0.1, panSpeedMultiplier);
    panDeltaRef.current = { x: panDeltaRef.current.x + dxMm, y: panDeltaRef.current.y + dyMm };
    const start = panStartRef.current ?? { x: 0, y: 0 };
    const next = { x: start.x + panDeltaRef.current.x, y: start.y + panDeltaRef.current.y };
    panPendingRef.current = next;
    if (panRafRef.current == null) {
      panRafRef.current = requestAnimationFrame(() => {
        panRafRef.current = null;
        const pending = panPendingRef.current;
        if (!pending) return;
        // Imperatively update transform for smoothness
        const g = contentGroupRef.current;
        if (g) {
          g.setAttribute('transform', `translate(${pending.x} ${pending.y}) scale(${viewport.zoom})`);
        }
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning && e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(false);
      panPointerRef.current = null;
      const start = panStartRef.current ?? viewport.pan;
      const finalPan = panPendingRef.current ?? { x: start.x + panDeltaRef.current.x, y: start.y + panDeltaRef.current.y };
      // Commit to store
      setPan({ x: finalPan.x, y: finalPan.y });
      panStartRef.current = null;
      panPendingRef.current = null;
      panDeltaRef.current = { x: 0, y: 0 };
      if (panRafRef.current != null) {
        cancelAnimationFrame(panRafRef.current);
        panRafRef.current = null;
      }
      (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
    }
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Nudge selected item(s) with arrow keys
    const id = selectedIds[0];
    if (!id) return;
    let dx = 0;
    let dy = 0;
    if (e.key === 'ArrowLeft') dx = -1;
    else if (e.key === 'ArrowRight') dx = 1;
    else if (e.key === 'ArrowUp') dy = -1;
    else if (e.key === 'ArrowDown') dy = 1;
    else return;
    e.preventDefault();
    const item = items.find((it) => it.id === id);
    if (!item) return;
    const step = e.shiftKey && grid.size > 0 ? grid.size : 1;
    let nx = item.position.x + dx * step;
    let ny = item.position.y + dy * step;
    // optional snapping when shift used is already applied by step; if grid.snap, snap final
    if (grid.snap && grid.size > 0) {
      nx = Math.round(nx / grid.size) * grid.size;
      ny = Math.round(ny / grid.size) * grid.size;
    }
    nx = Math.max(0, Math.min(bounds.width - item.rect.width, nx));
    ny = Math.max(0, Math.min(bounds.height - item.rect.height, ny));
    updateItemPosition(id, nx, ny);
  };

  useEffect(() => {
    if (!showPerfHud) return;
    let raf = 0;
    const tick = () => {
      const now = performance.now();
      fpsRef.current.frames += 1;
      const dt = now - fpsRef.current.last;
      if (dt >= 500) {
        const fpsNow = (fpsRef.current.frames * 1000) / dt;
        setFps(Math.round(fpsNow));
        fpsRef.current.frames = 0;
        fpsRef.current.last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    fpsRef.current = { last: performance.now(), frames: 0 };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showPerfHud]);

  useEffect(() => {
    if (!fitToBoundsRequestId) return;
    if (!items.length) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const it of items) {
      if (it.type === 'rectangle') {
        const x1 = it.position.x;
        const y1 = it.position.y;
        const x2 = it.position.x + it.rect.width;
        const y2 = it.position.y + it.rect.height;
        minX = Math.min(minX, x1); minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2);
      }
    }
    if (!Number.isFinite(minX)) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    // Add small margin (mm)
    const margin = 2;
    minX -= margin; minY -= margin; maxX += margin; maxY += margin;
    const rectW = Math.max(1, maxX - minX);
    const rectH = Math.max(1, maxY - minY);
    const scaleX = bounds.width / rectW;
    const scaleY = bounds.height / rectH;
    const targetZoom = Math.min(4, Math.max(0.25, Math.min(scaleX, scaleY)));
    // Center the rect
    const panX = (bounds.width - rectW * targetZoom) / 2 - minX * targetZoom;
    const panY = (bounds.height - rectH * targetZoom) / 2 - minY * targetZoom;
    setZoom(targetZoom);
    setPan({ x: panX, y: panY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToBoundsRequestId]);

  return (
    <Box
      style={{ width: '100%', height: 420, outline: 'none', position: 'relative' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}>
        <svg
          ref={svgRef as any}
          width="100%"
          height="100%"
          viewBox={`0 0 ${bounds.width} ${bounds.height}`}
          style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, userSelect: 'none', touchAction: 'none', outline: 'none', cursor: isPanning ? 'grabbing' : undefined }}
          className="workspace-svg"
          onClick={() => selectOnly(null)}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <defs>
            <style>{`
              .workspace-svg:focus { outline: none !important; }
              .workspace-svg *:focus { outline: none !important; }
              .workspace-svg *:focus-visible { outline: none !important; }
              .workspace-svg [aria-selected],
              .workspace-svg [aria-pressed],
              .workspace-svg [aria-roledescription],
              .workspace-svg [role] {
                outline: none !important;
              }
            `}</style>
          </defs>
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
                // Expand selection overlay by a few screen pixels converted to mm for visibility
                const mmpp = getMmPerPx();
                const ox = selectionOverlayOffsetPx * mmpp.x;
                const oy = selectionOverlayOffsetPx * mmpp.y;
                const selX = posX - ox;
                const selY = posY - oy;
                const selW = it.rect.width + ox * 2;
                const selH = it.rect.height + oy * 2;
                return (
                  <g key={it.id}>
                    <DraggablePath
                      id={it.id}
                      d={d}
                      transform={transformForMakerPath(posX, posY, it.rect.height)}
                      selected={sel}
                      setPathRef={setPathRef}
                      onClick={() => selectOnly(it.id)}
                    />
                    {sel && (
                      <g>
                        <rect
                          x={selX}
                          y={selY}
                          width={selW}
                          height={selH}
                          fill="none"
                          stroke="#1e90ff"
                          strokeWidth={0.25}
                          vectorEffect="non-scaling-stroke"
                          pointerEvents="none"
                        />
                        {/* corner dots */}
                        {([
                          { x: selX, y: selY, cursor: 'nwse-resize' },
                          { x: selX + selW, y: selY, cursor: 'nesw-resize' },
                          { x: selX, y: selY + selH, cursor: 'nesw-resize' },
                          { x: selX + selW, y: selY + selH, cursor: 'nwse-resize' },
                        ] as const).map((h, idx) => (
                          <g key={idx} style={{ cursor: h.cursor }}>
                            {/* visible dot */}
                            <circle cx={h.x} cy={h.y} r={0.5} fill="#1e90ff" />
                            {/* larger invisible hit area for future interactions */}
                            <circle cx={h.x} cy={h.y} r={2} fill="#1e90ff" fillOpacity={0} strokeOpacity={0} />
                          </g>
                        ))}
                      </g>
                    )}
                  </g>
                );
              }
              return null;
            })}
          </g>
        </svg>
      </DndContext>
      {showPerfHud && (
        <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 8px', borderRadius: 6, fontSize: 12, lineHeight: 1.2 }}>
          <div>FPS: {fps}</div>
          <div>Items: {items.length}</div>
          <div>Sel: {selectedIds.length}</div>
          <div>Zoom: {viewport.zoom.toFixed(2)}</div>
          <div>Pan: {viewport.pan.x.toFixed(1)}, {viewport.pan.y.toFixed(1)}</div>
        </div>
      )}
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
      role={undefined as any}
      tabIndex={-1}
      focusable={false as any}
      pointerEvents="all"
      style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent' as any, caretColor: 'transparent' as any }}
      onMouseDown={(e) => {
        // prevent focus ring/outline on click
        e.preventDefault();
      }}
      onFocus={(e) => {
        // force blur to avoid UA/mantine focus styling on SVG nodes
        (e.currentTarget as any)?.blur?.();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <path
        ref={(el) => setPathRef(id, el)}
        focusable={false as any}
        d={d}
        transform={transform}
        fill="transparent"
        stroke="#222"
        strokeWidth={0.4}
        vectorEffect="non-scaling-stroke"
        opacity={isDragging ? 0.9 : 1}
        pointerEvents="all"
        style={{ outline: 'none' }}
        onFocus={(e) => {
          (e.currentTarget as any)?.blur?.();
        }}
      />
    </g>
  );
});
