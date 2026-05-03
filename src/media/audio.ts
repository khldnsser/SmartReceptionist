import { toFile } from 'openai';
import { openai } from '../infra/openai/client';

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const ext = mimeExtToFileExt(mimeType);
  const file = await toFile(buffer, `audio.${ext}`, { type: mimeType });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
  });

  return transcription.text;
}

function mimeExtToFileExt(mimeType: string): string {
  const map: Record<string, string> = {
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/mp4': 'mp4',
    'audio/webm': 'webm',
    'audio/wav': 'wav',
    'audio/x-wav': 'wav',
    'audio/aac': 'aac',
    'audio/amr': 'amr',
  };
  return map[mimeType] ?? 'ogg';
}
