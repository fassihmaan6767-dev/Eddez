
import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, KnowledgeItem, User, UserSettings } from '../types';
import { storageService } from '../services/storageService';

interface SidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  knowledgeBase: KnowledgeItem[];
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeItem[]>>;
  settings: UserSettings;
  setSettings: (settings: UserSettings) => void;
  isOpen: boolean;
  onToggle: () => void;
  user: User | null;
  onLogout: () => void;
  showTutorial: boolean; // New Prop for Onboarding Popup
  onCloseTutorial: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  knowledgeBase, 
  setKnowledgeBase, 
  settings,
  setSettings,
  isOpen, 
  onToggle, 
  user, 
  onLogout,
  showTutorial,
  onCloseTutorial
}) => {
  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newButtonName, setNewButtonName] = useState('');
  const [newButtonUrl, setNewButtonUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [showLanguageOptions, setShowLanguageOptions] = useState(false);

  // --- ADMIN DASHBOARD STATE ---
  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [dashboardUsers, setDashboardUsers] = useState<User[]>([]);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [selectedDashboardUser, setSelectedDashboardUser] = useState<User | null>(null);
  const [selectedUserSessions, setSelectedUserSessions] = useState<ChatSession[]>([]);
  const [viewingSession, setViewingSession] = useState<ChatSession | null>(null);
  const [isKBModalOpen, setKBModalOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const sidebarRef = useRef<HTMLElement>(null);

  // GLOBAL PROXIMITY EFFECT FOR SIDEBAR CONTAINER
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!sidebarRef.current) return;
        const rect = sidebarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        sidebarRef.current.style.setProperty('--x', `${x}px`);
        sidebarRef.current.style.setProperty('--y', `${y}px`);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  const filteredSessions = sessions.filter(session => 
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddKB = () => {
    if (newTopic.trim() && newContent.trim()) {
      if (editingId) {
        // UPDATE EXISTING
        setKnowledgeBase(prev => prev.map(item => 
          item.id === editingId 
            ? {
                ...item,
                topic: newTopic,
                content: newContent,
                buttonName: newButtonName.trim() || undefined,
                buttonUrl: newButtonUrl.trim() || undefined
              }
            : item
        ));
        setEditingId(null);
      } else {
        // CREATE NEW
        const newItem: KnowledgeItem = {
          id: crypto.randomUUID(),
          topic: newTopic,
          content: newContent,
          buttonName: newButtonName.trim() || undefined,
          buttonUrl: newButtonUrl.trim() || undefined
        };
        setKnowledgeBase(prev => [...prev, newItem]);
      }
      
      // Reset Form
      setNewTopic('');
      setNewContent('');
      setNewButtonName('');
      setNewButtonUrl('');
      setKBModalOpen(false);
    }
  };

  const handleEditStart = (item: KnowledgeItem) => {
    setNewTopic(item.topic);
    setNewContent(item.content);
    setNewButtonName(item.buttonName || '');
    setNewButtonUrl(item.buttonUrl || '');
    setEditingId(item.id);
    setKBModalOpen(true);
  };

  const handleCancelEdit = () => {
    setNewTopic('');
    setNewContent('');
    setNewButtonName('');
    setNewButtonUrl('');
    setEditingId(null);
    setKBModalOpen(false);
  };

  const handleOpenAddKB = () => {
      handleCancelEdit(); // Clear any previous state
      setKBModalOpen(true);
  };

  const handleDeleteKB = (id: string) => {
    if (editingId === id) {
        handleCancelEdit();
    }
    setKnowledgeBase(prev => prev.filter(item => item.id !== id));
  };

  const setLanguage = (lang: 'english' | 'roman_urdu') => {
    setSettings({
      ...settings,
      language: lang
    });
    setShowLanguageOptions(false);
  };

  const setTone = (tone: 'casual' | 'normal' | 'professional') => {
    setSettings({ ...settings, tone });
  };

  const toggleTheme = () => {
    setSettings({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' });
    if(showTutorial) onCloseTutorial(); // Close tutorial when user interacts
  };

  // --- ADMIN DASHBOARD HANDLERS ---
  const handleOpenDashboard = async () => {
    const users = await storageService.getAllUsers();
    setDashboardUsers(users);
    setDashboardOpen(true);
    if(window.innerWidth < 768) onToggle(); // Close sidebar on mobile
  };

  const handleSelectDashboardUser = async (u: User) => {
    setSelectedDashboardUser(u);
    const userSessions = await storageService.getAllSessions(u.email);
    setSelectedUserSessions(userSessions);
    setViewingSession(null); // Reset chat view
  };

  const filteredDashboardUsers = dashboardUsers.filter(u => 
    u.name.toLowerCase().includes(dashboardSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(dashboardSearch.toLowerCase())
  );

  return (
    <>
    <aside 
      ref={sidebarRef}
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/10 dark:bg-black/20 backdrop-blur-xl border-r border-white/20 dark:border-white/10 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col shadow-2xl md:shadow-none md:m-4 md:rounded-[2rem] md:border border-white/20 dark:border-white/10 overflow-visible proximity-border`}
    >
      <div className="h-full flex flex-col p-5 overflow-hidden">
        
        {/* Top Section */}
        <div className="flex flex-col gap-4 mb-4">
            {/* Search */}
            <div className="relative w-full rounded-xl">
                <input 
                    type="text" 
                    placeholder="Search chats..." 
                    className="w-full pl-9 pr-4 py-3 bg-white/10 dark:bg-black/20 border border-white/20 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/30 focus:bg-white/20 dark:focus:bg-black/30 transition-all placeholder-slate-500 dark:placeholder-slate-400 shadow-inner text-slate-800 dark:text-white backdrop-blur-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 dark:text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {/* New Chat */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={onNewChat}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white py-3 px-4 rounded-xl shadow-lg shadow-slate-300/20 dark:shadow-indigo-900/40 transition-all active:scale-95 group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="font-semibold text-sm">New Chat</span>
                </button>
                
                <button onClick={onToggle} className="md:hidden text-slate-600 dark:text-slate-300 hover:text-slate-900 p-3 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-white/50 dark:border-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 px-1">
            <div>
                <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">Your Chats</h3>
                <div className="space-y-1.5">
                    {filteredSessions.length === 0 ? (
                        <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-4 italic">No chats found.</p>
                    ) : (
                        filteredSessions.map(session => (
                            <div 
                                key={session.id}
                                className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                                    currentSessionId === session.id 
                                    ? 'bg-white/30 dark:bg-slate-700/60 shadow-sm border border-white/40 dark:border-slate-500' 
                                    : 'hover:bg-white/20 dark:hover:bg-slate-800/40 border border-transparent hover:border-white/20 dark:hover:border-slate-700'
                                }`}
                                onClick={() => onSelectSession(session.id)}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 shrink-0 ${currentSessionId === session.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                                
                                <span className={`flex-1 text-sm truncate ${currentSessionId === session.id ? 'text-slate-800 dark:text-white font-medium' : 'text-slate-600 dark:text-slate-400'}`}>
                                    {session.title}
                                </span>

                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === session.id ? null : session.id);
                                        }}
                                        className={`p-1 rounded-md text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors ${activeMenuId === session.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                        </svg>
                                    </button>
                                    
                                    {activeMenuId === session.id && (
                                        <div className="absolute right-0 top-full mt-1 w-24 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-lg shadow-xl border border-white/50 dark:border-slate-600 z-20 overflow-hidden">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeleteSession(session.id);
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-left"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="border-t border-slate-200/30 dark:border-slate-700/50 my-4"></div>

            {/* Settings */}
            <div className="relative bg-white/10 dark:bg-black/20 backdrop-blur-md p-4 rounded-2xl border border-white/20 dark:border-white/10 shadow-sm transition-colors duration-300">
                
                {/* ONBOARDING COACH MARK POPUP */}
                {showTutorial && (
                    <div className="absolute -top-16 left-0 right-0 z-50 animate-bounce">
                        <div className="bg-indigo-600 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl border border-indigo-400 relative mx-2 text-center">
                            <span>✨ You can switch the Theme here!</span>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-600 rotate-45 border-b border-r border-indigo-400"></div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onCloseTutorial(); }}
                                className="absolute -top-2 -right-2 bg-white text-indigo-600 rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-indigo-200"
                            >
                                &times;
                            </button>
                        </div>
                    </div>
                )}

                <h3 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    Settings
                </h3>
                
                <div className="space-y-5">
                     {/* Theme Toggle Switch */}
                     <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">Theme</span>
                        <div 
                            onClick={toggleTheme}
                            className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${settings.theme === 'dark' ? 'bg-indigo-600 border border-indigo-500' : 'bg-slate-300 border border-slate-300'}`}
                        >
                            <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ease-in-out flex items-center justify-center ${settings.theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}>
                                {settings.theme === 'dark' ? (
                                    <span className="text-[10px]">🌙</span>
                                ) : (
                                    <span className="text-[10px]">☀️</span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-2 block">Language</span>
                        <div className="relative">
                            <button 
                                onClick={() => setShowLanguageOptions(!showLanguageOptions)}
                                className="w-full flex items-center justify-between px-3 py-2.5 bg-white/20 dark:bg-black/30 border border-white/30 dark:border-white/10 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white/40 dark:hover:bg-white/10 transition-all"
                            >
                                <span className="flex items-center gap-2">
                                    {settings.language === 'roman_urdu' ? '🇵🇰 Roman Urdu' : '🇬🇧 English'}
                                </span>
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showLanguageOptions ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {showLanguageOptions && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-white/50 dark:border-slate-600 rounded-lg shadow-xl overflow-hidden z-20 animate-blur-in">
                                    <button 
                                        onClick={() => setLanguage('english')}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${settings.language === 'english' ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                    >
                                        <span>🇬🇧</span> English
                                    </button>
                                    <div className="h-px bg-slate-100 dark:bg-slate-700"></div>
                                    <button 
                                        onClick={() => setLanguage('roman_urdu')}
                                        className={`w-full flex items-center gap-2 px-3 py-2.5 text-xs transition-colors ${settings.language === 'roman_urdu' ? 'text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                                    >
                                        <span>🇵🇰</span> Roman Urdu
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase mb-2 block">Tone</span>
                        <div className="flex gap-1.5">
                            {['casual', 'normal', 'prof.'].map((t) => {
                                const fullTone = t === 'prof.' ? 'professional' : t;
                                return (
                                    <button
                                        key={t}
                                        onClick={() => setTone(fullTone as any)}
                                        className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all border ${
                                            settings.tone === fullTone 
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200 dark:shadow-none' 
                                            : 'bg-white/20 dark:bg-black/30 text-slate-600 dark:text-slate-300 border-white/30 dark:border-white/10 hover:bg-white/40 dark:hover:bg-white/10'
                                        }`}
                                    >
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {isAdmin && (
                <div 
                    className={`bg-white/10 dark:bg-black/20 backdrop-blur-md p-4 rounded-xl border ${editingId ? 'border-emerald-400/50 dark:border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border-white/20 dark:border-white/10'} shadow-sm mt-4 transition-all duration-300`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Admin Knowledge
                        </h3>
                    </div>
                    
                    {/* NEW: VIEW USERS CHATS BUTTON */}
                    <button
                        onClick={handleOpenDashboard}
                        className="w-full mb-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-lg hover:shadow-lg hover:from-emerald-600 hover:to-teal-600 transition-all flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        View Users Chats
                    </button>

                    <button
                        onClick={handleOpenAddKB}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Data
                    </button>

                    {/* LIST OF EXISTING KNOWLEDGE ITEMS */}
                    <div className="mt-4 border-t border-slate-300/30 dark:border-slate-600/50 pt-3">
                        <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex justify-between items-center">
                            <span>Existing Data</span>
                            <span className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{knowledgeBase.length}</span>
                        </h4>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {knowledgeBase.length === 0 ? (
                            <p className="text-[10px] text-center text-slate-400 italic">No data added yet.</p>
                        ) : (
                            knowledgeBase.map(item => (
                                <div 
                                    key={item.id} 
                                    className={`p-2.5 bg-white/50 dark:bg-black/20 border rounded-lg text-xs relative group transition-colors ${editingId === item.id ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-white/30 dark:border-slate-700'}`}
                                >
                                    <div className="font-bold text-indigo-700 dark:text-indigo-300 pr-14 truncate">{item.topic}</div>
                                    <div className="text-[10px] text-slate-600 dark:text-slate-400 truncate mt-0.5">{item.content}</div>
                                    {item.buttonName && (
                                        <div className="mt-1.5 flex items-center gap-1">
                                            <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-[9px] border border-indigo-200 dark:border-indigo-800">
                                                Btn: {item.buttonName}
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEditStart(item)}
                                            className="p-1 rounded-md bg-white/50 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-400 hover:text-blue-500 transition-all"
                                            title="Edit"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteKB(item.id)}
                                            className="p-1 rounded-md bg-white/50 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all"
                                            title="Delete"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-slate-200/30 dark:border-slate-700/50">
           <div className="flex items-center justify-between gap-2">
             <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-md text-white font-bold text-xs ring-2 ring-white/50 dark:ring-slate-700">
                    {user?.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate max-w-[100px]">{user?.name}</p>
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 truncate">Online</p>
                </div>
             </div>
             <button 
               onClick={onLogout}
               className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"
               title="Logout"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             </button>
           </div>
        </div>
      </div>
    </aside>

    {/* ======================= ADMIN DASHBOARD MODAL ======================= */}
    {isDashboardOpen && (
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
         <div className="w-full max-w-6xl h-[85vh] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-white/20 flex overflow-hidden relative">
            
            {/* CLOSE BUTTON */}
            <button 
               onClick={() => setDashboardOpen(false)}
               className="absolute top-4 right-4 z-20 p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {/* COLUMN 1: USERS LIST */}
            <div className={`w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col ${selectedDashboardUser && 'hidden md:flex'}`}>
               <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                     Users ({filteredDashboardUsers.length})
                  </h2>
                  <input 
                     type="text" 
                     placeholder="Search users..." 
                     className="w-full px-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                     value={dashboardSearch}
                     onChange={(e) => setDashboardSearch(e.target.value)}
                  />
               </div>
               <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                  {filteredDashboardUsers.map((u, i) => (
                     <div 
                        key={i}
                        onClick={() => handleSelectDashboardUser(u)}
                        className={`p-4 rounded-xl cursor-pointer mb-2 transition-all flex items-center gap-3 ${selectedDashboardUser?.email === u.email ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                     >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold shrink-0">
                           {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                           <p className={`font-bold text-sm truncate ${selectedDashboardUser?.email === u.email ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-800 dark:text-slate-200'}`}>{u.name}</p>
                           <p className="text-xs text-slate-500 truncate">{u.email}</p>
                           <span className="inline-block mt-1 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-[10px] rounded text-slate-600 dark:text-slate-400 capitalize">{u.role}</span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>

            {/* COLUMN 2 & 3: DETAILS (Combined or Split) */}
            <div className={`w-full md:w-2/3 flex flex-col ${!selectedDashboardUser && 'hidden md:flex'}`}>
               {!selectedDashboardUser ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 p-8 text-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                     <p>Select a user to view their chat history</p>
                  </div>
               ) : (
                  <div className="flex h-full flex-col md:flex-row">
                      
                      {/* SESSIONS LIST FOR SELECTED USER */}
                      <div className={`w-full md:w-1/3 border-r border-slate-200 dark:border-slate-700 flex flex-col ${viewingSession && 'hidden md:flex'}`}>
                           <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30 flex items-center gap-2">
                               <button onClick={() => setSelectedDashboardUser(null)} className="md:hidden mr-2">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                               </button>
                               <div>
                                  <h3 className="font-bold text-slate-800 dark:text-white">{selectedDashboardUser.name}'s Chats</h3>
                                  <p className="text-xs text-slate-500">{selectedUserSessions.length} Sessions</p>
                               </div>
                           </div>
                           <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-slate-50/30 dark:bg-slate-900/30">
                              {selectedUserSessions.length === 0 && <p className="text-center text-xs text-slate-400 mt-4">No chat history.</p>}
                              {selectedUserSessions.map(session => (
                                 <div 
                                    key={session.id}
                                    onClick={() => setViewingSession(session)}
                                    className={`p-3 rounded-lg cursor-pointer mb-2 border transition-all ${viewingSession?.id === session.id ? 'bg-white dark:bg-slate-800 border-indigo-300 dark:border-indigo-700 shadow-sm' : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
                                 >
                                    <p className={`text-sm font-medium truncate ${viewingSession?.id === session.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>{session.title}</p>
                                    <p className="text-[10px] text-slate-400 mt-1">{new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString()}</p>
                                 </div>
                              ))}
                           </div>
                      </div>

                      {/* MESSAGES VIEW */}
                      <div className={`w-full md:w-2/3 flex flex-col bg-white/50 dark:bg-black/20 ${!viewingSession && 'hidden md:flex'}`}>
                          {!viewingSession ? (
                              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Select a session</div>
                          ) : (
                              <>
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setViewingSession(null)} className="md:hidden">
                                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                        </button>
                                        <h3 className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{viewingSession.title}</h3>
                                    </div>
                                    <span className="text-xs text-slate-400">{viewingSession.messages.length} msgs</span>
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                                    {viewingSession.messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[85%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 rounded-tr-none' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-tl-none'}`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                                <p className="text-[9px] opacity-50 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                              </>
                          )}
                      </div>
                  </div>
               )}
            </div>

         </div>
      </div>
    )}
    {/* ======================= ADD/EDIT KNOWLEDGE MODAL ======================= */}
    {isKBModalOpen && (
      <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
         <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/20 p-6 relative">
            
            <button 
               onClick={handleCancelEdit}
               className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                {editingId ? 'Edit Knowledge' : 'Add Knowledge'}
            </h3>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Topic</label>
                    <input
                        type="text"
                        placeholder="e.g. Shipping Policy"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white text-sm"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Context (Q/A)</label>
                    <textarea
                        placeholder="Enter the detailed content or answer..."
                        rows={4}
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white text-sm resize-none"
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Button Name <span className="text-[10px] font-normal opacity-50">(Optional)</span></label>
                        <input
                            type="text"
                            placeholder="e.g. View Policy"
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white text-sm"
                            value={newButtonName}
                            onChange={(e) => setNewButtonName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">URL <span className="text-[10px] font-normal opacity-50">(Optional)</span></label>
                        <input
                            type="text"
                            placeholder="https://..."
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-white text-sm"
                            value={newButtonUrl}
                            onChange={(e) => setNewButtonUrl(e.target.value)}
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        onClick={handleAddKB}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95"
                    >
                        {editingId ? 'Update Data' : 'Add Data'}
                    </button>
                </div>
            </div>
         </div>
      </div>
    )}
    </>
  );
};

export default Sidebar;
