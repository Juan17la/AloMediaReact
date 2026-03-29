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
        <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "rgba(255, 255, 255, 0.92)" }}>Share project</h2>
        {success ? (
          <p className="text-sm text-green-400">Project shared successfully.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255, 255, 255, 0.40)" }}>Collaborator email</label>
              <input
                autoFocus
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleShare() }}
                className="editor-input w-full px-3 py-2 text-sm text-accent-white placeholder:text-white/25"
              />
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            </div>
            <div className="flex justify-end gap-2.5" style={{ marginTop: 8 }}>
              <button
                onClick={onClose}
                className="btn-ghost px-4 py-2 rounded-lg text-sm border border-white/10 bg-white/5"
                style={{ color: "rgba(255, 255, 255, 0.80)" }}
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={isLoading || !email.trim()}
                className="btn-accent px-5 py-2 rounded-lg text-sm font-semibold bg-accent-red text-white"
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
