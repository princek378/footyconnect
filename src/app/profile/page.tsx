"use client";

import { useState, useEffect } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  PlayerProfile,
  StrongFoot,
  Position,
  PlayingStyle,
  Team,
} from "@/types";
import {
  Save,
  User,
  Ruler,
  Weight,
  Footprints,
  Target,
  Sparkles,
  Users,
} from "lucide-react";

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

export default function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const [form, setForm] = useState<Partial<PlayerProfile>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName,
        height: profile.height,
        weight: profile.weight,
        strongFoot: profile.strongFoot,
        position: profile.position,
        playingStyle: profile.playingStyle,
        teamId: profile.teamId || null,
      });
    }
  }, [profile]);

  useEffect(() => {
    const fetchTeams = async () => {
      const { data } = await supabase.from("teams").select("*").order("name");
      if (data) setTeams(data as Team[]);
    };
    fetchTeams();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setSuccess(false);
    try {
      const { error } = await supabase
        .from("players")
        .update({
          ...form,
          updatedAt: Date.now(),
        })
        .eq("uid", profile.uid);

      if (error) throw error;
      await refreshProfile();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 page-enter">
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <User className="w-8 h-8 text-pitch-400" />
              My Profile
            </h1>
            <p className="text-slate-400 mt-1">
              Keep your player info up to date
            </p>
          </div>

          <form
            onSubmit={handleSave}
            className="glass-strong rounded-2xl p-6 sm:p-8 space-y-6"
          >
            {/* Display Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <User className="w-4 h-4" /> Display Name
              </label>
              <input
                type="text"
                value={form.displayName || ""}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
                className="input-field"
                required
              />
            </div>

            {/* Team Selection */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                <Users className="w-4 h-4" /> Team
              </label>
              <select
                value={form.teamId || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    teamId: e.target.value || null,
                  })
                }
                className="input-field"
              >
                <option value="">No Team</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Height & Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                  <Ruler className="w-4 h-4" /> Height (cm)
                </label>
                <input
                  type="number"
                  value={form.height || ""}
                  onChange={(e) =>
                    setForm({ ...form, height: Number(e.target.value) })
                  }
                  className="input-field"
                  min={140}
                  max={220}
                  required
                />
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-1.5">
                  <Weight className="w-4 h-4" /> Weight (kg)
                </label>
                <input
                  type="number"
                  value={form.weight || ""}
                  onChange={(e) =>
                    setForm({ ...form, weight: Number(e.target.value) })
                  }
                  className="input-field"
                  min={40}
                  max={150}
                  required
                />
              </div>
            </div>

            {/* Strong Foot */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Footprints className="w-4 h-4" /> Strong Foot
              </label>
              <div className="flex gap-2">
                {feet.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setForm({ ...form, strongFoot: f })}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      form.strongFoot === f
                        ? "bg-pitch-600 text-white shadow-glow"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Target className="w-4 h-4" /> Position
              </label>
              <div className="grid grid-cols-4 gap-2">
                {positions.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm({ ...form, position: p })}
                    className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                      form.position === p
                        ? "bg-pitch-600 text-white shadow-glow"
                        : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Playing Style */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2">
                <Sparkles className="w-4 h-4" /> Playing Style
              </label>
              <select
                value={form.playingStyle || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    playingStyle: e.target.value as PlayingStyle,
                  })
                }
                className="input-field"
              >
                {styles.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="btn-primary flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {success && (
                <span className="text-pitch-400 text-sm font-medium animate-fade-in">
                  ✓ Profile updated!
                </span>
              )}
            </div>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}
