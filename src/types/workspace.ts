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

export type WorkspaceItem = {
  id: string;
  type: 'rectangle';
  position: { x: number; y: number }; // mm top-left
  zIndex: number;
  locked?: boolean;
  rect: RectangleParams;
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
