interface SectionCardProps {
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export default function SectionCard({ title, children, icon, action, className = "" }: SectionCardProps) {
  return (
    <div className={`auth-glass-card rounded-md px-5 py-5 sm:px-6 sm:py-6 ${className}`}>
      {(title || icon || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {icon && <span className="text-muted">{icon}</span>}
            {title && (
              <h2 className="text-base font-semibold text-accent-white">{title}</h2>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}
