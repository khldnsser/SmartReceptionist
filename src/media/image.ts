import OpenAI from 'openai';
import { config } from '../config';

const openai = new OpenAI({ apiKey: config.openai.apiKey });

/**
 * Analyzes an image using GPT-4o-mini vision and returns a text description.
 * The result is combined with the optional user-provided caption.
 */
export async function analyzeImage(buffer: Buffer, mimeType: string, caption?: string): Promise<string> {
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64}`;

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
            text: 'Describe this image in detail, including any text, medical documents, or relevant information visible.',
          },
        ],
      },
    ],
  });

  const description = response.choices[0]?.message?.content ?? '';

  return [
    `User image description: ${description}`,
    `User image caption: ${caption ?? ''}`,
  ].join('\n');
}
