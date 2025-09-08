# Upload → Axis Select → 2D View

```mermaid
sequenceDiagram
  participant U as User
  participant UI as Root Page StlSlicer
  participant Adapter as slicing/adapter sliceToMakerModels
  participant Core as slicing/core
  participant Plane as slicing/plane
  participant Pure as slicing/pure
  participant Meta as slicing/metadata
  participant Store as workspaceStore Zustand
  participant View as WorkspaceStage 2D
  participant Exporter as makerjs exporter

  U->>UI: Upload STL file
  UI->>Core: parseStl(file)
  Core-->>UI: SlicerState geometry + boundingBox

  U->>UI: Choose axis and layer thickness
  UI->>Adapter: sliceToMakerModels(file, axis, thickness)

  Adapter->>Core: sliceGeometry(state, axis, thickness)
  Core->>Plane: planeFromAxis + axisMapForPlane
  Core->>Pure: pathsUVToMakerModel(pathsUV)
  Core->>Pure: measureUVExtents(model)
  Core-->>Adapter: makerJsModels[], layers[]

  Adapter->>Meta: buildSliceLayerMetadata(axis, makerJsModel)
  Adapter-->>UI: models + enriched layers + labels

  UI->>Store: addMultipleSliceLayers(models, metadata)

  U->>UI: Switch to 2D View
  UI->>View: Render 2D workspace

  View->>Store: read items, selection, mm per px
  View->>Exporter: makerjs exporter toSVGPathData
  View-->>U: 2D slices rendered with labels
```

## Clickable Legend

```mermaid
flowchart LR
  UI[Root Page StlSlicer]
  Adapter[slicing/adapter sliceToMakerModels]
  Core[slicing/core]
  Plane[slicing/plane]
  Pure[slicing/pure]
  Meta[slicing/metadata]
  Store[workspaceStore Zustand]
  View[WorkspaceStage 2D]
  Exporter[makerjs exporter]

  classDef link fill:#eef,stroke:#66f,stroke-width:1px,cursor:pointer;
  class UI,Adapter,Core,Plane,Pure,Meta,Store,View,Exporter link;

  click UI "/dev/ui-stl-slicer" "StlSlicer: Root UI orchestration"
  click Adapter "/dev/slicing-adapter" "Adapter: STL → MakerJS models with metadata"
  click Core "/dev/slicing-core" "Core: parse and slice geometry"
  click Plane "/dev/slicing-plane" "Plane: axis mapping and UV"
  click Pure "/dev/slicing-pure" "Pure: UV → MakerJS utilities"
  click Meta "/dev/slicing-metadata" "Metadata: layer plane/axis/extents"
  click Store "/dev/workspace-store" "Zustand workspace store"
  click View "/dev/workspace-stage-2d" "WorkspaceStage: 2D renderer"
  click Exporter "/dev/makerjs-exporter" "MakerJS exporter usage"
```

## File References
- `src/components/StlSlicer.tsx` (root UI flow)
- `src/slicing/adapter.ts` (`sliceToMakerModels`)
- `src/slicing/core.ts` (`parseStl`, `sliceGeometry`)
- `src/slicing/plane.ts` (projection plane and axis map)
- `src/slicing/pure.ts` (UV to MakerJS model and extents)
- `src/slicing/metadata.ts` (layer metadata)
- `src/components/workspace/WorkspaceStage.tsx` (2D renderer)
- `src/store/workspaceStore` (Zustand store)
