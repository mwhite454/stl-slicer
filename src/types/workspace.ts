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

// Path-based text label parameters
export type LabelParams = {
  text: string;
  fontFamily?: string; // for reference; actual font is loaded via opentype
  fontSizeMm: number;  // text height in mm
};

export type WorkspaceItem = 
  | {
      id: string;
      type: 'rectangle';
      position: { x: number; y: number; z?: number }; // mm top-left (z optional for 2D items)
      zIndex: number;
      locked?: boolean;
      // Optional laser operation assignment for laser workflow coloring
      operationId?: string | null;
      rect: RectangleParams;
    }
  | {
      id: string;
      type: 'sliceLayer';
      position: { x: number; y: number; z?: number }; // Real-world coordinates (z optional for consistency)
      zIndex: number;
      locked?: boolean;
      // Optional laser operation assignment for laser workflow coloring
      operationId?: string | null;
      layer: SliceLayerParams;
    }
  | {
      id: string;
      type: 'label';
      position: { x: number; y: number; z?: number }; // mm top-left
      zIndex: number;
      locked?: boolean;
      operationId?: string | null; // should default to 'label' meta op
      relatedLayerIndex?: number; // associates label with a slice layer index for per-layer views
      label: LabelParams;
      makerJsModel: MakerJSModel; // path-based text model
    }
  | {
      id: string;
      type: 'metaModel';
      // Rendered in centered Y-up space; position is ignored for now (reserved for future offset)
      position: { x: number; y: number; z?: number };
      zIndex: number;
      locked?: boolean;
      operationId?: string | null; // should be 'meta'
      metaType: 'grid' | 'workspace';
      makerJsModel: MakerJSModel;
    };



export type LaserOperation = {
  id: string;           // internal unique id
  key: string;          // stable key like 'cut', 'engrave', 'score', 'meta'
  label: string;        // user-visible label
  color: string;        // stroke color (hex)
  isMeta?: boolean;     // reserved internal use (not assignable/exported)
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
  operations: LaserOperation[]; // laser operation palette (includes reserved Meta)
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
  disablePlaneMapping?: boolean; // when true, ignore plane/uv mapping for slice rendering
};
