# Utils

This folder contains small, focused utility modules used across the app.

## Testing guidance

- **Mock browser-only libs**: Utilities like `exportUtils.ts` depend on browser APIs/libraries (e.g., `file-saver`, `jszip`). In Jest, mock them to keep tests fast and deterministic.
  - `file-saver`: `jest.mock('file-saver', () => ({ saveAs: jest.fn() }))`
  - `jszip`: mock with a lightweight class exposing `file()` and `generateAsync()`.
- **Input/Output assertions**: Prefer asserting calls, input shapes, and output artifacts (e.g., filenames, Blob instances) instead of inspecting DOM.
- **Pure helpers**: For pure utilities, add edge-case tests (empty arrays, invalid params, large inputs) to keep behavior stable.

See `src/utils/__tests__/exportUtils.test.ts` for an example.

## Conventions

- Keep modules small and single-purpose.
- Name exports (preferred) and avoid default exports.
- Add unit tests alongside in `src/utils/__tests__/`.
