# src/agent/guardrails — Pre-LLM Safety Checks

## What lives here

| File | Purpose |
|---|---|
| `index.ts` | `runGuardrails(input)` → `GuardrailResult` (`pass` \| `block`) |
| `out-of-scope.ts` | `checkOutOfScope()` — regex-based emergency detection |
| `privacy.ts` | Re-exports `PRIVACY_POLICY` from `src/domain/privacy/policy` |

## How guardrails work

`runGuardrails(input)` is called in `src/agent/loop.ts` **before** every LLM call. If it returns `{ action: 'block', response }`, the loop returns the canned response immediately without invoking the LLM.

```ts
const result = runGuardrails(userMessage);
if (result.action === 'block') return result.response ?? '';
// else proceed to LLM
```

## Current checks

**Emergency detection** (`out-of-scope.ts`): Matches keywords like "emergency", "heart attack", "ambulance", "call 112", etc. Responds with a direct instruction to call emergency services.

## Adding a new guardrail

1. Create a check function in a new file (e.g., `rate-limit.ts`)
2. Call it from `runGuardrails()` in `index.ts`
3. Return `{ action: 'block', response: '...' }` to short-circuit, or `{ action: 'pass' }` to continue

Keep checks fast — they run on every message before the LLM.
