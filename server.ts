
import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.join(__dirname, 'db.json');

// Ensure DB file exists
if (!fs.existsSync(DB_FILE)) {
  const initialData = {
    users: {},
    sessions: {}, // Keyed by email
    kb: [
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
    ],
    settings: {} // Keyed by email
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 7860; // Hugging Face Spaces default port

  // Create HTTP server
  const server = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    console.log('Client connected');
    ws.on('close', () => console.log('Client disconnected'));
  });

  // Helper to broadcast to all clients
  const broadcast = (data: any) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Enable CORS for Vercel Frontend
  app.use(cors({
    origin: '*', // Allow all origins (or specify your Vercel URL later)
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));
  
  app.use(express.json());

  // Request Logger
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });

  // --- API ROUTES ---

  app.get('/', (req, res) => {
    res.send('Eddez Backend is Running on Hugging Face!');
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Helper to read/write DB
  const getDB = () => {
    try {
      if (!fs.existsSync(DB_FILE)) {
        return { users: {}, sessions: {}, kb: [], settings: {} };
      }
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error("DB Read Error:", e);
      return { users: {}, sessions: {}, kb: [], settings: {} };
    }
  };

  const saveDB = (data: any) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

  // Auth
  app.post('/api/auth/login', (req, res) => {
    console.log('Login Request Body:', req.body);
    const { email, password } = req.body;
    const db = getDB();
    
    // Admin Check
    if (email === 'fassihmaan6767@gmail.com' && password === 'Fasih4') {
      return res.json({ success: true, user: { email, name: 'Admin', role: 'admin' } });
    }

    const user = db.users[email];
    if (user && user.password === password) {
      return res.json({ success: true, user: { email: user.email, name: user.name, role: user.role } });
    }
    
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  });

  app.post('/api/auth/signup', (req, res) => {
    const { email, password, name } = req.body;
    const db = getDB();

    if (db.users[email]) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    db.users[email] = { email, password, name, role: 'user' };
    saveDB(db);
    
    res.json({ success: true, user: { email, name, role: 'user' } });
  });

  app.post('/api/auth/google', (req, res) => {
    const { email, name } = req.body;
    const db = getDB();

    // Admin Check
    if (email === 'fassihmaan6767@gmail.com') {
       return res.json({ success: true, user: { email, name: 'Admin', role: 'admin' } });
    }

    if (!db.users[email]) {
      db.users[email] = { email, password: 'GOOGLE_AUTH_PLACEHOLDER', name, role: 'user' };
      saveDB(db);
    }
    
    const user = db.users[email];
    res.json({ success: true, user: { email: user.email, name: user.name, role: user.role } });
  });

  // Knowledge Base
  app.get('/api/kb', (req, res) => {
    const db = getDB();
    res.json(db.kb);
  });

  app.post('/api/kb', (req, res) => {
    const db = getDB();
    db.kb = req.body;
    saveDB(db);
    broadcast({ type: 'KB_UPDATED' }); // Notify clients
    res.json({ success: true });
  });

  // Sessions
  app.get('/api/sessions', (req, res) => {
    const { email } = req.query;
    const db = getDB();
    const userSessions = db.sessions[email as string] || [];
    res.json(userSessions);
  });

  app.post('/api/sessions', (req, res) => {
    const { email, session } = req.body;
    const db = getDB();
    
    if (!db.sessions[email]) db.sessions[email] = [];
    
    const sessions = db.sessions[email];
    const index = sessions.findIndex((s: any) => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    
    saveDB(db);
    res.json({ success: true });
  });

  app.delete('/api/sessions/:email/:id', (req, res) => {
    const { email, id } = req.params;
    const db = getDB();
    
    if (db.sessions[email]) {
      db.sessions[email] = db.sessions[email].filter((s: any) => s.id !== id);
      saveDB(db);
    }
    
    res.json({ success: true });
  });

  // Settings
  app.get('/api/settings', (req, res) => {
    const { email } = req.query;
    const db = getDB();
    const settings = db.settings[email as string] || { tone: 'normal', language: 'english', theme: 'light' };
    res.json(settings);
  });

  app.post('/api/settings', (req, res) => {
    const { email, settings } = req.body;
    const db = getDB();
    db.settings[email] = settings;
    saveDB(db);
    res.json({ success: true });
  });

  // Admin: Get All Users
  app.get('/api/users', (req, res) => {
    const db = getDB();
    const users = Object.values(db.users).map((u: any) => ({
      email: u.email,
      name: u.name,
      role: u.role
    }));
    res.json(users);
  });

  // Chat Proxy (Groq API)
  app.post('/api/chat', async (req, res) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing API Key configuration on server.' });
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || 'Groq API Error');
      }

      res.json(data);
    } catch (error: any) {
      console.error('Chat Proxy Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Server Error:", err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  });

  // Explicit 404 for unknown API routes
  app.all('/api/*', (req, res) => {
    console.log(`404 Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ success: false, error: 'API Endpoint Not Found' });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
