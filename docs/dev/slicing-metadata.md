# Slice Layer Metadata

- Path: `src/slicing/metadata.ts`
- Role: Build and carry plane-aware metadata with each slice layer.

## Fields
- `plane`: XY | XZ | YZ
- `axisMap`: mapping from 3D → UV
- `vUpSign`: +1 or -1 for V orientation
- `uvExtents`: { minU, maxU, minV, maxV }
- Optional: layer index, thickness, label

## Usage
- `WorkspaceStage` uses extents for size and drag limits.
- MakerJS exporter uses standardized origin from extents.

## Gotchas
- Do not re-flip coordinates in multiple places—one flip only in SVG.
