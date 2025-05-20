import { useRef } from 'react';
import { Point, Path, Circle } from '../types';

interface SVGViewerProps {
  paths: Path[];
  circles: Circle[];
  currentPath: Point[];
  isDrawing: boolean;
  tool: 'draw' | 'select';
  editingPoint: { pathIndex: number; pointIndex: number } | null;
  selectedColor: string;
  onMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement>) => void;
  onMouseUp: () => void;
  documentSettings: {
    width: number;
    height: number;
    unit: 'mm' | 'in';
  };
  selectedElement: { type: 'path' | 'circle'; index: number } | null;
  onPathSelect: (pathIndex: number) => void;
}

export function SVGViewer({
  paths,
  circles,
  currentPath,
  isDrawing,
  tool,
  editingPoint,
  selectedColor,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  documentSettings,
  selectedElement,
  onPathSelect
}: SVGViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${documentSettings.width} ${documentSettings.height}`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{ border: '1px solid #ccc' }}
    >
      {/* Render existing paths */}
      {paths.map((path, pathIndex) => (
        <g key={`path-${pathIndex}`}>
          <path
            d={path.points.reduce((acc: string, point: Point, i: number) => {
              return acc + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
            }, '') + (path.isClosed ? ' Z' : '')}
            stroke={path.color}
            fill="none"
            strokeWidth="2"
            onClick={() => onPathSelect(pathIndex)}
            className="cursor-pointer"
          />
          {/* Render points if path is selected */}
          {selectedElement?.type === 'path' && selectedElement.index === pathIndex && (
            path.points.map((point: Point, pointIndex: number) => (
              <circle
                key={`point-${pathIndex}-${pointIndex}`}
                cx={point.x}
                cy={point.y}
                r={editingPoint?.pathIndex === pathIndex && editingPoint?.pointIndex === pointIndex ? 6 : 4}
                fill={editingPoint?.pathIndex === pathIndex && editingPoint?.pointIndex === pointIndex ? '#ff0000' : '#0000ff'}
                style={{ cursor: 'move' }}
              />
            ))
          )}
          {/* Add path name as text */}
          {path.points.length > 0 && (
            <text
              x={path.points[0].x}
              y={path.points[0].y - 10}
              fill={path.color}
              fontSize="12"
            >
              {path.name}
            </text>
          )}
        </g>
      ))}

      {/* Render circles */}
      {circles.map((circle, index) => (
        <circle
          key={`circle-${index}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          stroke={circle.color}
          fill="none"
          strokeWidth="2"
        />
      ))}

      {/* Render current path being drawn */}
      {isDrawing && currentPath.length > 0 && (
        <path
          d={currentPath.reduce((acc: string, point: Point, i: number) => {
            return acc + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
          }, '')}
          stroke={selectedColor}
          fill="none"
          strokeWidth="2"
        />
      )}
    </svg>
  );
} 