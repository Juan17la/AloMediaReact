import { FolderOpen, Save, Share2, Film } from 'lucide-react'
import type { ApiProject } from '../../types/projectApiTypes'

interface EditorToolbarProps {
  apiProject: ApiProject | null
  isSaving: boolean
  isExporting: boolean
  onLoad: () => void
  onSave: () => void
  onShare: () => void
  onExport: () => void
}

const ghostBtn =
  "flex items-center gap-[5px] h-7 px-[10px] rounded-lg text-[11px] font-semibold tracking-[0.04em] text-on-surface/80 bg-surface-container-low border border-outline-variant hover:bg-surface-container-high hover:border-primary/50 hover:text-on-surface active:scale-95 transition-all duration-100 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed"

const primaryBtn =
  "flex items-center gap-[5px] h-7 px-[10px] rounded-lg font-semibold text-[11px] tracking-[0.04em] text-primary-foreground bg-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:brightness-[0.95] active:scale-95 active:brightness-[0.88] transition-all duration-100 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"

export function EditorToolbar({
  apiProject,
  isSaving,
  isExporting,
  onLoad,
  onSave,
  onShare,
  onExport,
}: EditorToolbarProps) {
  const shareDisabled = !apiProject

  return (
    <div className="flex items-center gap-1 px-2">
      <button onClick={onLoad} className={ghostBtn}>
        <FolderOpen size={12} />
        Load
      </button>

      <button
        onClick={onSave}
        disabled={isSaving}
        className={ghostBtn}
      >
        <Save size={12} />
        {isSaving ? 'Saving…' : 'Save'}
      </button>

      <button
        onClick={shareDisabled ? undefined : onShare}
        disabled={shareDisabled}
        title={shareDisabled ? 'Save the project before sharing it.' : undefined}
        className={ghostBtn}
      >
        <Share2 size={12} />
        Share
      </button>

      <button
        onClick={onExport}
        disabled={isExporting}
        className={primaryBtn}
      >
        <Film size={12} />
        Export
      </button>
    </div>
  )
}
