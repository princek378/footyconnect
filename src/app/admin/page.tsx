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
  Team,
  MediaItem,
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
  Crown,
  Image as ImageIcon,
  Video,
  UserPlus,
} from "lucide-react";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

const positions: Position[] = ["GK", "DEF", "MID", "FWD"];
const feet: StrongFoot[] = ["Left", "Right", "Both"];
const styles: PlayingStyle[] = [
  "Playmaker", "Box-to-Box", "Target Man", "Poacher", "Wingback",
  "Ball Winner", "Sweeper Keeper", "Creator", "Finisher", "All-Rounder",
];

export default function AdminPage() {
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlayerProfile>>({});
  const [newTeamName, setNewTeamName] = useState("");
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [showCreatePlayer, setShowCreatePlayer] = useState(false);

  // Create Player form
  const [newPlayer, setNewPlayer] = useState({
    displayName: "",
    email: "",
    password: "",
    position: "MID" as Position,
    strongFoot: "Right" as StrongFoot,
  });

  // Match form
  const [matchForm, setMatchForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    team1Id: "",
    team2Id: "",
    team1Score: 0,
    team2Score: 0,
  });
  const [matchStats, setMatchStats] = useState<
    Record<string, { rating: number; goals: number; assists: number }>
  >({});

  // Media
  const [uploading, setUploading] = useState(false);
  const [mediaTitle, setMediaTitle] = useState("");

  useEffect(() => {
    const fetchAll = async () => {
      const [p, t, m, med] = await Promise.all([
        supabase.from("players").select("*").order("displayName"),
        supabase.from("teams").select("*").order("name"),
        supabase.from("matches").select("*").order("date", { ascending: false }),
        supabase.from("media").select("*").order("createdAt", { ascending: false }),
      ]);
      if (p.data) setPlayers(p.data as PlayerProfile[]);
      if (t.data) setTeams(t.data as Team[]);
      if (m.data) setMatches(m.data as Match[]);
      if (med.data) setMedia(med.data as MediaItem[]);
    };
    fetchAll();

    const channel = supabase
      .channel("admin-all")
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "teams" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "media" }, fetchAll)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ========== CREATE PLAYER ACCOUNT ==========
  const createPlayerAccount = async () => {
    if (!newPlayer.displayName || !newPlayer.email || !newPlayer.password) {
      alert("Please fill name, email and password");
      return;
    }
    if (newPlayer.password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    try {
      // Create auth user
      const { data, error } = await supabase.auth.signUp({
        email: newPlayer.email,
        password: newPlayer.password,
        options: { data: { display_name: newPlayer.displayName } },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user");

      // Create player profile
      await supabase.from("players").insert([{
        uid: data.user.id,
        email: newPlayer.email,
        displayName: newPlayer.displayName,
        height: 175,
        weight: 70,
        strongFoot: newPlayer.strongFoot,
        position: newPlayer.position,
        playingStyle: "All-Rounder",
        isAdmin: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }]);

      alert(`Account created!\n\nEmail: ${newPlayer.email}\nPassword: ${newPlayer.password}\n\nGive these details to the player.`);
      setNewPlayer({ displayName: "", email: "", password: "", position: "MID", strongFoot: "Right" });
      setShowCreatePlayer(false);
    } catch (err: any) {
      alert(err.message || "Failed to create account");
    }
  };

  // ========== TEAMS ==========
  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    await supabase.from("teams").insert([{
      id: uuidv4(),
      name: newTeamName.trim(),
      createdAt: Date.now(),
    }]);
    setNewTeamName("");
  };

  const deleteTeam = async (id: string) => {
    if (confirm("Delete this team?")) {
      await supabase.from("players").update({ teamId: null }).eq("teamId", id);
      await supabase.from("teams").delete().eq("id", id);
    }
  };

  // ========== PLAYERS ==========
  const startEdit = (p: PlayerProfile) => {
    setEditingId(p.uid);
    setEditForm({ ...p });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await supabase.from("players").update({ ...editForm, updatedAt: Date.now() }).eq("uid", editingId);
    setEditingId(null);
  };

  const toggleAdmin = async (p: PlayerProfile) => {
    await supabase.from("players").update({ isAdmin: !p.isAdmin, updatedAt: Date.now() }).eq("uid", p.uid);
  };

  const deletePlayer = async (p: PlayerProfile) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user && p.uid === user.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (confirm(`Delete ${p.displayName}?`)) {
      await supabase.from("players").delete().eq("uid", p.uid);
    }
  };

  // ========== MATCHES ==========
  const createMatch = async () => {
    if (!matchForm.team1Id || !matchForm.team2Id) {
      alert("Please select both teams");
      return;
    }
    if (matchForm.team1Id === matchForm.team2Id) {
      alert("Please select two different teams");
      return;
    }

    const team1 = teams.find(t => t.id === matchForm.team1Id);
    const team2 = teams.find(t => t.id === matchForm.team2Id);

    const team1Players = players.filter(p => p.teamId === matchForm.team1Id);
    const team2Players = players.filter(p => p.teamId === matchForm.team2Id);

    const playerStats: MatchPlayerStat[] = [...team1Players, ...team2Players].map(p => ({
      playerId: p.uid,
      playerName: p.displayName,
      rating: matchStats[p.uid]?.rating ?? 6.5,
      goals: matchStats[p.uid]?.goals ?? 0,
      assists: matchStats[p.uid]?.assists ?? 0,
    }));

    await supabase.from("matches").insert([{
      id: uuidv4(),
      date: matchForm.date,
      team1Id: matchForm.team1Id,
      team1Name: team1?.name || "Team 1",
      team2Id: matchForm.team2Id,
      team2Name: team2?.name || "Team 2",
      team1Score: Number(matchForm.team1Score),
      team2Score: Number(matchForm.team2Score),
      team1PlayerIds: team1Players.map(p => p.uid),
      team2PlayerIds: team2Players.map(p => p.uid),
      playerStats,
      createdAt: Date.now(),
    }]);

    setShowMatchForm(false);
    setMatchForm({ date: new Date().toISOString().slice(0, 10), team1Id: "", team2Id: "", team1Score: 0, team2Score: 0 });
    setMatchStats({});
  };

  const deleteMatch = async (id: string) => {
    if (confirm("Delete this match?")) {
      await supabase.from("matches").delete().eq("id", id);
    }
  };

  // ========== MEDIA ==========
  const uploadMedia = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      alert("Only images and videos are allowed");
      return;
    }

    setUploading(true);
    try {
      const id = uuidv4();
      const ext = file.name.split(".").pop();
      const path = `media/${id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("voice-notes") // reusing existing bucket
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("voice-notes").getPublicUrl(path);

      await supabase.from("media").insert([{
        id,
        title: mediaTitle || file.name,
        type: isVideo ? "video" : "image",
        url: urlData.publicUrl,
        createdAt: Date.now(),
      }]);

      setMediaTitle("");
      e.target.value = "";
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const deleteMedia = async (item: MediaItem) => {
    if (confirm("Delete this media?")) {
      await supabase.from("media").delete().eq("id", item.id);
    }
  };

  const getTeamName = (id?: string | null) => teams.find(t => t.id === id)?.name || "—";

  return (
    <AuthGuard adminOnly>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter space-y-12">

          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-amber-400" />
              Admin Panel
            </h1>
            <p className="text-slate-400 mt-1">Manage everything</p>
          </div>

          {/* ========== CREATE PLAYER ACCOUNT ========== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-pitch-400" />
                Create Player Account
              </h2>
              <button onClick={() => setShowCreatePlayer(!showCreatePlayer)} className="btn-primary !py-2 !px-4 text-sm">
                {showCreatePlayer ? "Cancel" : "Create Account"}
              </button>
            </div>

            {showCreatePlayer && (
              <div className="glass-strong rounded-2xl p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <input
                    placeholder="Player Name"
                    value={newPlayer.displayName}
                    onChange={e => setNewPlayer({ ...newPlayer, displayName: e.target.value })}
                    className="input-field"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newPlayer.email}
                    onChange={e => setNewPlayer({ ...newPlayer, email: e.target.value })}
                    className="input-field"
                  />
                  <input
                    type="text"
                    placeholder="Password (min 6 chars)"
                    value={newPlayer.password}
                    onChange={e => setNewPlayer({ ...newPlayer, password: e.target.value })}
                    className="input-field"
                  />
                  <select
                    value={newPlayer.position}
                    onChange={e => setNewPlayer({ ...newPlayer, position: e.target.value as Position })}
                    className="input-field"
                  >
                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <button onClick={createPlayerAccount} className="btn-primary">
                  Create Account & Get Login Details
                </button>
              </div>
            )}
          </section>

          {/* ========== TEAMS ========== */}
          <section>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-pitch-400" /> Teams
            </h2>
            <div className="glass rounded-2xl p-5 mb-4 flex gap-3">
              <input
                value={newTeamName}
                onChange={e => setNewTeamName(e.target.value)}
                placeholder="New team name"
                className="input-field flex-1"
              />
              <button onClick={createTeam} className="btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create Team
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {teams.map(t => (
                <div key={t.id} className="glass rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <p className="text-xs text-slate-500">{players.filter(p => p.teamId === t.id).length} players</p>
                  </div>
                  <button onClick={() => deleteTeam(t.id)} className="p-2 text-slate-500 hover:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* ========== PLAYERS ========== */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Players ({players.length})</h2>
            <div className="glass rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-white/5 bg-slate-900/40">
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-left py-3 px-3">Team</th>
                    <th className="text-left py-3 px-3">Pos</th>
                    <th className="text-center py-3 px-2">Cap</th>
                    <th className="text-center py-3 px-2">FK</th>
                    <th className="text-center py-3 px-2">R Cnr</th>
                    <th className="text-center py-3 px-2">L Cnr</th>
                    <th className="text-left py-3 px-3">Admin</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(p => (
                    editingId === p.uid ? (
                      <tr key={p.uid} className="bg-pitch-500/5">
                        <td className="py-2 px-4">
                          <input value={editForm.displayName || ""} onChange={e => setEditForm({...editForm, displayName: e.target.value})} className="input-field !py-1.5 !px-2 text-sm" />
                        </td>
                        <td className="py-2 px-3">
                          <select value={editForm.teamId || ""} onChange={e => setEditForm({...editForm, teamId: e.target.value || null})} className="input-field !py-1.5 !px-2 text-sm">
                            <option value="">No Team</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </td>
                        <td className="py-2 px-3">
                          <select value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value as Position})} className="input-field !py-1.5 !px-2 text-sm">
                            {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                          </select>
                        </td>
                        <td className="text-center"><input type="checkbox" checked={!!editForm.isCaptain} onChange={e => setEditForm({...editForm, isCaptain: e.target.checked})} /></td>
                        <td className="text-center"><input type="checkbox" checked={!!editForm.isFreeKickTaker} onChange={e => setEditForm({...editForm, isFreeKickTaker: e.target.checked})} /></td>
                        <td className="text-center"><input type="checkbox" checked={!!editForm.isRightCornerTaker} onChange={e => setEditForm({...editForm, isRightCornerTaker: e.target.checked})} /></td>
                        <td className="text-center"><input type="checkbox" checked={!!editForm.isLeftCornerTaker} onChange={e => setEditForm({...editForm, isLeftCornerTaker: e.target.checked})} /></td>
                        <td>—</td>
                        <td className="py-2 px-4 text-right space-x-1">
                          <button onClick={saveEdit} className="p-1.5 rounded-lg bg-pitch-600/30 text-pitch-400"><Save className="w-4 h-4" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg bg-slate-700 text-slate-300"><X className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ) : (
                      <tr key={p.uid} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-medium">
                          {p.displayName}
                          {p.isCaptain && <Crown className="inline w-3.5 h-3.5 text-amber-400 ml-1" />}
                        </td>
                        <td className="py-3 px-3">{getTeamName(p.teamId)}</td>
                        <td className="py-3 px-3">{p.position}</td>
                        <td className="py-3 px-2 text-center">{p.isCaptain ? "✓" : "—"}</td>
                        <td className="py-3 px-2 text-center">{p.isFreeKickTaker ? "✓" : "—"}</td>
                        <td className="py-3 px-2 text-center">{p.isRightCornerTaker ? "✓" : "—"}</td>
                        <td className="py-3 px-2 text-center">{p.isLeftCornerTaker ? "✓" : "—"}</td>
                        <td className="py-3 px-3">
                          <button onClick={() => toggleAdmin(p)} className={`text-xs px-2 py-1 rounded-lg border ${p.isAdmin ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-slate-700/40 text-slate-500"}`}>
                            {p.isAdmin ? "Admin" : "Make Admin"}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button onClick={() => startEdit(p)} className="p-1.5 text-slate-400 hover:text-pitch-400"><Edit3 className="w-4 h-4" /></button>
                          <button onClick={() => deletePlayer(p)} className="p-1.5 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* ========== MATCHES ========== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pitch-400" /> Matches
              </h2>
              <button onClick={() => setShowMatchForm(!showMatchForm)} className="btn-primary !py-2 !px-4 text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add Match
              </button>
            </div>

            {showMatchForm && (
              <div className="glass-strong rounded-2xl p-6 mb-6 space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Date</label>
                    <input type="date" value={matchForm.date} onChange={e => setMatchForm({...matchForm, date: e.target.value})} className="input-field !py-2" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Team 1</label>
                    <select value={matchForm.team1Id} onChange={e => setMatchForm({...matchForm, team1Id: e.target.value})} className="input-field !py-2">
                      <option value="">Select team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Team 2</label>
                    <select value={matchForm.team2Id} onChange={e => setMatchForm({...matchForm, team2Id: e.target.value})} className="input-field !py-2">
                      <option value="">Select team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Score (Team1 - Team2)</label>
                    <div className="flex gap-2">
                      <input type="number" min={0} value={matchForm.team1Score} onChange={e => setMatchForm({...matchForm, team1Score: Number(e.target.value)})} className="input-field !py-2 w-20" />
                      <span className="self-center">-</span>
                      <input type="number" min={0} value={matchForm.team2Score} onChange={e => setMatchForm({...matchForm, team2Score: Number(e.target.value)})} className="input-field !py-2 w-20" />
                    </div>
                  </div>
                </div>

                {/* Players from both teams */}
                {(matchForm.team1Id || matchForm.team2Id) && (
                  <div>
                    <p className="text-sm text-slate-400 mb-2">Player ratings, goals & assists</p>
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {players
                        .filter(p => p.teamId === matchForm.team1Id || p.teamId === matchForm.team2Id)
                        .map(p => (
                          <div key={p.uid} className="flex items-center gap-3 text-sm">
                            <span className="w-36 truncate font-medium">
                              {p.displayName}
                              <span className="text-xs text-slate-500 ml-1">({getTeamName(p.teamId)})</span>
                            </span>
                            <input type="number" step="0.1" min={1} max={10} placeholder="Rating" value={matchStats[p.uid]?.rating ?? ""} onChange={e => setMatchStats({...matchStats, [p.uid]: { rating: Number(e.target.value), goals: matchStats[p.uid]?.goals ?? 0, assists: matchStats[p.uid]?.assists ?? 0 }})} className="input-field !py-1.5 !px-2 w-20" />
                            <input type="number" min={0} placeholder="G" value={matchStats[p.uid]?.goals ?? ""} onChange={e => setMatchStats({...matchStats, [p.uid]: { rating: matchStats[p.uid]?.rating ?? 6.5, goals: Number(e.target.value), assists: matchStats[p.uid]?.assists ?? 0 }})} className="input-field !py-1.5 !px-2 w-16" />
                            <input type="number" min={0} placeholder="A" value={matchStats[p.uid]?.assists ?? ""} onChange={e => setMatchStats({...matchStats, [p.uid]: { rating: matchStats[p.uid]?.rating ?? 6.5, goals: matchStats[p.uid]?.goals ?? 0, assists: Number(e.target.value) }})} className="input-field !py-1.5 !px-2 w-16" />
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={createMatch} className="btn-primary">Create Match</button>
                  <button onClick={() => setShowMatchForm(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {matches.map(m => {
                const winner = (m.team1Score ?? 0) > (m.team2Score ?? 0) ? m.team1Name : (m.team2Score ?? 0) > (m.team1Score ?? 0) ? m.team2Name : "Draw";
                return (
                  <div key={m.id} className="glass rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {m.team1Name || "Team 1"} <span className="text-pitch-400">{m.team1Score}</span>
                        {" - "}
                        <span className="text-pitch-400">{m.team2Score}</span> {m.team2Name || "Team 2"}
                      </p>
                      <p className="text-sm text-slate-400">
                        {format(new Date(m.date), "d MMM yyyy")} · Winner: <span className="text-amber-400">{winner}</span>
                      </p>
                    </div>
                    <button onClick={() => deleteMatch(m.id)} className="p-2 text-slate-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ========== MEDIA ========== */}
          <section>
            <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-pitch-400" /> Media Gallery
            </h2>

            <div className="glass rounded-2xl p-5 mb-6 space-y-4">
              <input
                value={mediaTitle}
                onChange={e => setMediaTitle(e.target.value)}
                placeholder="Title (optional)"
                className="input-field"
              />
              <div>
                <label className="btn-primary inline-flex items-center gap-2 cursor-pointer">
                  {uploading ? "Uploading..." : "Upload Image or Video"}
                  <input type="file" accept="image/*,video/*" onChange={uploadMedia} className="hidden" disabled={uploading} />
                </label>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {media.map(item => (
                <div key={item.id} className="glass rounded-xl overflow-hidden">
                  {item.type === "image" ? (
                    <img src={item.url} alt={item.title || ""} className="w-full h-48 object-cover" />
                  ) : (
                    <video src={item.url} controls className="w-full h-48 object-cover" />
                  )}
                  <div className="p-3 flex items-center justify-between">
                    <p className="text-sm truncate">{item.title || "Untitled"}</p>
                    <button onClick={() => deleteMedia(item)} className="p-1.5 text-slate-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </main>
      </div>
    </AuthGuard>
  );
}
