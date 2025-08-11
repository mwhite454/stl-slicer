"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Box } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { rectPathData } from '@/lib/maker/generateSvgPath';
import { transformForMakerPath } from '@/lib/coords';
import makerjs from 'makerjs';
import { DndContext, DragEndEvent, DragMoveEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { WorkspaceSvg } from '@/components/workspace/WorkspaceSvg';
import { DraggablePath } from './DraggablePath';
import { SelectionWrapper } from './SelectionWrapper';
import { WorkspaceBorder } from './WorkspaceBorder';
import { WorkspacePerfHud } from './WorkspacePerfHud';
import { MAX_ZOOM, MIN_ZOOM, WHEEL_ZOOM_SENSITIVITY, GRID_LINE_STROKE, MIN_POSITION_MM, DIRECTION_KEY_MAP, NUDGE_MIN_MM, FIT_MARGIN_MM, BORDER_STROKE, MIN_SPEED_MULT } from './workspaceConstants';

type DragOrigin = { id: string; x0: number; y0: number } | null;

export function WorkspaceStage({ visibleItemIds }: { visibleItemIds?: string[] }) {
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
  const nudgeDistanceMm = useWorkspaceStore((s) => s.ui.nudgeDistanceMm);

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
  // Imperative group refs for high-FPS drag updates without React re-renders
  const pathRefs = useRef<Map<string, SVGGraphicsElement>>(new Map());
  const setPathRef = (id: string, el: SVGGraphicsElement | null) => {
    if (el) pathRefs.current.set(id, el);
    else pathRefs.current.delete(id);
  };

  // Debug origin/transform mode toggles for sliceLayer alignment investigation
  const [debugMode, setDebugMode] = useState<'A' | 'B' | 'C' | 'D'>('D');
  const [selectedMetrics, setSelectedMetrics] = useState<{
    mode: 'A' | 'B' | 'C' | 'D';
    origin: [number, number];
    transform: string;
    bbox: { x: number; y: number; width: number; height: number } | null;
  } | null>(null);

  // Selected item JSON for Perf HUD (prettified)
  const selectedItemJson = useMemo(() => {
    const id = selectedIds[0];
    if (!id) return null;
    const it = items.find((x) => x.id === id);
    if (!it) return null;
    try {
      return JSON.stringify(it, null, 2);
    } catch (_e) {
      return null;
    }
  }, [selectedIds, items]);

  // Compute metrics for the first selected sliceLayer for HUD display
  useEffect(() => {
    const id = selectedIds[0];
    if (!id) {
      setSelectedMetrics(null);
      return;
    }
    const it = items.find((x) => x.id === id);
    if (!it || it.type !== 'sliceLayer') {
      setSelectedMetrics(null);
      return;
    }
    const extRaw = (makerjs as any).measure.modelExtents(it.layer.makerJsModel);
    if (!extRaw) {
      setSelectedMetrics(null);
      return;
    }
    const planeAware = Boolean(it.layer.plane);
    const metaExt = it.layer.uvExtents;
    const minU = metaExt?.minU ?? extRaw.low[0];
    const minV = metaExt?.minV ?? extRaw.low[1];
    const maxU = metaExt?.maxU ?? extRaw.high[0];
    const maxV = metaExt?.maxV ?? extRaw.high[1];
    const height = Math.max(0, maxV - minV);
    let origin: [number, number];
    if (planeAware) {
      origin = [-minU, -maxV] as [number, number];
    } else {
      const minX = extRaw.low[0];
      const minY = extRaw.low[1];
      const maxY = extRaw.high[1];
      origin = (debugMode === 'A' || debugMode === 'B') ? ([-minX, -minY] as [number, number]) : ([-minX, -maxY] as [number, number]);
    }
    const transform = planeAware
      ? transformForMakerPath(it.position.x, it.position.y, height)
      : (debugMode === 'A' || debugMode === 'C'
        ? `translate(${it.position.x} ${it.position.y})`
        : transformForMakerPath(it.position.x, it.position.y, height));
    const el = pathRefs.current.get(id) || null;
    let bbox: { x: number; y: number; width: number; height: number } | null = null;
    try {
      if (el) {
        const b = (el as any as SVGGraphicsElement).getBBox();
        bbox = { x: b.x, y: b.y, width: b.width, height: b.height };
      }
    } catch (_e) {
      bbox = null;
    }
    setSelectedMetrics({ mode: debugMode, origin, transform, bbox });
  }, [selectedIds, items, debugMode]);

  // Filter items to render, if a visibility list is provided
  const renderItems = useMemo(() => {
    if (!visibleItemIds) return items; // default: render all
    if (visibleItemIds.length === 0) return [] as typeof items; // explicitly none
    const set = new Set(visibleItemIds);
    return items.filter((it) => set.has(it.id));
  }, [items, visibleItemIds]);

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
    const delta = -e.deltaY * Math.max(MIN_SPEED_MULT, zoomSpeedMultiplier); // natural: scroll up to zoom in
    const scale = Math.exp(delta * WHEEL_ZOOM_SENSITIVITY);
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * scale));
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
    const dxMm = dxPx * mmpp.x * Math.max(MIN_SPEED_MULT, panSpeedMultiplier);
    const dyMm = dyPx * mmpp.y * Math.max(MIN_SPEED_MULT, panSpeedMultiplier);
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
          stroke={GRID_LINE_STROKE.color}
          strokeWidth={GRID_LINE_STROKE.width}
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
          stroke={GRID_LINE_STROKE.color}
          strokeWidth={GRID_LINE_STROKE.width}
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
    let itemWidth = 100;
    let itemHeight = 100;
    if (item.type === 'rectangle') {
      itemWidth = item.rect.width;
      itemHeight = item.rect.height;
    } else if (item.type === 'sliceLayer') {
      const extRaw = (makerjs as any).measure.modelExtents(item.layer.makerJsModel);
      if (extRaw) {
        const planeAware = Boolean(item.layer.plane);
        const metaExt = item.layer.uvExtents;
        const minU = planeAware ? (metaExt?.minU ?? extRaw.low[0]) : extRaw.low[0];
        const minV = planeAware ? (metaExt?.minV ?? extRaw.low[1]) : extRaw.low[1];
        const maxU = planeAware ? (metaExt?.maxU ?? extRaw.high[0]) : extRaw.high[0];
        const maxV = planeAware ? (metaExt?.maxV ?? extRaw.high[1]) : extRaw.high[1];
        itemWidth = Math.max(0, maxU - minU);
        itemHeight = Math.max(0, maxV - minV);
      }
    }
    nx = Math.max(MIN_POSITION_MM, Math.min(bounds.width - itemWidth, nx));
    ny = Math.max(MIN_POSITION_MM, Math.min(bounds.height - itemHeight, ny));
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
          if (item.type === 'sliceLayer') {
            const extRaw = (makerjs as any).measure.modelExtents(item.layer.makerJsModel);
            const planeAware = Boolean(item.layer.plane);
            const metaExt = item.layer.uvExtents;
            const minV = extRaw ? (planeAware ? (metaExt?.minV ?? extRaw.low[1]) : extRaw.low[1]) : 0;
            const maxV = extRaw ? (planeAware ? (metaExt?.maxV ?? extRaw.high[1]) : extRaw.high[1]) : 0;
            const ih = Math.max(0, maxV - minV);
            const t = planeAware
              ? transformForMakerPath(pending.x, pending.y, ih)
              : ((debugMode === 'A' || debugMode === 'C')
                ? `translate(${pending.x} ${pending.y})`
                : transformForMakerPath(pending.x, pending.y, ih));
            el.setAttribute('transform', t);
          } else {
            const ih = item.rect.height;
            el.setAttribute('transform', transformForMakerPath(pending.x, pending.y, ih));
          }
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
    const dir = DIRECTION_KEY_MAP[e.key];
    if (!dir) return;
    const { dx, dy } = dir;
    e.preventDefault();
    const item = items.find((it) => it.id === id);
    if (!item) return;
    // Use grid size when holding Shift, otherwise configurable nudge distance in mm
    const step = e.shiftKey && grid.size > 0 ? grid.size : Math.max(NUDGE_MIN_MM, nudgeDistanceMm);
    let nx = item.position.x + dx * step;
    let ny = item.position.y + dy * step;
    // optional snapping when shift used is already applied by step; if grid.snap, snap final
    if (grid.snap && grid.size > 0) {
      nx = Math.round(nx / grid.size) * grid.size;
      ny = Math.round(ny / grid.size) * grid.size;
    }
    let itemWidth = 100;
    let itemHeight = 100;
    if (item.type === 'rectangle') {
      itemWidth = item.rect.width;
      itemHeight = item.rect.height;
    } else if (item.type === 'sliceLayer') {
      const extRaw = (makerjs as any).measure.modelExtents(item.layer.makerJsModel);
      if (extRaw) {
        const planeAware = Boolean(item.layer.plane);
        const metaExt = item.layer.uvExtents;
        const minU = planeAware ? (metaExt?.minU ?? extRaw.low[0]) : extRaw.low[0];
        const minV = planeAware ? (metaExt?.minV ?? extRaw.low[1]) : extRaw.low[1];
        const maxU = planeAware ? (metaExt?.maxU ?? extRaw.high[0]) : extRaw.high[0];
        const maxV = planeAware ? (metaExt?.maxV ?? extRaw.high[1]) : extRaw.high[1];
        itemWidth = Math.max(0, maxU - minU);
        itemHeight = Math.max(0, maxV - minV);
      }
    }
    nx = Math.max(0, Math.min(bounds.width - itemWidth, nx));
    ny = Math.max(0, Math.min(bounds.height - itemHeight, ny));
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
    if (!renderItems.length) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const it of renderItems) {
      if (it.type === 'rectangle') {
        const x1 = it.position.x;
        const y1 = it.position.y;
        const x2 = it.position.x + it.rect.width;
        const y2 = it.position.y + it.rect.height;
        minX = Math.min(minX, x1); minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2);
      } else if (it.type === 'sliceLayer') {
        const extRaw = (makerjs as any).measure.modelExtents(it.layer.makerJsModel);
        if (extRaw) {
          const planeAware = Boolean(it.layer.plane);
          const metaExt = it.layer.uvExtents;
          const minU = planeAware ? (metaExt?.minU ?? extRaw.low[0]) : extRaw.low[0];
          const minV = planeAware ? (metaExt?.minV ?? extRaw.low[1]) : extRaw.low[1];
          const maxU = planeAware ? (metaExt?.maxU ?? extRaw.high[0]) : extRaw.high[0];
          const maxV = planeAware ? (metaExt?.maxV ?? extRaw.high[1]) : extRaw.high[1];
          const w = Math.max(0, maxU - minU);
          const h = Math.max(0, maxV - minV);
          const x1 = it.position.x;
          const y1 = it.position.y;
          const x2 = x1 + w;
          const y2 = y1 + h;
          minX = Math.min(minX, x1); minY = Math.min(minY, y1);
          maxX = Math.max(maxX, x2); maxY = Math.max(maxY, y2);
        }
      }
    }
    if (!Number.isFinite(minX)) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    // Add small margin (mm)
    const margin = FIT_MARGIN_MM;
    minX -= margin; minY -= margin; maxX += margin; maxY += margin;
    const rectW = Math.max(1, maxX - minX);
    const rectH = Math.max(1, maxY - minY);
    const scaleX = bounds.width / rectW;
    const scaleY = bounds.height / rectH;
    const targetZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(scaleX, scaleY)));
    // Center the rect
    const panX = (bounds.width - rectW * targetZoom) / 2 - minX * targetZoom;
    const panY = (bounds.height - rectH * targetZoom) / 2 - minY * targetZoom;
    setZoom(targetZoom);
    setPan({ x: panX, y: panY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToBoundsRequestId]);

  return (
    <Box
      style={{ width: '100%', height: '100%', outline: 'none', position: 'relative' }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <DndContext sensors={sensors} onDragStart={onDragStart} onDragMove={onDragMove} onDragEnd={onDragEnd}>
        <WorkspaceSvg
          ref={svgRef as any}
          bounds={bounds}
          isPanning={isPanning}
          onClearSelection={() => selectOnly(null)}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          
          {/* Pan/Zoom group in mm */}
          <g ref={contentGroupRef} transform={`translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.zoom})`}>
            {/* Grid */}
            {gridLines}

            {/* Workspace border in content space */}
            <WorkspaceBorder width={bounds.width} height={bounds.height} />

            {/* Items */}
            {renderItems.map((it) => {
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
                      <SelectionWrapper x={selX} y={selY} width={selW} height={selH} />
                    )}
                  </g>
                );
              } else if (it.type === 'sliceLayer') {
                const posX = activeId === it.id && dragPosMm ? dragPosMm.x : it.position.x;
                const posY = activeId === it.id && dragPosMm ? dragPosMm.y : it.position.y;
                const extRaw = (makerjs as any).measure.modelExtents(it.layer.makerJsModel);
                if (!extRaw) return null;
                const planeAware = Boolean(it.layer.plane);
                const metaExt = it.layer.uvExtents;
                const minU = metaExt?.minU ?? extRaw.low[0];
                const minV = metaExt?.minV ?? extRaw.low[1];
                const maxU = metaExt?.maxU ?? extRaw.high[0];
                const maxV = metaExt?.maxV ?? extRaw.high[1];
                const width = Math.max(0, maxU - minU);
                const height = Math.max(0, maxV - minV);
                // Plane-aware standardized origin/transform or fallback to debug modes
                let origin: [number, number];
                if (planeAware) {
                  origin = [-minU, -maxV];
                } else {
                  const minX = extRaw.low[0];
                  const minY = extRaw.low[1];
                  const maxY = extRaw.high[1];
                  if (debugMode === 'A' || debugMode === 'B') origin = [-minX, -minY];
                  else origin = [-minX, -maxY];
                }
                const d = (makerjs as any).exporter.toSVGPathData(it.layer.makerJsModel, { origin } as any) as unknown as string;
                console.log(`figuring out location issue...this is current d`, d);
                const dbgLowX = planeAware ? minU : extRaw.low[0];
                const dbgLowY = planeAware ? minV : extRaw.low[1];
                const dbgHighY = planeAware ? maxV : extRaw.high[1];
                console.log(`figuring out location issue...ext lows/high:`, { lowX: dbgLowX, lowY: dbgLowY, highY: dbgHighY });
                console.log(`figuring out location issue...this is current width, height`, width, height);
                console.log(`figuring out location issue...this is current posX, posY`, posX, posY);

                // Selection overlay as maker.js path: padded rectangle in local maker space
                const mmpp = getMmPerPx();
                const ox = selectionOverlayOffsetPx * mmpp.x;
                const oy = selectionOverlayOffsetPx * mmpp.y;
                let selectionD: string | undefined;
                try {
                  const selRectModel = new (makerjs as any).models.Rectangle(width + ox * 2, height + oy * 2);
                  // Local-space top-left depends on exporter origin choice
                  const yTopLocal = planeAware ? -height : ((debugMode === 'A' || debugMode === 'B') ? 0 : -height);
                  const out = (makerjs as any).exporter.toSVGPathData(selRectModel, { origin: [-ox, yTopLocal - oy] } as any) as unknown;
                  selectionD = typeof out === 'string' ? out : Object.values(out as Record<string, string>).join(' ');
                } catch (_e) {
                  selectionD = undefined;
                }
                console.log(`figuring out location issue...this is current selectionD`, selectionD);

                const transformStr = planeAware
                  ? transformForMakerPath(posX, posY, height)
                  : ((debugMode === 'A' || debugMode === 'C')
                    ? `translate(${posX} ${posY})`
                    : transformForMakerPath(posX, posY, height));
                return (
                  <g key={it.id}>
                    <DraggablePath
                      id={it.id}
                      d={d}
                      transform={transformStr}
                      selected={sel}
                      selectionD={selectionD}
                      setPathRef={setPathRef}
                      onClick={() => selectOnly(it.id)}
                    />
                    {showPerfHud && (
                      <>
                        {/* Global-space expected bbox */}
                        <rect
                          x={posX}
                          y={posY}
                          width={width}
                          height={height}
                          fill="none"
                          stroke="#00cc66"
                          strokeWidth={0.35}
                          vectorEffect="non-scaling-stroke"
                          pointerEvents="none"
                        />
                        {/* Local-space bbox under same transform as path */}
                        <g transform={transformStr}>
                          <rect
                            x={0}
                            y={planeAware ? -height : ((debugMode === 'A' || debugMode === 'B') ? 0 : -height)}
                            width={width}
                            height={height}
                            fill="none"
                            stroke="#ff00cc"
                            strokeWidth={0.35}
                            vectorEffect="non-scaling-stroke"
                            pointerEvents="none"
                          />
                          {/* Anchor markers to understand baseline */}
                          <g pointerEvents="none">
                            {/* Origin crosshair at (0,0) */}
                            <line x1={-2} y1={0} x2={2} y2={0} stroke="#ffaa00" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
                            <line x1={0} y1={-2} x2={0} y2={2} stroke="#ffaa00" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
                            {/* Baseline at y=height (for translate(x,y) pairing) */}
                            <line x1={-4} y1={height} x2={4} y2={height} stroke="#66aaff" strokeWidth={0.3} vectorEffect="non-scaling-stroke" />
                          </g>
                        </g>
                      </>
                    )}
                    {/* External SelectionWrapper removed for sliceLayer; selection is indicated by DraggablePath's internal overlay */}
                  </g>
                );
              }
              return null;
            })}
          </g>
        </WorkspaceSvg>
      </DndContext>
      {showPerfHud && (
        <WorkspacePerfHud
          fps={fps}
          itemsCount={items.length}
          selectedCount={selectedIds.length}
          zoom={viewport.zoom}
          pan={viewport.pan}
          selectedItemJson={selectedItemJson}
          debugMode={debugMode}
          onDebugModeChange={(m) => setDebugMode(m)}
          selectedMetrics={selectedMetrics}
        />
      )}
    </Box>
  );
}

