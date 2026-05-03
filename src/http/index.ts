import express from 'express';
import { healthRouter } from './routes/health';
import { internalRouter } from './routes/internal';
import { webhookRouter } from './routes/webhook';
import { errorHandler } from './middleware/error-handler';

const app = express();

app.use(express.json());
app.use('/health', healthRouter);
app.use('/internal', internalRouter);
app.use('/webhook', webhookRouter);
app.use(errorHandler);

export default app;
