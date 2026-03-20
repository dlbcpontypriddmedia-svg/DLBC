import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
import ActiveViewersDialog from '@/components/ActiveViewersDialog';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

const ActiveViewersCount = ({ branchId, compact = false, iconOnly = false }: { branchId?: string; compact?: boolean; iconOnly?: boolean }) => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const subscriptions = useMemo(() => (
    branchId
      ? [{ topic: `branch:${branchId}`, events: ['viewer_joined', 'viewer_left'] }]
      : [{ topic: 'admin:attendance', events: ['attendance_changed'] }]
  ), [branchId]);

  const fetchCount = useCallback(() => {
    api.getActiveViewers(branchId)
      .then(r => setCount(r.count || 0))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [branchId]);

  useRealtimeRefresh({
    subscriptions,
    onRefresh: fetchCount,
  });

  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchCount]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact
          ? "flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          : "flex min-w-[132px] items-center justify-center gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition hover:border-primary/20 hover:text-foreground"}
        aria-label="View active viewers"
      >
        {loading ? (
          <LoadingSpinner size="sm" className="text-primary/70" />
        ) : (
          <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
        )}
        {iconOnly ? <Users className="h-4 w-4 text-primary" /> : null}
        <span className="tabular-nums">{count}</span>
        {!iconOnly && <span>viewer{count !== 1 ? 's' : ''} online</span>}
      </button>

      <ActiveViewersDialog open={open} onOpenChange={setOpen} branchId={branchId} />
    </>
  );
};

export default ActiveViewersCount;
