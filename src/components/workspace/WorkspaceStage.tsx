"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Box, Collapse, Button } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import {
  useWorkspaceStore,
} from '@/stores/workspaceStore';
import { rectPathData } from '@/lib/maker/generateSvgPath';
import { transformForMakerPath } from '@/lib/coords';
import makerjs from 'makerjs';
import type { MakerJSModel } from '@/lib/coords';
import { DndContext, DragEndEvent, DragMoveEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { WorkspaceSvg } from '@/components/workspace/WorkspaceSvg';
import { DraggablePath } from './DraggablePath';
import { SelectionWrapper } from './SelectionWrapper';
// Border is now rendered from Maker.js meta model
import { WorkspacePerfHud } from './WorkspacePerfHud';
// import WorkspaceGrid from './Grid/WorkspaceGrid'; // replaced by maker.js meta grid
import { generateMakerGridModel } from '@/lib/maker/generateGridModel';
import { generateMakerWorkspaceModel } from '@/lib/maker/generateWorkspaceModel';
import { DebugMarker } from './Debug/DebugMarker';
import { MAX_ZOOM, MIN_ZOOM, WHEEL_ZOOM_SENSITIVITY, MIN_POSITION_MM, DIRECTION_KEY_MAP, NUDGE_MIN_MM, FIT_MARGIN_MM , MIN_SPEED_MULT, BORDER_STROKE } from './workspaceConstants';
import { calculateSliceLayerDebugAltProps } from './workspaceDataHelpers';
import { calculateRectangleBounds, calculateSliceLayerBounds, calculateMetaModelBounds, updateBounds, initializeBounds, applyMarginToBounds, calculateFitZoom, calculateCenterPan, calculateRectangleRenderProps, calculateSliceLayerRenderProps } from './workspaceDataHelpers';

type DragOrigin = { id: string; x0: number; y0: number } | null;

export function WorkspaceStage({ visibleItemIds }: { visibleItemIds?: string[] }) {
  const ui = useWorkspaceStore((s) => s.ui);
  const grid = useWorkspaceStore((s) => s.grid);
  const bounds = useWorkspaceStore((s) => s.bounds);
  const viewport = useWorkspaceStore((s) => s.viewport);
  const upsertMetaGrid = useWorkspaceStore((s) => s.upsertMetaGrid);
  const upsertMetaWorkspace = useWorkspaceStore((s) => s.upsertMetaWorkspace);
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
  const setUi = useWorkspaceStore((s) => s.setUi);
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
    viewport: { zoom: number; pan: { x: number; y: number } };
    sliceMeta?: {
      plane?: 'XY' | 'YZ' | 'XZ';
      axisMap?: { u: 'x' | 'y' | 'z'; v: 'x' | 'y' | 'z' };
      vUpSign?: 1 | -1;
      uvExtents?: { minU: number; minV: number; maxU: number; maxV: number };
      slicedAxis?: 'x' | 'y' | 'z';
    };
  }>>([]);
  // Imperative group refs for high-FPS drag updates without React re-renders
  const pathRefs = useRef<Map<string, SVGGraphicsElement>>(new Map());
  const setPathRef = (id: string, el: SVGGraphicsElement | null) => {
    if (el) pathRefs.current.set(id, el);
    else pathRefs.current.delete(id);
  };

  // Map screen-space delta (px) to content mm using inverse CTM of content group
  const deltaPxToMm = (dxPx: number, dyPx: number) => {
    const g = contentGroupRef.current;
    const m = g?.getScreenCTM();
    if (!m) {
      const s = getMmPerPx();
      return { x: dxPx * s.x, y: dyPx * s.y };
    }
    const det = m.a * m.d - m.b * m.c;
    if (!det) {
      const s = getMmPerPx();
      return { x: dxPx * s.x, y: dyPx * s.y };
    }
    // Inverse of 2x2 [a c; b d] applied to vector
    const ia = m.d / det;
    const ib = -m.b / det;
    const ic = -m.c / det;
    const id = m.a / det;
    return { x: ia * dxPx + ic * dyPx, y: ib * dxPx + id * dyPx };
  };

  // Generate maker.js grid and workspace meta models whenever bounds or grid change
  // TODO(workspace-chrome): If/when adding rulers/background/safe-margins, extend the
  // workspace model here (generateMakerWorkspaceModel) with feature flags/settings from store UI.
  useEffect(() => {
    if (!grid.show) {
      // Keep simple for now: do not remove; could call removeMetaByType('grid')
      return;
    }
    const gridModel = generateMakerGridModel(bounds.width, bounds.height, grid.size);
    upsertMetaGrid(gridModel as unknown as MakerJSModel);
    const workspaceModel = generateMakerWorkspaceModel(bounds.width, bounds.height);
    upsertMetaWorkspace(workspaceModel as unknown as MakerJSModel);
  }, [bounds.width, bounds.height, grid.size, grid.show, upsertMetaGrid, upsertMetaWorkspace]);

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

  // Selected sliceLayer item for Perf HUD card
  const selectedSliceLayer = useMemo(() => {
    const id = selectedIds[0];
    if (!id) return null;
    const it = items.find((x) => x.id === id);
    if (!it || it.type !== 'sliceLayer') return null;
    return it;
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
  const handleDebugClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!e.shiftKey) return; // Only capture with Shift+Click
    // Prevent default so `WorkspaceSvg` does not clear selection
    e.preventDefault();
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldPos = clientToMm(e.clientX, e.clientY);
    const g = contentGroupRef.current;
    const ctm = g?.getScreenCTM?.();
    if (worldPos) {
      // Capture selected sliceLayer metadata at click time
      const selId = useWorkspaceStore.getState().selection.selectedIds[0];
      const sel = selId ? useWorkspaceStore.getState().items.find((x) => x.id === selId) : undefined;
      const planeVal = sel && sel.type === 'sliceLayer' ? sel.layer.plane : undefined;
      const plane: 'XY' | 'YZ' | 'XZ' | undefined =
        planeVal === 'XY' || planeVal === 'YZ' || planeVal === 'XZ' ? planeVal : undefined;
      const slicedAxis: 'x' | 'y' | 'z' | undefined =
        plane === 'XY' ? 'z' : plane === 'YZ' ? 'x' : plane === 'XZ' ? 'y' : undefined;
      const sliceMeta = sel && sel.type === 'sliceLayer' ? {
        plane,
        axisMap: sel.layer.axisMap as { u: 'x' | 'y' | 'z'; v: 'x' | 'y' | 'z' } | undefined,
        vUpSign: sel.layer.vUpSign as 1 | -1 | undefined,
        uvExtents: sel.layer.uvExtents,
        slicedAxis,
      } : undefined;
      const clickNumber = debugClicks.length + 1;
      const label = `Click ${clickNumber}`;
      setDebugClicks([
        ...debugClicks,
        {
          screen: { x: screenX, y: screenY },
          world: worldPos,
          label,
          viewport: { zoom: useWorkspaceStore.getState().viewport.zoom, pan: { ...useWorkspaceStore.getState().viewport.pan } },
          sliceMeta,
        },
      ]);
      // eslint-disable-next-line no-console
      console.log(`Debug ${label}:`, {
        svgRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        screen: { x: screenX.toFixed(1), y: screenY.toFixed(1) },
        world: { x: worldPos.x.toFixed(2), y: worldPos.y.toFixed(2) },
        bounds,
        viewport,
        sliceMeta,
        hasCTM: Boolean(ctm),
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
    const v = deltaPxToMm(dxPx, dyPx);
    const speed = Math.max(MIN_SPEED_MULT, panSpeedMultiplier);
    const dxMm = v.x * speed;
    // Invert Y delta to match expected direction in Y-flipped coordinate system
    const dyMm = -v.y * speed;
    panDeltaRef.current = { x: panDeltaRef.current.x + dxMm, y: panDeltaRef.current.y + dyMm };
    const start = panStartRef.current ?? { x: 0, y: 0 };
    const next = { x: start.x + panDeltaRef.current.x, y: start.y + panDeltaRef.current.y };
    panPendingRef.current = next;
    
    // Debug logging for pan movements
    // eslint-disable-next-line no-console
    console.log('[pan:move]', {
      pixelDelta: { x: dxPx.toFixed(1), y: dyPx.toFixed(1) },
      mmDelta: { x: dxMm.toFixed(2), y: dyMm.toFixed(2) },
      startPan: { x: start.x.toFixed(2), y: start.y.toFixed(2) },
      currentPan: { x: next.x.toFixed(2), y: next.y.toFixed(2) },
      cumulativeDelta: { x: panDeltaRef.current.x.toFixed(2), y: panDeltaRef.current.y.toFixed(2) },
    });
    if (panRafRef.current == null) {
      panRafRef.current = requestAnimationFrame(() => {
        panRafRef.current = null;
        const pending = panPendingRef.current;
        if (!pending) return;
        // Imperatively update transform for smoothness
        const g = contentGroupRef.current;
        if (g) {
          // For Y-up coordinate system with Y-flip, we need to negate the Y translation
          // Order: Y-up flip, then pan with Y-negated, then zoom
          g.setAttribute(
            'transform',
            `scale(1 -1) translate(${pending.x} ${-pending.y}) scale(${viewport.zoom})`
          );
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
    // Use absolute to avoid sign inversion when stage is flipped in Y
    return { x: 1 / Math.abs(m.a), y: 1 / Math.abs(m.d) };
  };

  // Grid moved to dedicated component

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
    const v = deltaPxToMm(dxPx, dyPx); // v is in centered Y-up local mm
    const dxMm = v.x;
    const dyMm = -v.y; // positions are stored in top-left Y-down; invert Y
    let nx = x0 + dxMm;
    let ny = y0 + dyMm;

    // eslint-disable-next-line no-console
    console.log('[onDragMove:debug]', {
      dxPx: e.delta.x,
      dyPx: e.delta.y,
      dxMm,
      dyMm,
      x0,
      y0,
      nx_pre_clamp: nx,
      ny_pre_clamp: ny,
    });
    // Clamp within bounds (ensuring item stays fully inside)
    let itemWidth = 100;
    let itemHeight = 100;
    if (item.type === 'rectangle') {
      itemWidth = item.rect.width;
      itemHeight = item.rect.height;
    } else if (item.type === 'sliceLayer') {
      const extRaw = makerjs.measure.modelExtents(item.layer.makerJsModel);
      if (extRaw) {
        const useMeta = !ui.disablePlaneMapping;
        const metaExt = useMeta ? item.layer.uvExtents : undefined;
        const minU = metaExt?.minU ?? extRaw.low[0];
        const minV = metaExt?.minV ?? extRaw.low[1];
        const maxU = metaExt?.maxU ?? extRaw.high[0];
        const maxV = metaExt?.maxV ?? extRaw.high[1];
        itemWidth = Math.max(0, maxU - minU);
        itemHeight = Math.max(0, maxV - minV);
      }
    }
    if (item.type === 'sliceLayer') {
      // Re-enable proper clamping for sliceLayer using top-left stored positions
      nx = Math.max(MIN_POSITION_MM, Math.min(bounds.width - itemWidth, nx));
      ny = Math.max(MIN_POSITION_MM, Math.min(bounds.height - itemHeight, ny));
    } else {
      nx = Math.max(MIN_POSITION_MM, Math.min(bounds.width - itemWidth, nx));
      ny = Math.max(MIN_POSITION_MM, Math.min(bounds.height - itemHeight, ny));
    }
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
          // Map from stored top-left Y-down to centered Y-up for transform
          const cx = bounds.width / 2;
          const cy = bounds.height / 2;
          if (item.type === 'sliceLayer') {
            const extRaw = makerjs.measure.modelExtents(item.layer.makerJsModel);
            const useMeta = !ui.disablePlaneMapping;
            const metaExt = useMeta ? item.layer.uvExtents : undefined;
            const minV = extRaw ? (metaExt?.minV ?? extRaw.low[1]) : 0;
            const maxV = extRaw ? (metaExt?.maxV ?? extRaw.high[1]) : 0;
            const ih = Math.max(0, maxV - minV);
            const xLeftCenter = pending.x - cx;
            // Use the same formula for both plane mapping enabled and disabled
            // This ensures consistent positioning during drag operations
            const yBottomCenter = (bounds.height - (pending.y + ih)) - cy;
            const t = transformForMakerPath(xLeftCenter, yBottomCenter, ih);
            try {
              // eslint-disable-next-line no-console
              console.log('[sliceLayer:raf]', { id: item.id, disablePlaneMapping: ui.disablePlaneMapping, minV, maxV, ih, pending, cx, cy, xLeftCenter, yBottomCenter, t });
            } catch {}
            el.setAttribute('transform', t);
          } else if (item.type === 'rectangle') {
            const ih = item.rect.height;
            const xLeftCenter = pending.x - cx;
            const yBottomCenter = (bounds.height - (pending.y + ih)) - cy;
            el.setAttribute('transform', transformForMakerPath(xLeftCenter, yBottomCenter, ih));
          } else if (item.type === 'metaModel') {
            // MetaModel items don't have a rect property, handle differently if needed
            // For now, we don't expect to drag metaModels, but this prevents the TypeScript error
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
    if (item.type === 'sliceLayer') {
      // Clamp both axes for sliceLayer using top-left semantics
      nx = Math.max(0, Math.min(bounds.width - itemWidth, nx));
      ny = Math.max(0, Math.min(bounds.height - itemHeight, ny));
    } else {
      nx = Math.max(0, Math.min(bounds.width - itemWidth, nx));
      ny = Math.max(0, Math.min(bounds.height - itemHeight, ny));
    }
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
        const itemBounds = calculateSliceLayerBounds(renderItem, { disablePlaneMapping: ui.disablePlaneMapping });
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

  // Effect to set the initial view to fit the workspace bounds on mount
  // Effect to set the initial view to fit the workspace bounds on mount
  const initialFitDoneRef = useRef(false);
  useEffect(() => {
    if (initialFitDoneRef.current || bounds.width === 0 || bounds.height === 0) return;

    const workspaceItem = items.find((it) => it.type === 'metaModel' && it.metaType === 'workspace');
    if (workspaceItem && workspaceItem.type === 'metaModel') {
      const workspaceBounds = calculateMetaModelBounds(workspaceItem);

      if (workspaceBounds.width > 0 && workspaceBounds.height > 0) {
        const targetZoom = calculateFitZoom(workspaceBounds, bounds.width, bounds.height, MIN_ZOOM, MAX_ZOOM);
        const { x: panX, y: panY } = calculateCenterPan(workspaceBounds, bounds.width, bounds.height, targetZoom);
        setZoom(targetZoom);
        setPan({ x: panX, y: panY });
        initialFitDoneRef.current = true; // Prevent re-running
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bounds]); // Re-run if bounds change

  return (
    <Box
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%', 
        outline: 'none' 
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Main workspace area */}
      <Box style={{ flex: 1, position: 'relative' }}>
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
            onClickCapture={handleDebugClick}
          >
            
            {/* Pan/Zoom group in mm, Y-up with origin flip around center */}
            <g
              ref={contentGroupRef}
              transform={`translate(${viewport.pan.x} ${viewport.pan.y}) scale(${viewport.zoom}, ${-viewport.zoom})`}
            >
              {/* Meta models (e.g., grid) rendered behind content */}
            {items
              .filter((it) => it.type === 'metaModel' && (it.metaType === 'grid' || it.metaType === 'workspace'))
              .map((meta) => {
                if (meta.type !== 'metaModel') return null;
                const model = meta.makerJsModel as unknown as makerjs.IModel;
                if (meta.metaType === 'grid') {
                  const gridPathAny = makerjs.exporter.toSVGPathData(model as any, { origin: [0, 0] } as any);
                  const gridPath = typeof gridPathAny === 'string' ? gridPathAny : Object.values(gridPathAny ?? {}).join(' ');
                  const axesModel = (model.models && (model.models as any).axes) as makerjs.IModel | undefined;
                  let xAxisPath = '';
                  let yAxisPath = '';
                  if (axesModel && axesModel.paths) {
                    const axisX = (axesModel.paths as any)['axis-x'];
                    const axisY = (axesModel.paths as any)['axis-y'];
                    if (axisX) {
                      const mX: makerjs.IModel = { paths: { 'axis-x': axisX } } as any;
                      const xAny = makerjs.exporter.toSVGPathData(mX as any, { origin: [0, 0] } as any);
                      xAxisPath = typeof xAny === 'string' ? xAny : Object.values(xAny ?? {}).join(' ');
                    }
                    if (axisY) {
                      const mY: makerjs.IModel = { paths: { 'axis-y': axisY } } as any;
                      const yAny = makerjs.exporter.toSVGPathData(mY as any, { origin: [0, 0] } as any);
                      yAxisPath = typeof yAny === 'string' ? yAny : Object.values(yAny ?? {}).join(' ');
                    }
                  }
                  return (
                    <g key={meta.id} aria-roledescription="meta-grid">
                      {gridPath && (
                        <g shapeRendering="crispEdges">
                          <path
                            d={gridPath}
                            fill="none"
                            stroke="#e9ecef"
                            strokeWidth={0.5}
                            strokeLinecap="square"
                          />
                        </g>
                      )}
                      {xAxisPath && (
                        <path
                          d={xAxisPath}
                          fill="none"
                          stroke="#fa5252" /* red for X axis */
                          strokeWidth={0.8}
                          strokeLinecap="square"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                      {yAxisPath && (
                        <path
                          d={yAxisPath}
                          fill="none"
                          stroke="#2f9e44" /* green for Y axis */
                          strokeWidth={0.8}
                          strokeLinecap="square"
                          vectorEffect="non-scaling-stroke"
                        />
                      )}
                    </g>
                  );
                }
                if (meta.metaType === 'workspace') {
                  // TODO(workspace-chrome): Render additional workspace chrome here:
                  // - background fill panel
                  // - rulers (tick marks + labels)
                  // - origin marker at (0,0)
                  // - printable/safe-area overlays
                  const borderModel = (model.models && (model.models as any).border) as makerjs.IModel | undefined;
                  if (!borderModel) return null;
                  const bAny = makerjs.exporter.toSVGPathData(borderModel as any, { origin: [0, 0] } as any);
                  const borderPath = typeof bAny === 'string' ? bAny : Object.values(bAny ?? {}).join(' ');
                  return (
                    <g key={meta.id} aria-roledescription="meta-workspace">
                      {borderPath && (
                        <path
                          d={borderPath}
                          fill="none"
                          stroke={BORDER_STROKE.color}
                          strokeWidth={BORDER_STROKE.width}
                          vectorEffect="non-scaling-stroke"
                          strokeLinecap="square"
                        />
                      )}
                    </g>
                  );
                }
                return null;
              })}

              {/* Border now rendered from meta model above */}

              {/* Debug: world Y=0 midline */}
              <line
                x1={-bounds.width / 2}
                y1={0}
                x2={bounds.width / 2}
                y2={0}
                stroke="#00bcd4"
                strokeWidth={0.4}
                strokeDasharray="2,2"
                vectorEffect="non-scaling-stroke"
              />

              {/* Items */}
              {renderItems.map((renderItem) => {
                const isSelected = selectedIds.includes(renderItem.id);
                if (renderItem.type === 'rectangle') {
                  const { draggablePathProps, selectionWrapperProps } = calculateRectangleRenderProps(
                    renderItem,
                    activeId,
                    dragPosMm,
                    selectionOverlayOffsetPx,
                    getMmPerPx,
                    rectPathData,
                    transformForMakerPath,
                    bounds
                  );
                  
                  return (
                    <g key={renderItem.id}>
                      <DraggablePath
                        {...draggablePathProps}
                        selected={isSelected}
                        setPathRef={setPathRef}
                        onClick={() => selectOnly(renderItem.id)}
                      />
                      {isSelected && (
                        <SelectionWrapper {...selectionWrapperProps} />
                      )}
                    </g>
                  );
                } else if (renderItem.type === 'sliceLayer') {
                  const renderProps = calculateSliceLayerRenderProps(
                    renderItem,
                    activeId,
                    dragPosMm,
                    selectionOverlayOffsetPx,
                    getMmPerPx,
                    transformForMakerPath,
                    bounds,
                    { disablePlaneMapping: ui.disablePlaneMapping }
                  );

                  if (!renderProps) return null;

                  const { draggablePathProps, selectionWrapperProps, posX, posY, width, height } = renderProps as any;
                  if (isSelected) {
                    try {
                      // eslint-disable-next-line no-console
                      console.log('[sliceLayer:renderProps]', { id: renderItem.id, disablePlaneMapping: ui.disablePlaneMapping, posX, posY, width, height });
                    } catch {}
                  }

                  return (
                    <g key={renderItem.id}>
                      <DraggablePath
                        {...draggablePathProps}
                        selected={isSelected}
                        setPathRef={setPathRef}
                        onClick={() => selectOnly(renderItem.id)}
                      />
                      {isSelected && (() => {
                        const alt = calculateSliceLayerDebugAltProps(renderItem as any, {
                          bounds,
                          posX,
                          posY,
                          selectionOverlayOffsetPx,
                          getMmPerPx,
                          transformForMakerPath,
                          disablePlaneMapping: ui.disablePlaneMapping,
                        });
                        return alt ? (
                          <path
                            d={alt.d}
                            transform={alt.transform}
                            fill="none"
                            stroke="#1971c2"
                            strokeDasharray="3,2"
                            strokeWidth={0.6}
                            vectorEffect="non-scaling-stroke"
                          />
                        ) : null;
                      })()}
                      {/* {isSelected && <SelectionWrapper {...selectionWrapperProps} />} */}
                    </g>
                  );
                } else if (renderItem.type === 'label') {
                  // Render label as maker.js path
                  // Validate extents first; skip invalid labels
                  const ext = makerjs.measure.modelExtents(renderItem.makerJsModel as any);
                  if (!ext || !Number.isFinite(ext.low[0]) || !Number.isFinite(ext.low[1]) || !Number.isFinite(ext.high[0]) || !Number.isFinite(ext.high[1])) {
                    try {
                      // eslint-disable-next-line no-console
                      console.warn('[label:skip-invalid-extents]', { id: renderItem.id, ext });
                    } catch {}
                    return null;
                  }
                  const pathDataAny = makerjs.exporter.toSVGPathData(
                    renderItem.makerJsModel as any,
                    { origin: [0, 0] } as any
                  );
                  const d = typeof pathDataAny === 'string'
                    ? pathDataAny
                    : Object.values(pathDataAny ?? {}).join(' ');
                  if (typeof d !== 'string' || d.length === 0 || d.includes('NaN')) {
                    try {
                      // eslint-disable-next-line no-console
                      console.warn('[label:skip-invalid-path]', { id: renderItem.id, len: typeof d === 'string' ? d.length : 0 });
                    } catch {}
                    return null;
                  }
                  // Convert stored top-left Y-down (workspace) position to centered Y-up transform
                  // Measure label extents to obtain height for proper Y-bottom alignment
                  const minV = ext ? ext.low[1] : 0;
                  const maxV = ext ? ext.high[1] : 0;
                  const ih = Math.max(0, maxV - minV);
                  const cx = bounds.width / 2;
                  const cy = bounds.height / 2;
                  const xLeftCenter = renderItem.position.x - cx;
                  const yBottomCenter = (bounds.height - (renderItem.position.y + ih)) - cy;
                  const transform = transformForMakerPath(
                    xLeftCenter,
                    yBottomCenter,
                    ih
                  );
                  const ops = useWorkspaceStore.getState().operations;
                  const op = ops.find((o) => o.id === renderItem.operationId || o.key === renderItem.operationId);
                  const stroke = op?.color ?? '#2bff00';
                  return (
                    <g key={renderItem.id}>
                      <DraggablePath
                        id={renderItem.id}
                        d={d}
                        transform={transform}
                        selected={isSelected}
                        setPathRef={setPathRef}
                        onClick={() => selectOnly(renderItem.id)}
                        stroke={stroke}
                      />
                    </g>
                  );
                }
                return null;
              })}

              {/* Debug click markers */}
              {debugClicks.map((click, i) => (
                <DebugMarker key={i} world={click.world} label={click.label} />
              ))}
            </g>
          </WorkspaceSvg>
        </DndContext>
        {/* Close workspace area container */}
        </Box>

      
      {/* Performance HUD accordion - positioned beneath workspace */}
      <Collapse in={showPerfHud}>
        <Box
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            marginTop: 8
          }}
        >
          <WorkspacePerfHud
            fps={fps}
            itemsCount={items.length}
            selectedCount={selectedIds.length}
            zoom={viewport.zoom}
            pan={viewport.pan}
            selectedItemJson={selectedItemJson}
            selectedSliceLayer={selectedSliceLayer}
            debugClicks={debugClicks}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
