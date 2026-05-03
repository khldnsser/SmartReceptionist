import { SkeletonList, SkeletonCard } from '@/components/Skeleton';

export default function PatientLoading() {
  return (
    <div style={{ padding: '32px 40px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      <div style={{ height: 20, width: 220, background: '#e5e7eb', borderRadius: 4, marginBottom: 8, animation: 'skPulse 1.6s ease-in-out infinite' }} />
      <div style={{ height: 13, width: 140, background: '#e5e7eb', borderRadius: 4, marginBottom: 32, animation: 'skPulse 1.6s ease-in-out infinite' }} />
      <SkeletonCard />
      <div style={{ marginTop: 24 }}>
        <SkeletonList rows={3} />
      </div>
    </div>
  );
}
