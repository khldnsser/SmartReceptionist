import express from 'express';
import { config } from './config';
import { handleVerification } from './whatsapp/webhook';
import { handleWhatsAppMessage } from './app';
import { sendTextMessage } from './whatsapp/sender';
import { startScheduler } from './scheduler';

const app = express();

app.use(express.json());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Internal notification endpoint (called by PMS after manual changes) ──────
// Protected by a shared secret so only the PMS can call it.
app.post('/internal/notify', async (req, res) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== config.notifications.internalToken) {
    res.sendStatus(401);
    return;
  }

  const { waId, message } = req.body as { waId?: string; message?: string };
  if (!waId || !message) {
    res.status(400).json({ error: 'waId and message are required' });
    return;
  }

  try {
    await sendTextMessage(waId, message);
    res.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[NOTIFY] Failed to send WhatsApp message:', errMsg);
    res.status(500).json({ ok: false, error: errMsg });
  }
});

// ─── WhatsApp webhook ─────────────────────────────────────────────────────────
app.get('/webhook', handleVerification);
app.post('/webhook', handleWhatsAppMessage);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`Clinic AI Receptionist running on port ${config.port}`);
  console.log(`Webhook endpoint: POST /webhook`);
  console.log(`Health check:     GET  /health`);
  console.log(`Internal notify:  POST /internal/notify`);
  startScheduler();
});

export default app;
