import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: doctor } = await supabase
    .from('doctors')
    .select('name, email')
    .eq('id', user.id)
    .single();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Account and clinic configuration</p>
      </div>

      {/* Doctor profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-md">
        <h2 className="text-sm font-medium text-gray-700 mb-4">Logged in as</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-lg">
            {(doctor?.name ?? user.email ?? 'D').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{doctor?.name ?? 'Doctor'}</p>
            <p className="text-sm text-gray-500">{doctor?.email ?? user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
