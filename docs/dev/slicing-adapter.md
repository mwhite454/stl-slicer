# Slicing Adapter

- Path: `src/slicing/adapter.ts`
- Role: High-level bridge turning STL → MakerJS models with metadata for workspace consumption.

## Responsibilities
- `sliceToMakerModels(file, axis, thickness)`
  - Calls `parseStl`/`sliceGeometry` in `slicing/core`.
  - Converts UV paths to MakerJS models in `slicing/pure`.
  - Measures extents and builds plane-aware metadata in `slicing/metadata`.
- Return tuple: models[], enriched layers[], labels.

## Inputs/Outputs
- Input: File, axis ('X'|'Y'|'Z'), thickness (mm).
- Output: Array of MakerJS `IModel` and `SliceLayerMetadata`.

## Gotchas
- Preserve real-world coordinates (no arbitrary normalization).
- Attach `plane`, `axisMap`, `vUpSign`, and `uvExtents`.

## Extensibility
- Add post-processing hooks (e.g., tabs, joints) after model creation.

## Related
- `slicing/core.ts`, `slicing/pure.ts`, `slicing/metadata.ts`.
