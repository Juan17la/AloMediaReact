/**
 * Computes a SHA-256 hash of the file's binary content.
 * Used at import time (addMedia) and at re-link time (MediaRelinkDialog) —
 * keeping them identical ensures content-based matching across sessions/devices.
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}
