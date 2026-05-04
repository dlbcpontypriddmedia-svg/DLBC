import { useMemo } from 'react';
import { Dot, Users } from 'lucide-react';

import LoadingSpinner from '@/components/LoadingSpinner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useActiveViewers, type ActiveViewerMember } from '@/hooks/useActiveViewers';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ActiveViewersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId?: string;
};

const sortMembers = (members: ActiveViewerMember[]) => [...members].sort((left, right) => {
  const branchCompare = (left.branch_name || '').localeCompare(right.branch_name || '');
  if (branchCompare !== 0) return branchCompare;

  const nameCompare = (left.display_name ?? '').localeCompare(right.display_name ?? '');
  if (nameCompare !== 0) return nameCompare;

  return left.stream_session_id.localeCompare(right.stream_session_id);
});

const getInitials = (value?: string | null) => (value ?? '')
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('') || 'AV';
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('') || 'AV';

const ActiveViewersDialog = ({ open, onOpenChange, branchId }: ActiveViewersDialogProps) => {
  const { members, hasLoaded } = useActiveViewers(branchId);
  const sortedMembers = useMemo(() => sortMembers(members), [members]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl rounded-[1.75rem] border border-white/50 bg-white/65 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl"
        overlayClassName="bg-slate-950/12 backdrop-blur-[1px]"
      >
        <DialogHeader className="border-b border-white/45 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>Active Viewers</DialogTitle>
              <DialogDescription>
                {branchId ? 'Currently connected in this branch.' : 'Currently connected across all branches.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          {!hasLoaded ? (
            <div className="flex min-h-40 items-center justify-center">
              <LoadingSpinner className="text-primary" />
            </div>
          ) : sortedMembers.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-primary/15 bg-white/45 px-5 py-10 text-center text-sm text-muted-foreground">
              No active viewers right now.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMembers.map((member) => (
                <div
                  key={member.stream_session_id}
                  className="flex items-center justify-between gap-4 rounded-[1.25rem] border border-white/50 bg-white/50 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-10 w-10 border border-primary/10 bg-primary/5">
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {getInitials(member.display_name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
  {member.display_name || 'Anonymous Viewer'}
</p>
                      {!branchId && member.branch_name ? (
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {member.branch_name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-primary/10 bg-primary/5">
                    <Dot className="h-5 w-5 text-[hsl(var(--success))]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-white/45 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActiveViewersDialog;
