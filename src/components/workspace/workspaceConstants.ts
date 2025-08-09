export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;
export const WHEEL_ZOOM_SENSITIVITY = 0.0015; // base multiplier for wheel zoom
export const FIT_MARGIN_MM = 2; // extra margin when fitting content to bounds (in mm)
export const GRID_LINE_STROKE = { color: '#e0e0e0', width: 0.2 } as const;
export const BORDER_STROKE = { color: '#bbb', width: 0.4 } as const;
export const NUDGE_MIN_MM = 0.1; // minimum allowed nudge distance
export const MIN_POSITION_MM = 0; // position cannot go below 0 in either axis
export const MIN_SPEED_MULT = 0.1; // minimum speed multiplier for pan/zoom scaling

export const DIRECTION_KEY_MAP: Record<string, { dx: number; dy: number }> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};
