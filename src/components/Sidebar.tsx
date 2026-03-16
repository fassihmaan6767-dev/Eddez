import React, { useState, useRef, useEffect } from 'react';
import { ChatSession, KnowledgeItem, User, UserSettings } from '../../types';
import { storageService } from './services/storageService';

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
  showTutorial: boolean;
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

  const [isDashboardOpen, setDashboardOpen] = useState(false);
  const [dashboardUsers, setDashboardUsers] = useState<User[]>([]);
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [selectedDashboardUser, setSelectedDashboardUser] = useState<User | null>(null);
  const [selectedUserSessions, setSelectedUserSessions] = useState<ChatSession[]>([]);
  const [viewingSession, setViewingSession] = useState<ChatSession | null>(null);
  const [isKBModalOpen, setKBModalOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const sidebarRef = useRef<HTMLElement>(null);

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
        const newItem: KnowledgeItem = {
          id: crypto.randomUUID(),
          topic: newTopic,
          content: newContent,
          buttonName: newButtonName.trim() || undefined,
          buttonUrl: newButtonUrl.trim() || undefined
        };
        setKnowledgeBase(prev => [...prev, newItem]);
      }
      
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
      handleCancelEdit();
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
    if(showTutorial) onCloseTutorial();
  };

  const handleOpenDashboard = async () => {
    const users = await storageService.getAllUsers();
    setDashboardUsers(users);
    setDashboardOpen(true);
    if(window.innerWidth < 768) onToggle();
  };

  const handleSelectDashboardUser = async (u: User) => {
    setSelectedDashboardUser(u);
    const userSessions = await storageService.getAllSessions(u.email);
    setSelectedUserSessions(userSessions);
    setViewingSession(null);
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
        
        <div className="flex flex-col gap-4 mb-4">
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

            <div className="flex items-center gap-2">
                <button 
                    onClick={onNewChat}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-500 text-white py-3 px-4 rounded-xl shadow-lg shadow-slate-300/20 dark:shadow-indigo-900/40 transition-all active:scale-95 group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-10