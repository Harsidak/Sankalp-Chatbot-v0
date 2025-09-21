import React, { useState, useEffect } from 'react';
import type { UserSelections, ChatSession, ChatMessage, Theme, AppView, AuthUser, DashboardAnalytics, WellnessPlan } from './types';
import { MessageAuthor } from './types';
import LandingPage from './components/LandingPage';
import ChatView from './components/ChatView';
import DashboardPage from './components/DashboardPage';
import EmergencyModal from './components/EmergencyModal';
import AuthPage from './components/AuthPage';
import { generateInitialMessage, generateChatTitle } from './services/geminiService';
import { 
    onAuthStateChangedListener, 
    signOutUser,
    getChatSessions, 
    saveChatSession, 
    deleteChatSession, 
    clearAllChatHistory,
    getDashboardData,
    saveDashboardData,
    subscribeToDashboardData,
    getUserProfile,
    saveUserProfile,
    linkAnonymousAccountWithGoogle,
    recordDailyEmotion,
    subscribeToUserStats,
    subscribeToWeeklyEmotionSummary,
    subscribeToActiveChallenges,
    subscribeToLeaderboard,
    completeDailyChallenge,
    completeWeeklyDay
} from './services/firebaseService';
import { NotificationProvider } from './contexts/notificationContext';
import { useNotification } from './hooks/useNotification';
import NotificationContainer from './components/NotificationContainer';

const AppContent: React.FC = () => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  
  const [dashboardData, setDashboardData] = useState<{ wellnessPlan: WellnessPlan, analyticsData: DashboardAnalytics } | null>(null);
  const [liveStats, setLiveStats] = useState<any | null>(null);
  const [liveTrend, setLiveTrend] = useState<{ day: string; moodScore: number }[] | null>(null);
  const [liveBreakdown, setLiveBreakdown] = useState<{ emotion: string; percentage: number; color: string }[] | null>(null);
  const [activeChallenges, setActiveChallenges] = useState<{ daily?: any; weekly?: any }>({});
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const [theme, setTheme] = useState<Theme>('dark');
  const [language, setLanguage] = useState<string>('en');
  
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);

  const { addNotification } = useNotification();

  useEffect(() => {
    const unsubscribe = onAuthStateChangedListener((user) => {
      setAuthUser(user);
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (authUser) {
        const fetchUserData = async () => {
            const userSessions = await getChatSessions(authUser.uid);
            setSessions(userSessions.sort((a, b) => b.timestamp - a.timestamp));
            
            const userDashboardData = await getDashboardData(authUser.uid);
            if (userDashboardData) {
              setDashboardData(userDashboardData);
            }

            const userProfile = await getUserProfile(authUser.uid);
            if(userProfile) {
                setTheme(userProfile.theme || 'dark');
                setLanguage(userProfile.language || 'en');
            }
        };
        fetchUserData();

        // Live subscriptions
        const unsubscribers: (() => void)[] = [];
        subscribeToUserStats(authUser.uid, (s) => setLiveStats(s)).then(unsub => unsubscribers.push(unsub));
        const unsubTrend = subscribeToWeeklyEmotionSummary(authUser.uid, (trend, breakdown) => { setLiveTrend(trend); setLiveBreakdown(breakdown); });
        unsubscribers.push(unsubTrend);
        const unsubChallenges = subscribeToActiveChallenges((defs) => setActiveChallenges(defs));
        unsubscribers.push(unsubChallenges);
        const unsubLb = subscribeToLeaderboard(10, (entries) => setLeaderboard(entries));
        unsubscribers.push(unsubLb);
        const unsubDash = subscribeToDashboardData(authUser.uid, (d) => setDashboardData(d));
        unsubscribers.push(unsubDash);

        return () => { unsubscribers.forEach(u => u && u()); };
    } else {
        // Reset state when user logs out
        setSessions([]);
        setActiveSessionId(null);
        setCurrentView('landing');
        setDashboardData(null);
        setLiveStats(null);
        setLiveTrend(null);
        setLiveBreakdown(null);
        setActiveChallenges({});
        setLeaderboard([]);
    }
  }, [authUser]);


  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
    }
    if(authUser) {
      saveUserProfile(authUser.uid, { theme, language });
    }
  }, [theme, authUser, language]);

  useEffect(() => {
    if(authUser) {
       saveUserProfile(authUser.uid, { theme, language });
    }
  }, [language, authUser, theme]);
  
  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      document.documentElement.style.setProperty('--mouse-x', `${(clientX / innerWidth) * 100}%`);
      document.documentElement.style.setProperty('--mouse-y', `${(clientY / innerHeight) * 100}%`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleStartNewChat = async (selections: UserSelections) => {
    if (!authUser) {
      addNotification('Please sign in to start a conversation.', 'error');
      setCurrentView('landing');
      return;
    }
    try {
      const initialAiMessageText = await generateInitialMessage(selections);
      const initialAiMessage: ChatMessage = { author: MessageAuthor.AI, text: initialAiMessageText };
      const tempSession: ChatSession = { id: '', timestamp: Date.now(), title: '', selections, messages: [initialAiMessage] };
      const title = await generateChatTitle(tempSession);

      const newSession: ChatSession = { ...tempSession, id: Date.now().toString(), title: title || 'New Conversation' };

      // Optimistic navigation so the chat starts even if save fails
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(newSession.id);
      setCurrentView('chat');

      // Fire-and-forget: record today’s emotions for analytics (offline safe)
      recordDailyEmotion(authUser.uid, selections.emotions, selections.intensity).catch(() => {/* retry on next start */});

      // Persist in background
      saveChatSession(authUser.uid, newSession).catch((e) => {
        console.error('Failed to save new session:', e);
        addNotification('Started chat locally. Sync will retry later.', 'error');
      });
    } catch (error) {
      console.error('Failed to start a new chat session:', error);
      addNotification('Could not start a new conversation. Please try again.', 'error');
    }
  };
  
  const handleLoadChat = (sessionId: string) => {
    setActiveSessionId(sessionId);
    setCurrentView('chat');
  };
  
  const handleDeleteChat = async (sessionId: string) => {
    if (!authUser) return;
    if(!window.confirm('Are you sure you want to delete this chat history?')) return;

    // Optimistic UI update
    const previousSessions = sessions;
    const wasActive = activeSessionId === sessionId;
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (wasActive) {
        setActiveSessionId(null);
        setCurrentView('landing');
    }

    try {
        await deleteChatSession(authUser.uid, sessionId);
        addNotification('Chat successfully deleted.', 'success');
    } catch (err) {
        console.error('Failed to delete chat session:', err);
        // Revert UI on failure
        setSessions(previousSessions);
        if (wasActive) {
            setActiveSessionId(sessionId);
            setCurrentView('chat');
        }
        addNotification('Could not delete chat. Please try again.', 'error');
    }
  };
  
  const handleClearAllHistory = async () => {
    if (!authUser) return;
    if (window.confirm('Are you sure you want to permanently delete all chat history? This action cannot be undone.')) {
        await clearAllChatHistory(authUser.uid);
        setSessions([]);
        setActiveSessionId(null);
        setCurrentView('landing');
        addNotification('Chat history cleared.', 'success');
    }
  };

  const handleUpdateSession = async (updatedSession: ChatSession) => {
    if (!authUser) return;
    await saveChatSession(authUser.uid, updatedSession);
    setSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };
  
  const handleGoBack = () => {
    setActiveSessionId(null);
    setCurrentView('landing');
  };

  const handleShowDashboard = () => setCurrentView('dashboard');
  const handleShowLanding = () => setCurrentView('landing');

  const handleSignOut = async () => {
    await signOutUser();
    addNotification('You have been signed out.', 'success');
  };
  
  const handleLinkAccount = async () => {
    try {
        await linkAnonymousAccountWithGoogle();
        addNotification('Account successfully linked!', 'success');
    } catch (error) {
        console.error("Error linking account:", error);
        addNotification(`Could not link account: ${(error as Error).message}`, 'error');
    }
  };

  if (isAuthLoading) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-white/50 border-t-purple-500 rounded-full animate-spin"></div>
        </div>
    );
  }

  if (!authUser) {
    return <AuthPage />;
  }
  
  const activeSession = sessions.find(s => s.id === activeSessionId);

  const renderContent = () => {
    switch (currentView) {
      case 'chat':
        if (activeSession) {
          return (
            <ChatView 
              key={activeSession.id}
              session={activeSession}
              onUpdateSession={handleUpdateSession}
              onGoBack={handleGoBack}
              onShowDashboard={handleShowDashboard}
              theme={theme}
              onToggleTheme={handleToggleTheme}
              onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
              language={language}
              onLanguageChange={setLanguage}
              user={authUser}
              onSignOut={handleSignOut}
            />
          );
        }
        setCurrentView('landing');
        return null;
      
      case 'dashboard':
        return (
          <DashboardPage 
            onGoBack={handleShowLanding}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            language={language}
            user={authUser}
            initialData={dashboardData}
            onSaveData={(data) => {
                saveDashboardData(authUser.uid, data);
                setDashboardData(data);
            }}
            liveStats={liveStats}
            liveTrend={liveTrend}
            liveBreakdown={liveBreakdown}
            challenges={activeChallenges}
            leaderboard={leaderboard}
            onCompleteDaily={async () => {
                try {
                    await completeDailyChallenge(authUser.uid);
                    addNotification('Daily challenge completed! +50 points', 'success');
                } catch (err) {
                    addNotification('Could not complete daily challenge. Will retry when online.', 'error');
                }
            }}
            onTrackWeeklyDay={async () => {
                try {
                    await completeWeeklyDay(authUser.uid);
                    addNotification('Tracked a day for weekly challenge!', 'success');
                } catch (err) {
                    addNotification('Could not track today. Will retry when online.', 'error');
                }
            }}
          />
        );
        
      case 'landing':
      default:
        return (
          <LandingPage 
            onStartChat={handleStartNewChat} 
            sessions={sessions}
            onLoadChat={handleLoadChat}
            onDeleteChat={handleDeleteChat}
            onClearAllHistory={handleClearAllHistory}
            onShowDashboard={handleShowDashboard}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            addNotification={addNotification}
            language={language}
            onLanguageChange={setLanguage}
            onOpenEmergencyModal={() => setIsEmergencyModalOpen(true)}
            user={authUser}
            onSignOut={handleSignOut}
            onLinkAccount={handleLinkAccount}
          />
        );
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-sans text-primary">
      <main className="w-full max-w-2xl lg:max-w-4xl mx-auto transition-all duration-500">
        {renderContent()}
      </main>
      <footer className="w-full text-center p-4 mt-8">
        <p className="text-xs text-secondary max-w-md mx-auto">
          Disclaimer: Sankalp is an AI assistant and not a substitute for professional medical advice. If you are in crisis, please contact a local emergency service.
        </p>
      </footer>
      <EmergencyModal 
        isOpen={isEmergencyModalOpen}
        onClose={() => setIsEmergencyModalOpen(false)}
      />
    </div>
  );
};

const App: React.FC = () => (
  <NotificationProvider>
    <NotificationContainer />
    <AppContent />
  </NotificationProvider>
);

export default App;