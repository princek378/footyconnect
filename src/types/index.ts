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
  teamId?: string | null;
  isCaptain?: boolean;
  isFreeKickTaker?: boolean;
  isRightCornerTaker?: boolean;
  isLeftCornerTaker?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Team {
  id: string;
  name: string;
  createdAt: number;
  createdBy?: string;
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
  opponent?: string;
  homeScore?: number;
  awayScore?: number;
  isHome?: boolean;
  team1Id?: string;
  team1Name?: string;
  team2Id?: string;
  team2Name?: string;
  team1Score?: number;
  team2Score?: number;
  team1PlayerIds?: string[];
  team2PlayerIds?: string[];
  playerStats: MatchPlayerStat[];
  createdAt: number;
}

export interface MediaItem {
  id: string;
  title?: string;
  type: "image" | "video";
  url: string;
  uploadedBy?: string;
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
