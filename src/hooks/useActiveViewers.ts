import { useEffect, useSyncExternalStore } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { api } from '@/lib/api';

type ActiveViewerMember = {
  id: string;
  stream_session_id: string;
  display_name: string;
  branch_id: string;
  branch_name?: string | null;
};

type ViewerSnapshot = {
  count: number;
  members: ActiveViewerMember[];
  hasLoaded: boolean;
};

type ViewerStore = {
  snapshot: ViewerSnapshot;
  listeners: Set<() => void>;
  subscribers: number;
  fetching: boolean;
  intervalId: number | null;
  channelCleanup: (() => void) | null;
  refreshHandler: ((event: Event) => void) | null;
};

const DEFAULT_SNAPSHOT: ViewerSnapshot = {
  count: 0,
  members: [],
  hasLoaded: false,
};

const stores = new Map<string, ViewerStore>();

function getStoreKey(branchId?: string) {
  return branchId || '__all__';
}

function getSubscriptions(branchId?: string) {
  return branchId
    ? [{ topic: `branch:${branchId}`, events: ['viewer_joined', 'viewer_left'] }]
    : [{ topic: 'admin:attendance', events: ['attendance_changed'] }];
}

function getOrCreateStore(branchId?: string) {
  const key = getStoreKey(branchId);
  const existing = stores.get(key);
  if (existing) return existing;

  const store: ViewerStore = {
    snapshot: DEFAULT_SNAPSHOT,
    listeners: new Set(),
    subscribers: 0,
    fetching: false,
    intervalId: null,
    channelCleanup: null,
    refreshHandler: null,
  };

  stores.set(key, store);
  return store;
}

function emit(store: ViewerStore) {
  for (const listener of store.listeners) {
    listener();
  }
}

async function refreshStore(branchId?: string) {
  const store = getOrCreateStore(branchId);
  if (store.fetching) return;
  store.fetching = true;

  try {
    const response = await api.getActiveViewerMembers(branchId);
    store.snapshot = {
      count: response.count || 0,
      members: (response.members || []) as ActiveViewerMember[],
      hasLoaded: true,
    };
    emit(store);
  } catch {
    if (!store.snapshot.hasLoaded) {
      store.snapshot = {
        ...store.snapshot,
        hasLoaded: true,
      };
      emit(store);
    }
  } finally {
    store.fetching = false;
  }
}

function startStore(branchId?: string) {
  const store = getOrCreateStore(branchId);
  if (store.channelCleanup || store.intervalId !== null || store.refreshHandler) return;

  const subscriptions = getSubscriptions(branchId);
  const channels = subscriptions.map((subscription) => {
    const channel = subscription.events.reduce(
      (currentChannel, event) => currentChannel.on('broadcast', { event }, () => {
        void refreshStore(branchId);
      }),
      supabase.channel(subscription.topic, {
        config: { broadcast: { self: false } },
      }),
    );

    void channel.subscribe();
    return channel;
  });

  store.channelCleanup = () => {
    for (const channel of channels) {
      void supabase.removeChannel(channel);
    }
  };

  store.refreshHandler = (event: Event) => {
    const detail = (event as CustomEvent<{ branchId?: string }>).detail;
    if (!detail?.branchId || !branchId || detail.branchId === branchId) {
      void refreshStore(branchId);
    }
  };

  window.addEventListener('active-viewers:refresh', store.refreshHandler as EventListener);
  void refreshStore(branchId);
  store.intervalId = window.setInterval(() => {
    void refreshStore(branchId);
  }, 30000);
}

function stopStore(branchId?: string) {
  const store = getOrCreateStore(branchId);
  if (store.subscribers > 0) return;

  if (store.intervalId !== null) {
    window.clearInterval(store.intervalId);
    store.intervalId = null;
  }

  if (store.refreshHandler) {
    window.removeEventListener('active-viewers:refresh', store.refreshHandler as EventListener);
    store.refreshHandler = null;
  }

  store.channelCleanup?.();
  store.channelCleanup = null;
}

export function useActiveViewers(branchId?: string) {
  const store = getOrCreateStore(branchId);

  useEffect(() => {
    store.subscribers += 1;
    startStore(branchId);

    return () => {
      store.subscribers -= 1;
      stopStore(branchId);
    };
  }, [branchId, store]);

  const snapshot = useSyncExternalStore(
    (listener) => {
      store.listeners.add(listener);
      return () => {
        store.listeners.delete(listener);
      };
    },
    () => store.snapshot,
    () => store.snapshot,
  );

  return {
    ...snapshot,
    refresh: () => refreshStore(branchId),
  };
}

export type { ActiveViewerMember };
