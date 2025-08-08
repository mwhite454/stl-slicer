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
};
