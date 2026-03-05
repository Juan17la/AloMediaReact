import type { User } from "./userTypes"

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface MeResponse {
  authenticated: boolean
  user: User
}

export interface RecoverRequestPayload {
  email: string
}

export interface RecoverResetPayload {
  token: string
  newPassword: string
  confirmPassword: string
}