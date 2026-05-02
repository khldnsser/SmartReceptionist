export type MessageType = 'text' | 'audio' | 'image' | 'document';

export interface IncomingMessage {
  type: MessageType;
  from: string;        // wa_id (phone number without +)
  messageId: string;
  timestamp: string;
  text?: string;
  mediaId?: string;
  mimeType?: string;
  caption?: string;
  fileName?: string;   // original filename for documents
}

export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: WhatsAppWebhookValue;
      field: string;
    }>;
  }>;
}

export interface WhatsAppWebhookValue {
  messaging_product: string;
  metadata: { display_phone_number: string; phone_number_id: string };
  contacts?: Array<{ profile: { name: string }; wa_id: string }>;
  messages?: WhatsAppRawMessage[];
  statuses?: unknown[];
}

export interface WhatsAppRawMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  audio?: { id: string; mime_type: string };
  image?: { id: string; mime_type: string; caption?: string };
  document?: { id: string; mime_type: string; caption?: string; filename?: string };
}
