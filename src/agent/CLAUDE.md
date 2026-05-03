# src/agent — Agentic Loop

## What lives here

Everything that makes the AI agent work.

| File/Dir | Purpose |
|---|---|
| `loop.ts` | Main agentic loop: LLM → tool calls → repeat → final reply |
| `memory.ts` | Supabase-backed sliding window — last 25 messages per `wa_id` |
| `prompt/` | Modular system prompt assembly (see below) |
| `prompt.ts` | Re-export shim → `prompt/index` |
| `privacy.ts` | Re-export shim → `domain/privacy/policy` |
| `tools/` | Tool definitions + dispatcher (see `tools/CLAUDE.md`) |
| `guardrails/` | Pre-LLM safety checks (see `guardrails/CLAUDE.md`) |

## Agentic loop (`loop.ts`)

1. Load conversation history from Supabase (last 25 messages)
2. Run guardrails — return canned response immediately on `block`
3. Build system prompt with injected Beirut datetime
4. Call GPT-4o-mini with tools
5. If tool calls returned → execute each → append results → repeat from step 4
6. On final text response → return to caller

Max iterations is implicitly bounded by token limits. No explicit loop cap needed.

## Memory (`memory.ts`)

- Keyed by `wa_id` (WhatsApp sender ID)
- Stored in `conversation_messages` table
- Roles: `user`, `assistant`, `tool`, `tool_result`
- `loadHistory(waId)` returns the last 25 messages
- `saveMessage(waId, role, content, ...)` appends one message

## Prompt structure (`prompt/`)

```
prompt/
├── index.ts              buildSystemPrompt() — assembles all sections + injects datetime
└── sections/
    ├── identity.ts       IDENTITY_OPENING + CORE_RULES_SECTION
    ├── tools-ref.ts      TOOLS_REF_SECTION
    ├── flows.ts          FLOWS_SECTION (conversation flows A–J)
    └── business-rules.ts BUSINESS_RULES_SECTION
```

`buildSystemPrompt()` is called fresh on every agent invocation so the Beirut datetime is always current.
