import express from 'express';
import { config } from './config';
import { handleVerification } from './whatsapp/webhook';
import { handleWhatsAppMessage } from './app';
import { sendTextMessage } from './whatsapp/sender';
import { startScheduler } from './scheduler';
import { supabase } from './db/client';
import { logger } from './core/logger';

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
    logger.error({ err: errMsg }, '[NOTIFY] Failed to send WhatsApp message');
    res.status(500).json({ ok: false, error: errMsg });
  }
});

// ─── Ad-hoc send (doctor → patient, logs to conversation history) ─────────────
app.post('/internal/send-message', async (req, res) => {
  const token = req.headers['x-internal-token'];
  if (!token || token !== config.notifications.internalToken) {
    res.sendStatus(401);
    return;
  }

  const { waId, text } = req.body as { waId?: string; text?: string };
  if (!waId || !text) {
    res.status(400).json({ error: 'waId and text are required' });
    return;
  }

  try {
    await sendTextMessage(waId, text);
    // Log so the agent sees this message in future conversation context
    await supabase.from('conversation_messages').insert({
      wa_id: waId,
      role: 'assistant',
      content: text,
    });
    res.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err: errMsg }, '[SEND-MSG] Failed');
    res.status(500).json({ ok: false, error: errMsg });
  }
});

// ─── WhatsApp webhook ─────────────────────────────────────────────────────────
app.get('/webhook', handleVerification);
app.post('/webhook', handleWhatsAppMessage);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Clinic AI Receptionist running');
  logger.info('Endpoints: POST /webhook  GET /health  POST /internal/notify  POST /internal/send-message');
  startScheduler();
});

export default app;
