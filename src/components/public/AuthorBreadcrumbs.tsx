import { Link } from "react-router-dom";

/**
 * Theme-driven breadcrumb bar that sits below the global nav.
 * Uses CSS custom properties from the author's selected theme.
 */
export default function AuthorBreadcrumbs({
  items,
}: {
  items: { label: string; to?: string }[];
}) {
  if (!items.length) return null;

  return (
    <div
      className="text-[0.85rem] px-6 py-2.5"
      style={{
        background: "var(--theme-primary)",
        /* slight transparency overlay */
        backgroundImage: "linear-gradient(rgba(255,255,255,0.04), rgba(255,255,255,0.04))",
      }}
    >
      <div className="container max-w-7xl flex items-center gap-2 flex-wrap">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <span style={{ color: "var(--theme-primary-text)", opacity: 0.6 }}>/</span>
              )}
              {isLast || !item.to ? (
                <span style={{ color: "var(--theme-primary-text)" }}>{item.label}</span>
              ) : (
                <Link
                  to={item.to}
                  className="hover:underline hover:underline-offset-2 transition-colors"
                  style={{ color: "var(--theme-accent)" }}
                >
                  {item.label}
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
