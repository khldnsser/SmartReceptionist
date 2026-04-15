import { config } from '../config';

const BASE_URL = `https://graph.facebook.com/${config.whatsapp.apiVersion}`;

/**
 * Sends a text message to a WhatsApp user via the Cloud API.
 */
export async function sendTextMessage(to: string, text: string): Promise<void> {
  const url = `${BASE_URL}/${config.whatsapp.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsapp.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`WhatsApp send failed (${response.status}): ${body}`);
  }
}

/**
 * Marks an incoming message as read.
 */
export async function markAsRead(messageId: string): Promise<void> {
  const url = `${BASE_URL}/${config.whatsapp.phoneNumberId}/messages`;

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.whatsapp.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
}
