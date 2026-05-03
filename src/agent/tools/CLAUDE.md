# src/agent/tools — Tool Definitions

## What lives here

| File | Tools defined |
|---|---|
| `index.ts` | `TOOL_DEFINITIONS` array + `executeTool()` dispatcher |
| `clients.ts` | `get_client`, `upsert_client`, `update_client` |
| `appointments.ts` | `get_available_slots`, `create_appointment`, `list_appointments_for_client`, `reschedule_appointment`, `cancel_appointment` |
| `clinical.ts` | `get_my_allergies`, `get_my_medications`, `get_my_problems`, `get_my_family_history`, `get_my_social_history` |
| `test_results.ts` | `get_my_test_results_list` |
| `notifications.ts` | `send_whatsapp_confirmation` |

## Tool definition format

Each tool file exports an array of `ChatCompletionTool` objects and a handler function. `executeTool()` in `index.ts` routes by `tool.function.name`.

## How tool files are structured

1. **Thin wrapper** — business logic lives in `src/services/`. Tool files only:
   - Define the JSON schema for parameters
   - Call the corresponding service function
   - Format the return value as a string for the LLM

2. **Privacy boundary** — clinical tool files query `clinical.repo.ts` which applies narrow column SELECTs that exclude doctor-only fields. Never add `doctor_note`, diagnosis text, or vital sign readings to clinical tool outputs.

## Adding a new tool

1. Add the `ChatCompletionTool` definition to the appropriate file (or create a new one)
2. Add a handler case in `executeTool()` in `index.ts`
3. Add the tool to `TOOL_DEFINITIONS` exported from `index.ts`
4. Update `src/agent/prompt/sections/tools-ref.ts` if the tool name/purpose needs to be described to the LLM
