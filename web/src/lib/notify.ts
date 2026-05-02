/**
 * Sends a WhatsApp message to a patient via the agent's internal notify endpoint.
 * Called from server actions after the doctor makes manual changes.
 * Failures are logged but never thrown — the DB change always stands.
 */
export async function notifyPatient(waId: string, message: string): Promise<void> {
  const agentUrl = process.env.AGENT_URL;
  const token = process.env.INTERNAL_API_TOKEN;

  if (!agentUrl || !token) {
    console.warn('[NOTIFY] AGENT_URL or INTERNAL_API_TOKEN not set — skipping notification');
    return;
  }

  try {
    const res = await fetch(`${agentUrl}/internal/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': token,
      },
      body: JSON.stringify({ waId, message }),
    });

    if (!res.ok) {
      console.error(`[NOTIFY] Agent returned ${res.status}`);
    }
  } catch (err) {
    console.error('[NOTIFY] Request failed:', err);
  }
}
