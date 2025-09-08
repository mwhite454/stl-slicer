# Slicing Module Flow

This document describes the flow of the slicing pipeline across files in `src/slicing/` and related utilities.

```mermaid
flowchart TD
  %% Entry point
  A["adapter.ts<br/>sliceToMakerModels(file, axis, layerThickness)"] --> B["core.ts<br/>parseStl(file) → SlicerState"]

  %% Core slicing
  A --> C["core.ts<br/>sliceGeometry(state, axis, layerThickness)"]
  C --> C1["plane.ts<br/>planeFromAxis(axis)"]
  C --> C2["plane.ts<br/>axisMapForPlane(plane)"]
  C --> C3["collectSegmentsAt(state, axis, k)"]
  C3 --> C4["sliceTriangleAt(a,b,c, axis, k)"]
  C --> C5["pure.ts<br/>pathsUVToMakerModel(pathsUV, i)"]
  C --> C6["pure.ts<br/>measureUVExtents(model)"]

  %% Metadata enrichment
  A --> D["metadata.ts<br/>buildSliceLayerMetadata(axis, makerJsModel)"]
  D --> C1
  D --> C2

  %% Label generation and composition
  A --> E["lib/maker/generateTextModel.ts<br/>generateTextModel(text, fontSizeMm)"]
  A --> F["Compose per-layer model:<br/>models: slice + label"]

  %% Outputs
  F --> G["makerJsModels (with labels)"]
  D --> H["layers (plane, axisMap, vUpSign, uvExtents, zCoordinate)"]
  E --> I["labels (text, fontSizeMm, makerJsModel)"]

  %% Types
  subgraph Types
    T1["types.ts<br/>SlicerState"]
    T2["types.ts<br/>Axis, SlicePlane, AxisMap"]
    T3["types.ts<br/>Layer2D, LayerData (legacy)"]
  end
  B --> T1
  C --> T2
  D --> T2

  %% Grouping
  subgraph Core
    direction TB
    C
    C3
    C4
    C5
    C6
  end

  subgraph Projection Utils
    direction TB
    C1
    C2
  end

  subgraph Adapter
    direction TB
    A
    D
    E
    F
  end
```

## File References
- `src/slicing/adapter.ts`: entry point `sliceToMakerModels()`; enriches metadata and composes labels.
- `src/slicing/core.ts`: `parseStl()`, `sliceGeometry()` and helpers.
- `src/slicing/plane.ts`: plane and axis mapping utilities.
- `src/slicing/pure.ts`: UV projection to Maker.js models and extent measurement.
- `src/slicing/metadata.ts`: builds slice-layer metadata.
- `src/slicing/types.ts`: shared types.
- `src/lib/maker/generateTextModel.ts`: text label model generation.
