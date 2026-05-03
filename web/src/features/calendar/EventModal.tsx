'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleAppointmentAction, cancelAppointmentAction } from './actions';
import { saveVisitSummary, getVisitSummaryByAppointmentId } from '@/features/visit-summaries/actions';

const TYPE_LABELS: Record<string, string> = {
  initial:     'Initial consult',
  follow_up:   'Follow-up',
  procedure:   'Procedure',
  telemedicine:'Telemedicine',
};

export interface CalendarEventProps {
  id: string;
  title: string;
  start: string;
  end: string;
  status: 'booked' | 'completed' | 'cancelled' | 'missed';
  intakeForm: string | null;
  appointmentType: string;
  durationMinutes: number;
  clientName: string;
  clientId: string;
  waId: string | null;
  email: string | null;
}

interface Props {
  event: CalendarEventProps | null;
  onClose: () => void;
}

function formatDisplay(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    timeZone: 'Asia/Beirut',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toLocalDatetimeValue(iso: string) {
  const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Beirut' }));
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

interface ExistingSummary {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  treatment: string | null;
  follow_up: string | null;
}

const STATUS_BADGE: Record<string, { cls: string }> = {
  booked:    { cls: 'badge-blue' },
  completed: { cls: 'badge-gray' },
  cancelled: { cls: 'badge-red' },
  missed:    { cls: 'badge-orange' },
};

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function EventModal({ event, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'view' | 'reschedule' | 'cancel' | 'summary'>('view');
  const [newDate, setNewDate] = useState('');
  const [err, setErr] = useState('');
  const [existingSummary, setExistingSummary] = useState<ExistingSummary | null | undefined>(undefined);
  const [summaryLoading, setSummaryLoading] = useState(false);

  async function openSummary() {
    setSummaryLoading(true);
    const s = await getVisitSummaryByAppointmentId(event!.id);
    setExistingSummary(s);
    setSummaryLoading(false);
    setMode('summary');
  }

  function handleSaveSummary(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await saveVisitSummary(formData);
      router.refresh();
      setMode('view');
    });
  }

  if (!event) return null;

  function handleReschedule() {
    if (!newDate || !event) { setErr('Please pick a date and time'); return; }
    setErr('');
    const e = event;
    startTransition(async () => {
      const res = await rescheduleAppointmentAction(e.id, newDate + ':00', e.waId, e.clientName, e.start);
      if (!res.ok) { setErr(res.error ?? 'Failed'); return; }
      router.refresh();
      onClose();
    });
  }

  function handleCancel() {
    if (!event) return;
    const e = event;
    startTransition(async () => {
      const res = await cancelAppointmentAction(e.id, e.start, e.waId, e.clientName);
      if (!res.ok) { setErr(res.error ?? 'Failed'); return; }
      router.refresh();
      onClose();
    });
  }

  const badge = STATUS_BADGE[event.status] ?? { cls: 'badge-gray' };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><XIcon /></button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 15 }}>
            {event.clientName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.374px', margin: 0 }}>
              {event.clientName}
            </h2>
            {event.email && <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 2 }}>{event.email}</p>}
          </div>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
          <div>
            <p className="section-label" style={{ marginBottom: 4 }}>Date & time</p>
            <p style={{ fontSize: 15, color: 'var(--ink)' }}>{formatDisplay(event.start)}</p>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            <div>
              <p className="section-label" style={{ marginBottom: 4 }}>Status</p>
              <span className={`badge ${badge.cls}`}>{event.status}</span>
            </div>
            <div>
              <p className="section-label" style={{ marginBottom: 4 }}>Type</p>
              <p style={{ fontSize: 14, color: 'var(--ink-muted)' }}>
                {TYPE_LABELS[event.appointmentType] ?? event.appointmentType} · {event.durationMinutes} min
              </p>
            </div>
          </div>
          {event.intakeForm && (
            <div>
              <p className="section-label" style={{ marginBottom: 4 }}>Topic</p>
              <p style={{ fontSize: 15, color: 'var(--ink-muted)' }}>{event.intakeForm}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {err && <div className="error-msg" style={{ marginBottom: 16 }}>{err}</div>}

        {/* Reschedule form */}
        {mode === 'reschedule' && (
          <div style={{ marginBottom: 20, background: 'var(--parchment)', borderRadius: 'var(--r-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>New date & time (Beirut)</p>
            <input
              type="datetime-local"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="pms-input"
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-pms btn-pms-primary btn-pms-sm" disabled={isPending} onClick={handleReschedule} style={{ flex: 1, justifyContent: 'center' }}>
                {isPending ? 'Saving…' : 'Confirm reschedule'}
              </button>
              <button className="btn-pms btn-pms-ghost btn-pms-sm" onClick={() => setMode('view')}>Back</button>
            </div>
          </div>
        )}

        {/* Cancel confirm */}
        {mode === 'cancel' && (
          <div style={{ marginBottom: 20, background: 'rgba(217,48,37,0.06)', border: '1px solid rgba(217,48,37,0.2)', borderRadius: 'var(--r-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 14, color: 'var(--red)' }}>Cancel this appointment? The patient will be notified via WhatsApp.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-pms btn-pms-danger btn-pms-sm" disabled={isPending} onClick={handleCancel} style={{ flex: 1, justifyContent: 'center' }}>
                {isPending ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button className="btn-pms btn-pms-ghost btn-pms-sm" onClick={() => setMode('view')}>Back</button>
            </div>
          </div>
        )}

        {/* Summary form */}
        {mode === 'summary' && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 14 }}>
              {existingSummary ? 'Edit visit summary' : 'Add visit summary'}
            </p>
            {summaryLoading ? (
              <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>Loading…</p>
            ) : (
              <form onSubmit={handleSaveSummary} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input type="hidden" name="client_id" value={event.clientId} />
                <input type="hidden" name="appointment_id" value={event.id} />
                {existingSummary && <input type="hidden" name="id" value={existingSummary.id} />}
                {(['diagnosis', 'notes', 'treatment', 'follow_up'] as const).map((field) => (
                  <div key={field}>
                    <label className="field-label">{field.replace('_', '-')}</label>
                    <textarea
                      name={field}
                      defaultValue={existingSummary?.[field] ?? ''}
                      rows={field === 'notes' ? 3 : 2}
                      className="pms-input"
                      placeholder={`${field.replace('_', ' ')}…`}
                    />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={isPending} className="btn-pms btn-pms-primary btn-pms-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    {isPending ? 'Saving…' : 'Save summary'}
                  </button>
                  <button type="button" className="btn-pms btn-pms-ghost btn-pms-sm" onClick={() => setMode('view')}>Back</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Actions */}
        {mode === 'view' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(event.status === 'booked' || event.status === 'completed' || event.status === 'missed') && (
              <button
                className="btn-pms btn-pms-secondary"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={openSummary}
                disabled={summaryLoading}
              >
                {summaryLoading ? 'Loading…' : 'Visit summary'}
              </button>
            )}
            {event.status === 'booked' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-pms btn-pms-ghost"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => { setMode('reschedule'); setNewDate(toLocalDatetimeValue(event.start)); }}
                >
                  Reschedule
                </button>
                <button
                  className="btn-pms btn-pms-danger"
                  style={{ flex: 1, justifyContent: 'center' }}
                  onClick={() => setMode('cancel')}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
