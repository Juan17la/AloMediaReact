# UI and UX

## Objective

Deliver a fluid, predictable, low-friction editing experience optimized for iterative video editing tasks. Every interaction should feel immediate and recoverable.

## Visual Structure of the Editor

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  File   Edit   View   [Export]     [User Menu]  │  ← Top Bar (global actions)
├──────────┬──────────────────────────────┬───────────────┤
│          │                              │               │
│  Media   │                              │   Inspector   │
│ Library  │        Preview Player        │   Panel       │
│          │         (center stage)       │  (contextual) │
│          │                              │               │
│          │     [<<] [Play] [>>]         │               │
│          │     Timecode | Scrubber      │               │
├──────────┴──────────────────────────────┴───────────────┤
│  Timeline                                               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Track 2 (video)  [Clip A][Clip B]               │   │
│  │ Track 1 (video)  [Clip C]   [Clip D]            │   │
│  │ Track 1 (audio)  ~~~~[Audio X]~~~~              │   │
│  └─────────────────────────────────────────────────┘   │
│  Playhead                                               │
└─────────────────────────────────────────────────────────┘
```

This layout prioritizes the preview and timeline, which are the core of the editing flow.

---

## Interaction Patterns

### Drag and Drop

| Source | Target | Action |
|--------|--------|--------|
| File from OS | Media Library | Import media |
| Media Library item | Timeline track | Insert clip at drop position |
| Timeline clip | Another track / position | Move clip (with collision resolution) |

Drag indicators show valid drop zones. Invalid drops are rejected with visual feedback.

### Contextual Selection

- **Single click** a clip → select it, show inspector for its type
- **Ctrl/Cmd + click** → toggle multi-selection
- **Click empty timeline** → deselect all, hide inspector
- **Right-click** clip → context menu (split, delete, copy, group)
- **Right-click** media → context menu (delete, AI tools)

### Immediate Feedback

| System State | Feedback |
|--------------|----------|
| Proxy pending | Spinner badge on media thumbnail |
| Proxy ready | Thumbnail shows preview frame |
| Proxy error | Red error badge with retry option |
| Save in progress | Toast notification |
| Save success | Brief green checkmark |
| Save error | Red toast with retry |
| Export progress | Blocking modal with stage, percent, ETA |
| Missing media | Warning banner in media library |

---

## Keyboard Shortcuts

**File:** `src/hooks/useEditorKeyboardShortcuts.ts`

| Shortcut | Action | Context |
|----------|--------|---------|
| `Space` | Play / Pause | Global (editor focused) |
| `Ctrl+Z` | Undo | Global |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo | Global |
| `Ctrl+C` | Copy selected clip | Global |
| `Ctrl+V` | Paste at playhead | Global |
| `Delete` / `Backspace` | Delete selection | Global |
| `S` | Split at playhead | Global |
| `+` / `=` | Zoom in timeline | Global |
| `-` | Zoom out timeline | Global |
| `Left Arrow` | Step back 1 frame | Global |
| `Right Arrow` | Step forward 1 frame | Global |
| `Shift + Left/Right` | Step 10 frames | Global |
| `Escape` | Close modals, exit group edit | Global |

### Safety Mechanism

All shortcuts are disabled when the active element is:
- `<input>`
- `<textarea>`
- `contenteditable`

This prevents accidentally deleting clips while typing text content.

---

## Design System

### Theme

- **Dark mode default** — Reduces eye strain during long editing sessions.
- **Light mode available** — Toggle in user menu.
- **CSS variables** for all tokens to support instant theme switching.

### Color Tokens

Tailwind v4 semantic colors are used throughout:

| Token | Usage |
|-------|-------|
| `bg-dark-base` | App background |
| `bg-dark-card` | Panel backgrounds |
| `bg-dark-elevated` | Hover states, modals |
| `text-on-surface` | Primary text |
| `text-muted` | Secondary text, labels |
| `border-dark-border` | Dividers, outlines |
| `accent-primary` | Buttons, active states, playhead |
| `accent-danger` | Delete, errors |
| `accent-success` | Success states, ready proxies |

### Typography

- Primary: System sans-serif stack (Inter if available)
- Monospace: For timecodes and technical readouts
- Sizes: 10px for badges, 12px for labels, 14px for body, 16-18px for headings

### Spacing and Layout

- 4px grid base
- Panels have 8-12px padding
- Timeline tracks are 40px tall
- Clip borders are 1px with rounded corners (2-4px radius)
- Transitions are indicated by small badges on clip edges

---

## Timeline Usability

### Temporal Grid

- Vertical grid lines at regular intervals (seconds, 5-second marks, frames depending on zoom)
- Time ruler at the top of the timeline panel
- Current time displayed in large format above the preview

### Playhead

- Bright vertical line spanning all tracks
- Always visible, even when scrolled out of view (via sticky positioning)
- Color: accent-primary
- Height: spans full track area

### Zoom

- Range: 10px/second to 400px/second
- Default: 50px/second
- Controlled by `+`/`-` keys or mouse wheel with modifier
- Smooth animated transitions when zooming

### Snapping

Visual indicators appear when a dragged clip is near a snap target:
- Vertical highlight line at the snap position
- Brief tooltip showing the exact time

Snap targets:
- Clip boundaries (start/end)
- Playhead position
- Other clips on any track (for alignment)
- Regular grid intervals

### Collision Prevention

When dragging a clip over another:
- The dragged clip shows a red outline
- On drop, it is placed immediately after the colliding clip(s)
- No unintentional overlaps are created by default

---

## Preview Usability

### Transport Controls

- Play/Pause button ( Space )
- Step backward/forward by frame
- Go to start / go to end
- Timecode display (HH:MM:SS:FF or HH:MM:SS.mmm)
- Scrubber bar below the video

### Scrubbing

- Click anywhere on the scrubber to jump
- Drag for smooth scrubbing
- During drag, the playhead follows the mouse
- On release, playback resumes if it was playing

### Transform Overlay

When a visual clip is selected:
- A bounding box appears around the clip in the preview
- Drag corners to resize (maintains aspect ratio with Shift)
- Drag edges to resize freely
- Drag center to reposition
- Rotation handle for angle adjustment
- All changes are live-previewed and committed to history on mouse-up

---

## Modal System

### Export Modal

- Blocking modal with progress bar
- Shows engine info (Server GPU / Server CPU / Browser WASM)
- Stage labels: Probing, Planning, Encoding, Finalizing
- Estimated time remaining
- Cancel button (always available)
- On completion: auto-download + "Open folder" hint

### Save Project Modal

- Prompt for project name (if new)
- Dirty state indicator
- Auto-save toggle (future feature)

### Share Project Modal

- Email input with validation
- Current shared users list (future)
- Permission level selector (future)

### AI Tools Modal

- Compact modal for Clean Audio / Transcribe
- Progress spinner during upload/processing
- Result preview before importing

### Media Relink Dialog

- Shows list of missing media with original filenames
- "Re-import" button to select replacement files
- Validates replacement file type matches original

---

## Accessibility Considerations

1. **Keyboard navigation** — All major actions have keyboard shortcuts
2. **Focus management** — Modals trap focus; Escape closes them
3. **ARIA labels** — Icon buttons have aria-labels
4. **Color contrast** — All text meets WCAG AA against dark backgrounds
5. **Reduced motion** — Respect `prefers-reduced-motion` for transitions (future)

---

## Responsive Behavior

The editor is designed for desktop use (minimum 1280x720). On smaller viewports:
- Inspector panel collapses to a tab or bottom sheet
- Media library can be hidden via toggle
- Timeline height remains fixed minimum
- Preview scales down maintaining aspect ratio

Mobile editing is not a target use case due to the precision required for timeline manipulation.

---

## Perceived Quality Factors

The quality of the user experience depends on:

1. **Low edit latency** — Clip moves, resizes, and inspector changes feel instantaneous
2. **Action-result coherence** — Every user action has visible, predictable consequences
3. **Clear error recovery** — Missing media, failed exports, and network errors are explained with actionable next steps
4. **System visibility** — User always knows: what's selected, what's playing, what's dirty, what's exporting

---

## Files Reference

| File | Responsibility |
|------|----------------|
| `src/components/editor/Toolbar.tsx` | Top bar with global actions |
| `src/components/editor/MediaLibrary.tsx` | Media import and management panel |
| `src/components/editor/PreviewPlayer.tsx` | Video preview and transport controls |
| `src/components/editor/InspectorPanel.tsx` | Contextual property editor |
| `src/components/editor/Timeline.tsx` | Timeline container and ruler |
| `src/components/editor/Track.tsx` | Individual track rendering |
| `src/components/editor/Clip.tsx` | Clip rendering and drag handling |
| `src/components/editor/ExportModal.tsx` | Export progress and settings |
| `src/components/editor/SaveProjectModal.tsx` | Save dialog |
| `src/components/editor/ShareProjectModal.tsx` | Share dialog |
| `src/components/editor/AiToolsModal.tsx` | AI tools dialog |
| `src/components/editor/MediaRelinkDialog.tsx` | Missing media recovery |
| `src/components/editor/TransformOverlay.tsx` | Visual transform manipulation |
| `src/hooks/useEditorKeyboardShortcuts.ts` | Keyboard shortcut registration |
