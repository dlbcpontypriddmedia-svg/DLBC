import { useCallback, useEffect, useState } from 'react';

import { getStreamModeKey, type StreamMode } from '@/lib/stream';

export function useStreamMode(streamSessionId?: string) {
  const modeStorageKey = getStreamModeKey(streamSessionId);
  const [audioOnly, setAudioOnly] = useState(() => modeStorageKey ? localStorage.getItem(modeStorageKey) === 'audio' : false);
  const [modeSelected, setModeSelected] = useState<boolean>(() => {
    const stored = modeStorageKey ? localStorage.getItem(modeStorageKey) : null;
    return stored === 'audio' || stored === 'video';
  });

  useEffect(() => {
    if (!modeStorageKey) {
      setAudioOnly(false);
      setModeSelected(false);
      return;
    }

    const stored = localStorage.getItem(modeStorageKey);
    setAudioOnly(stored === 'audio');
    setModeSelected(stored === 'audio' || stored === 'video');
  }, [modeStorageKey]);

  useEffect(() => {
    if (!modeSelected || !modeStorageKey) return;
    localStorage.setItem(modeStorageKey, audioOnly ? 'audio' : 'video');
  }, [audioOnly, modeSelected, modeStorageKey]);

  const selectMode = useCallback((mode: StreamMode) => {
    setAudioOnly(mode === 'audio');
    setModeSelected(true);
    if (modeStorageKey) {
      localStorage.setItem(modeStorageKey, mode);
    }
  }, [modeStorageKey]);

  const toggleMode = useCallback(() => {
    setModeSelected(true);
    setAudioOnly((current) => {
      const next = !current;
      if (modeStorageKey) {
        localStorage.setItem(modeStorageKey, next ? 'audio' : 'video');
      }
      return next;
    });
  }, [modeStorageKey]);

  return {
    audioOnly,
    modeSelected,
    selectMode,
    toggleMode,
  };
}
