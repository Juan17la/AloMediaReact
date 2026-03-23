import Cookies from "js-cookie"
import { http } from "../api/http"
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  MeResponse,
  RecoverRequestPayload,
  RecoverResetPayload
} from "../types/authTypes"

export async function signIn(payload: LoginPayload): Promise<AuthResponse> {
  const data = await http<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  })
  Cookies.set("token", data.token)
  return data
}

export async function signUp(payload: RegisterPayload): Promise<AuthResponse> {
  const data = await http<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  })
  Cookies.set("token", data.token)
  return data
}

export function me() {
  return http<MeResponse>("/auth/me", {
    method: "GET"
  })
}

export async function signout(): Promise<void> {
  await http<void>("/auth/logout", {
    method: "POST",
    parse: false
  })
  Cookies.remove("token")
}

export function recoverRequest(payload: RecoverRequestPayload) {
  return http<void>("/auth/recover/request", {
    method: "POST",
    body: JSON.stringify(payload),
    parse: false
  })
}

export function validateRecoverToken(token: string) {
  return http<{ valid: boolean }>(`/auth/recover/validate?token=${token}`)
}

export function recoverReset(payload: RecoverResetPayload) {
  return http<void>("/auth/recover/reset", {
    method: "POST",
    body: JSON.stringify(payload),
    parse: false
  })
}
