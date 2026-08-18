"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { PlayerProfile } from "@/types";
import { Users, Search } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function PlayersPage() {
  const { profile: me } = useAuth();
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("displayName");

      if (!error && data) {
        setPlayers(data as PlayerProfile[]);
      }
      setLoading(false);
    };

    fetchPlayers();

    const channel = supabase
      .channel("players-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        () => fetchPlayers()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = players.filter(
    (p) =>
      p.displayName.toLowerCase().includes(search.toLowerCase()) ||
      p.position.toLowerCase().includes(search.toLowerCase()) ||
      p.playingStyle.toLowerCase().includes(search.toLowerCase())
  );

  const posColor: Record<string, string> = {
    GK: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    DEF: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    MID: "bg-pitch-500/15 text-pitch-400 border-pitch-500/30",
    FWD: "bg-red-500/15 text-red-400 border-red-500/30",
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Users className="w-8 h-8 text-pitch-400" />
                The Squad
              </h1>
              <p className="text-slate-400 mt-1">
                {players.length} registered player
                {players.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search players..."
                className="input-field pl-10 py-2.5"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass rounded-2xl p-16 text-center">
              <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">No players found</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => {
                const isMe = p.uid === me?.uid;
                return (
                  <div
                    key={p.uid}
                    className={`glass rounded-2xl p-5 card-hover ${
                      isMe ? "ring-1 ring-pitch-500/40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pitch-600 to-pitch-800 flex items-center justify-center text-lg font-bold">
                          {p.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold leading-tight">
                            {p.displayName}
                            {isMe && (
                              <span className="ml-1.5 text-xs text-pitch-400">
                                (You)
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {p.email}
                          </p>
                        </div>
                      </div>
                      {p.isAdmin && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Admin
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                          posColor[p.position] || ""
                        }`}
                      >
                        {p.position}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/40">
                        {p.strongFoot} Foot
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/40">
                        {p.playingStyle}
                      </span>
                    </div>

                    <div className="flex gap-4 text-sm text-slate-400">
                      <span>
                        <span className="text-white font-medium">
                          {p.height}
                        </span>{" "}
                        cm
                      </span>
                      <span>
                        <span className="text-white font-medium">
                          {p.weight}
                        </span>{" "}
                        kg
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
