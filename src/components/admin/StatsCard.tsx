interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

export default function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="auth-glass-card rounded-md px-4 py-4 flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-dark-border bg-dark-card text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-accent-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}
