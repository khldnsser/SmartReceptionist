'use client';

import { useState, useTransition } from 'react';
import { saveVisitSummary, deleteVisitSummary, signVisitSummary, addAddendum } from '@/app/actions/visit-summaries';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';

interface Addendum {
  id: string;
  content: string;
  added_by: string;
  created_at: string;
}

interface Summary {
  id: string;
  appointment_id: string | null;
  appointment_date: string | null;
  created_at: string;
  diagnosis: string | null;
  notes: string | null;
  treatment: string | null;
  follow_up: string | null;
  signed_at: string | null;
  signed_by: string | null;
  addendums: Addendum[];
}

interface Props {
  summaries: Summary[];
  clientId: string;
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SummaryCard({ summary, clientId }: { summary: Summary; clientId: string }) {
  const [editing, setEditing]               = useState(false);
  const [addingAddendum, setAddingAddendum] = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [confirmSign, setConfirmSign]       = useState(false);
  const [isPending, startTransition]        = useTransition();
  const { addToast } = useToast();

  const isSigned = !!summary.signed_at;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveVisitSummary(formData);
      if (res?.ok === false) addToast(res.error ?? 'Failed to save', 'error');
      else { addToast('Saved', 'success'); setEditing(false); }
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteVisitSummary(summary.id, clientId);
      if (res?.ok === false) addToast(res.error ?? 'Failed to delete', 'error');
      else addToast('Visit summary deleted', 'success');
    });
  }

  function handleSign() {
    startTransition(async () => {
      const res = await signVisitSummary(summary.id, clientId);
      if (res?.ok === false) addToast(res.error ?? 'Failed to sign', 'error');
      else addToast('Summary signed and locked', 'success');
    });
  }

  function handleAddendum(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('summary_id', summary.id);
    formData.set('client_id', clientId);
    startTransition(async () => {
      await addAddendum(formData);
      setAddingAddendum(false);
    });
  }

  const apptDate = summary.appointment_date
    ? new Date(summary.appointment_date).toLocaleString('en-US', {
        timeZone: 'Asia/Beirut', weekday: 'short', month: 'short',
        day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  const signedDate = summary.signed_at
    ? new Date(summary.signed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete visit summary?"
          description="This cannot be undone."
          confirmText="Delete"
          variant="danger"
          onConfirm={() => { setConfirmDelete(false); handleDelete(); }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
      {confirmSign && (
        <ConfirmDialog
          title="Sign and lock this summary?"
          description="Once signed, it cannot be edited. You can add addendums afterwards."
          confirmText="Sign & lock"
          onConfirm={() => { setConfirmSign(false); handleSign(); }}
          onCancel={() => setConfirmSign(false)}
        />
      )}
    <div className="pms-card">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          {apptDate
            ? <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--blue)' }}>Appointment: {apptDate}</p>
            : <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>
                {new Date(summary.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>}
          {isSigned && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 4, padding: '3px 8px', background: 'rgba(48,209,88,0.12)', borderRadius: 'var(--r-pill)' }}>
              <LockIcon />
              <span style={{ fontSize: 12, color: '#15803d', fontWeight: 500 }}>Signed {signedDate}</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {!isSigned && !editing && (
            <>
              <button onClick={() => setEditing(true)} className="btn-pms btn-pms-ghost btn-pms-sm" style={{ gap: 4 }}>
                <EditIcon /> Edit
              </button>
              <button onClick={() => setConfirmSign(true)} disabled={isPending} className="btn-pms btn-pms-ghost btn-pms-sm" style={{ fontSize: 12 }}>
                Sign & lock
              </button>
            </>
          )}
          {isSigned && (
            <button onClick={() => setAddingAddendum(a => !a)} className="btn-pms btn-pms-ghost btn-pms-sm" style={{ fontSize: 12 }}>
              {addingAddendum ? 'Cancel' : '+ Addendum'}
            </button>
          )}
          <button onClick={() => setConfirmDelete(true)} disabled={isPending} className="btn-pms btn-pms-sm" style={{ color: 'var(--red)', fontSize: 13, gap: 4 }}>
            <TrashIcon /> {isPending ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Edit form (only for unsigned) */}
      {editing && !isSigned ? (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input type="hidden" name="id" value={summary.id} />
          <input type="hidden" name="client_id" value={clientId} />
          {summary.appointment_id && <input type="hidden" name="appointment_id" value={summary.appointment_id} />}
          {[
            { name: 'diagnosis', rows: 2, val: summary.diagnosis },
            { name: 'notes',     rows: 3, val: summary.notes },
            { name: 'treatment', rows: 2, val: summary.treatment },
            { name: 'follow_up', rows: 2, val: summary.follow_up },
          ].map(({ name, rows, val }) => (
            <div key={name}>
              <label className="field-label">{name.replace('_', ' ')}</label>
              <textarea name={name} defaultValue={val ?? ''} rows={rows} className="pms-input" placeholder={`${name}…`} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={isPending} className="btn-pms btn-pms-primary btn-pms-sm">
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn-pms btn-pms-ghost btn-pms-sm">Cancel</button>
          </div>
        </form>
      ) : (
        /* Read-only view */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[['Diagnosis', summary.diagnosis], ['Notes', summary.notes], ['Treatment', summary.treatment], ['Follow-up', summary.follow_up]].map(
            ([label, val]) => val ? (
              <div key={label as string}>
                <p className="section-label" style={{ marginBottom: 4 }}>{label as string}</p>
                <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{val as string}</p>
              </div>
            ) : null,
          )}
          {!summary.diagnosis && !summary.notes && !summary.treatment && !summary.follow_up && (
            <p style={{ fontSize: 14, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
              {isSigned ? 'No content.' : 'No content yet — click Edit to add details.'}
            </p>
          )}
        </div>
      )}

      {/* Addendums */}
      {summary.addendums.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--hairline)' }}>
          <p className="section-label" style={{ marginBottom: 8 }}>Addendums</p>
          {summary.addendums.map(a => (
            <div key={a.id} style={{ marginBottom: 10, padding: '10px 12px', background: 'var(--parchment)', borderRadius: 'var(--r-sm)', borderLeft: '3px solid var(--blue)' }}>
              <p style={{ fontSize: 13, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{a.content}</p>
              <p style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4 }}>
                {new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add addendum form */}
      {addingAddendum && (
        <form onSubmit={handleAddendum} style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="field-label">Addendum</label>
          <textarea name="content" required rows={3} className="pms-input" placeholder="Correction or additional note…" />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={isPending} className="btn-pms btn-pms-primary btn-pms-sm">
              {isPending ? 'Saving…' : 'Add addendum'}
            </button>
            <button type="button" onClick={() => setAddingAddendum(false)} className="btn-pms btn-pms-ghost btn-pms-sm">Cancel</button>
          </div>
        </form>
      )}
    </div>
    </>
  );
}

export default function VisitSummaryPanel({ summaries, clientId }: Props) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.224px' }}>Visit summaries</h2>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{summaries.length} total</span>
      </div>

      {summaries.length === 0 ? (
        <div className="pms-card">
          <p style={{ fontSize: 14, color: 'var(--ink-faint)' }}>No visit summaries yet. Add one from the Appointments tab.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {summaries.map((s) => (
            <SummaryCard key={s.id} summary={s} clientId={clientId} />
          ))}
        </div>
      )}
    </div>
  );
}
