'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createAppointmentAction } from '@/app/(dashboard)/calendar/actions';

type ApptType = 'initial' | 'follow_up' | 'procedure' | 'telemedicine';

interface Client {
  id: string;
  name: string | null;
  wa_id: string | null;
  email: string | null;
}

interface Props {
  clients: Client[];
  defaultDate?: string;
  onClose: () => void;
}

const APPT_TYPES: { value: ApptType; label: string; defaultDuration: number }[] = [
  { value: 'initial',     label: 'Initial consult',  defaultDuration: 60 },
  { value: 'follow_up',   label: 'Follow-up',        defaultDuration: 30 },
  { value: 'procedure',   label: 'Procedure',        defaultDuration: 60 },
  { value: 'telemedicine',label: 'Telemedicine',     defaultDuration: 30 },
];

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function CreateEventModal({ clients, defaultDate, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(defaultDate ?? '');
  const [apptType, setApptType] = useState<ApptType>('follow_up');
  const [duration, setDuration] = useState(30);
  const [intakeForm, setIntakeForm] = useState('');
  const [err, setErr] = useState('');

  const selectedClient = clients.find(c => c.id === clientId);

  function handleTypeChange(t: ApptType) {
    setApptType(t);
    setDuration(APPT_TYPES.find(x => x.value === t)!.defaultDuration);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!clientId) { setErr('Please select a patient'); return; }
    if (!date) { setErr('Please pick a date and time'); return; }

    startTransition(async () => {
      const res = await createAppointmentAction(
        clientId,
        selectedClient!.wa_id,
        selectedClient!.name ?? 'Patient',
        date + ':00',
        intakeForm || undefined,
        apptType,
        duration,
      );
      if (!res.ok) { setErr(res.error ?? 'Failed'); return; }
      router.refresh();
      onClose();
    });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><XIcon /></button>

        <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.374px', marginBottom: 24 }}>
          New appointment
        </h2>

        {err && <div className="error-msg" style={{ marginBottom: 16 }}>{err}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="field-label">Patient</label>
            <select
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              className="pms-input"
            >
              <option value="">Select a patient…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name ?? 'Unnamed'}{c.email ? ` — ${c.email}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">Type</label>
              <select
                value={apptType}
                onChange={e => handleTypeChange(e.target.value as ApptType)}
                className="pms-input"
              >
                {APPT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div style={{ width: 110 }}>
              <label className="field-label">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value, 10) || 30)}
                className="pms-input"
                min={5}
                max={480}
                step={5}
              />
            </div>
          </div>

          <div>
            <label className="field-label">Date & time (Beirut)</label>
            <input
              type="datetime-local"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="pms-input"
            />
          </div>

          <div>
            <label className="field-label">Topic / intake (optional)</label>
            <textarea
              rows={3}
              value={intakeForm}
              onChange={e => setIntakeForm(e.target.value)}
              placeholder="What will be discussed…"
              className="pms-input"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="btn-pms btn-pms-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 20px', fontSize: 15 }}
          >
            {isPending ? 'Creating…' : 'Create appointment'}
          </button>
        </form>
      </div>
    </div>
  );
}
