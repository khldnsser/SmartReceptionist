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

const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-blue-100 text-blue-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  missed: 'bg-orange-100 text-orange-700',
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
    <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-gray-100 space-y-3">
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="appointment_id" value={appointmentId} />

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Diagnosis</label>
        <textarea name="diagnosis" rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Primary diagnosis…" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
        <textarea name="notes" rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Clinical notes…" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Treatment</label>
        <textarea name="treatment" rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Prescribed treatment or medications…" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Follow-up</label>
        <textarea name="follow_up" rows={2}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Follow-up instructions…" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending}
          className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
          {isPending ? 'Saving…' : 'Save summary'}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function AppointmentsWithSummary({ appointments, summaries, clientId }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (appointments.length === 0) {
    return <p className="text-sm text-gray-400">No appointments yet.</p>;
  }

  return (
    <div className="space-y-2">
      {appointments.map((appt) => {
        const hasSummary = summaries.some(s => s.appointment_id === appt.id);
        const isExpanded = expandedId === appt.id;

        return (
          <div key={appt.id} className="border-b border-gray-100 last:border-0 py-2.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-800 font-medium">
                  {new Date(appt.appointment_date).toLocaleString('en-US', {
                    timeZone: 'Asia/Beirut',
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                {appt.intake_form && (
                  <p className="text-xs text-gray-400 mt-0.5">{appt.intake_form}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[appt.booking_status] ?? 'bg-gray-100 text-gray-500'}`}>
                  {appt.booking_status}
                </span>
                {appt.booking_status !== 'cancelled' && (
                  hasSummary ? (
                    <span className="text-xs text-gray-400 italic">Summary added</span>
                  ) : (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : appt.id)}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {isExpanded ? 'Cancel' : '+ Add summary'}
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
