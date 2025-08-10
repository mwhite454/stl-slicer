import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  WorkspaceState,
  WorkspaceItem,
  Bounds,
  GridSettings,
  ViewportState,
  Units,
  UiSettings,
  SliceLayerParams
} from '@/types/workspace';
import type { MakerJSModel } from '@/lib/coords';

export type WorkspaceActions = {
  // items
  addRectangle: (params: { width: number; height: number; x?: number; y?: number }) => void;
  addManyRectangles: (params: { count: number; width: number; height: number; margin?: number }) => void;
  updateItemPosition: (id: string, x: number, y: number) => void;
  deleteItem: (id: string) => void;
  clearItems: () => void;

  // slice layer actions
  addSliceLayer: (params: {
    makerJsModel: MakerJSModel;
    layerIndex: number;
    zCoordinate: number;
    axis: 'x' | 'y' | 'z';
    layerThickness: number;
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

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  bounds: DEFAULT_UI.bedSizeMm,
  grid: DEFAULT_GRID,
  viewport: DEFAULT_VIEWPORT,
  ui: DEFAULT_UI,
  items: [],
  selection: { selectedIds: [] },

  addRectangle: ({ width, height, x = 0, y = 0 }) =>
    set((state) => {
      const item: WorkspaceItem = {
        id: nanoid(),
        type: 'rectangle',
        position: { x, y, z: 0 },
        zIndex: state.items.length,
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
    x = 0, 
    y = 0,
    z = zCoordinate
  }) =>
    set((state) => {
      const item: WorkspaceItem = {
        id: nanoid(),
        type: 'sliceLayer',
        position: { x, y, z },
        zIndex: state.items.length,
        layer: {
          makerJsModel,
          layerIndex,
          zCoordinate,
          axis,
          layerThickness
        }
      };
      return { items: [...state.items, item] };
    }),
    
  addMultipleSliceLayers: (layers) =>
    set((state) => {
      const items: WorkspaceItem[] = [...state.items];
      layers.forEach((layerData, index) => {
        const item: WorkspaceItem = {
          id: nanoid(),
          type: 'sliceLayer',
          position: { 
            x: layerData.x || 0, 
            y: layerData.y || 0, 
            z: layerData.z || layerData.zCoordinate 
          },
          zIndex: items.length + index,
          layer: {
            makerJsModel: layerData.makerJsModel,
            layerIndex: layerData.layerIndex,
            zCoordinate: layerData.zCoordinate,
            axis: layerData.axis,
            layerThickness: layerData.layerThickness
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
    }))
}));
