import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, X } from 'lucide-react';
import { Path, Point } from '../types';

interface SidebarProps {
  tool: 'draw' | 'select';
  onToolChange: (tool: 'draw' | 'select') => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
  paths: Path[];
  onPathNameChange: (pathIndex: number, newName: string) => void;
  onDeletePath: () => void;
  onClosePath: () => void;
  onDeletePoint: (pathIndex: number, pointIndex: number) => void;
  onPointCoordinateChange: (pathIndex: number, pointIndex: number, axis: 'x' | 'y', value: string) => void;
  selectedElement: { type: 'path' | 'circle'; index: number } | null;
  editingPoint: { pathIndex: number; pointIndex: number } | null;
}

export function Sidebar({
  tool,
  onToolChange,
  selectedColor,
  onColorChange,
  paths,
  onPathNameChange,
  onDeletePath,
  onClosePath,
  onDeletePoint,
  onPointCoordinateChange,
  selectedElement,
  editingPoint
}: SidebarProps) {
  return (
    <div className="w-64 border-r p-4 space-y-4">
      <div className="space-y-2">
        <h3 className="font-medium">Tools</h3>
        <div className="flex gap-2">
          <Button
            variant={tool === 'draw' ? 'default' : 'outline'}
            onClick={() => onToolChange('draw')}
          >
            Draw
          </Button>
          <Button
            variant={tool === 'select' ? 'default' : 'outline'}
            onClick={() => onToolChange('select')}
          >
            Select
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="font-medium">Color</h3>
        <input
          type="color"
          value={selectedColor}
          onChange={(e) => onColorChange(e.target.value)}
          className="w-full h-10 rounded-md cursor-pointer"
        />
      </div>

      {selectedElement?.type === 'path' && (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Path Name</h3>
            <Input
              value={paths[selectedElement.index].name}
              onChange={(e) => onPathNameChange(selectedElement.index, e.target.value)}
            />
          </div>

          <div>
            <h3 className="font-medium mb-2">Points</h3>
            <div className="space-y-2">
              {paths[selectedElement.index].points.map((point, pointIndex) => (
                <div key={pointIndex} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={point.x}
                        onChange={(e) => onPointCoordinateChange(selectedElement.index, pointIndex, 'x', e.target.value)}
                        className={`w-full p-1 border rounded text-sm ${
                          editingPoint?.pathIndex === selectedElement.index &&
                          editingPoint?.pointIndex === pointIndex
                            ? 'border-lime-500 bg-lime-50'
                            : ''
                        }`}
                        step="0.1"
                      />
                    </div>
                    <div className="flex-1">
                      <Input
                        type="number"
                        value={point.y}
                        onChange={(e) => onPointCoordinateChange(selectedElement.index, pointIndex, 'y', e.target.value)}
                        className={`w-full p-1 border rounded text-sm ${
                          editingPoint?.pathIndex === selectedElement.index &&
                          editingPoint?.pointIndex === pointIndex
                            ? 'border-lime-500 bg-lime-50'
                            : ''
                        }`}
                        step="0.1"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeletePoint(selectedElement.index, pointIndex)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClosePath}
              disabled={paths[selectedElement.index].isClosed}
              className="flex-1"
            >
              Close Path
            </Button>
            <Button
              variant="destructive"
              onClick={onDeletePath}
              className="flex-1"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 