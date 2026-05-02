'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventClickArg, EventDropArg, DateSelectArg } from '@fullcalendar/core';
import EventModal, { type CalendarEventProps } from './EventModal';
import CreateEventModal from './CreateEventModal';
import { rescheduleAppointmentAction } from '@/app/(dashboard)/calendar/actions';

interface FCEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    status: 'booked' | 'completed' | 'cancelled' | 'missed';
    intakeForm: string | null;
    clientName: string;
    clientId: string;
    waId: string;
    email: string | null;
  };
}

interface Client {
  id: string;
  name: string | null;
  wa_id: string;
  email: string | null;
}

interface Props {
  events: FCEvent[];
  clients: Client[];
}

export default function CalendarView({ events, clients }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventProps | null>(null);
  const [createDefault, setCreateDefault] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);

  function handleEventClick({ event }: EventClickArg) {
    setSelectedEvent({
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      status: event.extendedProps.status,
      intakeForm: event.extendedProps.intakeForm,
      clientName: event.extendedProps.clientName,
      clientId: event.extendedProps.clientId,
      waId: event.extendedProps.waId,
      email: event.extendedProps.email,
    });
  }

  function handleEventDrop({ event, revert, oldEvent }: EventDropArg) {
    const newDate = event.startStr;
    const oldDate = oldEvent.startStr;
    const { waId, clientName } = event.extendedProps;

    startTransition(async () => {
      const res = await rescheduleAppointmentAction(event.id, newDate, waId, clientName, oldDate);
      if (!res.ok) {
        revert();
      } else {
        router.refresh();
      }
    });
  }

  function handleDateSelect({ startStr }: DateSelectArg) {
    // Pre-fill the create modal with the clicked time (trim seconds/ms)
    setCreateDefault(startStr.slice(0, 16));
    setShowCreate(true);
  }

  return (
    <>
      <div className="fc-wrapper">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          timeZone="Asia/Beirut"
          firstDay={1}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          height="100%"
          allDaySlot={false}
          slotMinTime="08:00:00"
          slotMaxTime="19:00:00"
          businessHours={[
            { daysOfWeek: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '12:00' },
            { daysOfWeek: [1, 2, 3, 4, 5], startTime: '13:00', endTime: '17:00' },
          ]}
          events={events}
          editable={true}
          selectable={true}
          selectMirror={true}
          selectConstraint="businessHours"
          eventConstraint="businessHours"
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          select={handleDateSelect}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          buttonText={{ today: 'Today', month: 'Month', week: 'Week', day: 'Day' }}
        />
      </div>

      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />

      {showCreate && (
        <CreateEventModal
          clients={clients}
          defaultDate={createDefault}
          onClose={() => setShowCreate(false)}
        />
      )}
    </>
  );
}
