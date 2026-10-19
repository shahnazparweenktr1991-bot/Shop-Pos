import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Middleware: Completely strip HSTS headers and remove cookies for mobile testing tunnels & open access
app.use((req: Request, res: Response, next) => {
  res.removeHeader('Strict-Transport-Security');
  res.removeHeader('Set-Cookie');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Parse JSON bodies up to 25MB for sync payload with compressed images
app.use(express.json({ limit: '25mb' }));

// Data directory for persistent multi-device accounts and cloud tenant databases
const DATA_DIR = path.resolve(process.cwd(), 'data', 'cloud_db');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  shopName: string;
  createdAt: string;
  lastLoginAt: string;
}

interface TenantData {
  categories: any[];
  products: any[];
  sales: any[];
  purchases: any[];
  contacts: any[];
  payments: any[];
  expenses: any[];
  estimates: any[];
  professionals?: any[];
  shopSettings?: any;
  updatedAt: string;
  version: number;
}

// Helper: Read users
function getUsers(): UserRecord[] {
  try {
    if (!fs.existsSync(USERS_FILE)) return [];
    const content = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading users file:', err);
    return [];
  }
}

// Helper: Save users
function saveUsers(users: UserRecord[]): void {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing users file:', err);
  }
}

// Helper: Hash password
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Helper: Generate secure token
function generateToken(userId: string, email: string): string {
  const secret = process.env.SESSION_SECRET || 'ak_hardware_pos_secure_sync_secret_key_2026';
  const payload = `${userId}:${email}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

// Helper: Verify token
function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, email, timestamp, sig] = decoded.split(':');
    if (!userId || !email || !sig) return null;
    const secret = process.env.SESSION_SECRET || 'ak_hardware_pos_secure_sync_secret_key_2026';
    const payload = `${userId}:${email}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (sig !== expectedSig) return null;
    return { userId, email };
  } catch {
    return null;
  }
}

// Tenant Data file path
function getTenantFilePath(userId: string): string {
  const safeId = crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
  return path.join(DATA_DIR, `tenant_${safeId}.json`);
}

function getTenantData(userId: string): TenantData | null {
  const file = getTenantFilePath(userId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function saveTenantData(userId: string, data: TenantData): void {
  const file = getTenantFilePath(userId);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

// Auth Middleware
function requireAuth(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }
  const token = authHeader.split(' ')[1];
  const verified = verifyToken(token);
  if (!verified) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session token' });
  }
  (req as any).user = verified;
  next();
}

// --- API ENDPOINTS ---

// Register New Account
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, name, shopName } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    if (password.length < 5) {
      return res.status(400).json({ error: 'Password must be at least 5 characters long' });
    }

    const users = getUsers();
    if (users.some((u) => u.email === cleanEmail)) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newUser: UserRecord = {
      id: userId,
      email: cleanEmail,
      passwordHash,
      salt,
      name: name?.trim() || 'Shop Owner',
      shopName: shopName?.trim() || 'A.K. Hardware',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveUsers(users);

    const token = generateToken(userId, cleanEmail);

    return res.json({
      success: true,
      message: 'Registration successful! Cloud database is linked.',
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        shopName: newUser.shopName,
      },
      token,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: err?.message || 'Server error during registration' });
  }
});

// Login Account
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const users = getUsers();
    const user = users.find((u) => u.email === cleanEmail);

    if (!user) {
      return res.status(401).json({ error: 'No account found with this email. Please register first.' });
    }

    const computedHash = hashPassword(password, user.salt);
    if (computedHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    user.lastLoginAt = new Date().toISOString();
    saveUsers(users);

    const token = generateToken(user.id, user.email);

    return res.json({
      success: true,
      message: 'Logged in successfully! Multi-device sync ready.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        shopName: user.shopName,
      },
      token,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: err?.message || 'Server error during login' });
  }
});

// Verify Current User Session
app.get('/api/auth/me', requireAuth, (req: Request, res: Response) => {
  const { userId } = (req as any).user;
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User no longer exists' });
  }
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      shopName: user.shopName,
    },
  });
});

// Pull Latest Cloud Data
app.get('/api/sync/pull', requireAuth, (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    const data = getTenantData(userId);
    if (!data) {
      return res.json({
        exists: false,
        message: 'No remote cloud data found for this account yet.',
      });
    }
    return res.json({
      exists: true,
      data,
    });
  } catch (err: any) {
    console.error('Sync pull error:', err);
    return res.status(500).json({ error: 'Failed to pull cloud database' });
  }
});

// Push Local Data to Cloud
app.post('/api/sync/push', requireAuth, (req: Request, res: Response) => {
  try {
    const { userId } = (req as any).user;
    const {
      categories = [],
      products = [],
      sales = [],
      purchases = [],
      contacts = [],
      payments = [],
      expenses = [],
      estimates = [],
      professionals = [],
      shopSettings = {},
      clientVersion = 1,
    } = req.body;

    const existingData = getTenantData(userId);
    const newVersion = (existingData?.version || 0) + 1;

    const payload: TenantData = {
      categories,
      products,
      sales,
      purchases,
      contacts,
      payments,
      expenses,
      estimates,
      professionals,
      shopSettings,
      updatedAt: new Date().toISOString(),
      version: newVersion,
    };

    saveTenantData(userId, payload);

    return res.json({
      success: true,
      message: 'Cloud database updated successfully across all registered devices.',
      updatedAt: payload.updatedAt,
      version: payload.version,
    });
  } catch (err: any) {
    console.error('Sync push error:', err);
    return res.status(500).json({ error: 'Failed to push cloud database' });
  }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Start Full-Stack Server
async function startServer() {
  if (!isProd) {
    // Development mode: attach Vite as middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve built static files from dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
