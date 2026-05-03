import type { Request, Response } from 'express';
import { parseWebhookPayload } from './whatsapp/webhook';
import { sendTextMessage, markAsRead } from './whatsapp/sender';
import { routeMessageToText } from './media/router';
import { runAgent } from './agent/loop';
import { logger } from './core/logger';
import type { WhatsAppWebhookPayload } from './whatsapp/types';

const UNSUPPORTED_DOCUMENT_MSG =
  'The file type you provided is not supported. Please send a text, audio message, image, PDF, CSV, or spreadsheet.';

/**
 * Main request handler — processes a single WhatsApp message through the full pipeline:
 *   Webhook payload → parse → media processing → agent → WhatsApp reply
 */
export async function handleWhatsAppMessage(req: Request, res: Response): Promise<void> {
  logger.debug({ body: req.body }, '[WEBHOOK] POST received');

  // Always respond 200 immediately so WhatsApp stops retrying
  res.sendStatus(200);

  const payload = req.body as WhatsAppWebhookPayload;
  const message = parseWebhookPayload(payload);

  // Non-message events (delivery receipts, etc.) — nothing to do
  if (!message) {
    logger.debug('[WEBHOOK] No actionable message (status update or unknown type), skipping.');
    return;
  }

  const { from, messageId } = message;
  logger.info({ from, type: message.type }, '[WEBHOOK] Processing message');

  try {
    await markAsRead(messageId);

    // Convert the inbound message (any media type) to plain text
    const routed = await routeMessageToText(message);
    logger.debug({ routed }, '[WEBHOOK] Routed message');

    if (!routed.ok) {
      await sendTextMessage(from, UNSUPPORTED_DOCUMENT_MSG);
      return;
    }

    logger.info({ from }, '[AGENT] Running agent for session');
    const agentResponse = await runAgent(from, routed.text);
    logger.info({ from, length: agentResponse.length }, '[AGENT] Response ready');

    await sendTextMessage(from, agentResponse);
    logger.info({ from }, '[WEBHOOK] Reply sent');
  } catch (err) {
    logger.error({ from, err }, '[handleWhatsAppMessage] Error');
    try {
      await sendTextMessage(
        from,
        'Sorry, something went wrong on our end. Please try again in a moment.',
      );
    } catch {
      // Swallow secondary send errors — avoid infinite error loops
    }
  }
}
