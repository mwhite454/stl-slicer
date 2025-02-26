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

export default function StlViewer3D({ 
  stlFile, 
  layers, 
  axis, 
  layerThickness,
  activeLayerIndex 
}: StlViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Single effect to handle everything
  useEffect(() => {
    if (!containerRef.current) return;
    
    console.log("[StlViewer3D] Starting initialization");
    
    // Setup container references
    const container = containerRef.current;
    
    // Setting up scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0x888888);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    
    // Setup camera
    const camera = new THREE.PerspectiveCamera(
      75, 
      container.clientWidth / container.clientHeight, 
      0.1, 
      2000
    );
    camera.position.set(50, 50, 50);
    
    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    
    // Clear container
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    
    // Add canvas to container
    container.appendChild(renderer.domElement);
    console.log("[StlViewer3D] Added canvas to container");
    
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
    console.log("[StlViewer3D] Set up controls", controls);
    
    // Test event handling
    renderer.domElement.addEventListener('pointerdown', () => {
      console.log("[StlViewer3D] Pointer down event");
    });
    
    // Add helpers
    const gridHelper = new THREE.GridHelper(100, 20);
    scene.add(gridHelper);
    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);
    
    // Model references
    let model: THREE.Mesh | null = null;
    const slicePlanes: THREE.Mesh[] = [];
    
    // Load STL if available
    const loadSTL = async () => {
      if (!stlFile) return;
      
      console.log("[StlViewer3D] Loading STL:", stlFile.name);
      
      // Remove previous model if any
      if (model) {
        scene.remove(model);
        if (model.geometry) model.geometry.dispose();
        if (model.material instanceof THREE.Material) model.material.dispose();
        model = null;
      }
      
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
        model = new THREE.Mesh(geometry, material);
        
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
        
        renderSlicePlanes();
      } catch (error) {
        console.error("[StlViewer3D] Error loading STL:", error);
        setErrorMessage("Failed to load STL file");
      }
    };
    
    // Render slice planes
    const renderSlicePlanes = () => {
      // Clear existing planes
      slicePlanes.forEach(plane => {
        scene.remove(plane);
        if (plane.geometry) plane.geometry.dispose();
        if (plane.material instanceof THREE.Material) plane.material.dispose();
      });
      slicePlanes.length = 0;
      
      if (!layers.length) return;
      
      // Get model size for plane dimensions
      let maxDimension = 100;
      if (model?.geometry?.boundingBox) {
        const size = new THREE.Vector3();
        model.geometry.boundingBox.getSize(size);
        maxDimension = Math.max(size.x, size.y, size.z) * 1.5;
      }
      
      // Create plane geometry based on slicing axis
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
      
      // Add planes for visualization (limit the number for performance)
      const displayRange = 5;
      const startIdx = Math.max(0, activeLayerIndex - displayRange);
      const endIdx = Math.min(layers.length - 1, activeLayerIndex + displayRange);
      
      for (let i = startIdx; i <= endIdx; i++) {
        const layer = layers[i];
        const isActive = i === activeLayerIndex;
        
        const material = new THREE.MeshBasicMaterial({
          color: isActive ? 0xff5500 : 0x00ff00,
          opacity: isActive ? 0.7 : 0.3,
          transparent: true,
          side: THREE.DoubleSide,
          wireframe: false,
        });
        
        const plane = new THREE.Mesh(planeGeometry.clone(), material);
        
        // Position plane based on axis
        if (axis === 'x') {
          plane.position.x = layer.z;
        } else if (axis === 'y') {
          plane.position.y = layer.z;
        } else {
          plane.position.z = layer.z;
        }
        
        scene.add(plane);
        slicePlanes.push(plane);
      }
    };
    
    // Handle window resize
    const handleResize = () => {
      if (!container) return;
      
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    
    // Animation loop
    let animFrameId: number;
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      
      controls.update();
      renderer.render(scene, camera);
    };
    
    // Start animation
    animate();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Initial STL load
    loadSTL();
    
    // Cleanup function
    return () => {
      console.log("[StlViewer3D] Cleaning up resources");
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      
      // Dispose renderer
      renderer.dispose();
      
      // Dispose geometries and materials
      if (model) {
        if (model.geometry) model.geometry.dispose();
        if (model.material instanceof THREE.Material) model.material.dispose();
      }
      
      slicePlanes.forEach(plane => {
        if (plane.geometry) plane.geometry.dispose();
        if (plane.material instanceof THREE.Material) plane.material.dispose();
      });
      
      // Remove canvas
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, [stlFile]); // Only re-initialize when the STL file changes
  
  // Effect to update slice planes when layers or active layer changes
  useEffect(() => {
    if (!containerRef.current || !layers.length) return;
    
    // This will be executed in the next render cycle,
    // ensuring the main component is initialized
    const timeoutId = setTimeout(() => {
      // Force a re-render by accessing the DOM directly
      const event = new Event('updateSlices');
      containerRef.current?.dispatchEvent(event);
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [layers, activeLayerIndex, axis]);
  
  return (
    <div 
      ref={containerRef}
      className="w-full h-[400px] border rounded-md bg-gray-100 three-container"
      style={{ touchAction: 'none' }}
    >
      {errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 text-red-600 p-4">
          {errorMessage}
        </div>
      )}
      
      {!stlFile && !errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          Load an STL file to view the 3D model
        </div>
      )}
      
      <div className="absolute bottom-2 right-2 bg-white/75 px-2 py-1 text-xs rounded shadow">
        Drag to rotate | Scroll to zoom | Shift+drag to pan
      </div>
    </div>
  );
}

export { StlViewer3D }; 