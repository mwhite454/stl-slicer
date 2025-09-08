# Pure UV → MakerJS Utilities

- Path: `src/slicing/pure.ts`
- Role: Side-effect-free utilities for projection and measurement in UV space.

## Responsibilities
- `pathsUVToMakerModel(pathsUV)` → MakerJS `IModel`.
- `measureUVExtents(model)` → width/height/min/max.
- Helpers for consistent origin and orientation.

## Philosophy
- Pure functions only, no global state.
- Centralize conversions so 2D renderer stays simple.

## Validation
- Compare `measureUVExtents` against MakerJS `measure.modelExtents`.
