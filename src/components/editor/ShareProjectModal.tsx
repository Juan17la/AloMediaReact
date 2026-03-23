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
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="bg-dark-card border border-dark-border rounded-lg w-[420px] p-6 flex flex-col gap-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-accent-white font-semibold text-base tracking-wide">Share project</h2>
        {success ? (
          <p className="text-sm text-green-400">Project shared successfully.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-muted text-xs uppercase tracking-wider">Collaborator email</label>
              <input
                autoFocus
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleShare() }}
                className="bg-dark border border-dark-border rounded px-3 py-1.5 text-sm text-accent-white focus:outline-none focus:border-accent-red placeholder:text-muted"
              />
              {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded text-sm text-muted hover:text-accent-white border border-dark-border transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={isLoading || !email.trim()}
                className="px-5 py-2 rounded text-sm font-semibold bg-accent-red text-white hover:opacity-90 transition-opacity disabled:opacity-50"
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
