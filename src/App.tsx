
import React, { useState, useCallback, useEffect } from 'react';
import { Message, KnowledgeItem, User, UserSettings, ChatSession } from './types';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import Auth from './components/Auth';
import SplashScreen from './components/SplashScreen'; // Import Splash
import { getChatResponse, generateChatTitle } from './services/geminiService';
import { storageService } from './services/storageService';

const DEFAULT_KB: KnowledgeItem[] = [
  {
    id: '1',
    topic: 'Shipping Policy',
    content: 'Standard shipping takes 3-5 business days. Express shipping takes 1-2 business days. Free shipping is available on orders over $50.'
  },
  {
    id: '2',
    topic: 'Return Policy',
    content: 'Items can be returned within 30 days of purchase. Must be in original condition with tags. Refunds are processed within 7-10 business days.'
  },
  {
    id: '3',
    topic: 'Working Hours',
    content: 'Our support team is available Monday to Friday, from 9 AM to 6 PM EST. We are closed on weekends and public holidays.'
  }
];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  
  // Chat State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); // Displayed messages
  
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>({ tone: 'normal', language: 'english', theme: 'light' });
  const [isThinking, setIsThinking] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Animation States
  const [showSplash, setShowSplash] = useState(true); // Default true to show animation on load
  
  // Onboarding State
  const [showTutorial, setShowTutorial] = useState(false);

  // Connectivity State
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBackOnline, setShowBackOnline] = useState(false);

  // Initialize Session
  useEffect(() => {
    const init = async () => {
      const API_URL = import.meta.env.VITE_API_URL || '';
      
      // Check Server Health
      try {
        const healthRes = await fetch(`${API_URL}/api/health`);
        if (!healthRes.ok) throw new Error('Server unhealthy');
      } catch (e) {
        console.error("Server Health Check Failed:", e);
        // Optionally show a banner or alert
      }

      const sessionUser = storageService.getSession();
      if (sessionUser) {
        setUser(sessionUser);
      }
      const kb = await storageService.getKB(DEFAULT_KB);
      setKnowledgeBase(kb);
    };
    init();

    // WebSocket Connection for Real-time Updates
    const API_URL = import.meta.env.VITE_API_URL || '';
    let wsUrl = '';
    
    if (API_URL) {
      // If API_URL is set (e.g., https://backend.hf.space), convert to wss://
      wsUrl = API_URL.replace(/^http/, 'ws');
    } else {
      // Fallback for local dev
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}`;
    }

    const ws = new WebSocket(wsUrl);

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'KB_UPDATED') {
          console.log('Received KB update');
          const newKB = await storageService.getKB(DEFAULT_KB);
          setKnowledgeBase(newKB);
        }
      } catch (e) {
        console.error('WS Error', e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  // Handle Online/Offline Status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBackOnline(true);
      setTimeout(() => setShowBackOnline(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowBackOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Apply Theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Load User Data
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        const loadedSessions = await storageService.getAllSessions(user.email);
        setSessions(loadedSessions);
        const userSettings = await storageService.getSettings(user.email);
        setSettings(userSettings);
        
        setCurrentSessionId(null);
        setMessages([]); 

        // Show Tutorial on Login (only if splash is done)
        if (!showSplash) {
            setShowTutorial(true);
            const timer = setTimeout(() => setShowTutorial(false), 10000);
            return () => clearTimeout(timer);
        }
      } else {
        setSessions([]);
        setMessages([]);
        setCurrentSessionId(null);
      }
    };
    loadUserData();
  }, [user, showSplash]);

  const handleSetKnowledgeBase = async (action: React.SetStateAction<KnowledgeItem[]>) => {
    if (typeof action === 'function') {
      setKnowledgeBase(prev => {
        const newVal = action(prev);
        storageService.saveKB(newVal); // No await here to avoid blocking UI, but it's async
        return newVal;
      });
    } else {
      setKnowledgeBase(action);
      await storageService.saveKB(action);
    }
  };

  const handleSetSettings = async (newSettings: UserSettings) => {
    if (!user) return;
    setSettings(newSettings);
    await storageService.saveSettings(user.email, newSettings);
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleSelectSession = (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      setMessages(session.messages);
      if (window.innerWidth < 768) setIsSidebarOpen(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!user) return;
    await storageService.deleteSession(user.email, sessionId);
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    if (currentSessionId === sessionId) {
      handleNewChat();
    }
  };

  const handleSendMessage = useCallback(async (text: string, existingMessageId?: string) => {
    if (!user) return;

    // 1. Setup Message ID (New or Retry)
    const messageId = existingMessageId || crypto.randomUUID();
    const timestamp = new Date();

    // 2. Optimistic UI Update
    setMessages(prev => {
      // If retrying, update existing message status
      if (existingMessageId) {
        return prev.map(m => m.id === messageId ? { ...m, status: 'sending' } : m);
      }
      // If new, append message
      const newMessage: Message = {
        id: messageId,
        role: 'user',
        content: text,
        timestamp,
        status: 'sending'
      };
      return [...prev, newMessage];
    });

    setIsThinking(true);

    let activeSessionId = currentSessionId;
    let activeSessionTitle = "New Chat";

    // Determine session context
    if (!activeSessionId) {
       activeSessionId = crypto.randomUUID();
    } else {
       const existing = sessions.find(s => s.id === activeSessionId);
       if (existing) activeSessionTitle = existing.title;
    }

    try {
      // Check offline immediately
      if (!navigator.onLine) {
        throw new Error("No internet connection");
      }

      // 3. API Call
      const currentMessagesForContext = messages.filter(m => m.id !== messageId && m.status !== 'error');
      
      const responseText = await getChatResponse(
          text, 
          knowledgeBase, 
          currentMessagesForContext, 
          settings
      );
      
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date(),
      };
      
      // 4. Success Update
      const finalMessages = (prevMessages: Message[]) => {
          const updated = prevMessages.map(m => 
             m.id === messageId ? { ...m, status: 'sent' as const } : m
          );
          return [...updated, assistantMessage];
      };

      setMessages(prev => {
          const updated = finalMessages(prev);
          
          // Helper to save session
          const saveToStorage = async () => {
             // Generate title only if new chat
             let sessionTitle = activeSessionTitle;
             const isFirstInteraction = updated.length <= 2 && !currentSessionId;

             if (isFirstInteraction) {
                 sessionTitle = await generateChatTitle(text);
             }
             
             const newSession: ChatSession = {
                id: activeSessionId!,
                title: sessionTitle,
                messages: updated,
                createdAt: isFirstInteraction ? Date.now() : (sessions.find(s => s.id === activeSessionId)?.createdAt || Date.now())
             };

             await storageService.saveSession(user.email, newSession);
             setSessions(prevSess => {
                const idx = prevSess.findIndex(s => s.id === activeSessionId);
                if (idx >= 0) {
                    const copy = [...prevSess];
                    copy[idx] = newSession;
                    return copy;
                }
                return [newSession, ...prevSess];
             });
             setCurrentSessionId(activeSessionId);
          };
          
          saveToStorage();
          return updated;
      });

    } catch (error) {
      console.error("Chat failure:", error);
      // 5. Error Update
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, status: 'error' as const } : m
      ));
    } finally {
      setIsThinking(false);
    }
  }, [knowledgeBase, messages, user, settings, currentSessionId, sessions]);

  const handleRetry = (id: string) => {
      const msg = messages.find(m => m.id === id);
      if (msg) {
          handleSendMessage(msg.content, id);
      }
  };

  const toggleSidebar = () => {
      setIsSidebarOpen(prev => !prev);
      // Also close tutorial if user manually opens/closes sidebar
      if(showTutorial) setShowTutorial(false);
  };
  
  const handleLogout = () => {
    storageService.logout();
    setUser(null);
    setIsSidebarOpen(false);
  };

  // --- PREMIUM LIQUID BACKGROUND COMPONENT (Aurora Style) ---
  const LiquidBackground = () => (
    <div className="fixed inset-0 z-0 overflow-hidden bg-[#e0e7ff] dark:bg-[#020617] transition-colors duration-700">
      
      {/* Aurora Mesh Gradient Layer */}
      <div className="absolute inset-0 opacity-80 dark:opacity-60">
          <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vw] bg-purple-300 dark:bg-purple-900/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] animate-blob-anim-1"></div>
          <div className="absolute top-[20%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-300 dark:bg-indigo-900/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] animate-blob-anim-2"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] bg-pink-300 dark:bg-pink-900/40 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[100px] animate-blob-anim-3"></div>
          <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] bg-blue-300 dark:bg-blue-900/30 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-[80px] animate-pulse"></div>
      </div>

      {/* Noise Texture for Depth */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}></div>
    </div>
  );

  return (
    // UPDATED: h-[100dvh] ensures full viewport height on mobile
    <div className="relative flex h-[100dvh] w-full overflow-hidden">
      
      {/* SPLASH SCREEN OVERLAY */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      <LiquidBackground />
      
      {/* CONNECTION STATUS BANNERS */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-red-500/90 backdrop-blur-sm text-white text-xs font-bold text-center py-2 shadow-md animate-fade-in">
            You're Offline. Please check your internet connection.
        </div>
      )}
      {isOnline && showBackOnline && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold text-center py-2 shadow-md animate-fade-in">
            Back Online
        </div>
      )}
      
      {/* MAIN APP CONTENT - Only visible/interactive after splash (but rendered underneath) */}
      <div className={`relative z-10 flex w-full h-full transition-opacity duration-1000 ${showSplash ? 'opacity-0' : 'opacity-100 animate-blur-in'}`}>
          {!user ? (
             <div className="relative z-10 w-full h-full h-[100dvh]">
                <Auth onLogin={setUser} />
             </div>
          ) : (
            <>
              <Sidebar 
                sessions={sessions}
                currentSessionId={currentSessionId}
                onNewChat={handleNewChat}
                onSelectSession={handleSelectSession}
                onDeleteSession={handleDeleteSession}
                
                knowledgeBase={knowledgeBase} 
                setKnowledgeBase={handleSetKnowledgeBase}
                settings={settings}
                setSettings={handleSetSettings}
                isOpen={isSidebarOpen}
                onToggle={toggleSidebar}
                user={user}
                onLogout={handleLogout}
                showTutorial={showTutorial}
                onCloseTutorial={() => setShowTutorial(false)}
              />
              
              <main className="flex-1 relative flex flex-col h-full overflow-hidden">
                <ChatWindow 
                  messages={messages} 
                  isThinking={isThinking} 
                  onSendMessage={(text) => handleSendMessage(text)}
                  onRetry={handleRetry}
                  onToggleSidebar={toggleSidebar}
                  user={user}
                  onLogout={handleLogout}
                  knowledgeBase={knowledgeBase}
                />
                
                {isSidebarOpen && (
                  <div 
                    className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 md:hidden"
                    onClick={toggleSidebar}
                  />
                )}
              </main>
            </>
          )}
      </div>
    </div>
  );
};

export default App;
