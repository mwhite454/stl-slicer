# MakerJS Exporter

- External: `makerjs`
- Role: Convert MakerJS models to SVG path data used by `WorkspaceStage`.

## Usage
- `makerjs.exporter.toSVGPathData(model)` → `d` attribute for `<path>`.
- Combine with extents to place model at correct origin.

## Notes
- `measure.modelExtents` is used for size/fit.
- Keep exporter concerns separate from store and slicing.

## Links
- https://github.com/Microsoft/maker.js
