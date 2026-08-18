"use client";

import { useEffect, useState, useRef } from "react";
import AuthGuard from "@/components/AuthGuard";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/types";
import {
  Send,
  Mic,
  MessageCircle,
  Play,
  Pause,
  Square,
} from "lucide-react";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";

export default function ChatPage() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
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
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async () => {
    if (!text.trim() || !user || !profile) return;
    setSending(true);
    try {
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
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
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

  return (
    <AuthGuard>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-6 flex flex-col page-enter">
          <div className="mb-4">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-pitch-400" />
              Squad Chat
            </h1>
            <p className="text-sm text-slate-400">
              Text & voice notes · Everyone including admin
            </p>
          </div>

          <div className="flex-1 glass rounded-2xl overflow-hidden flex flex-col min-h-[60vh]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-slate-500 py-16">
                  <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No messages yet. Say hi to the squad!</p>
                </div>
              )}
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                  >
                    <div className="max-w-[80%]">
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
                              onClick={() => togglePlay(msg.id, msg.content)}
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
                                {msg.duration ? ` · ~${msg.duration}s` : ""}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      <p
                        className={`text-[10px] text-slate-600 mt-1 ${
                          isMe ? "text-right mr-1" : "ml-1"
                        }`}
                      >
                        {format(new Date(msg.createdAt), "HH:mm")}
                      </p>
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
                title={recording ? "Stop recording" : "Record voice note"}
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
                placeholder={recording ? "Recording..." : "Type a message..."}
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
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
