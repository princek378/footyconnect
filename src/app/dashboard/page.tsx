"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Match } from "@/types";
import {
  Calendar,
  Target,
  Users,
  TrendingUp,
  Award,
  Star,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [playerCount, setPlayerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Latest match
    const fetchMatch = async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setMatch(data as Match);
      }
      setLoading(false);
    };
    fetchMatch();

    // Player count + realtime
    const fetchCount = async () => {
      const { count } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true });
      setPlayerCount(count ?? 0);
    };
    fetchCount();

    const channel = supabase
      .channel("players-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const myStats = match?.playerStats?.find(
    (s) => s.playerId === profile?.uid
  );

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              Welcome back,{" "}
              <span className="text-pitch-400">
                {profile?.displayName?.split(" ")[0] || "Player"}
              </span>
            </h1>
            <p className="text-slate-400 mt-1">
              Here&apos;s what&apos;s happening with the squad
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                label: "Your Position",
                value: profile?.position || "—",
                icon: Award,
                color: "text-pitch-400",
              },
              {
                label: "Strong Foot",
                value: profile?.strongFoot || "—",
                icon: TrendingUp,
                color: "text-blue-400",
              },
              {
                label: "Squad Size",
                value: playerCount,
                icon: Users,
                color: "text-amber-400",
              },
              {
                label: "Last Rating",
                value: myStats ? myStats.rating.toFixed(1) : "—",
                icon: Star,
                color: "text-purple-400",
              },
            ].map((s, i) => (
              <div key={i} className="glass rounded-2xl p-5 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">{s.label}</span>
                  <s.icon className={`w-4.5 h-4.5 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pitch-400" />
                Recent Match
              </h2>
            </div>

            {loading ? (
              <div className="glass rounded-2xl p-12 flex justify-center">
                <div className="spinner" />
              </div>
            ) : match ? (
              <div className="glass rounded-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-pitch-900/40 to-slate-900/40 px-6 py-5 border-b border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400">
                        {format(new Date(match.date), "EEEE, d MMMM yyyy")}
                      </p>
                      <h3 className="text-xl font-bold mt-1">
                        {match.isHome ? "FootyConnect FC" : match.opponent}{" "}
                        <span className="text-slate-500">vs</span>{" "}
                        {match.isHome ? match.opponent : "FootyConnect FC"}
                      </h3>
                    </div>
                    <div className="text-3xl font-black tracking-tight">
                      <span className="text-pitch-400">
                        {match.isHome ? match.homeScore : match.awayScore}
                      </span>
                      <span className="text-slate-500 mx-2">-</span>
                      <span>
                        {match.isHome ? match.awayScore : match.homeScore}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-white/5">
                        <th className="text-left py-3 px-6 font-medium">
                          Player
                        </th>
                        <th className="text-center py-3 px-4 font-medium">
                          Rating
                        </th>
                        <th className="text-center py-3 px-4 font-medium">
                          Goals
                        </th>
                        <th className="text-center py-3 px-4 font-medium">
                          Assists
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(match.playerStats || [])
                        .sort((a, b) => b.rating - a.rating)
                        .map((stat) => {
                          const isMe = stat.playerId === profile?.uid;
                          const ratingClass =
                            stat.rating >= 7.5
                              ? "rating-high"
                              : stat.rating >= 6
                              ? "rating-mid"
                              : "rating-low";
                          return (
                            <tr
                              key={stat.playerId}
                              className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                                isMe ? "bg-pitch-500/5" : ""
                              }`}
                            >
                              <td className="py-3.5 px-6">
                                <span
                                  className={`font-medium ${
                                    isMe ? "text-pitch-400" : ""
                                  }`}
                                >
                                  {stat.playerName}
                                  {isMe && (
                                    <span className="ml-2 text-xs text-pitch-500">
                                      (You)
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span
                                  className={`rating-badge ${ratingClass}`}
                                >
                                  {stat.rating.toFixed(1)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-semibold">
                                {stat.goals > 0 ? (
                                  <span className="text-pitch-400">
                                    {stat.goals}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">0</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center font-semibold">
                                {stat.assists > 0 ? (
                                  <span className="text-blue-400">
                                    {stat.assists}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">0</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass rounded-2xl p-12 text-center">
                <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">
                  No match data yet. Ask an admin to add the latest match
                  stats.
                </p>
              </div>
            )}
          </section>

          <div className="grid sm:grid-cols-3 gap-4">
            <Link
              href="/profile"
              className="glass rounded-2xl p-5 card-hover group"
            >
              <h3 className="font-semibold group-hover:text-pitch-400 transition-colors">
                Edit My Profile
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Update height, weight, position & style
              </p>
            </Link>
            <Link
              href="/players"
              className="glass rounded-2xl p-5 card-hover group"
            >
              <h3 className="font-semibold group-hover:text-pitch-400 transition-colors">
                View Squad
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                See all registered players
              </p>
            </Link>
            <Link
              href="/chat"
              className="glass rounded-2xl p-5 card-hover group"
            >
              <h3 className="font-semibold group-hover:text-pitch-400 transition-colors">
                Squad Chat
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Text & voice notes with the team
              </p>
            </Link>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
