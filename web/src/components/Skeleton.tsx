export function SkeletonText({ width = '70%' }: { width?: string }) {
  return (
    <div style={{ height: 12, borderRadius: 4, background: '#e5e7eb', width, animation: 'skPulse 1.6s ease-in-out infinite' }} />
  );
}

export function SkeletonCard() {
  return (
    <>
      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      <div style={{ border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonText width="45%" />
        <SkeletonText width="90%" />
        <SkeletonText width="65%" />
      </div>
    </>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <>
      <style>{`@keyframes skPulse { 0%,100%{opacity:1} 50%{opacity:.45} }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </>
  );
}
