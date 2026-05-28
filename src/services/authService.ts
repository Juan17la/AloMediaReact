import Cookies from "js-cookie"
import { http } from "../api/http"
import { getAuthHeader } from "../api/authHeader"
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  MeResponse,
  RecoverRequestPayload,
  RecoverResetPayload
} from "../types/authTypes"

export class AuthService {
  private static _instance: AuthService

  static get instance(): AuthService {
    if (!AuthService._instance) {
      AuthService._instance = new AuthService()
    }
    return AuthService._instance
  }

  async signIn(payload: LoginPayload): Promise<AuthResponse> {
    const data = await http<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    })
    Cookies.set("token", data.token)
    return data
  }

  async signUp(payload: RegisterPayload): Promise<AuthResponse> {
    const data = await http<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    })
    Cookies.set("token", data.token)
    return data
  }

  me(): Promise<MeResponse> {
    return http<MeResponse>("/auth/me", {
      method: "GET",
      headers: getAuthHeader()
    })
  }

  async signout(): Promise<void> {
    await http<void>("/auth/logout", {
      method: "POST",
      parse: false,
      headers: getAuthHeader()
    })
    Cookies.remove("token")
  }

  recoverRequest(payload: RecoverRequestPayload): Promise<void> {
    return http<void>("/auth/recover/request", {
      method: "POST",
      body: JSON.stringify(payload),
      parse: false
    })
  }

  validateRecoverToken(token: string): Promise<{ valid: boolean }> {
    return http<{ valid: boolean }>(`/auth/recover/validate?token=${token}`)
  }

  recoverReset(payload: RecoverResetPayload): Promise<void> {
    return http<void>("/auth/recover/reset", {
      method: "POST",
      body: JSON.stringify(payload),
      parse: false
    })
  }
}

export const authService = AuthService.instance

export const signIn = (payload: LoginPayload) => authService.signIn(payload)
export const signUp = (payload: RegisterPayload) => authService.signUp(payload)
export const me = () => authService.me()
export const signout = () => authService.signout()
export const recoverRequest = (payload: RecoverRequestPayload) => authService.recoverRequest(payload)
export const validateRecoverToken = (token: string) => authService.validateRecoverToken(token)
export const recoverReset = (payload: RecoverResetPayload) => authService.recoverReset(payload)