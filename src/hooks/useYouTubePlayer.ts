import { useCallback, useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        config: {
          videoId: string;
          width?: string;
          height?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YouTubePlayer }) => void;
            onStateChange?: (event: { data: number; target: YouTubePlayer }) => void;
          };
        },
      ) => YouTubePlayer;
      PlayerState: {
        PLAYING: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getPlayerState: () => number;
  destroy: () => void;
};

type Options = {
  audioOnly: boolean;
  videoId: string | null;
};

export function useYouTubePlayer({ audioOnly, videoId }: Options) {
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const videoShellRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);

  const syncPlayerState = useCallback((player: YouTubePlayer) => {
    setIsPlaying(player.getPlayerState() === window.YT?.PlayerState.PLAYING);
    setIsMuted(player.isMuted());
  }, []);

  const initializePlayer = useCallback((nextVideoId: string) => {
    if (!playerHostRef.current || !window.YT?.Player) return;

    playerRef.current?.destroy();
    playerHostRef.current.innerHTML = '';

    playerRef.current = new window.YT.Player(playerHostRef.current, {
      videoId: nextVideoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 1,
        rel: 0,
      },
      events: {
        onReady: ({ target }) => {
          syncPlayerState(target);
        },
        onStateChange: ({ data, target }) => {
          setIsPlaying(data === window.YT?.PlayerState.PLAYING);
          setIsMuted(target.isMuted());
        },
      },
    });
  }, [syncPlayerState]);

  const setPlayerHostRef = useCallback(
    (node: HTMLDivElement | null) => {
      playerHostRef.current = node;

      if (!node) return;
      if (audioOnly || !videoId) return;
      if (!window.YT?.Player) return;
      if (playerRef.current) return;

      initializePlayer(videoId);
    },
    [audioOnly, initializePlayer, videoId],
  );

  useEffect(() => {
    if (audioOnly || !videoId) {
      playerRef.current?.destroy();
      playerRef.current = null;
      setIsPlaying(false);
      setIsMuted(false);
      return;
    }

    setIsPlaying(true);
    setIsMuted(false);

    if (window.YT?.Player) {
      initializePlayer(videoId);
      return;
    }

    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      initializePlayer(videoId);
    };

    return () => {
      window.onYouTubeIframeAPIReady = previousReady;
    };
  }, [audioOnly, initializePlayer, videoId]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    if (isPlaying) {
      setIsPlaying(false);
      playerRef.current.pauseVideo();
      return;
    }

    setIsPlaying(true);
    playerRef.current.playVideo();
  }, [isPlaying]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (isMuted) {
      setIsMuted(false);
      playerRef.current.unMute();
    } else {
      setIsMuted(true);
      playerRef.current.mute();
    }

    window.setTimeout(() => {
      if (playerRef.current) {
        syncPlayerState(playerRef.current);
      }
    }, 100);
  }, [isMuted, syncPlayerState]);

  const toggleFullscreen = useCallback(async () => {
    if (!videoShellRef.current) return;

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await videoShellRef.current.requestFullscreen();
  }, []);

  return {
    playerHostRef: setPlayerHostRef,
    videoShellRef,
    isPlaying,
    isMuted,
    togglePlay,
    toggleMute,
    toggleFullscreen,
  };
}
