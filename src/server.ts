import app from './http/index';
import { config } from './core/config';
import { startScheduler } from './jobs/index';
import { logger } from './core/logger';

app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Clinic AI Receptionist running');
  logger.info('Endpoints: POST /webhook  GET /health  POST /internal/notify  POST /internal/send-message');
  startScheduler();
});

export default app;
