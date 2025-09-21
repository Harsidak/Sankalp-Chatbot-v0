// FIX: The combined import for `firebase/app` was causing module resolution issues.
// Splitting the value and type imports can resolve such issues with some bundlers.
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    // FIX: Aliased the imported function to resolve name collision with the exported function.
    signInAnonymously as firebaseSignInAnonymously, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    sendPasswordResetEmail,
    linkWithPopup,
    type User 
} from 'firebase/auth';
import { 
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs, 
    writeBatch, 
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    limit,
    runTransaction,
    collectionGroup
} from 'firebase/firestore';
import type { AuthUser, ChatSession, DashboardAnalytics, WellnessPlan, Theme } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyBwk0qfqC8cpEc2F8lx053nM5SvVQXkaTc",
  authDomain: "sahaara-chat-bot.firebaseapp.com",
  databaseURL: "https://sahaara-chat-bot-default-rtdb.firebaseio.com",
  projectId: "sahaara-chat-bot",
  storageBucket: "sahaara-chat-bot.firebasestorage.app",
  messagingSenderId: "756307450344",
  appId: "1:756307450344:web:d715a7765ef4c34bf5ac5d",
  measurementId: "G-RCY3SNBR16"
};

export const app: FirebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(app);
// Initialize Firestore with persistent local cache (works offline and syncs when online)
const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

// --- AUTHENTICATION ---

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

// FIX: Used the aliased import `firebaseSignInAnonymously` to call the correct function and resolve self-reference error.
export const signInAnonymously = () => firebaseSignInAnonymously(auth);

export const signUpWithEmail = (email: string, password: string) => createUserWithEmailAndPassword(auth, email, password);

export const signInWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);

export const signOutUser = () => signOut(auth);

export const sendPasswordReset = (email: string) => sendPasswordResetEmail(auth, email);

export const linkAnonymousAccountWithGoogle = async () => {
    if (auth.currentUser && auth.currentUser.isAnonymous) {
        return await linkWithPopup(auth.currentUser, googleProvider);
    }
    throw new Error("No anonymous user to link.");
};

export const onAuthStateChangedListener = (callback: (user: AuthUser | null) => void) => {
    return onAuthStateChanged(auth, (user: User | null) => {
        if (user) {
            const { uid, email, displayName, isAnonymous } = user;
            callback({ uid, email, displayName, isAnonymous });
        } else {
            callback(null);
        }
    });
};

// --- FIRESTORE DATABASE ---

// Profile (Theme & Language)
export const saveUserProfile = async (uid: string, profile: { theme: Theme; language: string; }) => {
    const userProfileRef = doc(db, 'users', uid, 'data', 'profile');
    await setDoc(userProfileRef, profile, { merge: true });
};

export const getUserProfile = async (uid: string): Promise<{ theme: Theme; language: string; } | null> => {
    const userProfileRef = doc(db, 'users', uid, 'data', 'profile');
    const docSnap = await getDoc(userProfileRef);
    return docSnap.exists() ? docSnap.data() as { theme: Theme; language: string; } : null;
};


// Chat Sessions
export const saveChatSession = async (uid: string, session: ChatSession) => {
    const sessionRef = doc(db, 'users', uid, 'sessions', session.id);
    await setDoc(sessionRef, session);
};

export const getChatSessions = async (uid: string): Promise<ChatSession[]> => {
    const sessionsRef = collection(db, 'users', uid, 'sessions');
    const querySnapshot = await getDocs(sessionsRef);
    return querySnapshot.docs.map(doc => doc.data() as ChatSession);
};

export const deleteChatSession = async (uid: string, sessionId: string) => {
    const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
    await deleteDoc(sessionRef);
};

export const clearAllChatHistory = async (uid: string) => {
    const sessionsRef = collection(db, 'users', uid, 'sessions');
    const querySnapshot = await getDocs(sessionsRef);
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};

// Dashboard Data
type DashboardData = { wellnessPlan: WellnessPlan, analyticsData: DashboardAnalytics };

export const saveDashboardData = async (uid: string, data: DashboardData) => {
    const dashboardRef = doc(db, 'users', uid, 'data', 'dashboard');
    await setDoc(dashboardRef, data);
};

export const getDashboardData = async (uid: string): Promise<DashboardData | null> => {
    const dashboardRef = doc(db, 'users', uid, 'data', 'dashboard');
    const docSnap = await getDoc(dashboardRef);
    return docSnap.exists() ? docSnap.data() as DashboardData : null;
};

// Live subscription to dashboard doc so analytics/plan stay in sync across devices
export const subscribeToDashboardData = (
    uid: string,
    cb: (data: DashboardData | null) => void
) => {
    const dashboardRef = doc(db, 'users', uid, 'data', 'dashboard');
    return onSnapshot(dashboardRef, (snap) => {
        cb(snap.exists() ? (snap.data() as DashboardData) : null);
    });
};

// ------------------------------
// New: Engagement, Tracking, Analytics
// ------------------------------
import type { ChallengeDefinition, UserStats, EmotionEntry, LeaderboardEntry } from '../types';

// Date helpers
const pad = (n: number) => String(n).padStart(2, '0');
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromDateKey = (key: string) => new Date(`${key}T00:00:00`);
const todayKey = () => toDateKey(new Date());
const startOfWeekMondayKey = (d = new Date()) => {
    const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = copy.getDay(); // 0 (Sun) .. 6 (Sat)
    const diff = day === 0 ? -6 : 1 - day; // move to Monday
    copy.setDate(copy.getDate() + diff);
    return toDateKey(copy);
};
const diffDays = (aKey: string, bKey: string) => Math.round((fromDateKey(aKey).getTime() - fromDateKey(bKey).getTime()) / (1000 * 60 * 60 * 24));

const DEFAULT_WEEKLY_GOAL = 4;

const defaultStats = (weeklyGoalDays = DEFAULT_WEEKLY_GOAL): UserStats => ({
    points: 0,
    currentStreak: 0,
    longestStreak: 0,
    challengesCompleted: 0,
    lastCompletionDate: undefined,
    lastDailyCompletionDate: undefined,
    weeklyStartDate: startOfWeekMondayKey(),
    weeklyGoalDays,
    weeklyCompletedDates: []
});

const statsRefFor = (uid: string) => doc(db, 'users', uid, 'data', 'stats');
const emotionsColFor = (uid: string) => collection(db, 'users', uid, 'emotions');
const dailyCompletionsColFor = (uid: string) => collection(db, 'users', uid, 'dailyCompletions');
const weeklyAwardsColFor = (uid: string) => collection(db, 'users', uid, 'weeklyAwards');
const leaderboardDocFor = (uid: string) => doc(db, 'leaderboard', uid);

export const ensureStatsInitialized = async (uid: string, weeklyGoalDays?: number) => {
    const ref = statsRefFor(uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
        await setDoc(ref, defaultStats(weeklyGoalDays));
    }
};

// Real-time subscription to user stats
export const subscribeToUserStats = async (
    uid: string,
    callback: (stats: UserStats) => void,
    weeklyGoalDays?: number
) => {
    await ensureStatsInitialized(uid, weeklyGoalDays);
    const ref = statsRefFor(uid);
    return onSnapshot(ref, (snap) => {
        const data = (snap.data() as UserStats) || defaultStats();
        callback(data);
    });
};

// Record today's emotion entry (idempotent per day)
export const recordDailyEmotion = async (uid: string, emotions: string[], intensity: number, dateKey?: string) => {
    const key = dateKey || todayKey();
    const entry: EmotionEntry = {
        id: key,
        date: key,
        emotions,
        intensity,
        createdAt: Date.now(),
    };
    const ref = doc(emotionsColFor(uid), key);
    await setDoc(ref, entry, { merge: true });
};

// Subscribe to last 7 days emotions, computing trend and breakdown
export const subscribeToWeeklyEmotionSummary = (
    uid: string,
    cb: (trend: { day: string; moodScore: number }[], breakdown: { emotion: string; percentage: number; color: string }[]) => void
) => {
    const q = query(emotionsColFor(uid), orderBy('createdAt', 'desc'), limit(7));
    const palette = ['#60A5FA', '#F59E0B', '#A78BFA', '#10B981', '#F472B6', '#34D399'];
    return onSnapshot(q, (snap) => {
        const docs = snap.docs.map((d) => d.data() as EmotionEntry).sort((a,b) => a.createdAt - b.createdAt);
        const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const trend = docs.map((e) => ({
            day: days[new Date(e.date + 'T00:00:00').getDay()].slice(0,3),
            moodScore: e.intensity
        }));
        const counts: Record<string, number> = {};
        docs.forEach((e) => e.emotions.forEach((em) => { counts[em] = (counts[em] || 0) + 1; }));
        const total = Object.values(counts).reduce((a,b)=>a+b, 0) || 1;
        const top = Object.entries(counts)
            .sort((a,b) => b[1]-a[1])
            .slice(0,4)
            .map(([emotion, count], i) => ({ emotion, percentage: Math.round((count/total)*100), color: palette[i % palette.length] }));
        cb(trend, top);
    });
};

// Challenges: dynamic definitions under root collection "challenges"
export const subscribeToActiveChallenges = (
    cb: (defs: { daily?: ChallengeDefinition; weekly?: ChallengeDefinition }) => void
) => {
    let current: { daily?: ChallengeDefinition; weekly?: ChallengeDefinition } = {};
    const unsubscribes: (() => void)[] = [];
    const dailyUnsub = onSnapshot(doc(db, 'challenges', 'daily'), (snap) => {
        if (snap.exists()) {
            current = { ...current, daily: { id: 'daily', ...(snap.data() as any) } };
            cb(current);
        }
    });
    const weeklyUnsub = onSnapshot(doc(db, 'challenges', 'weekly'), (snap) => {
        if (snap.exists()) {
            current = { ...current, weekly: { id: 'weekly', ...(snap.data() as any) } };
            cb(current);
        }
    });
    unsubscribes.push(dailyUnsub, weeklyUnsub);
    return () => unsubscribes.forEach((u) => u());
};

// Atomic daily challenge completion (awards 50 points)
export const completeDailyChallenge = async (uid: string, pointsPerChallenge = 50) => {
    const statsRef = statsRefFor(uid);
    const today = todayKey();
    const dailyRef = doc(dailyCompletionsColFor(uid), today);
    const leaderboardRef = leaderboardDocFor(uid);

    return runTransaction(db, async (tx) => {
        const [statsSnap, dailySnap] = await Promise.all([tx.get(statsRef), tx.get(dailyRef)]);
        let stats = statsSnap.exists() ? (statsSnap.data() as UserStats) : defaultStats();

        // If already completed today, do nothing
        if (dailySnap.exists()) {
            return stats;
        }

        // Handle weekly rollover
        const currentWeek = startOfWeekMondayKey();
        if (stats.weeklyStartDate !== currentWeek) {
            stats.weeklyStartDate = currentWeek;
            stats.weeklyCompletedDates = [];
        }

        // Compute streak
        let newStreak = 1;
        if (stats.lastCompletionDate) {
            const gap = diffDays(today, stats.lastCompletionDate);
            if (gap === 1) newStreak = (stats.currentStreak || 0) + 1;
            else if (gap === 0) newStreak = stats.currentStreak || 1; // defensive
            else newStreak = 1; // streak broken
        }

        const updated: UserStats = {
            ...stats,
            points: (stats.points || 0) + pointsPerChallenge,
            currentStreak: newStreak,
            longestStreak: Math.max(stats.longestStreak || 0, newStreak),
            challengesCompleted: (stats.challengesCompleted || 0) + 1,
            lastCompletionDate: today,
            lastDailyCompletionDate: today,
            weeklyStartDate: currentWeek,
            weeklyGoalDays: stats.weeklyGoalDays || DEFAULT_WEEKLY_GOAL,
            weeklyCompletedDates: Array.from(new Set([...(stats.weeklyCompletedDates || []), today]))
        };

        tx.set(statsRef, updated);
        tx.set(dailyRef, { completed: true, createdAt: Date.now() });
        tx.set(leaderboardRef, { uid, displayName: auth.currentUser?.displayName || null, points: updated.points } as LeaderboardEntry, { merge: true });
        return updated;
    });
};

// Weekly challenge: track a day; award once per week when reaching goal
export const completeWeeklyDay = async (uid: string, goalDays?: number, pointsPerChallenge = 50) => {
    const statsRef = statsRefFor(uid);
    const weekStart = startOfWeekMondayKey();
    const awardRef = doc(weeklyAwardsColFor(uid), weekStart);
    const leaderboardRef = leaderboardDocFor(uid);
    const today = todayKey();

    return runTransaction(db, async (tx) => {
        const [statsSnap, awardSnap] = await Promise.all([tx.get(statsRef), tx.get(awardRef)]);
        let stats = statsSnap.exists() ? (statsSnap.data() as UserStats) : defaultStats(goalDays);

        // Weekly rollover
        if (stats.weeklyStartDate !== weekStart) {
            stats.weeklyStartDate = weekStart;
            stats.weeklyCompletedDates = [];
            if (typeof goalDays === 'number') stats.weeklyGoalDays = goalDays;
        }

        const before = new Set(stats.weeklyCompletedDates || []);
        before.add(today);
        const newDates = Array.from(before).sort();
        const updated: UserStats = { ...stats, weeklyCompletedDates: newDates, weeklyStartDate: weekStart, weeklyGoalDays: goalDays || stats.weeklyGoalDays || DEFAULT_WEEKLY_GOAL };

        let points = updated.points || 0;
        let challengesCompleted = updated.challengesCompleted || 0;

        const goal = updated.weeklyGoalDays || DEFAULT_WEEKLY_GOAL;
        const reached = newDates.length >= goal;
        const alreadyAwarded = awardSnap.exists();
        if (reached && !alreadyAwarded) {
            points += pointsPerChallenge;
            challengesCompleted += 1;
            tx.set(awardRef, { awardedAt: Date.now(), weekStart });
        }

        updated.points = points;
        updated.challengesCompleted = challengesCompleted;

        tx.set(statsRef, updated);
        tx.set(leaderboardRef, { uid, displayName: auth.currentUser?.displayName || null, points: updated.points } as LeaderboardEntry, { merge: true });
        return updated;
    });
};

// Live leaderboard (top N)
export const subscribeToLeaderboard = (topN: number, cb: (entries: LeaderboardEntry[]) => void) => {
    const q = query(collection(db, 'leaderboard'), orderBy('points', 'desc'), limit(topN));
    return onSnapshot(q, (snap) => {
        const entries = snap.docs.map(d => ({ uid: d.id, ...(d.data() as any) })) as LeaderboardEntry[];
        cb(entries);
    });
};
