"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Trophy,
  LayoutDashboard,
  Users,
  MessageCircle,
  Settings,
  LogOut,
  Shield,
  User,
} from "lucide-react";
import clsx from "clsx";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/players", label: "Squad", icon: Users },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/profile", label: "My Profile", icon: User },
];

export default function Navbar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 glass-strong border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pitch-500 to-pitch-700 flex items-center justify-center shadow-glow">
              <Trophy className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:block">
              Footy<span className="text-pitch-400">Connect</span>
            </span>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    active
                      ? "bg-pitch-500/15 text-pitch-400"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
            {profile?.isAdmin && (
              <Link
                href="/admin"
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  pathname === "/admin"
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-slate-400 hover:text-amber-300 hover:bg-amber-500/10"
                )}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden md:inline">Admin</span>
              </Link>
            )}
          </nav>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium leading-tight">
                {profile?.displayName || "Player"}
              </span>
              <span className="text-xs text-slate-500">
                {profile?.position} · {profile?.strongFoot}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
