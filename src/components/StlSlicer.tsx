'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { StlSlicer as StlSlicerUtil, Axis, LayerData } from '../utils/StlSlicer';
import { exportSvgZip } from '../utils/exportUtils';
import * as THREE from 'three';
import dynamic from 'next/dynamic';

// Improved dynamic import to avoid chunk loading errors
const StlViewer3D = dynamic(
  () => import('./StlViewer3D').then(mod => mod.default), 
  {
    loading: () => (
      <div className="w-full h-[400px] border rounded-md bg-gray-100 flex items-center justify-center">
        <p>Loading 3D Viewer...</p>
      </div>
    ),
  }
);

export default function StlSlicer() {
  const [file, setFile] = useState<File | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number; depth: number } | null>(null);
  const [axis, setAxis] = useState<Axis>('z');
  const [layerThickness, setLayerThickness] = useState<number>(1);
  const [isSlicing, setIsSlicing] = useState<boolean>(false);
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [previewLayerIndex, setPreviewLayerIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isClientSide, setIsClientSide] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slicerRef = useRef<StlSlicerUtil | null>(null);
  
  // Check if we're on the client side
  useEffect(() => {
    setIsClientSide(true);
    // Only initialize the slicer on the client side
    slicerRef.current = new StlSlicerUtil();
  }, []);
  
  // Handle file selection
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isClientSide) return;
    
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    
    try {
      if (!slicerRef.current) {
        slicerRef.current = new StlSlicerUtil();
      }
      
      await slicerRef.current.loadSTL(selectedFile);
      const dims = slicerRef.current.getDimensions();
      if (dims) {
        setDimensions(dims);
      }
    } catch (err) {
      setError('Failed to load STL file. Please check the file format.');
      console.error(err);
    }
  }, [isClientSide]);
  
  // Update axis and trigger new slicing when changed
  const handleAxisChange = useCallback((newAxis: Axis) => {
    setAxis(newAxis);
    
    // Automatically re-slice when axis changes if we have a loaded file
    if (slicerRef.current && file) {
      setIsSlicing(true);
      setTimeout(async () => {
        try {
          const slicedLayers = slicerRef.current!.sliceModel(newAxis, layerThickness);
          setLayers(slicedLayers);
          setPreviewLayerIndex(Math.floor(slicedLayers.length / 2)); // Preview middle layer
        } catch (err) {
          setError('Failed to slice the model with the new axis. Please try again.');
          console.error(err);
        } finally {
          setIsSlicing(false);
        }
      }, 50);
    }
  }, [file, layerThickness]);
  
  // Perform slicing operation
  const handleSlice = useCallback(async () => {
    if (!isClientSide) return;
    if (!slicerRef.current || !file) {
      setError('No STL file loaded');
      return;
    }
    
    setIsSlicing(true);
    setError(null);
    
    try {
      const slicedLayers = slicerRef.current.sliceModel(axis, layerThickness);
      setLayers(slicedLayers);
      setPreviewLayerIndex(Math.floor(slicedLayers.length / 2)); // Preview middle layer
    } catch (err) {
      setError('Failed to slice the model. Please try with different parameters.');
      console.error(err);
    } finally {
      setIsSlicing(false);
    }
  }, [axis, layerThickness, file, isClientSide]);
  
  // Export sliced layers as SVG files in a ZIP archive
  const handleExport = useCallback(async () => {
    if (!isClientSide) return;
    if (!slicerRef.current || !file || layers.length === 0) {
      setError('No sliced layers to export');
      return;
    }
    
    try {
      const svgContents = layers.map(layer => ({
        layer,
        svg: slicerRef.current!.generateSVG(layer)
      }));
      
      await exportSvgZip(svgContents, file.name.replace('.stl', ''));
    } catch (err) {
      setError('Failed to export layers');
      console.error(err);
    }
  }, [file, layers, isClientSide]);
  
  // Draw the current layer preview on the 2D canvas
  useEffect(() => {
    if (!isClientSide || !canvasRef.current || !layers.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (previewLayerIndex >= 0 && previewLayerIndex < layers.length) {
      const layer = layers[previewLayerIndex];
      
      // Find the bounds of all paths to center them properly
      let minX = Number.MAX_VALUE;
      let maxX = Number.MIN_VALUE;
      let minY = Number.MAX_VALUE;
      let maxY = Number.MIN_VALUE;
      
      for (const path of layer.paths) {
        for (const point of path) {
          minX = Math.min(minX, point.x);
          maxX = Math.max(maxX, point.x);
          minY = Math.min(minY, point.y);
          maxY = Math.max(maxY, point.y);
        }
      }
      
      // Calculate model dimensions and scale factor
      const modelWidth = maxX - minX;
      const modelHeight = maxY - minY;
      const modelCenterX = (minX + maxX) / 2;
      const modelCenterY = (minY + maxY) / 2;
      
      const canvasRatio = canvas.width / canvas.height;
      const modelRatio = modelWidth / modelHeight;
      
      let scale;
      if (modelRatio > canvasRatio) {
        scale = (canvas.width * 0.9) / modelWidth;
      } else {
        scale = (canvas.height * 0.9) / modelHeight;
      }
      
      // Set canvas transform
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale); // Scale based on model size
      ctx.translate(-modelCenterX, -modelCenterY); // Center the model
      
      // Draw a border around the slice area
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 0.5 / scale;
      ctx.strokeRect(minX - 5 / scale, minY - 5 / scale, 
                     (maxX - minX) + 10 / scale, (maxY - minY) + 10 / scale);
      
      // Draw paths
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'rgba(200, 220, 255, 0.2)';
      ctx.lineWidth = 1 / scale;
      
      for (const path of layer.paths) {
        if (path.length < 3) continue;
        
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      
      // Add text showing the current layer and its height
      ctx.restore();
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'black';
      ctx.fillText(
        `Layer ${previewLayerIndex + 1}/${layers.length} - Height: ${layer.z.toFixed(2)}mm`, 
        10, 20
      );
    }
  }, [layers, previewLayerIndex, isClientSide]);
  
  // If we're not on the client side yet, return an empty div to avoid hydration mismatches
  if (!isClientSide) {
    return <div className="loading-container h-[500px] flex items-center justify-center">
      <p>Loading STL Slicer...</p>
    </div>;
  }
  
  return (
    <div className="flex flex-col items-start p-6 w-full max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">STL Slicer</h1>
      
      {/* File Input */}
      <div className="w-full mb-6">
        <label className="block text-sm font-medium mb-2">STL File</label>
        <input
          type="file"
          accept=".stl"
          onChange={handleFileChange}
          className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        {file && <p className="mt-2 text-sm">Selected file: {file.name}</p>}
      </div>
      
      {/* Dimensions Display */}
      {dimensions && (
        <div className="w-full p-4 bg-gray-50 rounded-md mb-6">
          <h3 className="font-medium mb-2">Model Dimensions:</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Width</p>
              <p>{dimensions.width.toFixed(2)} mm</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Height</p>
              <p>{dimensions.height.toFixed(2)} mm</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Depth</p>
              <p>{dimensions.depth.toFixed(2)} mm</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Slicing Controls */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Axis Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Slicing Axis</label>
          <div className="flex gap-4">
            {(['x', 'y', 'z'] as Axis[]).map((a) => (
              <label key={a} className="inline-flex items-center">
                <input
                  type="radio"
                  name="axis"
                  value={a}
                  checked={axis === a}
                  onChange={() => handleAxisChange(a)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2 text-gray-700 uppercase">{a}</span>
              </label>
            ))}
          </div>
        </div>
        
        {/* Layer Thickness */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Layer Thickness ({layerThickness.toFixed(2)} mm)
          </label>
          <div className="flex gap-4">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={layerThickness}
              onChange={(e) => setLayerThickness(parseFloat(e.target.value))}
              className="w-full"
            />
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={layerThickness}
              onChange={(e) => setLayerThickness(parseFloat(e.target.value))}
              className="w-20 px-2 py-1 border rounded-md"
            />
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="w-full flex gap-4 mb-6">
        <button
          onClick={handleSlice}
          disabled={!file || isSlicing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSlicing ? 'Slicing...' : 'Slice Model'}
        </button>
        
        <button
          onClick={handleExport}
          disabled={layers.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
        >
          Export SVG Layers
        </button>
      </div>
      
      {/* View Toggle */}
      <div className="w-full mb-4">
        <div className="flex border rounded-md overflow-hidden">
          <button
            className={`py-2 px-4 flex-1 text-center ${viewMode === '3d' ? 'bg-blue-100 text-blue-800' : 'bg-white'}`}
            onClick={() => setViewMode('3d')}
          >
            3D View
          </button>
          <button
            className={`py-2 px-4 flex-1 text-center ${viewMode === '2d' ? 'bg-blue-100 text-blue-800' : 'bg-white'}`}
            onClick={() => setViewMode('2d')}
          >
            2D View
          </button>
        </div>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="w-full p-4 bg-red-50 text-red-700 rounded-md mb-6">
          {error}
        </div>
      )}
      
      {/* 3D or 2D View based on selected mode */}
      {file && (
        <div className="w-full">
          {viewMode === '3d' ? (
            <>
              <div className="relative w-full" style={{ 
                zIndex: 10, 
                height: '400px',
                pointerEvents: 'auto'
              }}>
                <StlViewer3D
                  stlFile={file}
                  layers={layers}
                  axis={axis}
                  layerThickness={layerThickness}
                  activeLayerIndex={previewLayerIndex}
                />
              </div>
              {file && (
                <div className="mt-2 p-2 bg-blue-50 rounded-md text-sm">
                  <p className="font-medium">3D Model Controls:</p>
                  <ul className="list-disc pl-5 text-gray-700">
                    <li>Click and drag to rotate the model</li>
                    <li>Scroll or pinch to zoom in/out</li>
                    <li>Shift+click and drag (or right-click and drag) to pan</li>
                  </ul>
                </div>
              )}
            </>
          ) : (
            layers.length > 0 && (
              <div className="w-full">
                <h3 className="font-medium mb-2">
                  2D Layer Preview: {previewLayerIndex + 1} / {layers.length}
                </h3>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={500}
                  className="w-full h-[400px] border rounded-md bg-white"
                />
              </div>
            )
          )}
          
          {/* Layer Navigation */}
          {layers.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">
                Navigate Layers: {previewLayerIndex + 1} / {layers.length}
              </h3>
              <div className="flex gap-4 items-center mb-4">
                <button
                  onClick={() => setPreviewLayerIndex(Math.max(0, previewLayerIndex - 1))}
                  disabled={previewLayerIndex === 0}
                  className="px-3 py-1 border rounded-md disabled:text-gray-400"
                >
                  Previous
                </button>
                
                <input
                  type="range"
                  min="0"
                  max={layers.length - 1}
                  value={previewLayerIndex}
                  onChange={(e) => setPreviewLayerIndex(parseInt(e.target.value))}
                  className="w-full"
                />
                
                <button
                  onClick={() => setPreviewLayerIndex(Math.min(layers.length - 1, previewLayerIndex + 1))}
                  disabled={previewLayerIndex === layers.length - 1}
                  className="px-3 py-1 border rounded-md disabled:text-gray-400"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 