import { Router, Request, Response } from 'express';
import { OllamaService } from '../services/OllamaService';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { logAuditEvent } from '../middleware/audit';

const router = Router();

// GET /api/ai/status
// Check Ollama connection, version, and list of installed models
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await OllamaService.checkHealth();
    return res.json(status);
  } catch (err: any) {
    return res.status(500).json({
      connected: false,
      baseUrl: OllamaService.getBaseUrl(),
      activeModel: OllamaService.getActiveModel(),
      availableModels: [],
      error: err.message || 'Failed to check Ollama status'
    });
  }
});

// POST /api/ai/chat
// Live Officer AI Forensic Copilot multi-turn conversation
router.post('/chat', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { messages, dossierContext } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const result = await OllamaService.chatWithCopilot(messages, dossierContext);
    return res.json(result);
  } catch (err: any) {
    console.error('Ollama Chat error:', err);
    return res.status(500).json({ error: err.message || 'Error occurred during AI chat.' });
  }
});

// POST /api/ai/analyze
// Generate instant deep AI forensic intelligence briefing for a verification case
router.post('/analyze', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { holderName, documentNumber, documentType, ocr, mrz, tampering, face, database, risk, scenario } = req.body;

    if (!holderName || !documentNumber) {
      return res.status(400).json({ error: 'Missing required document fields for analysis.' });
    }

    const analysis = await OllamaService.generateForensicAnalysis({
      holderName,
      documentNumber,
      documentType: documentType || 'PASSPORT',
      ocr,
      mrz,
      tampering,
      face,
      database,
      risk,
      scenario: scenario || 'UNKNOWN'
    });

    return res.json(analysis);
  } catch (err: any) {
    console.error('AI Analysis error:', err);
    return res.status(500).json({ error: err.message || 'Error generating AI analysis.' });
  }
});

// POST /api/ai/models/switch
// Switch the active model used by SatyaShield
router.post('/models/switch', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { model } = req.body;
    if (!model || typeof model !== 'string') {
      return res.status(400).json({ error: 'Model name is required.' });
    }

    OllamaService.setActiveModel(model);

    if (req.user) {
      logAuditEvent(
        req.user,
        'OLLAMA_MODEL_SWITCH',
        'SYSTEM',
        model,
        `Switched active Ollama model to ${model}`,
        req.ip || '127.0.0.1'
      );
    }

    const health = await OllamaService.checkHealth();
    return res.json({
      success: true,
      message: `Active Ollama model switched to ${model}`,
      status: health
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to switch active model.' });
  }
});

// POST /api/ai/models/pull
// Trigger downloading a model in Ollama
router.post('/models/pull', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { model } = req.body;
    if (!model || typeof model !== 'string') {
      return res.status(400).json({ error: 'Model name is required.' });
    }

    const result = await OllamaService.pullModel(model);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to trigger model pull.' });
  }
});

// POST /api/ai/config
// Update Ollama server connection URL
router.post('/config', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { baseUrl } = req.body;
    if (!baseUrl || typeof baseUrl !== 'string') {
      return res.status(400).json({ error: 'baseUrl is required.' });
    }

    OllamaService.setBaseUrl(baseUrl);
    const health = await OllamaService.checkHealth();

    return res.json({
      success: true,
      message: `Ollama Base URL updated to ${baseUrl}`,
      status: health
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update Ollama configuration.' });
  }
});

export default router;
