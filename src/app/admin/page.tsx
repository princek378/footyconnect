"use client";

import { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import {
  PlayerProfile,
  Match,
  MatchPlayerStat,
  StrongFoot,
  Position,
  PlayingStyle,
} from "@/types";
import {
  Shield,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Users,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

const positions: Position[] = ["GK", "DEF", "MID", "FWD"];
const feet: StrongFoot[] = ["Left", "Right", "Both"];
const styles: PlayingStyle[] = [
  "Playmaker",
  "Box-to-Box",
  "Target Man",
  "Poacher",
  "Wingback",
  "Ball Winner",
  "Sweeper Keeper",
  "Creator",
  "Finisher",
  "All-Rounder",
];

export default function AdminPage() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlayerProfile>>({});
  const [matches, setMatches] = useState<Match[]>([]);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchForm, setMatchForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    opponent: "",
    homeScore: 0,
    awayScore: 0,
    isHome: true,
  });
  const [matchStats, setMatchStats] = useState<
    Record<string, { rating: number; goals: number; assists: number }>
  >({});

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .order("displayName");
      if (data) setPlayers(data as PlayerProfile[]);
    };
    const fetchMatches = async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .order("date", { ascending: false });
      if (data) setMatches(data as Match[]);
    };

    fetchPlayers();
    fetchMatches();

    const pChannel = supabase
      .channel("admin-players")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players" },
        fetchPlayers
      )
      .subscribe();
    const mChannel = supabase
      .channel("admin-matches")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches" },
        fetchMatches
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pChannel);
      supabase.removeChannel(mChannel);
    };
  }, []);

  const startEdit = (p: PlayerProfile) => {
    setEditingId(p.uid);
    setEditForm({ ...p });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase
      .from("players")
      .update({ ...editForm, updatedAt: Date.now() })
      .eq("uid", editingId);
    setEditingId(null);
  };

  const toggleAdmin = async (p: PlayerProfile) => {
    await supabase
      .from("players")
      .update({ isAdmin: !p.isAdmin, updatedAt: Date.now() })
      .eq("uid", p.uid);
  };

  const deletePlayer = async (p: PlayerProfile) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user && p.uid === user.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (
      confirm(
        `Are you sure you want to delete ${p.displayName}? This cannot be undone.`
      )
    ) {
      await supabase.from("players").delete().eq("uid", p.uid);
    }
  };

  const createMatch = async () => {
    const playerStats: MatchPlayerStat[] = players.map((p) => ({
      playerId: p.uid,
      playerName: p.displayName,
      rating: matchStats[p.uid]?.rating ?? 6.5,
      goals: matchStats[p.uid]?.goals ?? 0,
      assists: matchStats[p.uid]?.assists ?? 0,
    }));

    await supabase.from("matches").insert([
      {
        id: uuidv4(),
        date: matchForm.date,
        opponent: matchForm.opponent,
        homeScore: Number(matchForm.homeScore),
        awayScore: Number(matchForm.awayScore),
        isHome: matchForm.isHome,
        playerStats,
        createdAt: Date.now(),
      },
    ]);

    setShowMatchForm(false);
    setMatchForm({
      date: new Date().toISOString().slice(0, 10),
      opponent: "",
      homeScore: 0,
      awayScore: 0,
      isHome: true,
    });
    setMatchStats({});
  };

  const deleteMatch = async (id: string) => {
    if (confirm("Delete this match?")) {
      await supabase.from("matches").delete().eq("id", id);
    }
  };

  return (
    <AuthGuard adminOnly>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-amber-400" />
              Admin Panel
            </h1>
            <p className="text-slate-400 mt-1">
              Manage players and match stats
            </p>
          </div>

          <section className="mb-12">
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-pitch-400" />
              Edit Players ({players.length})
            </h2>

            <div className="glass rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-white/5 bg-slate-900/40">
                      <th className="text-left py-3 px-4 font-medium">Name</th>
                      <th className="text-left py-3 px-3 font-medium">Pos</th>
                      <th className="text-left py-3 px-3 font-medium">Foot</th>
                      <th className="text-left py-3 px-3 font-medium">Height</th>
                      <th className="text-left py-3 px-3 font-medium">Weight</th>
                      <th className="text-left py-3 px-3 font-medium">Style</th>
                      <th className="text-left py-3 px-3 font-medium">Admin</th>
                      <th className="text-right py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((p) =>
                      editingId === p.uid ? (
                        <tr key={p.uid} className="border-b border-white/5 bg-pitch-500/5">
                          <td className="py-2 px-4">
                            <input
                              value={editForm.displayName || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  displayName: e.target.value,
                                })
                              }
                              className="input-field !py-1.5 !px-2 text-sm"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={editForm.position}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  position: e.target.value as Position,
                                })
                              }
                              className="input-field !py-1.5 !px-2 text-sm"
                            >
                              {positions.map((pos) => (
                                <option key={pos} value={pos}>
                                  {pos}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={editForm.strongFoot}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  strongFoot: e.target.value as StrongFoot,
                                })
                              }
                              className="input-field !py-1.5 !px-2 text-sm"
                            >
                              {feet.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={editForm.height || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  height: Number(e.target.value),
                                })
                              }
                              className="input-field !py-1.5 !px-2 text-sm w-20"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <input
                              type="number"
                              value={editForm.weight || ""}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  weight: Number(e.target.value),
                                })
                              }
                              className="input-field !py-1.5 !px-2 text-sm w-20"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <select
                              value={editForm.playingStyle}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  playingStyle: e.target.value as PlayingStyle,
                                })
                              }
                              className="input-field !py-1.5 !px-2 text-sm"
                            >
                              {styles.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">—</td>
                          <td className="py-2 px-4 text-right space-x-1">
                            <button
                              onClick={saveEdit}
                              className="p-1.5 rounded-lg bg-pitch-600/30 text-pitch-400 hover:bg-pitch-600/50"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ) : (
                        <tr
                          key={p.uid}
                          className="border-b border-white/5 hover:bg-white/[0.02]"
                        >
                          <td className="py-3 px-4 font-medium">
                            {p.displayName}
                          </td>
                          <td className="py-3 px-3">{p.position}</td>
                          <td className="py-3 px-3">{p.strongFoot}</td>
                          <td className="py-3 px-3">{p.height} cm</td>
                          <td className="py-3 px-3">{p.weight} kg</td>
                          <td className="py-3 px-3 text-slate-400">
                            {p.playingStyle}
                          </td>
                          <td className="py-3 px-3">
                            <button
                              onClick={() => toggleAdmin(p)}
                              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                                p.isAdmin
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                                  : "bg-slate-700/40 text-slate-500 border-slate-600/40 hover:border-amber-500/30"
                              }`}
                            >
                              {p.isAdmin ? "Admin" : "Make Admin"}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right space-x-1">
                            <button
                              onClick={() => startEdit(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-pitch-400 hover:bg-pitch-500/10"
                              title="Edit player"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deletePlayer(p)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              title="Delete player"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pitch-400" />
                Matches
              </h2>
              <button
                onClick={() => setShowMatchForm(!showMatchForm)}
                className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Match
              </button>
            </div>

            {showMatchForm && (
              <div className="glass-strong rounded-2xl p-6 mb-6 space-y-4">
                <h3 className="font-semibold">New Match</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Date
                    </label>
                    <input
                      type="date"
                      value={matchForm.date}
                      onChange={(e) =>
                        setMatchForm({ ...matchForm, date: e.target.value })
                      }
                      className="input-field !py-2"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Opponent
                    </label>
                    <input
                      type="text"
                      value={matchForm.opponent}
                      onChange={(e) =>
                        setMatchForm({
                          ...matchForm,
                          opponent: e.target.value,
                        })
                      }
                      className="input-field !py-2"
                      placeholder="Rival FC"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Score (Home - Away)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={matchForm.homeScore}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            homeScore: Number(e.target.value),
                          })
                        }
                        className="input-field !py-2 w-20"
                        min={0}
                      />
                      <span className="self-center text-slate-500">-</span>
                      <input
                        type="number"
                        value={matchForm.awayScore}
                        onChange={(e) =>
                          setMatchForm({
                            ...matchForm,
                            awayScore: Number(e.target.value),
                          })
                        }
                        className="input-field !py-2 w-20"
                        min={0}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                      Home game?
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setMatchForm({
                          ...matchForm,
                          isHome: !matchForm.isHome,
                        })
                      }
                      className={`w-full py-2 rounded-xl text-sm font-medium ${
                        matchForm.isHome
                          ? "bg-pitch-600 text-white"
                          : "bg-slate-700 text-slate-300"
                      }`}
                    >
                      {matchForm.isHome ? "Home" : "Away"}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-400 mb-2">
                    Player ratings, goals & assists
                  </p>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {players.map((p) => (
                      <div
                        key={p.uid}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="w-32 truncate font-medium">
                          {p.displayName}
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          min={1}
                          max={10}
                          placeholder="Rating"
                          value={matchStats[p.uid]?.rating ?? ""}
                          onChange={(e) =>
                            setMatchStats({
                              ...matchStats,
                              [p.uid]: {
                                ...matchStats[p.uid],
                                rating: Number(e.target.value),
                                goals: matchStats[p.uid]?.goals ?? 0,
                                assists: matchStats[p.uid]?.assists ?? 0,
                              },
                            })
                          }
                          className="input-field !py-1.5 !px-2 w-20"
                        />
                        <input
                          type="number"
                          min={0}
                          placeholder="G"
                          value={matchStats[p.uid]?.goals ?? ""}
                          onChange={(e) =>
                            setMatchStats({
                              ...matchStats,
                              [p.uid]: {
                                ...matchStats[p.uid],
                                rating: matchStats[p.uid]?.rating ?? 6.5,
                                goals: Number(e.target.value),
                                assists: matchStats[p.uid]?.assists ?? 0,
                              },
                            })
                          }
                          className="input-field !py-1.5 !px-2 w-16"
                        />
                        <input
                          type="number"
                          min={0}
                          placeholder="A"
                          value={matchStats[p.uid]?.assists ?? ""}
                          onChange={(e) =>
                            setMatchStats({
                              ...matchStats,
                              [p.uid]: {
                                ...matchStats[p.uid],
                                rating: matchStats[p.uid]?.rating ?? 6.5,
                                goals: matchStats[p.uid]?.goals ?? 0,
                                assists: Number(e.target.value),
                              },
                            })
                          }
                          className="input-field !py-1.5 !px-2 w-16"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={createMatch} className="btn-primary">
                    Create Match
                  </button>
                  <button
                    onClick={() => setShowMatchForm(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {matches.map((m) => (
                <div
                  key={m.id}
                  className="glass rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">
                      vs {m.opponent}{" "}
                      <span className="text-slate-500">
                        ({m.isHome ? "H" : "A"})
                      </span>
                    </p>
                    <p className="text-sm text-slate-400">
                      {format(new Date(m.date), "d MMM yyyy")} ·{" "}
                      {m.homeScore}-{m.awayScore}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteMatch(m.id)}
                    className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {matches.length === 0 && (
                <p className="text-slate-500 text-center py-8">
                  No matches yet. Add one above.
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  );
}
