'use client';

import { useState, useRef } from 'react';
import { SVGViewer } from './components/SVGViewer';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Point, Path, Circle, DocumentSettings as DocumentSettingsType } from './types';

export default function SvgEditor() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [currentPath, setCurrentPath] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedElement, setSelectedElement] = useState<{ type: 'path' | 'circle', index: number } | null>(null);
  const [tool, setTool] = useState<'draw' | 'select'>('draw');
  const [editingPoint, setEditingPoint] = useState<{ pathIndex: number; pointIndex: number } | null>(null);
  const [documentSettings, setDocumentSettings] = useState<DocumentSettingsType>({
    width: 1000,
    height: 1000,
    unit: 'mm'
  });
  const svgRef = useRef<SVGSVGElement>(null);

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    
    if (tool === 'draw') {
      setIsDrawing(true);
      setCurrentPath([{ x: svgP.x, y: svgP.y }]);
    } else if (tool === 'select') {
      const clickedPoint = findClickedPoint(svgP.x, svgP.y);
      if (clickedPoint) {
        setEditingPoint(clickedPoint);
        if (!selectedElement || selectedElement.type !== 'path' || selectedElement.index !== clickedPoint.pathIndex) {
          setSelectedElement({ type: 'path', index: clickedPoint.pathIndex });
        }
      } else {
        const clickedPath = findClickedPath(svgP.x, svgP.y);
        if (clickedPath !== null) {
          setSelectedElement({ type: 'path', index: clickedPath });
          setEditingPoint(null);
        } else {
          setSelectedElement(null);
          setEditingPoint(null);
        }
      }
    }
  };

  const findClickedPoint = (x: number, y: number): { pathIndex: number; pointIndex: number } | null => {
    const threshold = 5;
    
    for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
      const path = paths[pathIndex];
      for (let pointIndex = 0; pointIndex < path.points.length; pointIndex++) {
        const point = path.points[pointIndex];
        const distance = Math.sqrt(Math.pow(point.x - x, 2) + Math.pow(point.y - y, 2));
        if (distance < threshold) {
          return { pathIndex, pointIndex };
        }
      }
    }
    return null;
  };

  const findClickedPath = (x: number, y: number): number | null => {
    const threshold = 5;
    
    for (let pathIndex = 0; pathIndex < paths.length; pathIndex++) {
      const path = paths[pathIndex];
      for (let i = 0; i < path.points.length - 1; i++) {
        const p1 = path.points[i];
        const p2 = path.points[i + 1];
        const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (distance < threshold) {
          return pathIndex;
        }
      }
      if (path.isClosed && path.points.length > 2) {
        const p1 = path.points[path.points.length - 1];
        const p2 = path.points[0];
        const distance = distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
        if (distance < threshold) {
          return pathIndex;
        }
      }
    }
    return null;
  };

  const distanceToLineSegment = (x: number, y: number, x1: number, y1: number, x2: number, y2: number): number => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq !== 0) {
      param = dot / len_sq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    
    if (isDrawing && tool === 'draw') {
      setCurrentPath(prev => [...prev, { x: svgP.x, y: svgP.y }]);
    } else if (editingPoint && tool === 'select') {
      setPaths(prev => {
        const newPaths = [...prev];
        newPaths[editingPoint.pathIndex] = {
          ...newPaths[editingPoint.pathIndex],
          points: newPaths[editingPoint.pathIndex].points.map((point, idx) =>
            idx === editingPoint.pointIndex ? { x: svgP.x, y: svgP.y } : point
          )
        };
        return newPaths;
      });
    }
  };

  const handleMouseUp = () => {
    if (tool === 'draw' && currentPath.length > 1) {
      setPaths(prev => [...prev, { 
        points: [...currentPath], 
        color: selectedColor,
        name: `Path ${prev.length + 1}`,
        isClosed: false
      }]);
    }
    setIsDrawing(false);
    setCurrentPath([]);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    
    if (selectedElement) {
      if (selectedElement.type === 'path') {
        setPaths(prev => prev.map((path, idx) => 
          idx === selectedElement.index ? { ...path, color } : path
        ));
      } else {
        setCircles(prev => prev.map((circle, idx) => 
          idx === selectedElement.index ? { ...circle, color } : circle
        ));
      }
    }
  };

  const handlePathNameChange = (pathIndex: number, newName: string) => {
    setPaths(prev => prev.map((path, idx) =>
      idx === pathIndex ? { ...path, name: newName } : path
    ));
  };

  const handleDeletePath = () => {
    if (selectedElement?.type === 'path') {
      setPaths(prev => prev.filter((_, idx) => idx !== selectedElement.index));
      setSelectedElement(null);
      setEditingPoint(null);
    }
  };

  const handleClosePath = () => {
    if (selectedElement?.type === 'path') {
      setPaths(prev => {
        const newPaths = [...prev];
        newPaths[selectedElement.index] = {
          ...newPaths[selectedElement.index],
          isClosed: true
        };
        return newPaths;
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const svgContent = e.target?.result as string;
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');
      
      // Clear existing paths
      setPaths([]);
      
      // Parse paths from SVG
      const svgPaths = doc.getElementsByTagName('path');
      Array.from(svgPaths).forEach((path, index) => {
        const d = path.getAttribute('d');
        if (d) {
          // Simple path parsing - you might want to enhance this
          const points: Point[] = [];
          const commands = d.split(/[ML]/).filter(Boolean);
          commands.forEach(cmd => {
            const [x, y] = cmd.trim().split(/\s+/).map(Number);
            if (!isNaN(x) && !isNaN(y)) {
              points.push({ x, y });
            }
          });
          
          if (points.length > 0) {
            setPaths(prev => [...prev, {
              points,
              color: path.getAttribute('stroke') || '#000000',
              name: `Path ${prev.length + 1}`,
              isClosed: d.includes('Z')
            }]);
          }
        }
      });
    };
    reader.readAsText(file);
  };

  const handleExportSvg = () => {
    const svgContent = `
      <svg width="${documentSettings.width}${documentSettings.unit}" 
           height="${documentSettings.height}${documentSettings.unit}" 
           viewBox="0 0 ${documentSettings.width} ${documentSettings.height}" 
           xmlns="http://www.w3.org/2000/svg">
        ${paths.map(path => `
          <path 
            d="${path.points.reduce((acc, point, i) => 
              acc + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`), '')}${path.isClosed ? ' Z' : ''}"
            stroke="${path.color}"
            fill="none"
            stroke-width="2"
          />
        `).join('')}
        ${circles.map(circle => `
          <circle 
            cx="${circle.cx}" 
            cy="${circle.cy}" 
            r="${circle.r}" 
            stroke="${circle.color}" 
            fill="none" 
            stroke-width="2"
          />
        `).join('')}
      </svg>
    `;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'drawing.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDocumentSettingsChange = (field: keyof DocumentSettingsType, value: string | number) => {
    setDocumentSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePointCoordinateChange = (pathIndex: number, pointIndex: number, axis: 'x' | 'y', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setPaths(prev => {
      const newPaths = [...prev];
      newPaths[pathIndex] = {
        ...newPaths[pathIndex],
        points: newPaths[pathIndex].points.map((point, idx) =>
          idx === pointIndex ? { ...point, [axis]: numValue } : point
        )
      };
      return newPaths;
    });
  };

  const handleDeletePoint = (pathIndex: number, pointIndex: number) => {
    setPaths(prev => {
      const newPaths = [...prev];
      newPaths[pathIndex] = {
        ...newPaths[pathIndex],
        points: newPaths[pathIndex].points.filter((_, idx) => idx !== pointIndex)
      };
      return newPaths;
    });
    setEditingPoint(null);
  };

  const handlePathSelect = (pathIndex: number) => {
    setSelectedElement({ type: 'path', index: pathIndex });
    setEditingPoint(null);
  };

  return (
    <div className="flex flex-col h-screen">
      <Header
        onFileUpload={handleFileUpload}
        onExportSvg={handleExportSvg}
        documentSettings={documentSettings}
        onSettingsChange={handleDocumentSettingsChange}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          tool={tool}
          onToolChange={setTool}
          selectedColor={selectedColor}
          onColorChange={handleColorChange}
          paths={paths}
          onPathNameChange={handlePathNameChange}
          onDeletePath={handleDeletePath}
          onClosePath={handleClosePath}
          onDeletePoint={handleDeletePoint}
          onPointCoordinateChange={handlePointCoordinateChange}
          selectedElement={selectedElement}
          editingPoint={editingPoint}
        />
        <div className="flex-1 p-4">
          <SVGViewer
            paths={paths}
            circles={circles}
            currentPath={currentPath}
            isDrawing={isDrawing}
            tool={tool}
            editingPoint={editingPoint}
            selectedColor={selectedColor}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            documentSettings={documentSettings}
            selectedElement={selectedElement}
            onPathSelect={handlePathSelect}
          />
        </div>
      </div>
    </div>
  );
}