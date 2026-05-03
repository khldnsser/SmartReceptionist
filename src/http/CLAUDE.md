# src/http — HTTP Layer

## What lives here

Express app assembly and all route handlers.

```
http/
├── index.ts               Assembles Express app, mounts routers + error handler
├── middleware/
│   ├── auth.ts            requireInternalToken — validates X-Internal-Token header
│   └── error-handler.ts   Express error boundary — maps AppError to status codes
└── routes/
    ├── health.ts          GET /health
    ├── internal.ts        POST /internal/notify, POST /internal/send-message
    └── webhook.ts         GET /webhook (verification), POST /webhook (message handler)
```

## Auth middleware

`requireInternalToken` is applied to the `/internal` router. It checks the `X-Internal-Token` header against `config.internalApiToken`. All internal routes require this token — it is shared between the agent server and the PMS.

## Route responsibilities

| Route | Handler |
|---|---|
| `GET /health` | Returns `{ status: 'ok' }` |
| `GET /webhook` | WhatsApp webhook verification (token challenge) |
| `POST /webhook` | Receives incoming WhatsApp messages, delegates to `src/app.ts` |
| `POST /internal/notify` | PMS → agent: send notification to patient via WhatsApp |
| `POST /internal/send-message` | PMS → agent: send ad-hoc message to patient |

## Error handling

The error handler at the bottom of `index.ts` catches any thrown `AppError` (or subclass) and responds with the appropriate status code. Unrecognised errors return 500. Always use `next(err)` in route handlers rather than `res.status(500)`.
