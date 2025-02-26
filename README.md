# STL Slicer Application

A web application that loads STL files, slices them into layers, and exports the layers as SVG files for cutting on a laser cutter. The app features both 3D and 2D visualization of the model and its slices.

## Screenshots

<img width="1915" alt="Image" src="https://github.com/user-attachments/assets/f36d1255-7368-42c4-8e4d-93ab2c61e459" />

---

<img width="1910" alt="Image" src="https://github.com/user-attachments/assets/c382f6b7-e64a-457a-a7e0-ebc32d5348e7" />

## Features

- **File Import**: Load STL files from your local system
- **3D Visualization**: View your 3D model with interactive camera controls
- **Slice Visualization**: See the slice planes in the 3D view to understand how the model is being sliced
- **Axis Selection**: Choose the slicing axis (X, Y, or Z)
- **Layer Thickness**: Set the thickness of each slice using a slider or input field
- **Slicing Algorithm**: Process 3D STL models to generate 2D layers
- **Layer Preview**: Visualize individual slices in both 3D and 2D views
- **SVG Export**: Export each layer as a separate SVG file in a ZIP archive

## Technologies Used

- **Next.js**: React framework for the application
- **TypeScript**: For type-safe code
- **Three.js**: For 3D geometry processing and visualization
- **JSZip**: For creating ZIP archives with multiple SVG files
- **Tailwind CSS**: For styling the UI

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Run the development server:
   ```
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Use

1. Click the file input to select an STL file from your computer
2. The 3D model will be displayed in the viewer (you can rotate, pan, and zoom using the mouse)
3. Select the slicing axis (X, Y, or Z)
4. Adjust the layer thickness using the slider or input field
5. Click "Slice Model" to process the 3D model
6. Toggle between 3D and 2D views to visualize the slices
7. Use the layer navigation controls to browse through the slices
8. Click "Export SVG Layers" to download all layers as SVG files in a ZIP archive

## How it Works

The application uses Three.js to parse and process STL files. The slicing algorithm works by:

1. Loading the STL file and creating a 3D mesh
2. Visualizing the 3D model with interactive controls
3. Generating slice planes perpendicular to the selected axis at intervals defined by the layer thickness
4. Finding intersections between the mesh triangles and each slice plane
5. Converting these intersections into 2D paths
6. Rendering the paths on a canvas for 2D preview and showing slice planes in the 3D view
7. Generating SVG files with the path data for export

## License

MIT
