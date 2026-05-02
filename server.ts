import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const ACCESS_PASSWORD = 'cainiao';

async function startServer() {
  const app = express();
  
  // --- 1. MIDDLEWARE (ABSOLUTE TOP) ---
  app.use(cors());
  app.use(express.json());

  // Request Logging
  app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });

  // --- 2. FIREBASE & FIRESTORE INITIALIZATION ---
  let serviceAccount: any = undefined;
  try {
    if (process.env.SERVICE_ACCOUNT_KEY) {
      const key = process.env.SERVICE_ACCOUNT_KEY.trim();
      serviceAccount = JSON.parse(key);
    }
  } catch (err: any) {
    console.error('Firebase Auth Guard: Failed to parse SERVICE_ACCOUNT_KEY. Details:', err.message);
  }

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 
                    (serviceAccount && serviceAccount.project_id) || 
                    process.env.FIREBASE_PROJECT_ID || 
                    'bjhpyh1';

  const databaseId = (process.env.VITE_FIREBASE_DATABASE_ID && process.env.VITE_FIREBASE_DATABASE_ID !== '(default)') 
    ? process.env.VITE_FIREBASE_DATABASE_ID 
    : '(default)';

  if (projectId) {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
          projectId: projectId,
        });
      }
    } catch (err: any) {
      console.error('Firebase Init Error:', err.message);
    }
  }

  let db: admin.firestore.Firestore;
  try {
    const firestoreApp = admin.app();
    db = getFirestore(firestoreApp, databaseId);
  } catch (err) {
    console.error('Firestore init failed, falling back to default:', err);
    db = getFirestore();
  }

  // --- 3. API ROUTER (PHYSICAL ISOLATION) ---
  const apiRouter = express.Router();

  // Auth Helper
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.headers['x-api-password'] === ACCESS_PASSWORD) return next();
    res.status(401).json({ error: 'Unauthorized' });
  };

  // Players
  apiRouter.get('/players', async (req, res) => {
    try {
      const snapshot = await db.collection('players').get();
      const players = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(p => p.id && p.name && !p.isPlaceholder);
      res.json(players);
    } catch (err) {
      console.error('GET /players failed:', err);
      res.json([]);
    }
  });

  apiRouter.post('/players', authMiddleware, async (req, res) => {
    try {
      if (!req.body || !req.body.id) return res.status(400).json({ error: 'Missing Player ID' });
      await db.collection('players').doc(req.body.id).set(req.body, { merge: true });
      res.json({ success: true });
    } catch (err: any) {
      console.error('POST /players failed:', err);
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.delete('/players/:id', authMiddleware, async (req, res) => {
    try {
      await db.collection('players').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Periods
  apiRouter.get('/periods', async (req, res) => {
    try {
      const snapshot = await db.collection('periods').get();
      const periods = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(p => p.id && p.name && !p.isPlaceholder);
      res.json(periods);
    } catch (err) {
      console.error('GET /periods failed:', err);
      res.json([]);
    }
  });

  apiRouter.post('/periods', authMiddleware, async (req, res) => {
    try {
      if (!req.body || !req.body.id) return res.status(400).json({ error: 'Missing Period ID' });
      await db.collection('periods').doc(req.body.id).set(req.body, { merge: true });
      res.json({ success: true });
    } catch (err: any) {
      console.error('POST /periods failed:', err);
      res.status(500).json({ error: err.message });
    }
  });

  apiRouter.delete('/periods/:id', authMiddleware, async (req, res) => {
    try {
      await db.collection('periods').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Health check
  apiRouter.get('/health', (req, res) => res.json({ status: 'ok' }));

  // API Catch-all (Force JSON)
  apiRouter.all('*', (req, res) => {
    res.status(404).json({ error: `API endpoint ${req.method} ${req.url} not found` });
  });

  // --- 4. MOUNT API (PRIORITY #1) ---
  app.use('/api', apiRouter);

  // --- 5. STATIC FILES & SPA (FALLBACK) ---
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[READY] App Running on port ${PORT}`);
    console.log(`[INFO] DB: ${databaseId}, Project: ${projectId}`);
  });
}

startServer();
