export type Units = 'mm' | 'in';

export type Bounds = {
  width: number; // in mm
  height: number; // in mm
};

export type GridSettings = {
  size: number; // grid step in mm
  snap: boolean;
  show: boolean;
};

export type ViewportState = {
  zoom: number; // 1 = 100%
  pan: { x: number; y: number }; // in mm, applied to the stage group
  units: Units; // display units; internal math remains mm
};

export type RectangleParams = {
  width: number; // mm
  height: number; // mm
};

import type { MakerJSModel } from '@/lib/coords';

export type SliceLayerParams = {
  makerJsModel: MakerJSModel; // The maker.js model data
  layerIndex: number;         // Index of the layer in the slice stack
  zCoordinate: number;        // Real-world Z coordinate of the layer
  axis: 'x' | 'y' | 'z';      // Axis along which the slice was made
  layerThickness: number;     // Thickness of each layer in mm
  // Plane-aware 2D projection metadata (optional during migration)
  plane?: 'XY' | 'XZ' | 'YZ';
  axisMap?: { u: 'x' | 'y' | 'z'; v: 'x' | 'y' | 'z' };
  vUpSign?: 1 | -1; // maker v-axis up direction (+1 usually)
  uvExtents?: { minU: number; minV: number; maxU: number; maxV: number };
};

export type WorkspaceItem = 
  | {
      id: string;
      type: 'rectangle';
      position: { x: number; y: number; z?: number }; // mm top-left (z optional for 2D items)
      zIndex: number;
      locked?: boolean;
      rect: RectangleParams;
    }
  | {
      id: string;
      type: 'sliceLayer';
      position: { x: number; y: number; z?: number }; // Real-world coordinates (z optional for consistency)
      zIndex: number;
      locked?: boolean;
      layer: SliceLayerParams;
    };




export type SelectionState = {
  selectedIds: string[];
};

export type WorkspaceState = {
  bounds: Bounds;
  grid: GridSettings;
  viewport: ViewportState;
  items: WorkspaceItem[];
  selection: SelectionState;
  ui: UiSettings;
};

export type UiSettings = {
  dragActivationDistance: number; // px to start drag
  selectionOverlayOffsetPx: number; // px outward offset for selection rect/dots
  panSpeedMultiplier: number; // scales panning delta (>= 0.1)
  zoomSpeedMultiplier: number; // scales wheel zoom speed (>= 0.1)
  nudgeDistanceMm: number; // keyboard nudge distance in mm when not snapping
  bedSizeMm: Bounds; // user-configurable workspace bed size in mm
  showPerfHud: boolean; // toggle for FPS/render HUD
  fitToBoundsRequestId: number; // increment to request fit-to-bounds from toolbar
};
