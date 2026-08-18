"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import { Trophy, Users, MessageCircle, BarChart3, Shield, Zap } from "lucide-react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pitch-pattern opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-pitch-500/10 rounded-full blur-3xl" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pitch-500 to-pitch-700 flex items-center justify-center shadow-glow">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Footy<span className="text-pitch-400">Connect</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-ghost text-sm">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary text-sm">
            Join the Squad
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center max-w-3xl mx-auto page-enter">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-pitch-500/10 border border-pitch-500/20 text-pitch-400 text-sm font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            Built for the modern squad
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Your team.{" "}
            <span className="text-gradient">Connected.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Profiles, match ratings, goals, assists, and a real-time squad chat
            with voice notes. Everything your football team needs in one
            beautiful place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-primary text-base px-8 py-3.5">
              Create Player Account
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3.5">
              I already have an account
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-24">
          {[
            {
              icon: Users,
              title: "Player Profiles",
              desc: "Height, weight, strong foot, position & playing style. Build your digital football identity.",
            },
            {
              icon: BarChart3,
              title: "Match Stats",
              desc: "Recent match ratings, goals and assists for every player. Track form in real time.",
            },
            {
              icon: MessageCircle,
              title: "Squad Chat",
              desc: "Group chat with text & voice notes. Keep the whole squad (and admin) in the loop.",
            },
          ].map((f, i) => (
            <div
              key={i}
              className="glass rounded-2xl p-6 card-hover"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-pitch-500/15 flex items-center justify-center mb-4">
                <f.icon className="w-6 h-6 text-pitch-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Admin note */}
        <div className="mt-16 glass rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4 max-w-2xl mx-auto">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-200">Admin Access</h3>
            <p className="text-sm text-slate-400 mt-1">
              Admins can edit every player&apos;s profile and join the group
              chat. Create an admin account from the Firebase console or by
              setting <code className="text-pitch-400">isAdmin: true</code> in
              Firestore.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} FootyConnect · Built for the beautiful game
      </footer>
    </div>
  );
}
