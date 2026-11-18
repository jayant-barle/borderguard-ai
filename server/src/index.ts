import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase, db } from './db/database';
import { seedDatabase } from './db/seed';
import { generateAllSpecimens } from './utils/generateSpecimens';
import { OllamaService } from './services/OllamaService';
import authRoutes from './routes/auth.routes';
import verificationRoutes from './routes/verification.routes';
import documentsRoutes from './routes/documents.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import specimensRoutes from './routes/specimens.routes';
import aiRoutes from './routes/ai.routes';

const app = express();
const PORT = process.env.PORT || 5000;

process.on('uncaughtException', (err) => {
  console.error('[SatyaShield Server Uncaught Exception]:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[SatyaShield Server Unhandled Rejection]:', reason);
});

// Initialize Database & Seed default data
initDatabase();
generateAllSpecimens();
seedDatabase();
console.log('[SatyaShield] Database initialized and seeded successfully.');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure upload & assets directories exist
const uploadsDir = path.join(process.cwd(), 'uploads');
const assetsDir = path.join(process.cwd(), 'assets');
const clientDistDir = path.join(process.cwd(), 'client', 'dist');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

// Static assets
// NOTE: /uploads is deliberately NOT served statically to protect private document images.
// Uploads are accessible only via authenticated endpoints (/api/verification/:id/image).
app.use('/assets', express.static(assetsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/specimens', specimensRoutes);
app.use('/api/ai', aiRoutes);

// Health check endpoint
app.get('/api/health', async (_req, res) => {
  const ollamaStatus = await OllamaService.checkHealth();
  res.json({
    status: 'HEALTHY',
    service: 'SatyaShield AI Security Engine',
    version: '2.5.0',
    mode: ollamaStatus.connected ? 'OLLAMA_AI' : 'DEMO_MODE',
    ollama: {
      connected: ollamaStatus.connected,
      baseUrl: ollamaStatus.baseUrl,
      activeModel: ollamaStatus.activeModel,
      availableModelsCount: ollamaStatus.availableModels.length
    },
    timestamp: new Date().toISOString()
  });
});

// Catch-all for undefined /api/* endpoints - return JSON 404
app.all('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Explicitly reject direct access to /uploads/* with 404 (prevent SPA fallback from serving index.html)
app.all('/uploads/*', (_req, res) => {
  res.status(404).json({ error: 'Direct access to uploads is disabled. Use authenticated verification endpoints.' });
});

// Express error-handling middleware (Multer errors & unhandled errors)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.name === 'MulterError' || err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  }
  if (err?.status || err?.statusCode) {
    return res.status(err.status || err.statusCode).json({ error: err.message });
  }
  console.error('[Unhandled Server Error]:', err);
  return res.status(500).json({ error: err?.message || 'Internal server error' });
});

// Serve frontend in production build if present
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.use((req, res) => {
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

const server = app.listen(PORT, async () => {
  console.log(`=======================================================`);
  console.log(`  🛡️  SatyaShield - Enterprise Security Operations     `);
  console.log(`  Server listening on http://localhost:${PORT}        `);
  
  // Check Ollama connection status
  const ollama = await OllamaService.checkHealth();
  if (ollama.connected) {
    console.log(`  🤖 OLLAMA AI: CONNECTED (${ollama.baseUrl})`);
    console.log(`  📦 Active Model: ${ollama.activeModel} (Available: ${ollama.availableModels.length} models)`);
  } else {
    console.log(`  ⚠️  OLLAMA AI: OFFLINE / CONNECTING (${ollama.baseUrl})`);
    console.log(`  💡 Running in robust hybrid fallback mode.`);
  }
  console.log(`=======================================================`);
});

// Keep Node event loop active on Windows
const keepAliveTimer = setInterval(() => {}, 1000 * 60 * 60);

const shutdown = () => {
  clearInterval(keepAliveTimer);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export { app, server };
export default app;

