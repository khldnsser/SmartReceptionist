import { SkeletonList } from '@/components/Skeleton';

export default function PatientsLoading() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div style={{ height: 18, width: 160, background: '#e5e7eb', borderRadius: 4, marginBottom: 24, animation: 'skPulse 1.6s ease-in-out infinite' }} />
      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      <SkeletonList rows={6} />
    </div>
  );
}
