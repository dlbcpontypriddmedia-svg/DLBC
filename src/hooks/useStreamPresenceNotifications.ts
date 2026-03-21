import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useActiveViewers } from '@/hooks/useActiveViewers';

type PresencePayload = {
  stream_session_id?: string;
  display_name?: string;
};

type ActiveViewerMember = {
  stream_session_id: string;
  display_name: string;
};

type UseStreamPresenceNotificationsOptions = {
  branchId?: string;
  currentSessionId?: string;
};

export function useStreamPresenceNotifications({
  branchId,
  currentSessionId,
}: UseStreamPresenceNotificationsOptions) {
  const { members } = useActiveViewers(branchId);
  const membersRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!branchId) return;

    const channel = supabase
      .channel(`branch:${branchId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'viewer_joined' }, ({ payload }) => {
        const member = payload as PresencePayload;
        if (!member.stream_session_id || member.stream_session_id === currentSessionId) return;

        membersRef.current.set(member.stream_session_id, member.display_name || 'Someone');

        toast.message(`${member.display_name || 'Someone'} joined`, {
          description: 'Branch activity',
          duration: 2500,
        });
      })
      .on('broadcast', { event: 'viewer_left' }, ({ payload }) => {
        const member = payload as PresencePayload;
        if (!member.stream_session_id || member.stream_session_id === currentSessionId) return;

        membersRef.current.delete(member.stream_session_id);

        toast.message(`${member.display_name || 'Someone'} left`, {
          description: 'Branch activity',
          duration: 2500,
        });
      });

    void channel.subscribe();

    return () => {
      membersRef.current = new Map();
      initializedRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [branchId, currentSessionId]);

  useEffect(() => {
    if (!branchId) return;

    const nextMembers = new Map<string, string>();
    for (const member of members as ActiveViewerMember[]) {
      if (!member.stream_session_id || member.stream_session_id === currentSessionId) continue;
      nextMembers.set(member.stream_session_id, member.display_name || 'Someone');
    }

    if (initializedRef.current) {
      for (const [sessionId, displayName] of membersRef.current.entries()) {
        if (!nextMembers.has(sessionId)) {
          toast.message(`${displayName} left`, {
            description: 'Branch activity',
            duration: 2500,
          });
        }
      }
    } else {
      initializedRef.current = true;
    }

    membersRef.current = nextMembers;
  }, [branchId, currentSessionId, members]);
}
