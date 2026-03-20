import { useEffect, useRef } from 'react';

import { supabase } from '@/integrations/supabase/client';

type RealtimeSubscription = {
  topic: string;
  events: string[];
};

type UseRealtimeRefreshOptions = {
  subscriptions: RealtimeSubscription[];
  onRefresh: () => void;
  enabled?: boolean;
  delayMs?: number;
};

export function useRealtimeRefresh({
  subscriptions,
  onRefresh,
  enabled = true,
  delayMs = 250,
}: UseRealtimeRefreshOptions) {
  const refreshRef = useRef(onRefresh);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled || subscriptions.length === 0) return;

    const scheduleRefresh = () => {
      if (timeoutRef.current !== null) return;
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        refreshRef.current();
      }, delayMs);
    };

    const channels = subscriptions
      .filter((subscription) => subscription.topic && subscription.events.length > 0)
      .map((subscription) => {
        const channel = subscription.events.reduce(
          (currentChannel, event) => currentChannel.on('broadcast', { event }, scheduleRefresh),
          supabase.channel(subscription.topic, {
            config: { broadcast: { self: false } },
          }),
        );

        void channel.subscribe();
        return channel;
      });

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [delayMs, enabled, subscriptions]);
}
