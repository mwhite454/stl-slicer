import { create } from 'zustand';
import makerjs from 'makerjs';
import { nanoid } from 'nanoid';
import type {
  WorkspaceState,
  WorkspaceItem,
  Bounds,
  GridSettings,
  ViewportState,
  Units,
  UiSettings,
  SliceLayerParams,
  LaserOperation
} from '@/types/workspace';
import type { MakerJSModel } from '@/lib/coords';

export type WorkspaceActions = {
  // items
  addRectangle: (params: { width: number; height: number; x?: number; y?: number }) => void;
  addManyRectangles: (params: { count: number; width: number; height: number; margin?: number }) => void;
  updateItemPosition: (id: string, x: number, y: number) => void;
  assignOperation: (id: string, operationId: string | null) => void;
  deleteItem: (id: string) => void;
  clearItems: () => void;

  // slice layer actions
  addSliceLayer: (params: {
    makerJsModel: MakerJSModel;
    layerIndex: number;
    zCoordinate: number;
    axis: 'x' | 'y' | 'z';
    layerThickness: number;
    plane?: 'XY' | 'XZ' | 'YZ';
    axisMap?: { u: 'x' | 'y' | 'z'; v: 'x' | 'y' | 'z' };
    vUpSign?: 1 | -1;
    uvExtents?: { minU: number; minV: number; maxU: number; maxV: number };
    x?: number;
    y?: number;
    z?: number;
  }) => void;
  
  addMultipleSliceLayers: (layers: Array<{
    makerJsModel: MakerJSModel;
    layerIndex: number;
    zCoordinate: number;
    axis: 'x' | 'y' | 'z';
    layerThickness: number;
    plane?: 'XY' | 'XZ' | 'YZ';
    axisMap?: { u: 'x' | 'y' | 'z'; v: 'x' | 'y' | 'z' };
    vUpSign?: 1 | -1;
    uvExtents?: { minU: number; minV: number; maxU: number; maxV: number };
    x?: number;
    y?: number;
    z?: number;
  }>) => void;
  
  updateSliceLayer: (id: string, updates: Partial<SliceLayerParams>) => void;

  // selection
  selectOnly: (id: string | null) => void;

  // viewport
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setUnits: (units: Units) => void;
  setUi: (ui: Partial<UiSettings>) => void;

  // grid/bounds
  setGrid: (grid: Partial<GridSettings>) => void;
  setBounds: (bounds: Bounds) => void;
  setBedSize: (bounds: Bounds) => void; // convenience to update both ui.bedSizeMm and bounds

  // operations
  addOperation: (op: Omit<LaserOperation, 'id' | 'isMeta'> & { id?: string; isMeta?: boolean }) => void;
  updateOperation: (id: string, updates: Partial<Omit<LaserOperation, 'id' | 'isMeta'>>) => void;
  removeOperation: (id: string) => void; // cannot remove meta
  
  // meta models
  upsertMetaGrid: (model: MakerJSModel) => void;
  upsertMetaWorkspace: (model: MakerJSModel) => void;
  removeMetaByType: (metaType: 'grid' | 'workspace') => void;
};

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

const DEFAULT_BOUNDS: Bounds = { width: 482, height: 279 }; // mm
const DEFAULT_GRID: GridSettings = { size: 5, snap: false, show: true };
const DEFAULT_VIEWPORT: ViewportState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
  units: 'mm',
};
const DEFAULT_UI: UiSettings = {
  dragActivationDistance: 1,
  selectionOverlayOffsetPx: 2,
  panSpeedMultiplier: 1,
  zoomSpeedMultiplier: 1,
  nudgeDistanceMm: 1,
  bedSizeMm: DEFAULT_BOUNDS,
  showPerfHud: false,
  fitToBoundsRequestId: 0,
};

// TODO(workspace-chrome): Consider adding UI settings to toggle/show workspace chrome features
// such as rulers, background fill, origin marker visibility, and printable/safe-area overlays.
// These flags can be read in WorkspaceStage to parameterize generateMakerWorkspaceModel.

// Seed an initial Mantine-like operation palette
const DEFAULT_OPERATIONS: LaserOperation[] = [
  { id: 'op-meta', key: 'meta', label: 'Meta', color: '#868e96', isMeta: true }, // gray[6]
  { id: 'op-cut', key: 'cut', label: 'Cut', color: '#fa5252' }, // red[6]
  { id: 'op-engrave', key: 'engrave', label: 'Engrave', color: '#228be6' }, // blue[6]
  { id: 'op-score', key: 'score', label: 'Score', color: '#7048e8' }, // violet/grape[6]
];

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  bounds: DEFAULT_UI.bedSizeMm,
  grid: DEFAULT_GRID,
  viewport: DEFAULT_VIEWPORT,
  ui: DEFAULT_UI,
  operations: DEFAULT_OPERATIONS,
  items: [],
  selection: { selectedIds: [] },

  addRectangle: ({ width, height, x = 20, y = 10 }) =>
    set((state) => {
      const item: WorkspaceItem = {
        id: nanoid(),
        type: 'rectangle',
        position: { x, y, z: 0 },
        zIndex: state.items.length,
        operationId: null,
        rect: { width, height },
      };
      return { items: [...state.items, item] };
    }),

  addManyRectangles: ({ count, width, height, margin = 1 }) =>
    set((state) => {
      const items: WorkspaceItem[] = [...state.items];
      const bounds = state.bounds;
      const stepX = width + margin;
      const stepY = height + margin;
      const cols = Math.max(1, Math.floor(bounds.width / stepX));
      let x = 0;
      let y = 0;
      for (let i = 0; i < count; i += 1) {
        const id = nanoid();
        items.push({
          id,
          type: 'rectangle',
          position: { x, y },
          zIndex: items.length,
          rect: { width, height },
        });
        // advance grid position
        const col = (i + 1) % cols;
        if (col === 0) {
          x = 0;
          y += stepY;
          if (y + height > bounds.height) y = 0; // wrap vertically if overflow
        } else {
          x += stepX;
          if (x + width > bounds.width) {
            x = 0;
            y += stepY;
            if (y + height > bounds.height) y = 0;
          }
        }
      }
      return { items };
    }),

  updateItemPosition: (id, x, y) =>
    set((state) => ({
      items: state.items.map((it) => (it.id === id ? { ...it, position: { x, y } } : it)),
    })),

  assignOperation: (id, operationId) =>
    set((state) => ({
      items: state.items.map((it) => (it.id === id ? { ...it, operationId } : it)),
    })),

  deleteItem: (id) => set((state) => ({ items: state.items.filter((it) => it.id !== id) })),
  clearItems: () => set({ items: [], selection: { selectedIds: [] } }),

  selectOnly: (id) =>
    set(() => ({ selection: { selectedIds: id ? [id] : [] } })),

  setZoom: (zoom) => set((state) => ({ viewport: { ...state.viewport, zoom } })),
  setPan: (pan) => set((state) => ({ viewport: { ...state.viewport, pan } })),
  setUnits: (units) => set((state) => ({ viewport: { ...state.viewport, units } })),
  setUi: (ui) => set((state) => ({ ui: { ...state.ui, ...ui } })),

  setGrid: (grid) => set((state) => ({ grid: { ...state.grid, ...grid } })),
  setBounds: (bounds) => set((state) => ({ bounds, ui: { ...state.ui, bedSizeMm: bounds } })),
  setBedSize: (bounds) => set((state) => ({ ui: { ...state.ui, bedSizeMm: bounds }, bounds })),
  
  // Slice layer actions
  addSliceLayer: ({ 
    makerJsModel, 
    layerIndex, 
    zCoordinate, 
    axis, 
    layerThickness,
    plane,
    axisMap,
    vUpSign,
    uvExtents,
    x, 
    y,
    z = zCoordinate
  }) =>
    set((state) => {
      // Determine extents and center position if not provided
      let w = 0;
      let h = 0;
      if (uvExtents) {
        w = Math.max(0, uvExtents.maxU - uvExtents.minU);
        h = Math.max(0, uvExtents.maxV - uvExtents.minV);
      } else {
        const ext = makerjs.measure.modelExtents(makerJsModel as any);
        if (ext) {
          w = Math.max(0, ext.high[0] - ext.low[0]);
          h = Math.max(0, ext.high[1] - ext.low[1]);
        }
      }
      const cx = Math.max(0, (state.bounds.width - w) / 2);
      const cy = Math.max(0, (state.bounds.height - h) / 2);
      const px = x ?? cx;
      const py = y ?? cy;
      const item: WorkspaceItem = {
        id: nanoid(),
        type: 'sliceLayer',
        position: { x: px, y: py, z },
        zIndex: state.items.length,
        operationId: null,
        layer: {
          makerJsModel,
          layerIndex,
          zCoordinate,
          axis,
          layerThickness,
          plane,
          axisMap,
          vUpSign,
          uvExtents
        }
      };
      return { items: [...state.items, item] };
    }),
    
  addMultipleSliceLayers: (layers) =>
    set((state) => {
      const items: WorkspaceItem[] = [...state.items];
      layers.forEach((layerData, index) => {
        // Compute extents for centering if no x/y provided
        let w = 0;
        let h = 0;
        if (layerData.uvExtents) {
          w = Math.max(0, layerData.uvExtents.maxU - layerData.uvExtents.minU);
          h = Math.max(0, layerData.uvExtents.maxV - layerData.uvExtents.minV);
        } else {
          const ext = makerjs.measure.modelExtents(layerData.makerJsModel as any);
          if (ext) {
            w = Math.max(0, ext.high[0] - ext.low[0]);
            h = Math.max(0, ext.high[1] - ext.low[1]);
          }
        }
        const cx = Math.max(0, (state.bounds.width - w) / 2);
        const cy = Math.max(0, (state.bounds.height - h) / 2);
        const px = layerData.x ?? cx;
        const py = layerData.y ?? cy;
        const item: WorkspaceItem = {
          id: nanoid(),
          type: 'sliceLayer',
          position: { 
            x: px, 
            y: py, 
            z: layerData.z || layerData.zCoordinate 
          },
          zIndex: items.length + index,
          operationId: null,
          layer: {
            makerJsModel: layerData.makerJsModel,
            layerIndex: layerData.layerIndex,
            zCoordinate: layerData.zCoordinate,
            axis: layerData.axis,
            layerThickness: layerData.layerThickness,
            plane: layerData.plane,
            axisMap: layerData.axisMap,
            vUpSign: layerData.vUpSign,
            uvExtents: layerData.uvExtents
          }
        };
        items.push(item);
      });
      return { items };
    }),
    
  updateSliceLayer: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id === id && item.type === 'sliceLayer') {
          return {
            ...item,
            layer: { ...item.layer, ...updates }
          };
        }
        return item;
      })
    })),

  // operations
  addOperation: (op) =>
    set((state) => {
      // prevent duplicate key
      if (state.operations.some((o) => o.key === op.key)) return {} as any;
      const id = op.id ?? nanoid();
      const isMeta = op.isMeta ?? false;
      const next: LaserOperation = { id, key: op.key, label: op.label, color: op.color, isMeta };
      return { operations: [...state.operations, next] };
    }),
  updateOperation: (id, updates) =>
    set((state) => ({
      operations: state.operations.map((o) => (o.id === id || o.key === id ? { ...o, ...updates } : o)),
    })),
  removeOperation: (id) =>
    set((state) => {
      const op = state.operations.find((o) => o.id === id || o.key === id);
      if (!op) return {} as any;
      if (op.isMeta) return {} as any; // disallow removing meta
      const remaining = state.operations.filter((o) => o !== op);
      // Clear operationId on items referencing removed op
      const items = state.items.map((it) => (it.operationId === op.id || it.operationId === op.key ? { ...it, operationId: null } : it));
      return { operations: remaining, items };
    }),

  // Meta models
  upsertMetaGrid: (model) =>
    set((state) => {
      const metaId = 'meta-grid';
      const existingIdx = state.items.findIndex((it) => it.type === 'metaModel' && it.metaType === 'grid');
      const opMeta = state.operations.find((o) => o.key === 'meta' || o.id === 'op-meta');
      const metaItem = {
        id: metaId,
        type: 'metaModel' as const,
        position: { x: 0, y: 0, z: 0 },
        zIndex: -1000, // force behind others
        locked: true,
        operationId: opMeta ? (opMeta.id ?? opMeta.key) : null,
        metaType: 'grid' as const,
        makerJsModel: model,
      };
      if (existingIdx >= 0) {
        const items = [...state.items];
        items[existingIdx] = { ...metaItem };
        return { items };
      }
      return { items: [metaItem, ...state.items] };
    }),
  // TODO(workspace-chrome): Parameterize the workspace meta model generation with UI settings
  // (e.g., enable rulers, margins), and re-upsert here when those settings change.
  upsertMetaWorkspace: (model) =>
    set((state) => {
      const metaId = 'meta-workspace';
      const existingIdx = state.items.findIndex((it) => it.type === 'metaModel' && it.metaType === 'workspace');
      const opMeta = state.operations.find((o) => o.key === 'meta' || o.id === 'op-meta');
      const metaItem = {
        id: metaId,
        type: 'metaModel' as const,
        position: { x: 0, y: 0, z: 0 },
        zIndex: -2000,
        locked: true,
        operationId: opMeta ? (opMeta.id ?? opMeta.key) : null,
        metaType: 'workspace' as const,
        makerJsModel: model,
      };
      if (existingIdx >= 0) {
        const items = [...state.items];
        items[existingIdx] = { ...metaItem };
        return { items };
      }
      return { items: [metaItem, ...state.items] };
    }),
  removeMetaByType: (metaType) =>
    set((state) => ({ items: state.items.filter((it) => !(it.type === 'metaModel' && it.metaType === metaType)) })),
}));
