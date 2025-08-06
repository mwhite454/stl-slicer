'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { StlSlicer as StlSlicerUtil, Axis, LayerData } from '../utils/StlSlicer';
import { exportSvgZip } from '../utils/exportUtils';
import * as THREE from 'three';
import { Euler } from 'three'; // Added Euler import
import dynamic from 'next/dynamic';
import { Sidebar } from './ui/Sidebar';
import { Button } from './ui/button';
import {  useSVGStore } from '@/stores/svgStore';
import { useViewerStore } from '@/stores/viewerStore';   
import { useSTLStore } from '@/stores/stlStore';
import { Box, Flex, Text, Alert, Group, Stack, Title, ActionIcon, Loader, Slider } from '@mantine/core';

// Improved dynamic import to avoid chunk loading errors
const StlViewer3D = dynamic(
  () => import('./StlViewer3D').then(mod => mod.default), 
  {
    loading: () => (
      <Box w="100%" h={400} style={{ border: '1px solid #e9ecef', borderRadius: '8px', backgroundColor: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="sm">
          <Loader size="md" />
          <Text size="sm">Loading 3D Viewer...</Text>
        </Stack>
      </Box>
    ),
  }
);

// Convert File to base64
const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// Convert base64 to File
const base64ToFile = async (base64: string, filename: string, mimeType: string): Promise<File> => {
  const res = await fetch(base64);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeType });
};

function StlSlicerContent() {
  const { file, axis, setAxis, getAxis, getFile, setFile } = useSTLStore();
  const [dimensions, setDimensions] = useState<{ width: number; height: number; depth: number } | null>(null);
  const [modelRotation, setModelRotation] = useState<THREE.Euler>(new THREE.Euler(0, 0, 0));
  const [layerThickness, setLayerThickness] = useState<number>(3);
  const [isSlicing, setIsSlicing] = useState<boolean>(false);
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [previewLayerIndex, setPreviewLayerIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('3d');
  const [zoomLevel, setZoomLevel] = useState<number>(0.7); // Initial zoom level reduced to 70% for better visibility
  const [hasAutoFit, setHasAutoFit] = useState<boolean>(false); // Track if we've auto-fit already
  const previewLayerRestored = useRef(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slicerRef = useRef<StlSlicerUtil | null>(null);
  
  // Initialize the slicer
  useEffect(() => {
    slicerRef.current = new StlSlicerUtil();
  }, []);
  
  // Restore last STL file from localStorage if available (commented out for now)
  // useEffect(() => {
  //   (async () => {
  //     if (file) return; // Don't overwrite if already loaded
  //     const saved = localStorage.getItem('lastStlFile');
  //     if (saved) {
  //       try {
  //         const { name, type, base64 } = JSON.parse(saved);
  //         const restoredFile = await base64ToFile(base64, name, type);
  //         setFile(restoredFile);
  //         setError(null);
  //         if (!slicerRef.current) {
  //           slicerRef.current = new StlSlicerUtil();
  //         }
  //         await slicerRef.current.loadSTL(restoredFile);
  //         const dims = slicerRef.current.getDimensions();
  //         if (dims) setDimensions(dims);
  //       } catch (err) {
  //         setError('Failed to restore previous session.');
  //         console.error(err);
  //       }
  //     }
  //   })();
  // }, []);
  
  // Save STL file to localStorage when it changes
  useEffect(() => {
    (async () => {
      if (file) {
        try {
          const base64 = await fileToBase64(file);
          localStorage.setItem('lastStlFile', JSON.stringify({
            name: file.name,
            type: file.type,
            base64
          }));
        } catch (err) {
          console.error('Failed to save STL file:', err);
        }
      } else {
        localStorage.removeItem('lastStlFile');
      }
    })();
  }, [file]);
  
  // Restore other settings from localStorage on mount
  useEffect(() => {
    const savedAxis = localStorage.getItem('slicerAxis');
    if (savedAxis) setAxis(savedAxis as Axis);
    const savedThickness = localStorage.getItem('slicerLayerThickness');
    if (savedThickness) setLayerThickness(Number(savedThickness));
    const savedViewMode = localStorage.getItem('slicerViewMode');
    if (savedViewMode) setViewMode(savedViewMode as '2d' | '3d');
    const savedZoom = localStorage.getItem('slicerZoomLevel');
    if (savedZoom) setZoomLevel(Number(savedZoom));
    const savedPreviewLayer = localStorage.getItem('slicerPreviewLayerIndex');
    if (savedPreviewLayer && !previewLayerRestored.current) {
      setPreviewLayerIndex(Number(savedPreviewLayer));
      previewLayerRestored.current = true;
    }
  }, []);
  
  // Persist settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('slicerAxis', axis);
  }, [axis]);
  useEffect(() => {
    localStorage.setItem('slicerLayerThickness', String(layerThickness));
  }, [layerThickness]);
  useEffect(() => {
    localStorage.setItem('slicerViewMode', viewMode);
  }, [viewMode]);
  useEffect(() => {
    localStorage.setItem('slicerZoomLevel', String(zoomLevel));
  }, [zoomLevel]);
  
  // Handle file selection
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);

    // Save to localStorage
    try {
      const base64 = await fileToBase64(selectedFile);
      localStorage.setItem('lastStlFile', JSON.stringify({
        name: selectedFile.name,
        type: selectedFile.type,
        base64,
      }));
    } catch (err) {
      console.error('Failed to save STL file to localStorage', err);
    }
    
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
  }, []);
  
  // Helper to find the middle-most non-empty layer index
  function getMiddleNonEmptyLayerIndex(layers: LayerData[]): number {
    const nonEmpty = layers
      .map((layer, idx) => ({ idx, count: layer.paths.length }))
      .filter(l => l.count > 0);
    if (nonEmpty.length === 0) return 0;
    return nonEmpty[Math.floor(nonEmpty.length / 2)].idx;
  }
  
  // Auto-slice on file load, axis, or thickness change
  useEffect(() => {
    if (!slicerRef.current || !file) return;
    // Check if model is actually loaded before attempting to slice
    if (!slicerRef.current.isModelLoaded()) return;
    
    let cancelled = false;
    const doSlice = async () => {
      setIsSlicing(true);
      setError(null);
      setHasAutoFit(false);
      try {
        const slicedLayers = slicerRef.current!.sliceModel(axis, layerThickness);
        if (cancelled) return;
        setLayers(slicedLayers);
        const midIdx = getMiddleNonEmptyLayerIndex(slicedLayers);
        setPreviewLayerIndex(midIdx);
        localStorage.setItem('slicerPreviewLayerIndex', String(midIdx));

      } catch (err) {
        if (!cancelled) {
          setError('Failed to slice the model. Please try with different parameters.');
          console.error(err);
        }
      } finally {
        if (!cancelled) setIsSlicing(false);
      }
    };
    doSlice();
    return () => { cancelled = true; };
  }, [file, axis, layerThickness]);
  
  // Load file into slicer if file exists but model isn't loaded
  useEffect(() => {
    if (!file || !slicerRef.current) return;
    if (slicerRef.current.isModelLoaded()) return; // Already loaded
    
    const loadFile = async () => {
      try {
        await slicerRef.current!.loadSTL(file);
        const dims = slicerRef.current!.getDimensions();
        if (dims) {
          setDimensions(dims);
        }
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load STL file. Please check the file format.';
        setError(errorMessage);
        console.error('File loading error:', err);
      }
    };
    
    loadFile();
  }, [file]);
  
  // Handle layer thickness change
  const handleLayerThicknessChange = useCallback((newThickness: number) => {
    setLayerThickness(newThickness);
  }, []);
  
  // Function to handle zoom in/out
  const handleZoomChange = useCallback((direction: 'in' | 'out') => {
    setZoomLevel(prevZoom => {
      // Larger zoom steps for better control
      const zoomChange = direction === 'in' ? 0.15 : -0.15;
      const newZoom = Math.max(0.1, Math.min(3.0, prevZoom + zoomChange));
      return newZoom;
    });
  }, []);
  
  // Function to reset zoom to fit the view
  const handleZoomReset = useCallback(() => {
    setZoomLevel(0.7); // Reset to 70% for better visibility
  }, []);
  
  // Function to fit the model to the view
  const handleFitToView = useCallback(() => {
    if (!layers.length || !canvasRef.current || previewLayerIndex >= layers.length) return;
    
    const canvas = canvasRef.current;
    const layer = layers[previewLayerIndex];
    
    // Find the bounds of all paths
    let minX = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let minY = Number.MAX_VALUE;
    let maxY = Number.MIN_VALUE;
    
    // Check if there are valid paths to calculate bounds
    if (layer.paths.length === 0) {
      setZoomLevel(0.7); // Default if no paths
      return;
    }
    
    for (const path of layer.paths) {
      for (const point of path) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }
    }
    
    // Check if we have valid bounds
    if (minX === Number.MAX_VALUE || maxX === Number.MIN_VALUE || 
        minY === Number.MAX_VALUE || maxY === Number.MIN_VALUE) {
      setZoomLevel(0.7); // Default if invalid bounds
      return;
    }
    
    // Calculate model dimensions
    const modelWidth = maxX - minX;
    const modelHeight = maxY - minY;
    
    // Add a margin percentage for better visibility
    const margin = 0.2; // 20% margin
    
    // Calculate the zoom level that would perfectly fit the model
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Calculate zoom factors for both width and height
    const zoomX = (canvasWidth / (modelWidth * (1 + margin * 2))) * 0.9;
    const zoomY = (canvasHeight / (modelHeight * (1 + margin * 2))) * 0.9;
    
    // Use the smaller zoom to ensure the entire model fits
    let optimalZoom = Math.min(zoomX, zoomY);
    
    // Limit zoom to reasonable values
    optimalZoom = Math.max(0.2, Math.min(0.9, optimalZoom));
    
    // Apply the calculated optimal zoom
    setZoomLevel(optimalZoom);
  }, [layers, previewLayerIndex]);
  
  // Export sliced layers as SVG files in a ZIP archive
  const handleExport = useCallback(async () => {
    if (!slicerRef.current || !file || layers.length === 0) {
      setError('No sliced layers to export');
      return;
    }
    
    try {
      const svgContents = layers.map(layer => ({
        layer,
        svg: slicerRef.current!.generateSVG(layer),
        makerjsSVG: slicerRef.current!.makerJSModelToSVG(slicerRef.current!.generateMakerJSModel(layer))
      }));

      await exportSvgZip(svgContents, `${file.name.replace('.stl', '')}_${axis}_${layerThickness}mm_layers.zip`);
    } catch (err) {
      setError('Failed to export layers');
      console.error(err);
    }
  }, [file, layers]);
  
  // Add a new effect to ensure canvas size matches container
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Function to resize canvas to match its container
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const container = canvas.parentElement;
      if (!container) return;
      
      // Get the container's dimensions
      const rect = container.getBoundingClientRect();
      
      // Set canvas dimensions to match container
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      // Force redraw if we have layers
      if (layers.length > 0) {
        // This will trigger the drawing effect
        const currentZoom = zoomLevel;
        setZoomLevel(currentZoom); 
      }
    };
    
    // Initial resize
    resizeCanvas();
    
    // Set up resize observer to adjust canvas when container size changes
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (canvasRef.current.parentElement) {
      resizeObserver.observe(canvasRef.current.parentElement);
    }
    
    // Clean up
    return () => {
      resizeObserver.disconnect();
    };
  }, [canvasRef, layers.length, zoomLevel]);
  
  // Completely revised drawing function with a simpler approach
  useEffect(() => {
    if (!canvasRef.current || !layers.length) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (previewLayerIndex >= 0 && previewLayerIndex < layers.length) {
      const layer = layers[previewLayerIndex];
      
      if (layer.paths.length === 0) {
        // No paths to render
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText(
          `No slice data at this layer (${layer.z.toFixed(2)}mm)`, 
          canvas.width / 2, canvas.height / 2
        );
        return;
      }
      
      // Find bounds
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
      
      // Calculate model dimensions
      const modelWidth = maxX - minX;
      const modelHeight = maxY - minY;
      
      // Ensure we have valid dimensions
      if (modelWidth <= 0 || modelHeight <= 0) {
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText(
          `Invalid model dimensions`, 
          canvas.width / 2, canvas.height / 2
        );
        return;
      }
      
      // Calculate scale to fit in canvas with 20% margin
      const margin = 0.2;
      const availableWidth = canvas.width * (1 - margin);
      const availableHeight = canvas.height * (1 - margin);
      
      const scaleX = availableWidth / modelWidth;
      const scaleY = availableHeight / modelHeight;
      
      // Use the smaller scale to ensure the entire model fits
      let baseScale = Math.min(scaleX, scaleY);
      
      // Apply user zoom
      const scale = baseScale * zoomLevel;
      
      // Draw coordinate system for debugging
      ctx.save();
      ctx.strokeStyle = '#ccc';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.moveTo(canvas.width / 2, 0);
      ctx.lineTo(canvas.width / 2, canvas.height);
      ctx.stroke();
      ctx.restore();
      
      // Translate to center of canvas
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      
      // Calculate center of model in model space
      const modelCenterX = (minX + maxX) / 2;
      const modelCenterY = (minY + maxY) / 2;
      
      // Translate to center the model
      ctx.translate(-modelCenterX, -modelCenterY);
      
      // Draw colored border around model bounds for debugging
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(minX, minY, modelWidth, modelHeight);
      
      // Draw all paths
      ctx.strokeStyle = 'black';
      ctx.fillStyle = 'rgba(200, 220, 255, 0.2)';
      ctx.lineWidth = 1 / scale;
      
      for (const path of layer.paths) {
        if (path.length < 2) continue;
        
        ctx.beginPath();
        ctx.moveTo(path[0].x, path[0].y);
        
        for (let i = 1; i < path.length; i++) {
          ctx.lineTo(path[i].x, path[i].y);
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      
      // Restore context to draw text without transforms
      ctx.restore();
      
      // Draw text overlay
      ctx.font = '12px sans-serif';
      ctx.fillStyle = 'black';
      ctx.textAlign = 'left';
      ctx.fillText(
        `Layer ${previewLayerIndex + 1}/${layers.length} - Height: ${layer.z.toFixed(2)}mm (${layer.paths.length} paths)`, 
        10, 20
      );
      
      ctx.fillText(
        `Zoom: ${Math.round(zoomLevel * 100)}% (Scale: ${baseScale.toFixed(3)})`, 
        10, 40
      );
      
      ctx.fillText(
        `Model: ${modelWidth.toFixed(1)} x ${modelHeight.toFixed(1)} | Canvas: ${canvas.width} x ${canvas.height}`, 
        10, 60
      );
    }
  }, [layers, previewLayerIndex, zoomLevel]);
  
  // Add a function to clear the session
  const handleClearSession = useCallback(() => {
    localStorage.removeItem('lastStlFile');
    localStorage.removeItem('slicerAxis');
    localStorage.removeItem('slicerLayerThickness');
    localStorage.removeItem('slicerViewMode');
    localStorage.removeItem('slicerZoomLevel');
    localStorage.removeItem('slicerPreviewLayerIndex');
    setFile(null);
    setDimensions(null);
    setLayers([]);
    setPreviewLayerIndex(0);
    setError(null);
  }, []);
  
  // Remove handleSlice (no longer needed)
  
  // Remove handleAxisChange logic for manual slicing
  const handleAxisChange = useCallback((newAxis: Axis) => {
    setAxis(newAxis);
    setHasAutoFit(false);
    // Auto-fit zoom on axis change
    setZoomLevel(0.7);
  }, []);
  
  // Component is now client-side only via dynamic import, no need for loading state
  
  return (
    <Flex h="100vh" style={{ overflow: 'hidden' }}>
      {/* Sidebar */}
      <Sidebar
        file={file}
        dimensions={dimensions}
        axis={axis}
        modelRotation={modelRotation}
        setModelRotation={(rotation: { x: number; y: number; z: number }) => {
          setModelRotation(new Euler(rotation.x, rotation.y, rotation.z));
        }}
        layerThickness={layerThickness}
        isSlicing={isSlicing}
        onFileChange={handleFileChange}
        onAxisChange={handleAxisChange}
        onLayerThicknessChange={handleLayerThicknessChange}
        onExport={handleExport}
        onViewModeChange={setViewMode}
        viewMode={viewMode}
      />
      
      {/* Main Content */}
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '1.5rem' }}>
        {/* Clear Session Button */}
        <Group justify="flex-end" mb="md">
          <Button
            onClick={handleClearSession}
            variant="destructive"
            size="sm"
            title="Clear session and remove last STL file from storage"
          >
            Clear Session
          </Button>
        </Group>
        
        {/* Error Display */}
        {error && (
          <Alert color="red" mb="lg">
            {error}
          </Alert>
        )}
        
        {/* 3D or 2D View based on selected mode */}
        <Box style={{ flex: 1, overflow: 'hidden' }}>
          {file && (
            <>
              {viewMode === '3d' ? (
                <>
                  <Box 
                    style={{ 
                      position: 'relative', 
                      width: '100%', 
                      height: '100%',
                      zIndex: 10, 
                      minHeight: '400px',
                      pointerEvents: 'auto'
                    }}
                  >
                    <StlViewer3D
                      stlFile={file}
                      layers={layers}
                      axis={axis}
                      layerThickness={layerThickness}
                      activeLayerIndex={previewLayerIndex}
                    />
                    
                    {/* Move the instructions to the top right corner */}
                    <Box 
                      style={{ 
                        position: 'absolute',
                        top: '0.5rem',
                        right: '0.5rem',
                        padding: '0.5rem',
                        backgroundColor: '#e7f5ff',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                        border: '1px solid #74c0fc',
                        maxWidth: '250px',
                        opacity: 0.85,
                        zIndex: 20
                      }}
                    >
                      <Text size="xs" fw={500}>3D Controls:</Text>
                      <Box component="ul" style={{ listStyleType: 'disc', paddingLeft: '1rem', marginTop: '0.25rem' }}>
                        <li>Drag to rotate</li>
                        <li>Scroll to zoom</li>
                        <li>Shift+drag to pan</li>
                      </Box>
                    </Box>
                  </Box>
                </>
              ) : (
                layers.length > 0 && (
                  <Box style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Group justify="space-between" align="center" mb="sm">
                      <Text fw={500}>
                        2D Layer Preview: {previewLayerIndex + 1} / {layers.length}
                      </Text>
                      <Group gap="xs">
                        <Button
                          onClick={() => handleZoomChange('out')}
                          variant="outline"
                          size="sm"
                          title="Zoom Out"
                        >
                          <span className="text-lg">−</span>
                        </Button>
                        <Button
                          onClick={handleZoomReset}
                          variant="outline"
                          size="sm"
                          title="Reset Zoom"
                        >
                          <span className="text-xs">Reset</span>
                        </Button>
                        <Button
                          onClick={handleFitToView}
                          variant="outline"
                          size="sm"
                          title="Fit to View"
                        >
                          <span className="text-xs">Fit</span>
                        </Button>
                        <Button
                          onClick={() => handleZoomChange('in')}
                          variant="outline"
                          size="sm"
                          title="Zoom In"
                        >
                          <span className="text-lg">+</span>
                        </Button>
                        <Text size="xs" c="dimmed" ml="sm">
                          {Math.round(zoomLevel * 100)}%
                        </Text>
                      </Group>
                    </Group>
                    <Box style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: '400px', width: '100%', height: '100%' }}>
                      <canvas
                        ref={canvasRef}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          border: '1px solid #dee2e6', 
                          borderRadius: '0.375rem', 
                          backgroundColor: 'white',
                          display: 'block',
                          position: 'absolute',
                          top: 0,
                          left: 0
                        }}
                      />
                    </Box>
                  </Box>
                )
              )}
            </>
          )}
        </Box>
        
        {/* Layer Navigation - Positioned below the canvas */}
        {layers.length > 0 && (
          <Box mt="md" pt="md" style={{ borderTop: '1px solid #dee2e6' }}>
            <Text fw={500} mb="sm">
              Navigate Layers: {previewLayerIndex + 1} / {layers.length}
            </Text>
            <Group gap="md" align="center" mb="md">
              <Button
                onClick={() => setPreviewLayerIndex(Math.max(0, previewLayerIndex - 1))}
                disabled={previewLayerIndex === 0}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              
              <Slider
                min={0}
                max={layers.length - 1}
                value={previewLayerIndex}
                onChange={setPreviewLayerIndex}
                style={{ flex: 1 }}
              />
              
              <Button
                onClick={() => setPreviewLayerIndex(Math.min(layers.length - 1, previewLayerIndex + 1))}
                disabled={previewLayerIndex === layers.length - 1}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </Group>
          </Box>
        )}
      </Box>
    </Flex>
  );
}

// Dynamic import wrapper to prevent hydration errors
const StlSlicer = dynamic(
  () => Promise.resolve(StlSlicerContent),
  {
    ssr: false,
    loading: () => (
      <Box h="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack align="center" gap="sm">
          <Loader size="lg" />
          <Text>Loading STL Slicer...</Text>
        </Stack>
      </Box>
    ),
  }
);

export default StlSlicer;