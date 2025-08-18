# Test Coverage Plan and Snapshots

Timestamp: 2025-08-15T22:10:04-04:00

## Current Coverage (npm run coverage)
- __Total Statements__: 45.45%
- __Total Branches__: 49.15%
- __Total Functions__: 63.15%
- __Total Lines__: 47.33%

## File Highlights in `src/slicing/`
- __core.ts__: 0% lines covered (needs tests; uncovered lines 1–261)
- __plane.ts__: ~100% covered (branches ~75%)
- __metadata.ts__: ~94% statements, ~88% branches, 100% functions, ~94% lines (miss at line ~27)
- __pure.ts__: ~96% statements, ~75% branches, 100% functions, ~100% lines (misses around 40–64, 115)
- __adapter.ts__: ~100% covered (through mocked core)

Note: Branch coverage is lower due to simple guards and mapper defaults. Core geometry slicing is currently untested and is the main gap.

## Next Steps
- __[pending]__ Add targeted unit tests for `src/slicing/core.ts`:
  - Validate layer count logic at bounds and with `layerThickness` variations
  - Validate `axisMap` and `plane` propagation
  - Provide minimal mock geometry to exercise `collectSegmentsAt()` and `sliceTriangleAt()`
- Increase branch coverage in `pure.ts` around bounding rectangle and edge cases
- Add a CI step to run `npm run coverage` and store artifact

Run updates:
- `npm run test`
- `npm run coverage`

---

## Snapshot: 2025-08-15T22:12:14-04:00

### Current Coverage (npm run coverage)
- __Total Statements__: 86.09%
- __Total Branches__: 69.49%
- __Total Functions__: 89.47%
- __Total Lines__: 88.75%

### File Highlights in `src/slicing/`
- __core.ts__: 75.75% statements, 52.38% branches, 71.42% functions, 79.54% lines (uncovered: 101–121, 125–127, 161)
- __plane.ts__: 93.75% statements, 87.5% branches, 100% functions, 93.75% lines
- __metadata.ts__: 100% statements, 75% branches, 100% functions, 100% lines
- __pure.ts__: 98.03% statements, 85% branches, 100% functions, 100% lines (misses around 40–53, 64)
- __adapter.ts__: 100% across the board

### Notes
- Added tests for `core.ts` covering layer count, zCoordinate spacing, plane/axisMap, and a triangle slice intersection.
- Mocked Three.js and STLLoader for Jest to avoid ESM issues.

### Next Steps
- __[pending]__ Improve branch coverage in `pure.ts` (bounding-rect and path edge cases).
- __[pending]__ Improve branch coverage in `core.ts` (edge tolerances/SEG_EPS, degenerate triangles, parallel edges).
- __[pending]__ Add CI step to run `npm run coverage` and store artifacts.

---

## Snapshot: 2025-08-15T22:31:55-04:00

### Current Coverage (npm run coverage)
- __Total Statements__: 100%
- __Total Branches__: 100%
- __Total Functions__: 100%
- __Total Lines__: 100%

### File Highlights in `src/slicing/`
- __core.ts__: 100% all metrics (refactored spacing calc; comprehensive tests for parse, slicing, edge cases)
- __plane.ts__: 100% (default branch covered)
- __metadata.ts__: 100% (null extents handled)
- __pure.ts__: 100% (empty/extents cases, default layer index, all axis mappings)
- __adapter.ts__: 100%

### Notes
- Added mocks for `three`, `STLLoader`, and `makerjs` to isolate tests from ESM/native issues.
- Achieved deterministic, unit-level coverage across slicing pipeline.

### Next Steps
- __[new]__ Expand test coverage to everything in `src/lib/`.
- __[pending]__ Add CI step to run `npm run coverage` and store artifacts.

### Expanded Scope: `src/lib/` Coverage Plan
- __Targets__:
  - `src/lib/coords/` (coordinate transforms, maker/SVG conversions)
  - `src/lib/maker/` (e.g., `generateGridModel.ts` grid, axes, meta)
  - `src/lib/db-init.ts` and other helpers (where feasible via unit tests)
- __Approach__:
  - Create unit tests per module with minimal mocks.
  - Validate geometry outputs (e.g., number of lines/keys, bounds, metadata tags) for maker models.
  - Cover default branches and invalid/edge inputs.

---

## Snapshot: 2025-08-15T23:52:22-04:00

### Strategy Update: Visual-Intent, Low-Brittleness Workspace Tests
- We will prioritize tests that assert user-visible intent (presence of meta grid/workspace, pan/zoom reactions, selection visibility) rather than brittle internal calculations or exact counts.
- Keep assertions high-level and directional (e.g., zoom increased, pan changed), so tests remain easy to evolve with UI changes.
- Wrap components in `MantineProvider` to satisfy Mantine context.

### Added
- `src/components/workspace/Grid/__tests__/WorkspaceGrid.test.tsx`
  - Confirms no grid when hidden/size<=0.
  - Confirms symmetric grid with highlighted, centered axes without asserting exact line counts.

### Next
- `WorkspaceStage` initial suite (visual-intent):
  - Assert meta models are upserted (`upsertMetaGrid`, `upsertMetaWorkspace`).
  - Simulate wheel to verify zoom action is invoked (directional check only).
  - Simulate middle-button pan to verify pan action is invoked (directional check only).
  - Keep DnD/selection tests for a follow-up pass.

### Notes
- Mock `useWorkspaceStore` to provide minimal state and spyable actions; attach `getState`/`setState` for component calls.
- Mock `makerjs` exporter/measure to stable outputs.
