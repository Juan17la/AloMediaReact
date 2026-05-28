import { CLIP_EPSILON } from "../../utils/time"

interface TransitionCarryState {
  outgoingClipId: string
  incomingClipId: string
  boundaryTime: number
}

export class TransitionStateMachine {
  private carry: TransitionCarryState | null = null
  private cleanupTimeout: ReturnType<typeof setTimeout> | null = null

  enterTransition(outgoingClipId: string, incomingClipId: string, boundaryTime: number): void {
    this.carry = { outgoingClipId, incomingClipId, boundaryTime }
  }

  exitTransition(): void {
    this.carry = null
  }

  shouldCarryClip(ph: number, boundaryTime: number): boolean {
    if (!this.carry) return false
    return (
      this.carry.outgoingClipId !== this.carry.incomingClipId &&
      ph < boundaryTime + CLIP_EPSILON
    )
  }

  isCarryActive(ph: number): boolean {
    if (!this.carry) return false
    return ph < this.carry.boundaryTime + CLIP_EPSILON
  }

  getCarry(): TransitionCarryState | null {
    return this.carry
  }

  clearCarryIfExpired(ph: number): void {
    if (this.carry && ph >= this.carry.boundaryTime + CLIP_EPSILON) {
      this.carry = null
    }
  }

  setCleanupTimeout(timeout: ReturnType<typeof setTimeout> | null): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout)
    }
    this.cleanupTimeout = timeout
  }

  getCleanupTimeout(): ReturnType<typeof setTimeout> | null {
    return this.cleanupTimeout
  }

  dispose(): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout)
      this.cleanupTimeout = null
    }
    this.carry = null
  }
}