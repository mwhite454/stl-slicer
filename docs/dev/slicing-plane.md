# Plane and Axis Mapping

- Path: `src/slicing/plane.ts`
- Role: Map chosen axis to slice plane and define UV coordinate mapping.

## Responsibilities
- `planeFromAxis(axis)` → XY/XZ/YZ plane.
- `axisMapForPlane(plane)` → mapping from XYZ → UV and `vUpSign`.

## Notes
- Keep a single Y-flip downstream for SVG; metadata conveys `vUpSign`.
- Plane choice impacts labeling and extents.

## Testing
- Verify mappings with cube/sphere samples.
- Ensure UV extents are consistent across planes.
