import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type {
  WorkspaceState,
  WorkspaceItem,
  Bounds,
  GridSettings,
  ViewportState,
  Units,
} from '@/types/workspace';

export type WorkspaceActions = {
  // items
  addRectangle: (params: { width: number; height: number; x?: number; y?: number }) => void;
  updateItemPosition: (id: string, x: number, y: number) => void;
  deleteItem: (id: string) => void;
  clearItems: () => void;

  // selection
  selectOnly: (id: string | null) => void;

  // viewport
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setUnits: (units: Units) => void;

  // grid/bounds
  setGrid: (grid: Partial<GridSettings>) => void;
  setBounds: (bounds: Bounds) => void;
};

export type WorkspaceStore = WorkspaceState & WorkspaceActions;

const DEFAULT_BOUNDS: Bounds = { width: 200, height: 200 }; // mm
const DEFAULT_GRID: GridSettings = { size: 5, snap: false, show: true };
const DEFAULT_VIEWPORT: ViewportState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
  units: 'mm',
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  bounds: DEFAULT_BOUNDS,
  grid: DEFAULT_GRID,
  viewport: DEFAULT_VIEWPORT,
  items: [],
  selection: { selectedIds: [] },

  addRectangle: ({ width, height, x = 0, y = 0 }) =>
    set((state) => {
      const item: WorkspaceItem = {
        id: nanoid(),
        type: 'rectangle',
        position: { x, y },
        zIndex: state.items.length,
        rect: { width, height },
      };
      return { items: [...state.items, item] };
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

  setGrid: (grid) => set((state) => ({ grid: { ...state.grid, ...grid } })),
  setBounds: (bounds) => set(() => ({ bounds })),
}));
