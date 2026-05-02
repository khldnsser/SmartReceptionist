'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  table: string;
  filter?: string; // Supabase filter string, e.g. "client_id=eq.abc-123"
}

// Headless component — renders nothing, subscribes to Postgres changes
// and calls router.refresh() so the parent server component re-fetches data.
export default function RealtimeRefresher({ table, filter }: Props) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Debounce refreshes so rapid bursts (e.g. batch updates) collapse into one
    function scheduleRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => router.refresh(), 300);
    }

    const channel = supabase
      .channel(`pms:${table}${filter ? `:${filter}` : ''}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter ? { filter } : {}),
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [router, table, filter]);

  return null;
}
