interface ActionCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  onClick?: () => void;
}

export default function ActionCard({ icon: Icon, label, description, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="glass-card rounded-2xl p-6 flex items-start gap-4 hover:border-primary/50 transition-all duration-300 group cursor-pointer hover:shadow-elevated text-left"
    >
      <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary/20 to-primary-container/20 flex items-center justify-center shrink-0 group-hover:from-primary/30 group-hover:to-primary-container/30 transition-all duration-300">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-on-surface font-semibold text-sm">{label}</p>
        <p className="text-muted-foreground text-xs mt-1 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}
