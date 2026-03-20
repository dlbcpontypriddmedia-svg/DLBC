import { useEffect } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';

type PresencePayload = {
  stream_session_id?: string;
  display_name?: string;
};

type UseStreamPresenceNotificationsOptions = {
  branchId?: string;
  currentSessionId?: string;
};

export function useStreamPresenceNotifications({
  branchId,
  currentSessionId,
}: UseStreamPresenceNotificationsOptions) {
  useEffect(() => {
    if (!branchId) return;

    const channel = supabase
      .channel(`branch:${branchId}`, {
        config: { broadcast: { self: false } },
      })
      .on('broadcast', { event: 'viewer_joined' }, ({ payload }) => {
        const member = payload as PresencePayload;
        if (!member.stream_session_id || member.stream_session_id === currentSessionId) return;

        toast.message(`${member.display_name || 'Someone'} joined`, {
          description: 'Branch activity',
          duration: 2500,
        });
      })
      .on('broadcast', { event: 'viewer_left' }, ({ payload }) => {
        const member = payload as PresencePayload;
        if (!member.stream_session_id || member.stream_session_id === currentSessionId) return;

        toast.message(`${member.display_name || 'Someone'} left`, {
          description: 'Branch activity',
          duration: 2500,
        });
      });

    void channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [branchId, currentSessionId]);
}
