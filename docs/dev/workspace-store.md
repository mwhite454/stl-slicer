# Workspace Store (Zustand)

- Path: `src/store/workspaceStore`
- Role: State for 2D workspace items (rectangle and sliceLayer), selection, viewport mm/px.

## Actions
- `addSliceLayer`, `addMultipleSliceLayers`, `updateSliceLayer`
- Selection, drag/transform commit on interaction end (RAF throttling during drag)

## Data
- Item type `sliceLayer` holds MakerJS `IModel` and `SliceLayerMetadata`.
- Real-world units preserved; no implicit scaling.

## Integration
- Populated by `StlSlicer` after slicing.
- Read by `WorkspaceStage` for rendering and interaction.

## Tips
- Keep reducers pure and fast.
- Defer heavy recompute until interaction end.
