import React, { useState, useEffect, useRef } from 'react';
import { speakText, stopSpeaking } from '../services/elevenLabsService';
import type { ChatSession } from '../types';
import { createChat } from '../services/geminiService';
import type { Chat } from '@google/genai';

const EndCallIcon: React.FC<{ className?: string }> = ({ className = "w-8 h-8" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 0 1-.694 2.256l-1.296.972a1.875 1.875 0 0 0-.694 2.256l2.433 4.867a1.875 1.875 0 0 0 2.256.694l.972-1.296a1.875 1.875 0 0 1 2.256-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 0 1-3 3h-2.25a3 3 0 0 1-3-3v-3.375c0-.987-.46-1.905-1.256-2.513l-1.5-1.125a.75.75 0 0 1 0-1.25l1.5-1.125A3.375 3.375 0 0 0 9.375 6H6a3 3 0 0 1-3-3V4.5Z" clipRule="evenodd" />
    </svg>
);

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M8.25 4.5a3.75 3.75 0 1 1 7.5 0v8.25a3.75 3.75 0 1 1-7.5 0V4.5Z" />
    <path d="M6 10.5a.75.75 0 0 1 .75.75v.75a4.5 4.5 0 0 0 9 0v-.75a.75.75 0 0 1 1.5 0v.75a6 6 0 1 1-12 0v-.75a.75.75 0 0 1 .75-.75Z" />
  </svg>
);

const SoundWave: React.FC = () => (
    <div className="sound-wave flex items-center justify-center h-16 w-16 gap-1">
        <div className="w-1 h-4 bg-white/80 rounded-full"></div>
        <div className="w-1 h-8 bg-white/80 rounded-full"></div>
        <div className="w-1 h-12 bg-white/80 rounded-full"></div>
        <div className="w-1 h-8 bg-white/80 rounded-full"></div>
        <div className="w-1 h-4 bg-white/80 rounded-full"></div>
    </div>
);


interface AiCallViewProps {
  onClose: () => void;
  initialText: string;
  session?: ChatSession;
}

type CallStatus = 'connecting' | 'listening' | 'thinking' | 'speaking' | 'ended' | 'error';

const AiCallView: React.FC<AiCallViewProps> = ({ onClose, initialText, session }) => {
  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [statusMessage, setStatusMessage] = useState('Connecting...');
  const [conversation, setConversation] = useState<{ author: 'user' | 'ai', text: string }[]>([]);
  
  const chatRef = useRef<Chat | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    transcriptRef.current?.scrollTo(0, transcriptRef.current.scrollHeight);
  }, [conversation]);

  const sendMessageToAi = async (message: string) => {
    if (!chatRef.current) return;
    
    setConversation(prev => [...prev, { author: 'user', text: message }]);
    setCallStatus('thinking');
    setStatusMessage('Thinking...');
    
    try {
      const stream = await chatRef.current.sendMessageStream({ message });
      setCallStatus('speaking');
      
      let fullResponse = '';
      let sentenceQueue = '';
      let activeSpeechPromise: Promise<void> | null = null;
      
      setConversation(prev => [...prev, { author: 'ai', text: '' }]);
      
      for await (const chunk of stream) {
        if (!isMountedRef.current) return;
        const textChunk = chunk.text;
        if (textChunk) {
            fullResponse += textChunk;
            sentenceQueue += textChunk;

            setConversation(prev => {
                const newConversation = [...prev];
                const lastMessage = newConversation[newConversation.length - 1];
                if (lastMessage && lastMessage.author === 'ai') {
                    lastMessage.text = fullResponse;
                }
                return newConversation;
            });

            const sentenceEndings = /[.!?。？！]/;
            if (sentenceEndings.test(sentenceQueue)) {
                const sentences = sentenceQueue.match(/[^.!?。？！]+[.!?。？！]+/g);
                if (sentences) {
                    const sentencesToSpeak = sentences.join(' ').trim();
                    sentenceQueue = sentenceQueue.replace(sentences.join(''), '').trim();
                    if (activeSpeechPromise) await activeSpeechPromise;
                    if(isMountedRef.current) activeSpeechPromise = speakText(sentencesToSpeak);
                }
            }
        }
      }

      if (sentenceQueue.trim()) {
        if (activeSpeechPromise) await activeSpeechPromise;
        if(isMountedRef.current) await speakText(sentenceQueue.trim());
      }

      if(isMountedRef.current) {
        setCallStatus('listening');
        setStatusMessage("I'm listening...");
      }

    } catch (error) {
        if ((error as Error).name !== 'AbortError') {
            console.error("Error in AI response stream:", error);
        }
        if (!isMountedRef.current) return;
        setCallStatus('error');
        setStatusMessage('Sorry, an error occurred.');
        await speakText("I'm sorry, I encountered an error. Let's try that again.");
        if (isMountedRef.current) {
            setCallStatus('listening');
            setStatusMessage("I'm listening...");
        }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    const language = session?.selections.language || 'en';
    chatRef.current = createChat(language, session?.messages || []);

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;
      
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.trim();
        if (transcript) {
          sendMessageToAi(transcript);
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current && callStatus === 'listening') {
          try {
            recognition.start();
          } catch (e) {
            console.error("Recognition restart failed:", e);
          }
        }
      };
      
      recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error, event.message);
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
            setStatusMessage('Microphone error.');
            setCallStatus('error');
        }
      };
    }
    
    const startCall = async () => {
        try {
            setConversation([{ author: 'ai', text: initialText }]);
            await speakText(initialText);
            if (isMountedRef.current) {
                setCallStatus('listening');
                setStatusMessage("I'm listening...");
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') {
                console.error("Failed to start call", err);
                 if (isMountedRef.current) {
                    setStatusMessage("Voice service failed.");
                    setCallStatus('error');
                }
            }
        }
    };
    
    startCall();

    return () => {
        isMountedRef.current = false;
        stopSpeaking();
        if (recognitionRef.current) {
            recognitionRef.current.onresult = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.abort();
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      const recognition = recognitionRef.current;
      if (!recognition) return;

      if (callStatus === 'listening') {
          try {
              recognition.start();
          } catch (e) {
              if (e instanceof DOMException && e.name === 'InvalidStateError') {
                  // Already started, which is fine in this logic.
              } else {
                  console.error("Failed to start recognition:", e);
              }
          }
      } else {
          recognition.stop();
      }
  }, [callStatus]);

  const handleClose = () => {
      setCallStatus('ended');
      onClose();
  };

  const renderStatusIndicator = () => {
    switch(callStatus) {
        case 'speaking':
            return <SoundWave />;
        case 'listening':
            return <MicrophoneIcon className="w-12 h-12 text-white/90 animate-pulse" />;
        case 'thinking':
            return <div className="w-12 h-12 border-4 border-white/50 border-t-white rounded-full animate-spin"></div>;
        default:
            return <MicrophoneIcon className="w-12 h-12 text-white/90" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl z-[60] flex flex-col items-center justify-between p-4 sm:p-8 animate-fade-in">
        <div className="w-full max-w-2xl h-1/2 mt-8 flex flex-col">
            <h2 className="text-xl font-bold text-white text-center mb-4">AI Voice Call</h2>
            <div ref={transcriptRef} className="flex-1 overflow-y-auto p-4 space-y-4 rounded-lg bg-white/5">
                {conversation.map((msg, index) => (
                    <div key={index} className={`flex ${msg.author === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`p-3 rounded-lg max-w-sm text-white ${msg.author === 'user' ? 'bg-purple-600/50' : 'bg-white/10'}`}>
                           {msg.text}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        <div className="flex flex-col items-center gap-6 text-center">
            <div className={`w-40 h-40 rounded-full bg-gradient-to-tr from-purple-500 to-fuchsia-500 flex items-center justify-center ring-2 ring-white/20 transition-all duration-300 ${callStatus === 'listening' ? 'animate-pulse-glow' : ''}`}>
                {renderStatusIndicator()}
            </div>
            <p className={`text-lg transition-colors duration-300 min-h-[28px] ${callStatus === 'error' ? 'text-red-400' : 'text-white/70'}`}>
              {statusMessage}
            </p>
        </div>

        <button 
            onClick={handleClose}
            aria-label="End Call"
            className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-4 focus:ring-red-400/50"
        >
            <EndCallIcon className="w-9 h-9 text-white" />
        </button>
    </div>
  );
};

export default AiCallView;