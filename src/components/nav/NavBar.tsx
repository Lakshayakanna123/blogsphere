"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PenLine, Search, Menu, X, Rss, LogIn, LogOut, UserCircle, ShieldCheck,
} from "lucide-react";
import type { UserSession } from "@/lib/auth/session";
import { signOut } from "@/lib/actions/auth";

type NavBarProps = { user: UserSession | null };

export default function NavBar({ user }: NavBarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* Detect scroll to add glass effect */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close menu on route change */
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  /* Close menu when clicking outside */
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);
  useEffect(() => {
    if (open) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open, handleOutsideClick]);

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-md" : "bg-transparent"
      }`}
    >
      <div className="page-wrapper">
        <nav className="flex items-center justify-between h-16 gap-4">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-xl tracking-tight shrink-0"
            aria-label="BlogSphere home"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-500)] to-[var(--brand-700)] text-white shadow-md">
              <Rss size={16} strokeWidth={2.5} />
            </span>
            <span className="gradient-text">BlogSphere</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${isActive(href) ? "active" : ""}`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="btn btn-ghost btn-sm hidden sm:inline-flex"
              aria-label="Search"
            >
              <Search size={17} />
            </Link>

            {user ? (
              <>
                {(user.role === "writer" || user.role === "admin") && (
                  <Link
                    href="/dashboard/posts/new"
                    className="btn btn-primary btn-sm hidden sm:inline-flex"
                  >
                    <PenLine size={15} />
                    Write
                  </Link>
                )}
                <div className="relative group">
                  <button
                    className="btn btn-ghost btn-sm flex items-center gap-2"
                    aria-label="Account menu"
                  >
                    {user.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={user.avatarUrl}
                        alt={user.displayName}
                        className="w-7 h-7 rounded-full object-cover border border-[var(--border)]"
                      />
                    ) : (
                      <UserCircle size={20} />
                    )}
                    <span className="hidden lg:block max-w-[120px] truncate text-sm font-medium">
                      {user.displayName}
                    </span>
                  </button>
                  {/* Dropdown */}
                  <div
                    className="absolute right-0 top-full mt-2 w-48 card shadow-lg invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 origin-top-right scale-95 group-hover:scale-100 z-50 overflow-hidden"
                    role="menu"
                  >
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--bg-sunken)] transition-colors"
                    >
                      <UserCircle size={15} /> Dashboard
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        className="flex items-center gap-2 px-4 py-3 text-sm hover:bg-[var(--bg-sunken)] transition-colors"
                      >
                        <ShieldCheck size={15} /> Admin Panel
                      </Link>
                    )}
                    <div className="divider my-0 mx-0" />
                    <form action={signOut}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2 px-4 py-3 text-sm text-[var(--danger)] hover:bg-[var(--bg-sunken)] transition-colors"
                      >
                        <LogOut size={15} /> Sign out
                      </button>
                    </form>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary btn-sm hidden sm:inline-flex">
                  <LogIn size={15} /> Sign in
                </Link>
                <Link href="/signup" className="btn btn-primary btn-sm hidden sm:inline-flex">
                  Get started
                </Link>
              </>
            )}

            {/* Mobile burger */}
            <button
              className="btn btn-ghost btn-sm md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          ref={menuRef}
          className="md:hidden glass border-t border-[var(--border)] animate-fade-in-up shadow-xl"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="page-wrapper py-4 flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`nav-link ${isActive(href) ? "active" : ""}`}
              >
                {label}
              </Link>
            ))}
            <div className="divider" />
            <Link href="/search" className="nav-link flex items-center gap-2">
              <Search size={16} /> Search
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="nav-link flex items-center gap-2">
                  <UserCircle size={16} /> Dashboard
                </Link>
                {user.role === "admin" && (
                  <Link href="/admin" className="nav-link flex items-center gap-2">
                    <ShieldCheck size={16} /> Admin Panel
                  </Link>
                )}
                <form action={signOut}>
                  <button className="nav-link flex items-center gap-2 text-[var(--danger)] w-full text-left">
                    <LogOut size={16} /> Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-secondary w-full justify-center mt-2">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn-primary w-full justify-center mt-1">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

const NAV_LINKS = [
  { href: "/blog", label: "Blog" },
  { href: "/tags", label: "Tags" },
  { href: "/authors", label: "Authors" },
  { href: "/about", label: "About" },
];
