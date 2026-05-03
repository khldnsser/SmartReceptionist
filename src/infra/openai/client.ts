import OpenAI from 'openai';
import { config } from '../../core/config';

export const openai = new OpenAI({ apiKey: config.openai.apiKey });
