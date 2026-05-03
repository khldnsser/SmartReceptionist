'use client';

import { useState, useTransition } from 'react';
import { sendAdHocMessageAction } from './actions';

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

interface Props {
  clientId: string;
  hasWhatsApp: boolean;
}

export default function MessagePatientButton({ clientId, hasWhatsApp }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [sent, setSent] = useState(false);

  function handleClose() { setOpen(false); setText(''); setErr(''); setSent(false); }

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    startTransition(async () => {
      const res = await sendAdHocMessageAction(clientId, text);
      if (!res.ok) { setErr(res.error ?? 'Failed to send'); return; }
      setSent(true);
      setTimeout(handleClose, 1200);
    });
  }

  if (!hasWhatsApp) {
    return (
      <button
        className="btn-pms btn-pms-ghost btn-pms-sm"
        disabled
        title="No WhatsApp linked to this patient yet"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <WhatsAppIcon />
        Message
      </button>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn-pms btn-pms-ghost btn-pms-sm"
        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <WhatsAppIcon />
        Message
      </button>

      {open && (
        <div className="modal-backdrop" onClick={handleClose}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <button className="modal-close" onClick={handleClose}><XIcon /></button>

            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.374px', marginBottom: 6 }}>
              Message patient
            </h2>
            <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 20 }}>
              Sent via WhatsApp. Appears in the agent's conversation history.
            </p>

            {err && <div className="error-msg" style={{ marginBottom: 16 }}>{err}</div>}

            {sent ? (
              <p style={{ fontSize: 15, color: '#15803d', fontWeight: 500, textAlign: 'center', padding: '12px 0' }}>
                ✓ Message sent
              </p>
            ) : (
              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label className="field-label">Message</label>
                  <textarea
                    rows={4}
                    value={text}
                    onChange={e => setText(e.target.value)}
                    className="pms-input"
                    placeholder="Type a message to send to the patient…"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isPending || !text.trim()}
                  className="btn-pms btn-pms-primary"
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}
                >
                  {isPending ? 'Sending…' : 'Send via WhatsApp'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
