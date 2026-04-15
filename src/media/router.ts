import { downloadMedia } from '../whatsapp/media';
import type { IncomingMessage } from '../whatsapp/types';
import { transcribeAudio } from './audio';
import { analyzeImage } from './image';
import { extractDocument } from './document';

export type RoutedMessage =
  | { ok: true; text: string }
  | { ok: false; reason: 'unsupported_document' };

/**
 * Converts any IncomingMessage (text/audio/image/document) into a plain text
 * string that can be passed directly to the AI agent.
 */
export async function routeMessageToText(message: IncomingMessage): Promise<RoutedMessage> {
  switch (message.type) {
    case 'text':
      return { ok: true, text: message.text ?? '' };

    case 'audio': {
      const { buffer, mimeType } = await downloadMedia(message.mediaId!);
      const text = await transcribeAudio(buffer, mimeType);
      return { ok: true, text };
    }

    case 'image': {
      const { buffer, mimeType } = await downloadMedia(message.mediaId!);
      const text = await analyzeImage(buffer, mimeType, message.caption);
      return { ok: true, text };
    }

    case 'document': {
      const { buffer, mimeType } = await downloadMedia(message.mediaId!);
      const result = await extractDocument(buffer, mimeType, message.caption);
      if (!result.ok) {
        return { ok: false, reason: 'unsupported_document' };
      }
      return { ok: true, text: result.text };
    }
  }
}
