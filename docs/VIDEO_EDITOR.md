# AloMedia Video Editor Guide

## Overview

The video editor is the core feature of AloMedia. It implements a **non-destructive, multi-track editing** workflow: source media files are never modified. Instead, `Clip` objects describe which portion of each file to use and where to place it on the timeline. The final output is assembled from these instructions during export.

For a technical deep-dive into the editor's subsystems, see:

- [DATA_MODEL.md](DATA_MODEL.md) — Project, Track, Clip types
- [STATE_MANAGEMENT.md](STATE_MANAGEMENT.md) — Zustand store and history
- [PLAYER.md](PLAYER.md) — Real-time playback engine
- [EDITOR_COMPONENTS.md](EDITOR_COMPONENTS.md) — Individual component documentation
- [FFMPEG.md](FFMPEG.md) — Export and proxy engine

---

## Editor Layout

The editor fills the full browser viewport with a fixed layout:

```
┌─────────────────────────────────────────────────────┐
│                     Top Bar                         │
│  [Project Title]     [Load] [Save] [Export] [Share] │
├──────────────┬──────────────────┬───────────────────┤
│              │                  │                   │
│  Media       │  Preview Canvas  │  Inspector Panel  │
│  Library     │                  │  (when clip       │
│              │  ┌────────────┐  │   selected)       │
│              │  │ transport  │  │                   │
│              │  └────────────┘  │                   │
├──────────────┴──────────────────┴───────────────────┤
│                     Toolbar                         │
├─────────────────────────────────────────────────────┤
│                     Timeline                        │
│  [ruler ──────────────────────────────────────────] │
│  [Track 1 ██████████  ████   ]                      │
│  [Track 2   ██████████████   ]                      │
└─────────────────────────────────────────────────────┘
```

---

## Core Editing Concepts

### Projects and Media

A **Project** holds the media catalog (imported files) and the track/clip arrangement. It is explicitly saved by the user — there is no auto-save. Saving serializes the project to JSON; media files must be re-imported when loading a saved project, since binary file data is not included in the JSON.

Each imported file is represented as a **Media** entry with a content hash (SHA-256). If the same file is imported a second time, the duplicate is silently ignored.

### Tracks

Tracks are horizontal lanes on the timeline. Every project starts with one video track and one audio track. Tracks have an **order** number that determines visual compositing priority: a lower `order` value means the track's content is rendered in the **foreground** (higher z-index in the canvas).

### Clips

A clip is a time-boxed reference to a portion of a media file. The clip defines:

- Where it sits on the timeline (`timelineStart`, `timelineEnd`)
- Which part of the source file to play (`mediaStart`, `mediaEnd`)
- Per-clip effects: transform, color grading, audio config, playback speed

Clip duration on the timeline can differ from the source media duration when speed is adjusted.

### Time Values

All time values are stored in **seconds** with precision clamped to integer milliseconds. This avoids floating-point drift when performing speed calculations. The `toMs()` / `toSeconds()` helpers enforce this throughout the codebase.

---

## Media Library

The left panel for importing and managing media files.

### Import Process

1. Click **Add Media** to open a native file picker. Accepts video, audio, and image files (multiple selection supported).
2. Each file is registered in the project's media catalog with its metadata (name, type, duration, size, content hash).
3. For video files, a **360p proxy** is generated immediately in the background. The proxy is a compressed, audio-stripped copy used for smooth timeline scrubbing. A `proxy…` badge appears on the card during generation.
4. Once processed, the media card appears in the library grid with a thumbnail (video frame, image preview, or waveform icon for audio).

### Using Media

- **Double-click** a card to insert the clip at the current playhead position on the first compatible track with room at that time.
- **Drag** a card onto any compatible track to place it at a specific time.

---

## Timeline

### Navigation

- **Horizontal scroll**: Scroll the timeline area to pan through time.
- **Zoom**: Hold `Ctrl` and scroll the mouse wheel. Zoom level is measured in pixels per second and is stored in the editor store as `timelineScale`.
- **Seek**: Click or drag anywhere on the time ruler to move the playhead.

### Adding Clips

Drag a media card from the library and drop it on a track. A **snap indicator** (vertical line) shows where the clip will land if it snaps to a neighboring clip edge. If the drop position collides with an existing clip, the system automatically relocates the clip to the nearest available position.

### Moving Clips

Drag a clip horizontally to reposition it in time, or drag it onto a different track of the same type. The snap-to-neighbor behavior applies here as well.

### Resizing Clips

Drag the **right edge** of a clip to extend or shorten its timeline duration. The source media range (`mediaStart`, `mediaEnd`) is unchanged — only `timelineEnd` is modified.

### Clip Context Menu (Right-Click)

| Action            | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| Split at Playhead | Divides the clip at the current playhead into two independent clips |
| Copy              | Copies the clip to the clipboard                                    |
| Delete            | Removes the clip from the track                                     |
| Extract Audio     | (Video clips only) Creates a linked AudioClip on a new audio track  |

### Track Controls

Each track header (left side) has:

- **Drag handle** for reordering tracks (changes compositing order)
- **Visibility toggle** (eye icon)
- **Lock toggle**
- **Delete button** (only shown if removing the track would not leave fewer than one track of its type)

The Toolbar provides **+ Video Track** and **+ Audio Track** buttons to add new tracks.

---

## Preview Player

The center panel shows a real-time preview of the composition at the current playhead position.

**Canvas**: A 1280×720 logical canvas scaled to fit the panel. All active clips across all tracks are composited simultaneously — foreground tracks (lower `order`) appear on top.

**Transport controls**:

- Skip to start / Skip to end
- Rewind 5 s / Forward 5 s
- Play / Pause
- Mute toggle + Volume slider

**Clip selection**: Click anywhere in the preview canvas to select the topmost clip under the cursor. The selected clip is highlighted on the timeline and its properties appear in the Inspector panel.

**Transform overlay**: When a video or image clip is selected, an SVG overlay appears with move, resize, and rotate handles.

---

## Inspector Panel

The right panel shows per-clip properties for the selected clip. It has up to three tabs:

### Video Tab — Color Grading

Available for video and image clips. Provides seven per-clip adjustments:

| Parameter  | Effect                                  |
| ---------- | --------------------------------------- |
| Brightness | Overall lightness / darkness            |
| Contrast   | Difference between light and dark areas |
| Saturation | Color intensity (0 = grayscale)         |
| Gamma      | Mid-tone correction                     |
| Exposure   | Simulates camera exposure change        |
| Shadow     | Lift or crush the shadow region         |
| Definition | Unsharp mask (micro-contrast / clarity) |

Changes are visible **live** in the preview canvas as CSS filters. Gamma, shadow, and definition are approximated in the preview; the full adjustment accuracy is only reproduced in the final FFmpeg export.

### Audio Tab — Audio Processing

Available for video and audio clips.

| Control  | Range   | Notes                                            |
| -------- | ------- | ------------------------------------------------ |
| Mute     | on/off  | Completely silences the clip                     |
| Volume   | 0–200%  | Values above 100% amplify via Web Audio GainNode |
| Fade In  | seconds | Ramps volume from silence at clip start          |
| Fade Out | seconds | Ramps volume to silence at clip end              |
| Balance  | L to R  | Stereo pan position                              |

### Speed Tab — Playback Speed

Available for video and audio clips. A logarithmic slider from **0.1×** (10× slow-motion) to **5×** (5× fast-forward). The slider uses a log scale so slow-motion values have higher resolution than fast-forward values. The timeline `timelineEnd` of the clip is recalculated automatically when speed changes.

---

## Undo / Redo

All destructive operations (add/remove/move clips, color changes, audio changes, speed changes) push a snapshot to the history stack. The stack holds up to 50 entries.

- **Ctrl+Z** / Undo button — restores the previous project state
- **Ctrl+Y** / Redo button — re-applies an undone action

Note: Clipboard contents, proxy states, and playback position are not part of the history.

---

## Export

Click **Export** in the top bar to render the full timeline to an MP4 file.

The export process:

1. `buildRenderJob()` converts the project to a flat list of `RenderSegment` objects (pure data, no React).
2. `renderJob()` passes these segments to the FFmpeg WASM engine.
3. FFmpeg writes all source files into its virtual filesystem, builds a filter graph (overlay compositing for multi-track, color/audio/speed filters per clip), and muxes the output to MP4.
4. The browser downloads the resulting file.

Export runs entirely in the browser. For complex multi-track projects with many color effects, it may take several minutes since WASM is slower than native FFmpeg. Single-track projects without re-encoding effects use stream-copy mode and are significantly faster.

---

## Save and Load

**Save** serializes the current project to a JSON file (via `projectSerializer.ts`) and triggers a browser download. The JSON contains all track and clip metadata, including color and audio settings, but not the media binary files.

**Load** reads a previously saved JSON file and restores the project state. After loading, the user must re-import the original media files for playback to work, since file data is not embedded in the save file. 2. **Clips**: Each clip rendered with:

- Correct timeline position (left = `timelineStart * timelineScale`)
- Correct width (width = `(timelineEnd - timelineStart) * timelineScale`)
- Selection state (highlighted if `selectedClipId === clipId`)

3. **Gap areas**: Empty space before/after clips where new media can be dropped
4. **Playhead line**: Vertical indicator showing current play position

## Playhead and Scrubbing

### Playhead Position

The playhead is a vertical line indicating the current playback time. It's controlled by:

- **Automatic movement**: When playing, playhead advances at real-time speed
- **Manual scrubbing**: User can click/drag on the timeline ruler to move playhead
- **Click on timeline**: Clicking any point on a track scrubs to that time

The playhead position is stored in `editorStore.playhead` (in seconds).

### Synchronization

When the playhead moves, the preview player must:

1. Update all media elements to show the correct frame
2. Pause any audio that's no longer active
3. Start playing any newly-active audio
4. Render the correct video frame to the canvas

This synchronization happens via the `useMediaSync` hook and `activeClipResolver`.

## Preview Player

### Overview

The PreviewPlayer is the viewport showing what the combined project looks like at the current playhead position. It handles:

- Canvas-based video rendering with transforms
- Multi-track video compositing
- Audio playback synchronization
- Playback controls (play, pause, seek, volume)

### Architecture

The preview player uses a **double-buffering technique** for smooth playback:

- Two video HTML elements (`videoRefA` and `videoRefB`)
- While one element is displaying, the other is being prepared
- When the displayed element ends, the buffer is swapped
- This eliminates flickers and ensures smooth playback

### Video Rendering

The canvas rendering system:

1. **Canvas Setup**: HTML5 canvas initialized with project dimensions (default 1280x720)
2. **Active Clip Resolution**: For the current playhead position, determines which video clips should be visible
3. **Transform Application**: Each visible clip's transformation is applied
4. **Compositing**: Clips are drawn in layer order (track order)
5. **RequestAnimationFrame Loop**: Continues at 60fps for smooth preview

The transform system applies:

- **Position**: x, y offset in pixels
- **Scale**: width, height as absolute pixel dimensions
- **Rotation**: 2D rotation in degrees around the center

### Audio Synchronization

Audio is handled separately from video:

1. **Audio Pool**: Multiple HTML audio elements, one per audio track
2. **Active Clip Lookup**: For current playhead, find which audio clips are active
3. **Seek and Play**: Each audio element is seeked to the correct position and played
4. **Volume and Mute**: User-controlled via player controls
5. **Drift Correction**: If audio drifts, it's re-seeked to the exact position

This complexity is necessary because:

- Video and audio may be on separate media elements
- Multiple audio tracks need to play simultaneously
- Synchronization between video and audio must be tight

### Playback Controls

The player UI includes:

- **Play/Pause**: Control whether time advances
- **Volume Slider**: Adjust overall playback volume
- **Mute**: Quickly toggle all audio
- **Seek Buttons**: Jump forward/backward by set intervals
- **Time Display**: Show current time and total duration

## Clip Management

### Creating Clips

Clips are created when media is dragged to the timeline. The `addClip(clip)` action:

1. Validates the clip doesn't collide with existing clips
2. Adds the clip to the appropriate track
3. Pushes a history entry for undo support

### Moving Clips

`moveClip(clipId, newStart, trackId)` relocates a clip:

1. Finds the clip in its current track
2. Checks for collisions at the new position
3. Removes from old track, adds to new track
4. Updates clip's `timelineStart` and `timelineEnd` accordingly

### Resizing Clips

`resizeClip(clipId, newEnd)` changes a clip's end time (handles trim operations):

1. Validates new end time is after start time
2. Updates clip's `timelineEnd`
3. This doesn't affect the media start/end (the portion of the source file being used)

### Splitting Clips

`splitClip(clipId, time)` divides one clip into two clips at a given time:

1. Creates two new clips from the original
2. First clip ends at the split time
3. Second clip starts at the split time
4. Both clips reference the same media but different portions
5. Removes the original clip

### Trimming Clips

Trimming is different from resizing. `resizeClip` changes when a clip ends on the timeline, but **trimming** changes which portion of the source media is used. This is typically done via a separate trim interface that modifies `mediaStart` and `mediaEnd` without changing `timelineStart` and `timelineEnd`.

## Transformations

### Transform Object

Each video/image clip can have a transform with properties:

```typescript
{
  x: number,        // Horizontal position in pixels
  y: number,        // Vertical position in pixels
  width: number,    // Width in pixels
  height: number,   // Height in pixels
  rotation: number  // Rotation in degrees (0-360)
}
```

Default transform places media at top-left (0,0) with project dimensions.

### Applying Transforms

The transform overlay provides visual UI for modifying transforms. When user drags/resizes:

1. `updateClipTransform(clipId, partial)` updates the transform while dragging
2. Changes are reflected immediately in preview
3. On completion or commit, `commitTransform(clipId)` finalizes the change
4. History entry is created for undo support

### Transform Rendering

When rendering a clip:

1. Canvas context is saved
2. Transform is applied via canvas methods (translate, scale, rotate)
3. Media is drawn to canvas
4. Canvas context is restored

## History and Undo/Redo

### History System

AloMedia maintains a complete history of project states:

**HistoryEntry**: Contains:

- Snapshot of the entire project state
- Description of the change (e.g., "Added clip", "Moved clip")

**Store State**:

- `history`: Array of all previous states
- `historyIndex`: Current position in history (0 = initial state)

### Recording Changes

`pushHistory(description)` saves the current project state:

1. All states after `historyIndex` are discarded (branching)
2. Current project state is cloned and added to history
3. `historyIndex` is incremented
4. This allows full undo/redo support

### Undo and Redo

**`undo()`**: Moves `historyIndex` backward if possible, restoring previous state

**`redo()`**: Moves `historyIndex` forward if possible, restoring next state

History is limited to prevent excessive memory usage. Consider implementing a maximum history size (e.g., 50 states).

## Collision Detection

### Purpose

To prevent clips from overlapping on the same track, the timeline uses collision detection:

```
hasCollision(trackId, start, end): boolean
```

Returns true if any existing clip on the track overlaps the time range [start, end].

### Algorithm

For each existing clip on the track:

```
clipStart <= newEnd AND clipEnd >= newStart
```

If this condition is true, clips overlap and collision exists.

### Usage

Before adding or moving a clip, `hasCollision()` is called. If true, the operation is rejected with visual feedback to the user.

## Clip Lookup and Active Resolution

### Active Clip Resolution

At any given playhead position, determining which clips should be visible is complex with multiple tracks:

**Algorithm** (from `activeClipResolver.ts`):

1. Scan each video track in order of visual priority (lower track order first)
2. For each track, find all clips that overlap the playhead position
3. If multiple clips overlap, pick the one with the latest start time (incoming clip wins)
4. Return the first clip found from the highest-priority track with an active clip

This ensures:

- Only one video clip visible at a time (even with overlapping clips)
- The topmost overlapping clip is displayed
- Correct clip transitions happen at timeline boundaries

### Looking Up Next Clip

`getNextVideoClip()` finds the next clip that will become active:

1. Check if any clip starts exactly when current clip ends
2. If not, find all clips starting at or after the current clip's end
3. Pick the nearest clip by time
4. Break ties by track order

This is used to buffer the next clip's media in advance for smooth transitions.

## Media Synchronization

### Purpose

Synchronizing video, audio, and canvas rendering is one of the hardest problems in video editing:

- Video plays from an HTML video element (has its own timing)
- Audio plays from HTML audio elements (separate timing)
- Canvas rendering happens at 60fps (different timing)
- User may scrub or pause, breaking all synchronization
- Multiple audio tracks must play in perfect sync

### Solution: useMediaSync Hook

The `useMediaSync` hook coordinates all these timing sources:

**Input State**:

- Current playhead position
- Play/pause state
- Whether app is in focus
- Volume and mute level

**Output State**:

- Three video element refs (primary, buffer, secondary)
- Method to get object URLs for media files
- Method to handle frame updates

**Synchronization Process**:

1. **Per-frame (RAF)**:
   - Read current time from primary video element
   - Calculate media time for current clip
   - Compare against playhead
   - Apply drift correction if needed

2. **Clip transitions**:
   - When primary clip ends, swap to buffered secondary clip
   - Continue playing without interruption
   - The now-idle primary element loads the next clip

3. **Audio sync**:
   - Active audio clips are synced via `syncAudioElements()`
   - Runs after every playhead update
   - Handles seeking, pausing, and volume

### Drift Correction

Over time, playback can drift:

```
actualTime - expectedTime > DRIFT_CORRECTION_THRESHOLD
```

When drift exceeds the threshold (default 33ms), the video is seeked back to the exact position. This keeps video and audio in perfect sync.

## Project Serialization

### Saving Projects

Projects can be saved to JSON and reloaded later. The serialization process:

1. Convert project object to JSON string
2. Include version number for compatibility
3. Include timestamps (createdAt, updatedAt)
4. Store in localStorage or backend database

**Note**: Media files are NOT serialized (too large). Instead, file references by ID are stored. When opening a project, users must re-import media or specify the source files.

### Loading Projects

When opening a saved project:

1. Load JSON from storage
2. Deserialize into project object
3. Re-import or ref-link the media files
4. Populate the timeline with clips
5. Set playhead to start position

## Performance Optimization

### Proxy Videos

For smooth timeline scrubbing with full-quality videos, AloMedia generates low-resolution proxy versions:

- **Proxy**: Small file (~5-10% of original size), low resolution (480p typical)
- **Original**: Full resolution, only used for final render

Timeline scrubbing uses proxies for instant responsiveness. Final export uses originals for quality.

### Lazy Loading

Media files are only loaded into memory when needed:

- Imported files are stored but not immediately processed
- Proxies are generated asynchronously
- Canvas rendering only processes active clips

### Clip Indexing

For fast lookup of active clips, a clip index structure can be built:

```typescript
interface ClipIndex {
  [trackId]: Clip[]; // Sorted by start time
}
```

Binary search or other techniques can then quickly find clips at a given time.

## Future Enhancements

Planned features for the video editor:

- **Effects and Filters**: Apply color correction, blur, etc.
- **Transitions**: Automatic fade/wipe between clips
- **Text Overlay**: Add titles, subtitles
- **Keyframe Animation**: Animate transformations over time
- **Speed Control**: Speed up/slow down clips
- **Cross-fade Audio**: Smooth audio transitions
- **Multi-select**: Edit multiple clips at once
- **Snap to Grid**: Alignment assistance
- **Rulers and Guides**: Positioning helps
