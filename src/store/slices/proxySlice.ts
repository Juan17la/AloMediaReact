import type { StateCreator } from "zustand"
import type { EditorStore } from "../editorStore"

export interface ProxyState {
  status: "pending" | "ready" | "error"
  objectUrl: string | null
}

export interface ProxySlice {
  proxyMap: Record<string, ProxyState>
  setProxyState: (mediaId: string, state: ProxyState) => void
}

export const createProxySlice: StateCreator<EditorStore, [], [], ProxySlice> = (set) => ({
  proxyMap: {},

  setProxyState(mediaId, state) {
    set(s => ({ proxyMap: { ...s.proxyMap, [mediaId]: state } }))
  },
})
