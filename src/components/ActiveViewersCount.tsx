import { useState } from 'react';
import { Users } from 'lucide-react';

import ActiveViewersDialog from '@/components/ActiveViewersDialog';
import { useActiveViewers } from '@/hooks/useActiveViewers';

const ActiveViewersCount = ({ branchId, compact = false, iconOnly = false }: { branchId?: string; compact?: boolean; iconOnly?: boolean }) => {
  const { count } = useActiveViewers(branchId);
  const [open, setOpen] = useState(false);

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
        <span className="inline-block h-2 w-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
        {iconOnly ? <Users className="h-4 w-4 text-primary" /> : null}
        <span className="tabular-nums">{count}</span>
        {!iconOnly && <span>viewer{count !== 1 ? 's' : ''} online</span>}
      </button>

      <ActiveViewersDialog open={open} onOpenChange={setOpen} branchId={branchId} />
    </>
  );
};

export default ActiveViewersCount;
