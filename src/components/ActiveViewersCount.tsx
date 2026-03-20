import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';

const ActiveViewersCount = ({ branchId }: { branchId?: string }) => {
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const fetch = () => {
      api.getActiveViewers(branchId)
        .then(r => setCount(r.count || 0))
        .catch(() => {});
    };
    fetch();
    intervalRef.current = setInterval(fetch, 30000);
    return () => clearInterval(intervalRef.current);
  }, [branchId]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
      <span className="tabular-nums">{count}</span>
      <span>viewer{count !== 1 ? 's' : ''} online</span>
    </div>
  );
};

export default ActiveViewersCount;
