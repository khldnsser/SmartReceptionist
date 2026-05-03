# src/core — Foundation Layer

## What lives here

| File | Purpose |
|---|---|
| `config.ts` | Zod-validated env config — single source of truth for all env vars |
| `logger.ts` | Pino structured logger |
| `errors.ts` | App-wide error class hierarchy |

## Config

`config.ts` exports a single `config` object. All env vars are read once at startup; the process exits immediately if any required var is missing.

**Never** call `process.env.*` directly anywhere else. Always import from `config`.

```ts
import { config } from '../core/config';
config.port           // PORT
config.openai.apiKey  // OPENAI_API_KEY
config.supabase.url   // SUPABASE_URL
```

## Logger

`logger.ts` exports a Pino instance. Pretty-printed in dev (`NODE_ENV !== 'production'`), JSON in prod.

```ts
import { logger } from '../core/logger';
logger.info({ appointmentId }, 'Appointment created');
logger.error({ err }, 'Something failed');
```

**Never** use `console.log` / `console.error` anywhere. All logging goes through `logger`.

## Error classes

```
AppError (base — has statusCode)
├── NotFoundError      (404)
├── ValidationError    (400)
└── UnauthorizedError  (401)
```

Throw these from services/routes; the HTTP error handler in `src/http/middleware/error-handler.ts` converts them to the right status codes.
