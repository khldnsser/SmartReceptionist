'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { rescheduleAppointmentAction, cancelAppointmentAction } from '@/app/(dashboard)/calendar/actions';
import { saveVisitSummary, getVisitSummaryByAppointmentId } from '@/app/actions/visit-summaries';

export interface CalendarEventProps {
  id: string;
  title: string;
  start: string;
  end: string;
  status: 'booked' | 'completed' | 'cancelled' | 'missed';
  intakeForm: string | null;
  clientName: string;
  clientId: string;
  waId: string;
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
  // Convert to Beirut time for the datetime-local input
  const d = new Date(
    new Date(iso).toLocaleString('en-US', { timeZone: 'Asia/Beirut' }),
  );
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

interface ExistingSummary {
  id: string;
  diagnosis: string | null;
  notes: string | null;
  treatment: string | null;
  follow_up: string | null;
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
      const res = await rescheduleAppointmentAction(
        e.id, newDate + ':00', e.waId, e.clientName, e.start,
      );
      if (!res.ok) { setErr(res.error ?? 'Failed'); return; }
      router.refresh();
      onClose();
    });
  }

  function handleCancel() {
    if (!event) return;
    const e = event;
    startTransition(async () => {
      const res = await cancelAppointmentAction(
        e.id, e.start, e.waId, e.clientName,
      );
      if (!res.ok) { setErr(res.error ?? 'Failed'); return; }
      router.refresh();
      onClose();
    });
  }

  const statusColor =
    event.status === 'booked' ? 'bg-blue-100 text-blue-700' :
    event.status === 'completed' ? 'bg-gray-100 text-gray-600' :
    event.status === 'missed' ? 'bg-orange-100 text-orange-700' :
    'bg-red-100 text-red-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{event.clientName}</h2>
            {event.email && <p className="text-sm text-gray-500">{event.email}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-5">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Date & Time</p>
            <p className="text-sm text-gray-800">{formatDisplay(event.start)}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Status</p>
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
              {event.status}
            </span>
          </div>
          {event.intakeForm && (
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">Topic</p>
              <p className="text-sm text-gray-700">{event.intakeForm}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

        {/* Reschedule form */}
        {mode === 'reschedule' && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg space-y-3">
            <p className="text-sm font-medium text-gray-700">New date & time (Beirut)</p>
            <input
              type="datetime-local"
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2">
              <button
                onClick={handleReschedule}
                disabled={isPending}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Saving…' : 'Confirm reschedule'}
              </button>
              <button onClick={() => setMode('view')} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Cancel confirm */}
        {mode === 'cancel' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg space-y-3">
            <p className="text-sm text-red-700">Cancel this appointment? The patient will be notified via WhatsApp.</p>
            <div className="flex gap-2">
              <button
                onClick={handleCancel}
                disabled={isPending}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? 'Cancelling…' : 'Yes, cancel'}
              </button>
              <button onClick={() => setMode('view')} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Visit summary form */}
        {mode === 'summary' && (
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-3">
              {existingSummary ? 'Edit visit summary' : 'Add visit summary'}
            </p>
            {summaryLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : (
              <form onSubmit={handleSaveSummary} className="space-y-3">
                <input type="hidden" name="client_id" value={event.clientId} />
                <input type="hidden" name="appointment_id" value={event.id} />
                {existingSummary && <input type="hidden" name="id" value={existingSummary.id} />}
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Diagnosis</label>
                  <textarea name="diagnosis" defaultValue={existingSummary?.diagnosis ?? ''} rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Primary diagnosis…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                  <textarea name="notes" defaultValue={existingSummary?.notes ?? ''} rows={3}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Clinical notes…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Treatment</label>
                  <textarea name="treatment" defaultValue={existingSummary?.treatment ?? ''} rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Prescribed treatment or medications…" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Follow-up</label>
                  <textarea name="follow_up" defaultValue={existingSummary?.follow_up ?? ''} rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Follow-up instructions…" />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={isPending}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                    {isPending ? 'Saving…' : 'Save summary'}
                  </button>
                  <button type="button" onClick={() => setMode('view')}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                    Back
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Actions */}
        {mode === 'view' && (
          <div className="space-y-2">
            {(event.status === 'booked' || event.status === 'completed' || event.status === 'missed') && (
              <button
                onClick={openSummary}
                disabled={summaryLoading}
                className="w-full border border-blue-300 text-blue-700 py-2 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-50"
              >
                {summaryLoading ? 'Loading…' : 'Visit Summary'}
              </button>
            )}
            {event.status === 'booked' && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setMode('reschedule'); setNewDate(toLocalDatetimeValue(event.start)); }}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => setMode('cancel')}
                  className="flex-1 border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50"
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
