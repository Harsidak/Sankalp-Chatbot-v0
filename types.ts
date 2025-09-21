export interface UserSelections {
  ageGroup: string;
  emotions: string[];
  intensity: number;
  language: string;
}

export enum MessageAuthor {
  USER = 'user',
  AI = 'ai',
}

export interface ChatMessage {
  author: MessageAuthor;
  text: string;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  selections: UserSelections;
  messages: ChatMessage[];
}

export type Theme = 'light' | 'dark';

export type AppView = 'landing' | 'chat' | 'dashboard';

// --- Gamified Wellness Plan Types ---

export enum RewardType {
    POINTS = 'points',
    BADGE = 'badge',
    MILESTONE = 'milestone',
}

export interface Reward {
    type: RewardType;
    value: string; // e.g., "20 points", "Mindful Explorer Badge"
}

export interface DailyChallenge {
  description: string;
  reward: Reward;
}

export interface StreakInfo {
  currentStreak: number;
  reward: string;
  encouragement: string;
}

export interface WeeklyChallenge {
  description: string;
  reward: Reward;
  goalDays: number;
}

export interface WellnessPlan {
  dailyChallenge: DailyChallenge;
  streakInfo: StreakInfo;
  weeklyChallenge: WeeklyChallenge;
  encouragement: string;
}


// --- Dashboard Analytics Types ---

export interface MoodTrendPoint {
    day: string; // e.g., "Mon"
    moodScore: number; // e.g., 1-10
}

export interface EmotionBreakdownItem {
    emotion: string;
    percentage: number;
    color: string;
}

export interface ActivityLogItem {
    date: string;
    activity: string;
}

export interface KeyMetrics {
    currentStreak: number;
    challengesCompleted: number;
}

export interface DashboardAnalytics {
    keyMetrics: KeyMetrics;
    moodTrend: MoodTrendPoint[];
    emotionBreakdown: EmotionBreakdownItem[];
    activityLog: ActivityLogItem[];
}

// --- Authentication Types ---
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
}

// --- New: Challenge/Stats/Emotion/Leaderboard Types ---
export type ChallengeType = 'daily' | 'weekly';

export interface ChallengeDefinition {
  id: string;
  type: ChallengeType;
  description: string;
  rewardPoints: number; // Points gained upon completion
  goalDays?: number;     // Weekly only
  // Editable via backend API/Firestore; client treats as read-only definition
}

// User stats maintained atomically via Firestore transactions
export interface UserStats {
  points: number;
  currentStreak: number;
  longestStreak: number;
  challengesCompleted: number;
  lastCompletionDate?: string;           // YYYY-MM-DD of any challenge completion
  lastDailyCompletionDate?: string;      // YYYY-MM-DD
  weeklyStartDate?: string;              // ISO Monday for current week
  weeklyGoalDays?: number;               // Mirrors challenge goal
  weeklyCompletedDates?: string[];       // Unique YYYY-MM-DD entries this week
}

export interface EmotionEntry {
  id: string;                 // timestamp id
  date: string;               // YYYY-MM-DD (local)
  emotions: string[];
  intensity: number;          // 1-10
  createdAt: number;          // ms epoch
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string | null;
  points: number;
  rank?: number;              // populated client-side
}
