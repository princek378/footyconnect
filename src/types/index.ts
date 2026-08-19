export type StrongFoot = "Left" | "Right" | "Both";
export type Position = "GK" | "DEF" | "MID" | "FWD";
export type PlayingStyle =
  | "Playmaker"
  | "Box-to-Box"
  | "Target Man"
  | "Poacher"
  | "Wingback"
  | "Ball Winner"
  | "Sweeper Keeper"
  | "Creator"
  | "Finisher"
  | "All-Rounder";

export interface PlayerProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  height: number;
  weight: number;
  strongFoot: StrongFoot;
  position: Position;
  playingStyle: PlayingStyle;
  isAdmin: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MatchPlayerStat {
  playerId: string;
  playerName: string;
  rating: number;
  goals: number;
  assists: number;
}

export interface Match {
  id: string;
  date: string;
  opponent: string;
  homeScore: number;
  awayScore: number;
  isHome: boolean;
  playerStats: MatchPlayerStat[];
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  type: "text" | "voice" | "system";
  content: string;
  duration?: number;
  createdAt: number;
  isAdmin?: boolean;
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  receiverName: string;
  type: "text" | "voice";
  content: string;
  duration?: number;
  createdAt: number;
  isAdmin?: boolean;
}
