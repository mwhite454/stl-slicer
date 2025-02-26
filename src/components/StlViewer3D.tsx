'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Axis, LayerData } from '../utils/StlSlicer';

interface StlViewer3DProps {
  stlFile: File | null;
  layers: LayerData[];
  axis: Axis;
  layerThickness: number;
  activeLayerIndex: number;
}

export default function StlViewer3D({ 
  stlFile, 
  layers, 
  axis, 
  layerThickness,
  activeLayerIndex 
}: StlViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const gridHelperRef = useRef<THREE.GridHelper | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSlicePlanes, setShowSlicePlanes] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAllSlices, setShowAllSlices] = useState<boolean>(false);
  const initRef = useRef<boolean>(false);  // Use ref instead of state to avoid re-renders
  
  // Initialize the Three.js scene, camera, and renderer
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current || initRef.current) return;
    
    try {
      console.log("[StlViewer3D] Starting initialization");
      
      // Setting up scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;
      
      // Add lights
      const ambientLight = new THREE.AmbientLight(0x888888);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Setup camera
      const canvas = canvasRef.current;
      const width = canvas.clientWidth || 300;  // Fallback width if clientWidth is 0
      const height = canvas.clientHeight || 200;  // Fallback height if clientHeight is 0
      
      const camera = new THREE.PerspectiveCamera(
        75, 
        width / height, 
        0.1, 
        2000
      );
      camera.position.set(50, 50, 50);
      cameraRef.current = camera;
      
      // Setup renderer
      const renderer = new THREE.WebGLRenderer({ 
        canvas,
        antialias: true,
        alpha: true,
      });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(width, height);
      rendererRef.current = renderer;
      
      // Setup orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 0.6;
      controls.panSpeed = 0.5;
      controls.zoomSpeed = 0.8;
      controls.screenSpacePanning = true;
      controls.minDistance = 1;
      controls.maxDistance = 1000;
      controls.target.set(0, 0, 0);
      controls.update();
      controlsRef.current = controls;
      console.log("[StlViewer3D] Set up controls", controls);
      
      // Test event handling
      renderer.domElement.addEventListener('pointerdown', () => {
        console.log("[StlViewer3D] Pointer down event");
      });
      
      // Add helpers
      const gridHelper = new THREE.GridHelper(100, 20);
      gridHelper.position.y = -20;
      gridHelper.userData = { isHelper: true };
      scene.add(gridHelper);
      gridHelperRef.current = gridHelper;
      
      const axesHelper = new THREE.AxesHelper(10);
      axesHelper.userData = { isHelper: true };
      scene.add(axesHelper);
      
      // Handle window resize
      const handleResize = () => {
        if (!containerRef.current || !canvasRef.current || !renderer || !camera) return;
        
        const canvas = canvasRef.current;
        const width = canvas.clientWidth || 300;
        const height = canvas.clientHeight || 200;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      
      // Animation loop
      let animFrameId: number;
      const animate = () => {
        animFrameId = requestAnimationFrame(animate);
        
        if (controls) controls.update();
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      };
      
      // Start animation
      animate();
      
      // Add resize listener
      window.addEventListener('resize', handleResize);
      
      // Mark as initialized using ref (not state)
      initRef.current = true;
      
      // Cleanup function
      return () => {
        console.log("[StlViewer3D] Cleaning up resources");
        cancelAnimationFrame(animFrameId);
        window.removeEventListener('resize', handleResize);
        
        // Clear references
        sceneRef.current = null;
        rendererRef.current = null;
        cameraRef.current = null;
        controlsRef.current = null;
        gridHelperRef.current = null;
        
        // Dispose renderer
        if (renderer) renderer.dispose();
        
        initRef.current = false;
      };
    } catch (error) {
      console.error("[StlViewer3D] Error initializing:", error);
      setErrorMessage("Failed to initialize 3D viewer");
    }
  }, []); // Empty dependency array since we're using ref for initialization status
  
  // Load STL file when it changes
  useEffect(() => {
    if (!initRef.current || !stlFile || !sceneRef.current) return;
    
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    
    if (!scene || !camera || !controls) return;
    
    const loadSTL = async () => {
      console.log("[StlViewer3D] Loading STL:", stlFile.name);
      
      // Remove previous model
      const existingModels = scene.children.filter(
        child => child instanceof THREE.Mesh && 
        !(child.userData && (child.userData.isSlicePlane || child.userData.isHelper))
      );
      
      existingModels.forEach(model => {
        scene.remove(model);
        if ((model as THREE.Mesh).geometry) (model as THREE.Mesh).geometry.dispose();
        if ((model as THREE.Mesh).material instanceof THREE.Material) {
          ((model as THREE.Mesh).material as THREE.Material).dispose();
        }
      });
      
      try {
        // Read file
        const arrayBuffer = await stlFile.arrayBuffer();
        
        // Parse STL
        const loader = new STLLoader();
        const geometry = loader.parse(arrayBuffer);
        
        // Create material
        const material = new THREE.MeshPhongMaterial({
          color: 0x00abff,
          specular: 0x111111,
          shininess: 200,
          opacity: 0.8,
          transparent: true,
          side: THREE.DoubleSide,
        });
        
        // Create mesh
        const model = new THREE.Mesh(geometry, material);
        
        // Center model
        geometry.computeBoundingBox();
        const boundingBox = geometry.boundingBox!;
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        model.position.set(-center.x, -center.y, -center.z);
        
        // Add to scene
        scene.add(model);
        console.log("[StlViewer3D] Model added to scene");
        
        // Adjust camera position based on model size
        const size = new THREE.Vector3();
        boundingBox.getSize(size);
        const maxDimension = Math.max(size.x, size.y, size.z);
        const optimalDistance = maxDimension * 2;
        camera.position.set(
          optimalDistance, 
          optimalDistance, 
          optimalDistance
        );
        controls.target.set(0, 0, 0);
        controls.update();
        
        // Call once after loading
        renderSlicePlanes();
      } catch (error) {
        console.error("[StlViewer3D] Error loading STL:", error);
        setErrorMessage("Failed to load STL file");
      }
    };
    
    loadSTL();
  }, [stlFile]); // Only depend on stlFile, not initialized state
  
  // Function to render slice planes
  const renderSlicePlanes = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene || !layers.length) return;
    
    // Remove existing slice planes from the scene
    const existingPlanes = scene.children.filter((child: THREE.Object3D) => 
      child.userData && child.userData.isSlicePlane);
    
    existingPlanes.forEach((plane: THREE.Object3D) => {
      scene.remove(plane);
      if ((plane as THREE.Mesh).geometry) (plane as THREE.Mesh).geometry.dispose();
      if ((plane as THREE.Mesh).material instanceof THREE.Material) 
        ((plane as THREE.Mesh).material as THREE.Material).dispose();
    });
    
    // Don't create new planes if we're not showing them
    if (!showSlicePlanes) return;
    
    // Find all meshes that are actual model parts (not helpers or slice planes)
    const modelMeshes = scene.children.filter((child: THREE.Object3D) => 
      child instanceof THREE.Mesh && 
      !(child.userData && (child.userData.isSlicePlane || child.userData.isHelper)));
    
    if (modelMeshes.length === 0) return;
    
    // Get the model bounding box to determine proper plane size and position
    const modelBounds = new THREE.Box3();
    modelMeshes.forEach((mesh: THREE.Object3D) => {
      const meshBounds = new THREE.Box3().setFromObject(mesh);
      modelBounds.union(meshBounds);
    });
    
    const modelSize = new THREE.Vector3();
    modelBounds.getSize(modelSize);
    
    // Get the model min and max for correct slice positioning
    const modelMin = modelBounds.min;
    const modelMax = modelBounds.max;
    console.log("[StlViewer3D] Model bounds:", { min: modelMin, max: modelMax });
    
    // Make the planes slightly larger than the model
    const planeWidth = Math.max(modelSize.x, modelSize.z) * 1.2;
    const planeHeight = Math.max(modelSize.y, modelSize.z) * 1.2;
    const planeDepth = Math.max(modelSize.x, modelSize.y) * 1.2;
    
    // Create plane geometry based on slicing axis
    let planeGeometry: THREE.PlaneGeometry;
    
    if (axis === 'x') {
      planeGeometry = new THREE.PlaneGeometry(planeHeight, planeDepth);
      planeGeometry.rotateY(Math.PI / 2);
    } else if (axis === 'y') {
      planeGeometry = new THREE.PlaneGeometry(planeWidth, planeDepth);
      planeGeometry.rotateX(Math.PI / 2);
    } else { // z-axis
      planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    }
    
    // Calculate the model's start and end position along the current axis
    let axisStart, axisEnd;
    if (axis === 'x') {
      axisStart = modelMin.x;
      axisEnd = modelMax.x;
    } else if (axis === 'y') {
      axisStart = modelMin.y;
      axisEnd = modelMax.y;
    } else { // z-axis
      axisStart = modelMin.z;
      axisEnd = modelMax.z;
    }
    
    console.log("[StlViewer3D] Axis range:", { start: axisStart, end: axisEnd });
    console.log("[StlViewer3D] Layers count:", layers.length);
    
    // Determine which layers to render based on user preference
    let startIdx, endIdx;
    
    if (showAllSlices) {
      // Show all layers when "show all slices" is active
      startIdx = 0;
      endIdx = layers.length - 1;
    } else {
      // Otherwise limit to display range for performance
      const displayRange = 5;
      startIdx = Math.max(0, activeLayerIndex - displayRange);
      endIdx = Math.min(layers.length - 1, activeLayerIndex + displayRange);
    }
    
    for (let i = startIdx; i <= endIdx; i++) {
      const layer = layers[i];
      const isActive = i === activeLayerIndex;
      
      // Calculate the normalized position (0 to 1) within the model
      const normalizedPos = layers.length > 1 
        ? i / (layers.length - 1) 
        : 0.5;
        
      // Calculate the actual position in scene coordinates
      const layerPosition = axisStart + normalizedPos * (axisEnd - axisStart);
      
      console.log(`[StlViewer3D] Layer ${i}: nominal z=${layer.z}, actual pos=${layerPosition}`);
      
      const material = new THREE.MeshBasicMaterial({
        color: isActive ? 0xff5500 : 0x00ff00,
        opacity: isActive ? 0.7 : 0.3,
        transparent: true,
        side: THREE.DoubleSide,
        wireframe: false,
      });
      
      const plane = new THREE.Mesh(planeGeometry.clone(), material);
      // Mark this as a slice plane for easy identification
      plane.userData = { isSlicePlane: true };
      
      // Position plane based on axis and the calculated position
      if (axis === 'x') {
        plane.position.x = layerPosition;
      } else if (axis === 'y') {
        plane.position.y = layerPosition;
      } else {
        plane.position.z = layerPosition;
      }
      
      scene.add(plane);
    }
    
    // Trigger a render
    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.render(scene, cameraRef.current);
    }
  }, [layers, activeLayerIndex, axis, showSlicePlanes, showAllSlices]);
  
  // Effect to update slice planes when layers, active layer, or axis changes
  useEffect(() => {
    if (initRef.current && sceneRef.current) {
      renderSlicePlanes();
    }
  }, [renderSlicePlanes]);
  
  // Toggle for showing/hiding slice planes
  const toggleSlicePlanes = useCallback(() => {
    setShowSlicePlanes(prev => !prev);
  }, []);
  
  // Toggle for showing/hiding grid
  const toggleGrid = useCallback(() => {
    setShowGrid(prev => !prev);
  }, []);
  
  // Toggle for showing all slices vs display range
  const toggleAllSlices = useCallback(() => {
    setShowAllSlices(prev => !prev);
  }, []);
  
  // Effect to update grid visibility when showGrid changes
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = showGrid;
      if (rendererRef.current && cameraRef.current && sceneRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    }
  }, [showGrid]);
  
  return (
    <div 
      ref={containerRef}
      className="w-full h-[400px] border rounded-md bg-gray-100 three-container relative"
      style={{ touchAction: 'none' }}
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
      
      {errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-600 p-4 z-10">
          {errorMessage}
        </div>
      )}
      
      {!stlFile && !errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 z-10">
          Load an STL file to view the 3D model
        </div>
      )}
      
      <div className="absolute top-2 right-2 flex flex-col gap-2 z-20">
        <button 
          onClick={toggleSlicePlanes}
          className={`px-2 py-1 text-xs rounded shadow ${showSlicePlanes ? 'bg-blue-500 text-white' : 'bg-white/75 text-gray-700'}`}
        >
          {showSlicePlanes ? 'Hide Slices' : 'Show Slices'}
        </button>
        {showSlicePlanes && (
          <button 
            onClick={toggleAllSlices}
            className={`px-2 py-1 text-xs rounded shadow ${showAllSlices ? 'bg-green-500 text-white' : 'bg-white/75 text-gray-700'}`}
          >
            {showAllSlices ? 'Show Range Only' : 'Show All Slices'}
          </button>
        )}
        <button 
          onClick={toggleGrid}
          className={`px-2 py-1 text-xs rounded shadow ${showGrid ? 'bg-blue-500 text-white' : 'bg-white/75 text-gray-700'}`}
        >
          {showGrid ? 'Hide Grid' : 'Show Grid'}
        </button>
      </div>
      
      {/* Layer information display */}
      {layers.length > 0 && showSlicePlanes && (
        <div className="absolute top-2 left-2 bg-white/75 px-2 py-1 text-xs rounded shadow z-20">
          Layer: {activeLayerIndex + 1}/{layers.length} 
          {layers[activeLayerIndex] && ` — Height: ${layers[activeLayerIndex].z.toFixed(2)}mm`}
        </div>
      )}
      
      <div className="absolute bottom-2 right-2 bg-white/75 px-2 py-1 text-xs rounded shadow z-20">
        Drag to rotate | Scroll to zoom | Shift+drag to pan
      </div>
    </div>
  );
}

export { StlViewer3D }; 