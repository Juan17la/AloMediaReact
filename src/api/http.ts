import type { FieldError } from "./errors"
import { ApiError } from "./errors"

const BASE_URL = import.meta.env.VITE_BASE_URL

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as {
      message?: string
      errors?: FieldError[]
      status?: number
    }

    throw new ApiError(
      body.message ?? `HTTP ${res.status}`,
      body.status ?? res.status,
      body.errors ?? []
    )
  }

  return res.json() as Promise<T>
}

export async function http<T>(
  path: string,
  options: RequestInit & { parse?: boolean } = {}
): Promise<T> {
  const { parse = true, ...fetchOptions } = options

  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(fetchOptions.headers || {})
    },
    ...fetchOptions
  })

  if (!parse) {
    if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status, [])
    return undefined as T
  }

  return handleResponse<T>(res)
}