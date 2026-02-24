
import { ChatSession, KnowledgeItem, Message, User, UserSettings } from '../types';

const SESSION_KEY = 'app_session'; // Keep session key for client-side auth state only

const DEFAULT_SETTINGS: UserSettings = {
  tone: 'normal',
  language: 'english',
  theme: 'light'
};

const API_URL = import.meta.env.VITE_API_URL || '';

export const storageService = {
  // Auth
  login: async (email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
        return { success: false, error: 'Server Error: API not found (HTML returned)' };
      }

      if (!res.ok) {
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            return json;
        } catch {
            return { success: false, error: `Server Error: ${res.status}` };
        }
      }

      const data = await res.json();
      if (data.success) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
      }
      return data;
    } catch (e) {
      console.error("Login Error:", e);
      return { success: false, error: 'Network error - Check console' };
    }
  },

  signup: async (email: string, password: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      if (!res.ok) {
        const text = await res.text();
        try {
            const json = JSON.parse(text);
            return json;
        } catch {
            return { success: false, error: `Server Error: ${res.status}` };
        }
      }

      const data = await res.json();
      if (data.success) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
      }
      return data;
    } catch (e) {
      console.error("Signup Error:", e);
      return { success: false, error: 'Network error - Check console' };
    }
  },

  // Handle Google Auth Logic
  handleGoogleAuth: async (email: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> => {
    try {
      const res = await fetch(`${API_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
      }
      return data;
    } catch (e) {
      return { success: false, error: 'Network error' };
    }
  },

  logout: () => {
    localStorage.removeItem(SESSION_KEY);
  },

  getSession: (): User | null => {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  // Knowledge Base
  getKB: async (defaultKB: KnowledgeItem[]): Promise<KnowledgeItem[]> => {
    try {
      const res = await fetch(`${API_URL}/api/kb`);
      if (!res.ok) return defaultKB;
      return await res.json();
    } catch (e) {
      return defaultKB;
    }
  },

  saveKB: async (kb: KnowledgeItem[]) => {
    await fetch(`${API_URL}/api/kb`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kb)
    });
  },

  // Settings (Per User)
  getSettings: async (email: string): Promise<UserSettings> => {
    try {
      const res = await fetch(`${API_URL}/api/settings?email=${encodeURIComponent(email)}`);
      if (!res.ok) return DEFAULT_SETTINGS;
      return await res.json();
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: async (email: string, settings: UserSettings) => {
    await fetch(`${API_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, settings })
    });
  },

  // --- Multi-Session Chat History Management ---

  getAllSessions: async (email: string): Promise<ChatSession[]> => {
    try {
      const res = await fetch(`${API_URL}/api/sessions?email=${encodeURIComponent(email)}`);
      if (!res.ok) return [];
      const sessions = await res.json();
      // Rehydrate Dates
      return sessions.map((session: any) => ({
        ...session,
        messages: session.messages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
      })).sort((a: ChatSession, b: ChatSession) => b.createdAt - a.createdAt);
    } catch (e) {
      return [];
    }
  },

  saveSession: async (email: string, session: ChatSession) => {
    await fetch(`${API_URL}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, session })
    });
  },

  deleteSession: async (email: string, sessionId: string) => {
    await fetch(`${API_URL}/api/sessions/${encodeURIComponent(email)}/${sessionId}`, {
      method: 'DELETE'
    });
  },

  // --- Admin Features ---
  getAllUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch(`${API_URL}/api/users`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  }
};
