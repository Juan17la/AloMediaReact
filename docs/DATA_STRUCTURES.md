# Data Structures Guide

This document describes the important structures in AloMedia using classic data-structure names from standard CS books: arrays, lists, stacks, dictionaries, sets, and indexes. It also notes where the code does not use a true linked list, tree, or queue.

## Page 1. Arrays and Lists

These are the most common structures in the codebase. They store ordered editor data.

- Project tracks
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts), [src/store/slices/projectSlice.ts](../src/store/slices/projectSlice.ts)
  - Classic data structure: array / list
  - Explanation: `Project.tracks` is an ordered array of track objects.

- Track clips
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts), [src/store/slices/projectSlice.ts](../src/store/slices/projectSlice.ts)
  - Classic data structure: array / list
  - Explanation: `Track.clips` is an ordered array of clip objects.

- Project media
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts), [src/store/slices/projectSlice.ts](../src/store/slices/projectSlice.ts)
  - Classic data structure: array / list
  - Explanation: `Project.media` stores imported assets in a plain list.

- Clip groups
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts), [src/store/slices/uiSlice.ts](../src/store/slices/uiSlice.ts)
  - Classic data structure: list of IDs
  - Explanation: `ClipGroup.memberClipIds` is an array that stores the members of a group.

- Selection lists
  - File: [src/store/slices/uiSlice.ts](../src/store/slices/uiSlice.ts)
  - Classic data structure: list
  - Explanation: `selectedClipIds` is the multi-selection list used by the editor.

- Render segments
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts), [src/engine/renderPipeline.ts](../src/engine/renderPipeline.ts)
  - Classic data structure: array / list
  - Explanation: `RenderJob.segments` is a sequential list of export items.

## Page 2. Stacks

The code uses a stack pattern for undo and redo.

- History stack
  - File: [src/store/slices/historySlice.ts](../src/store/slices/historySlice.ts)
  - Classic data structure: stack
  - Explanation: `history: HistoryEntry[]` stores snapshots, and `historyIndex` acts like a stack cursor.

- Undo / redo snapshots
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts), [src/store/slices/historySlice.ts](../src/store/slices/historySlice.ts)
  - Classic data structure: stack of snapshots
  - Explanation: Each `HistoryEntry` is a saved project state that can be restored.

## Page 3. Dictionaries and Maps

These structures are used when the code needs fast lookup by ID.

- fileMap
  - File: [src/store/slices/projectSlice.ts](../src/store/slices/projectSlice.ts)
  - Classic data structure: dictionary / map
  - Explanation: It maps a media ID to the corresponding File object.

- Proxy state map
  - File: [src/store/slices/proxySlice.ts](../src/store/slices/proxySlice.ts)
  - Classic data structure: dictionary / map
  - Explanation: `proxyMap` stores proxy status by media ID.

- Clip lookup by ID
  - File: [src/store/slices/uiSlice.ts](../src/store/slices/uiSlice.ts), [src/store/slices/projectSlice.ts](../src/store/slices/projectSlice.ts)
  - Classic data structure: dictionary-like search over arrays
  - Explanation: The code usually searches clips in arrays by `clip.id` rather than using a dedicated hash table.

## Page 4. Sets

Sets are used when uniqueness matters more than order.

- Unique clip IDs during selection cleanup
  - File: [src/store/slices/uiSlice.ts](../src/store/slices/uiSlice.ts)
  - Classic data structure: set
  - Explanation: The code uses `Set<string>` to remove duplicate clip IDs and validate membership.

- Unique media IDs or existing IDs during validation
  - File: [src/store/slices/projectSlice.ts](../src/store/slices/projectSlice.ts)
  - Classic data structure: set
  - Explanation: Sets are used to test whether an ID exists without duplicating entries.

## Page 5. Sorted Arrays and Indexes

These are used for fast time-based lookup.

- ClipIndex boundaries
  - File: [src/utils/clipIndex.ts](../src/utils/clipIndex.ts)
  - Classic data structure: sorted array
  - Explanation: `boundaries: number[]` stores sorted timeline points.

- ClipIndex segments
  - File: [src/utils/clipIndex.ts](../src/utils/clipIndex.ts)
  - Classic data structure: indexed table / sparse map
  - Explanation: `segments: Map<number, Clip[]>` stores the clips active between two boundaries.

- Active clip lookup
  - File: [src/utils/clipIndex.ts](../src/utils/clipIndex.ts)
  - Classic data structure: search index
  - Explanation: `lookupActiveClips` uses binary search over the sorted boundary array.

## Page 6. Trees, Linked Lists, and Queues

These are important textbook structures, but they are not explicitly implemented as custom structures in this codebase.

- Trees
  - File: none as a dedicated custom structure
  - Classic data structure: tree
  - Explanation: The app does not model the timeline or project as a tree. It uses arrays, objects, and maps instead.

- Linked lists
  - File: none as a dedicated custom structure
  - Classic data structure: linked list
  - Explanation: There is no explicit linked-list implementation. Ordered data is stored in arrays.

- Queues
  - File: none as a dedicated custom structure
  - Classic data structure: queue
  - Explanation: The code does not use a dedicated queue structure for the editor state.

## Page 7. Objects and Records

Some structures are plain objects, which are also important in the code.

- Project object
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts)
  - Classic data structure: record / object
  - Explanation: `Project` is a plain object with named fields.

- Clip objects
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts)
  - Classic data structure: record / object
  - Explanation: Each clip variant is an object with fields, not a class with methods.

- History entries
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts)
  - Classic data structure: record / object
  - Explanation: Each history item is a simple object with a project snapshot and description.

## Page 8. Important Rules

These rules explain how the structures behave in practice.

- Time values are normalized
  - File: [src/utils/time.ts](../src/utils/time.ts), [src/project/projectTypes.ts](../src/project/projectTypes.ts)
  - Explanation: The app rounds timeline values to millisecond precision.

- Clip IDs are the real identity
  - File: [src/project/projectTypes.ts](../src/project/projectTypes.ts), [src/components/editor/Clip.tsx](../src/components/editor/Clip.tsx)
  - Explanation: Two clips can use the same media file, but they still need different clip IDs.

- Undo and redo use snapshots
  - File: [src/store/slices/historySlice.ts](../src/store/slices/historySlice.ts)
  - Explanation: The history system restores full project states instead of small diffs.

- Transitions are normalized before export
  - File: [src/project/transitionEdges.ts](../src/project/transitionEdges.ts), [src/project/projectSerializer.ts](../src/project/projectSerializer.ts)
  - Explanation: Clip-level transitions are edited in the UI, but canonical transition edges are the durable form.
