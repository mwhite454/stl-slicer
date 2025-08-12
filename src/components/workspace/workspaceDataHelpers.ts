import type { WorkspaceItem } from '@/types/workspace';
import makerjs from 'makerjs';

interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

/**
 * Calculates the bounding box for a rectangle workspace item
 */
export function calculateRectangleBounds(item: Extract<WorkspaceItem, { type: 'rectangle' }>): BoundingBox {
  const x1 = item.position.x;
  const y1 = item.position.y;
  const x2 = item.position.x + item.rect.width;
  const y2 = item.position.y + item.rect.height;
  
  return {
    minX: x1,
    minY: y1,
    maxX: x2,
    maxY: y2,
    width: item.rect.width,
    height: item.rect.height
  };
}

/**
 * Calculates the bounding box for a slice layer workspace item
 */
export function calculateSliceLayerBounds(item: Extract<WorkspaceItem, { type: 'sliceLayer' }>): BoundingBox {
  const extRaw = makerjs.measure.modelExtents(item.layer.makerJsModel);
  if (!extRaw) {
    return {
      minX: Infinity,
      minY: Infinity,
      maxX: -Infinity,
      maxY: -Infinity,
      width: 0,
      height: 0
    };
  }
  
  const planeAware = Boolean(item.layer.plane);
  const metaExt = item.layer.uvExtents;
  const minU = planeAware ? (metaExt?.minU ?? extRaw.low[0]) : extRaw.low[0];
  const minV = planeAware ? (metaExt?.minV ?? extRaw.low[1]) : extRaw.low[1];
  const maxU = planeAware ? (metaExt?.maxU ?? extRaw.high[0]) : extRaw.high[0];
  const maxV = planeAware ? (metaExt?.maxV ?? extRaw.high[1]) : extRaw.high[1];
  const w = Math.max(0, maxU - minU);
  const h = Math.max(0, maxV - minV);
  const x1 = item.position.x;
  const y1 = item.position.y;
  const x2 = x1 + w;
  const y2 = y1 + h;
  
  return {
    minX: x1,
    minY: y1,
    maxX: x2,
    maxY: y2,
    width: w,
    height: h
  };
}

/**
 * Updates the overall bounding box with a new item's bounds
 */
export function updateBounds(current: BoundingBox, newItem: BoundingBox): BoundingBox {
  const minX = Math.min(current.minX, newItem.minX);
  const minY = Math.min(current.minY, newItem.minY);
  const maxX = Math.max(current.maxX, newItem.maxX);
  const maxY = Math.max(current.maxY, newItem.maxY);
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY)
  };
}

/**
 * Initializes a bounding box with infinite values for expansion
 */
export function initializeBounds(): BoundingBox {
  return {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    width: 0,
    height: 0
  };
}

/**
 * Applies margin to a bounding box
 */
export function applyMarginToBounds(bounds: BoundingBox, margin: number): BoundingBox {
  return {
    minX: bounds.minX - margin,
    minY: bounds.minY - margin,
    maxX: bounds.maxX + margin,
    maxY: bounds.maxY + margin,
    width: bounds.width + 2 * margin,
    height: bounds.height + 2 * margin
  };
}

/**
 * Calculates the fit-to-bounds zoom level
 */
export function calculateFitZoom(bounds: BoundingBox, containerWidth: number, containerHeight: number, minZoom: number, maxZoom: number): number {
  const scaleX = containerWidth / bounds.width;
  const scaleY = containerHeight / bounds.height;
  return Math.min(maxZoom, Math.max(minZoom, Math.min(scaleX, scaleY)));
}

/**
 * Calculates the pan position to center the bounds in the container
 */
export function calculateCenterPan(bounds: BoundingBox, containerWidth: number, containerHeight: number, zoom: number): { x: number; y: number } {
  const panX = (containerWidth - bounds.width * zoom) / 2 - bounds.minX * zoom;
  const panY = (containerHeight - bounds.height * zoom) / 2 - bounds.minY * zoom;
  return { x: panX, y: panY };
}

/**
 * Calculates rendering properties for a rectangle workspace item
 */
export function calculateRectangleRenderProps(item: Extract<WorkspaceItem, { type: 'rectangle' }>, activeId: string | null, dragPosMm: { x: number; y: number } | null, selectionOverlayOffsetPx: number, getMmPerPx: () => { x: number; y: number }, rectPathData: (width: number, height: number) => string, transformForMakerPath: (x: number, y: number, height: number) => string) {
  const d = rectPathData(item.rect.width, item.rect.height);
  const posX = activeId === item.id && dragPosMm ? dragPosMm.x : item.position.x;
  const posY = activeId === item.id && dragPosMm ? dragPosMm.y : item.position.y;
  
  // Expand selection overlay by a few screen pixels converted to mm for visibility
  const mmpp = getMmPerPx();
  const ox = selectionOverlayOffsetPx * mmpp.x;
  const oy = selectionOverlayOffsetPx * mmpp.y;
  const selX = posX - ox;
  const selY = posY - oy;
  const selW = item.rect.width + ox * 2;
  const selH = item.rect.height + oy * 2;
  
  const draggablePathProps = {
    id: item.id,
    d,
    transform: transformForMakerPath(posX, posY, item.rect.height * -1),
    selected: false, // This will be set by the caller
    setPathRef: undefined as any, // This will be set by the caller
    onClick: () => {} // This will be set by the caller
  };
  
  const selectionWrapperProps = {
    x: selX,
    y: selY,
    width: selW,
    height: selH
  };
  
  return {
    draggablePathProps,
    selectionWrapperProps,
    posX,
    posY
  };
}

/**
 * Calculates rendering properties for a slice layer workspace item
 */
export function calculateSliceLayerRenderProps(item: Extract<WorkspaceItem, { type: 'sliceLayer' }>, activeId: string | null, dragPosMm: { x: number; y: number } | null, selectionOverlayOffsetPx: number, getMmPerPx: () => { x: number; y: number }, transformForMakerPath: (x: number, y: number, height: number) => string) {
  const posX = activeId === item.id && dragPosMm ? dragPosMm.x : item.position.x;
  const posY = activeId === item.id && dragPosMm ? dragPosMm.y : item.position.y;
  
  const extRaw = makerjs.measure.modelExtents(item.layer.makerJsModel);
  if (!extRaw) {
    return null;
  }
  
  const metaExt = item.layer.uvExtents;
  const minU = metaExt?.minU ?? extRaw.low[0];
  const minV = metaExt?.minV ?? extRaw.low[1];
  const maxU = metaExt?.maxU ?? extRaw.high[0];
  const maxV = metaExt?.maxV ?? extRaw.high[1];
  const width = Math.max(0, maxU - minU);
  const height = Math.max(0, maxV - minV);
  
  // Use the same origin shift as before to normalize coordinates
  const origin: [number, number] = [-minU, -maxV];
  const d = makerjs.exporter.toSVGPathData(item.layer.makerJsModel, { origin } as any) as unknown as string;
  
  // Use SelectionWrapper with world-space coordinates
  const mmpp = getMmPerPx();
  const ox = selectionOverlayOffsetPx * mmpp.x;
  const oy = selectionOverlayOffsetPx * mmpp.y;
  
  // The transformForMakerPath adds height, but with origin [-minU, -maxV],
  // the visual geometry ends up at approximately posY - height
  // So we need to position the selection overlay there too
  const selX = posX - ox;
  const selY = posY - height - oy;  // Match where geometry visually appears
  const selW = width + ox * 2;
  const selH = height + oy * 2;
  
  // Use the same transform that works for rectangles
  const transformStr = transformForMakerPath(posX, posY, height);
  
  const draggablePathProps = {
    id: item.id,
    d,
    transform: transformStr,
    selected: false, // This will be set by the caller
    setPathRef: undefined as any, // This will be set by the caller
    onClick: () => {} // This will be set by the caller
  };
  
  const selectionWrapperProps = {
    x: selX,
    y: selY,
    width: selW,
    height: selH
  };
  
  return {
    draggablePathProps,
    selectionWrapperProps,
    posX,
    posY,
    width,
    height
  };
}
