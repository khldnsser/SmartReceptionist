import { config } from '../config';

const BASE_URL = `https://graph.facebook.com/${config.whatsapp.apiVersion}`;

interface MediaInfo {
  url: string;
  mime_type: string;
  file_size: number;
  id: string;
}

/**
 * Retrieves the temporary download URL and metadata for a WhatsApp media object.
 */
export async function getMediaInfo(mediaId: string): Promise<MediaInfo> {
  const url = `${BASE_URL}/${mediaId}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.whatsapp.apiToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to get media info for ${mediaId}: ${response.status}`);
  }

  return response.json() as Promise<MediaInfo>;
}

/**
 * Downloads the raw binary content of a WhatsApp media file.
 */
export async function downloadMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const info = await getMediaInfo(mediaId);

  const response = await fetch(info.url, {
    headers: { Authorization: `Bearer ${config.whatsapp.apiToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to download media ${mediaId}: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    mimeType: info.mime_type,
  };
}
