"use client";

import { useEffect, useState, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { ChatMessage, PrivateMessage, PlayerProfile } from "@/types";
import {
  Send,
  Mic,
  MessageCircle,
  Play,
  Pause,
  Square,
  Trash2,
  Users,
  User,
} from "lucide-react";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

type ChatMode = "group" | "private";

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<ChatMode>("group");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [privateMessages, setPrivateMessages] = useState<PrivateMessage[]>([]);
  const [players, setPlayers] = useState<PlayerProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<PlayerProfile | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("players")
        .select("*")
        .order("displayName");
      if (data) setPlayers(data as PlayerProfile[]);
    };
    fetchPlayers();
  }, []);

  useEffect(() => {
    if (mode !== "group") return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("createdAt", { ascending: true })
        .limit(200);
      if (data) setMessages(data as ChatMessage[]);
    };
    fetchMessages();

    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => fetchMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode]);

  useEffect(() => {
    if (mode !== "private" || !selectedUser || !user) return;

    const fetchPrivate = async () => {
      const { data } = await supabase
        .from("private_messages")
        .select("*")
        .or(
          `and(senderId.eq.${user.id},receiverId.eq.${selectedUser.uid}),and(senderId.eq.${selectedUser.uid},receiverId.eq.${user.id})`
        )
        .order("createdAt", { ascending: true });
      if (data) setPrivateMessages(data as PrivateMessage[]);
    };
    fetchPrivate();

    const channel = supabase
      .channel(`private-${selectedUser.uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "private_messages" },
        () => fetchPrivate()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [mode, selectedUser, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, privateMessages]);

  const sendText = async () => {
    if (!text.trim() || !user || !profile) return;
    setSending(true);
    try {
      if (mode === "group") {
        await supabase.from("messages").insert([
          {
            id: uuidv4(),
            senderId: user.id,
            senderName: profile.displayName,
            type: "text",
            content: text.trim(),
            createdAt: Date.now(),
            isAdmin: profile.isAdmin || false,
          },
        ]);
      } else if (selectedUser) {
        await supabase.from("private_messages").insert([
          {
            id: uuidv4(),
            senderId: user.id,
            senderName: profile.displayName,
            receiverId: selectedUser.uid,
            receiverName: selectedUser.displayName,
            type: "text",
            content: text.trim(),
            createdAt: Date.now(),
            isAdmin: profile.isAdmin || false,
          },
        ]);
      }
      setText("");
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        await uploadVoice(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
      alert("Please allow microphone access to send voice notes.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  const uploadVoice = async (blob: Blob) => {
    if (!user || !profile) return;
    setSending(true);
    try {
      const id = uuidv4();
      const filePath = `voice-notes/${id}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("voice-notes")
        .upload(filePath, blob, { contentType: "audio/webm" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("voice-notes")
        .getPublicUrl(filePath);

      const duration = Math.round(blob.size / 8000);

      if (mode === "group") {
        await supabase.from("messages").insert([
          {
            id,
            senderId: user.id,
            senderName: profile.displayName,
            type: "voice",
            content: urlData.publicUrl,
            duration,
            createdAt: Date.now(),
            isAdmin: profile.isAdmin || false,
          },
        ]);
      } else if (selectedUser) {
        await supabase.from("private_messages").insert([
          {
            id,
            senderId: user.id,
            senderName: profile.displayName,
            receiverId: selectedUser.uid,
            receiverName: selectedUser.displayName,
            type: "voice",
            content: urlData.publicUrl,
            duration,
            createdAt: Date.now(),
            isAdmin: profile.isAdmin || false,
          },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (
    msg: ChatMessage | PrivateMessage,
    isPrivate: boolean
  ) => {
    const canDelete = msg.senderId === user?.id || profile?.isAdmin;

    if (!canDelete) {
      alert("You can only delete your own messages (or admin can delete any).");
      return;
    }

    if (!confirm("Delete this message?")) return;

    if (isPrivate) {
      await supabase.from("private_messages").delete().eq("id", msg.id);
    } else {
      await supabase.from("messages").delete().eq("id", msg.id);
    }
  };

  const togglePlay = (id: string, url: string) => {
    const audio = audioRefs.current[id];
    if (playingId === id && audio) {
      audio.pause();
      setPlayingId(null);
    } else {
      Object.values(audioRefs.current).forEach((a) => a.pause());
      if (!audio) {
        const newAudio = new Audio(url);
        audioRefs.current[id] = newAudio;
        newAudio.onended = () => setPlayingId(null);
        newAudio.play();
      } else {
        audio.play();
      }
      setPlayingId(id);
    }
  };

  const currentMessages = mode === "group" ? messages : privateMessages;
  const otherPlayers = players.filter((p) => p.uid !== user?.id);

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col page-enter">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <MessageCircle className="w-6 h-6 text-pitch-400" />
                {mode === "group"
                  ? "Squad Chat"
                  : selectedUser
                  ? `Chat with ${selectedUser.displayName}`
                  : "Private Messages"}
              </h1>
              <p className="text-sm text-slate-400">
                {mode === "group"
                  ? "Group chat · Everyone can see"
                  : "Private 1-on-1 conversations"}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setMode("group");
                  setSelectedUser(null);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === "group"
                    ? "bg-pitch-600 text-white"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                }`}
              >
                <Users className="w-4 h-4" />
                Group
              </button>
              <button
                onClick={() => setMode("private")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === "private"
                    ? "bg-pitch-600 text-white"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50"
                }`}
              >
                <User className="w-4 h-4" />
                Private
              </button>
            </div>
          </div>

          <div className="flex-1 glass rounded-2xl overflow-hidden flex min-h-[65vh]">
            {mode === "private" && (
              <div className="w-64 border-r border-white/5 flex flex-col shrink-0">
                <div className="p-3 border-b border-white/5 text-sm font-medium text-slate-400">
                  Select a player
                </div>
                <div className="flex-1 overflow-y-auto">
                  {otherPlayers.length === 0 ? (
                    <p className="p-4 text-sm text-slate-500">
                      No other players yet
                    </p>
                  ) : (
                    otherPlayers.map((p) => (
                      <button
                        key={p.uid}
                        onClick={() => setSelectedUser(p)}
                        className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                          selectedUser?.uid === p.uid
                            ? "bg-pitch-500/10 border-r-2 border-pitch-500"
                            : ""
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pitch-600 to-pitch-800 flex items-center justify-center text-sm font-bold shrink-0">
                          {p.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {p.displayName}
                          </p>
                          <p className="text-xs text-slate-500">{p.position}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col min-w-0">
              {mode === "private" && !selectedUser ? (
                <div className="flex-1 flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <User className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p>Select a player to start a private chat</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {currentMessages.length === 0 && (
                      <div className="text-center text-slate-500 py-16">
                        <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p>
                          {mode === "group"
                            ? "No messages yet. Say hi to the squad!"
                            : "No messages yet. Start the conversation!"}
                        </p>
                      </div>
                    )}

                    {currentMessages.map((msg) => {
                      const isMe = msg.senderId === user?.id;
                      const canDelete = isMe || profile?.isAdmin;

                      return (
                        <div
                          key={msg.id}
                          className={`flex group ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div className="max-w-[75%] relative">
                            {!isMe && (
                              <div className="flex items-center gap-1.5 mb-1 ml-1">
                                <span className="text-xs font-medium text-slate-400">
                                  {msg.senderName}
                                </span>
                                {msg.isAdmin && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                                    Admin
                                  </span>
                                )}
                              </div>
                            )}

                            <div
                              className={
                                isMe ? "chat-bubble-me" : "chat-bubble-other"
                              }
                            >
                              {msg.type === "text" ? (
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                  {msg.content}
                                </p>
                              ) : (
                                <div className="flex items-center gap-3 min-w-[160px]">
                                  <button
                                    onClick={() =>
                                      togglePlay(msg.id, msg.content)
                                    }
                                    className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
                                  >
                                    {playingId === msg.id ? (
                                      <Pause className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </button>
                                  <div className="flex-1">
                                    <div className="voice-wave text-current opacity-70">
                                      {[...Array(8)].map((_, i) => (
                                        <span key={i} />
                                      ))}
                                    </div>
                                    <p className="text-[10px] opacity-60 mt-0.5">
                                      Voice note
                                      {msg.duration
                                        ? ` · ~${msg.duration}s`
                                        : ""}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <div
                              className={`flex items-center gap-2 mt-1 ${
                                isMe ? "justify-end mr-1" : "ml-1"
                              }`}
                            >
                              <span className="text-[10px] text-slate-600">
                                {format(new Date(msg.createdAt), "HH:mm")}
                              </span>
                              {canDelete && (
                                <button
                                  onClick={() =>
                                    deleteMessage(msg, mode === "private")
                                  }
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-red-400 transition-all"
                                  title="Delete message"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomRef} />
                  </div>

                  <div className="border-t border-white/5 p-3 flex items-center gap-2">
                    <button
                      onClick={recording ? stopRecording : startRecording}
                      disabled={sending}
                      className={`p-2.5 rounded-xl transition-all ${
                        recording
                          ? "bg-red-500/20 text-red-400 animate-pulse"
                          : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white"
                      }`}
                      title={
                        recording ? "Stop recording" : "Record voice note"
                      }
                    >
                      {recording ? (
                        <Square className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendText();
                        }
                      }}
                      placeholder={
                        recording
                          ? "Recording..."
                          : mode === "private"
                          ? `Message ${selectedUser?.displayName}...`
                          : "Type a message..."
                      }
                      disabled={recording || sending}
                      className="input-field flex-1 py-2.5"
                    />

                    <button
                      onClick={sendText}
                      disabled={!text.trim() || sending || recording}
                      className="btn-primary !py-2.5 !px-4"
                    >
                      <Send className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
