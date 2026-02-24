
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from '../services/storageService';
import { User } from '../types';

// ==================================================================================
// STEP 1: JAB APP DEPLOY HO JAYE (Vercel/Netlify), TO GOOGLE CONSOLE MEIN URL ADD KAREIN
// STEP 2: WAHA SE NEW CLIENT ID LE KAR YAHAN PASTE KAREIN
// ==================================================================================
const GOOGLE_CLIENT_ID = "808883072247-l8etklsgkbf4irsvitun165a5spp9nmg.apps.googleusercontent.com"; 

interface AuthProps {
  onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [googleUrl, setGoogleUrl] = useState('#');

  const cardRef = useRef<HTMLDivElement>(null);

  // GLOBAL PROXIMITY EFFECT FOR AUTH CARD
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        cardRef.current.style.setProperty('--x', `${x}px`);
        cardRef.current.style.setProperty('--y', `${y}px`);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    return () => window.removeEventListener('mousemove', handleGlobalMouseMove);
  }, []);

  // Check for Google OAuth response on mount & Construct Login URL
  useEffect(() => {
    // 1. Construct Google OAuth URL
    if (typeof window !== 'undefined') {
      const oauth2Endpoint = 'https://accounts.google.com/o/oauth2/v2/auth';
      
      // Clean redirect URI: remove query params and hash, handle trailing slashes
      let currentUrl = window.location.origin + window.location.pathname;
      if (currentUrl.length > 1 && currentUrl.endsWith('/')) {
        currentUrl = currentUrl.slice(0, -1);
      }
      
      const params: Record<string, string> = {
        'client_id': GOOGLE_CLIENT_ID,
        'redirect_uri': currentUrl,
        'response_type': 'token',
        'scope': 'openid email profile', 
        'include_granted_scopes': 'true',
        'state': 'pass-through value',
        'prompt': 'select_account' 
      };
      
      const urlParams = new URLSearchParams(params).toString();
      setGoogleUrl(`${oauth2Endpoint}?${urlParams}`);
    }

    // 2. Parse the URL hash to find the access_token if returning from Google
    const hash = window.location.hash;
    if (hash && hash.includes('access_token')) {
      const params = new URLSearchParams(hash.substring(1)); // remove the '#'
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        setIsLoading(true);
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })
        .then(res => res.json())
        .then(async data => {
          if (data.email) {
            const result = await storageService.handleGoogleAuth(data.email, data.name || data.email.split('@')[0]);
            if (result.success && result.user) {
              window.history.replaceState(null, '', window.location.pathname);
              onLogin(result.user);
            }
          }
        })
        .catch(err => {
          console.error("Google Info Fetch Error:", err);
          setError("Failed to verify Google account.");
        })
        .finally(() => setIsLoading(false));
      }
    }
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLogin) {
      const result = await storageService.login(email, password);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Login failed');
      }
    } else {
      if (!name) {
        setError('Name is required');
        return;
      }
      const result = await storageService.signup(email, password, name);
      if (result.success && result.user) {
        onLogin(result.user);
      } else {
        setError(result.error || 'Signup failed');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent transition-colors">
         <div className="flex flex-col items-center animate-blur-in">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-slate-600 dark:text-slate-300 font-medium">Verifying with Google...</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 gap-6 overflow-y-auto transition-colors duration-300 relative">
      <style>
        {`
          @keyframes slideUpSmooth {
             0% { opacity: 0; transform: translateY(40px) scale(0.95); }
             100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}
      </style>

      {/* 
         GLASS CARD CONTAINER 
         - Added custom animation 'animate-[slideUpSmooth_1.2s_cubic-bezier(0.2,0.8,0.2,1)_forwards]'
         - This creates the smooth entry effect when the splash screen removes the overlay
      */}
      <div 
        ref={cardRef}
        className="
        relative w-full max-w-md p-8 
        rounded-[2rem] 
        shadow-[0_8px_32px_0_rgba(31,38,135,0.37)] 
        backdrop-blur-[12px] 
        bg-white/10 dark:bg-black/20 
        border border-white/20 dark:border-white/10
        overflow-hidden
        animate-[slideUpSmooth_1.2s_cubic-bezier(0.2,0.8,0.2,1)_forwards]
        transition-all duration-500
        proximity-border
        opacity-0 
      ">
        
        {/* Subtle Gradient Overlay for gloss */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <div 
            // Key added here to trigger animation on mode switch
            key={isLogin ? 'login-header' : 'signup-header'}
            className="animate-blur-in"
          >
            <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-tr from-white/20 to-white/5 backdrop-blur-md shadow-lg border border-white/30 flex items-center justify-center overflow-hidden">
                <img 
                src="https://raw.githubusercontent.com/pakgraphicsedupk-cpu/agent-pic/673c0bfcb3b2a057f5ac966ec8fc101b85f039e0/yalcilpmgtuc0cyo7fee.webp" 
                alt="Eddez" 
                className="w-full h-full object-cover opacity-90 hover:scale-110 transition-transform duration-500"
                />
            </div>
            <div className="flex items-center justify-center gap-2">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight drop-shadow-md">
                {isLogin ? 'Welcome Back' : 'Eddez'}
                </h2>
            </div>
            <p className="text-slate-600 dark:text-slate-200 font-medium mt-1 text-sm shadow-sm">
                Your Exclusive Clothing Brand Assistant
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-700 dark:text-red-100 text-xs font-semibold rounded-xl flex items-center gap-2 relative z-10 shadow-sm animate-fade-in">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {/* WRAPPER DIV WITH KEY FOR TRANSITION */}
          <div key={isLogin ? 'login-form' : 'signup-form'} className="space-y-4 animate-blur-in">
            {!isLogin && (
                <div className="group">
                <input
                    type="text"
                    required
                    className="w-full px-5 py-3.5 bg-white/20 dark:bg-black/20 text-slate-900 dark:text-white placeholder-slate-600 dark:placeholder-slate-400 border border-white/20 dark:border-white/10 rounded-xl focus:outline-none focus:bg-white/30 dark:focus:bg-black/30 focus:border-indigo-400/50 transition-all shadow-inner backdrop-blur-sm"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                </div>
            )}
            <div className="group">
                <input
                type="email"
                required
                className="w-full px-5 py-3.5 bg-white/20 dark:bg-black/20 text-slate-900 dark:text-white placeholder-slate-600 dark:placeholder-slate-400 border border-white/20 dark:border-white/10 rounded-xl focus:outline-none focus:bg-white/30 dark:focus:bg-black/30 focus:border-indigo-400/50 transition-all shadow-inner backdrop-blur-sm"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <div className="group">
                <input
                type="password"
                required
                className="w-full px-5 py-3.5 bg-white/20 dark:bg-black/20 text-slate-900 dark:text-white placeholder-slate-600 dark:placeholder-slate-400 border border-white/20 dark:border-white/10 rounded-xl focus:outline-none focus:bg-white/30 dark:focus:bg-black/30 focus:border-indigo-400/50 transition-all shadow-inner backdrop-blur-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                />
            </div>

            <button
                type="submit"
                className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-600/90 to-purple-600/90 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all duration-300 transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 flex items-center justify-center gap-2 group border border-white/20 backdrop-blur-sm hover-border"
            >
                {isLogin ? 'Sign In' : 'Sign Up'}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
            </button>
          </div>
        </form>

        <div className="my-6 flex items-center relative z-10 px-2 animate-blur-in">
            <div className="flex-1 border-t border-slate-500/30 dark:border-white/20"></div>
            <span className="px-3 text-[10px] text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider">Or continue with</span>
            <div className="flex-1 border-t border-slate-500/30 dark:border-white/20"></div>
        </div>

        {/* Real Google Button - Glass Style */}
        <a
            href={googleUrl}
            className="relative z-10 w-full py-3.5 bg-white/40 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 border border-white/40 dark:border-white/10 text-slate-800 dark:text-white font-semibold rounded-xl transition-all transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-3 shadow-lg backdrop-blur-md cursor-pointer no-underline hover-border animate-blur-in"
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
        </a>

        <div className="mt-8 text-center relative z-10 animate-blur-in">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-sm text-indigo-700 dark:text-indigo-200 font-bold hover:underline transition-all drop-shadow-sm"
          >
            {isLogin ? "New user? Create account" : "Have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
