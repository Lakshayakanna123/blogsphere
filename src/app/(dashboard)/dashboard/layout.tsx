import { requireUser } from "@/lib/auth/session";
import Link from "next/link";
import { LayoutDashboard, PenLine, User, ShieldCheck, FileText } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  const sideLinks = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/posts", label: "My Posts", icon: FileText },
    ...(user.role === "writer" || user.role === "admin"
      ? [{ href: "/dashboard/posts/new", label: "New Post", icon: PenLine }]
      : []),
    { href: "/dashboard/profile", label: "Profile", icon: User },
    ...(user.role === "admin"
      ? [{ href: "/admin", label: "Admin Panel", icon: ShieldCheck }]
      : []),
  ];

  return (
    <div className="page-wrapper py-10 flex gap-8 min-h-[calc(100dvh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 gap-1 self-start sticky top-24">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider px-3 mb-2">
          Dashboard
        </p>
        {sideLinks.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-sunken)] transition-colors"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
