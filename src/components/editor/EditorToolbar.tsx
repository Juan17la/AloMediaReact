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
  border: '1px solid rgba(255, 255, 255, 0.10)',
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  color: 'rgba(255, 255, 255, 0.80)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'background 120ms ease-out, border-color 120ms ease-out',
}

const exportButtonStyle: CSSProperties = {
  ...baseButtonStyle,
  border: 'none',
  background: 'var(--color-accent-red)',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  color: '#ffffff',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
  transition: 'filter 120ms ease-out, transform 80ms ease-out',
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
        onMouseEnter={e => { (e.currentTarget).style.background = 'rgba(255, 255, 255, 0.09)'; (e.currentTarget).style.borderColor = 'rgba(255, 255, 255, 0.18)' }}
        onMouseLeave={e => { (e.currentTarget).style.background = 'rgba(255, 255, 255, 0.05)'; (e.currentTarget).style.borderColor = 'rgba(255, 255, 255, 0.10)' }}
      >
        <FolderOpen size={12} />
        Load
      </button>

      <button
        onClick={onSave}
        disabled={isSaving}
        style={{ ...baseButtonStyle, opacity: isSaving ? 0.35 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
        onMouseEnter={e => { if (!isSaving) { (e.currentTarget).style.background = 'rgba(255, 255, 255, 0.09)'; (e.currentTarget).style.borderColor = 'rgba(255, 255, 255, 0.18)' } }}
        onMouseLeave={e => { if (!isSaving) { (e.currentTarget).style.background = 'rgba(255, 255, 255, 0.05)'; (e.currentTarget).style.borderColor = 'rgba(255, 255, 255, 0.10)' } }}
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
          opacity: shareDisabled ? 0.35 : 1,
          cursor: shareDisabled ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={e => { if (!shareDisabled) { (e.currentTarget).style.background = 'rgba(255, 255, 255, 0.09)'; (e.currentTarget).style.borderColor = 'rgba(255, 255, 255, 0.18)' } }}
        onMouseLeave={e => { if (!shareDisabled) { (e.currentTarget).style.background = 'rgba(255, 255, 255, 0.05)'; (e.currentTarget).style.borderColor = 'rgba(255, 255, 255, 0.10)' } }}
      >
        <Share2 size={12} />
        Share
      </button>

      <button
        onClick={onExport}
        disabled={isExporting}
        style={{
          ...exportButtonStyle,
          opacity: isExporting ? 0.35 : 1,
          cursor: isExporting ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={e => { if (!isExporting) (e.currentTarget).style.filter = 'brightness(0.86)' }}
        onMouseLeave={e => { if (!isExporting) (e.currentTarget).style.filter = 'none' }}
      >
        <Film size={12} />
        Export
      </button>
    </div>
  )
}
