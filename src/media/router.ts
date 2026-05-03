import { downloadMedia } from '../whatsapp/media';
import type { IncomingMessage } from '../whatsapp/types';
import { transcribeAudio } from './audio';
import { analyzeImage } from './image';
import { extractDocument } from './document';
import { uploadMediaToStorage } from './storage';
import { createTestResultForWaId } from '../repositories/test-result.repo';
import { getHistory } from '../agent/memory';
import { logger } from '../core/logger';

export type RoutedMessage =
  | { ok: true; text: string }
  | { ok: false; reason: 'unsupported_document' };

async function buildRecentContext(waId: string): Promise<string | undefined> {
  try {
    const history = await getHistory(waId);
    const recent = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-4)
      .map(m => `${m.role === 'user' ? 'Patient' : 'Assistant'}: ${typeof m.content === 'string' ? m.content : ''}`)
      .join('\n');
    return recent || undefined;
  } catch {
    return undefined;
  }
}

const TEST_RESULT_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'application/pdf',
]);

function isTestResultMedia(mimeType: string): boolean {
  return TEST_RESULT_MIME_TYPES.has(mimeType);
}

async function persistMediaAsTestResult(
  waId: string,
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  caption?: string,
): Promise<string> {
  try {
    const storagePath = await uploadMediaToStorage(waId, buffer, fileName, mimeType);
    await createTestResultForWaId(waId, {
      storage_path: storagePath,
      mime_type: mimeType,
      file_name: fileName,
      file_size_bytes: buffer.length,
      patient_note: caption,
      uploaded_via: 'whatsapp',
    });
    return `[Test result uploaded to patient records. File: ${fileName} (${mimeType}). Patient note: "${caption ?? 'none'}". Storage path: ${storagePath}]`;
  } catch (err) {
    logger.error({ err }, '[MEDIA ROUTER] Storage/DB failed');
    return `[Media upload failed. Patient sent ${mimeType} file "${fileName}". Patient note: "${caption ?? 'none'}". Error: ${err instanceof Error ? err.message : String(err)}]`;
  }
}

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
      const ext = mimeType.split('/')[1] ?? 'jpg';
      const recentContext = await buildRecentContext(message.from);
      const { description: analysisText, label } = await analyzeImage(buffer, mimeType, message.caption, recentContext);
      const sanitizedLabel = label.replace(/[^a-zA-Z0-9 _-]/g, '').trim();
      const fileName = `${sanitizedLabel || 'Medical Document'}.${ext}`;
      const storageStatus = await persistMediaAsTestResult(message.from, buffer, mimeType, fileName, message.caption);
      return {
        ok: true,
        text: `${storageStatus}\nImage analysis: ${analysisText}`,
      };
    }

    case 'document': {
      const { buffer, mimeType } = await downloadMedia(message.mediaId!);
      const fileName = message.fileName ?? `document_${Date.now()}`;

      const isPersistable = isTestResultMedia(mimeType);
      const [docResult, storageStatus] = await Promise.all([
        extractDocument(buffer, mimeType, message.caption),
        isPersistable
          ? persistMediaAsTestResult(message.from, buffer, mimeType, fileName, message.caption)
          : Promise.resolve(''),
      ]);

      if (!docResult.ok) {
        return { ok: false, reason: 'unsupported_document' };
      }

      const prefix = storageStatus ? `${storageStatus}\n` : '';
      return { ok: true, text: `${prefix}${docResult.text}` };
    }
  }
}
