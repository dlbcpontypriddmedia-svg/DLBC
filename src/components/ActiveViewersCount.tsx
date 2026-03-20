import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

const ActiveViewersCount = ({ branchId }: { branchId?: string }) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const fetch = () => {
      api.getActiveViewers(branchId)
        .then(r => setCount(r.count || 0))
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    fetch();
    intervalRef.current = setInterval(fetch, 30000);
    return () => clearInterval(intervalRef.current);
  }, [branchId]);

  return (
    <div className="flex min-w-[132px] items-center justify-center gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1.5 text-sm text-muted-foreground shadow-sm">
      {loading ? (
        <LoadingSpinner size="sm" className="text-primary/70" />
      ) : (
        <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
      )}
      <span className="tabular-nums">{count}</span>
      <span>viewer{count !== 1 ? 's' : ''} online</span>
    </div>
  );
};

export default ActiveViewersCount;
