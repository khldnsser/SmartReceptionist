# Migration Plan: N8N AI Receptionist to Code

## Overview

Migrate the N8N-based AI receptionist workflow to a standalone codebase. The system receives multi-modal WhatsApp messages from clinic clients, processes them through an AI agent that can book/cancel/reschedule appointments, and responds via WhatsApp.

---

## Current N8N Workflow Summary

```
WhatsApp Trigger
  └─ Route by message type (text / audio / image / document)
       ├─ Text ──────────────────────────────────────────────────────┐
       ├─ Audio → download → OpenAI transcription ──────────────────┤
       ├─ Image → download → OpenAI vision analysis ────────────────┤
       └─ Document → download → route by MIME → extract content ────┤
                                                                    ▼
                                                         Knowledge Base Agent
                                                         (GPT-4o-mini + memory)
                                                         Tools: Calendar CRUD,
                                                         Sheets CRUD, Gmail
                                                                    │
                                                                    ▼
                                                          WhatsApp Response
```

### External Services Used
| Service | Purpose |
|---|---|
| WhatsApp Business API | Inbound webhook + outbound messages |
| OpenAI GPT-4o-mini | LLM for the agent, audio transcription, image analysis |
| Google Calendar | Read/create/delete appointment events |
| Google Sheets | Patient records (Email, Name, Phone, Time Zone, Appointment Date, Booking Status, Intake Form, Reminder Sent) |
| Gmail | Send booking confirmation emails |

### Business Rules
- Timezone: Beirut (EET/EEST)
- Appointment duration: 30 minutes (default)
- Office hours: Mon-Fri, 09:00-12:00 and 13:00-17:00
- Minimum booking lead time: 24 hours
- Patient identifier: email address
- Agent offers next 5 available slots

---

## Stage 1: Project Scaffolding & Configuration

**Goal:** Set up the project structure, dependency management, environment config, and shared types.

### Tasks
1. Initialize the project (language/framework TBD — e.g., Node.js/TypeScript or Python)
2. Set up environment variable management for all API keys and secrets
3. Define shared TypeScript types / data models

### Configuration Schema
```
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_API_TOKEN
WHATSAPP_VERIFY_TOKEN
WHATSAPP_APP_SECRET

OPENAI_API_KEY

GOOGLE_CALENDAR_ID
GOOGLE_SERVICE_ACCOUNT_KEY  (or OAuth credentials)

GOOGLE_SHEET_ID
GOOGLE_SHEET_NAME           (default: "Appointments")

GMAIL_CREDENTIALS

TIMEZONE                    (default: "Asia/Beirut")
APPOINTMENT_DURATION_MIN    (default: 30)
OFFICE_HOURS_START_AM       (default: "09:00")
OFFICE_HOURS_END_AM         (default: "12:00")
OFFICE_HOURS_START_PM       (default: "13:00")
OFFICE_HOURS_END_PM         (default: "17:00")
MIN_BOOKING_LEAD_HOURS      (default: 24)
SLOTS_TO_OFFER              (default: 5)
```

### Shared Data Models

```
Patient {
  email: string            // unique identifier
  name: string
  phone: string
  timeZone: string         // location/city
  appointmentDate: string
  bookingStatus: "confirmed" | "cancelled"
  intakeForm: string       // discussion topic
  reminderSent: boolean
}

IncomingMessage {
  type: "text" | "audio" | "image" | "document"
  from: string             // WhatsApp phone number (wa_id)
  messageId: string
  timestamp: string
  text?: string
  mediaId?: string
  mimeType?: string
  caption?: string
}

AgentResponse {
  text: string
  toolCalls?: ToolCall[]
}
```

### Deliverables
- [ ] Project initialized with package manager / dependency lockfile
- [ ] `.env.example` with all required variables
- [ ] Shared types/models defined
- [ ] Logger utility configured
- [ ] Project directory structure created

---

## Stage 2: WhatsApp Integration Layer

**Goal:** Handle inbound WhatsApp webhooks and send outbound messages.

### Module: `whatsapp/`

#### 2A — Webhook Server

**Input:** HTTP POST from WhatsApp Cloud API
**Output:** Parsed `IncomingMessage`

```
WebhookPayload (raw WhatsApp Cloud API payload)
  └─ parse & validate
       └─ IncomingMessage { type, from, messageId, timestamp, text?, mediaId?, mimeType?, caption? }
```

Tasks:
1. Set up HTTP server (e.g., Express/Fastify or FastAPI)
2. Implement webhook verification endpoint (`GET` with hub.verify_token)
3. Implement webhook handler (`POST`) that parses the WhatsApp payload
4. Extract message metadata: sender wa_id, message type, content/media ID
5. Emit/return a normalized `IncomingMessage` object

#### 2B — Message Sender

**Input:** `{ to: string, text: string }`
**Output:** WhatsApp API response (message ID)

Tasks:
1. Implement `sendTextMessage(to, text)` using WhatsApp Cloud API
2. Handle message splitting if response exceeds WhatsApp character limits
3. Add rate limiting / retry logic

#### 2C — Media Downloader

**Input:** `{ mediaId: string }`
**Output:** `{ buffer: Buffer, mimeType: string }`

Tasks:
1. Implement `getMediaUrl(mediaId)` — calls WhatsApp API to get download URL
2. Implement `downloadMedia(url)` — downloads binary content with auth headers
3. Return buffer + detected MIME type

### Deliverables
- [ ] Webhook verification endpoint
- [ ] Webhook POST handler returning `IncomingMessage`
- [ ] `sendTextMessage()` function
- [ ] `getMediaUrl()` + `downloadMedia()` functions
- [ ] Unit tests for payload parsing

---

## Stage 3: Media Processing Pipeline

**Goal:** Convert all non-text media into text that can be passed to the AI agent.

### Module: `media/`

#### 3A — Audio Processor

**Input:** `{ buffer: Buffer, mimeType: string }`
**Output:** `{ text: string }` (transcribed text)

Tasks:
1. Send audio buffer to OpenAI Whisper API (`audio.translations` endpoint)
2. Return transcribed/translated text

#### 3B — Image Processor

**Input:** `{ buffer: Buffer, mimeType: string, caption?: string }`
**Output:** `{ text: string }` (description + caption)

Tasks:
1. Convert buffer to base64
2. Send to OpenAI Vision API (GPT-4o-mini `image.analyze`)
3. Combine AI description with user caption
4. Return formatted text: `"User image description: {description}\nUser image caption: {caption}"`

#### 3C — Document Processor

**Input:** `{ buffer: Buffer, mimeType: string, caption?: string }`
**Output:** `{ text: string }` (extracted content + caption)

Supported MIME types and extraction strategy:

| MIME Type | Strategy |
|---|---|
| `text/csv`, `text/html`, `text/calendar`, `text/rtf`, `text/plain`, `text/xml`, `application/xml` | Decode buffer to UTF-8 string |
| `application/pdf` | PDF parser library (e.g., `pdf-parse` or `PyPDF2`) |
| `application/json` | JSON.parse → stringify |
| `application/vnd.ms-excel` | XLS parser library |
| `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | XLSX parser library |
| Everything else | Return "unsupported" flag |

Tasks:
1. Implement MIME type router
2. Implement extraction for each supported type
3. Format output: `"Parsed text: {content}\nCaption text: {caption}\nMimeType: {mime}"`
4. Handle unsupported types by returning a flag so the caller can send an error message

#### 3D — Unified Media Router

**Input:** `IncomingMessage`
**Output:** `{ text: string }` — normalized text ready for the agent

```
IncomingMessage
  ├─ type: "text"     → return message.text
  ├─ type: "audio"    → downloadMedia → AudioProcessor → text
  ├─ type: "image"    → downloadMedia → ImageProcessor → text
  └─ type: "document" → downloadMedia → DocumentProcessor → text
                                              └─ unsupported? → return error text
```

Tasks:
1. Implement router that delegates to the correct processor based on `IncomingMessage.type`
2. Handle the unsupported document case (send WhatsApp error message directly)

### Deliverables
- [ ] `processAudio(buffer)` → text
- [ ] `processImage(buffer, caption)` → text
- [ ] `processDocument(buffer, mimeType, caption)` → text (with all MIME handlers)
- [ ] `processMessage(IncomingMessage)` → text (unified router)
- [ ] Unit tests for each processor with sample files

---

## Stage 4: External Service Integrations (Agent Tools)

**Goal:** Implement each external service the AI agent can invoke as a standalone, testable module with clear I/O.

### Module: `tools/`

#### 4A — Google Calendar Service

**Input/Output per operation:**

| Operation | Input | Output |
|---|---|---|
| `listEvents(timeMin, timeMax?)` | Date range | `CalendarEvent[]` |
| `createEvent(summary, start, end)` | Event details | `CalendarEvent` (created) |
| `deleteEvent(eventId)` | Event ID | `{ success: boolean }` |

```
CalendarEvent {
  id: string
  summary: string
  start: string   // ISO datetime
  end: string     // ISO datetime
}
```

Tasks:
1. Set up Google Calendar API client with service account or OAuth
2. Implement `listEvents()` — used to check availability
3. Implement `createEvent()` — used to book appointments
4. Implement `deleteEvent()` — used for cancellation and rescheduling

#### 4B — Google Sheets Service (Patient Records)

**Input/Output per operation:**

| Operation | Input | Output |
|---|---|---|
| `readAllRows()` | — | `Patient[]` |
| `findByEmail(email)` | Email string | `Patient \| null` |
| `addRow(patient)` | Partial `Patient` | `Patient` (created) |
| `updateRow(email, fields)` | Email + partial fields | `Patient` (updated) |

Tasks:
1. Set up Google Sheets API client
2. Implement CRUD operations matching current sheet schema
3. Email is the match key for updates

#### 4C — Gmail Service

**Input/Output:**

| Operation | Input | Output |
|---|---|---|
| `sendConfirmationEmail(to, subject, body)` | Email details | `{ messageId: string }` |

Tasks:
1. Set up Gmail API client
2. Implement `sendConfirmationEmail()` with the booking details template

#### 4D — Availability Calculator

**Input:** `{ currentTime: Date, calendarEvents: CalendarEvent[] }`
**Output:** `{ slots: TimeSlot[] }` (next N available 30-min slots)

```
TimeSlot {
  start: string   // ISO datetime in Beirut TZ
  end: string
}
```

Tasks:
1. Implement office hours logic (Mon-Fri, 09:00-12:00 and 13:00-17:00 Beirut)
2. Implement conflict detection against existing calendar events
3. Enforce 24-hour minimum lead time
4. Return next N available slots (configurable, default 5)

### Deliverables
- [ ] `CalendarService` with list/create/delete
- [ ] `SheetsService` with read/find/add/update
- [ ] `GmailService` with sendConfirmationEmail
- [ ] `AvailabilityCalculator` with getNextAvailableSlots
- [ ] Integration tests for each service (can use mocks for CI, real APIs for local)

---

## Stage 5: AI Agent & Conversation Management

**Goal:** Implement the core AI agent with tool calling, system prompt, and per-user conversation memory.

### Module: `agent/`

#### 5A — Conversation Memory Store

**Input/Output:**

| Operation | Input | Output |
|---|---|---|
| `getHistory(sessionId)` | WhatsApp wa_id | `Message[]` (up to 15) |
| `addMessage(sessionId, role, content)` | Session + message | void |
| `clearHistory(sessionId)` | Session ID | void |

Tasks:
1. Implement a conversation memory store (in-memory with optional persistence — Redis, SQLite, etc.)
2. Key by WhatsApp wa_id (matching N8N's `memory_{{ wa_id }}`)
3. Maintain a sliding window of the last 15 messages (matching N8N config)

#### 5B — Tool Definitions for the LLM

Define tool schemas that the LLM can call (OpenAI function calling format):

```
tools:
  - calendar_read:      { description, parameters: { timeMin, timeMax? } }
  - calendar_create:    { description, parameters: { summary, start, end } }
  - calendar_delete:    { description, parameters: { eventId } }
  - sheets_read:        { description, parameters: {} }
  - sheets_add_row:     { description, parameters: { email } }
  - sheets_update_row:  { description, parameters: { email, name?, phone?, timeZone?, appointmentDate?, bookingStatus?, intakeForm? } }
  - gmail_send:         { description, parameters: { to, subject, message } }
```

Tasks:
1. Define each tool schema in OpenAI function calling format
2. Implement a tool executor that dispatches to the Stage 4 service methods
3. Handle tool call results and feed them back to the LLM

#### 5C — System Prompt

Tasks:
1. Extract the system prompt from N8N (the large prompt in the "Knowledge Base Agent" node)
2. Template it with dynamic values: current datetime, timezone, office hours config
3. Store as a configurable template

#### 5D — Agent Loop

**Input:** `{ sessionId: string, userMessage: string }`
**Output:** `{ responseText: string }`

```
userMessage
  └─ load conversation history (5A)
       └─ build messages array [system prompt (5C) + history + user message]
            └─ call OpenAI Chat Completions API (with tools)
                 ├─ if tool_calls → execute tools (5B → Stage 4) → feed results back → loop
                 └─ if text response → save to memory → return responseText
```

Tasks:
1. Implement the agent loop: send messages to LLM, handle tool calls iteratively, return final text
2. Support multi-turn tool calling (agent may call multiple tools before responding)
3. Save both user and assistant messages to memory after each turn
4. Use GPT-4o-mini (matching current setup) — make model configurable

### Deliverables
- [ ] `ConversationMemory` class with get/add/clear
- [ ] Tool definitions and executor
- [ ] System prompt template with variable injection
- [ ] `AgentLoop.run(sessionId, userMessage)` → responseText
- [ ] End-to-end test: text input → agent response with tool calls

---

## Stage 6: Main Orchestrator & End-to-End Wiring

**Goal:** Wire all stages together into a single request lifecycle.

### Module: `app.ts` / `main.py` (entry point)

```
Incoming WhatsApp Webhook (Stage 2A)
  │
  ▼
Parse into IncomingMessage (Stage 2A)
  │
  ▼
Process media into text (Stage 3D)
  │
  ├─ unsupported document? → send error via WhatsApp (Stage 2B) → done
  │
  ▼
Run Agent (Stage 5D)
  │  sessionId = message.from (wa_id)
  │  userMessage = processed text
  │
  ▼
Send agent response via WhatsApp (Stage 2B)
  │
  ▼
Done
```

Tasks:
1. Wire webhook handler → media processor → agent → WhatsApp sender
2. Add top-level error handling (catch & notify user of errors gracefully)
3. Add request logging / tracing (correlate by message ID)
4. Handle WhatsApp webhook status updates (delivery receipts, etc.) — ignore non-message events

### Deliverables
- [ ] Main request handler wiring all stages
- [ ] Error handling middleware
- [ ] Request logging with correlation IDs
- [ ] Webhook event filtering (ignore non-message events)

---

## Stage 7: Deployment & Infrastructure

**Goal:** Make the application production-ready and deployable.

### Tasks
1. Containerize the application (Dockerfile)
2. Set up health check endpoint (`GET /health`)
3. Configure HTTPS (required by WhatsApp webhooks)
4. Set up structured logging
5. Add graceful shutdown handling
6. Write deployment configuration (docker-compose, or cloud-specific: Railway, Fly.io, AWS, etc.)
7. Set up environment variable management for production

### Deliverables
- [ ] Dockerfile
- [ ] docker-compose.yml (for local dev)
- [ ] Health check endpoint
- [ ] Deployment documentation

---

## Stage 8: Testing & Validation

**Goal:** Ensure feature parity with the N8N workflow.

### Test Matrix

| Scenario | Input | Expected Behavior |
|---|---|---|
| Text message — new patient booking | "I'd like to book an appointment" | Agent asks for email, then name, phone, location, topic, offers slots |
| Text message — existing patient | Email already in sheet | Agent recognizes patient, skips re-collection unless requested |
| Audio message | Voice note | Transcribed → agent processes as text |
| Image message | Photo with caption | Described → agent processes description + caption |
| Document — PDF | PDF attachment | Extracted text → agent processes |
| Document — XLSX | Spreadsheet | Extracted data → agent processes |
| Document — unsupported | .exe file | "Unsupported file type" error message |
| Appointment booking | Full flow | Calendar event created, sheet updated, confirmation email sent |
| Rescheduling | "I need to reschedule" | Old event deleted, new event created, sheet + email updated |
| Cancellation | "Cancel my appointment" | Event deleted, sheet status → cancelled |
| Slot availability | Existing calendar events | Only non-conflicting office-hour slots offered |
| Off-hours request | "Book me at 8pm" | Agent offers closest valid alternatives |
| Weekend request | "Book Saturday" | Agent explains Mon-Fri only, offers alternatives |

### Tasks
1. Unit tests for each module (Stages 2-5)
2. Integration tests for service modules against real APIs (Stage 4)
3. End-to-end tests simulating full WhatsApp webhook → response flow
4. Manual testing with actual WhatsApp messages

### Deliverables
- [ ] Unit test suite with >80% coverage on business logic
- [ ] Integration test suite for external services
- [ ] End-to-end test harness
- [ ] Test results documenting feature parity with N8N workflow

---

## Proposed Directory Structure

```
src/
├── config/             # Environment vars, constants, office hours config
│   └── index.ts
├── whatsapp/           # Stage 2: WhatsApp integration
│   ├── webhook.ts      # Webhook verification + handler
│   ├── sender.ts       # Send outbound messages
│   ├── media.ts        # Download media files
│   └── types.ts        # WhatsApp-specific types
├── media/              # Stage 3: Media processing
│   ├── audio.ts        # Whisper transcription
│   ├── image.ts        # Vision analysis
│   ├── document.ts     # Document extraction (PDF, XLSX, CSV, etc.)
│   └── router.ts       # Unified message → text router
├── tools/              # Stage 4: External service integrations
│   ├── calendar.ts     # Google Calendar CRUD
│   ├── sheets.ts       # Google Sheets CRUD
│   ├── gmail.ts        # Gmail send
│   └── availability.ts # Slot availability calculator
├── agent/              # Stage 5: AI agent
│   ├── memory.ts       # Conversation memory store
│   ├── tools.ts        # Tool definitions + executor
│   ├── prompt.ts       # System prompt template
│   └── loop.ts         # Agent execution loop
├── app.ts              # Stage 6: Main orchestrator
└── server.ts           # HTTP server entry point
```

---

## Stage Dependency Graph

```
Stage 1 (Scaffolding)
  └─► Stage 2 (WhatsApp) ──────────────────────┐
  └─► Stage 3 (Media) ─── depends on 2C ───────┤
  └─► Stage 4 (Tools) ─────────────────────────┐│
                                                ▼▼
                                    Stage 5 (Agent) ── depends on 4 + 3
                                                │
                                                ▼
                                    Stage 6 (Orchestrator) ── depends on 2 + 3 + 5
                                                │
                                                ▼
                                    Stage 7 (Deployment)
                                                │
                                                ▼
                                    Stage 8 (Testing) ── ongoing from Stage 2
```

Stages 2, 3, and 4 can be developed in parallel after Stage 1 is complete (Stage 3 depends on 2C for media download, but the processors themselves are independent).

---

## Notes

- **LLM choice:** Currently using GPT-4o-mini. The codebase should make this swappable (abstract the LLM client).
- **Data store migration:** Google Sheets works for MVP but should be replaced with a proper database for scalability. The `SheetsService` interface makes this a drop-in swap.
- **Memory store:** N8N uses an in-memory buffer window (15 messages). For production, use Redis or a database-backed store to survive restarts.
- **Security:** WhatsApp webhook payloads should be validated using the app secret (HMAC signature verification). Never log full message content in production.
- **Idempotency:** WhatsApp may deliver duplicate webhooks. Deduplicate by message ID.
