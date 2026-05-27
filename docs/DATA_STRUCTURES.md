# Data Structures in AloMedia

This document catalogs every data structure pattern used in the AloMedia codebase, explaining how each one works, where it is used, and why it was chosen.

The codebase uses **arrays**, **stacks** (undo/redo), **maps/dictionaries**, **sets**, **sorted arrays with binary search**, **graphs**, and **records**. These structures match the domain naturally. Timeline data is flat and ordered, clips are accessed by ID or position, and Zustand's immutable-update model requires plain arrays and objects that can be spread and serialized to JSON.

---

## 1. Arrays

Arrays are the primary structure. They store every ordered collection in the editor.

### How They Work Here

Every array follows an **immutable update pattern** required by Zustand/React: instead of mutating in place, the code creates a shallow copy via `.slice()`, spread (`[...arr]`), or `.map()`, modifies the copy, and sets it back into the store. This triggers React re-renders only for components subscribing to the changed slice.

### Where They Are Used

| Array | File | Purpose |
|-------|------|---------|
| `Project.tracks` | `src/project/projectTypes.ts` | Ordered list of tracks. `track.order` determines visual stacking. Sorted via `.slice().sort()` before insertion. |
| `Track.clips` | `src/project/projectTypes.ts` | Clips on a track, ordered by `timelineStart`. Filtered, mapped, and spread immutably on every edit. |
| `Project.media` | `src/project/projectTypes.ts` | Imported media assets. Append-only during a session. Removed by filtering on `mediaId`. |
| `ClipGroup.memberClipIds` | `src/project/projectTypes.ts` | Flat list of clip IDs in a group. Validated against existing clips via `sanitizeSelection()`. |
| `selectedClipIds` | `src/store/slices/uiSlice.ts` | Multi-selection list. Toggled via Set conversion, then spread back to array. |
| `RenderJob.segments` | `src/project/projectTypes.ts`, `src/engine/renderPipeline.ts` | Built once from all tracks/clips. Consumed sequentially by the export system. |
| `history.past` / `history.future` | `src/utils/editHistory.ts` | Stack arrays for undo/redo (see Stacks section). |
| `boundaries` | `src/utils/clipIndex.ts` | Sorted array of unique time points for binary search. |
| `probeResults` | `src/engine/exportPipeline/index.ts` | Array of media probe results consumed during export planning. |

### Why Not Linked Lists?

Clips are sorted arrays accessed by index. Adjacent-clip navigation (`findNextAdjacentOnSameTrack`, `findPrevAdjacentOnSameTrack` in `src/utils/transitions.ts`) looks like linked-list traversal, but arrays are optimal because:
- Zustand requires immutable updates (spread/map), which need arrays, not node pointers.
- Clips serialize to JSON for project save/load and undo snapshots.
- Adjacent-clip lookup is infrequent (transition resolution), not per-frame.
- Mid-array insertion is `[...before, newItem, ...after]`, clean for tens to hundreds of clips.

---

## 2. Stacks (Undo/Redo — Two-Stack Pattern)

The history system uses a **classic two-stack pattern**.

### How It Works

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
                                             cleared — redo path gone
```

### Fields

| Field | Role |
|-------|------|
| `past: HistoryEntry[]` | Stack of states before current. Grows on record/redo, shrinks on undo. |
| `present: HistoryEntry | null` | Most recent snapshot. Moved to `future` on undo, to `past` on redo. |
| `future: HistoryEntry[]` | States that were undone. Grows on undo, shrinks on redo. Cleared on new action. |

### Operations

- **`recordState(state, project, description)`** — Pushes current `present` onto `past`, sets new deep-cloned snapshot as `present`, clears `future`.
- **`undoHistory(state)`** — Pops from `past` into `present`, pushes old `present` onto `future`.
- **`redoHistory(state)`** — Pops from `future` into `present`, pushes old `present` onto `past`.

### Why Two Stacks Over Cursor

The previous implementation used `history: HistoryEntry[]` with a `historyIndex` cursor. This had drawbacks:
- `slice(0, historyIndex + 1)` is non-obvious.
- Off-by-one risk with cursor bounds.
- Cursor and array are separate state that can drift.

With two stacks: "can undo?" is `past.length > 0`, "can redo?" is `future.length > 0`, reset is a single `createEditHistory()` call.

### Files

| File | Role |
|------|------|
| `src/utils/editHistory.ts` | Pure functions: `createEditHistory`, `recordState`, `undoHistory`, `redoHistory`. No Zustand dependency. |
| `src/store/slices/historySlice.ts` | Zustand slice wrapping `EditHistory`, exposing `pushHistory()`, `undo()`, `redo()`. |

---

## 3. Dictionaries / Maps / Hash Tables

Maps provide O(1) lookup by ID, used whenever the code needs to find something by key rather than by position.

### Where They Are Used

| Map | File | How It Works |
|-----|------|--------------|
| `fileMap: Map<string, File>` | `src/store/slices/projectSlice.ts` | Module-level registry mapping `mediaId` -> browser `File` object. Outside Zustand state. Populated on import, read during preview/export, cleared on project load. |
| `proxyMap: Record<string, ProxyState>` | `src/store/slices/proxySlice.ts` | Maps `mediaId` -> proxy generation status. Plain object (not Map) because Zustand diffs object keys for reactivity. |
| `ClipIndex.segments: Map<number, Clip[]>` | `src/utils/clipIndex.ts` | Maps boundary segment index -> clips active in that time range. Built by `buildClipIndex()`, queried via binary search on `boundaries` array. |
| Batch operation maps | `src/store/slices/projectSlice.ts` | Temporary `Map` and `Set` instances inside `moveClipsBatch()` for O(1) lookup during bulk ops. Built from input, consumed within the same function, then discarded. |
| `mediaFileNames: Map<string, string>` | `src/engine/exportPipeline/types.ts` | Maps `mediaId` -> virtual filename for FFmpeg filesystem. |
| `probeMap: Map<string, MediaProbeResult>` | `src/engine/exportPipeline/index.ts` | Maps `mediaId` -> probe result for quick lookup during plan building. |
| `textImageNames: Map<string, string>` | `src/engine/exportPipeline/wasmEncoder.ts` | Maps text segment ID -> rendered PNG filename in virtual FS. |
| `clipPlayStartPh: Map<string, number>` | `src/player/video/videoBuffer.ts` | Tracks when each clip started playing for drift correction. |
| `pool: Map<string, HTMLAudioElement>` | `src/player/audio/audioPool.ts` | Maps `trackId` -> `<audio>` element. Created/destroyed as tracks change. |
| `activeManagers: Set<VideoBufferManager>` | `src/player/video/videoBuffer.ts` | Global registry of all active buffer managers for bulk operations like `releaseAllBuffers()`. |

### How `fileMap` Works

```
addMedia(file) -> fileMap.set(media.id, file)     // register
buildRenderJob() -> fileMap.has(seg.mediaId)       // check existence
loadProject() -> fileMap.clear()                   // full reset
```

Intentionally outside Zustand because `File` objects are not serializable and should not participate in undo snapshots.

---

## 4. Sets

Sets provide O(1) membership testing and automatic deduplication.

### Where They Are Used

| Set | File | How It Works |
|-----|------|--------------|
| `listExistingClipIds()` -> `Set<string>` | `src/store/slices/uiSlice.ts` | Collects all clip IDs across tracks. Used by `sanitizeSelection()` to filter stale IDs. |
| `sanitizeSelection()` conversion | `src/store/slices/uiSlice.ts` | Deduplicates selection: `[...new Set(clipIds)].filter(...)` |
| `existingClipIds` in `loadProject()` | `src/store/slices/projectSlice.ts` | Validates clip group members against existing clips. Removes dead references. |
| `missingMediaIds`, `idbResolvedMediaIds` | `src/store/slices/projectSlice.ts` | Track which media could/could not be restored from IndexedDB. Drive UI warnings. |
| Extension sets | `src/store/slices/projectSlice.ts` | `AUDIO_EXTENSIONS`, `VIDEO_EXTENSIONS`, `IMAGE_EXTENSIONS` — constant Sets for O(1) file type detection. |
| `needed: Set<string>` in `syncAudioPool` | `src/player/audio/audioPool.ts` | Determines which audio elements to keep vs remove when tracks change. |
| `writtenFiles: Set<string>` | `src/engine/exportPipeline/wasmEncoder.ts` | Prevents writing duplicate files to FFmpeg virtual filesystem. |

### Pattern: Set as Intermediate Structure

```typescript
// Array -> Set (for O(1) ops) -> Array (for Zustand state)
const selected = new Set(state.selectedClipIds)
selected.has(clipId) ? selected.delete(clipId) : selected.add(clipId)
const nextSelected = sanitizeSelection(state.project, [...selected])
```

This is idiomatic for React/Zustand: Sets are used for computation, arrays for storage.

---

## 5. Sorted Arrays with Binary Search (ClipIndex)

The most algorithmically interesting structure. Provides O(log n) lookup of active clips at any playhead position.

### How It Works

**File:** `src/utils/clipIndex.ts`

**Step 1 — Collect boundaries:**
Every clip contributes two time points: `timelineStart` and `timelineEnd`. Collected into a `Set<number>` (deduplication), then sorted into `boundaries: number[]`.

```
Clip A:  |-------|          (start=0, end=3)
Clip B:      |---------|    (start=2, end=5)

boundaries = [0, 2, 3, 5]   (sorted, unique)
segments:     [0] [1] [2]   (between each pair)
```

**Step 2 — Map segments to active clips:**
For each segment, check which clips overlap that range. Midpoint tested against each clip's start/end (with epsilon tolerance). Results stored in `segments: Map<number, Clip[]>` keyed by segment index.

**Step 3 — Binary search at query time:**
`lookupActiveClips(index, playhead)` runs binary search on `boundaries`:

```typescript
let lo = 0, hi = boundaries.length - 2
while (lo <= hi) {
  const mid = (lo + hi) >>> 1
  if (boundaries[mid + 1] <= playhead - CLIP_EPSILON) lo = mid + 1
  else if (boundaries[mid] > playhead + CLIP_EPSILON) hi = mid - 1
  else return segments.get(mid) ?? []
}
```

### Why This Structure

Playhead position is queried on every animation frame. Naive iteration would be O(clips) per frame. The clip index makes it O(log boundaries) per frame.

The index is rebuilt when the project changes. This is acceptable because edits are infrequent compared to playhead queries.

---

## 6. Graphs (Filter Graph for FFmpeg)

The export pipeline constructs a directed acyclic graph (DAG) represented as a filter complex string for FFmpeg.

### How It Works

**File:** `src/engine/exportPipeline/filterGraphBuilder.ts`

Nodes:
- **Input nodes** — Media files (`[0:v]`, `[1:v]`, `[0:a]`)
- **Filter nodes** — `trim`, `scale`, `eq`, `overlay`, `xfade`, `amix`, etc.
- **Output nodes** — Final video and audio streams

Edges:
- Labeled stream references (`[scaled0]`, `[mixed_audio]`)
- Each filter consumes labeled inputs and produces labeled outputs
- The graph is linearized into a single `-filter_complex` string

Example fragment:
```
[0:v]trim=start=0:end=5,setpts=PTS-STARTPTS[clip0];
[clip0]scale=1920:1080[scaled0];
[scaled0]eq=brightness=0.1[adjusted0];
```

### Why a Graph Structure

Video composition is inherently a graph: multiple inputs are filtered, transformed, layered, and mixed. FFmpeg's filter complex is the industry-standard way to express this. The builder generates the string programmatically from the `RenderPlan`.

---

## 7. Trees

While there are no explicit tree data structures in the classical sense, the project model has hierarchical relationships that form implicit trees:

### Project Hierarchy Tree

```
Project (root)
├── media[] (flat list of assets)
├── tracks[] (ordered by track.order)
│   └── clips[] (ordered by timelineStart)
│       ├── VideoClip
│       ├── ImageClip
│       ├── TextClip
│       └── AudioClip
├── transitionEdges[] (cross-clip relationships)
└── clipGroups[] (group containers)
    └── memberClipIds[] (leaf references)
```

This hierarchy is stored as nested JSON objects/arrays. Zustand's immutable updates treat it as a shallow tree of plain objects.

---

## 8. Transition Edges (Sorted Array of Records)

**File:** `src/project/transitionEdges.ts`

The transition system uses a sorted array of `TransitionEdge` records.

### How It Works

`compileTransitionEdges(project)` iterates all video tracks and clips in timeline order. For each pair of adjacent clips, it checks `transitionIn` / `transitionOut` properties and builds a `TransitionEdge` record with normalized time boundaries.

The array is sorted by `(trackId, boundaryTimeS, edgeId)` for timeline-order scanning.

### Conflict Resolution

When two clips share a boundary and both declare transitions, `transitionIn` from the incoming clip takes priority over `transitionOut` from the outgoing clip. The sorted structure enables left-to-right processing.

---

## 9. Objects and Records

Plain TypeScript interfaces serve as records (structs) throughout.

| Object | File | Purpose |
|--------|------|---------|
| `Project` | `src/project/projectTypes.ts` | Top-level container with `id`, `name`, `media[]`, `tracks[]`, `clipGroups[]`, `transitionEdges[]` |
| `Clip` (union) | `src/project/projectTypes.ts` | Discriminated union: `VideoClip | ImageClip | TextClip | AudioClip`. The `type` field drives exhaustive switches. |
| `HistoryEntry` | `src/project/projectTypes.ts` | `{ project: Project, description: string }`. Deep-cloned on record and restore. |
| `RenderSegment` | `src/project/projectTypes.ts` | Flattened clip representation for export. Built by `clipToSegment()`. |
| `TransitionEdge` | `src/project/projectTypes.ts` | Canonical transition between two clips (or clip and black/silence). |
| `RenderPlan` | `src/engine/exportPipeline/types.ts` | Complete export specification: segments, transitions, output target, probe results. |
| `ExportJob` | `src/engine/exportPipeline/types.ts` | Tracks export execution state: status, progress, frames, error. |

### Immutable Update Pattern

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

Creates new references at every changed level while sharing unchanged subtrees.

---

## 10. Important Rules

### Time Normalization

All timeline values are stored in seconds but rounded to integer-millisecond precision. The `toMs()` / `toSeconds()` functions in `src/utils/time.ts` enforce this. `CLIP_EPSILON` is used for floating-point comparisons.

### Clip Identity

Clip IDs are the real identity, not media IDs. Two clips can reference the same media file. The `id` field on `BaseClip` is generated by `generateId()` and is unique across the entire project.

### Undo Snapshots

History stores full project snapshots (deep-cloned via `JSON.parse(JSON.stringify(...))`). Memory grows linearly with history depth. For typical sessions (tens to low hundreds of undo states), this is acceptable.

### Serialization

All project state is JSON-serializable. `File` objects live in `fileMap` outside Zustand and are not included in undo snapshots or project saves. They are re-resolved from IndexedDB on project load.

---

## Summary Table

| Structure | Primary Use | Key Files |
|-----------|-------------|-----------|
| **Arrays** | Ordered collections, stacks, sorted boundaries | `projectTypes.ts`, `uiSlice.ts`, `clipIndex.ts` |
| **Stacks** | Undo/redo history | `editHistory.ts`, `historySlice.ts` |
| **Maps** | ID-based lookup, registries, indexes | `projectSlice.ts`, `proxySlice.ts`, `clipIndex.ts`, `wasmEncoder.ts` |
| **Sets** | Membership testing, deduplication | `uiSlice.ts`, `projectSlice.ts`, `audioPool.ts` |
| **Sorted Arrays + Binary Search** | Fast active-clip lookup | `clipIndex.ts`, `transitionEdges.ts` |
| **Graphs (Filter Complex)** | Video/audio composition DAG | `filterGraphBuilder.ts` |
| **Records/Objects** | Domain entities, snapshots | `projectTypes.ts`, `types.ts` |
