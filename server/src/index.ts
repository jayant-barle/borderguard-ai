import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db/database';
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
app.use('/uploads', express.static(uploadsDir));
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
    version: '2.4.0-SIH',
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

// Serve frontend in production build if present
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.use((req, res) => {
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

app.listen(PORT, async () => {
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
