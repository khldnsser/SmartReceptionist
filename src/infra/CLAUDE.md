# src/infra — Infrastructure Layer

## What lives here

Singleton clients for external services. Nothing else — no business logic.

| File | What it wraps |
|---|---|
| `supabase/client.ts` | Supabase service-role client (bypasses RLS) |
| `openai/client.ts` | OpenAI client |
| `whatsapp/client.ts` | Re-exports from `src/whatsapp/` (sender + media) |

## Usage pattern

Each file exports a pre-constructed singleton. Import and use — do not call `new` again elsewhere.

```ts
import { supabase } from '../infra/supabase/client';
import { openai }   from '../infra/openai/client';
import { sendTextMessage } from '../infra/whatsapp/client';
```

## Rules

1. **No business logic here.** These files are pure infrastructure — they construct clients and export them.
2. **One instance per service.** Never instantiate `createClient()` or `new OpenAI()` outside this directory.
3. **To add a new infra client:** create `src/infra/<service>/client.ts`, export the singleton, import it wherever needed.
