import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { UserSelections, ChatSession, Theme, AuthUser } from '../types';
import type { NotificationType } from '../contexts/notificationContext';
import { AGE_GROUPS, LANGUAGES, TRANSLATIONS, EMOTION_CATEGORIES } from '../constants';
import ThemeToggle from './ThemeToggle';

const HamburgerIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6 text-primary' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
    </svg>
);

const UserIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6 text-primary' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
);

const QuestionMarkIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
  </svg>
);

const LanguageIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
      <path d="M7.75 2.75a.75.75 0 0 0-1.5 0v1.258a32.987 32.987 0 0 0-3.599.278.75.75 0 1 0 .238 1.485 31.492 31.492 0 0 1 3.361-.254v1.085a.75.75 0 0 0 1.5 0V4.282a31.493 31.493 0 0 1 3.361.254.75.75 0 1 0 .238-1.485A32.987 32.987 0 0 0 7.75 4.008V2.75Z" />
      <path fillRule="evenodd" d="M4.5 6.75A.75.75 0 0 1 5.25 6h9.5a.75.75 0 0 1 .75.75v9a.75.75 0 0 1-.75.75h-9.5a.75.75 0 0 1-.75-.75v-9ZM5.504 15h8.992V7.005H5.504V15ZM6.5 8.25a.75.75 0 0 1 .75-.75h2a.75.75 0 0 1 .75.75v.75a.75.75 0 0 1-1.5 0v-.25H7.75a.25.25 0 0 0-.25.25V10.5a.75.75 0 0 1-1.5 0v-2.25Z" clipRule="evenodd" />
    </svg>
);

const ThemeIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M10 3.75a2 2 0 1 0-4 0 2 2 0 0 0 4 0Z" />
        <path fillRule="evenodd" d="M10.5 7.19A3.25 3.25 0 0 0 5.75 6.5a.75.75 0 0 0 0 1.5c.966 0 1.84.425 2.451 1.114a.75.75 0 0 0 1.259-.824A3.238 3.238 0 0 0 10.5 7.19ZM5 11.25a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M12.559 8.353a.75.75 0 0 1 .758.064 3.25 3.25 0 0 0 4.933 1.246.75.75 0 1 1-.788 1.285 1.75 1.75 0 0 1-2.656-.67l-.147-.294a.75.75 0 0 1 .064-.758l.147-.294Zm-3.15-.366a.75.75 0 0 0 .524-1.365 3.25 3.25 0 0 1-.365-4.83.75.75 0 0 0-1.23-.846A4.75 4.75 0 0 0 7.7 8.36l-.147.293a.75.75 0 0 0 .524 1.366l.147-.293Z" clipRule="evenodd" />
    </svg>
);

const HistorySidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onLoadChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onNewChat: () => void;
  onClearAllHistory: () => void;
}> = ({ isOpen, onClose, sessions, onLoadChat, onDeleteChat, onNewChat, onClearAllHistory }) => {
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent loading the chat
    onDeleteChat(id);
  };

  const handleClear = () => {
    onClearAllHistory();
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      <div className={`history-sidebar fixed top-0 left-0 h-full z-50 glass-panel p-6 flex flex-col gap-4 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <h2 className="text-2xl font-bold text-primary">Chat History</h2>
        <button
          onClick={onNewChat}
          className="w-full text-white font-bold py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500/50 to-cyan-500/50 border border-divider backdrop-filter backdrop-blur-md hover:from-teal-500/70 hover:to-cyan-500/70 transition-all"
        >
          + New Chat
        </button>
        <div className="flex-1 overflow-y-auto space-y-3 pr-2 -mr-2">
            {sessions.length > 0 ? (
                sessions.map(session => (
                    <div 
                        key={session.id}
                        onClick={() => onLoadChat(session.id)}
                        className="p-3 rounded-lg bg-interactive border border-divider hover:bg-interactive-hover cursor-pointer transition-all group flex justify-between items-center"
                    >
                        <div className="overflow-hidden">
                            <p className="font-semibold text-primary truncate">{session.title}</p>
                            <p className="text-xs text-secondary">{new Date(session.timestamp).toLocaleString()}</p>
                        </div>
                        <button onClick={(e) => handleDelete(e, session.id)} className="flex-shrink-0 p-2 ml-2 rounded-full text-secondary opacity-0 group-hover:opacity-100 hover:bg-red-500/30 hover:text-white transition-all">
                            <TrashIcon />
                        </button>
                    </div>
                ))
            ) : (
                <p className="text-center text-secondary pt-8">No past conversations.</p>
            )}
        </div>
        {sessions.length > 0 && (
          <div className="pt-2 border-t border-divider mt-auto">
            <button
              onClick={handleClear}
              className="w-full flex items-center justify-center gap-2 text-red-400 font-semibold py-2 px-4 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 hover:text-red-300 transition-all"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Clear All History</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
};

interface LandingPageProps {
  onStartChat: (selections: UserSelections) => Promise<void>;
  sessions: ChatSession[];
  onLoadChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClearAllHistory: () => void;
  onShowDashboard: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  addNotification: (message: string, type?: NotificationType) => void;
  language: string;
  onLanguageChange: (language: string) => void;
  onOpenEmergencyModal: () => void;
  user: AuthUser;
  onSignOut: () => void;
  onLinkAccount: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({
  onStartChat,
  sessions,
  onLoadChat,
  onDeleteChat,
  onClearAllHistory,
  onShowDashboard,
  theme,
  onToggleTheme,
  addNotification,
  language,
  onLanguageChange,
  onOpenEmergencyModal,
  user,
  onSignOut,
  onLinkAccount
}) => {
  const [selections, setSelections] = useState<Omit<UserSelections, 'language'>>({
    ageGroup: '',
    emotions: [],
    intensity: 5,
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  
  const [openAccordion, setOpenAccordion] = useState<string | null>('uplifting');

  const t = useMemo(() => TRANSLATIONS[language] || TRANSLATIONS['en'], [language]);

  const welcomeString = t.welcome || 'Welcome to {appName}';
  const appNameString = t.appName || 'Sankalp';
  const welcomeParts = welcomeString.split('{appName}');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAgeSelect = (age: string) => {
    setSelections(prev => ({ ...prev, ageGroup: age }));
  };

  const handleEmotionToggle = (emotionKey: string) => {
    setSelections(prev => ({
      ...prev,
      emotions: prev.emotions.includes(emotionKey)
        ? prev.emotions.filter(e => e !== emotionKey)
        : [...prev.emotions, emotionKey],
    }));
  };
  
  const handleIntensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSelections(prev => ({...prev, intensity: parseInt(e.target.value, 10)}));
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(e.target.value);
    setSelections(prev => ({ ...prev, emotions: [] })); // Reset emotions on language change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStartDisabled) return;
    setIsStartingChat(true);
    try {
      await onStartChat({ ...selections, language });
      // On success, this component will unmount when view switches to chat
    } catch (err) {
      addNotification('Could not start a new conversation. Please try again.', 'error');
    } finally {
      // If navigation did not happen (e.g., error), re-enable the button
      setIsStartingChat(false);
    }
  };
  
  const handleNewChat = () => {
      setIsSidebarOpen(false);
  };
  
  const handleDashboardClick = () => {
    onShowDashboard();
    setIsAccountMenuOpen(false);
  };

  const intensityLabels: { [key: number]: string } = {
    1: '😥', 2: '😔', 3: '😕', 4: '😐', 5: '🙂',
    6: '😀', 7: '😄', 8: '😁', 9: '😆', 10: '🤩'
  };

  const isStartDisabled = !selections.ageGroup || selections.emotions.length === 0 || isStartingChat;
  
  const intensityPercentage = (selections.intensity - 1) * 100 / 9;

  return (
    <>
      <HistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={sessions}
        onLoadChat={(id) => {
            onLoadChat(id);
            setIsSidebarOpen(false);
        }}
        onDeleteChat={onDeleteChat}
        onNewChat={handleNewChat}
        onClearAllHistory={onClearAllHistory}
      />
      <div className="w-full flex flex-col gap-6 animate-fade-in">
        <header className="flex items-center w-full">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 rounded-full bg-interactive hover:bg-interactive-hover transition-colors" aria-label="Open chat history">
                <HamburgerIcon />
            </button>
            <div className="flex-1"></div> {/* Spacer */}
            <div className="flex items-center gap-2">
                <button onClick={onOpenEmergencyModal} className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors animate-pulse-emergency" aria-label="Emergency">
                    <i className="fa-solid fa-life-ring text-xl"></i>
                </button>
                <div className="relative" ref={accountMenuRef}>
                    <button onClick={() => setIsAccountMenuOpen(prev => !prev)} className="p-2 rounded-full bg-interactive hover:bg-interactive-hover transition-colors" aria-label="Account Menu">
                        <UserIcon />
                    </button>
                    {isAccountMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-64 glass-panel rounded-xl shadow-lg p-2 z-20 animate-fade-in">
                            <div className="px-3 py-2 border-b border-divider">
                                <p className="text-sm font-semibold text-primary truncate" title={user.email || 'Anonymous User'}>
                                    {user.displayName || user.email || 'Anonymous User'}
                                </p>
                                {user.isAnonymous && <p className="text-xs text-secondary">Guest Account</p>}
                            </div>
                            
                            {user.isAnonymous && (
                                <button onClick={onLinkAccount} className="w-full text-left px-3 py-2 text-sm text-primary rounded-md hover:bg-interactive-hover transition-colors flex items-center gap-3">
                                    <i className="fa-solid fa-link w-5 text-center text-secondary"></i>
                                    <span>Link to Google Account</span>
                                </button>
                            )}
                            
                            <button onClick={handleDashboardClick} className="w-full text-left px-3 py-2 text-sm text-primary rounded-md hover:bg-interactive-hover transition-colors flex items-center gap-3">
                                <i className="fa-solid fa-chart-pie w-5 text-center text-secondary"></i>
                                <span>Dashboard</span>
                            </button>

                            <button onClick={onSignOut} className="w-full text-left px-3 py-2 text-sm text-primary rounded-md hover:bg-interactive-hover transition-colors flex items-center gap-3">
                                <i className="fa-solid fa-right-from-bracket w-5 text-center text-secondary"></i>
                                <span>Log Out</span>
                            </button>

                            <div className="border-t border-divider my-1"></div>

                            <div className="px-3 py-2 flex justify-between items-center text-sm">
                                <div className="flex items-center gap-3">
                                    <LanguageIcon className="w-5 h-5 text-secondary" />
                                    <span className="text-secondary">Language</span>
                                </div>
                                <select 
                                    value={language} 
                                    onChange={handleLanguageChange}
                                    className="bg-interactive border border-divider rounded-md px-2 py-1 text-xs text-primary focus:outline-none focus:ring-1 ring-inset focus:ring-purple-400"
                                    aria-label="Select language"
                                >
                                    {LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="px-3 py-2 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <ThemeIcon className="w-5 h-5 text-secondary" />
                                    <span className="text-sm text-secondary">Theme</span>
                                </div>
                                <ThemeToggle theme={theme} onToggle={onToggleTheme} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>

        <div className="glass-panel interactive-glare p-8 flex flex-col items-center text-center gap-6 relative">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            {welcomeParts[0]}
            <span className="bg-gradient-to-r from-purple-400 via-fuchsia-500 to-pink-500 bg-clip-text text-transparent">
              {appNameString}
            </span>
            {welcomeParts[1]}
          </h1>
          <p className="text-secondary max-w-sm">{t.description}</p>
          
          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-8 text-left animate-fade-in-up pt-4 border-t border-divider">
            
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <label className="block text-lg font-semibold text-primary">{t.ageLabel}</label>
                    <div className="relative group flex items-center">
                        <QuestionMarkIcon className="w-5 h-5 text-secondary cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 glass-panel text-xs text-secondary rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                            {t.ageExplainer}
                        </div>
                    </div>
                </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {AGE_GROUPS.map(age => (
                  <button type="button" key={age} onClick={() => handleAgeSelect(age)} className={`age-button px-5 py-2.5 rounded-lg font-medium w-28 ${selections.ageGroup === age ? 'selected' : ''}`}>
                    {age}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-lg font-semibold mb-3 text-primary">{t.emotionLabel}</label>
              <div className="space-y-2">
                {Object.entries(EMOTION_CATEGORIES).map(([key, category]) => (
                  <div key={key} className="border border-divider rounded-lg overflow-hidden">
                     <button
                        type="button"
                        onClick={() => setOpenAccordion(openAccordion === key ? null : key)}
                        className="w-full flex justify-between items-center p-3 bg-interactive hover:bg-interactive-hover font-semibold text-secondary"
                      >
                       <span>{t[category.titleKey]}</span>
                       <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${openAccordion === key ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                     </button>
                     {openAccordion === key && (
                       <div className="p-3 bg-black/10">
                         <div className="flex flex-wrap gap-2">
                          {category.emotions.map(emotionKey => (
                             <button type="button" key={emotionKey} onClick={() => handleEmotionToggle(emotionKey)} className={`emotion-tag px-3 py-1.5 text-sm rounded-full ${selections.emotions.includes(emotionKey) ? 'selected' : ''}`}>
                               {t.emotions[emotionKey]}
                             </button>
                          ))}
                         </div>
                       </div>
                     )}
                  </div>
                ))}
              </div>
            </div>

            <div>
                <label htmlFor="intensity" className="block text-lg font-semibold mb-3 text-primary">{t.intensityLabel}</label>
                <div className="relative">
                  <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-150" style={{ left: `calc(${intensityPercentage}% - 12px)`}}>
                     <span className="text-2xl">{intensityLabels[selections.intensity] || '🙂'}</span>
                  </div>
                  <input
                      type="range"
                      id="intensity"
                      min="1"
                      max="10"
                      value={selections.intensity}
                      onChange={handleIntensityChange}
                      className="w-full h-2 bg-interactive rounded-lg appearance-none cursor-pointer"
                  />
                </div>
            </div>

            <button type="submit" disabled={isStartDisabled} className="start-button w-full text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-purple-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 flex items-center justify-center gap-2">
              {isStartingChat && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {isStartingChat ? 'Starting...' : t.startButton}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default LandingPage;