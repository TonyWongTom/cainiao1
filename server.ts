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
  app.use(cors());
  app.use(express.json());

  const serviceAccount = process.env.SERVICE_ACCOUNT_KEY 
    ? JSON.parse(process.env.SERVICE_ACCOUNT_KEY) 
    : undefined;

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 
                    (serviceAccount && serviceAccount.project_id) || 
                    process.env.FIREBASE_PROJECT_ID || 
                    'bjhpyh1';

  // Explicitly default to '(default)' for initialization as requested
  const databaseId = (process.env.VITE_FIREBASE_DATABASE_ID && process.env.VITE_FIREBASE_DATABASE_ID !== '(default)') 
    ? process.env.VITE_FIREBASE_DATABASE_ID 
    : '(default)';

  console.log('--- Firebase Admin Diagnostic Startup ---');
  console.log('Backend connected to project (Target):', projectId);
  console.log('Backend connected to database (Target):', databaseId);
  console.log('Value of process.env.PROJECT_ID:', process.env.PROJECT_ID || 'undefined (using bjhpyh1)');
  console.log('Service Account present:', !!serviceAccount);
  if (serviceAccount) {
    console.log('Service Account Project ID:', serviceAccount.project_id);
  }

  if (projectId) {
    try {
      if (admin.apps.length === 0) {
        admin.initializeApp({
          credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
          projectId: projectId,
        });
        console.log(`Firebase Admin initialized successfully برای ${projectId}`);
      }
    } catch (err) {
      console.error('Failed to initialize Firebase Admin:', err);
    }
  }

  // Use the specified database ID if provided
  let db: admin.firestore.Firestore;
  try {
    const app = admin.app();
    // Explicitly pass databaseId as requested by user
    db = getFirestore(app, databaseId);
    
    console.log(`Firestore instance attached. Project: ${app.options.projectId}, Database: ${databaseId}`);
  } catch (err) {
    console.error('Failed to initialize Firestore instance:', err);
    try {
      db = getFirestore(admin.app(), '(default)');
    } catch (fallbackErr) {
      db = getFirestore();
    }
  }
  
  // Helper to detect 5 NOT_FOUND
  const isNotFoundError = (err: any) => {
    if (!err) return false;
    const code = err.code || err.status;
    const msg = String(err.message || '').toUpperCase();
    const details = String(err.details || '').toUpperCase();
    
    return code === 5 || 
           code === '5' ||
           msg.includes('NOT_FOUND') || 
           msg.includes('NOT FOUND') ||
           details.includes('NOT_FOUND') ||
           msg.includes('DATABASE_NOT_FOUND');
  };

  // Startup Integrity Check
  const ensureCollections = async () => {
    try {
      console.log('--- Database Integrity Check Started ---');
      const collections = await db.listCollections();
      const ids = collections.map(c => c.id);
      console.log('Current collections in root:', ids.length > 0 ? ids.join(', ') : '(Empty Database)');

      // Standardize collection names to lowercase (user request)
      const COLLECTIONS_TO_INIT = ['players', 'periods'];
      
      for (const collName of COLLECTIONS_TO_INIT) {
        if (!ids.includes(collName)) {
          console.log(`Initializing root collection "${collName}" with a placeholder...`);
          try {
            await db.collection(collName).doc('_init_').set({ 
              id: '_init_', 
              name: collName === 'players' ? '系统管理员' : '初始周期', 
              points: 0, 
              isPlaceholder: true,
              initializedAt: new Date().toISOString() 
            });
            console.log(`Successfully initialized "${collName}"`);
          } catch (initErr: any) {
            console.warn(`Could not initialize "${collName}":`, initErr.message);
          }
        }
      }
      console.log('--- Database Integrity Check Finished ---');
    } catch (err: any) {
      console.error('Database pre-check error details:', {
        message: err.message,
        code: err.code,
        details: err.details,
        note: 'If code is 5, check if the "bjhpyh1" project has Firestore enabled under the correct database ID (default).'
      });
    }
  };

  ensureCollections();

  console.log('------------------------------');

  // Auth Middleware
  const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const password = req.headers['x-api-password'];
    if (password === ACCESS_PASSWORD) {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized: Invalid password' });
    }
  };

  // API Routes
  app.get('/api/players', async (req, res) => {
    try {
      console.log('API Fetching players from root collection: "players"');
      const snapshot = await db.collection('players').get();
      
      if (snapshot.empty) {
        console.log('API "players" collection is empty, returning []');
        return res.json([]);
      }

      const players = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(p => p.id && p.name && !p.isPlaceholder && p.id !== '_init_');
      
      console.log(`API Found ${players.length} valid players (out of ${snapshot.docs.length} documents)`);
      res.json(players);
    } catch (err: any) {
      console.error('API Error (GET /players):', err.message);
      if (isNotFoundError(err)) {
        console.warn('NOT_FOUND (5) detected for "players" collection. Returning empty list.');
        return res.json([]);
      }
      res.status(500).json({ error: err.message, code: err.code, details: err.details });
    }
  });

  app.post('/api/players', authMiddleware, async (req, res) => {
    try {
      const playerData = req.body;
      console.log('API Saving player to root "players":', playerData.id);
      if (!playerData || !playerData.id) {
        return res.status(400).json({ error: 'Player data with ID is required' });
      }
      await db.collection('players').doc(playerData.id).set(playerData);
      console.log('API Player saved successfully');
      res.json({ success: true });
    } catch (err: any) {
      console.error('API Error (POST /players):', err);
      res.status(500).json({ error: err.message, code: err.code, details: err.details });
    }
  });

  app.delete('/api/players/:id', authMiddleware, async (req, res) => {
    try {
      await db.collection('players').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
      console.error('API Error (DELETE /players):', err);
      res.status(500).json({ error: err.message, code: err.code, details: err.details });
    }
  });

  app.get('/api/periods', async (req, res) => {
    try {
      console.log('API Fetching periods from root collection: "periods"');
      const snapshot = await db.collection('periods').get();
      
      if (snapshot.empty) {
        console.log('API "periods" collection is empty, returning []');
        return res.json([]);
      }

      const periods = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(p => p.id && p.name && !p.isPlaceholder && p.id !== '_init_');
        
      console.log(`API Found ${periods.length} valid periods (out of ${snapshot.docs.length} documents)`);
      res.json(periods);
    } catch (err: any) {
      console.error('API Error (GET /periods):', err.message);
      if (isNotFoundError(err)) {
        console.warn('NOT_FOUND (5) detected for "periods" collection. Returning empty list.');
        return res.json([]);
      }
      res.status(500).json({ error: err.message, code: err.code, details: err.details });
    }
  });

  app.post('/api/periods', authMiddleware, async (req, res) => {
    try {
      const periodData = req.body;
      console.log('API Saving period to root "periods":', periodData.id);
      if (!periodData || !periodData.id) {
        return res.status(400).json({ error: 'Period data with ID is required' });
      }
      await db.collection('periods').doc(periodData.id).set(periodData);
      console.log('API Period saved successfully');
      res.json({ success: true });
    } catch (err: any) {
      console.error('API Error (POST /periods):', err);
      res.status(500).json({ error: err.message, code: err.code, details: err.details });
    }
  });

  app.delete('/api/periods/:id', authMiddleware, async (req, res) => {
    try {
      await db.collection('periods').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (err: any) {
      console.error('API Error (DELETE /periods):', err);
      res.status(500).json({ error: err.message, code: err.code, details: err.details });
    }
  });

  // Catch-all for API routes that are NOT handled above to prevent falling through to SPA HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API Route ${req.method} ${req.url} not found` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
