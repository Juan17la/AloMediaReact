# Quality, Risks and Technical Limits

## Objective

Register known risks, their potential impact, and recommended mitigation strategies to guide safe evolution of the product.

---

## Performance Risks

### 1. History Snapshots Memory Growth

**Risk:** The undo system stores full project snapshots via `JSON.parse(JSON.stringify(...))`. Memory usage grows linearly with history depth.

**Impact:** On large projects (many clips, long timelines), each snapshot can be several MB. A hundred snapshots could consume hundreds of MB.

**Mitigation:**
- Evaluate delta-based history for large projects (store only changed fields)
- Implement history depth limit (e.g., max 50 states)
- Compress snapshots using a library like `jsonpack` or `pako`
- Monitor memory usage in production

**Current Status:** Acceptable for typical sessions. No formal limit exists.

---

### 2. Timeline Collision Detection (Linear Scan)

**Risk:** Collision detection and snapping iterate all clips on a track. This is O(n) where n = clips per track.

**Impact:** On timelines with hundreds of clips on a single track, drag operations may become sluggish.

**Mitigation:**
- Implement interval tree or segment tree per track for O(log n) collision queries
- Cache collision results during drag operations
- Benchmark with synthetic dense timelines

**Current Status:** Not a problem for typical use (dozens of clips). Degradation starts around 200+ clips per track.

---

### 3. Memory Pressure from Media Files

**Risk:** Original media files, proxy videos, and FFmpeg virtual filesystem all coexist in memory during export.

**Impact:** Large projects with 4K source files can exceed available RAM, causing browser tab crashes or export failures.

**Mitigation:**
- Implement proxy resolution for export (currently uses originals)
- Add project size estimation before export
- Warn users when project exceeds memory thresholds
- Consider chunked processing for very large projects

**Current Status:** No explicit memory management. Relies on browser garbage collection.

---

## Temporal Consistency Risks

### 4. Floating-Point Drift

**Risk:** Repeated floating-point arithmetic on time values can introduce micro-gaps or micro-overlaps between clips.

**Impact:** Clips that should be adjacent may have 0.0001s gaps, causing black frames. Or they may overlap slightly, causing duplicate frames.

**Mitigation:**
- `toMs()` / `toSeconds()` normalization ensures millisecond precision
- `CLIP_EPSILON` constant used for all overlap/adjacency checks
- Snap operations round to exact millisecond boundaries

**Current Status:** Well mitigated by normalization. Occasional edge cases may still exist with speed changes.

---

### 5. Preview vs Export Visual Differences

**Risk:** Preview uses CSS filters (`filter: brightness() contrast() ...`) while export uses FFmpeg filters (`eq`, `colorbalance`). The mathematical implementations differ slightly.

**Impact:** Users may see a color/brightness difference between preview and exported video, leading to confusion or rejection of exports.

**Mitigation:**
- Document known tolerances in UI (e.g., "Preview is approximate")
- Calibrate presets so CSS and FFmpeg filters produce visually similar results
- Allow users to render a short preview segment before full export

**Current Status:** Differences are usually subtle. No formal calibration exists.

---

## Export Risks

### 6. Cancellation at Critical Moments

**Risk:** Cancelling export during file writing or FFmpeg process termination can leave the virtual filesystem or server in an inconsistent state.

**Impact:** Subsequent exports may fail until the page is refreshed. Server-side jobs may continue running after client cancellation.

**Mitigation:**
- Strict cleanup in WASM encoder (`cleanupFiles()`)
- Server-side DELETE endpoint for job cancellation
- Reset FFmpeg instance state on cancellation
- Test cancellation at every export stage

**Current Status:** Cleanup is implemented but not exhaustively tested under load.

---

### 7. Browser Codec Variability

**Risk:** Different browsers decode source videos differently, especially for less common codecs (HEVC, VP9, AV1).

**Impact:** Preview may work in Chrome but fail in Firefox. Export may succeed but produce different colors.

**Mitigation:**
- Test matrix across Chrome, Firefox, Safari, Edge
- Document supported input codecs
- Convert problematic inputs to standard formats on import (future)
- Use FFmpeg for preview decoding as fallback (too slow currently)

**Current Status:** Relies on browser native decoding. No fallback.

---

### 8. Server Export Unavailability

**Risk:** The export server (Railway) may be down, cold-started, or rate-limited.

**Impact:** Export falls back to WASM, which is significantly slower. Users on slow machines may experience timeouts or crashes.

**Mitigation:**
- `wakeUpServer()` handles cold-start with retries
- Clear UI messaging when falling back to WASM
- Option to force WASM for privacy-conscious users
- Monitor server uptime and alert on outages

**Current Status:** Fallback works but UX could be improved with better messaging.

---

## Product and Operational Risks

### 9. Missing Media on Project Reopen

**Risk:** When a user reopens a project, media files may not be in IndexedDB (cleared, different browser, different device).

**Impact:** Clips reference media that cannot be resolved. Preview shows black. Export fails.

**Mitigation:**
- `MediaRelinkDialog` allows users to re-import missing files
- Clear UI warnings with list of missing media
- Hash-based matching so re-imported files automatically link to existing clips
- Future: cloud storage integration for automatic media sync

**Current Status:** Relink dialog exists but UX could be smoother.

---

### 10. Dependency on Remote FFmpeg Resources

**Risk:** The app loads FFmpeg WASM cores from `/ffmpeg-core/` (local) but the export server is remote.

**Impact:** If the export server domain changes or becomes unavailable, export falls back to WASM. If local cores are missing, export fails entirely.

**Mitigation:**
- `copy-ffmpeg-core.cjs` ensures cores are in build output
- Build verification step checks core file presence
- Health check before export attempt

**Current Status:** Local cores are bundled. Remote server is optional.

---

## Technical Debt

### 11. No Formal Project Version Migration

**Risk:** `projectSerializer.ts` has a `PROJECT_SCHEMA_VERSION` (currently 3) but no formal migration framework.

**Impact:** Future schema changes require ad-hoc conversion code.

**Mitigation:**
- Implement migration pipeline: `v1 -> v2 -> v3 -> v4`
- Store schema version in every saved project
- Log migrations for debugging

**Current Status:** Version is stored but migration logic is minimal.

---

### 12. Partial Edge Case Coverage for Complex Tracks

**Risk:** Very complex timelines (nested transitions, many overlapping audio tracks, extreme speed changes) may not be fully handled.

**Impact:** Export may produce incorrect output or fail.

**Mitigation:**
- Property-based testing for timeline generation
- Fuzz testing for collision detection
- Integration tests for export with synthetic complex projects

**Current Status:** Limited automated test coverage.

---

### 13. Lack of Automated Tests for Player and Export

**Risk:** The player (RAF loop, video buffers, audio sync) and export pipeline have no automated tests.

**Impact:** Regressions in playback or export may go unnoticed.

**Mitigation:**
- Unit tests for `editHistory.ts`, `clipIndex.ts`, `time.ts`
- Integration tests for export pipeline with small sample files
- Visual regression tests for preview rendering
- Performance benchmarks for timeline operations

**Current Status:** No test suite exists.

---

## Security Risks

### 14. Client-Side JWT Storage

**Risk:** JWT tokens are stored in cookies via `js-cookie`, which is client-accessible.

**Impact:** XSS vulnerability could steal tokens.

**Mitigation:**
- Migrate to HttpOnly cookies set by backend
- Implement Content Security Policy (CSP)
- Sanitize all user-generated content before DOM insertion

**Current Status:** Client-side cookie storage. No CSP header.

---

### 15. File Upload Validation

**Risk:** Media import accepts files based on extension and MIME type, but does not deeply inspect file contents.

**Impact:** Malicious files could be uploaded to the export server or processed by FFmpeg.

**Mitigation:**
- Validate file headers (magic numbers) in addition to extensions
- Sandbox FFmpeg execution (WASM provides natural sandboxing)
- Scan uploads on server side
- Limit file size per upload

**Current Status:** Basic extension/MIME validation only.

---

## Recommended Priorities

### Immediate (Next Sprint)
1. Add 401 response interceptor to auto-logout on auth failure
2. Implement history depth limit to cap memory usage
3. Add explicit memory estimation before export with user warning

### Short Term (Next Month)
4. Introduce unit tests for `editHistory`, `clipIndex`, `time` utilities
5. Add export integration tests with small sample videos
6. Improve missing media relink UX
7. Add CSP headers and review XSS vectors

### Medium Term (Next Quarter)
8. Evaluate delta-based history for memory optimization
9. Implement interval tree for O(log n) collision detection
10. Add preview/export calibration for color filters
11. Introduce property-based testing for timeline operations
12. Evaluate cloud storage for media persistence

### Long Term (Next Year)
13. Real-time collaboration via WebSocket/CRDT
14. Mobile/tablet touch-optimized editing mode
15. Plugin system for custom filters and transitions

---

## Risk Matrix

| Risk | Likelihood | Impact | Priority |
|------|------------|--------|----------|
| History memory growth | Medium | Medium | High |
| Linear collision detection | Low | Low | Medium |
| Media memory pressure | Medium | High | High |
| Floating-point drift | Low | Medium | Low |
| Preview/export diff | Medium | Medium | Medium |
| Cancellation state | Low | Medium | Medium |
| Browser codec variability | Medium | Medium | Medium |
| Server unavailability | Medium | Medium | Low |
| Missing media on reopen | High | Medium | High |
| No project migrations | Low | Low | Low |
| Complex track edge cases | Low | High | Medium |
| No automated tests | High | High | Critical |
| Client JWT storage | Medium | High | High |
| File upload validation | Low | High | Medium |
