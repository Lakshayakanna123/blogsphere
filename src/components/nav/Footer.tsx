import Link from "next/link";
import { Rss, Github, Twitter } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] mt-auto">
      <div className="page-wrapper py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] text-white shadow">
                <Rss size={14} strokeWidth={2.5} />
              </span>
              <span className="gradient-text">BlogSphere</span>
            </Link>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed max-w-xs">
              A modern platform for writers and curious minds.
            </p>
            <div className="flex gap-3">
              <a
                href="https://github.com/Lakshayakanna123/blogsphere"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="GitHub"
              >
                <Github size={18} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Twitter / X"
              >
                <Twitter size={18} />
              </a>
            </div>
          </div>

          {/* Links */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title} className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-2">
                {section.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="divider mt-10 mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <p>© {year} BlogSphere. All rights reserved.</p>
          <p>Built with Next.js, Supabase &amp; ♥</p>
        </div>
      </div>
    </footer>
  );
}

const FOOTER_SECTIONS = [
  {
    title: "Explore",
    links: [
      { href: "/blog", label: "Latest posts" },
      { href: "/tags", label: "Browse tags" },
      { href: "/authors", label: "Authors" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/login", label: "Sign in" },
      { href: "/signup", label: "Create account" },
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/profile", label: "Edit profile" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
    ],
  },
];
