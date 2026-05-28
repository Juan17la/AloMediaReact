import Cookies from "js-cookie"
import type { FieldError } from "./errors"
import { ApiError } from "./errors"

export { getAuthHeader } from "./authHeader"

export type RequestInterceptor = (config: RequestConfig) => RequestConfig | Promise<RequestConfig>
export type ResponseInterceptor = <T>(response: Response) => Promise<T>

export interface RequestConfig {
  path: string
  options: RequestInit
  parse: boolean
}

const BASE_URL = import.meta.env.VITE_BASE_URL

class HttpClient {
  private requestInterceptors: RequestInterceptor[] = []
  private responseInterceptors: ResponseInterceptor[] = []

  async request<T>(
    path: string,
    options: RequestInit & { parse?: boolean } = {}
  ): Promise<T> {
    const { headers: customHeaders, ...restOptions } = options
    let config: RequestConfig = {
      path,
      options: {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(customHeaders as Record<string, string> || {}),
        },
        ...restOptions,
      },
      parse: options.parse ?? true,
    }

    for (const interceptor of this.requestInterceptors) {
      config = await interceptor(config)
    }

    const res = await fetch(`${BASE_URL}${config.path}`, config.options)

    if (!config.parse) {
      if (!res.ok) throw new ApiError(`HTTP ${res.status}`, res.status, [])
      return undefined as T
    }

    return this.handleResponse<T>(res)
  }

  private async handleResponse<T>(res: Response): Promise<T> {
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

  async get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" })
  }

  async post<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  async put<T>(path: string, body: unknown, options?: RequestInit): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    })
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" })
  }

  async blob(path: string): Promise<Blob | null> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
      },
    })

    if (!res.ok) return null
    return res.blob()
  }

  private getToken(): string {
    return Cookies.get("token") ?? ""
  }

  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor)
  }

  addResponseInterceptor(interceptor: ResponseInterceptor): void {
    this.responseInterceptors.push(interceptor)
  }
}

export const httpClient = new HttpClient()

export async function http<T>(
  path: string,
  options: RequestInit & { parse?: boolean } = {}
): Promise<T> {
  return httpClient.request<T>(path, options)
}

export async function httpBlob(path: string): Promise<Blob | null> {
  return httpClient.blob(path)
}