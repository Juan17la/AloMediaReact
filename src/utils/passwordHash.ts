import * as CryptoJS from "crypto-js"

export function hashPassword(password: string): string {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex)
}