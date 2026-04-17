import { useState } from 'react';
import { Users } from 'lucide-react';

import ActiveViewersDialog from '@/components/ActiveViewersDialog';
import { useActiveViewers } from '@/hooks/useActiveViewers';

const ActiveViewersCount = ({
  branchId,
  compact = false,
  iconOnly = false,
  className = '',
}: {
  branchId?: string;
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
}) => {
  const { count } = useActiveViewers(branchId);
  const [open, setOpen] = useState(false);

  const baseClassName = compact
    ? 'flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground'
    : iconOnly
      ? 'flex items-center justify-center gap-2 rounded-xl border border-primary/10 bg-white/80 px-3 py-2 text-sm text-muted-foreground shadow-sm transition hover:border-primary/20 hover:text-foreground'
      : 'flex min-w-[132px] items-center justify-center gap-2 rounded-full border border-primary/10 bg-white/80 px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition hover:border-primary/20 hover:text-foreground';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${baseClassName}${className ? ` ${className}` : ''}`}
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
