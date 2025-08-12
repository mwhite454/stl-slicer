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
import { calculateRectangleBounds, calculateSliceLayerBounds, updateBounds, initializeBounds, applyMarginToBounds, calculateFitZoom, calculateCenterPan, calculateRectangleRenderProps, calculateSliceLayerRenderProps } from './workspaceDataHelpers';

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
  // Debug: Track click positions
  const [debugClicks, setDebugClicks] = useState<Array<{ 
    screen: { x: number; y: number };
    world: { x: number; y: number };
    label: string;
  }>>([]);
  // Imperative group refs for high-FPS drag updates without React re-renders
  const pathRefs = useRef<Map<string, SVGGraphicsElement>>(new Map());
  const setPathRef = (id: string, el: SVGGraphicsElement | null) => {
    if (el) pathRefs.current.set(id, el);
    else pathRefs.current.delete(id);
  };

  // Debug toggles removed after finalizing plane-aware transform/origin pairing

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

  // Removed metrics debug effect after alignment finalized

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
    // Round to 0.1mm precision to eliminate micro-differences from floating point calculations
    const precision = 0.1;
    return { 
      x: Math.round(p.x / precision) * precision, 
      y: Math.round(p.y / precision) * precision 
    };
  };

  // Debug: Handle click for coordinate debugging
  const handleDebugClick = (e: React.MouseEvent) => {
    if (!e.shiftKey) return; // Only capture with Shift+Click
    
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = clientToMm(e.clientX, e.clientY);
    
    if (worldPos) {
      const clickNumber = debugClicks.length + 1;
      const label = `Click ${clickNumber}`;
      setDebugClicks(prev => [...prev, {
        screen: { x: screenX, y: screenY },
        world: worldPos,
        label
      }]);
      console.log(`Debug ${label}:`, {
        screen: { x: screenX.toFixed(1), y: screenY.toFixed(1) },
        world: { x: worldPos.x.toFixed(2), y: worldPos.y.toFixed(2) }
      });
    }
  };

  // onWheel handler removed - now handled by non-passive listener in useEffect below
  // to avoid "Unable to preventDefault inside passive event listener" errors

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
      const extRaw = makerjs.measure.modelExtents(item.layer.makerJsModel);
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
    } else {
      // Apply 0.1mm precision rounding even when not snapping to grid
      // This eliminates floating-point micro-differences
      const precision = 0.1;
      nx = Math.round(nx / precision) * precision;
      ny = Math.round(ny / precision) * precision;
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
            const extRaw = makerjs.measure.modelExtents(item.layer.makerJsModel);
            const planeAware = Boolean(item.layer.plane);
            const metaExt = item.layer.uvExtents;
            const minV = extRaw ? (metaExt?.minV ?? extRaw.low[1]) : 0;
            const maxV = extRaw ? (metaExt?.maxV ?? extRaw.high[1]) : 0;
            const ih = Math.max(0, maxV - minV);
            const t = transformForMakerPath(pending.x, pending.y, ih);
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const key = e.key;
    // Clear debug clicks with 'C' key (uppercase) or 'c' with shift
    if ((key === 'C' || key === 'c') && e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      setDebugClicks([]);
      console.log('Debug clicks cleared');
      return;
    }
    const dir = DIRECTION_KEY_MAP[key];
    if (!dir) return;
    const { dx, dy } = dir;
    e.preventDefault();
    const id = selectedIds[0];
    if (!id) return;
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
      const extRaw = makerjs.measure.modelExtents(item.layer.makerJsModel);
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

  // Add non-passive wheel event listener to prevent passive event warnings
  useEffect(() => {
    const svg = svgRef.current as unknown as SVGSVGElement | null;
    if (!svg) return;
    
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const g = contentGroupRef.current;
      if (!g) return;
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = g.getScreenCTM();
      if (!ctm) return;
      const p = pt.matrixTransform(ctm.inverse());
      const delta = -e.deltaY * Math.max(MIN_SPEED_MULT, zoomSpeedMultiplier);
      const scale = Math.exp(delta * WHEEL_ZOOM_SENSITIVITY);
      const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewport.zoom * scale));
      const applied = nextZoom / viewport.zoom;
      const newPan = {
        x: p.x - (p.x - viewport.pan.x) * applied,
        y: p.y - (p.y - viewport.pan.y) * applied,
      };
      setZoom(nextZoom);
      setPan(newPan);
    };
    
    // Add as non-passive to allow preventDefault
    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [viewport.zoom, viewport.pan, zoomSpeedMultiplier, setZoom, setPan]);

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
    let bounds = initializeBounds();
    for (const renderItem of renderItems) {
      if (renderItem.type === 'rectangle') {
        const itemBounds = calculateRectangleBounds(renderItem);
        bounds = updateBounds(bounds, itemBounds);
      } else if (renderItem.type === 'sliceLayer') {
        const itemBounds = calculateSliceLayerBounds(renderItem);
        bounds = updateBounds(bounds, itemBounds);
      }
    }
    if (!Number.isFinite(bounds.minX)) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      return;
    }
    // Add small margin (mm)
    const margin = FIT_MARGIN_MM;
    const boundsWithMargin = applyMarginToBounds(bounds, margin);
    const targetZoom = calculateFitZoom(boundsWithMargin, bounds.width, bounds.height, MIN_ZOOM, MAX_ZOOM);
    const { x: panX, y: panY } = calculateCenterPan(boundsWithMargin, bounds.width, bounds.height, targetZoom);
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
          // onWheel removed - handled by non-passive listener in useEffect
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={handleDebugClick}
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
                const { draggablePathProps, selectionWrapperProps } = calculateRectangleRenderProps(
                  it,
                  activeId,
                  dragPosMm,
                  selectionOverlayOffsetPx,
                  getMmPerPx,
                  rectPathData,
                  transformForMakerPath
                );
                
                return (
                  <g key={it.id}>
                    <DraggablePath
                      {...draggablePathProps}
                      selected={sel}
                      setPathRef={setPathRef}
                      onClick={() => selectOnly(it.id)}
                    />
                    {sel && (
                      <SelectionWrapper {...selectionWrapperProps} />
                    )}
                  </g>
                );
              } else if (it.type === 'sliceLayer') {
                const renderProps = calculateSliceLayerRenderProps(
                  it,
                  activeId,
                  dragPosMm,
                  selectionOverlayOffsetPx,
                  getMmPerPx,
                  transformForMakerPath
                );
                
                if (!renderProps) return null;
                
                const { draggablePathProps, selectionWrapperProps, posX, posY, width, height } = renderProps;
                
                return (
                  <g key={it.id}>
                    <DraggablePath
                      {...draggablePathProps}
                      selected={sel}
                      setPathRef={setPathRef}
                      onClick={() => selectOnly(it.id)}
                    />
                    {sel && (
                      <>
                        <SelectionWrapper {...selectionWrapperProps} />
                        {/* Debug: show where we think the geometry should be */}
                        <rect 
                          x={posX} 
                          y={posY - (height + (height/2))} 
                          width={width} 
                          height={height} 
                          fill="none" 
                          stroke="lime" 
                          strokeWidth="2" 
                          strokeDasharray="5,5"
                          opacity="0.7"
                        />
                        <text x={posX + 5} y={posY - 5} fontSize="12" fill="lime">{posX.toFixed(1)}, {posY.toFixed(1)}</text>
                      </>
                    )}
                  </g>
                );
              }
              return null;
            })}
            
            {/* Debug click markers */}
            {debugClicks.map((click, i) => (
              <g key={i} pointerEvents="none">
                {/* World space marker */}
                <circle 
                  cx={click.world.x} 
                  cy={click.world.y} 
                  r="3" 
                  fill="purple" 
                  opacity="0.8" 
                />
                <text 
                  x={click.world.x + 5} 
                  y={click.world.y - 5} 
                  fontSize="12" 
                  fill="purple"
                  fontWeight="bold"
                  style={{ userSelect: 'text' }}
                >
                  {click.label} (World: {click.world.x.toFixed(1)}, {click.world.y.toFixed(1)})
                </text>
              </g>
            ))}
          </g>
        </WorkspaceSvg>
      </DndContext>
      {/* Screen space debug info overlay */}
      {debugClicks.length > 0 && (
        <Box
          style={{
            position: 'absolute',
            top: 20,
            left: 10,
            width: 400,
            backgroundColor: 'white',
            opacity: 0.9,
            border: '1px solid purple',
            pointerEvents: 'none',
            padding: 5,
            zIndex: 1000
          }}
        >
          <div style={{ 
            fontSize: 12, 
            color: 'purple', 
            fontWeight: 'bold',
            userSelect: 'text',
            marginBottom: 5
          }}>
            Debug Clicks (Shift+Click to add, Shift+C to clear):
          </div>
          {debugClicks.map((click, i) => (
            <div 
              key={i} 
              style={{ 
                fontSize: 11, 
                color: 'black', 
                userSelect: 'text',
                marginBottom: 3
              }}
            >
              {click.label}: Screen({click.screen.x.toFixed(0)}, {click.screen.y.toFixed(0)}) → World({click.world.x.toFixed(1)}, {click.world.y.toFixed(1)})
            </div>
          ))}
        </Box>
      )}
      {showPerfHud && (
        <WorkspacePerfHud
          fps={fps}
          itemsCount={items.length}
          selectedCount={selectedIds.length}
          zoom={viewport.zoom}
          pan={viewport.pan}
          selectedItemJson={selectedItemJson}
        />
      )}
    </Box>
  );
}
