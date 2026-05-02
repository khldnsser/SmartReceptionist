import { downloadMedia } from '../whatsapp/media';
import type { IncomingMessage } from '../whatsapp/types';
import { transcribeAudio } from './audio';
import { analyzeImage } from './image';
import { extractDocument } from './document';
import { uploadMediaToStorage } from './storage';
import { createTestResultForWaId } from '../db/test_results';
import { getHistory } from '../agent/memory';

export type RoutedMessage =
  | { ok: true; text: string }
  | { ok: false; reason: 'unsupported_document' };

/**
 * Returns the last 4 user/assistant messages as a plain text string for LLM context.
 * Silently returns undefined on error so it never blocks the image upload flow.
 */
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

/** MIME types that are saved as test results in Supabase Storage. */
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

/**
 * Uploads media to Supabase Storage and persists a test_results row.
 * Failures are caught and logged so they never break the message pipeline.
 * Returns a human-readable status string injected into the agent's context.
 */
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
    console.error('[MEDIA ROUTER] Storage/DB failed:', err);
    return `[Media upload failed. Patient sent ${mimeType} file "${fileName}". Patient note: "${caption ?? 'none'}". Error: ${err instanceof Error ? err.message : String(err)}]`;
  }
}

/**
 * Converts any IncomingMessage into plain text for the agent.
 * Images and PDFs are also persisted to Supabase Storage as test results.
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
