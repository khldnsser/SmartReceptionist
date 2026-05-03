import { Router } from 'express';
import { requireInternalToken } from '../middleware/auth';
import { sendToPatient, sendAndLog } from '../../services/messaging.service';
import { logger } from '../../core/logger';

export const internalRouter = Router();

internalRouter.use(requireInternalToken);

internalRouter.post('/notify', async (req, res) => {
  const { waId, message } = req.body as { waId?: string; message?: string };
  if (!waId || !message) {
    res.status(400).json({ error: 'waId and message are required' });
    return;
  }
  try {
    await sendToPatient(waId, message);
    res.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err: errMsg }, '[NOTIFY] Failed to send WhatsApp message');
    res.status(500).json({ ok: false, error: errMsg });
  }
});

internalRouter.post('/send-message', async (req, res) => {
  const { waId, text } = req.body as { waId?: string; text?: string };
  if (!waId || !text) {
    res.status(400).json({ error: 'waId and text are required' });
    return;
  }
  try {
    await sendAndLog(waId, text);
    res.json({ ok: true });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err: errMsg }, '[SEND-MSG] Failed');
    res.status(500).json({ ok: false, error: errMsg });
  }
});
