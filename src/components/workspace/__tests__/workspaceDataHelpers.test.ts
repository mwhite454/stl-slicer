import {
  initializeBounds,
  updateBounds,
  applyMarginToBounds,
  calculateFitZoom,
  calculateCenterPan,
  calculateRectangleBounds,
  calculateSliceLayerBounds,
  calculateMetaModelBounds,
  calculateBoundsFromPaths,
  calculateRectangleRenderProps,
  calculateSliceLayerRenderProps,
  calculateSliceLayerDebugAltProps,
} from '../workspaceDataHelpers';

import type { WorkspaceItem } from '@/types/workspace';

// Minimal makerjs mock for extents queries used by helpers
jest.mock('makerjs', () => {
  const measure = { modelExtents: jest.fn() };
  const exporter = { toSVGPathData: jest.fn(() => '') };
  return {
    __esModule: true,
    default: { measure, exporter },
    measure,
    exporter,
  };
});

const makerjs = require('makerjs');

describe('workspaceDataHelpers (pure logic)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('initializeBounds and updateBounds combine correctly', () => {
    let b = initializeBounds();
    b = updateBounds(b, { minX: 0, minY: 0, maxX: 10, maxY: 5, width: 10, height: 5 });
    b = updateBounds(b, { minX: -2, minY: 1, maxX: 4, maxY: 7, width: 6, height: 6 });
    expect(b).toEqual({ minX: -2, minY: 0, maxX: 10, maxY: 7, width: 12, height: 7 });
  });

  test('applyMarginToBounds expands all sides', () => {
    const b = { minX: 0, minY: 0, maxX: 10, maxY: 20, width: 10, height: 20 };
    const m = applyMarginToBounds(b, 2);
    expect(m).toEqual({ minX: -2, minY: -2, maxX: 12, maxY: 22, width: 14, height: 24 });
  });

  test('calculateFitZoom chooses min scale and clamps', () => {
    // bounds 100x50 in a 200x200 container => scaleX=2, scaleY=4 => zoom=2
    const z1 = calculateFitZoom({ minX: 0, minY: 0, maxX: 100, maxY: 50, width: 100, height: 50 }, 200, 200, 0.1, 10);
    expect(z1).toBeCloseTo(2);

    // clamp to max
    const z2 = calculateFitZoom({ minX: 0, minY: 0, maxX: 1000, maxY: 1000, width: 1000, height: 1000 }, 100, 100, 0.1, 1.5);
    expect(z2).toBeCloseTo(0.1, 5);
  });

  test('calculateCenterPan centers bounds in container', () => {
    // bounds at (10,20) with size 100x50, container 300x300, zoom 2
    const pan = calculateCenterPan({ minX: 10, minY: 20, maxX: 110, maxY: 70, width: 100, height: 50 }, 300, 300, 2);
    // panX = (300 - 100*2)/2 - 10*2 = 50 - 20 = 30
    // panY = (300 - 50*2)/2 - 20*2 = 100 - 40 = 60
    expect(pan.x).toBeCloseTo(30);
    expect(pan.y).toBeCloseTo(60);
  });

  test('calculateRectangleBounds returns correct box from item', () => {
    const rect: Extract<WorkspaceItem, { type: 'rectangle' }> = {
      id: 'r1',
      type: 'rectangle',
      position: { x: 5, y: 6 },
      zIndex: 1,
      rect: { width: 10, height: 20 },
    } as any;
    const b = calculateRectangleBounds(rect);
    expect(b).toEqual({ minX: 5, minY: 6, maxX: 15, maxY: 26, width: 10, height: 20 });
  });

  test('calculateSliceLayerBounds uses meta.boundingRect when available', () => {
    const model = {
      meta: {
        boundingRect: {
          width: 8,
          height: 4,
          bounds: { minX: 1, minY: 2, maxX: 9, maxY: 6 },
        },
      },
    };
    const item: Extract<WorkspaceItem, { type: 'sliceLayer' }> = {
      id: 's1',
      type: 'sliceLayer',
      position: { x: 0, y: 0 },
      zIndex: 1,
      layer: {
        makerJsModel: model as any,
        layerIndex: 0,
        zCoordinate: 0,
        axis: 'z',
        layerThickness: 1,
      },
    } as any;

    const b = calculateSliceLayerBounds(item);
    expect(b).toEqual({ minX: 1, minY: 2, maxX: 9, maxY: 6, width: 8, height: 4 });
  });

  test('calculateSliceLayerBounds falls back to extents and respects uv metadata', () => {
    (makerjs.measure.modelExtents as jest.Mock).mockReturnValue({ low: [1, 2], high: [11, 22] });

    const item: Extract<WorkspaceItem, { type: 'sliceLayer' }> = {
      id: 's2',
      type: 'sliceLayer',
      position: { x: 0, y: 0 },
      zIndex: 1,
      layer: {
        makerJsModel: {} as any,
        layerIndex: 0,
        zCoordinate: 0,
        axis: 'z',
        layerThickness: 1,
        plane: 'XY',
        uvExtents: { minU: 0, minV: 5, maxU: 20, maxV: 25 },
      },
    } as any;

    const b = calculateSliceLayerBounds(item);
    expect(b).toEqual({ minX: 0, minY: 5, maxX: 20, maxY: 25, width: 20, height: 20 });

    // When plane mapping disabled, use raw extents
    const b2 = calculateSliceLayerBounds(item, { disablePlaneMapping: true });
    expect(b2).toEqual({ minX: 1, minY: 2, maxX: 11, maxY: 22, width: 10, height: 20 });
  });

  test('calculateMetaModelBounds reads extents directly', () => {
    (makerjs.measure.modelExtents as jest.Mock).mockReturnValue({ low: [-5, -2], high: [7, 3] });
    const metaItem = { id: 'm1', type: 'metaModel', makerJsModel: {} } as any;
    const b = calculateMetaModelBounds(metaItem);
    expect(b).toEqual({ minX: -5, minY: -2, maxX: 7, maxY: 3, width: 12, height: 5 });
  });

  test('calculateBoundsFromPaths computes min/max over all points', () => {
    const paths = [
      [ { x: 0, y: 0 }, { x: 2, y: 3 } ],
      [ { x: -4, y: 1 }, { x: 5, y: -2 } ],
    ];
    const b = calculateBoundsFromPaths(paths as any);
    expect(b).toEqual({ minX: -4, minY: -2, maxX: 5, maxY: 3, width: 9, height: 5 });
  });

  test('calculateRectangleRenderProps calls transform once and returns selection wrapper with offsets', () => {
    const item: Extract<WorkspaceItem, { type: 'rectangle' }> = {
      id: 'r2',
      type: 'rectangle',
      position: { x: 10, y: 20 },
      zIndex: 0,
      rect: { width: 40, height: 30 },
    } as any;
    const getMmPerPx = () => ({ x: 1, y: 1 });
    const rectPathData = (w: number, h: number) => `M0 0 L${w} 0 L${w} ${h} L0 ${h} Z`;
    const transformForMakerPath = jest.fn(() => 'translate(0 0)');
    const bounds = { width: 200, height: 100 };

    const res = calculateRectangleRenderProps(
      item,
      null,
      null,
      6,
      getMmPerPx,
      rectPathData,
      transformForMakerPath,
      bounds
    );

    // Compute expected transform args
    const cx = bounds.width / 2; // 100
    const cy = bounds.height / 2; // 50
    const ox = 6 * 1; // mm per px
    const oy = 6 * 1;
    const xLeftCenter = (item.position.x - ox + item.rect.width / 2) - cx; // (10-6+20)-100 = -76
    const yBottomCenter = (bounds.height - (item.position.y + item.rect.height) - oy + item.rect.height / 2) - cy; // (100-(20+30)-6+15)-50 = 9
    expect(transformForMakerPath).toHaveBeenCalledTimes(1);
    expect(transformForMakerPath).toHaveBeenCalledWith(xLeftCenter + ox, yBottomCenter + oy, 30);
    // Selection wrapper expanded by offsets
    expect(res.selectionWrapperProps).toEqual({ x: xLeftCenter, y: yBottomCenter, width: 40 + 12, height: 30 + 12 });
  });

  test('calculateSliceLayerRenderProps uses exporter once and transform once with plane-aware extents', () => {
    // Extents and exporter
    (makerjs.measure.modelExtents as jest.Mock).mockReturnValue({ low: [1, 2], high: [21, 27] });
    (makerjs.exporter.toSVGPathData as jest.Mock).mockReturnValue('M0 0');
    const transformForMakerPath = jest.fn(() => 't');
    const getMmPerPx = () => ({ x: 1, y: 1 });

    const item: Extract<WorkspaceItem, { type: 'sliceLayer' }> = {
      id: 's3',
      type: 'sliceLayer',
      position: { x: 50, y: 10 },
      zIndex: 0,
      layer: {
        makerJsModel: {} as any,
        layerIndex: 0,
        zCoordinate: 0,
        axis: 'z',
        layerThickness: 1,
        plane: 'XY',
        uvExtents: { minU: 1, minV: 2, maxU: 21, maxV: 27 }, // width=20, height=25
      },
    } as any;

    const bounds = { width: 200, height: 100 };
    const res = calculateSliceLayerRenderProps(
      item,
      null,
      null,
      6,
      getMmPerPx,
      transformForMakerPath,
      bounds
    ) as any;

    // Expected values
    const width = 20;
    const height = 25;
    const cx = bounds.width / 2; // 100
    const cy = bounds.height / 2; // 50
    const ox = 6; // mm per px
    const oy = 6;
    const xLeftCenter = (item.position.x - ox) - cx; // 50-6-100 = -56
    const yBottomCenter = (bounds.height - (item.position.y + height) - oy) - cy; // 100-(10+25)-6-50 = 9

    expect(makerjs.exporter.toSVGPathData).toHaveBeenCalledTimes(1);
    expect(transformForMakerPath).toHaveBeenCalledTimes(1);
    expect(transformForMakerPath).toHaveBeenCalledWith(xLeftCenter, yBottomCenter, height);

    // Selection wrapper should include offsets
    expect(res.selectionWrapperProps).toEqual({ x: xLeftCenter, y: yBottomCenter, width: width + 12, height: height + 12 });
    expect(res.width).toBe(width);
    expect(res.height).toBe(height);
  });

  test('calculateSliceLayerRenderProps returns null when extents missing', () => {
    (makerjs.measure.modelExtents as jest.Mock).mockReturnValue(null);
    const item: Extract<WorkspaceItem, { type: 'sliceLayer' }> = {
      id: 's4', type: 'sliceLayer', position: { x: 0, y: 0 }, zIndex: 0,
      layer: { makerJsModel: {} as any, layerIndex: 0, zCoordinate: 0, axis: 'z', layerThickness: 1 },
    } as any;
    const res = calculateSliceLayerRenderProps(
      item,
      null,
      null,
      6,
      () => ({ x: 1, y: 1 }),
      jest.fn(),
      { width: 100, height: 100 }
    );
    expect(res).toBeNull();
  });

  test('calculateSliceLayerBounds returns empty Infinite box when extents missing', () => {
    (makerjs.measure.modelExtents as jest.Mock).mockReturnValue(null);
    const item: Extract<WorkspaceItem, { type: 'sliceLayer' }> = {
      id: 's5', type: 'sliceLayer', position: { x: 0, y: 0 }, zIndex: 0,
      layer: { makerJsModel: {} as any, layerIndex: 0, zCoordinate: 0, axis: 'z', layerThickness: 1 },
    } as any;
    const b = calculateSliceLayerBounds(item);
    expect(b).toEqual({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, width: 0, height: 0 });
  });

  test('calculateMetaModelBounds returns empty Infinite box when extents missing', () => {
    (makerjs.measure.modelExtents as jest.Mock).mockReturnValue(null);
    const metaItem = { id: 'm2', type: 'metaModel', makerJsModel: {} } as any;
    const b = calculateMetaModelBounds(metaItem as any);
    expect(b).toEqual({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, width: 0, height: 0 });
  });

  test('calculateBoundsFromPaths returns initializeBounds when no valid points', () => {
    const b = calculateBoundsFromPaths([[], [{ x: 1, y: 2 }]] as any);
    expect(b).toEqual({ minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, width: 0, height: 0 });
  });

  test('calculateSliceLayerDebugAltProps produces d and transform with exporter once and transform once', () => {
    (makerjs.measure.modelExtents as jest.Mock).mockReturnValue({ low: [2, 3], high: [12, 18] });
    (makerjs.exporter.toSVGPathData as jest.Mock).mockReturnValue('M0 0 L1 1');
    const transformForMakerPath = jest.fn(() => 'translate(1 2)');
    const getMmPerPx = () => ({ x: 1, y: 1 });

    const item: Extract<WorkspaceItem, { type: 'sliceLayer' }> = {
      id: 's6', type: 'sliceLayer', position: { x: 30, y: 40 }, zIndex: 0,
      layer: { makerJsModel: {} as any, layerIndex: 0, zCoordinate: 0, axis: 'z', layerThickness: 1 },
    } as any;

    const res = calculateSliceLayerDebugAltProps(item as any, {
      bounds: { width: 200, height: 100 },
      posX: 30,
      posY: 40,
      selectionOverlayOffsetPx: 6,
      getMmPerPx,
      transformForMakerPath,
    } as any)!;

    expect(makerjs.exporter.toSVGPathData).toHaveBeenCalledTimes(1);
    expect(transformForMakerPath).toHaveBeenCalledTimes(1);
    expect(typeof res.d).toBe('string');
    expect(typeof res.transform).toBe('string');
  });
});
