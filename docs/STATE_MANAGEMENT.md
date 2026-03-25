# AloMedia State Management

The editor state is managed with Zustand and composed from focused slices in `src/store/slices`.

## Store Composition

`src/store/editorStore.ts` combines the slices into one `EditorStore` type:

- `projectSlice`
- `playbackSlice`
- `uiSlice`
- `historySlice`
- `proxySlice`

It also re-exports `fileMap`, a module-level `Map<string, File>` used across player/export flows.

## Why Slice-Based?

The recent architecture moved from a large monolithic store toward slice composition to improve:

- Separation of concerns.
- Testability of domain actions.
- Lower merge conflict risk in collaborative development.

## Serializable vs Runtime State

### Serializable

- `project` (tracks, clips, media metadata).

This portion is used for save/load and history snapshots.

### Runtime-Only

- `fileMap` with raw `File` objects.
- Proxy availability/status in the proxy slice.
- Playback flags and transient UI selections.

Keeping files out of serializable state avoids bloated snapshots and expensive re-renders.

## History Model

Undo/redo is handled by the history slice, which stores project snapshots and index state. Mutating operations typically:

1. Push a snapshot entry.
2. Apply project mutation.
3. Trigger any required playback reset/sync.

## Cross-Slice Interactions

Common interaction paths:

- Project edits update timeline data in project slice.
- Playback slice consumes timeline/playhead updates.
- Proxy slice receives updates from `proxyEngine` callbacks.
- History slice tracks destructive edits for undo/redo.

## Integration Points

- `useEditorStore` is consumed directly by editor components and hooks.
- `useExport` reads `project` and `fileMap` through `useEditorStore.getState()`.
- `VideoEditor` uses store subscriptions for dirty tracking and project lifecycle updates.
