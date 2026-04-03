import type { TextClip } from "../project/projectTypes"

function sanitizeFileStem(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "text_clip"
}

function buildCanvasFont(style: TextClip["style"]): string {
  const parts: string[] = []
  if (style.italic) parts.push("italic")
  if (style.bold) parts.push("bold")
  parts.push(`${style.fontSize}px`)
  parts.push(style.fontFamily)
  return parts.join(" ")
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n")
  const lines: string[] = []

  const pushWrappedWord = (word: string, currentLines: string[]): void => {
    let fragment = ""
    for (const char of word) {
      const nextFragment = fragment + char
      if (ctx.measureText(nextFragment).width <= maxWidth || fragment.length === 0) {
        fragment = nextFragment
      } else {
        currentLines.push(fragment)
        fragment = char
      }
    }
    if (fragment.length > 0) currentLines.push(fragment)
  }

  for (const paragraph of paragraphs) {
    if (paragraph.trim().length === 0) {
      lines.push("")
      continue
    }

    const words = paragraph.split(/\s+/).filter(Boolean)
    let current = ""

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word
      if (ctx.measureText(candidate).width <= maxWidth) {
        current = candidate
        continue
      }

      if (current) {
        lines.push(current)
        current = ""
      }

      if (ctx.measureText(word).width <= maxWidth) {
        current = word
      } else {
        pushWrappedWord(word, lines)
      }
    }

    if (current) lines.push(current)
  }

  return lines.length > 0 ? lines : [text]
}

type TextClipRenderSource = Pick<TextClip, "content" | "style" | "transform">

export async function renderTextClipToPngBytes(clip: TextClipRenderSource): Promise<Uint8Array> {
  const width = Math.max(1, Math.round(clip.transform.width))
  const height = Math.max(1, Math.round(clip.transform.height))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("[export] Could not create 2D canvas context for text clip rendering")
  }

  const style = clip.style
  const fontSize = Math.max(1, style.fontSize)
  const lineHeight = fontSize * 1.25
  const horizontalAlign = style.textAlign === "left" ? "left" : style.textAlign === "right" ? "right" : "center"
  const textX = style.textAlign === "left" ? 0 : style.textAlign === "right" ? width : width / 2

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, style.opacity))

  if (style.backgroundColor) {
    ctx.fillStyle = style.backgroundColor
    ctx.fillRect(0, 0, width, height)
  }

  ctx.font = buildCanvasFont(style)
  ctx.fillStyle = style.color
  ctx.textAlign = horizontalAlign
  ctx.textBaseline = "top"

  const lines = wrapTextLines(ctx, clip.content, width)
  const totalTextHeight = lines.length * lineHeight
  const startY = Math.max(0, (height - totalTextHeight) / 2)

  for (let i = 0; i < lines.length; i++) {
    const lineY = startY + i * lineHeight
    ctx.fillText(lines[i], textX, lineY)
  }

  ctx.restore()

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(result => {
      if (!result) {
        reject(new Error("[export] Failed to encode text clip canvas as PNG"))
        return
      }
      resolve(result)
    }, "image/png")
  })

  return new Uint8Array(await blob.arrayBuffer())
}

export function buildTextClipFileName(clipId: string): string {
  return `generated-text-${sanitizeFileStem(clipId)}.png`
}