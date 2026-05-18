import type { RenderSegment } from "./types"

const CANVAS_W = 1280
const CANVAS_H = 720
const LINE_HEIGHT_RATIO = 1.25

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png")
  })
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.split("\n")
  const allLines: string[] = []

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      allLines.push("")
      continue
    }

    const words = paragraph.split(/\s+/)
    let currentLine = ""

    for (const word of words) {
      if (currentLine.length === 0) {
        currentLine = word
        continue
      }

      const testLine = `${currentLine} ${word}`
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine.length > 0) {
        if (ctx.measureText(word).width > maxWidth) {
          allLines.push(currentLine)
          let brokenWord = ""
          for (const ch of word) {
            const testBroken = brokenWord + ch
            if (ctx.measureText(testBroken).width > maxWidth && brokenWord.length > 0) {
              allLines.push(brokenWord)
              brokenWord = ch
            } else {
              brokenWord = testBroken
            }
          }
          currentLine = brokenWord
        } else {
          allLines.push(currentLine)
          currentLine = word
        }
      } else {
        currentLine = testLine
      }
    }

    if (currentLine.length > 0) {
      allLines.push(currentLine)
    }
  }

  return allLines
}

export async function renderTextSegmentToBlob(
  seg: RenderSegment,
  outputWidth: number,
  outputHeight: number,
): Promise<Blob | null> {
  if (seg.type !== "text" || !seg.content || !seg.style || !seg.transform) return null

  const canvas = document.createElement("canvas")
  canvas.width = outputWidth
  canvas.height = outputHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const scaleX = outputWidth / CANVAS_W
  const scaleY = outputHeight / CANVAS_H

  const s = seg.style
  const t = seg.transform

  ctx.clearRect(0, 0, outputWidth, outputHeight)

  const fontSize = s.fontSize * Math.min(scaleX, scaleY)

  const fontFamily = s.fontFamily ?? "Inter, sans-serif"
  const fontWeight = s.bold ? "bold" : "normal"
  const fontStyle = s.italic ? "italic" : "normal"

  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`

  ctx.textBaseline = "top"

  const px = t.x * scaleX
  const py = t.y * scaleY
  const sw = t.width * scaleX
  const sh = t.height * scaleY

  if (s.backgroundColor) {
    ctx.fillStyle = s.backgroundColor
    ctx.fillRect(px, py, sw, sh)
  }

  ctx.globalAlpha = s.opacity ?? 1
  ctx.fillStyle = s.color ?? "#ffffff"

  const lineHeight = fontSize * (s.lineHeight ?? LINE_HEIGHT_RATIO)
  const lines = wrapText(ctx, seg.content, sw)
  const totalTextHeight = lines.length * lineHeight

  let startY = py + (sh - totalTextHeight) / 2

  if (startY < py) {
    startY = py
  }

  const align = s.textAlign ?? "center"

  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * lineHeight
    if (lineY + lineHeight > py + sh + lineHeight * 0.5) break

    let lineX: number
    if (align === "left") {
      ctx.textAlign = "left"
      lineX = px
    } else if (align === "right") {
      ctx.textAlign = "right"
      lineX = px + sw
    } else {
      ctx.textAlign = "center"
      lineX = px + sw / 2
    }

    if (Math.abs(t.rotation) > 0.01) {
      ctx.save()
      ctx.translate(lineX, lineY + lineHeight / 2)
      ctx.rotate((t.rotation * Math.PI) / 180)
      ctx.fillText(lines[i], 0, -lineHeight / 2)
      ctx.restore()
    } else {
      ctx.fillText(lines[i], lineX, lineY)
    }
  }

  return canvasToBlob(canvas)
}

export async function renderTextSegmentsToPngs(
  segments: RenderSegment[],
  outputWidth: number,
  outputHeight: number,
): Promise<Map<string, Blob>> {
  const textImages = new Map<string, Blob>()

  for (const seg of segments) {
    if (seg.type !== "text" || !seg.content || !seg.style || !seg.transform) continue

    const blob = await renderTextSegmentToBlob(seg, outputWidth, outputHeight)
    if (blob) {
      textImages.set(seg.id, blob)
    }
  }

  return textImages
}
