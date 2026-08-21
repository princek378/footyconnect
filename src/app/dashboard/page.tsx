"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Match, MediaItem } from "@/types";
import {
  Calendar,
  Target,
  Users,
  TrendingUp,
  Award,
  Star,
  Trophy,
  Image as ImageIcon,
} from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";

export default function DashboardPage() {
  const { profile } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [playerCount, setPlayerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [matchRes, mediaRes, countRes] = await Promise.all([
        supabase
          .from("matches")
          .select("*")
          .order("date", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("media")
          .select("*")
          .order("createdAt", { ascending: false })
          .limit(6),
        supabase
          .from("players")
          .select("*", { count: "exact", head: true }),
      ]);

      if (matchRes.data) setMatch(matchRes.data as Match);
      if (mediaRes.data) setMedia(mediaRes.data as MediaItem[]);
      setPlayerCount(countRes.count ?? 0);
      setLoading(false);
    };

    fetchData();
  }, []);

  const myStats = match?.playerStats?.find(
    (s) => s.playerId === profile?.uid
  );

  const getWinner = (m: Match) => {
    const s1 = m.team1Score ?? 0;
    const s2 = m.team2Score ?? 0;
    if (s1 > s2) return m.team1Name || "Team 1";
    if (s2 > s1) return m.team2Name || "Team 2";
    return "Draw";
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
          {/* Welcome */}
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

          {/* Stats cards */}
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

          {/* Recent Match */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-pitch-400" />
              Recent Match
            </h2>

            {loading ? (
              <div className="glass rounded-2xl p-12 flex justify-center">
                <div className="spinner" />
              </div>
            ) : match ? (
              <div className="glass rounded-2xl overflow-hidden">
                {/* Match header */}
                <div className="bg-gradient-to-r from-pitch-900/40 to-slate-900/40 px-6 py-5 border-b border-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-400">
                        {format(new Date(match.date), "EEEE, d MMMM yyyy")}
                      </p>
                      <h3 className="text-xl font-bold mt-1">
                        {match.team1Name || "Team 1"}{" "}
                        <span className="text-slate-500">vs</span>{" "}
                        {match.team2Name || "Team 2"}
                      </h3>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black tracking-tight">
                        <span className="text-pitch-400">
                          {match.team1Score ?? 0}
                        </span>
                        <span className="text-slate-500 mx-2">-</span>
                        <span className="text-pitch-400">
                          {match.team2Score ?? 0}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-end gap-1.5 text-amber-400 text-sm font-medium">
                        <Trophy className="w-4 h-4" />
                        Winner: {getWinner(match)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Player stats */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-white/5">
                        <th className="text-left py-3 px-6 font-medium">Player</th>
                        <th className="text-center py-3 px-4 font-medium">Rating</th>
                        <th className="text-center py-3 px-4 font-medium">Goals</th>
                        <th className="text-center py-3 px-4 font-medium">Assists</th>
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
                              className={`border-b border-white/5 hover:bg-white/[0.02] ${
                                isMe ? "bg-pitch-500/5" : ""
                              }`}
                            >
                              <td className="py-3.5 px-6">
                                <span className={`font-medium ${isMe ? "text-pitch-400" : ""}`}>
                                  {stat.playerName}
                                  {isMe && (
                                    <span className="ml-2 text-xs text-pitch-500">(You)</span>
                                  )}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`rating-badge ${ratingClass}`}>
                                  {stat.rating.toFixed(1)}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-semibold">
                                {stat.goals > 0 ? (
                                  <span className="text-pitch-400">{stat.goals}</span>
                                ) : (
                                  <span className="text-slate-600">0</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-center font-semibold">
                                {stat.assists > 0 ? (
                                  <span className="text-blue-400">{stat.assists}</span>
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
                <p className="text-slate-400">No match data yet.</p>
              </div>
            )}
          </section>

          {/* Media Gallery Preview */}
          <section className="mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-pitch-400" />
                Latest Media
              </h2>
            </div>

            {media.length === 0 ? (
              <div className="glass rounded-2xl p-10 text-center text-slate-500">
                No images or videos uploaded yet.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {media.map((item) => (
                  <div key={item.id} className="glass rounded-xl overflow-hidden">
                    {item.type === "image" ? (
                      <img
                        src={item.url}
                        alt={item.title || ""}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <video
                        src={item.url}
                        controls
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-3">
                      <p className="text-sm font-medium truncate">
                        {item.title || "Untitled"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick links */}
          <div className="grid sm:grid-cols-3 gap-4">
            <Link href="/profile" className="glass rounded-2xl p-5 card-hover group">
              <h3 className="font-semibold group-hover:text-pitch-400 transition-colors">
                Edit My Profile
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                Update height, weight, position & team
              </p>
            </Link>
            <Link href="/players" className="glass rounded-2xl p-5 card-hover group">
              <h3 className="font-semibold group-hover:text-pitch-400 transition-colors">
                View Squad
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                See all registered players
              </p>
            </Link>
            <Link href="/chat" className="glass rounded-2xl p-5 card-hover group">
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
