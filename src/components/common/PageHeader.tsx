import { ChevronRight } from "lucide-react";
import { Link } from "react-router";

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumb?: BreadcrumbItem[];
}

export default function PageHeader({ title, subtitle, icon, breadcrumb }: PageHeaderProps) {
  return (
    <div className="border-b border-dark-border/80 pb-4">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-3 flex items-center gap-1.5 text-xs text-muted">
          {breadcrumb.map((item, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <ChevronRight className="w-3 h-3" />}
              <Link
                to={item.href}
                className="transition-colors duration-150 hover:text-accent-white/70"
              >
                {item.label}
              </Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-dark-border bg-dark-card">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-gradient-red">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
