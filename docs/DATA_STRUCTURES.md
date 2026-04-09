# Data Structures in AloMedia

This document describes every data structure pattern used in the AloMedia codebase,
how each one works internally, and why it was chosen over alternatives.

The codebase uses **arrays**, **maps**, **sets**, **sorted arrays with binary search**,
and a **two-stack undo/redo** pattern. These are the only structures present because
they match the domain naturally. Introducing linked lists, queues, or trees would add
complexity without solving real problems: timeline data is flat and ordered, clips are
accessed by ID or by position, and Zustand's immutable-update model requires plain
arrays and objects that can be spread and serialized to JSON.

---

## 1. Arrays

Arrays are the primary structure. They store every ordered collection in the editor.

### How they work here

Every array in the project follows an **immutable update pattern** required by
Zustand/React: instead of mutating in place, the code creates a shallow copy via
`.slice()`, spread (`[...arr]`), or `.map()`, modifies the copy, and sets it back
into the store. This triggers React re-renders only for components that subscribe to
the changed slice of state.

### Where they are used

| Array | File | Purpose |
|-------|------|---------|
| `Project.tracks` | [projectTypes.ts](../src/project/projectTypes.ts) | Ordered list of tracks. `track.order` determines visual stacking in the timeline. Sorted via `.slice().sort()` before insertion or reordering. |
| `Track.clips` | [projectTypes.ts](../src/project/projectTypes.ts) | Clips on a given track, ordered by `timelineStart`. Filtered, mapped, and spread immutably on every edit operation. |
| `Project.media` | [projectTypes.ts](../src/project/projectTypes.ts) | Imported media assets. Append-only during a session (new media is spread onto the end). Removed by filtering on `mediaId`. |
| `ClipGroup.memberClipIds` | [projectTypes.ts](../src/project/projectTypes.ts) | Flat list of clip IDs that belong to a group. Validated against existing clips on every access via `sanitizeSelection()`. |
| `selectedClipIds` | [uiSlice.ts](../src/store/slices/uiSlice.ts) | Multi-selection list. Toggled via Set conversion (add/delete), then spread back to an array for Zustand state. |
| `RenderJob.segments` | [projectTypes.ts](../src/project/projectTypes.ts), [renderPipeline.ts](../src/engine/renderPipeline.ts) | Built once by `buildRenderJob()` from all tracks/clips. Consumed as a whole by the export system — iterated, not drained. There is no queue or producer-consumer pattern here; sequential array is the correct structure. |

### Why not linked lists?

Clips are sorted arrays accessed by index. The `findNextAdjacentOnSameTrack()` and
`findPrevAdjacentOnSameTrack()` functions in [transitions.ts](../src/utils/transitions.ts)
navigate forward/backward through sorted arrays — this looks like linked-list traversal,
but array + index is optimal here because:
- Zustand requires immutable updates (spread/map), which need arrays, not node pointers.
- Clips serialize to JSON for project save/load and undo snapshots.
- Adjacent-clip lookup is infrequent (transition resolution), not per-frame.
- Mid-array insertion happens via `[...before, newItem, ...after]`, which is clean and fast for the scale of data involved (tens to hundreds of clips, not thousands).

---

## 2. Two-Stack Undo/Redo (EditHistory)

The history system uses a **classic two-stack pattern** to support undo and redo.

### How it works

```
past  = [S0, S1, S2]     present = S3     future = []

User presses Undo:
past  = [S0, S1]          present = S2     future = [S3]

User presses Undo again:
past  = [S0]              present = S1     future = [S2, S3]

User presses Redo:
past  = [S0, S1]          present = S2     future = [S3]

User performs new action (records S4):
past  = [S0, S1, S2]      present = S4     future = []
                                            ↑ cleared — redo path gone
```

Three fields, three operations:

| Field | Role |
|-------|------|
| `past: HistoryEntry[]` | Stack of states before the current one. Grows on record/redo, shrinks on undo. Top of stack = most recent past state. |
| `present: HistoryEntry \| null` | The most recent snapshot. Sits between the two stacks. Moved to `future` on undo, moved to `past` on redo. |
| `future: HistoryEntry[]` | Stack of states that were undone. Grows on undo, shrinks on redo. Cleared entirely when a new action is recorded (branching history is not kept). |

### Operations

- **`recordState(state, project, description)`** — Pushes current `present` onto `past`,
  sets the new deep-cloned snapshot as `present`, clears `future`. This is the "push"
  operation of the stack.

- **`undoHistory(state)`** — Pops from `past` into `present`, pushes old `present` onto
  `future`. Returns `null` if `past` is empty (nothing to undo).

- **`redoHistory(state)`** — Pops from `future` into `present`, pushes old `present` onto
  `past`. Returns `null` if `future` is empty (nothing to redo).

### Why this over a single array + cursor

The previous implementation used `history: HistoryEntry[]` with a `historyIndex` cursor.
Undo decremented the cursor; redo incremented it; recording a new state required
`slice(0, historyIndex + 1)` to discard forward history. This worked but had drawbacks:

- `slice(0, historyIndex + 1)` is non-obvious — you need to reason about what "discard forward" means.
- Off-by-one risk: `historyIndex <= 0` vs `historyIndex >= history.length - 1` are easy to confuse.
- Cursor and array are separate state that can drift if any codepath forgets to update both.
- Reset required remembering to set both `history: []` and `historyIndex: -1`.

With two stacks: "can undo?" is `past.length > 0`, "can redo?" is `future.length > 0`,
and reset is a single `createEditHistory()` call. The operations are pure functions that
return new state, making them easy to test outside Zustand.

### Files

| File | Role |
|------|------|
| [editHistory.ts](../src/utils/editHistory.ts) | Pure functions: `createEditHistory`, `recordState`, `undoHistory`, `redoHistory`. No Zustand dependency. |
| [historySlice.ts](../src/store/slices/historySlice.ts) | Zustand slice that wraps `EditHistory` and exposes `pushHistory()`, `undo()`, `redo()` to the store. |

---

## 3. Dictionaries and Maps

Maps provide O(1) lookup by ID, used whenever the code needs to find something by key
rather than by position.

### Where they are used

| Map | File | How it works |
|-----|------|--------------|
| `fileMap: Map<string, File>` | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Module-level registry mapping media ID to the browser `File` object. Not part of Zustand reactive state (Map mutations don't trigger re-renders). Populated on import, read during preview and export, cleared on project load/reset. This is a simple registry, not a cache — there is no eviction policy, no access-order tracking, no size limit. |
| `proxyMap: Record<string, ProxyState>` | [proxySlice.ts](../src/store/slices/proxySlice.ts) | Maps media ID to proxy generation status (`pending`, `ready`, `error`). Plain object (not Map) because Zustand can diff object keys for reactivity. |
| `ClipIndex.segments: Map<number, Clip[]>` | [clipIndex.ts](../src/utils/clipIndex.ts) | Maps a boundary segment index to the clips active in that time range. Built once by `buildClipIndex()`, queried via binary search on the companion `boundaries` array. |
| Batch operation maps | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Temporary `Map` and `Set` instances created inside `moveClipsBatch()` for O(1) lookup during bulk operations. Built from the input array, consumed within the same function, then discarded. |

### How `fileMap` works

```
addMedia(file) → fileMap.set(media.id, file)     // register
buildRenderJob() → fileMap.has(seg.mediaId)        // check existence
loadProject() → fileMap.clear()                    // full reset
```

It is intentionally outside Zustand because `File` objects are not serializable
and should not participate in state diffing or undo snapshots.

---

## 4. Sets

Sets are used for O(1) membership testing and automatic deduplication.

### Where they are used

| Set | File | How it works |
|-----|------|--------------|
| `listExistingClipIds()` → `Set<string>` | [uiSlice.ts](../src/store/slices/uiSlice.ts) | Collects all clip IDs across all tracks into a Set. Used by `sanitizeSelection()` to filter out stale IDs (clips that were deleted but still referenced in the selection). The Set provides O(1) `.has()` checks instead of nested `Array.find()` loops. |
| `new Set(clipIds)` in `sanitizeSelection()` | [uiSlice.ts](../src/store/slices/uiSlice.ts) | Deduplicates the selection array before filtering. Spreads back to array for Zustand state: `[...new Set(clipIds)].filter(...)`. |
| `existingClipIds` in `loadProject()` | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Validates clip group members against actually existing clips during project load. Removes references to clips that no longer exist. |
| `missingMediaIds`, `idbResolvedMediaIds` | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Track which media assets could/could not be restored from IndexedDB during project load. Drive UI warnings for missing files. |
| Extension sets (`AUDIO_EXTENSIONS`, `VIDEO_EXTENSIONS`, etc.) | [projectSlice.ts](../src/store/slices/projectSlice.ts) | Constant sets for O(1) file type detection by extension. |

### Pattern: Set as intermediate structure

The codebase frequently converts between arrays and sets within a single operation:
```typescript
// Array → Set (for O(1) ops) → Array (for Zustand state)
const selected = new Set(state.selectedClipIds)
selected.has(clipId) ? selected.delete(clipId) : selected.add(clipId)
const nextSelected = sanitizeSelection(state.project, [...selected])
```
This is idiomatic for React/Zustand: Sets are used for the computation, but the
result is stored as an array because Zustand needs referential equality checks and
arrays serialize cleanly to JSON.

---

## 5. Sorted Arrays with Binary Search (ClipIndex)

The clip index is the most algorithmically interesting structure in the codebase.
It provides O(log n) lookup of which clips are active at any given playhead position.

### How it works

[clipIndex.ts](../src/utils/clipIndex.ts) builds a segment index from all clips
across all tracks:

**Step 1 — Collect boundaries:**
Every clip contributes two time points: its `timelineStart` and `timelineEnd`.
These are collected into a `Set<number>` (for deduplication), then sorted into
a `boundaries: number[]` array.

```
Clip A:  |-------|          (start=0, end=3)
Clip B:      |---------|    (start=2, end=5)

boundaries = [0, 2, 3, 5]   (sorted, unique)
segments:     [0] [1] [2]   (between each pair of boundaries)
```

**Step 2 — Map segments to active clips:**
For each segment (the gap between two consecutive boundaries), the code checks
which clips overlap that time range. The midpoint of the segment is tested against
each clip's start/end (with epsilon tolerance for floating-point precision).
Results are stored in `segments: Map<number, Clip[]>` keyed by segment index.

**Step 3 — Binary search at query time:**
`lookupActiveClips(index, playhead)` runs binary search on `boundaries` to find
which segment the playhead falls into, then returns the pre-computed clip list
from the `segments` map in O(1).

```typescript
// Binary search: O(log n) where n = number of boundary points
let lo = 0, hi = boundaries.length - 2
while (lo <= hi) {
  const mid = (lo + hi) >>> 1              // unsigned right shift = fast floor(div 2)
  if (boundaries[mid + 1] <= playhead - CLIP_EPSILON) lo = mid + 1
  else if (boundaries[mid] > playhead + CLIP_EPSILON) hi = mid - 1
  else return segments.get(mid) ?? []      // found the segment
}
```

### Why this structure

The playhead position is queried on every animation frame during playback. A naive
approach (iterate all clips, check if playhead falls within each one) would be
O(clips) per frame. The clip index makes it O(log boundaries) per frame, which
matters when the timeline has many clips.

The index is rebuilt when the project changes (clips are added, moved, removed).
This is acceptable because project edits are infrequent compared to playhead queries.

---

## 6. Transition Edges (Sorted Array of Records)

The transition system in [transitionEdges.ts](../src/project/transitionEdges.ts) uses a
sorted array of `TransitionEdge` records to represent all transitions in the project.

### How it works

`compileTransitionEdges(project)` iterates all video tracks and their clips in timeline
order. For each pair of adjacent clips (or a clip at the start/end of a track), it
checks whether `transitionIn` / `transitionOut` properties exist and builds a
`TransitionEdge` record with normalized time boundaries.

The resulting array is sorted by `(trackId, boundaryTimeS, edgeId)` so that edges
can be scanned in timeline order. This sorted order is maintained through
`sortEdges()` after every modification via `applyCanonicalTransitionEdit()`.

Adjacent-clip navigation uses simple index arithmetic (`clips[idx - 1]`, `clips[idx + 1]`)
on the sorted clips array — no linked-list pointers needed because the array is already
in timeline order and the clips are flat (no hierarchical nesting).

### Conflict resolution

When two clips share a boundary and both declare transitions, `transitionIn` from the
incoming clip takes priority over `transitionOut` from the outgoing clip. This is a
domain rule, not a data structure concern — but the sorted-edge structure makes it
easy to implement by processing clips left-to-right and skipping the lower-priority
transition.

---

## 7. Objects and Records

Plain TypeScript interfaces serve as records (structs) throughout the codebase.

| Object | File | Purpose |
|--------|------|---------|
| `Project` | [projectTypes.ts](../src/project/projectTypes.ts) | Top-level container with `id`, `name`, `media[]`, `tracks[]`, `clipGroups[]`, `transitionEdges[]`. |
| `Clip` (union type) | [projectTypes.ts](../src/project/projectTypes.ts) | Discriminated union: `VideoClip \| ImageClip \| TextClip \| AudioClip`. The `type` field drives exhaustive switches in render pipeline and UI components. |
| `HistoryEntry` | [projectTypes.ts](../src/project/projectTypes.ts) | `{ project: Project, description: string }` — a snapshot paired with a human-readable label. Deep-cloned on record and on restore to prevent aliasing. |
| `RenderSegment` | [projectTypes.ts](../src/project/projectTypes.ts) | Flattened representation of a clip for the export pipeline. Built from `Clip` by `clipToSegment()`, enriched with resolved transitions. |
| `TransitionEdge` | [projectTypes.ts](../src/project/projectTypes.ts) | Canonical representation of a transition between two clips (or between a clip and black/silence). Contains boundary times, duration, type, and conflict-resolution metadata. |

### Immutable update pattern

All objects in Zustand state are updated immutably via spread:

```typescript
set(state => ({
  project: {
    ...state.project,
    tracks: state.project.tracks.map(track =>
      track.id === targetId
        ? { ...track, clips: [...track.clips, newClip] }
        : track
    ),
  },
}))
```

This creates a new object reference at every level of the path that changed,
while sharing unchanged subtrees. React detects the new reference and re-renders
only the affected components.

---

## 8. Important Rules

These rules govern how the structures behave in practice.

### Time normalization

All timeline values are stored in seconds but rounded to integer-millisecond precision.
The `toMs()` / `toSeconds()` functions in [time.ts](../src/utils/time.ts) enforce this.
The `CLIP_EPSILON` constant is used for floating-point comparisons (overlap detection,
adjacency checks). This ensures that two clips placed "at the same time" are treated
as equal even if floating-point arithmetic produces tiny differences.

### Clip identity

Clip IDs are the real identity, not media IDs. Two clips can reference the same media
file (e.g., the same video used twice on different tracks). The `id` field on `BaseClip`
is generated by `generateId()` and is unique across the entire project.

### Undo snapshots

The history system stores full project snapshots (deep-cloned via `JSON.parse(JSON.stringify(...))`).
This is simple and correct but means memory usage grows linearly with history depth.
For a typical editing session with tens to low hundreds of undo states, this is fine.

### Serialization

All project state (tracks, clips, media metadata, transitions, groups) is JSON-serializable.
`File` objects live in the module-level `fileMap` outside Zustand and are not included
in undo snapshots or project saves. They are re-resolved from IndexedDB on project load.
