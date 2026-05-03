import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import { ToastProvider } from '@/components/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--parchment)' }}>
        <Sidebar />
        <main className="dashboard-main">
          {children}
        </main>
      </div>
      <BottomNav />
    </ToastProvider>
  );
}
