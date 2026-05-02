import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

export interface ImageAnalysis {
  description: string;
  label: string;
}

/**
 * Analyzes an image using GPT-4o-mini vision.
 * Returns a detailed description for the agent and a short label (3-5 words) for use as a filename.
 * Uses recent conversation context to produce a more meaningful label.
 */
export async function analyzeImage(
  buffer: Buffer,
  mimeType: string,
  caption?: string,
  recentContext?: string,
): Promise<ImageAnalysis> {
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const contextBlock = recentContext
    ? `Recent conversation context:\n${recentContext}\n\n`
    : '';

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: dataUrl, detail: 'auto' },
          },
          {
            type: 'text',
            text: `${contextBlock}Describe this image in detail, including any text, medical documents, or relevant information visible.\n\nStart your response with exactly this line:\nLABEL: <3-5 words summarising what this result is, using the image content and conversation context — e.g. "MRI Right Knee" or "CBC Blood Test" or "X-Ray Chest">\n\nThen provide the full description.`,
          },
        ],
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '';
  const labelMatch = content.match(/^LABEL:\s*(.+)/m);
  const label = labelMatch?.[1]?.trim() ?? 'Medical Document';
  const description = content.replace(/^LABEL:.*\n?/m, '').trim();

  return {
    description: [
      `User image description: ${description}`,
      `User image caption: ${caption ?? ''}`,
    ].join('\n'),
    label,
  };
}
