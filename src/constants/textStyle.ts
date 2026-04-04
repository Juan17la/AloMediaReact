import type { TextStyle } from "../project/projectTypes"
import type { Transform } from "../project/projectTypes"

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 48,
  fontFamily: "Inter, sans-serif",
  color: "#ffffff",
  backgroundColor: undefined,
  textAlign: "center",
  opacity: 1,
  bold: false,
  italic: false,
}

/** Centered 800×120 box in a 1280×720 canvas. */
export const DEFAULT_TEXT_TRANSFORM: Transform = {
  x: 240,
  y: 300,
  width: 800,
  height: 120,
  rotation: 0,
}

export const TEXT_FONT_FAMILIES: { label: string; value: string }[] = [
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Impact", value: "Impact, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
]
