import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useProjectListStore } from '../../store/projectListStore'
import ProjectCard from '../ProjectCard'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function OwnProjectsList() {
  const [page, setPage] = useState(0)
  const fetchOwn = useProjectListStore(s => s.fetchOwn)
  const data = useProjectListStore(s => s.ownCache[page])
  const isLoading = useProjectListStore(s => s.isLoadingOwn)
  const error = useProjectListStore(s => s.ownError)

  useEffect(() => {
    fetchOwn(page)
  }, [page, fetchOwn])

  if (isLoading && !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
            <div className="aspect-video bg-dark-elevated" />
            <div className="px-4 py-3.5 border-t border-glass-border space-y-2">
              <div className="h-3 bg-dark-border rounded w-3/4" />
              <div className="h-2 bg-dark-border rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error && !data) {
    return <p className="text-red-400 text-sm">{error}</p>
  }

  const projects = data?.content ?? []

  if (projects.length === 0) {
    return <p className="text-muted text-sm">No projects yet. Create your first project!</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {projects.map((project, idx) => (
          <ProjectCard
            key={project.id}
            id={String(project.id)}
            name={project.name}
            date={formatDate(project.updatedAt)}
            style={{ animationDelay: `${0.15 + idx * 0.05}s` }}
          />
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page === 0}
            onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded border border-dark-border text-muted hover:text-accent-white disabled:opacity-35 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-muted text-xs">
            {page + 1} / {data.totalPages}
          </span>
          <button
            disabled={page >= data.totalPages - 1}
            onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded border border-dark-border text-muted hover:text-accent-white disabled:opacity-35 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
