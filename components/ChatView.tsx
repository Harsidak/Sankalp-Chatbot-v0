import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, ChatSession, Theme, AuthUser } from '../types';
import { MessageAuthor } from '../types';
import { createChat } from '../services/geminiService';
import { TRANSLATIONS, LANGUAGES } from '../constants';
import type { Chat } from '@google/genai';
import ThemeToggle from './ThemeToggle';
import { useNotification } from '../hooks/useNotification';

// FIX: Added complete TypeScript definitions for the Web Speech API to resolve errors.
// Extend the Window interface for SpeechRecognition APIs
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }

  const SpeechRecognition: {
    prototype: SpeechRecognition;
    new (): SpeechRecognition;
  };

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    // FIX: Added missing abort() method definition to fix TypeScript error in AiCallView.tsx.
    abort(): void;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onerror: (
      (this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any
    ) | null;
    onresult: (
      (this: SpeechRecognition, ev: SpeechRecognitionEvent) => any
    ) | null;
  }

  interface SpeechRecognitionEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionErrorEvent extends Event {
    readonly error: string;
    readonly message: string;
  }
}

interface ChatViewProps {
  session: ChatSession;
  onUpdateSession: (session: ChatSession) => void;
  onGoBack: () => void;
  onShowDashboard: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenEmergencyModal: () => void;
  language: string;
  onLanguageChange: (language: string) => void;
  user: AuthUser;
  onSignOut: () => void;
}

const UserIcon: React.FC<{ className?: string }> = ({ className = 'w-6 h-6 text-primary' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
    </svg>
);

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
  </svg>
);

const AiAvatar: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-[0_4px_14px_rgba(168,85,247,0.3)] flex-shrink-0 ring-1 ring-white/30">
        <SparklesIcon className="h-5 w-5 text-white" />
    </div>
);

const UserAvatar: React.FC = () => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0 ring-1 ring-white/30">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/90" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
    </div>
);

const AiTypingIndicator: React.FC = () => (
    <div className="flex items-end gap-3 justify-start animate-fade-in-up">
        <AiAvatar />
        <div className="ai-bubble p-4 rounded-2xl shadow-md rounded-bl-none">
            <div className="flex items-center justify-start gap-1.5">
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
                <span className="typing-dot"></span>
            </div>
        </div>
    </div>
);

const SendIcon: React.FC<{className: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
);

const MicrophoneIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
    <path d="M6 10.5a.75.75 0 0 1 .75.75v.75a4.5 4.5 0 0 0 9 0v-.75a.75.75 0 0 1 1.5 0v.75a6 6 0 1 1-12 0v-.75a.75.75 0 0 1 .75-.75Z" />
  </svg>
);

const BackIcon: React.FC<{className: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
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

const ChatView: React.FC<ChatViewProps> = ({ session, onUpdateSession, onGoBack, onShowDashboard, theme, onToggleTheme, onOpenEmergencyModal, language, onLanguageChange, user, onSignOut }) => {
  const { selections, messages } = session;
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>(messages);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { addNotification } = useNotification();
  
  const t = TRANSLATIONS[selections.language] || TRANSLATIONS['en'];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);
  
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

  useEffect(() => {
    try {
      chatRef.current = createChat(selections.language, messages);
    } catch (e) {
      console.error('Failed to initialize chat client:', e);
      addNotification('AI service is not configured. Please set VITE_GEMINI_API_KEY and reload.', 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);


  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selections.language;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');
        setUserInput(transcript);
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error(`Speech recognition error - Code: ${event.error}, Message: ${event.message}`);
        let userMessage: string;

        switch (event.error) {
            case 'not-allowed':
            case 'service-not-allowed':
                userMessage = "Microphone access denied. Please enable it in your browser settings to use this feature.";
                break;
            case 'no-speech':
                userMessage = "No speech was detected. Please make sure your microphone is working and try again.";
                break;
            case 'network':
                userMessage = "A network error occurred during speech recognition. Please check your connection.";
                break;
            case 'aborted':
                console.log('Speech recognition was aborted.');
                return;
            default:
                userMessage = event.message || "An unknown speech recognition error occurred. Please try again.";
                break;
        }
        addNotification(userMessage, 'error');
        setIsRecording(false);
      };

      recognition.onend = () => {
         setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selections.language, addNotification]);

  const handleToggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setUserInput('');
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error("Error starting speech recognition:", e);
        let errorMessage = "Could not start microphone. It might be in use by another application.";
        if (e instanceof Error && e.message) {
            errorMessage = `Could not start microphone: ${e.message}`;
        }
        addNotification(errorMessage, 'error');
        setIsRecording(false);
      }
    }
  };
  
  const handleDashboardClick = () => {
    onShowDashboard();
    setIsAccountMenuOpen(false);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !chatRef.current || isLoading) return;

    if (isRecording) {
        recognitionRef.current?.stop();
        setIsRecording(false);
    }

    const userMessage: ChatMessage = { author: MessageAuthor.USER, text: userInput };
    const newMessages = [...currentMessages, userMessage];
    setCurrentMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    try {
      const stream = await chatRef.current.sendMessageStream({ message: userMessage.text });
      
      let aiResponseText = '';
      setCurrentMessages((prev) => [...prev, { author: MessageAuthor.AI, text: '' }]);

      for await (const chunk of stream) {
        aiResponseText += chunk.text;
        setCurrentMessages((prev) => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { ...newMsgs[newMsgs.length - 1], text: aiResponseText };
          return newMsgs;
        });
      }
      onUpdateSession({ ...session, messages: [...newMessages, {author: MessageAuthor.AI, text: aiResponseText}]});

    } catch (error) {
      console.error('Error sending message:', error);
      addNotification('Failed to get a response. Please check your connection.', 'error');
      const errorMsg = {
          author: MessageAuthor.AI,
          text: 'Oops, something went wrong. Could you please try rephrasing that?',
      };
      setCurrentMessages((prev) => [...prev, errorMsg]);
       onUpdateSession({ ...session, messages: [...newMessages, errorMsg]});
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onLanguageChange(e.target.value);
  };

  return (
    <div className="h-[80vh] w-full flex flex-col glass-panel interactive-glare">
      <header className="absolute top-0 left-0 right-0 p-4 z-10 flex items-center">
        <button onClick={onGoBack} className="p-2 rounded-full bg-interactive hover:bg-interactive-hover transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400" aria-label="Go back">
            <BackIcon className="w-6 h-6 text-primary" />
        </button>
         <div className="flex-1"></div> {/* Spacer */}
         <div className="flex items-center gap-2">
            <button onClick={onOpenEmergencyModal} className="w-9 h-9 flex items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors animate-pulse-emergency" aria-label="Emergency">
                <i className="fa-solid fa-life-ring text-xl"></i>
            </button>
            <div className="relative" ref={accountMenuRef}>
                <button onClick={() => setIsAccountMenuOpen(prev => !prev)} className="p-2 rounded-full bg-interactive hover:bg-interactive-hover transition-colors" aria-label="Account Menu">
                    <UserIcon className="w-6 h-6 text-primary" />
                </button>
                {isAccountMenuOpen && (
                    <div className="absolute top-full right-0 mt-2 w-56 glass-panel rounded-xl shadow-lg p-2 z-20 animate-fade-in">
                        <div className="px-3 py-2 border-b border-divider">
                            <p className="text-sm font-semibold text-primary truncate" title={user.email || 'Anonymous User'}>{user.displayName || user.email || 'Anonymous User'}</p>
                        </div>
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
      <div className="flex-1 p-6 overflow-y-auto space-y-4 pt-20">
        {currentMessages.map((msg, index) => {
          const isUser = msg.author === MessageAuthor.USER;

          const bubbleClasses = [
            'message-bubble', 'max-w-md', 'p-4', 'rounded-2xl',
            isUser ? 'user-bubble rounded-br-none' : 'ai-bubble rounded-bl-none',
            theme === 'dark' ? 'shadow-md' : '', // Apply a standard shadow in dark mode for a cleaner look. Light mode shadow is handled by CSS.
            !isUser && theme === 'dark' ? 'backdrop-filter backdrop-blur-xl' : '' // Glassmorphism for AI bubble in dark mode
          ].filter(Boolean).join(' ');

          return (
            <div
              key={index}
              className={`flex items-end gap-3 animate-fade-in-up ${
                isUser ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.author === MessageAuthor.AI && <AiAvatar />}
              <div
                className={bubbleClasses}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              </div>
              {msg.author === MessageAuthor.USER && <UserAvatar />}
            </div>
          );
        })}
        {isLoading && (
          <AiTypingIndicator />
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-divider">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={t.chatPlaceholder}
            className="chat-input flex-1 p-3 rounded-xl focus:ring-2 focus:outline-none transition-all text-primary"
            disabled={isLoading}
          />
          {isSpeechSupported && (
             <button
                type="button"
                onClick={handleToggleRecording}
                className={`p-3 rounded-xl text-primary transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-purple-400 border border-divider ${
                isRecording ? 'bg-red-500/80 animate-pulse' : 'bg-interactive hover:bg-interactive-hover'
                }`}
             >
                <MicrophoneIcon className="w-6 h-6" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !userInput.trim()}
            className="bg-accent-color rounded-xl p-3 text-white disabled:opacity-50 transition-all duration-200 hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black/50 focus:ring-purple-400"
          >
            <SendIcon className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatView;