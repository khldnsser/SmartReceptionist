# Project Context for Claude

## What This Is

AI receptionist for a medical clinic in Beirut. Patients message via WhatsApp (text, audio, image, document). An AI agent handles appointment booking, rescheduling, and cancellation using Google Calendar, Sheets, and Gmail.

Migrated from an N8N workflow (`FYP.json`) to a standalone TypeScript/Node.js codebase.

## Architecture

```
WhatsApp Webhook POST
  └─ Parse message type
       ├─ text     → pass through
       ├─ audio    → Whisper transcription
       ├─ image    → GPT-4o-mini vision
       └─ document → PDF/XLSX/CSV/text extraction
                          │
                          ▼
                   AI Agent (GPT-4o-mini)
                   Session memory (15 msgs, keyed by wa_id)
                   Tools: calendar CRUD, sheets CRUD, gmail send
                          │
                          ▼
                   WhatsApp text reply
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Server:** Express
- **LLM:** OpenAI GPT-4o-mini (configurable)
- **Audio:** OpenAI Whisper
- **Image:** GPT-4o-mini vision
- **Google APIs:** googleapis + service account (Calendar, Sheets) + OAuth2 (Gmail)
- **Timezone:** Luxon
- **Documents:** pdf-parse, xlsx

## Directory Structure

```
src/
├── config/index.ts        — env var loading + validation
├── whatsapp/
│   ├── types.ts           — IncomingMessage, webhook payload types
│   ├── webhook.ts         — GET verification + POST payload parsing
│   ├── sender.ts          — sendTextMessage(), markAsRead()
│   └── media.ts           — downloadMedia() via WhatsApp Cloud API
├── media/
│   ├── audio.ts           — Whisper transcription
│   ├── image.ts           — vision analysis
│   ├── document.ts        — PDF/XLSX/XLS/CSV/JSON/text extraction
│   └── router.ts          — routeMessageToText() dispatcher
├── tools/
│   ├── calendar.ts        — Google Calendar list/create/delete
│   ├── sheets.ts          — Google Sheets read/find/add/update (keyed by email)
│   ├── gmail.ts           — Gmail send via OAuth2
│   └── availability.ts    — next-N-slots calculator
├── agent/
│   ├── memory.ts          — in-memory sliding window (15 msgs per session)
│   ├── tools.ts           — 7 tool definitions + executor
│   ├── prompt.ts          — system prompt with datetime injection
│   └── loop.ts            — agentic loop (LLM → tool calls → repeat → reply)
├── app.ts                 — orchestrator: webhook → media → agent → reply
└── server.ts              — Express server with /webhook, /health, /auth/callback
```

## Business Rules

- Timezone: `Asia/Beirut` (EET/EEST)
- Appointments: 30 min default
- Office hours: Mon–Fri 09:00–12:00, 13:00–17:00
- Min lead time: 24 hours
- Patient ID: email address
- Agent offers next 5 available slots
- Google Sheet columns: Email | Name | Phone | Time Zone | Appointment Date | Booking Status | Intake Form | Reminder Sent

## External Services

| Service | Auth Method | Config Keys |
|---|---|---|
| WhatsApp Cloud API | Bearer token | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` |
| OpenAI | API key | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Google Calendar | Service account JSON | `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`, `GOOGLE_CALENDAR_ID` |
| Google Sheets | Service account JSON | `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`, `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_NAME` |
| Gmail | OAuth2 refresh token | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER` |

## Migration Plan Status

| Stage | Description | Status |
|---|---|---|
| 1 | Project scaffolding, config, types | Done |
| 2 | WhatsApp integration (webhook, sender, media) | Done |
| 3 | Media processing (audio, image, document, router) | Done |
| 4 | Tools (calendar, sheets, gmail, availability) | Done |
| 5 | AI agent (memory, tools, prompt, loop) | Done |
| 6 | Orchestrator (app.ts, server.ts) | Done |
| 7 | Deployment & infrastructure | Not started |
| 8 | Testing & validation | Not started |

Stages 1–6 produce a working end-to-end system. Stages 7–8 are production-readiness.

## Key Decisions

- **Memory is in-memory Map** — survives within process but not restarts. Swap to Redis/DB later.
- **Google Sheets as patient DB** — matches N8N setup. Abstract behind `SheetsService` interface for future DB swap.
- **LLM is configurable** — `OPENAI_MODEL` env var, default `gpt-4o-mini`.
- **Audio uses transcription** (not translation) — preserves original language for Lebanese patients.
- **Debug logging** is currently enabled in `app.ts` — remove for production.

## N8N Source of Truth

The original N8N workflow is in `FYP.json`. Key details extracted:
- System prompt is in the "Knowledge Base Agent" node (first node in the file)
- Calendar ID: references a `@group.calendar.google.com` address
- Sheet: "Appointments" tab with 8 columns, email as unique key
- Agent tools: Calendar Read/Create/Delete, Sheets Read/Add/Update, Gmail Send
- Memory: buffer window of 15 messages, keyed by `memory_{wa_id}`
- Model: GPT-4o-mini
- Supported doc types: CSV, HTML, Calendar, RTF, TXT, XML, PDF, JSON, XLS, XLSX
