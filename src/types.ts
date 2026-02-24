
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

export interface KnowledgeItem {
  id: string;
  topic: string;
  content: string;
  buttonName?: string; // Optional: Label for the button
  buttonUrl?: string;  // Optional: URL to open
}

export interface User {
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface UserSettings {
  language: 'english' | 'roman_urdu';
  tone: 'casual' | 'normal' | 'professional';
  theme: 'light' | 'dark';
}

export interface AppState {
  currentSessionId: string | null;
  sessions: ChatSession[];
  knowledgeBase: KnowledgeItem[];
  isThinking: boolean;
  user: User | null;
  settings: UserSettings;
}
