import { http } from "../api/http"
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  MeResponse,
  RecoverRequestPayload,
  RecoverResetPayload
} from "../types/authTypes"

export function signIn(payload: LoginPayload) {
  return http<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export function signUp(payload: RegisterPayload) {
  return http<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  })
}

export function me() {
  return http<MeResponse>("/auth/me", {
    method: "GET"
  })
}

export function signout() {
  return http<void>("/auth/logout", {
    method: "POST",
    parse: false
  })
}

export function recoverRequest(payload: RecoverRequestPayload) {
  return http<void>("/auth/recover/request", {
    method: "POST",
    body: JSON.stringify(payload),
    parse: false
  })
}

export function validateRecoverToken(token: string) {
  return http<void>(`/auth/recover/validate?token=${token}`, {
    parse: false
  })
}

export function recoverReset(payload: RecoverResetPayload) {
  return http<void>("/auth/recover/reset", {
    method: "POST",
    body: JSON.stringify(payload),
    parse: false
  })
}