import { useEffect, useState, useRef } from 'react';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

const ActiveViewersCount = ({ branchId, compact = false, iconOnly = false }: { branchId?: string; compact?: boolean; iconOnly?: boolean }) => {
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
    <div className={compact
      ? "flex items-center gap-2 text-sm text-muted-foreground"
      : "flex min-w-[132px] items-center justify-center gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1.5 text-sm text-muted-foreground shadow-sm"}>
      {loading ? (
        <LoadingSpinner size="sm" className="text-primary/70" />
      ) : (
        <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
      )}
      {iconOnly ? <Users className="h-4 w-4 text-primary" /> : null}
      <span className="tabular-nums">{count}</span>
      {!iconOnly && <span>viewer{count !== 1 ? 's' : ''} online</span>}
    </div>
  );
};

export default ActiveViewersCount;
