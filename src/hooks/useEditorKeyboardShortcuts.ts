import { useEffect, useRef } from "react"
import { useEditorStore } from "../store/editorStore"
import { usePlayer } from "./usePlayer"
import { triggerFileInputRef } from "../utils/fileInputTrigger"
import {
  MIN_PIXELS_PER_SECOND,
  MAX_PIXELS_PER_SECOND,
  TIMELINE_ZOOM,
  ZOOM_HOLD_DELAY_MS,
  ZOOM_HOLD_INTERVAL_MS,
  FRAME_STEP_SECONDS,
} from "../constants/timeline"

/** Returns true when the event target is a text-entry element — shortcuts should not fire. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!target) return false
  const el = target as HTMLElement
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true
  if (el.isContentEditable) return true
  return false
}

function getShortcutKey(e: KeyboardEvent): string {
  const modifiers: string[] = []
  if (e.ctrlKey || e.metaKey) modifiers.push('ctrl')
  if (e.shiftKey) modifiers.push('shift')
  return modifiers.length > 0 ? `${modifiers.join('+')}+${e.key}` : e.key
}

// Hold-to-zoom refs — stored at module level so the keyup handler can clear them
// without stale closure issues.
const zoomInIntervalRef = { current: null as ReturnType<typeof setInterval> | null }
const zoomInTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null }
const zoomOutIntervalRef = { current: null as ReturnType<typeof setInterval> | null }
const zoomOutTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null }

function clearZoomIn() {
  if (zoomInIntervalRef.current !== null) { clearInterval(zoomInIntervalRef.current); zoomInIntervalRef.current = null }
  if (zoomInTimeoutRef.current !== null) { clearTimeout(zoomInTimeoutRef.current); zoomInTimeoutRef.current = null }
}
function clearZoomOut() {
  if (zoomOutIntervalRef.current !== null) { clearInterval(zoomOutIntervalRef.current); zoomOutIntervalRef.current = null }
  if (zoomOutTimeoutRef.current !== null) { clearTimeout(zoomOutTimeoutRef.current); zoomOutTimeoutRef.current = null }
}

export function useEditorKeyboardShortcuts() {
  const undo = useEditorStore(s => s.undo)
  const redo = useEditorStore(s => s.redo)
  const copyClip = useEditorStore(s => s.copyClip)
  const pasteClip = useEditorStore(s => s.pasteClip)
  const removeClip = useEditorStore(s => s.removeClip)
  const splitClip = useEditorStore(s => s.splitClip)
  const setTimelineScale = useEditorStore(s => s.setTimelineScale)

  const { play, pause, seek } = usePlayer()

  const storeRef = useRef(useEditorStore.getState)

  useEffect(() => {
    function applyZoomIn() {
      const { timelineScale } = storeRef.current()
      const next = Math.min(MAX_PIXELS_PER_SECOND, timelineScale + TIMELINE_ZOOM.STEP_BUTTON)
      setTimelineScale(next)
      if (next >= MAX_PIXELS_PER_SECOND) clearZoomIn()
    }

    function applyZoomOut() {
      const { timelineScale } = storeRef.current()
      const next = Math.max(MIN_PIXELS_PER_SECOND, timelineScale - TIMELINE_ZOOM.STEP_BUTTON)
      setTimelineScale(next)
      if (next <= MIN_PIXELS_PER_SECOND) clearZoomOut()
    }

    function startZoomIn() {
      applyZoomIn()
      zoomInTimeoutRef.current = setTimeout(() => {
        zoomInIntervalRef.current = setInterval(applyZoomIn, ZOOM_HOLD_INTERVAL_MS)
      }, ZOOM_HOLD_DELAY_MS)
    }

    function startZoomOut() {
      applyZoomOut()
      zoomOutTimeoutRef.current = setTimeout(() => {
        zoomOutIntervalRef.current = setInterval(applyZoomOut, ZOOM_HOLD_INTERVAL_MS)
      }, ZOOM_HOLD_DELAY_MS)
    }

    const shortcuts: Record<string, (e: KeyboardEvent) => void> = {
      'ctrl+z': (e) => { e.preventDefault(); undo() },
      'ctrl+y': (e) => { e.preventDefault(); redo() },
      'ctrl+c': (e) => { e.preventDefault(); copyClip() },
      'ctrl+v': (e) => { e.preventDefault(); pasteClip() },
      'ctrl+x': (e) => {
        e.preventDefault()
        const { selectedClipId } = storeRef.current()
        if (!selectedClipId) return
        copyClip()
        removeClip(selectedClipId)
      },
      ' ': (e) => {
        e.preventDefault()
        const { isPlaying } = storeRef.current()
        if (isPlaying) pause()
        else play()
      },
      'shift+I': (e) => { e.preventDefault(); triggerFileInputRef.current?.() },
      'shift+S': (e) => {
        e.preventDefault()
        const { selectedClipId, playhead } = storeRef.current()
        if (!selectedClipId) return
        splitClip(selectedClipId, playhead)
      },
      'shift+=': (e) => { e.preventDefault(); if (!e.repeat) startZoomIn() },
      'shift++': (e) => { e.preventDefault(); if (!e.repeat) startZoomIn() },
      'shift+-': (e) => { e.preventDefault(); if (!e.repeat) startZoomOut() },
      'Delete': (e) => {
        e.preventDefault()
        const { selectedClipId } = storeRef.current()
        if (selectedClipId) removeClip(selectedClipId)
      },
      'Backspace': (e) => {
        e.preventDefault()
        const { selectedClipId } = storeRef.current()
        if (selectedClipId) removeClip(selectedClipId)
      },
      ',': (e) => {
        e.preventDefault()
        const { playhead } = storeRef.current()
        seek(Math.max(0, playhead - FRAME_STEP_SECONDS))
      },
      '.': (e) => {
        e.preventDefault()
        const { playhead } = storeRef.current()
        seek(playhead + FRAME_STEP_SECONDS)
      },
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return
      shortcuts[getShortcutKey(e)]?.(e)
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.shiftKey === false) {
        clearZoomIn()
        clearZoomOut()
        return
      }
      if (e.key === "=" || e.key === "+") clearZoomIn()
      if (e.key === "-") clearZoomOut()
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      clearZoomIn()
      clearZoomOut()
    }
  }, [undo, redo, copyClip, pasteClip, removeClip, splitClip, setTimelineScale, play, pause, seek])
}
