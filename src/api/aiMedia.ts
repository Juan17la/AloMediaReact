import Cookies from "js-cookie"
import { ApiError } from "./errors"

const BASE_URL = import.meta.env.VITE_BASE_URL

function appendMultipartJson(form: FormData, key: string, value: unknown): void {
  form.append(key, new Blob([JSON.stringify(value)], { type: "application/json;charset=UTF-8" }), `${key}.json`)
}

// NOTE: Content-Type must NOT be set manually for multipart requests.
// Passing FormData as body lets the browser set `multipart/form-data; boundary=...` automatically.
async function postFormBlob(path: string, form: FormData): Promise<Blob> {
  const token = Cookies.get("token")
  const headers: Record<string, string> = {}
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers,
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as {
      message?: string
      status?: number
    }
    throw new ApiError(
      body.message ?? `HTTP ${res.status}`,
      body.status ?? res.status,
    )
  }

  return res.blob()
}

export async function cleanAudio(file: File): Promise<Blob> {
  const form = new FormData()
  form.append("file", file)
  return postFormBlob("/ai/audio/clean", form)
}

export async function transcribeAudio(file: File): Promise<Blob> {
  const form = new FormData()
  form.append("file", file)
  appendMultipartJson(form, "formats", ["srt"])
  return postFormBlob("/ai/audio/transcribe", form)
}
