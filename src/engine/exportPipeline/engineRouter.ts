import type { EngineCapabilities } from "./types"
import { checkServerAvailability } from "./serverEncoder"

export type SelectedEngine = "server" | "wasm"

export async function selectEngine(): Promise<SelectedEngine> {
  const capabilities = await checkServerAvailability()
  if (capabilities.available) {
    return "server"
  }
  return "wasm"
}

export function getEngineInfo(engine: SelectedEngine, capabilities: EngineCapabilities | null): {
  label: string
  description: string
  gpuAccelerated: boolean
} {
  if (engine === "server" && capabilities?.available) {
    return {
      label: capabilities.gpuAccel ? "Server (GPU)" : "Server (CPU)",
      description: capabilities.gpuAccel
        ? `Server-side encoding with hardware acceleration (${capabilities.gpuCodec ?? "GPU"})`
        : "Server-side encoding with CPU",
      gpuAccelerated: capabilities.gpuAccel,
    }
  }

  return {
    label: "Browser (WASM)",
    description: "Client-side encoding using WebAssembly. Slower but requires no server.",
    gpuAccelerated: false,
  }
}