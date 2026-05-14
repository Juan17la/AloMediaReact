import { useState } from 'react'
import { shareProject } from '../../services/projectService'
import { ApiError } from '../../api/errors'

interface ShareProjectModalProps {
  projectId: number
  onClose: () => void
}

export function ShareProjectModal({ projectId, onClose }: ShareProjectModalProps) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleShare() {
    const trimmed = email.trim()
    if (!trimmed) return
    setIsLoading(true)
    setError(null)
    try {
      await shareProject(projectId, trimmed)
      setSuccess(true)
      setTimeout(onClose, 2000)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) setError('No account found with that email address.')
        else if (err.status === 409) setError('This project is already shared with that user.')
        else if (err.status === 400) setError('You cannot share a project with yourself.')
        else setError(err.message)
      } else {
        setError('An unexpected error occurred.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center modal-glass-card"
      onClick={onClose}
    >
      <div
        className="modal-panel w-120 flex flex-col gap-5"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold tracking-tight text-on-surface">Share project</h2>
        {success ? (
          <p className="text-sm text-primary">Project shared successfully.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Collaborator email</label>
              <input
                autoFocus
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleShare() }}
                className="editor-input w-full px-3 py-2 text-sm text-on-surface placeholder:text-muted-foreground"
              />
              {error && <p className="text-xs text-error mt-1">{error}</p>}
            </div>
            <div className="flex justify-end gap-2.5 mt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-md text-sm border border-border bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={isLoading || !email.trim()}
                className="px-5 py-2 rounded-md text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {isLoading ? 'Sharing…' : 'Share'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
