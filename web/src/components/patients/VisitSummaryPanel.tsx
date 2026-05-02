'use client';

import { useState, useTransition } from 'react';
import { saveVisitSummary, deleteVisitSummary } from '@/app/actions/visit-summaries';

interface Summary {
  id: string;
  appointment_id: string | null;
  appointment_date: string | null;
  created_at: string;
  diagnosis: string | null;
  notes: string | null;
  treatment: string | null;
  follow_up: string | null;
}

interface Props {
  summaries: Summary[];
  clientId: string;
}

function SummaryCard({ summary, clientId }: { summary: Summary; clientId: string }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await saveVisitSummary(formData);
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm('Delete this visit summary?')) return;
    startTransition(() => deleteVisitSummary(summary.id, clientId));
  }

  const apptDate = summary.appointment_date
    ? new Date(summary.appointment_date).toLocaleString('en-US', {
        timeZone: 'Asia/Beirut',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          {apptDate ? (
            <p className="text-xs font-medium text-blue-600">Appointment: {apptDate}</p>
          ) : (
            <p className="text-xs text-gray-400">
              {new Date(summary.created_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => setEditing(true)} className="text-xs text-blue-600 hover:text-blue-700">
              Edit
            </button>
          )}
          <button onClick={handleDelete} disabled={isPending}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50">
            {isPending ? '…' : 'Delete'}
          </button>
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-3 mt-2">
          <input type="hidden" name="id" value={summary.id} />
          <input type="hidden" name="client_id" value={clientId} />
          {summary.appointment_id && (
            <input type="hidden" name="appointment_id" value={summary.appointment_id} />
          )}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Diagnosis</label>
            <textarea name="diagnosis" defaultValue={summary.diagnosis ?? ''} rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Primary diagnosis…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
            <textarea name="notes" defaultValue={summary.notes ?? ''} rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Clinical notes…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Treatment</label>
            <textarea name="treatment" defaultValue={summary.treatment ?? ''} rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Prescribed treatment or medications…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Follow-up</label>
            <textarea name="follow_up" defaultValue={summary.follow_up ?? ''} rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Follow-up instructions…" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-2 text-sm mt-1">
          {summary.diagnosis && (
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Diagnosis</span>
              <p className="text-gray-800 mt-0.5 whitespace-pre-wrap">{summary.diagnosis}</p>
            </div>
          )}
          {summary.notes && (
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Notes</span>
              <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{summary.notes}</p>
            </div>
          )}
          {summary.treatment && (
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Treatment</span>
              <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{summary.treatment}</p>
            </div>
          )}
          {summary.follow_up && (
            <div>
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Follow-up</span>
              <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{summary.follow_up}</p>
            </div>
          )}
          {!summary.diagnosis && !summary.notes && !summary.treatment && !summary.follow_up && (
            <p className="text-gray-400 italic">No content yet — click Edit to add details.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function VisitSummaryPanel({ summaries, clientId }: Props) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Visit summaries</h2>
        <span className="text-xs text-gray-400">{summaries.length} total</span>
      </div>

      {summaries.length === 0 ? (
        <p className="text-sm text-gray-400">No visit summaries yet. Add one from an appointment above or from the calendar.</p>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => (
            <SummaryCard key={s.id} summary={s} clientId={clientId} />
          ))}
        </div>
      )}
    </section>
  );
}
