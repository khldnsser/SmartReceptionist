import { Router } from 'express';
import { handleVerification } from '../../whatsapp/webhook';
import { handleWhatsAppMessage } from '../../app';

export const webhookRouter = Router();

webhookRouter.get('/', handleVerification);
webhookRouter.post('/', handleWhatsAppMessage);
