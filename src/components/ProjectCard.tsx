import { useNavigate } from "react-router";
import { Film } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  thumbnail?: string | null;
  date: string;
  style?: React.CSSProperties;
}

export default function ProjectCard({ id, name, thumbnail, date, style, onClick }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <button
      onClick={onClick || (() => navigate(`/editor/${id}`))}
      className="group w-full text-left rounded-xl overflow-hidden border border-outline-variant bg-card transition-all duration-300 hover:shadow-elevated hover:border-primary/50"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-linear-to-br from-surface-container to-surface-container-low flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {thumbnail ? (
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Film className="w-10 h-10 text-muted-foreground" />
        )}
      </div>
      {/* Info */}
      <div className="px-4 py-3.5 border-t border-outline-variant">
        <p className="text-on-surface text-sm font-semibold truncate text-left">{name}</p>
        <p className="text-muted-foreground text-xs mt-1 text-left">{date}</p>
      </div>
    </button>
  );
}
