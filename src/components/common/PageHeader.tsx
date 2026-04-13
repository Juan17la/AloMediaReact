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
    <div className="border-b border-white/8 pb-4">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="flex items-center gap-1.5 mb-3 text-xs text-white/40">
          {breadcrumb.map((item, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              {idx > 0 && <ChevronRight className="w-3 h-3" />}
              <Link
                to={item.href}
                className="hover:text-white/60 transition-colors duration-150"
              >
                {item.label}
              </Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex items-center gap-3">
        {icon && (
          <div className="flex h-11 w-11 items-center justify-center border border-white/10 bg-white/5 rounded-lg">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-gradient-red">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-white/45 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
