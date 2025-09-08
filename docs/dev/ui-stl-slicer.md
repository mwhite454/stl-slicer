# Root UI: StlSlicer

- Path: `src/components/StlSlicer.tsx`
- Role: Entry point for the STL → slice → 2D workflow. Orchestrates file upload, parameter selection, slicing pipeline calls, and dispatch to the workspace store.

## Responsibilities
- Accept STL uploads and keep transient `SlicerState`.
- Let user choose axis and layer thickness.
- Call `sliceToMakerModels(file, axis, thickness)` from `src/slicing/adapter.ts`.
- Map results to workspace items via `addMultipleSliceLayers`.
- Navigate to 2D stage and pass selection/labels.

## Key APIs used
- `parseStl(file)` and `sliceGeometry(state, axis, thickness)` via adapter.
- `addMultipleSliceLayers(models, metadata)` from `src/store/workspaceStore`.

## Interactions
- Receives `SlicerState` from `slicing/core`.
- Receives enriched layer metadata from `slicing/adapter`.
- Writes to `workspaceStore`.
- Coordinates with `WorkspaceStage` for 2D rendering.

## Gotchas
- Keep units in mm; avoid ad-hoc scaling.
- Memoize heavy state derived from STL.
- Do not duplicate plane/axis conversions—use metadata.

## Tests / Dev tips
- Use sample STLs in `test/`.
- Verify type safety for layer metadata and labels.
