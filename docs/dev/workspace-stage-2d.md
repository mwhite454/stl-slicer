# WorkspaceStage (2D Renderer)

- Path: `src/components/workspace/WorkspaceStage.tsx`
- Role: Render 2D slice layers using MakerJS exporter, handle selection and drag.

## Rendering
- Use `makerjs.exporter.toSVGPathData(model)`.
- Normalize origin: translate by `(-minU, -maxV)` when metadata present.
- Clamp drag by `measure.modelExtents` width/height.

## Interaction
- RAF-throttled transforms during drag/pan.
- Commit to store on end for performance.

## Gotchas
- Single Y-flip policy for SVG; do not double invert.
- Fit-to-bounds must consider slice layer extents.
