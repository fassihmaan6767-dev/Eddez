
import React, { useRef, useEffect, useState } from 'react';
import { Message, User, KnowledgeItem } from '../types';

interface ChatWindowProps {
  messages: Message[];
  isThinking: boolean;
  onSendMessage: (text: string) => void;
  onRetry: (id: string) => void;
  onToggleSidebar: () => void;
  user: User | null;
  onLogout: () => void;
  knowledgeBase: KnowledgeItem[];
}

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const ChatWindow: React.FC<ChatWindowProps> = ({ 
  messages, 
  isThinking, 
  onSendMessage, 
  onRetry,
  onToggleSidebar, 
  user,
  onLogout,
  knowledgeBase
}) => {
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputFormRef = useRef<HTMLFormElement>(null);
  const recognitionRef = useRef<any>(null);

  // GLOBAL PROXIMITY EFFECT FOR INPUT BAR
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (window.innerWidth < 768) return; // Disable on mobile
        if (!inputFormRef.current) return;
        const rect = inputFormRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        inputFormRef.current.style.setProperty('--x', `${x}px`);
        inputFormRef.current.style.setProperty('--y', `${y}px`);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isThinking]);

  // Internal Hover Effect for Messages (Performance Optimized)
  const handleMessageHover = (e: React.MouseEvent<HTMLElement>) => {
    if (window.innerWidth < 768) return; // Disable on mobile
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--x', `${x}px`);
    e.currentTarget.style.setProperty('--y', `${y}px`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isThinking) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleVoiceToggle = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser does not support voice input. Please try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // Defaulting to English (captures Roman Urdu phonetics better than UR-PK)
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      // Update input with current result
      if (finalTranscript) {
          setInput(prev => {
              const prefix = prev ? prev + ' ' : '';
              return prefix + finalTranscript;
          });
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleQuickAction = (text: string) => {
    onSendMessage(text);
  };

  const handleContactSupport = () => {
    window.open("https://wa.me/923122152507?text=Hi%20I%20need%20your%20assistance", "_blank");
  };
  
  const handleDynamicButton = (url: string) => {
    window.open(url, "_blank");
  };

  const renderContent = (content: string) => {
    // 1. Check for Human Support Button
    const hasSupportButton = content.includes('[ACTION_SUPPORT_BUTTON]');
    let cleanContent = content.replace('[ACTION_SUPPORT_BUTTON]', '');
    
    // 2. Check for Dynamic Action Button [ACTION_BUTTON:Name|URL]
    const actionButtonRegex = /\[ACTION_BUTTON:(.*?)\|(.*?)\]/;
    const actionMatch = cleanContent.match(actionButtonRegex);
    let dynamicBtnName = '';
    let dynamicBtnUrl = '';
    let showDynamicButton = false;
    
    if (actionMatch) {
        dynamicBtnName = actionMatch[1];
        dynamicBtnUrl = actionMatch[2];
        cleanContent = cleanContent.replace(actionButtonRegex, '');
        
        // --- SECURITY CHECK: WHITELIST VALIDATION ---
        showDynamicButton = knowledgeBase.some(item => 
            item.buttonUrl && item.buttonUrl.trim() === dynamicBtnUrl.trim()
        );
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = cleanContent.split(urlRegex);
    
    return (
      <div className="flex flex-col gap-3">
        <div className="whitespace-pre-wrap">
          {parts.map((part, i) => {
            if (part.match(urlRegex)) {
              return (
                <a 
                  key={i} 
                  href={part} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-300 dark:decoration-indigo-700 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold transition-all break-all"
                >
                  {part}
                </a>
              );
            }
            return part;
          })}
        </div>
        
        {hasSupportButton && (
          <button 
            onClick={handleContactSupport}
            onMouseMove={handleMessageHover}
            className="group relative w-full mt-3 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold text-sm tracking-wide shadow-lg hover:shadow-emerald-500/40 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden hover-border"
          >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer-effect bg-gradient-to-r from-transparent via-white/30 to-transparent z-20 pointer-events-none"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span className="relative z-10">Contact Human Support</span>
          </button>
        )}

        {showDynamicButton && dynamicBtnName && dynamicBtnUrl && (
           <button 
            onClick={() => handleDynamicButton(dynamicBtnUrl)}
            onMouseMove={handleMessageHover}
            className="group relative w-full mt-3 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl font-bold text-sm tracking-wide shadow-lg hover:shadow-indigo-500/40 transition-all duration-300 transform hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden hover-border"
           >
            <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out"></div>
            <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer-effect bg-gradient-to-r from-transparent via-white/30 to-transparent z-20 pointer-events-none"></div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="relative z-10">{dynamicBtnName}</span>
           </button>
        )}
      </div>
    );
  };

  // Determine which icon state to show
  const showSend = input.trim().length > 0;

  return (
    <div className="flex-1 flex flex-col h-full relative transition-colors duration-300">
      
      {/* Floating Glass Header */}
      <header 
          className="absolute top-0 left-0 right-0 h-16 md:h-20 px-4 md:px-6 flex items-center justify-between z-30 transition-all glass-panel rounded-b-[2rem] !bg-white/40 dark:!bg-slate-900/40 backdrop-blur-xl border-b border-white/20 shadow-lg"
      >
          <div className="flex items-center">
              <button onClick={onToggleSidebar} className="mr-3 p-2 bg-white/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all md:hidden text-slate-700 dark:text-slate-200 border border-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h8m-8 6h16" /></svg>
              </button>
              <div className="flex items-center gap-3 md:gap-4">
                <div className="relative group cursor-pointer">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                    <div className="relative w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden ring-2 ring-white/50 dark:ring-slate-600 shadow-md">
                        <img 
                        src="https://raw.githubusercontent.com/pakgraphicsedupk-cpu/agent-pic/673c0bfcb3b2a057f5ac966ec8fc101b85f039e0/yalcilpmgtuc0cyo7fee.webp" 
                        alt="Eddez" 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                </div>
                <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800 dark:text-white leading-tight">Eddez</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-sm"></span>
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Online</span>
                    </div>
                </div>
              </div>
          </div>

          <div className="flex items-center gap-3">
              <button 
              onClick={onLogout}
              className="p-2 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl transition-all md:hidden"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
          </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 relative z-0 flex flex-col overflow-hidden pt-20">
          <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 md:px-8 pb-4 custom-scrollbar scroll-smooth"
              style={{
                  maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 90%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%, black 90%, transparent 100%)'
              }}
          >
              {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center p-4 animate-blur-in">
                  <div className="flex flex-col items-center text-center max-w-md mx-auto -mt-10 mb-6 md:mb-10">
                     <div className="relative mb-4 md:mb-6 group cursor-default">
                         <div className="absolute inset-0 bg-indigo-400 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                         <div className="relative w-16 h-16 md:w-28 md:h-28 glass-panel rounded-full flex items-center justify-center overflow-hidden ring-4 ring-white/50 dark:ring-slate-700/50">
                           <img 
                             src="https://raw.githubusercontent.com/pakgraphicsedupk-cpu/agent-pic/673c0bfcb3b2a057f5ac966ec8fc101b85f039e0/yalcilpmgtuc0cyo7fee.webp" 
                             alt="Eddez" 
                             className="w-full h-full object-cover opacity-95"
                           />
                        </div>
                    </div>
                    <h3 className="text-xl md:text-3xl font-bold text-slate-800 dark:text-white mb-1.5 drop-shadow-sm">Hey {user?.name}! 👋</h3>
                    <p className="text-xs md:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-[250px] md:max-w-xs">Ask me about fashion trends, sizing, or our latest collection!</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 w-full max-w-[280px] md:max-w-md">
                      {["Track My Order", "Return Policy", "New Arrivals", "Size Guide"].map((action, i) => (
                          <button
                            key={i}
                            onMouseMove={handleMessageHover}
                            onClick={() => handleQuickAction(action)}
                            className="group relative w-full py-2.5 px-4 md:py-4 md:px-6 rounded-xl md:rounded-2xl bg-white/40 dark:bg-slate-800/40 hover:bg-white/70 dark:hover:bg-slate-700/60 border border-white/60 dark:border-slate-700 shadow-sm hover:shadow-md text-slate-700 dark:text-slate-200 font-semibold transition-all duration-300 flex items-center justify-between backdrop-blur-md hover-border text-xs md:text-sm"
                          >
                             <span>{action}</span>
                             <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white dark:bg-slate-900 flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity text-indigo-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 md:h-3.5 md:w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                             </div>
                          </button>
                      ))}
                  </div>
              </div>
              )}

              {messages.map((msg) => (
              <div 
                  key={msg.id}
                  className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-6 ${msg.role === 'user' ? 'animate-slide-up' : 'animate-blur-in'}`}
              >
                  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[70%]`}>
                    <div className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center shadow-sm border border-white/30 dark:border-slate-600 overflow-hidden ring-2 ring-white/20 dark:ring-slate-700 ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800'}`}>
                            {msg.role === 'user' ? (
                            <span className="text-xs font-bold">{user?.name.charAt(0)}</span>
                            ) : (
                            <img 
                                src="https://raw.githubusercontent.com/pakgraphicsedupk-cpu/agent-pic/673c0bfcb3b2a057f5ac966ec8fc101b85f039e0/yalcilpmgtuc0cyo7fee.webp" 
                                alt="Eddez" 
                                className="w-full h-full object-cover"
                            />
                            )}
                        </div>
                        <div 
                            onMouseMove={handleMessageHover}
                            className={`p-4 px-5 rounded-[1.2rem] text-[15px] leading-relaxed shadow-sm transition-all hover-border ${
                            msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-500/20 shadow-lg' 
                                : 'glass-panel text-slate-800 dark:text-slate-100 rounded-tl-sm'
                            } ${msg.status === 'sending' ? 'opacity-70' : 'opacity-100'}`}
                        >
                            <div className={msg.role === 'user' ? 'text-white/95 font-normal' : 'text-slate-700 dark:text-slate-200 font-medium'}>
                                {msg.role === 'user' ? msg.content : renderContent(msg.content)}
                            </div>
                            <div className="flex items-center justify-end gap-1.5 mt-1.5">
                                <span className={`text-[10px] font-bold tracking-wide opacity-60 ${msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {msg.timestamp.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                                </span>
                                {msg.role === 'user' && msg.status === 'sending' && (
                                    <svg className="animate-spin h-3 w-3 text-indigo-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>
                    {msg.status === 'error' && (
                        <button 
                            onClick={() => onRetry(msg.id)}
                            className="mt-2 mr-2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors animate-fade-in self-end"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Tap to Try Again
                        </button>
                    )}
                  </div>
              </div>
              ))}

              {isThinking && (
              <div className="flex justify-start w-full mb-6 animate-blur-in">
                  <div className="flex max-w-[70%] gap-4 items-center">
                    <div className="w-9 h-9 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center border border-white/30 dark:border-slate-600 overflow-hidden ring-2 ring-white/20 dark:ring-slate-700">
                        <img 
                          src="https://raw.githubusercontent.com/pakgraphicsedupk-cpu/agent-pic/673c0bfcb3b2a057f5ac966ec8fc101b85f039e0/yalcilpmgtuc0cyo7fee.webp" 
                          alt="Eddez" 
                          className="w-full h-full object-cover animate-pulse"
                        />
                    </div>
                    <div 
                        onMouseMove={handleMessageHover}
                        className="glass-panel px-5 py-4 rounded-[1.5rem] rounded-tl-sm flex gap-2 items-center shadow-sm hover-border"
                    >
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-150"></div>
                        <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce delay-300"></div>
                    </div>
                  </div>
              </div>
              )}
          </div>
      </div>

      {/* FOOTER */}
      <footer className="w-full px-4 pt-2 md:px-12 md:pb-12 bg-transparent shrink-0 z-40 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="max-w-4xl mx-auto">
              <div className="relative group w-full">
                  {/* Glowing Aura Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 dark:from-indigo-600 dark:via-purple-600 dark:to-pink-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-500 animate-gradient-x"></div>
                  
                  <form 
                      ref={inputFormRef}
                      onSubmit={handleSubmit} 
                      className="relative flex items-center gap-2 p-2 glass-panel rounded-[2.5rem] transition-all hover:bg-white/50 dark:hover:bg-black/50 focus-within:ring-2 focus-within:ring-white/20 proximity-border mb-0 md:mb-6 backdrop-blur-xl bg-white/30 dark:bg-black/40"
                  >
                      <input
                          type="text"
                          placeholder={isRecording ? "Listening..." : "Type your message..."}
                          className={`flex-1 bg-transparent text-slate-900 dark:text-white text-[15px] md:text-base py-3 px-5 rounded-full focus:outline-none placeholder-slate-600 dark:placeholder-slate-300 font-medium transition-all duration-300 ${isRecording ? 'animate-pulse text-indigo-600 dark:text-indigo-400' : ''}`}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          disabled={isThinking}
                      />
                      
                      {/* DYNAMIC ACTION BUTTON: MIC <-> SEND */}
                      <button
                          type={showSend ? "submit" : "button"}
                          onClick={!showSend ? handleVoiceToggle : undefined}
                          disabled={isThinking && showSend}
                          className={`
                            relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-md overflow-hidden group/btn
                            ${showSend 
                              ? 'bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-indigo-600 dark:to-purple-600 text-white hover:scale-105 active:scale-95 hover:shadow-lg' 
                              : isRecording
                                ? 'bg-red-500 text-white animate-pulse shadow-red-500/50'
                                : 'bg-white dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-600 hover:text-indigo-600 dark:hover:text-white border border-slate-200 dark:border-slate-600'
                            }
                            ${isThinking && showSend ? 'cursor-not-allowed opacity-70' : ''}
                          `}
                      >
                          {/* SPINNER (If Thinking) */}
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${isThinking && showSend ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                             <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                          </div>

                          {/* SEND ICON (If Typing) */}
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 delay-75 transform ${!isThinking && showSend ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-sm'}`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                             </svg>
                          </div>

                          {/* STOP/WAVE ICON (If Recording) */}
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 delay-75 transform ${isRecording && !showSend ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-sm'}`}>
                              <div className="flex gap-0.5 items-end h-4">
                                <span className="w-1 bg-white rounded-full animate-[bounce_1s_infinite] h-2"></span>
                                <span className="w-1 bg-white rounded-full animate-[bounce_1s_infinite_0.2s] h-4"></span>
                                <span className="w-1 bg-white rounded-full animate-[bounce_1s_infinite_0.4s] h-2"></span>
                              </div>
                          </div>

                          {/* MIC ICON (Default) */}
                          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 delay-75 transform ${!showSend && !isRecording && !isThinking ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-50 blur-sm'}`}>
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                             </svg>
                          </div>
                      </button>
                  </form>
              </div>
              <p className="text-center text-[10px] text-slate-500 dark:text-slate-400 mt-1 md:mt-0 font-medium opacity-80 tracking-wide shadow-sm">
                 Powered By <span className="text-indigo-700 dark:text-indigo-400 font-bold">Eddez Intelligence</span>
              </p>
          </div>
      </footer>
    </div>
  );
};

export default ChatWindow;
