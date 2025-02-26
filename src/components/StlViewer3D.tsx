'use client';

import { useEffect, useRef, useState } from 'react';
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

// Explicitly defining the component as a named function for better debugging
function StlViewer3D({ 
  stlFile, 
  layers, 
  axis, 
  layerThickness,
  activeLayerIndex 
}: StlViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Mesh | null>(null);
  const slicePlanesRef = useRef<THREE.Mesh[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [modelDimensions, setModelDimensions] = useState<{ width: number; height: number; depth: number } | null>(null);
  const [hasWebGLError, setHasWebGLError] = useState(false);

  // Initialize the 3D scene
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;
    
    try {
      console.log('Initializing 3D scene');
      const container = containerRef.current;
      
      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf0f0f0);
      sceneRef.current = scene;
      
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0x888888);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(1, 1, 1);
      scene.add(directionalLight);
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75, 
        container.clientWidth / container.clientHeight, 
        0.1, 
        1000
      );
      camera.position.set(10, 10, 10);
      cameraRef.current = camera;
      
      // Create renderer directly with the container DOM element
      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
      });
      
      // Setup renderer
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      
      // Clear any existing children
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
      // Add the renderer canvas to DOM
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;
      
      console.log('Renderer created and added to DOM');
      
      // Add orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      
      // Configure controls with optimal settings for interaction
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.screenSpacePanning = true;
      controls.enableRotate = true;
      controls.rotateSpeed = 0.7;
      controls.enableZoom = true;
      controls.zoomSpeed = 0.9;
      controls.enablePan = true;
      controls.panSpeed = 0.5;
      controls.minDistance = 0.1;
      controls.maxDistance = 500;
      controls.target.set(0, 0, 0);
      
      // Force an update to apply settings
      controls.update();
      
      // Store controls reference
      controlsRef.current = controls;
      
      // Log control events for debugging
      renderer.domElement.addEventListener('pointerdown', () => {
        console.log('Pointer down - controls enabled:', controls.enabled);
      });
      
      renderer.domElement.addEventListener('pointermove', (e) => {
        if (e.buttons > 0 && Math.random() < 0.05) {
          console.log('Dragging with buttons:', e.buttons);
        }
      });
      
      console.log('OrbitControls initialized');
      
      // Add grid for reference
      const gridHelper = new THREE.GridHelper(20, 20);
      scene.add(gridHelper);
      
      // Add axes helper
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
      
      // Animation loop
      const animate = () => {
        animationFrameRef.current = requestAnimationFrame(animate);
        
        if (controlsRef.current) {
          controlsRef.current.update();
        }
        
        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }
      };
      
      // Start animation
      animate();
      
      // Handle resize
      const handleResize = () => {
        if (!cameraRef.current || !rendererRef.current || !containerRef.current) return;
        
        const container = containerRef.current;
        cameraRef.current.aspect = container.clientWidth / container.clientHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(container.clientWidth, container.clientHeight);
      };
      
      window.addEventListener('resize', handleResize);
      setIsInitialized(true);
      
      // Force a resize after initialization to ensure correct dimensions
      setTimeout(handleResize, 100);
      
      // Cleanup
      return () => {
        console.log('Cleaning up 3D scene');
        window.removeEventListener('resize', handleResize);
        
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        
        if (rendererRef.current) {
          rendererRef.current.dispose();
        }
        
        // Dispose all resources
        if (modelRef.current?.geometry) {
          modelRef.current.geometry.dispose();
        }
        
        slicePlanesRef.current.forEach(plane => {
          if (plane.geometry) plane.geometry.dispose();
          if (plane.material) {
            if (Array.isArray(plane.material)) {
              plane.material.forEach(m => m.dispose());
            } else {
              plane.material.dispose();
            }
          }
        });
      };
    } catch (error) {
      console.error('Error initializing 3D scene:', error);
      setHasWebGLError(true);
    }
  }, [isInitialized]);
  
  // Load STL file
  useEffect(() => {
    if (!isInitialized || !stlFile || !sceneRef.current) return;
    
    // Show loading message in console
    console.log('Loading STL file:', stlFile.name);
    
    // Remove previous model if it exists
    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current);
      if (modelRef.current.geometry) {
        modelRef.current.geometry.dispose();
      }
      if (modelRef.current.material) {
        if (Array.isArray(modelRef.current.material)) {
          modelRef.current.material.forEach(m => m.dispose());
        } else {
          modelRef.current.material.dispose();
        }
      }
      modelRef.current = null;
    }
    
    const loader = new STLLoader();
    const reader = new FileReader();
    
    reader.onload = (event) => {
      if (event.target?.result && sceneRef.current) {
        try {
          console.log('Parsing STL data...');
          const geometry = loader.parse(event.target.result as ArrayBuffer);
          
          // Create a mesh with semi-transparent material
          const material = new THREE.MeshPhongMaterial({
            color: 0x00abff,
            specular: 0x111111,
            shininess: 200,
            opacity: 0.8,
            transparent: true,
            side: THREE.DoubleSide
          });
          
          const mesh = new THREE.Mesh(geometry, material);
          
          // Center the model
          geometry.computeBoundingBox();
          const boundingBox = geometry.boundingBox!;
          const center = new THREE.Vector3();
          boundingBox.getCenter(center);
          mesh.position.set(-center.x, -center.y, -center.z);
          
          // Calculate model dimensions
          const size = new THREE.Vector3();
          boundingBox.getSize(size);
          setModelDimensions({
            width: size.x,
            height: size.y,
            depth: size.z
          });
          
          // Add the model to the scene
          console.log('Adding model to scene');
          sceneRef.current.add(mesh);
          modelRef.current = mesh;
          
          // Position camera to view the whole model
          if (cameraRef.current && controlsRef.current) {
            const maxDimension = Math.max(size.x, size.y, size.z);
            const distance = maxDimension * 2;
            
            // Position camera at a good viewing angle
            cameraRef.current.position.set(distance, distance, distance);
            
            // Set the orbit controls to target the center of the model
            controlsRef.current.target.set(0, 0, 0);
            
            // Ensure the orbital controls are updated after changing the target
            controlsRef.current.update();
            
            console.log('Camera positioned at', cameraRef.current.position);
            console.log('Controls targeting', controlsRef.current.target);
          }
          
          // Force a render
          if (rendererRef.current && sceneRef.current && cameraRef.current) {
            rendererRef.current.render(sceneRef.current, cameraRef.current);
          }
        } catch (error) {
          console.error('Error parsing STL file:', error);
        }
      }
    };
    
    reader.onerror = (error) => {
      console.error('Error reading STL file:', error);
    };
    
    reader.readAsArrayBuffer(stlFile);
  }, [stlFile, isInitialized]);
  
  // Update slicing visualization when layers or active layer changes
  useEffect(() => {
    if (!isInitialized || !sceneRef.current || !modelDimensions) return;
    
    // Remove previous slice planes
    slicePlanesRef.current.forEach(plane => {
      if (sceneRef.current) {
        sceneRef.current.remove(plane);
      }
    });
    slicePlanesRef.current = [];
    
    if (layers.length === 0) return;
    
    const scene = sceneRef.current;
    
    // Determine max model dimensions for creating slice planes
    const { width, height, depth } = modelDimensions;
    const maxDimension = Math.max(width, height, depth) * 1.5;
    
    // Create a plane geometry based on the model size and slicing axis
    let planeGeometry: THREE.PlaneGeometry;
    if (axis === 'x') {
      planeGeometry = new THREE.PlaneGeometry(maxDimension, maxDimension);
      planeGeometry.rotateY(Math.PI / 2);
    } else if (axis === 'y') {
      planeGeometry = new THREE.PlaneGeometry(maxDimension, maxDimension);
      planeGeometry.rotateX(Math.PI / 2);
    } else {
      planeGeometry = new THREE.PlaneGeometry(maxDimension, maxDimension);
    }
    
    // Highlight the active layer and show a few layers around it
    const displayRange = 5; // Number of planes to show before and after active layer
    const startIdx = Math.max(0, activeLayerIndex - displayRange);
    const endIdx = Math.min(layers.length - 1, activeLayerIndex + displayRange);
    
    for (let i = startIdx; i <= endIdx; i++) {
      const layer = layers[i];
      const isActive = i === activeLayerIndex;
      
      // Create material for slice plane
      const material = new THREE.MeshBasicMaterial({
        color: isActive ? 0xff5500 : 0x00ff00,
        opacity: isActive ? 0.7 : 0.3,
        transparent: true,
        side: THREE.DoubleSide,
        wireframe: false,
      });
      
      const planeMesh = new THREE.Mesh(planeGeometry.clone(), material);
      
      // Position the plane based on layer position
      if (axis === 'x') {
        planeMesh.position.x = layer.z;
      } else if (axis === 'y') {
        planeMesh.position.y = layer.z;
      } else {
        planeMesh.position.z = layer.z;
      }
      
      scene.add(planeMesh);
      slicePlanesRef.current.push(planeMesh);
    }
  }, [layers, activeLayerIndex, axis, isInitialized, modelDimensions]);
  
  return (
    <div 
      ref={containerRef} 
      className="w-full h-[400px] border rounded-md bg-gray-100 three-container"
      style={{ 
        position: 'relative'
      }}
      tabIndex={0} // Make sure the container can receive focus for keyboard events
    >
      {hasWebGLError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-600 p-4">
          WebGL not supported or error initializing renderer. Try using a different browser.
        </div>
      )}
      
      {!stlFile && !hasWebGLError && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          Load an STL file to view the 3D model
        </div>
      )}

      {stlFile && isInitialized && (
        <div className="absolute bottom-2 right-2 bg-white/75 px-2 py-1 text-xs rounded shadow">
          Drag to rotate | Scroll to zoom | Shift+drag to pan
        </div>
      )}
    </div>
  );
}

// Export the component as both default and named export
export { StlViewer3D };
export default StlViewer3D; 