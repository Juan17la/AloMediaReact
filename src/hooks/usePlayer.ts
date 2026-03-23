import { useEditorStore } from "../store/editorStore"
import { getProjectDuration } from "../utils/time"
import { STORE_SYNC_INTERVAL_MS } from "../constants/timeline"
import { createRafLoop } from "../player/core/rafLoop"
import { teardownPlayerState } from "../player/core/playerReset"

// Shared refs — live playhead and playing flag readable from RAF without React re-renders
const playheadRef = { current: 0 };
const isPlayingRef = { current: false };
const onFrameRef = { current: null as ((playhead: number) => void) | null };
const needsReinitRef = { current: false };
const seekFlagResetRef = { current: null as (() => void) | null };

export { playheadRef, isPlayingRef };

const loop = createRafLoop({
  syncInterval: STORE_SYNC_INTERVAL_MS,
  getDuration: () =>
    getProjectDuration(useEditorStore.getState().project.tracks),
  onFrame: (ph) => {
    playheadRef.current = ph;
    onFrameRef.current?.(ph);
  },
  onEnd: (duration) => {
    playheadRef.current = duration;
    isPlayingRef.current = false;
    useEditorStore.getState().setPlayhead(duration);
    useEditorStore.getState().setIsPlaying(false);
  },
  onStoreSync: (ph) => {
    useEditorStore.getState().setPlayhead(ph);
  },
});

const pause = () => {
  if (!isPlayingRef.current) return;
  isPlayingRef.current = false;
  loop.stop();
  
  useEditorStore.getState().setPlayhead(playheadRef.current);
  useEditorStore.getState().setIsPlaying(false);
};

const play = () => {
  if (isPlayingRef.current) return;
  const initialPlayhead = Math.max(0, useEditorStore.getState().playhead);
  playheadRef.current = initialPlayhead;
  if (needsReinitRef.current) {
    onFrameRef.current?.(initialPlayhead);
    needsReinitRef.current = false;
  }
  isPlayingRef.current = true;
  useEditorStore.getState().setIsPlaying(true);
  loop.start(initialPlayhead);
};

const seek = (time: number) => {
  playheadRef.current = time;
  useEditorStore.getState().setPlayhead(time);
  // Signal PreviewPlayer to force re-seek on next frame
  seekFlagResetRef.current?.();
  // Keep RAF internal playhead aligned with explicit seeks while playing.
  if (isPlayingRef.current) {
    loop.stop();
    loop.start(time);
  }
};

const resetPlayerState = () => {
  teardownPlayerState({
    pause,
    isPlayingRef,
    needsReinitRef,
    playheadRef,
    onFrameRef,
  });
};

export function resetPlayer(): void {
  resetPlayerState();
}

export function pausePlayer(): boolean {
  const wasPlaying = isPlayingRef.current;
  pause();
  return wasPlaying;
}

export function resumePlayer(): void {
  play();
}

export function renderSingleFrame(): void {
  if (isPlayingRef.current) return;
  if (!onFrameRef.current) return;
  onFrameRef.current(playheadRef.current);
}

export function usePlayer() {
  const isPlaying = useEditorStore((s) => s.isPlaying);

  

  return { play, pause, seek, isPlaying, onFrameRef, playheadRef, seekFlagResetRef, resetPlayer: resetPlayerState }
}
