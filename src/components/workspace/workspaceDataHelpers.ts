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
 * Uses the bounding rectangle from model metadata if available, falls back to extents
 */
export function calculateSliceLayerBounds(item: Extract<WorkspaceItem, { type: 'sliceLayer' }>): BoundingBox {
  // Check if we have bounding rectangle metadata from the model
  const model = item.layer.makerJsModel;
  const boundingRect = (model as any)?.meta?.boundingRect;
  
  if (boundingRect) {
    // Use the bounding rectangle for consistent selection handling
    return {
      minX: boundingRect.bounds.minX,
      minY: boundingRect.bounds.minY,
      maxX: boundingRect.bounds.maxX,
      maxY: boundingRect.bounds.maxY,
      width: boundingRect.width,
      height: boundingRect.height
    };
  }
  
  // Fallback to measuring extents if no bounding rectangle
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
  
  return {
    minX: minU,
    minY: minV,
    maxX: maxU,
    maxY: maxV,
    width: Math.max(0, maxU - minU),
    height: Math.max(0, maxV - minV)
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

type Vec2 = { x: number; y: number };
export function calculateBoundsFromPaths(paths: Array<Array<Vec2>>): BoundingBox {
  let bounds = initializeBounds();
  for (let i = 0; i < paths.length; i += 1) {
    const path = paths[i];
    if (path.length < 2) continue;
    
    for (let j = 0; j < path.length; j += 1) {
      const point = path[j];
      bounds.minX = Math.min(bounds.minX, point.x);
      bounds.minY = Math.min(bounds.minY, point.y);
      bounds.maxX = Math.max(bounds.maxX, point.x);
      bounds.maxY = Math.max(bounds.maxY, point.y);
    }
  }
  return bounds;
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
export function calculateRectangleRenderProps(
  item: Extract<WorkspaceItem, { type: 'rectangle' }>,
  activeId: string | null,
  dragPosMm: { x: number; y: number } | null,
  selectionOverlayOffsetPx: number,
  getMmPerPx: () => { x: number; y: number },
  rectPathData: (width: number, height: number) => string,
  transformForMakerPath: (x: number, y: number, height: number) => string,
  bounds: { width: number; height: number }
) {
  const d = rectPathData(item.rect.width, item.rect.height);
  const posX = activeId === item.id && dragPosMm ? dragPosMm.x : item.position.x;
  const posY = activeId === item.id && dragPosMm ? dragPosMm.y : item.position.y;
  
  // Expand selection overlay by a few screen pixels converted to mm for visibility
  const mmpp = getMmPerPx();
  const ox = selectionOverlayOffsetPx * mmpp.x;
  const oy = selectionOverlayOffsetPx * mmpp.y;
  const selW = item.rect.width + ox * 2;
  const selH = item.rect.height + oy * 2;
  // Convert to centered Y-up space: x' = x - cx; y' (bottom-left) = (H - (y + h)) - cy
  const cx = bounds.width / 2;
  const cy = bounds.height / 2;
  const xLeftCenter = (posX - ox) - cx;
  const yBottomCenter = (bounds.height - (posY + item.rect.height) - oy) - cy;
  const selX = xLeftCenter;
  const selY = yBottomCenter;
  
  const draggablePathProps = {
    id: item.id,
    d,
    // Place bottom-left at centered Y-up position
    transform: transformForMakerPath(xLeftCenter + ox, yBottomCenter + oy, item.rect.height),
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
export function calculateSliceLayerRenderProps(
  item: Extract<WorkspaceItem, { type: 'sliceLayer' }>,
  activeId: string | null,
  dragPosMm: { x: number; y: number } | null,
  selectionOverlayOffsetPx: number,
  getMmPerPx: () => { x: number; y: number },
  transformForMakerPath: (x: number, y: number, height: number) => string,
  bounds: { width: number; height: number }
) {
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
  const selW = width + ox * 2;
  const selH = height + oy * 2;
  const cx = bounds.width / 2;
  const cy = bounds.height / 2;
  const xLeftCenter = (posX - ox) - cx;
  const yBottomCenter = (bounds.height - (posY + height) - oy) - cy;
  const selX = xLeftCenter;
  const selY = yBottomCenter;
  
  // Use the same transform that works for rectangles
  // Place bottom-left at centered Y-up position
  const transformStr = transformForMakerPath(xLeftCenter + ox, yBottomCenter + oy, height);
  
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
