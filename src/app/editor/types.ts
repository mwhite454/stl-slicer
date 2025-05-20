export interface Point {
  x: number;
  y: number;
}

export interface Path {
  points: Point[];
  color: string;
  name: string;
  isClosed: boolean;
}

export interface Circle {
  cx: number;
  cy: number;
  r: number;
  color: string;
}

export interface DocumentSettings {
  width: number;
  height: number;
  unit: 'mm' | 'in';
} 