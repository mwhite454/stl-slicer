# Slicing Core

- Path: `src/slicing/core.ts`
- Role: Core geometry pipeline: parse STL, slice meshes, and produce UV path data.

## APIs
- `parseStl(file): Promise<SlicerState>`
- `sliceGeometry(state, axis, thickness)`
  - Computes slice planes from `axis`.
  - Produces ordered slice layers with projected 2D paths (UV).

## Internals
- Delegates plane derivation to `slicing/plane.ts`.
- Produces UV contour data consumed by `slicing/pure.ts`.

## Contracts
- Always return layer ordering and bounds.
- Avoid lossy transformations—leave orientation to metadata.

## Debugging
- Log layer counts and bounds per axis.
- Compare against known test STLs in `test/`.
