import { useNavigate } from "react-router";
import { Film } from "lucide-react";

interface ProjectCardProps {
  id: string;
  name: string;
  thumbnail?: string | null;
  date: string;
  style?: React.CSSProperties;
}

export default function ProjectCard({ id, name, thumbnail, date, style }: ProjectCardProps) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/editor/${id}`)}
      className="glass-card rounded-2xl overflow-hidden hover:border-blood-red/40 transition-all duration-300 group cursor-pointer hover:shadow-lg hover:shadow-blood-red/10 hover:-translate-y-0.5"
      style={style}
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-linear-to-br from-dark-elevated to-dark-card flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-blood-red/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        {thumbnail ? (
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
        ) : (
          <Film className="w-10 h-10 text-dark-border group-hover:text-blood-red/60 transition-colors duration-300" />
        )}
      </div>
      {/* Info */}
      <div className="px-4 py-3.5 border-t border-glass-border">
        <p className="text-accent-white text-sm font-semibold truncate text-left">{name}</p>
        <p className="text-muted text-xs mt-1 text-left">{date}</p>
      </div>
    </button>
  );
}
