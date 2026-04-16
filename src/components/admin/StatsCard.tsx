interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}

export default function StatsCard({ label, value, icon }: StatsCardProps) {
  return (
    <div className="auth-glass-card rounded-md px-4 py-4 flex items-center gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-accent-red">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-white/45 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-white/90 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
