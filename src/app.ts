import type { Request, Response } from 'express';
import { parseWebhookPayload } from './whatsapp/webhook';
import { sendTextMessage, markAsRead } from './whatsapp/sender';
import { routeMessageToText } from './media/router';
import { runAgent } from './agent/loop';
import type { WhatsAppWebhookPayload } from './whatsapp/types';

const UNSUPPORTED_DOCUMENT_MSG =
  'The file type you provided is not supported. Please send a text, audio message, image, PDF, CSV, or spreadsheet.';

/**
 * Main request handler — processes a single WhatsApp message through the full pipeline:
 *   Webhook payload → parse → media processing → agent → WhatsApp reply
 */
export async function handleWhatsAppMessage(req: Request, res: Response): Promise<void> {
  console.log('[WEBHOOK] POST received at', new Date().toISOString());
  console.log('[WEBHOOK] Body:', JSON.stringify(req.body, null, 2));

  // Always respond 200 immediately so WhatsApp stops retrying
  res.sendStatus(200);

  const payload = req.body as WhatsAppWebhookPayload;
  const message = parseWebhookPayload(payload);

  console.log('[WEBHOOK] Parsed message:', message);

  // Non-message events (delivery receipts, etc.) — nothing to do
  if (!message) {
    console.log('[WEBHOOK] No actionable message found (status update or unknown type), skipping.');
    return;
  }

  const { from, messageId } = message;
  console.log(`[WEBHOOK] Processing message from ${from}, type: ${message.type}`);

  try {
    await markAsRead(messageId);

    // Convert the inbound message (any media type) to plain text
    const routed = await routeMessageToText(message);
    console.log('[WEBHOOK] Routed message:', routed);

    if (!routed.ok) {
      await sendTextMessage(from, UNSUPPORTED_DOCUMENT_MSG);
      return;
    }

    console.log('[AGENT] Running agent for session:', from);

    // Run the AI agent with the user's wa_id as the session key
    const agentResponse = await runAgent(from, routed.text);

    console.log('[AGENT] Response:', agentResponse);

    await sendTextMessage(from, agentResponse);
    console.log('[WEBHOOK] Reply sent to', from);
  } catch (err) {
    console.error(`[handleWhatsAppMessage] Error for session ${from}:`, err);
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
