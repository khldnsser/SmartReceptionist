import { Request, Response } from 'express';
import { config } from '../config';
import type { IncomingMessage, WhatsAppWebhookPayload, WhatsAppRawMessage } from './types';

/**
 * Handles the GET verification handshake from Meta when registering the webhook.
 */
export function handleVerification(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
}

/**
 * Parses an incoming WhatsApp Cloud API webhook payload into a normalized IncomingMessage.
 * Returns null if the payload contains no actionable user message (e.g. delivery status updates).
 */
export function parseWebhookPayload(payload: WhatsAppWebhookPayload): IncomingMessage | null {
  const value = payload?.entry?.[0]?.changes?.[0]?.value;
  if (!value) return null;

  const rawMessages = value.messages;
  if (!rawMessages || rawMessages.length === 0) return null;

  const raw: WhatsAppRawMessage = rawMessages[0];
  const from = raw.from;
  const messageId = raw.id;
  const timestamp = raw.timestamp;

  switch (raw.type) {
    case 'text':
      return {
        type: 'text',
        from,
        messageId,
        timestamp,
        text: raw.text?.body ?? '',
      };

    case 'audio':
      return {
        type: 'audio',
        from,
        messageId,
        timestamp,
        mediaId: raw.audio?.id,
        mimeType: raw.audio?.mime_type,
      };

    case 'image':
      return {
        type: 'image',
        from,
        messageId,
        timestamp,
        mediaId: raw.image?.id,
        mimeType: raw.image?.mime_type,
        caption: raw.image?.caption,
      };

    case 'document':
      return {
        type: 'document',
        from,
        messageId,
        timestamp,
        mediaId: raw.document?.id,
        mimeType: raw.document?.mime_type,
        caption: raw.document?.caption,
        fileName: raw.document?.filename,
      };

    default:
      return null;
  }
}
