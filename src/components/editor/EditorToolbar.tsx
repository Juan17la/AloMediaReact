import type { CSSProperties } from 'react'
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

const baseButtonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  height: 28,
  padding: '0 10px',
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.04em',
  borderRadius: 8,
  border: '1px solid var(--color-dark-border)',
  background: 'var(--color-dark-elevated)',
  color: 'var(--color-accent-white)',
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const exportButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  border: '1px solid var(--color-blood-red-light)',
  background: 'var(--color-accent-red)',
  color: '#ffffff',
}

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
    <div className="flex items-center" style={{ gap: 4, padding: '0 8px' }}>
      <button
        onClick={onLoad}
        style={baseButtonStyle}
        onMouseEnter={e => { (e.currentTarget).style.background = 'var(--color-dark-border)' }}
        onMouseLeave={e => { (e.currentTarget).style.background = 'var(--color-dark-elevated)' }}
      >
        <FolderOpen size={12} />
        Load
      </button>

      <button
        onClick={onSave}
        disabled={isSaving}
        style={{ ...baseButtonStyle, opacity: isSaving ? 0.6 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
        onMouseEnter={e => { if (!isSaving) (e.currentTarget).style.background = 'var(--color-dark-border)' }}
        onMouseLeave={e => { if (!isSaving) (e.currentTarget).style.background = 'var(--color-dark-elevated)' }}
      >
        <Save size={12} />
        {isSaving ? 'Saving…' : 'Save'}
      </button>

      <button
        onClick={shareDisabled ? undefined : onShare}
        disabled={shareDisabled}
        title={shareDisabled ? 'Save the project before sharing it.' : undefined}
        style={{
          ...baseButtonStyle,
          opacity: shareDisabled ? 0.4 : 1,
          cursor: shareDisabled ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={e => { if (!shareDisabled) (e.currentTarget).style.background = 'var(--color-dark-border)' }}
        onMouseLeave={e => { if (!shareDisabled) (e.currentTarget).style.background = 'var(--color-dark-elevated)' }}
      >
        <Share2 size={12} />
        Share
      </button>

      <button
        onClick={onExport}
        disabled={isExporting}
        style={{
          ...exportButtonStyle,
          opacity: isExporting ? 0.6 : 1,
          cursor: isExporting ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={e => { if (!isExporting) (e.currentTarget).style.background = 'var(--color-blood-red-light)' }}
        onMouseLeave={e => { if (!isExporting) (e.currentTarget).style.background = 'var(--color-accent-red)' }}
      >
        <Film size={12} />
        Export
      </button>
    </div>
  )
}
