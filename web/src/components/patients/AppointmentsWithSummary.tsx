'use client';

import { useState, useTransition } from 'react';
import { saveVisitSummary } from '@/app/actions/visit-summaries';

interface Appointment {
  id: string;
  appointment_date: string;
  booking_status: string;
  intake_form: string | null;
}

interface Summary {
  id: string;
  appointment_id: string | null;
}

interface Props {
  appointments: Appointment[];
  summaries: Summary[];
  clientId: string;
}

const STATUS_BADGE: Record<string, { cls: string }> = {
  booked:    { cls: 'badge-blue' },
  completed: { cls: 'badge-gray' },
  cancelled: { cls: 'badge-red' },
  missed:    { cls: 'badge-orange' },
};

function SummaryForm({
  clientId,
  appointmentId,
  onClose,
}: {
  clientId: string;
  appointmentId: string;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await saveVisitSummary(formData);
      onClose();
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="appointment_id" value={appointmentId} />

      {[
        { name: 'diagnosis', rows: 2, placeholder: 'Primary diagnosis…' },
        { name: 'notes',     rows: 3, placeholder: 'Clinical notes…' },
        { name: 'treatment', rows: 2, placeholder: 'Prescribed treatment or medications…' },
        { name: 'follow_up', rows: 2, placeholder: 'Follow-up instructions…' },
      ].map(({ name, rows, placeholder }) => (
        <div key={name}>
          <label className="field-label">{name.replace('_', '-')}</label>
          <textarea name={name} rows={rows} placeholder={placeholder} className="pms-input" />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" disabled={isPending} className="btn-pms btn-pms-primary btn-pms-sm">
          {isPending ? 'Saving…' : 'Save summary'}
        </button>
        <button type="button" onClick={onClose} className="btn-pms btn-pms-ghost btn-pms-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AppointmentsWithSummary({ appointments, summaries, clientId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (appointments.length === 0) {
    return <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>No appointments yet.</p>;
  }

  return (
    <div>
      {appointments.map((appt, i) => {
        const hasSummary = summaries.some(s => s.appointment_id === appt.id);
        const isExpanded = expandedId === appt.id;
        const badge = STATUS_BADGE[appt.booking_status] ?? { cls: 'badge-gray' };
        const isLast = i === appointments.length - 1;

        return (
          <div key={appt.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--hairline)', padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
                  {new Date(appt.appointment_date).toLocaleString('en-US', {
                    timeZone: 'Asia/Beirut', weekday: 'short', month: 'short', day: 'numeric',
                    year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                {appt.intake_form && (
                  <p style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>{appt.intake_form}</p>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
                <span className={`badge ${badge.cls}`}>{appt.booking_status}</span>
                {appt.booking_status !== 'cancelled' && (
                  hasSummary ? (
                    <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>summary added</span>
                  ) : (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : appt.id)}
                      className="btn-pms btn-pms-secondary btn-pms-sm"
                      style={{ fontSize: 12, padding: '5px 12px' }}
                    >
                      {isExpanded ? 'Cancel' : '+ Summary'}
                    </button>
                  )
                )}
              </div>
            </div>

            {isExpanded && !hasSummary && (
              <SummaryForm
                clientId={clientId}
                appointmentId={appt.id}
                onClose={() => setExpandedId(null)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
